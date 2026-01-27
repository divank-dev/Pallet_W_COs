/**
 * Seed Users Script
 *
 * This script creates Supabase Auth accounts for the default test users
 * and links them to the corresponding user profiles in the users table.
 *
 * Prerequisites:
 * - Supabase project set up
 * - Environment variables configured (.env.local):
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (requires service role key for admin operations)
 *
 * Run with: npx tsx scripts/seed-users.ts
 *
 * Default password for all users: Password123!
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  console.error('- VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'missing');
  console.error('\nMake sure to set these in your .env.local file');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Default users to seed
const DEFAULT_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@company.com',
    password: 'Password123!',
    displayName: 'Administrator',
    username: 'admin'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'manager@company.com',
    password: 'Password123!',
    displayName: 'Manager User',
    username: 'manager'
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'sales@company.com',
    password: 'Password123!',
    displayName: 'Sales User',
    username: 'sales'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'production@company.com',
    password: 'Password123!',
    displayName: 'Production User',
    username: 'production'
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'fulfillment@company.com',
    password: 'Password123!',
    displayName: 'Fulfillment User',
    username: 'fulfillment'
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'readonly@company.com',
    password: 'Password123!',
    displayName: 'ReadOnly User',
    username: 'readonly'
  }
];

async function seedUsers() {
  console.log('Starting user seed...\n');

  for (const user of DEFAULT_USERS) {
    console.log(`Processing user: ${user.username} (${user.email})`);

    try {
      // Step 1: Check if auth user already exists
      const { data: existingAuthUsers, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        console.error(`  Error listing users:`, listError.message);
        continue;
      }

      const existingAuthUser = existingAuthUsers.users.find(u => u.email === user.email);

      let authUserId: string;

      if (existingAuthUser) {
        console.log(`  Auth user already exists: ${existingAuthUser.id}`);
        authUserId = existingAuthUser.id;
      } else {
        // Step 2: Create Supabase Auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            display_name: user.displayName
          }
        });

        if (authError) {
          console.error(`  Error creating auth user:`, authError.message);
          continue;
        }

        if (!authData.user) {
          console.error(`  Failed to create auth user - no user returned`);
          continue;
        }

        authUserId = authData.user.id;
        console.log(`  Created auth user: ${authUserId}`);
      }

      // Step 3: Link auth user to users table entry
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_user_id: authUserId })
        .eq('id', user.id);

      if (updateError) {
        console.error(`  Error linking auth user to profile:`, updateError.message);

        // If the user doesn't exist in the users table, create them
        if (updateError.code === 'PGRST116' || updateError.message.includes('0 rows')) {
          console.log(`  User profile not found, attempting to create...`);

          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              auth_user_id: authUserId,
              username: user.username,
              display_name: user.displayName,
              email: user.email,
              role: user.username === 'admin' ? 'Admin' :
                    user.username === 'manager' ? 'Manager' :
                    user.username === 'sales' ? 'Sales' :
                    user.username === 'production' ? 'Production' :
                    user.username === 'fulfillment' ? 'Fulfillment' : 'ReadOnly',
              department: user.username === 'sales' ? 'Sales' :
                         user.username === 'production' ? 'Production' :
                         user.username === 'fulfillment' ? 'Fulfillment' : 'Administration',
              is_active: true
            });

          if (insertError) {
            console.error(`  Error creating user profile:`, insertError.message);
          } else {
            console.log(`  Created user profile`);
          }
        }
      } else {
        console.log(`  Linked auth user to profile`);
      }

      console.log(`  Done!\n`);
    } catch (error) {
      console.error(`  Unexpected error:`, error);
    }
  }

  console.log('User seed complete!');
  console.log('\nDefault credentials:');
  console.log('  Password for all users: Password123!');
  console.log('\nTest users:');
  DEFAULT_USERS.forEach(u => {
    console.log(`  - ${u.username}: ${u.email}`);
  });
}

// Run the seed
seedUsers().catch(console.error);
