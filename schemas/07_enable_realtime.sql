-- ENABLE REALTIME FOR THE TABLES
-- This adds the tables to the 'supabase_realtime' publication
-- which allows the frontend to listen for changes via the supabase-js client.

ALTER PUBLICATION supabase_realtime ADD TABLE pickups;
ALTER PUBLICATION supabase_realtime ADD TABLE fines;
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
