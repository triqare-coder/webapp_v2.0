-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
-- This migration creates a notifications table for real-time alerts
-- Author: System
-- Date: 2026-01-31

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('emergency', 'system', 'assignment', 'maintenance', 'info')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(100),
    action_required BOOLEAN DEFAULT false,
    action_url TEXT,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'User notifications for real-time alerts and system messages';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- NOTE: notifications.user_id is the internal public.users.id (UUID), but
-- auth.uid() is the Clerk subject (text). Comparing them directly (auth.uid() =
-- user_id) is both a type and a semantic mismatch and never matches, so owners
-- could never read/update/delete their own notifications. The policies below use
-- the same clerk-join pattern as the patients/drivers/sos_requests policies in
-- 02_security/01_rls_policies.sql, resolving the internal id via clerk_user_id.

-- RLS Policy: Users can only see their own notifications
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
    ON public.notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = notifications.user_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- RLS Policy: Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
    ON public.notifications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = notifications.user_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- RLS Policy: System can insert notifications for any user
DROP POLICY IF EXISTS notifications_insert_system ON public.notifications;
CREATE POLICY notifications_insert_system
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Users can delete their own notifications
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own
    ON public.notifications
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = notifications.user_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

