import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://db.wmtpsryktpunkuklnqpas.supabase.co';
const supabaseKey = 'sb_publishable_epHkdfzRZJYnMBJW6HUPVw_HC4EpQsX';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Función para obtener usuario actual
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Función para obtener perfil del usuario
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};
