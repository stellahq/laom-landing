-- Ajoute la colonne `ref` à mollie_payments pour tracker les ventes
-- attribuées à un affilié via ?ref= dans l'URL (cookie laom_ref 30j).
-- À exécuter sur la D1 (binding DB = laom-team) :
--   bunx wrangler d1 execute laom-team --remote --file=src/db/migrations/2026-05-12-add-ref-to-mollie-payments.sql

ALTER TABLE mollie_payments ADD COLUMN ref TEXT;
CREATE INDEX IF NOT EXISTS idx_mollie_payments_ref ON mollie_payments(ref);
