const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read and parse .env.local
const envPath = path.join(__dirname, '.env.local');
console.log('Loading env from:', envPath);
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local does not exist!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    // Remove surrounding quotes if any
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1].trim()] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in env!');
  console.log('Parsed env keys:', Object.keys(env));
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);

// 2. Initialize Clients
const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 3. Helper to check connection / table existence
async function checkTable(client, tableName, roleName) {
  try {
    const { data, error, count } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return { exists: false, error: error.message };
    }
    return { exists: true, count: count ?? 0 };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function runDiagnostics() {
  const tables = [
    'scripts',
    'context_items',
    'clients',
    'research_profiles',
    'wf_jobs',
    'channels',
    'radar_items'
  ];

  console.log('\n--- 1. VERIFYING TABLES (Service Role Client - Admin) ---');
  for (const table of tables) {
    const result = await checkTable(serviceClient, table, 'Service Role');
    if (result.exists) {
      console.log(`✅ Table [${table}] exists. Row count: ${result.count}`);
    } else {
      console.log(`❌ Table [${table}] check failed: ${result.error}`);
    }
  }

  console.log('\n--- 2. TESTING ROW-LEVEL SECURITY / ANON ACCESS ---');
  for (const table of tables) {
    const result = await checkTable(anonClient, table, 'Anon');
    if (result.exists) {
      console.log(`ℹ️ Table [${table}] is accessible anonymously. Count: ${result.count}`);
    } else {
      console.log(`🛡️ Table [${table}] anon access prevented (RLS active): ${result.error}`);
    }
  }

  console.log('\n--- 3. DETAILED DATA CONNECTIVITY VALIDATION ---');
  
  // Test inserting and deleting a temporary prospect client
  console.log('Inserting mock client...');
  const mockClientName = `Test Diagnostic Client ${Date.now().toString(36)}`;
  const { data: newClient, error: insertError } = await serviceClient
    .from('clients')
    .insert({
      name: mockClientName,
      niche: 'Diagnostic Niche',
      status: 'prospect',
      slug: `diag-test-${Date.now()}`
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
  } else {
    console.log('✅ Client successfully inserted! Client ID:', newClient.id);

    // Check cascade creation of research_profile and wf_job (our route does this, let's verify manual creations too)
    console.log('Testing research_profiles link...');
    const { data: newProfile, error: profileError } = await serviceClient
      .from('research_profiles')
      .insert({ client_id: newClient.id })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Failed to insert profile linked to client:', profileError.message);
    } else {
      console.log('✅ Research profile successfully inserted! Profile ID:', newProfile.id);
    }

    console.log('Testing wf_jobs link...');
    const { data: newJob, error: jobError } = await serviceClient
      .from('wf_jobs')
      .insert({ client_id: newClient.id })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Failed to insert wf_job linked to client:', jobError.message);
    } else {
      console.log('✅ WF job successfully inserted! Job ID:', newJob.id);
    }

    // Clean up
    console.log('Cleaning up (deleting mock client, should cascade delete linked items)...');
    const { error: deleteError } = await serviceClient
      .from('clients')
      .delete()
      .eq('id', newClient.id);

    if (deleteError) {
      console.error('❌ Delete failed:', deleteError.message);
    } else {
      console.log('✅ Mock client successfully deleted.');
    }
  }
}

runDiagnostics();
