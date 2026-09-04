-- supabase/migrations/20260819_admin_notifications.sql

-- Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'receipt_pending', 'receipt_approved', 'receipt_rejected',
    'signal_closed', 'signal_tp', 'signal_sl',
    'new_user', 'subscription_expired', 'subscription_expiring',
    'system_error'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin push tokens table
CREATE TABLE IF NOT EXISTS admin_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_push_tokens_user ON admin_push_tokens(user_id);

-- RLS policies
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_push_tokens ENABLE ROW LEVEL SECURITY;

DO $$ begin
  CREATE POLICY "Service role can insert notifications" ON admin_notifications
    FOR INSERT WITH CHECK (true);
exception when duplicate_object then null;
end $$;

DO $$ begin
  CREATE POLICY "Service role can delete notifications" ON admin_notifications
    FOR DELETE USING (true);
exception when duplicate_object then null;
end $$;

DO $$ begin
  CREATE POLICY "Users can manage own push tokens" ON admin_push_tokens
    FOR ALL USING (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
