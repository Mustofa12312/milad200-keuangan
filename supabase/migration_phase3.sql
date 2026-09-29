-- ============================================================
-- LAPORAN KEUANGAN 200 TAHUN PANYEPPEN
-- Migration Phase 3: Fix Foreign Keys for Profiles Join
-- ============================================================
-- By default, tables referenced auth.users(id) for tracking creator.
-- However, Supabase JS client joins (e.g., creator:profiles(...)) require
-- the foreign key to explicitly reference the profiles table.
-- This script updates all relevant foreign keys.

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_created_by_fkey;
ALTER TABLE categories ADD CONSTRAINT categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_updated_by_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_deleted_by_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE transaction_receipts DROP CONSTRAINT IF EXISTS transaction_receipts_uploaded_by_fkey;
ALTER TABLE transaction_receipts ADD CONSTRAINT transaction_receipts_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_created_by_fkey;
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_updated_by_fkey;
ALTER TABLE debts ADD CONSTRAINT debts_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE debts ADD CONSTRAINT debts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE debt_payments DROP CONSTRAINT IF EXISTS debt_payments_created_by_fkey;
ALTER TABLE debt_payments ADD CONSTRAINT debt_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
