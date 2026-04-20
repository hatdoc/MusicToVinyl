-- VinylSoul Database Schema
-- Compatible with PostgreSQL (Supabase) or MySQL

-- CLEAN SLATE (Warning: This deletes existing data)
DROP TABLE IF EXISTS intent_logs CASCADE;
DROP TABLE IF EXISTS crate_items CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
-- Stores user data for the acquisition asset.
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    signup_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    listening_seconds INTEGER DEFAULT 0,
    custom_label_url VARCHAR(255)
);

-- 2. Crate Items (Want List)
CREATE TABLE crate_items (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    youtube_id VARCHAR(50) NOT NULL,
    video_title VARCHAR(255),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Intent Logs (Conversions & Analytics)
-- Tracks what users are converting to physical intent
CREATE TABLE intent_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for anon
    youtube_id VARCHAR(50) NOT NULL,
    genre VARCHAR(100),
    geo_location VARCHAR(100), -- E.g. 'London, UK'
    vinyl_compatibility_score INTEGER, -- 0-100 algorithm score
    clicked_affiliate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for Analytics Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_intent_logs_loc ON intent_logs(geo_location);
CREATE INDEX idx_intent_logs_date ON intent_logs(created_at);

-- 5. Example Analytic Query (for the Admin Dashboard)
-- "Which geo-locations convert the most high-fidelity intent?"
-- SELECT geo_location, AVG(vinyl_compatibility_score) as avg_score, COUNT(*) 
-- FROM intent_logs 
-- WHERE created_at > NOW() - INTERVAL '30 days' AND clicked_affiliate = TRUE
-- GROUP BY geo_location 
-- ORDER BY avg_score DESC;

-- ----------------------------------------------------
-- SECURITY: ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS on all tables to lock them down by default
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_logs ENABLE ROW LEVEL SECURITY;

-- 1. Intent Logs Policy
-- Allow ANYONE to INSERT tracking data, but prevent injecting other user IDs
CREATE POLICY "Enable insert for all users" 
ON intent_logs FOR INSERT 
TO public 
WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND auth.uid() IS NULL));

-- Deny SELECT to public (Only your Admin / Service Role can view the logs)
CREATE POLICY "Deny select for public" 
ON intent_logs FOR SELECT 
TO public 
USING (false);

-- 2. Crate Items Policy
-- Allow only authenticated users to manage their own crate items
CREATE POLICY "Enable crate management for authenticated users only"
ON crate_items FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------
-- AUTOMATED AUTH TRIGGER
-- ----------------------------------------------------
-- Automatically sync new signups into public.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
