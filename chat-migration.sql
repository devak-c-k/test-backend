-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Sessions Policies
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- Messages Policies
CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')));

CREATE POLICY "Users can insert own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (session_id IN (SELECT id FROM chat_sessions WHERE user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')));
