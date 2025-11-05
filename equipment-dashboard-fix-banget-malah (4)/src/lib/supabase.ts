import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zvsjnogvnkndbqinlzap.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2c2pub2d2bmtuZGJxaW5semFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjAzMjQsImV4cCI6MjA3NTQzNjMyNH0.2MMCs9DiRN71sY3_NNrRmO5xLURBnqgoRny59fXGJmI';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and anonymous key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);