from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from database import supabase
from datetime import datetime

app = FastAPI(title="Waste Collection API")

# Setup CORS for Next.js frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Data Validation ---
class UserLogin(BaseModel):
    email: str

class UserCreate(BaseModel):
    email: str
    full_name: str
    role: str # "citizen", "collector", "admin"

class LocationCreate(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    address: str
    zone: str

class PickupCreate(BaseModel):
    citizen_id: str
    location_id: str
    request_date: str # YYYY-MM-DD
    waste_type: str # 'Organic', 'Recyclable', 'Hazardous', 'E-Waste'

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend Connected to Supabase Successfully!"}

# --- Users ---
@app.post("/login")
def login(user: UserLogin):
    # Simulated basic login: fetch user by email
    res = supabase.table("users").select("*").eq("email", user.email).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": res.data[0]}

@app.post("/users")
def create_user(user: UserCreate):
    # Register user
    if user.role not in ["citizen", "collector", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    data = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }
    res = supabase.table("users").insert(data).execute()
    return {"message": "User created", "user": res.data[0]}

# --- Pickups & Locations ---
@app.post("/locations")
def create_location(loc: LocationCreate):
    data = {
        "user_id": loc.user_id,
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "address": loc.address,
        "zone": loc.zone
    }
    res = supabase.table("locations").insert(data).execute()
    return {"message": "Location saved", "location": res.data[0]}

@app.post("/pickups")
def create_pickup(pickup: PickupCreate):
    data = {
        "citizen_id": pickup.citizen_id,
        "location_id": pickup.location_id,
        "request_date": pickup.request_date,
        "waste_type": pickup.waste_type,
        "status": "Pending"
    }
    res = supabase.table("pickups").insert(data).execute()
    return {"message": "Pickup scheduled", "pickup": res.data[0]}

@app.get("/pickups")
def get_pickups(role: str, user_id: str):
    # Unified Query with Dual Identity Join (Citizen + Collector)
    base_query = supabase.table("pickups").select("*, locations(*), citizen:citizen_id(full_name, email), collector:collector_id(full_name)")
    
    if role == "citizen":
        res = base_query.eq("citizen_id", user_id).order("request_date", desc=True).execute()
    elif role == "collector":
        res = base_query.or_(f"collector_id.eq.{user_id},status.eq.Pending").order("request_date", desc=True).execute()
    else:
        res = base_query.order("request_date", desc=True).execute()
        
    return res.data

# Admin/System Report Logic (Requirement: View Usage)
@app.get("/reports/daily")
def get_daily_reports():
    # Utilizing the PostgreSQL View we created
    res = supabase.table("daily_collection_reports").select("*").execute()
    return res.data

# Mark Pickup as Completed and flag if necessary (Trigger requirement)
@app.post("/pickups/{pickup_id}/complete")
def complete_pickup(pickup_id: str, status: str = "Completed", flagged_reason: Optional[str] = None):
    # status can be 'Reached', 'Picked', 'Completed'
    update_data = {"status": status}
    if flagged_reason:
        update_data["flagged_reason"] = flagged_reason
        
    res = supabase.table("pickups").update(update_data).eq("id", pickup_id).execute()
    return {"message": f"Pickup status updated to {status}", "data": res.data}

# Assign Collector Transactional Logc (Requirement: Stored Procedure)
@app.post("/pickups/{pickup_id}/assign/{collector_id}")
def assign_collector(pickup_id: str, collector_id: str):
    # Utilizing the Stored Procedure for atomic transaction
    # Since supabase-py uses REST, calling procedures uses RPC
    try:
        res = supabase.rpc("assign_collector_to_pickup", {
            "p_pickup_id": pickup_id,
            "p_collector_id": collector_id
        }).execute()
        return {"message": "Collector assigned successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Fines ---
# --- Fines Audit & Management ---
@app.get("/fines")
def get_fines(user_id: Optional[str] = None):
    # If user_id is provided, get for citizen. If not, get ALL for admin!
    if user_id:
        res = supabase.table("fines").select("*").eq("citizen_id", user_id).execute()
        return res.data
    else:
        # ADMIN VIEW: Master Join for Revenue Audit
        # We join fines -> pickups -> locations and fines -> users(citizen)
        res = supabase.table("fines").select("*, users:citizen_id(full_name, email), pickups(collector_id, locations(*))").execute()
        fines_data = res.data
        # Manually link collector names for complete audit transparency
        for f in fines_data:
            if f.get('pickups') and f['pickups'].get('collector_id'):
                c_id = f['pickups']['collector_id']
                c_res = supabase.table("users").select("full_name").eq("id", c_id).execute()
                f['driver_name'] = c_res.data[0]['full_name'] if c_res.data else "Agent-System"
        return fines_data

@app.post("/fines/{fine_id}/pay")
def pay_fine(fine_id: str):
    # Dummy Payment flow
    res = supabase.table("fines").update({
        "status": "Paid", 
        "paid_at": datetime.now().isoformat()
    }).eq("id", fine_id).execute()
    return {"message": "Fine paid successfully via Dummy Gateway"}

# --- Admin User/Collector Helpers ---
@app.get("/users/collectors")
def get_collectors():
    res = supabase.table("users").select("id, full_name, email").eq("role", "collector").execute()
    return res.data

# --- Admin Fine Settings Management ---
@app.get("/fine-settings")
def get_fine_settings():
    res = supabase.table("fine_settings").select("*").execute()
    return res.data

@app.post("/fine-settings/update")
def update_fine_setting(violation_type: str, amount: float):
    res = supabase.table("fine_settings").update({"amount": amount}).eq("violation_type", violation_type).execute()
    return {"message": "Fine rate updated", "data": res.data}
