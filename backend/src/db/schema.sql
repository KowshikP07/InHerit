-- InHerit: Fair Campus Auction Marketplace Database Schema
-- Idempotent initial migration for Supabase-hosted PostgreSQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ELIGIBLE STUDENTS ROSTER TABLE
CREATE TABLE IF NOT EXISTS eligible_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    student_id VARCHAR(100),
    name VARCHAR(255),
    department VARCHAR(100),
    is_eligible BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    roll_number VARCHAR(100),
    department VARCHAR(100),
    year VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STUDENT', 'SUPER_ADMIN')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. CSV IMPORT BATCHES TABLE
CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    total_rows INT DEFAULT 0,
    successful_rows INT DEFAULT 0,
    duplicate_rows INT DEFAULT 0,
    invalid_rows INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. AUCTIONS TABLE
CREATE TABLE IF NOT EXISTS auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    starting_price NUMERIC(12, 2) NOT NULL CHECK (starting_price > 0),
    min_increment NUMERIC(12, 2) NOT NULL CHECK (min_increment > 0),
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'SOLD', 'UNSOLD', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. AUCTION IMAGES TABLE
CREATE TABLE IF NOT EXISTS auction_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    image_path VARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. BIDS TABLE (Strictly append-only public record)
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. SALES & HANDOVER LIFECYCLE TABLE
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID UNIQUE NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    winning_bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
    final_price NUMERIC(12, 2),
    seller_decision VARCHAR(50) DEFAULT 'PENDING' CHECK (seller_decision IN ('PENDING', 'APPROVED', 'REJECTED')),
    handover_status VARCHAR(50) DEFAULT 'PENDING' CHECK (handover_status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED_PICKUP')),
    decided_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR CONCURRENCY & SEARCH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_eligible_students_email ON eligible_students(email);
CREATE INDEX IF NOT EXISTS idx_auctions_status_end_time ON auctions(status, end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_category ON auctions(category);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id_amount ON bids(auction_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_auction_images_auction_id ON auction_images(auction_id);
CREATE INDEX IF NOT EXISTS idx_sales_auction_id ON sales(auction_id);
CREATE INDEX IF NOT EXISTS idx_sales_winning_bidder_id ON sales(winning_bidder_id);
