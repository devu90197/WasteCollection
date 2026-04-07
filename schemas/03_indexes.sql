-- 3. INDEXES (Performance)
CREATE INDEX idx_pickups_status ON pickups(status);
CREATE INDEX idx_pickups_date ON pickups(request_date);
CREATE INDEX idx_locations_zone ON locations(zone);
