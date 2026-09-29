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
    const { supabaseAdmin } = await import('./supabase')
    
    // Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
    })
    
    if (authError) throw authError
    
    if (authData?.user?.identities?.length === 0) {
      throw new Error('Email ini sudah terdaftar.')
    }
    
    // Because we have a trigger that creates the profile on auth signup, 
    // we just need to update it with the name and role.
    const userId = authData.user.id
    
    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        full_name: profileData.full_name,
        role_id: profileData.role_id,
        is_active: true
      })
      .eq('user_id', userId)
      
    if (profileError) throw profileError
    
    return authData.user
  },
}
