-- Critical missing indexes for date filtering in getDashboardData
-- Dashboard queries filter heavily on transactions.date but no index exists on date+property
-- This causes full table scans for every date-filtered query

-- Index for date + user + type queries (used in all dashboard aggregations)
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date
  ON transactions(user_id, type, date DESC);

-- Index for property-specific date queries (used when filtering by property)
CREATE INDEX IF NOT EXISTS idx_transactions_property_date_deleted
  ON transactions(property_id, date DESC, is_deleted);

-- Index for category aggregations (GROUP BY category on filtered results)
CREATE INDEX IF NOT EXISTS idx_transactions_category_date_type
  ON transactions(category, date, type)
  WHERE is_deleted = false;
