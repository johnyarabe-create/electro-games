import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      loading: false,
      error: null,

      initAuth: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: { user } } = await supabase.auth.getUser();
          
          // Cargar perfil
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          set({ session, user, profile });
        }
        set({ loading: false });
      },

      login: async (email, password) => {
        set({ loading: true, error: null });
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          set({ error: error.message, loading: false });
          return false;
        }

        // Cargar perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        set({ user: data.user, session: data.session, profile, loading: false });
        return true;
      },

      register: async (email, password, firstName, lastName) => {
        set({ loading: true, error: null });
        
        // 1. Crear usuario en auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName }
          }
        });

        if (authError) {
          set({ error: authError.message, loading: false });
          return false;
        }

        // 2. Crear perfil manualmente
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              first_name: firstName,
              last_name: lastName,
              email: email,
              level: 1,
              total_xp: 0,
              current_xp: 0,
              streak_days: 0
            });

          if (profileError) {
            console.error('Error creando perfil:', profileError);
          }
          
          // Cargar perfil creado
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          
          set({ user: authData.user, profile, loading: false });
        }

        return true;
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, profile: null });
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (!error) {
          set({ profile: data });
        }
      }
    }),
    { name: 'auth-storage' }
  )
);
