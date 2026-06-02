import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function test() {
  const email = `test-${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('Registering test user...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: 'Test User' }
    }
  });

  if (signUpError) {
    console.error('SignUp Error:', signUpError.message);
    return;
  }

  const user = signUpData.user;
  console.log('Registered user ID:', user.id);

  console.log('Querying shops for this user...');
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id);

  if (shopsError) {
    console.error('Shops fetch error:', shopsError.message);
  } else {
    console.log('Shops found after trigger:', shops);
  }

  if (!shops || shops.length === 0) {
    console.log('No shop was created by the trigger. Attempting manual insert...');
    const { data: insertedShop, error: insertError } = await supabase
      .from('shops')
      .insert({
        owner_id: user.id,
        shop_name: 'Test Shop',
        slug: `test-shop-${Date.now()}`,
        email: email
      })
      .select();

    if (insertError) {
      console.error('Manual Insert Error:', insertError);
    } else {
      console.log('Manual Insert Success:', insertedShop);
    }
  }
}

test();
