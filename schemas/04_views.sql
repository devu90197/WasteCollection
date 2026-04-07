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
