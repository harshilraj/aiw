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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const service = createClient(url, serviceKey);

async function listAllTables() {
  console.log('Querying Postgres pg_catalog to list all tables in public schema...');
  // We can select from pg_tables
  const { data, error } = await service.rpc('list_tables_diag');
  if (error) {
    console.log('Direct RPC list_tables_diag failed (which is normal if it doesn\'t exist). Let\'s try querying standard tables...');
    
    // Let's try querying standard tables directly to see which ones fail
    const standardTables = [
      'clients',
      'research_profiles',
      'wf_jobs',
      'scripts',
      'context_items',
      'business_profile',
      'voice_profile',
      'app_settings',
      'generation_runs',
      'posts',
      'performance',
      'niche_watch',
      'niche_watch_runs',
      'niche_signals'
    ];

    for (const table of standardTables) {
      const { error: tblError } = await service.from(table).select('*').limit(1);
      if (tblError) {
        if (tblError.code === 'PGRST205') {
          console.log(`❌ Table [${table}] DOES NOT EXIST (PGRST205)`);
        } else {
          console.log(`⚠️ Table [${table}] exists but failed with other error:`, tblError.message);
        }
      } else {
        console.log(`✅ Table [${table}] EXISTS and is queryable!`);
      }
    }
  } else {
    console.log('Tables returned from RPC:', data);
  }
}

listAllTables();
