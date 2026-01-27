/**
 * Setup Wizard - First-run setup for the Pallet application
 *
 * This component handles:
 * - Detecting if setup is needed (checking for users with auth)
 * - Creating default users with Supabase Auth
 * - Providing clear feedback on progress and errors
 * - Recovery from partial setup states
 *
 * ARCHITECTURE:
 * - Uses isolated Supabase client for auth operations (doesn't affect main session)
 * - Supports idempotent operations (can retry safely)
 * - Handles rate limiting gracefully
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shirt,
  Users,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Terminal,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  checkSetupStatus,
  runInitialSetup,
  getDefaultPassword,
  getDefaultUsers,
  runAuthDiagnostics,
  validateEnvironment,
  type SetupStatus,
  type SetupResult,
  type AuthDiagnostics
} from '../src/lib/authService';

interface SetupWizardProps {
  onComplete: () => void;
}

type SetupStep = 'checking' | 'diagnostics' | 'ready' | 'running' | 'complete' | 'error';

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<SetupStep>('checking');
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostics | null>(null);
  const [password, setPassword] = useState(getDefaultPassword());
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' | 'warn' }>>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString();
    console.log(`[SetupWizard] [${type.toUpperCase()}] ${message}`);
    setLogs(prev => [...prev, { time, message, type }]);
  }, []);

  // Check environment on mount
  useEffect(() => {
    const envCheck = validateEnvironment();
    if (!envCheck.valid) {
      envCheck.errors.forEach(e => addLog(e, 'error'));
      setStep('error');
      return;
    }
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStep('checking');
    addLog('Checking setup status...');

    try {
      const setupStatus = await checkSetupStatus();
      setStatus(setupStatus);
      addLog(setupStatus.message, setupStatus.needsSetup ? 'warn' : 'success');

      if (setupStatus.needsSetup) {
        // Run diagnostics to understand the current state
        addLog('Running diagnostics...');
        const diag = await runAuthDiagnostics();
        setDiagnostics(diag);

        if (!diag.supabaseConnected) {
          addLog('Cannot connect to Supabase', 'error');
          setStep('error');
          return;
        }

        if (!diag.usersTableAccessible) {
          addLog('Users table not accessible - run database migration first', 'error');
          setStep('error');
          return;
        }

        setStep('ready');
      } else {
        addLog('Setup already complete!', 'success');
        setStep('complete');
        setTimeout(onComplete, 1500);
      }
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      setStep('error');
    }
  };

  const runDiagnostics = async () => {
    setStep('diagnostics');
    addLog('Running full diagnostics...');

    try {
      const diag = await runAuthDiagnostics();
      setDiagnostics(diag);

      if (diag.supabaseConnected) {
        addLog('Supabase connection: OK', 'success');
      } else {
        addLog('Supabase connection: FAILED', 'error');
      }

      if (diag.usersTableAccessible) {
        addLog('Users table: ACCESSIBLE', 'success');
      } else {
        addLog('Users table: NOT ACCESSIBLE', 'error');
      }

      if (diag.currentSession) {
        addLog(`Active session: ${diag.sessionUserId}`, 'info');
      } else {
        addLog('No active session', 'info');
      }

      if (diag.errors.length > 0) {
        diag.errors.forEach(e => addLog(e, 'error'));
      }

      setStep('ready');
    } catch (error) {
      addLog(`Diagnostics failed: ${error}`, 'error');
      setStep('error');
    }
  };

  const runSetup = async () => {
    setStep('running');
    setRetryCount(prev => prev + 1);
    addLog(`Starting setup (attempt ${retryCount + 1})...`);
    addLog(`Using password: ${'*'.repeat(password.length)}`);

    try {
      const setupResult = await runInitialSetup(password);
      setResult(setupResult);

      if (setupResult.usersCreated.length > 0) {
        addLog(`Created ${setupResult.usersCreated.length} users:`, 'success');
        setupResult.usersCreated.forEach(u => addLog(`  + ${u}`, 'success'));
      }

      if (setupResult.usersSkipped.length > 0) {
        addLog(`Skipped ${setupResult.usersSkipped.length} users (already set up):`, 'info');
        setupResult.usersSkipped.forEach(u => addLog(`  ~ ${u}`, 'info'));
      }

      if (setupResult.errors.length > 0) {
        addLog(`Encountered ${setupResult.errors.length} errors:`, 'error');
        setupResult.errors.forEach(e => addLog(`  ! ${e}`, 'error'));
      }

      if (setupResult.success) {
        addLog('Setup complete! You can now log in.', 'success');
        setStep('complete');
      } else if (setupResult.usersCreated.length > 0 || setupResult.usersSkipped.length > 0) {
        // Partial success - some users are available
        addLog('Partial setup complete. Some users may be available.', 'warn');
        setStep('complete');
      } else {
        addLog('Setup failed. Please check the errors above.', 'error');
        setStep('error');
      }
    } catch (error) {
      addLog(`Setup error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      setStep('error');
    }
  };

  const defaultUsers = getDefaultUsers();

  // Environment error
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Configuration Error</h2>
          <p className="text-slate-600 mb-4">
            The application is not properly configured. Please check your environment variables.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-4">
            <ul className="text-red-700 text-sm space-y-1">
              {envCheck.errors.map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            Create a <code className="bg-slate-100 px-1 rounded">.env.local</code> file with your Supabase credentials.
          </p>
        </div>
      </div>
    );
  }

  // Checking status
  if (step === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4 animate-pulse">
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
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
            <Shirt size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Pallet Setup</h1>
          <p className="text-slate-400 mt-1">Configure your production management system</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Status Banner */}
          <div className={`px-6 py-4 ${
            step === 'complete' ? 'bg-green-50 border-b border-green-100' :
            step === 'error' ? 'bg-red-50 border-b border-red-100' :
            step === 'running' ? 'bg-blue-50 border-b border-blue-100' :
            'bg-amber-50 border-b border-amber-100'
          }`}>
            <div className="flex items-center gap-3">
              {step === 'complete' ? (
                <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
              ) : step === 'error' ? (
                <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              ) : step === 'running' ? (
                <Loader2 className="text-blue-600 flex-shrink-0 animate-spin" size={24} />
              ) : (
                <AlertTriangle className="text-amber-600 flex-shrink-0" size={24} />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  step === 'complete' ? 'text-green-800' :
                  step === 'error' ? 'text-red-800' :
                  step === 'running' ? 'text-blue-800' :
                  'text-amber-800'
                }`}>
                  {step === 'complete' ? 'Setup Complete!' :
                   step === 'error' ? 'Setup Issue' :
                   step === 'running' ? 'Setting Up...' :
                   'Setup Required'}
                </p>
                {status && (
                  <p className={`text-sm ${
                    step === 'complete' ? 'text-green-600' :
                    step === 'error' ? 'text-red-600' :
                    step === 'running' ? 'text-blue-600' :
                    'text-amber-600'
                  }`}>
                    {status.message}
                  </p>
                )}
              </div>
              {/* Connection indicator */}
              <div className="flex items-center gap-1 text-xs">
                {diagnostics?.supabaseConnected ? (
                  <><Wifi size={14} className="text-green-500" /> <span className="text-green-600">Connected</span></>
                ) : diagnostics ? (
                  <><WifiOff size={14} className="text-red-500" /> <span className="text-red-600">Disconnected</span></>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Ready State - Show setup options */}
            {(step === 'ready' || step === 'diagnostics') && (
              <>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Create User Accounts</h2>
                <p className="text-slate-600 mb-6">
                  This will create {defaultUsers.length} default user accounts with Supabase authentication.
                  Each user can log in from any device.
                </p>

                {/* Status details */}
                {status?.details && (
                  <div className="bg-slate-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {status.usersWithAuthCount} of {status.usersTableCount} users have auth
                      </span>
                      <button
                        onClick={runDiagnostics}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Terminal size={12} /> Run Diagnostics
                      </button>
                    </div>
                    {status.details.missingAuthUsers.length > 0 && (
                      <p className="text-xs text-amber-600">
                        Missing auth: {status.details.missingAuthUsers.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Default Users Preview */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Users to Create</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {defaultUsers.map(user => (
                      <div key={user.username} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                          user.role === 'Admin' ? 'bg-purple-500' :
                          user.role === 'Manager' ? 'bg-blue-500' :
                          user.role === 'Sales' ? 'bg-green-500' :
                          user.role === 'Production' ? 'bg-amber-500' :
                          user.role === 'Fulfillment' ? 'bg-cyan-500' :
                          'bg-slate-400'
                        }`} />
                        <span className="font-medium text-slate-700">{user.username}</span>
                        <span className="text-slate-400">({user.role})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Password Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Lock size={16} className="inline mr-1" />
                    Password for all accounts
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                    placeholder="Enter password"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Minimum 6 characters. Users can change their passwords after logging in.
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={runSetup}
                  disabled={password.length < 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Users size={20} />
                  Create All Users
                  <ArrowRight size={20} />
                </button>

                {retryCount > 0 && (
                  <p className="text-xs text-amber-600 text-center mt-2">
                    Attempt #{retryCount + 1} - Previous attempts had issues
                  </p>
                )}
              </>
            )}

            {/* Running State */}
            {step === 'running' && (
              <div className="text-center py-8">
                <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Creating Accounts...</h2>
                <p className="text-slate-600 mb-4">
                  Creating user accounts with Supabase. This may take a moment.
                </p>
                <p className="text-xs text-slate-400">
                  Processing {defaultUsers.length} users with 1 second delay between each to avoid rate limiting.
                </p>
              </div>
            )}

            {/* Complete State */}
            {step === 'complete' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Ready to Go!</h2>
                {result && (
                  <p className="text-slate-600 mb-6">
                    {result.usersCreated.length > 0 && `Created ${result.usersCreated.length} users. `}
                    {result.usersSkipped.length > 0 && `${result.usersSkipped.length} already set up.`}
                  </p>
                )}

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
                  <h3 className="font-bold text-green-800 mb-2">Login Credentials</h3>
                  <p className="text-green-700 text-sm">
                    Username: <code className="bg-green-100 px-2 py-0.5 rounded">admin</code>
                    <br />
                    Password: <code className="bg-green-100 px-2 py-0.5 rounded">{password}</code>
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
                  <h3 className="font-bold text-blue-800 mb-2">Multi-Terminal Access</h3>
                  <p className="text-blue-700 text-sm">
                    Users can now log in from any browser or device using their credentials.
                    Sessions are independent - logging in on one device won't affect others.
                  </p>
                </div>

                <button
                  onClick={onComplete}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-colors"
                >
                  Continue to Login
                </button>
              </div>
            )}

            {/* Error State */}
            {step === 'error' && (
              <div className="py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Setup Issue</h2>
                    <p className="text-slate-600 text-sm">
                      {result?.errors.length
                        ? `${result.errors.length} error(s) occurred during setup`
                        : 'Unable to complete setup'}
                    </p>
                  </div>
                </div>

                {result && result.usersCreated.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <h3 className="font-bold text-green-800 mb-2">Successfully Created</h3>
                    <p className="text-green-700 text-sm">{result.usersCreated.join(', ')}</p>
                  </div>
                )}

                {result && result.usersSkipped.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <h3 className="font-bold text-blue-800 mb-2">Already Set Up</h3>
                    <p className="text-blue-700 text-sm">{result.usersSkipped.join(', ')}</p>
                  </div>
                )}

                {result && result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <h3 className="font-bold text-red-800 mb-2">Errors</h3>
                    <ul className="text-red-700 text-sm space-y-1">
                      {result.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={runSetup}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Retry Setup
                  </button>
                  {(result?.usersCreated.length ?? 0) > 0 || (result?.usersSkipped.length ?? 0) > 0 ? (
                    <button
                      onClick={onComplete}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                    >
                      Continue Anyway
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* Log Output Toggle */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <Terminal size={14} />
                {showLogs ? 'Hide' : 'Show'} Setup Log ({logs.length} entries)
              </button>

              {showLogs && logs.length > 0 && (
                <div className="mt-2 bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className={`text-xs font-mono ${
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'warn' ? 'text-amber-400' :
                      'text-slate-400'
                    }`}>
                      <span className="text-slate-600">{log.time}</span> {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Credentials are stored securely in Supabase and work on any device
        </p>
      </div>
    </div>
  );
};

export default SetupWizard;
