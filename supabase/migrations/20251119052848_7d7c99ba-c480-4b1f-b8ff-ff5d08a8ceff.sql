-- Phase 3.2: Ensure data_sources index exists for query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_data_sources ON campaigns USING GIN (data_sources);