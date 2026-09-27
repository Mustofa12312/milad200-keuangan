import supabase from './supabase'
import { logAudit } from './auditLog'

export const transactionService = {
  // Fetch transactions with pagination, filtering, sorting
  async getTransactions({ type, page = 1, pageSize = 20, search = '', category_id, created_by, startDate, endDate, sortBy = 'transaction_date', sortOrder = 'desc' } = {}) {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories(id, name),
        creator:profiles!transactions_created_by_fkey(id, full_name),
        receipts:transaction_receipts(id, storage_path, file_name, file_size)
      `, { count: 'exact' })
      .eq('is_deleted', false)

    if (type) query = query.eq('type', type)
    if (category_id) query = query.eq('category_id', category_id)
    if (created_by) query = query.eq('created_by', created_by)
    if (startDate) query = query.gte('transaction_date', startDate)
    if (endDate) query = query.lte('transaction_date', endDate)
    if (search) {
      query = query.or(`source.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { data, count, totalPages: Math.ceil(count / pageSize) }
  },

  async getTransactionById(id) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        categories(id, name),
        creator:profiles!transactions_created_by_fkey(id, full_name),
        updater:profiles!transactions_updated_by_fkey(id, full_name),
        receipts:transaction_receipts(id, storage_path, file_name, file_size, mime_type)
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createTransaction(transactionData, receiptFile, userId) {
    // 1. Upload receipt first
    let receiptPath = null
    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.webp`
      const folder = transactionData.type === 'INCOME' ? 'income' : 'expense'
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      const storagePath = `${folder}/${year}/${month}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('transaction-receipts')
        .upload(storagePath, receiptFile, { contentType: receiptFile.type || 'image/webp' })
      if (uploadError) throw uploadError
      receiptPath = storagePath
    }

    // 2. Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({ ...transactionData, created_by: userId, is_deleted: false })
      .select()
      .single()
    if (txError) {
      // Rollback receipt upload
      if (receiptPath) await supabase.storage.from('transaction-receipts').remove([receiptPath])
      throw txError
    }

    // 3. Create receipt record
    if (receiptPath && receiptFile) {
      const { error: receiptError } = await supabase
        .from('transaction_receipts')
        .insert({
          transaction_id: transaction.id,
          storage_path: receiptPath,
          file_name: receiptFile.name,
          file_size: receiptFile.size,
          mime_type: receiptFile.type,
          uploaded_by: userId,
        })
      if (receiptError) throw receiptError
    }

    // 4. Audit log
    await logAudit(userId, 'CREATE', 'transaction', transaction.id, null, transactionData)

    return transaction
  },

  async updateTransaction(id, updates, userId) {
    const old = await this.getTransactionById(id)

    const { data, error } = await supabase
      .from('transactions')
      .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    await logAudit(userId, 'UPDATE', 'transaction', id, old, updates)
    return data
  },

  async softDelete(id, userId) {
    const { error } = await supabase
      .from('transactions')
      .update({ is_deleted: true, deleted_by: userId, deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    await logAudit(userId, 'DELETE', 'transaction', id, null, null)
  },

  // Summary stats for dashboard
  async getSummary() {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('is_deleted', false)
    if (error) throw error

    const income = data.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0)
    const expense = data.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0)
    return { income, expense, balance: income - expense }
  },

  // Chart data: pemasukan vs pengeluaran per period
  async getChartData(period = 'month') {
    const now = new Date()
    let startDate

    if (period === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .eq('is_deleted', false)
      .gte('transaction_date', startDate.toISOString().split('T')[0])
    if (error) throw error

    return data
  },

  async getSignedUrl(storagePath) {
    const { data, error } = await supabase.storage
      .from('transaction-receipts')
      .createSignedUrl(storagePath, 3600)
    if (error) throw error
    return data.signedUrl
  },
}
