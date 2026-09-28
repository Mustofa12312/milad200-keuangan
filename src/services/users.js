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
    throw new Error(
      'Pembuatan pengguna baru dari aplikasi dinonaktifkan untuk keamanan. ' +
      'Silakan gunakan menu Authentication di Supabase Dashboard untuk mengundang atau membuat pengguna baru, ' +
      'kemudian atur Role-nya di halaman Pengguna ini.'
    )
  },
}
