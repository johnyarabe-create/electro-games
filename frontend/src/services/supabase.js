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

// Función para actualizar perfil
export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  if (error) throw error;
  return data;
};

// Función para obtener preguntas
export const getQuestions = async () => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('is_active', true);
  
  if (error) throw error;
  return data;
};

// Función para guardar resultado de juego
export const saveGameResult = async (result) => {
  const { data, error } = await supabase
    .from('game_results')
    .insert([result]);
  
  if (error) throw error;
  return data;
};

// Función para obtener leaderboard
export const getLeaderboard = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('total_xp', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data;
};
