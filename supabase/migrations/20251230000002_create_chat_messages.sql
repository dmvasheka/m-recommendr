-- Migration: Create chat_messages table for RAG conversation history
-- Date: 2025-12-30
-- Purpose: Store user-AI conversations for movie recommendations

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
                                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    context_movies JSONB DEFAULT NULL, -- Movie IDs used for context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Add RLS policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only read their own messages
CREATE POLICY "Users can view own chat messages"
      ON chat_messages
      FOR SELECT
                     USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own chat messages"
      ON chat_messages
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

  -- Users can delete their own messages
  CREATE POLICY "Users can delete own chat messages"
      ON chat_messages
      FOR DELETE
USING (auth.uid() = user_id);

  -- Add comments for documentation
  COMMENT ON TABLE chat_messages IS 'Stores conversation history between users and AI movie assistant';
  COMMENT ON COLUMN chat_messages.user_message IS 'User question or request';
  COMMENT ON COLUMN chat_messages.ai_response IS 'AI-generated response from GPT-4';
  COMMENT ON COLUMN chat_messages.context_movies IS 'JSON array of movie IDs used as context for this response';