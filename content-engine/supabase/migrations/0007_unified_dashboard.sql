-- =============================================================================
-- 0007 — Unified Dashboard: clients, research_profiles, wf_jobs
-- =============================================================================
-- Run these statements in Supabase SQL editor (project: rnbzryqxivzsugpsgmwh)
-- Safe to run multiple times (IF NOT EXISTS guards throughout).

-- ─────────────────────────────────────────────────
-- 1. clients — hub table linking all three systems
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  niche       TEXT,
  slug        TEXT UNIQUE,
  email       TEXT,
  phone       TEXT,
  website     TEXT,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'prospect'
                CHECK (status IN ('prospect','research','active','delivered','paused')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────
-- 2. research_profiles — Modules 1-7 state per client
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.research_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Module outputs stored as JSONB so schema can evolve
  student_profile    JSONB,   -- Module 1: interview output
  niche_decision     JSONB,   -- Module 2: scored niches, chosen niche
  offer_pack         JSONB,   -- Module 3: positioning, DM scripts, pricing
  wf_brief           JSONB,   -- Module 5: Website Factory intake brief
  ce_brief           JSONB,   -- Module 7: Content Engine intake brief
  -- Progress tracking (0 = not started, 7 = all modules complete)
  module_completed   INTEGER NOT NULL DEFAULT 0 CHECK (module_completed BETWEEN 0 AND 7),
  -- Raw AI responses for each module (for regeneration / debugging)
  raw_outputs        JSONB    DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

-- ─────────────────────────────────────────────────
-- 3. wf_jobs — Website Factory pipeline tracker
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wf_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stage         INTEGER NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 13),
  stage_name    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','waiting_approval','done','failed')),
  vercel_url    TEXT,
  proposal_url  TEXT,
  build_log     TEXT,
  notes         TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

-- ─────────────────────────────────────────────────
-- 4. updated_at triggers
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'clients_updated_at') THEN
    CREATE TRIGGER clients_updated_at
      BEFORE UPDATE ON public.clients
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'research_profiles_updated_at') THEN
    CREATE TRIGGER research_profiles_updated_at
      BEFORE UPDATE ON public.research_profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'wf_jobs_updated_at') THEN
    CREATE TRIGGER wf_jobs_updated_at
      BEFORE UPDATE ON public.wf_jobs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────
-- 5. Row Level Security (same pattern as existing tables)
-- ─────────────────────────────────────────────────
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_jobs          ENABLE ROW LEVEL SECURITY;

-- Authenticated users have full access (single-owner deployment)
CREATE POLICY IF NOT EXISTS "auth_all_clients"
  ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_all_research_profiles"
  ON public.research_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_all_wf_jobs"
  ON public.wf_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────
-- 6. Useful indexes
-- ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS clients_status_idx ON public.clients (status);
CREATE INDEX IF NOT EXISTS clients_niche_idx  ON public.clients (niche);
CREATE INDEX IF NOT EXISTS wf_jobs_stage_idx  ON public.wf_jobs (stage);
