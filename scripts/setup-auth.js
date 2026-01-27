/**
 * Auth Setup Script - Creates Supabase Auth accounts for all users
 *
 * REQUIRES: SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * To get your service role key:
 * 1. Go to https://supabase.com/dashboard
 * 2. Select your project
 * 3. Go to Settings > API
 * 4. Copy the "service_role" key (NOT the anon key)
 * 5. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key-here
 *
 * Run with: node scripts/setup-auth.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_PASSWORD = 'Password123!';

async function main() {
  console.log('='.repeat(60));
  console.log('PALLET AUTH SETUP SCRIPT');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_URL) {
    console.error('ERROR: VITE_SUPABASE_URL not found in .env.local');
    process.exit(1);
  }

  // Check if we have service role key
  const useServiceRole = !!SUPABASE_SERVICE_KEY;

  if (useServiceRole) {
    console.log('✓ Using SERVICE ROLE KEY (admin access, no rate limits)');
  } else {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  WARNING: SUPABASE_SERVICE_ROLE_KEY not found!         ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  To fix this:                                          ║');
    console.log('║  1. Go to https://supabase.com/dashboard               ║');
    console.log('║  2. Select your project                                ║');
    console.log('║  3. Go to Settings > API                               ║');
    console.log('║  4. Copy the "service_role" secret key                 ║');
    console.log('║  5. Add to .env.local:                                 ║');
    console.log('║     SUPABASE_SERVICE_ROLE_KEY=your-key-here            ║');
    console.log('║  6. Run this script again                              ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Attempting with ANON KEY (may hit rate limits)...');
    console.log('');
  }

  // Create client
  const supabase = createClient(
    SUPABASE_URL,
    useServiceRole ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Get all users from database
  console.log('Fetching users from database...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, email, display_name, auth_user_id, is_active')
    .eq('is_active', true);

  if (usersError) {
    console.error('ERROR fetching users:', usersError.message);
    process.exit(1);
  }

  console.log(`Found ${users.length} users\n`);

  // Show current status
  console.log('Current Status:');
  console.log('-'.repeat(60));
  users.forEach(u => {
    const status = u.auth_user_id ? '✓ Linked' : '✗ Missing';
    console.log(`  ${status}  ${u.username.padEnd(15)} ${u.email || 'no-email'}`);
  });
  console.log('-'.repeat(60));
  console.log('');

  // Process each user
  const results = { success: [], failed: [], skipped: [] };

  for (const user of users) {
    console.log(`\nProcessing: ${user.username} (${user.email})`);

    // Skip if already has auth
    if (user.auth_user_id) {
      console.log('  → Already has auth linked, skipping');
      results.skipped.push(user.username);
      continue;
    }

    // Skip if no email
    if (!user.email) {
      console.log('  → No email, skipping');
      results.failed.push({ username: user.username, error: 'No email' });
      continue;
    }

    try {
      let authUserId = null;

      if (useServiceRole) {
        // Use admin API (no rate limits, auto-confirms email)
        console.log('  → Creating auth user via admin API...');

        // First check if user exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === user.email);

        if (existing) {
          console.log('  → Auth user already exists:', existing.id);
          authUserId = existing.id;
        } else {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              display_name: user.display_name,
              username: user.username
            }
          });

          if (authError) {
            throw new Error(authError.message);
          }
          authUserId = authData.user.id;
          console.log('  → Created auth user:', authUserId);
        }
      } else {
        // Use regular signUp (subject to rate limits)
        console.log('  → Creating auth user via signUp...');

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: user.email,
          password: DEFAULT_PASSWORD,
          options: {
            data: {
              display_name: user.display_name,
              username: user.username
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('rate limit')) {
            throw new Error('RATE LIMITED - Add SUPABASE_SERVICE_ROLE_KEY to .env.local');
          } else if (signUpError.message.includes('already registered')) {
            // Try to sign in
            console.log('  → Account exists, trying sign in...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: DEFAULT_PASSWORD
            });
            if (signInError) throw new Error('Auth exists but password wrong');
            authUserId = signInData.user?.id;
            await supabase.auth.signOut();
          } else {
            throw new Error(signUpError.message);
          }
        } else {
          authUserId = signUpData.user?.id;
          if (signUpData.session) {
            await supabase.auth.signOut();
          }
        }
      }

      if (!authUserId) {
        throw new Error('No auth user ID obtained');
      }

      // Link to database
      console.log('  → Linking auth_user_id to database...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_user_id: authUserId })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Database update failed: ' + updateError.message);
      }

      // Verify
      const { data: verify } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('id', user.id)
        .single();

      if (verify?.auth_user_id !== authUserId) {
        throw new Error('Verification failed - auth_user_id not saved');
      }

      console.log('  → SUCCESS!');
      results.success.push(user.username);

      // Small delay between users
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.log('  → FAILED:', error.message);
      results.failed.push({ username: user.username, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Success: ${results.success.length}${results.success.length > 0 ? ' - ' + results.success.join(', ') : ''}`);
  console.log(`→ Skipped: ${results.skipped.length}${results.skipped.length > 0 ? ' - ' + results.skipped.join(', ') : ''}`);
  console.log(`✗ Failed:  ${results.failed.length}`);
  results.failed.forEach(f => console.log(`    - ${f.username}: ${f.error}`));

  console.log('\n' + '='.repeat(60));
  if (results.success.length > 0 || results.skipped.length === users.length) {
    console.log('Setup complete! Try logging in at http://localhost:3001 with:');
    console.log('  Username: admin');
    console.log('  Password: Password123!');
  } else if (results.failed.some(f => f.error.includes('RATE LIMITED'))) {
    console.log('RATE LIMITED! You must add SUPABASE_SERVICE_ROLE_KEY to .env.local');
    console.log('Get it from: Supabase Dashboard > Settings > API > service_role');
  } else {
    console.log('Some users failed. Check errors above.');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
