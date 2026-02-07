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
