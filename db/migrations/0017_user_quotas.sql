-- Add user quotas table
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  quota_bytes BIGINT NOT NULL DEFAULT 524288000, -- 500 MB default
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user quota lookups
CREATE INDEX idx_user_quotas_user_id ON user_quotas(user_id);

-- Add comment
COMMENT ON TABLE user_quotas IS 'Tracks storage quota for each user. Quota applies to attachments not assigned to properties plus all attachments on properties they own.';
COMMENT ON COLUMN user_quotas.quota_bytes IS 'Total quota in bytes. Default is 500 MB (524288000 bytes).';
