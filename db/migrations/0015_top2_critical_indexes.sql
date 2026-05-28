-- Top 2 critical indexes for performance
-- Expected: 50-65% improvement on transactions/dashboard
-- Build time: 3-5 minutes
-- Lock window: ~2 min transactions, ~1 min property_memberships

CREATE INDEX IF NOT EXISTS idx_transactions_user_property_deleted
  ON transactions(user_id, property_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_property_memberships_user_property_status
  ON property_memberships(user_id, property_id, status);
