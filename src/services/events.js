import supabase from './supabase'
import { logAudit } from './auditLog'
import { DEFAULT_SUB_EVENTS } from '@/constants/events'

export const eventService = {
  async getEvents() {
    let query = supabase
      .from('categories')
      .select('*, creator:profiles!categories_created_by_fkey(full_name)')
      .eq('description', 'POS_ACARA')
      .order('created_at', { ascending: true })

    const { data, error } = await query
    if (error) throw error

    // If no events in DB, seed defaults
    if (!data || data.length === 0) {
      const rows = DEFAULT_SUB_EVENTS.map(name => ({
        name,
        description: 'POS_ACARA',
        is_active: true
      }))
      const { data: seeded, error: seedError } = await supabase
        .from('categories')
        .insert(rows)
        .select()
      if (seedError) {
        return DEFAULT_SUB_EVENTS.map((name, i) => ({ id: `default-${i}`, name, is_active: true }))
      }
      return seeded || []
    }

    return data
  },

  async createEvent(name, userId) {
    const trimmed = name.trim()
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: trimmed,
        description: 'POS_ACARA',
        is_active: true,
        created_by: userId || null
      })
      .select()
      .single()

    if (error) throw error
    if (userId) {
      await logAudit(userId, 'CREATE', 'pos_acara', data.id, null, { name: trimmed })
    }
    return data
  },

  async updateEvent(id, newName, oldName, userId) {
    const trimmed = newName.trim()
    const { data, error } = await supabase
      .from('categories')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Sync old transactions to new pos acara name
    if (oldName && oldName !== trimmed) {
      await supabase
        .from('transactions')
        .update({ source: trimmed })
        .eq('source', oldName)
        .eq('type', 'EXPENSE')
    }

    if (userId) {
      await logAudit(userId, 'UPDATE', 'pos_acara', id, { name: oldName }, { name: trimmed })
    }
    return data
  },

  async deleteEvent(id, name, userId) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error
    if (userId) {
      await logAudit(userId, 'DELETE', 'pos_acara', id, { name }, null)
    }
    return true
  }
}

