import supabase from './supabase'

export const logAudit = async (userId, action, entityType, entityId, oldData, newData) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
    })
  } catch (err) {
    // Non-blocking - don't throw audit log errors
    console.error('Audit log error:', err)
  }
}

export const auditService = {
  async getLogs({ page = 1, pageSize = 25, action, entity_type, user_id } = {}) {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles!audit_logs_user_id_fkey(full_name, email)
      `, { count: 'exact' })

    if (action) query = query.eq('action', action)
    if (entity_type) query = query.eq('entity_type', entity_type)
    if (user_id) query = query.eq('user_id', user_id)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.order('created_at', { ascending: false }).range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { data, count, totalPages: Math.ceil(count / pageSize) }
  },
}
