import supabase from './supabase'
import { logAudit } from './auditLog'

export const debtService = {
  async getDebts({ status, page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('debts')
      .select(`
        *,
        creator:profiles!debts_created_by_fkey(full_name),
        payments:debt_payments(id, amount, payment_date, description, created_at)
      `, { count: 'exact' })

    if (status) query = query.eq('status', status)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.order('debt_date', { ascending: false }).range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { data, count, totalPages: Math.ceil(count / pageSize) }
  },

  async getDebtById(id) {
    const { data, error } = await supabase
      .from('debts')
      .select(`
        *,
        creator:profiles!debts_created_by_fkey(full_name),
        payments:debt_payments(id, amount, payment_date, description, created_at, creator:profiles!debt_payments_created_by_fkey(full_name))
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createDebt(debtData, userId) {
    const { data, error } = await supabase
      .from('debts')
      .insert({
        ...debtData,
        remaining_amount: debtData.original_amount,
        status: 'BELUM LUNAS',
        created_by: userId,
      })
      .select()
      .single()
    if (error) throw error
    await logAudit(userId, 'CREATE', 'debt', data.id, null, debtData)
    return data
  },

  async updateDebt(id, updates, userId) {
    const { data, error } = await supabase
      .from('debts')
      .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    await logAudit(userId, 'UPDATE', 'debt', id, null, updates)
    return data
  },

  async addPayment(debtId, paymentData, userId) {
    // Get current debt
    const { data: debt, error: debtError } = await supabase
      .from('debts')
      .select('remaining_amount, status')
      .eq('id', debtId)
      .single()
    if (debtError) throw debtError

    const newRemaining = Number(debt.remaining_amount) - Number(paymentData.amount)
    const newStatus = newRemaining <= 0 ? 'LUNAS' : 'SEBAGIAN'

    // Add payment record
    const { data: payment, error: payError } = await supabase
      .from('debt_payments')
      .insert({ ...paymentData, debt_id: debtId, created_by: userId })
      .select()
      .single()
    if (payError) throw payError

    // Update debt remaining & status
    const { error: updateError } = await supabase
      .from('debts')
      .update({
        remaining_amount: Math.max(0, newRemaining),
        status: newStatus,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', debtId)
    if (updateError) throw updateError

    await logAudit(userId, 'PAYMENT', 'debt', debtId, null, paymentData)
    return payment
  },

  async getDebtSummary() {
    const { data, error } = await supabase
      .from('debts')
      .select('original_amount, remaining_amount, status')
    if (error) throw error

    const totalDebt = data.reduce((sum, d) => sum + Number(d.original_amount), 0)
    const totalRemaining = data.reduce((sum, d) => sum + Number(d.remaining_amount), 0)
    const totalPaid = totalDebt - totalRemaining
    const unpaidCount = data.filter(d => d.status === 'BELUM LUNAS').length
    const partialCount = data.filter(d => d.status === 'SEBAGIAN').length
    const paidCount = data.filter(d => d.status === 'LUNAS').length

    return { totalDebt, totalRemaining, totalPaid, unpaidCount, partialCount, paidCount }
  },

  async getOverdueDebts() {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('debts')
      .select('id, party_name, remaining_amount, due_date, status')
      .neq('status', 'LUNAS')
      .not('due_date', 'is', null)
      .lte('due_date', today)
      .order('due_date', { ascending: true })
    if (error) throw error
    return data
  },

  async updateDebt(id, updates, userId) {
    const { data, error } = await supabase
      .from('debts')
      .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    await logAudit(userId, 'UPDATE', 'debt', id, null, updates)
    return data
  },
}

