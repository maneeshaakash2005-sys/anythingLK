import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env manually
const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts[0] === 'VITE_SUPABASE_URL') {
      supabaseUrl = parts[1].trim();
    }
    if (parts[0] === 'VITE_SUPABASE_ANON_KEY') {
      supabaseKey = parts[1].trim();
    }
  }
} catch (err) {
  console.error('Error reading .env file:', err.message);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Could not find VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing connection to:', supabaseUrl);
  
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .limit(1);
    
  if (reviewsError) {
    console.log('Reviews Table Error:', reviewsError.message);
  } else {
    console.log('Reviews table exists!', reviews);
  }

  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('marketplace_visible, is_verified')
    .limit(1);

  if (shopsError) {
    console.log('Shops Columns Error:', shopsError.message);
  } else {
    console.log('Shops marketplace columns exist!', shops);
  }
}

testConnection();
