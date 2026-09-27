-- ============================================================
-- LAPORAN KEUANGAN 200 TAHUN PANYEPPEN
-- Supabase Database Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'Administrator dengan akses penuh'),
  ('USER', 'Petugas dengan akses terbatas')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  email VARCHAR(255),
  role_id UUID REFERENCES roles(id),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  SELECT id INTO default_role_id FROM roles WHERE name = 'USER' LIMIT 1;
  
  INSERT INTO public.profiles (user_id, email, full_name, role_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    default_role_id,
    TRUE
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Seed default categories
INSERT INTO categories (name, description) VALUES
  ('Konsumsi', 'Biaya konsumsi dan makanan'),
  ('Transportasi', 'Biaya transportasi dan perjalanan'),
  ('ATK', 'Alat tulis kantor dan perlengkapan'),
  ('Operasional', 'Biaya operasional umum'),
  ('Listrik', 'Tagihan listrik'),
  ('Internet', 'Tagihan internet dan komunikasi'),
  ('Peralatan', 'Pembelian peralatan'),
  ('Acara', 'Biaya kegiatan dan acara'),
  ('Dokumentasi', 'Biaya dokumentasi dan foto'),
  ('Kesehatan', 'Biaya kesehatan'),
  ('Lainnya', 'Pengeluaran lainnya')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  transaction_date DATE NOT NULL,
  category_id UUID REFERENCES categories(id),
  source VARCHAR(255),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);

-- ============================================================
-- TRANSACTION RECEIPTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_transaction ON transaction_receipts(transaction_id);

-- ============================================================
-- DEBTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_name VARCHAR(255) NOT NULL,
  original_amount NUMERIC(15, 2) NOT NULL CHECK (original_amount > 0),
  remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
  debt_date DATE NOT NULL,
  due_date DATE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'BELUM LUNAS' CHECK (status IN ('BELUM LUNAS', 'SEBAGIAN', 'LUNAS')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);

-- ============================================================
-- DEBT PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  description TEXT,
  receipt_path TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT r.name 
  FROM profiles p 
  JOIN roles r ON p.role_id = r.id 
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
CREATE POLICY "Users can view all active profiles" ON profiles
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admin can update any profile" ON profiles
  FOR UPDATE TO authenticated USING (get_user_role() = 'ADMIN');

-- ============================================================
-- ROLES POLICIES
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view roles" ON roles
  FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- CATEGORIES POLICIES
-- ============================================================
CREATE POLICY "Authenticated can view active categories" ON categories
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin can manage categories" ON categories
  FOR ALL TO authenticated USING (get_user_role() = 'ADMIN');

-- ============================================================
-- TRANSACTIONS POLICIES
-- ============================================================
CREATE POLICY "Authenticated can view non-deleted transactions" ON transactions
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "Authenticated can create transactions" ON transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR get_user_role() = 'ADMIN');

CREATE POLICY "Admin can soft delete transactions" ON transactions
  FOR UPDATE TO authenticated USING (get_user_role() = 'ADMIN');

-- ============================================================
-- TRANSACTION RECEIPTS POLICIES
-- ============================================================
CREATE POLICY "Authenticated can view receipts" ON transaction_receipts
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated can insert receipts" ON transaction_receipts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- DEBTS POLICIES
-- ============================================================
CREATE POLICY "Authenticated can view debts" ON debts
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated can create debts" ON debts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update debts" ON debts
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR get_user_role() = 'ADMIN');

-- ============================================================
-- DEBT PAYMENTS POLICIES
-- ============================================================
CREATE POLICY "Authenticated can view debt payments" ON debt_payments
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated can insert debt payments" ON debt_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- AUDIT LOG POLICIES
-- ============================================================
CREATE POLICY "Admin can view all audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (get_user_role() = 'ADMIN');

CREATE POLICY "Authenticated can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run in Supabase Dashboard Storage UI or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-receipts', 'transaction-receipts', false);

-- Storage Policy: authenticated users can upload
-- CREATE POLICY "Authenticated can upload receipts" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'transaction-receipts');

-- Storage Policy: authenticated users can view (signed URL)
-- CREATE POLICY "Authenticated can view receipts" ON storage.objects
--   FOR SELECT TO authenticated USING (bucket_id = 'transaction-receipts' AND auth.role() = 'authenticated');

-- ============================================================
-- DONE!
-- ============================================================
-- After running this migration:
-- 1. Create the 'transaction-receipts' storage bucket in Supabase Dashboard
-- 2. Add storage policies for authenticated users
-- 3. Set environment variables in .env.local
-- 4. Create the first admin user through Supabase Auth Dashboard
-- 5. Manually update their role to ADMIN in the profiles table
-- ============================================================
