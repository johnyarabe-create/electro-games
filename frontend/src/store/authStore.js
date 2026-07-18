import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  
  // Inicializar auth
  initAuth: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    set({ user, loading: false });
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      set({ profile });
    }
  },
  
  // Login
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    set({ user: data.user, profile });
    return { user: data.user, profile };
  },
  
  // Registro
  register: async (email, password, firstName, lastName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName }
      }
    });
    
    if (error) throw error;
    
    // Crear perfil en la tabla profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        level: 1,
        total_xp: 0,
        current_xp: 0
      }]);
    
    if (profileError) throw profileError;
    
    return data;
  },
  
  // Logout
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
  
  // Actualizar perfil
  updateProfile: async (updates) => {
    const { user } = get();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    set({ profile: data });
    return data;
  }
}));