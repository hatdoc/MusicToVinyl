-- VinylSoul Database Schema
-- Compatible with PostgreSQL (Supabase) or MySQL

-- 1. Users Table
-- Stores user data for the acquisition asset.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    signup_ip VARCHAR(45), -- Optional: for fraud detection
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Conversions Table
-- Tracks what users are listening to. This is the core data asset.
CREATE TABLE conversions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Nullable for guest conversions if allowed
    youtube_url TEXT NOT NULL,
    video_id VARCHAR(20),
    video_title VARCHAR(255),
    detected_genre VARCHAR(100), -- Populated by backend analysis of video metadata
    converted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for Analytics Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_conversions_genre ON conversions(detected_genre);
CREATE INDEX idx_conversions_date ON conversions(converted_at);

-- 4. Example Analytic Query (for the Admin Dashboard)
-- "Which genres are trending this week?"
-- SELECT detected_genre, COUNT(*) as conversion_count 
-- FROM conversions 
-- WHERE converted_at > NOW() - INTERVAL '7 days' 
-- GROUP BY detected_genre 
-- ORDER BY conversion_count DESC;
