-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES
-- Users Table (Citizens, Collectors, Admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'collector', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Locations Table (To store the selected map pin coordinates)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    zone VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pickups Table
CREATE TABLE pickups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
    collector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    request_date DATE NOT NULL,
    waste_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Assigned', 'Completed')),
    flagged_reason VARCHAR(255), -- If populated by collector, triggers a fine
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fines Table
CREATE TABLE fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pickup_id UUID REFERENCES pickups(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Paid')),
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- 3. INDEXES (Performance)
CREATE INDEX idx_pickups_status ON pickups(status);
CREATE INDEX idx_pickups_date ON pickups(request_date);
CREATE INDEX idx_locations_zone ON locations(zone);

-- 4. VIEW (For Admin Report)
CREATE OR REPLACE VIEW daily_collection_reports AS
SELECT 
    p.id AS pickup_id,
    p.request_date,
    p.status,
    p.waste_type,
    c.full_name AS citizen_name,
    col.full_name AS collector_name,
    l.address,
    l.zone
FROM 
    pickups p
JOIN 
    users c ON p.citizen_id = c.id
LEFT JOIN 
    users col ON p.collector_id = col.id
JOIN 
    locations l ON p.location_id = l.id;

-- 5. FUNCTION & TRIGGER (Automatic Fine Calculation)
-- Automatically creates a fine if a pickup is completed and flagged 
CREATE OR REPLACE FUNCTION trigger_calculate_fine()
RETURNS TRIGGER AS $$
BEGIN
    -- If the collector sets a flagged reason, insert a $50 fine automatically
    IF NEW.flagged_reason IS NOT NULL AND OLD.flagged_reason IS DISTINCT FROM NEW.flagged_reason THEN
        INSERT INTO fines (citizen_id, pickup_id, amount, reason, status)
        VALUES (NEW.citizen_id, NEW.id, 50.00, 'Fine: ' || NEW.flagged_reason, 'Unpaid');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_fine_trigger
AFTER UPDATE ON pickups
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_fine();

-- 6. STORED PROCEDURE / FUNCTION WITH TRANSACTION
-- Assigns a collector to a pending pickup safely using a transaction
CREATE OR REPLACE PROCEDURE assign_collector_to_pickup(
    p_pickup_id UUID,
    p_collector_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only update if the pickup is currently Pending
    UPDATE pickups 
    SET collector_id = p_collector_id, status = 'Assigned'
    WHERE id = p_pickup_id AND status = 'Pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pickup not found or is no longer Pending';
    END IF;
    
    -- Transaction commits automatically if no exception is raised
END;
$$;
