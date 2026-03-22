-- VinylSoul Database Schema
-- Compatible with PostgreSQL (Supabase) or MySQL

-- 1. Users Table
-- Stores user data for the acquisition asset.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    tier VARCHAR(20) DEFAULT 'free', -- 'free' or 'pro'
    signup_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Crate Items (Want List)
CREATE TABLE crate_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    youtube_id VARCHAR(50) NOT NULL,
    video_title VARCHAR(255),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Intent Logs (Conversions & Analytics)
-- Tracks what users are converting to physical intent
CREATE TABLE intent_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Nullable for anon
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
