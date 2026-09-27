import supabase from './supabase'

export const userService = {
  async getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, roles(name, description)')
      .order('full_name')
    if (error) throw error
    return data
  },

  async getRoles() {
    const { data, error } = await supabase.from('roles').select('*').order('name')
    if (error) throw error
    return data
  },

  async updateUser(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async toggleActive(userId, is_active) {
    return this.updateUser(userId, { is_active })
  },

  async createUser(email, password, profileData) {
    // Admin creates user via Supabase admin API (would need service role key - for now use invite)
    // This is handled server-side ideally; for frontend we use signUp
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ user_id: data.user.id, ...profileData, is_active: true })
    if (profileError) throw profileError

    return data.user
  },
}
