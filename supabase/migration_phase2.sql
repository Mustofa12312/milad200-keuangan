-- ============================================================
-- FASE 2 MIGRATION: Management Features Enhancement
-- Jalankan setelah migration.sql (Fase 1)
-- ============================================================

-- ============================================================
-- 1. Tambah field is_deleted_permanent untuk future cleanup
-- ============================================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS restore_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 2. View: Ringkasan saldo (computed)
-- ============================================================
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT
  COALESCE(SUM(CASE WHEN type = 'INCOME' AND is_deleted = FALSE THEN amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN type = 'EXPENSE' AND is_deleted = FALSE THEN amount ELSE 0 END), 0) AS total_expense,
  COALESCE(SUM(CASE WHEN type = 'INCOME' AND is_deleted = FALSE THEN amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN type = 'EXPENSE' AND is_deleted = FALSE THEN amount ELSE 0 END), 0) AS balance
FROM transactions;

-- ============================================================
-- 3. View: Ringkasan hutang
-- ============================================================
CREATE OR REPLACE VIEW public.debt_summary AS
SELECT
  COUNT(*) AS total_count,
  COALESCE(SUM(original_amount), 0) AS total_debt,
  COALESCE(SUM(remaining_amount), 0) AS total_remaining,
  COALESCE(SUM(original_amount - remaining_amount), 0) AS total_paid,
  COUNT(CASE WHEN status = 'BELUM LUNAS' THEN 1 END) AS unpaid_count,
  COUNT(CASE WHEN status = 'SEBAGIAN' THEN 1 END) AS partial_count,
  COUNT(CASE WHEN status = 'LUNAS' THEN 1 END) AS paid_count,
  COUNT(CASE WHEN status != 'LUNAS' AND due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 1 END) AS overdue_count
FROM debts;

-- ============================================================
-- 4. Function: Get overdue debts
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_overdue_debts()
RETURNS TABLE (
  id UUID,
  party_name VARCHAR,
  remaining_amount NUMERIC,
  due_date DATE,
  status VARCHAR
) LANGUAGE SQL STABLE AS $$
  SELECT id, party_name, remaining_amount, due_date, status
  FROM debts
  WHERE status != 'LUNAS'
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE
  ORDER BY due_date ASC;
$$;

-- ============================================================
-- 5. Function: Restore cancelled transaction
-- ============================================================
CREATE OR REPLACE FUNCTION public.restore_transaction(
  p_transaction_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN LANGUAGE PLPGSQL SECURITY DEFINER AS $$
BEGIN
  UPDATE transactions
  SET
    is_deleted = FALSE,
    deleted_by = NULL,
    deleted_at = NULL,
    restore_count = restore_count + 1,
    updated_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_transaction_id AND is_deleted = TRUE;

  IF FOUND THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
    VALUES (p_user_id, 'RESTORE', 'transaction', p_transaction_id);
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================
-- 6. RLS for financial_summary view
-- ============================================================
ALTER VIEW public.financial_summary OWNER TO postgres;

-- ============================================================
-- 7. Additional audit log indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(is_deleted, deleted_at)
  WHERE is_deleted = TRUE;

-- ============================================================
-- 8. Trigger: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 9. Additional RLS policies for cancelled transactions view
-- ============================================================
-- Policy: Admin can see deleted transactions
CREATE POLICY "Admin can view deleted transactions" ON transactions
  FOR SELECT TO authenticated
  USING (is_deleted = TRUE AND get_user_role() = 'ADMIN');

-- Policy: Admin can restore (update) deleted transactions
CREATE POLICY "Admin can restore transactions" ON transactions
  FOR UPDATE TO authenticated
  USING (is_deleted = TRUE AND get_user_role() = 'ADMIN');

-- ============================================================
-- 10. Function: Monthly report summary
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_monthly_report(
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  month INTEGER,
  month_name TEXT,
  income NUMERIC,
  expense NUMERIC,
  balance NUMERIC
) LANGUAGE SQL STABLE AS $$
  SELECT
    EXTRACT(MONTH FROM transaction_date)::INTEGER AS month,
    TO_CHAR(transaction_date, 'Month') AS month_name,
    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expense,
    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS balance
  FROM transactions
  WHERE EXTRACT(YEAR FROM transaction_date) = p_year
    AND is_deleted = FALSE
  GROUP BY EXTRACT(MONTH FROM transaction_date), TO_CHAR(transaction_date, 'Month')
  ORDER BY month;
$$;

-- ============================================================
-- SELESAI FASE 2
-- ============================================================
-- Fitur yang ditambahkan:
-- ✅ View saldo keuangan terintegrasi
-- ✅ View ringkasan hutang
-- ✅ Function restore transaksi yang dibatalkan
-- ✅ Function hutang jatuh tempo
-- ✅ Trigger auto-update updated_at
-- ✅ Index tambahan untuk performa
-- ✅ RLS untuk transaksi dibatalkan
-- ✅ Laporan bulanan per tahun
-- ============================================================
