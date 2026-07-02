-- ==========================================================================
-- TRACKING DB (base dediee laom-tracking / laom-tracking-staging)
-- Source de verite du tunnel marketing. Isolee de laom-team (DB) : les ecritures
-- de staging ne polluent jamais la prod (instances physiques separees, meme nom
-- de binding TRACKING_DB).
-- Exec :
--   bunx wrangler d1 execute laom-tracking         --remote --file=src/db/tracking-schema.sql
--   bunx wrangler d1 execute laom-tracking-staging --remote --file=src/db/tracking-schema.sql
-- ==========================================================================

-- Attribution first-touch par visiteur (posee par le middleware au 1er hit).
CREATE TABLE IF NOT EXISTS visitor_attribution (
  visitor_id TEXT PRIMARY KEY,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  gclid TEXT,
  fbc TEXT,
  referrer TEXT,
  landing_page TEXT,
  user_agent TEXT,
  first_seen TEXT DEFAULT (datetime('now'))
);

-- Leads : entite a cycle de vie (1 ligne, statut lead -> ... -> paid).
-- Distincte du journal append-only tunnel_events.
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT,
  type TEXT NOT NULL,                          -- candidature, quiz, newsletter
  status TEXT NOT NULL DEFAULT 'lead',         -- lead, call_booked, call_done, match, paid, lost
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  answers TEXT,                                -- JSON (reponses formulaire)
  result TEXT,                                 -- JSON (scores quiz, pilier faible, semaine voulue...)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  gclid TEXT,
  landing_page TEXT,
  referrer TEXT,
  meta_event_id TEXT,                          -- event_id partage client<->serveur (dedup Lead)
  consent TEXT,                                -- snapshot consentement (JSON)
  notified_at TEXT,                            -- horodatage notif equipe
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_visitor ON leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_leads_type_status ON leads(type, status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- Rate limiting applicatif (fenetre fixe par cle, ex: "form:<ip>").
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);
