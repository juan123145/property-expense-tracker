-- Add indexes to improve query performance
-- Transactions queries
CREATE INDEX IF NOT EXISTS idx_transactions_property_id ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_transactions_user_property_deleted ON transactions(user_id, property_id, is_deleted);

-- Transaction attachments queries
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_url ON transaction_attachments(url);
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);

-- Property memberships queries
CREATE INDEX IF NOT EXISTS idx_property_memberships_user_id ON property_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_property_memberships_property_id ON property_memberships(property_id);
CREATE INDEX IF NOT EXISTS idx_property_memberships_status ON property_memberships(status);
CREATE INDEX IF NOT EXISTS idx_property_memberships_user_property_status ON property_memberships(user_id, property_id, status);

-- Storage ownerships queries
CREATE INDEX IF NOT EXISTS idx_storage_ownerships_owner_id ON storage_ownerships(owner_id);
CREATE INDEX IF NOT EXISTS idx_storage_ownerships_property_id ON storage_ownerships(property_id);
CREATE INDEX IF NOT EXISTS idx_storage_ownerships_deleted_at ON storage_ownerships(deleted_at);
CREATE INDEX IF NOT EXISTS idx_storage_ownerships_url ON storage_ownerships(attachment_url);

-- Soft delete queue queries
CREATE INDEX IF NOT EXISTS idx_soft_delete_queue_transaction_id ON soft_delete_queue(transaction_id);
CREATE INDEX IF NOT EXISTS idx_soft_delete_queue_status ON soft_delete_queue(status);

-- Properties queries
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_archived ON properties(is_archived);
