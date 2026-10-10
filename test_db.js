import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('--- PROFILES ---');
  console.log(profiles);
  
  const { data: sessions } = await supabase.from('voice_sessions').select('*');
  console.log('--- SESSIONS (first 3) ---');
  console.log(sessions ? sessions.slice(0, 3) : null);
}
check();
