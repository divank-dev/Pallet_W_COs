import React, { useState, useEffect } from 'react';
import { Shirt, User, Lock, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { fetchAllUsers } from '../src/lib/userService';

// Helper to bypass TypeScript for setup operations
const updateUserAuthId = async (username: string, authUserId: string, email?: string) => {
  const updates: Record<string, any> = { auth_user_id: authUserId };
  if (email) updates.email = email;

  return (supabase as any)
    .from('users')
    .update(updates)
    .eq('username', username);
};

const updateUserByRole = async (role: string, authUserId: string, email?: string) => {
  const updates: Record<string, any> = { auth_user_id: authUserId };
  if (email) updates.email = email;

  return (supabase as any)
    .from('users')
    .update(updates)
    .eq('role', role)
    .is('auth_user_id', null)
    .limit(1);
};

interface InitialSetupProps {
  onSetupComplete: () => void;
}

const InitialSetup: React.FC<InitialSetupProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState<'checking' | 'setup' | 'creating'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Form state
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('Password123!');
  const [confirmPassword, setConfirmPassword] = useState('Password123!');

  const addDebug = (msg: string) => {
    console.log('[Setup]', msg);
    setDebugInfo(prev => [...prev, msg]);
  };

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    addDebug('Checking setup status...');

    try {
      // Check if there are any users with auth_user_id linked
      addDebug('Fetching users from database...');
      const users = await fetchAllUsers();
      addDebug(`Found ${users.length} users in database`);

      if (users.length === 0) {
        addDebug('No users found - need to run SQL migration first');
        setError('No users found in database. Please run the SQL migration first: npx supabase db push');
        setStep('setup');
        return;
      }

      // Check if any user has auth_user_id linked
      const { data: usersWithAuth, error: queryError } = await supabase
        .from('users')
        .select('id, username, email, auth_user_id')
        .not('auth_user_id', 'is', null);

      if (queryError) {
        addDebug(`Error checking auth links: ${queryError.message}`);
        throw queryError;
      }

      addDebug(`Found ${usersWithAuth?.length ?? 0} users with auth_user_id linked`);

      if (usersWithAuth && usersWithAuth.length > 0) {
        addDebug('Setup already complete - users have auth linked');
        onSetupComplete();
        return;
      }

      // Need to set up auth users
      addDebug('No auth users linked - showing setup form');
      setStep('setup');
    } catch (err) {
      addDebug(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Failed to check setup status');
      setStep('setup');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setStep('creating');
    addDebug(`Creating admin auth account for: ${email}`);

    try {
      // Step 1: Create the Supabase Auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: 'Administrator'
          }
        }
      });

      if (authError) {
        addDebug(`Auth signup error: ${authError.message}`);
        if (authError.message.includes('rate limit') || authError.message.includes('rate_limit')) {
          throw new Error('Rate limit exceeded. Please wait a few minutes and try again, or create users manually in the Supabase Dashboard.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create auth account');
      }

      addDebug(`Auth account created: ${authData.user.id}`);

      // Step 2: Link to the admin user in users table
      const { error: updateError } = await updateUserAuthId('admin', authData.user.id, email);

      if (updateError) {
        addDebug(`Error linking auth to user: ${updateError.message}`);
        // Try to find by role if username doesn't exist
        const { error: updateError2 } = await updateUserByRole('Admin', authData.user.id, email);

        if (updateError2) {
          addDebug(`Second attempt error: ${updateError2.message}`);
          throw new Error('Failed to link auth account to user profile');
        }
      }

      addDebug('Successfully linked auth to admin user');
      addDebug('Setup complete! You can now log in.');

      // Sign out so user can log in fresh
      await supabase.auth.signOut();

      // Brief delay then complete setup
      setTimeout(() => {
        onSetupComplete();
      }, 2000);

    } catch (err) {
      addDebug(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Failed to create admin account');
      setStep('setup');
    }
  };

  const createAllDefaultUsers = async () => {
    setError(null);
    setStep('creating');

    const defaultUsers = [
      { username: 'admin', email: 'admin@company.com', displayName: 'Administrator', role: 'Admin' },
      { username: 'manager', email: 'manager@company.com', displayName: 'Manager User', role: 'Manager' },
      { username: 'sales', email: 'sales@company.com', displayName: 'Sales User', role: 'Sales' },
      { username: 'production', email: 'production@company.com', displayName: 'Production User', role: 'Production' },
      { username: 'fulfillment', email: 'fulfillment@company.com', displayName: 'Fulfillment User', role: 'Fulfillment' },
      { username: 'readonly', email: 'readonly@company.com', displayName: 'ReadOnly User', role: 'ReadOnly' },
    ];

    for (const user of defaultUsers) {
      addDebug(`Creating auth for: ${user.username}`);

      try {
        // Create auth account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email,
          password: password, // Use the password from form
          options: {
            data: { display_name: user.displayName }
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            addDebug(`  ${user.username}: Already exists, skipping`);
            continue;
          }
          addDebug(`  ${user.username}: Auth error - ${authError.message}`);
          continue;
        }

        if (!authData.user) {
          addDebug(`  ${user.username}: No user returned`);
          continue;
        }

        addDebug(`  ${user.username}: Auth created (${authData.user.id})`);

        // Link to users table
        const { error: updateError } = await updateUserAuthId(user.username, authData.user.id);

        if (updateError) {
          addDebug(`  ${user.username}: Link error - ${updateError.message}`);
        } else {
          addDebug(`  ${user.username}: Linked successfully`);
        }

        // Sign out after each to avoid session issues
        await supabase.auth.signOut();

      } catch (err) {
        addDebug(`  ${user.username}: Exception - ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    addDebug('Finished creating all users');
    addDebug(`Default password for all users: ${password}`);

    setTimeout(() => {
      onSetupComplete();
    }, 3000);
  };

  if (step === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
            <Shirt size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">Pallet</h1>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span>Checking setup status...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
            <Shirt size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Pallet</h1>
          <p className="text-slate-400 mt-1">Initial Setup</p>
        </div>

        {/* Setup Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome to Pallet!</h2>
          <p className="text-slate-500 mb-6">
            Set up your admin account to get started. This will create the authentication accounts needed for login.
          </p>

          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="admin@company.com"
                  required
                  disabled={step === 'creating'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Min 6 characters"
                  required
                  disabled={step === 'creating'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Confirm password"
                  required
                  disabled={step === 'creating'}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={step === 'creating'}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {step === 'creating' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <User size={18} />
                    Create Admin Only
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={createAllDefaultUsers}
              disabled={step === 'creating'}
              className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Create All 6 Default Users
            </button>
          </form>

          {/* Debug Log */}
          {debugInfo.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Setup Log</p>
              <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                {debugInfo.map((msg, i) => (
                  <div key={i} className="text-xs text-green-400 font-mono">
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Default test users: admin, manager, sales, production, fulfillment, readonly
        </p>
      </div>
    </div>
  );
};

export default InitialSetup;
