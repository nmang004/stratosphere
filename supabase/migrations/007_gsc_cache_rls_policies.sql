-- Add missing RLS policies for gsc_cache_logs table
-- Required for cache-first GSC data fetching to work

-- Allow users to insert cache entries for clients they're assigned to
CREATE POLICY "Users can insert client GSC cache" ON gsc_cache_logs
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Allow users to update cache entries for clients they're assigned to
CREATE POLICY "Users can update client GSC cache" ON gsc_cache_logs
    FOR UPDATE USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Allow users to delete cache entries for clients they're assigned to
CREATE POLICY "Users can delete client GSC cache" ON gsc_cache_logs
    FOR DELETE USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Also add INSERT policy for api_quota_tracking
CREATE POLICY "Users can insert API quota tracking" ON api_quota_tracking
    FOR INSERT WITH CHECK (
        client_id IS NULL OR
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Allow users to update API quota tracking
CREATE POLICY "Users can update API quota tracking" ON api_quota_tracking
    FOR UPDATE USING (
        client_id IS NULL OR
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );
