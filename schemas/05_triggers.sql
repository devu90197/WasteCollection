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
