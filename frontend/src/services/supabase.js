import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wmtpsryktpunkuklnqpas.supabase.co';
const supabaseKey = 'sb_publishable_epHkdfzRZJYnMBJW6HUPVw_HC4EpQsX';

export const supabase = createClient(supabaseUrl, supabaseKey);
