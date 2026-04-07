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
