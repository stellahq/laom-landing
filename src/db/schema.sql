-- LAOM Team Management - Cloudflare D1 Schema
-- Created: 7 fevrier 2026

-- Taches hebdomadaires (Lorenzo, Khaldoun, Amandine)
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person TEXT NOT NULL,
  week TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  is_daily_highlight INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  sort_order INTEGER DEFAULT 0
);

-- Observations / notes vocales (Lorenzo, Khaldoun)
CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Objectifs hebdomadaires (poses par Charly)
CREATE TABLE IF NOT EXISTS weekly_objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person TEXT NOT NULL,
  week TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Recap hebdomadaire (Amandine)
CREATE TABLE IF NOT EXISTS weekly_recaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person TEXT NOT NULL,
  week TEXT NOT NULL,
  what_done TEXT,
  suggestions TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Contexte semaine (ce que Charly fait, enjeux, etc. - pour la page Amandine)
CREATE TABLE IF NOT EXISTS weekly_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week TEXT NOT NULL,
  charly_focus TEXT,
  enjeux TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index pour les requetes frequentes
CREATE INDEX IF NOT EXISTS idx_tasks_person_week ON tasks(person, week);
CREATE INDEX IF NOT EXISTS idx_observations_person_date ON observations(person, date);
CREATE INDEX IF NOT EXISTS idx_weekly_objectives_person_week ON weekly_objectives(person, week);

-- ==========================================
-- TUNNEL TRACKING — Observatoire du funnel
-- Created: 12 avril 2026
-- ==========================================

-- Evenements bruts du tunnel (chaque interaction utilisateur)
CREATE TABLE IF NOT EXISTS tunnel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,          -- page_view, form_submit, vsl_start, vsl_25, vsl_50, vsl_75, vsl_complete, cta_click, exit_intent_shown, exit_intent_clicked, timer_expired, checkout_initiated, payment_completed, payment_failed, kit_subscribed, kit_tagged, telegram_click
  page TEXT NOT NULL,                -- /talk/, /school/merci/, /school/online/, /school/confirmation/
  source TEXT,                       -- utm_source: facebook, kit, organic, direct
  medium TEXT,                       -- utm_medium: cpc, email, social, referral
  campaign TEXT,                     -- utm_campaign
  session_id TEXT,                   -- identifiant session anonyme (localStorage)
  email TEXT,                        -- email si disponible (post-inscription)
  product TEXT,                      -- school-merci, school-online, school-online-2x
  amount TEXT,                       -- montant du paiement si applicable
  meta TEXT,                         -- JSON libre pour donnees supplementaires (popup_index, video_percent, scroll_depth, etc.)
  referrer TEXT,                     -- document.referrer
  user_agent TEXT,                   -- navigator.userAgent (tronque)
  created_at TEXT DEFAULT (datetime('now'))
);

-- Agregation quotidienne par etape du tunnel
CREATE TABLE IF NOT EXISTS tunnel_daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- YYYY-MM-DD
  step TEXT NOT NULL,                -- talk_page_view, talk_form_submit, merci_page_view, vsl_start, vsl_complete, oto_checkout, oto_paid, online_page_view, online_checkout, online_paid, confirmation_view
  source TEXT DEFAULT 'all',         -- facebook, kit, organic, direct, all
  count INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, step, source)
);

-- Index pour le tunnel
CREATE INDEX IF NOT EXISTS idx_tunnel_events_type ON tunnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tunnel_events_page ON tunnel_events(page);
CREATE INDEX IF NOT EXISTS idx_tunnel_events_created ON tunnel_events(created_at);
CREATE INDEX IF NOT EXISTS idx_tunnel_events_session ON tunnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tunnel_events_email ON tunnel_events(email);
CREATE INDEX IF NOT EXISTS idx_tunnel_daily_date_step ON tunnel_daily_stats(date, step);
CREATE INDEX IF NOT EXISTS idx_tunnel_daily_source ON tunnel_daily_stats(date, source);
