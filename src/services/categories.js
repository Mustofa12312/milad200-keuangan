import supabase from './supabase'
import { logAudit } from './auditLog'

export const categoryService = {
  async getCategories(includeInactive = false) {
    let query = supabase.from('categories').select('*, creator:profiles!categories_created_by_fkey(full_name)')
    if (!includeInactive) query = query.eq('is_active', true)
    const { data, error } = await query.order('name')
    if (error) throw error
    return data
  },

  async createCategory({ name, description }, userId) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, description, is_active: true, created_by: userId })
      .select()
      .single()
    if (error) throw error
    await logAudit(userId, 'CREATE', 'category', data.id, null, { name, description })
    return data
  },

  async updateCategory(id, updates, userId) {
    const { data, error } = await supabase
      .from('categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    await logAudit(userId, 'UPDATE', 'category', id, null, updates)
    return data
  },

  async toggleActive(id, is_active, userId) {
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    await logAudit(userId, is_active ? 'ACTIVATE' : 'DEACTIVATE', 'category', id, null, null)
    return data
  },

  // Seed default categories
  async seedDefaults(userId) {
    const defaults = [
      'Konsumsi', 'Transportasi', 'ATK', 'Operasional',
      'Listrik', 'Internet', 'Peralatan', 'Acara',
      'Dokumentasi', 'Kesehatan', 'Lainnya',
    ]
    const rows = defaults.map(name => ({ name, is_active: true, created_by: userId }))
    const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'name' })
    if (error) throw error
  },
}
