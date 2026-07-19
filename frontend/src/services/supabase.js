import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wmtpsryktpunkuklnqpa.supabase.co';
const supabaseKey = 'sb_publishable_epHkdizRZJYnMBJW6HUPVw_HC4EpQsX';

export const supabase = createClient(supabaseUrl, supabaseKey);
