-- ============================================================
-- EasyApplyAgent — Supabase Schema (Full)
-- Run this in the Supabase SQL Editor:
-- https://mmggjxakzkfqqkiqkhlo.supabase.co/project/mmggjxakzkfqqkiqkhlo/sql
-- ============================================================

-- Enable real-time on the applied_jobs table
-- (Settings → Replication → Enable for applied_jobs)

-- Profiles table (optional: stores user info)
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,
  name         TEXT,
  headline     TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own profile"
  ON profiles FOR ALL USING (auth.uid() = id);

-- Applied Jobs table (core table)
CREATE TABLE IF NOT EXISTS applied_jobs (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id            TEXT NOT NULL,
  title             TEXT NOT NULL,
  company           TEXT NOT NULL,
  location          TEXT DEFAULT '',
  salary            TEXT DEFAULT 'Competitive',
  match_score       INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'applied',
  applied_at        TIMESTAMPTZ DEFAULT NOW(),
  pacing_delay_sec  FLOAT DEFAULT 8.0,
  llm_reasoning     TEXT,
  playwright_trace  TEXT,
  steps_completed   INTEGER DEFAULT 0,
  steps_total       INTEGER DEFAULT 3,
  url               TEXT,
  logo              TEXT,
  easy_apply        BOOLEAN DEFAULT TRUE,
  experience_level  TEXT,
  employment_type   TEXT,
  description       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

-- Enable RLS
ALTER TABLE applied_jobs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own jobs
CREATE POLICY "Users can view their own applied jobs"
  ON applied_jobs FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own jobs
CREATE POLICY "Users can insert their own applied jobs"
  ON applied_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own jobs
CREATE POLICY "Users can update their own applied jobs"
  ON applied_jobs FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role to bypass RLS (for backend sync)
-- This is automatic for service_role key — no additional policy needed.

-- Enable real-time for applied_jobs
-- (Alternatively, go to: Supabase Dashboard → Database → Replication → Toggle applied_jobs)
ALTER PUBLICATION supabase_realtime ADD TABLE applied_jobs;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_applied_jobs_user_id ON applied_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_applied_jobs_applied_at ON applied_jobs(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applied_jobs_status ON applied_jobs(status);

-- Example: view all jobs for a specific user ordered by date
-- SELECT * FROM applied_jobs WHERE user_id = 'YOUR_USER_UUID' ORDER BY applied_at DESC;
