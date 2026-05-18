const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1].trim()] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const anon = createClient(url, anonKey);
const service = createClient(url, serviceKey);

async function testBoth() {
  console.log('--- TESTING SERVICE CLIENT ---');
  const res1 = await service.from('context_items').select('*').limit(1);
  if (res1.error) {
    console.error('Service error:', res1.error);
  } else {
    console.log('Service success! Rows:', res1.data);
  }

  console.log('\n--- TESTING ANON CLIENT ---');
  const res2 = await anon.from('context_items').select('*').limit(1);
  if (res2.error) {
    console.error('Anon error:', res2.error);
  } else {
    console.log('Anon success! Rows:', res2.data);
  }
}

testBoth();
