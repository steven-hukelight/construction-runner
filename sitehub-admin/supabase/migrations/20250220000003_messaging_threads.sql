-- Messaging: threads + messages + recipients (parallel to existing messages table)
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  company_id TEXT NOT NULL,
  site_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_company_id ON message_threads(company_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS messages_thread (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_thread_id ON messages_thread(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created_at ON messages_thread(created_at DESC);

ALTER TABLE messages_thread ENABLE ROW LEVEL SECURITY;

-- Enable realtime: run in Supabase SQL if needed: ALTER PUBLICATION supabase_realtime ADD TABLE messages_thread;

CREATE TABLE IF NOT EXISTS message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_recipients_thread_user ON message_recipients(thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_user_id ON message_recipients(user_id);

ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
