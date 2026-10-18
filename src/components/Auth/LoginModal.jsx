import React, { useState } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { X, Lock, Mail, CheckCircle2, User, Building2, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';

const TITLES = {
  LOGIN: { icon: Lock, title: 'Login to Your Account' },
  REGISTER: { icon: UserPlus, title: 'Create Your Account' },
  FORGOT: { icon: KeyRound, title: 'Forgot Your Password?' },
  RESET: { icon: KeyRound, title: 'Choose a New Password' }
};

const Field = ({ label, icon: Icon, ...input }) => (
  <div>
    <label className="block mb-1.5 font-bold text-slate-800">{label}</label>
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        {...input}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-lime-500 focus:outline-none"
      />
    </div>
  </div>
);

const SubmitButton = ({ busy, children, busyText }) => (
  <button
    type="submit"
    disabled={busy}
    className="w-full bg-lime-500 hover:bg-lime-600 disabled:opacity-60 text-slate-950 font-black text-sm py-3 rounded-xl transition-all shadow-md shadow-lime-200 uppercase tracking-wider"
  >
    {busy ? busyText : children}
  </button>
);

// One login for everyone: signing in opens the user's own account.
// Modes: LOGIN, REGISTER (sign up), FORGOT (email a reset link), RESET (opened from that link, needs resetToken)
export const LoginModal = ({ onClose, initialMode = 'LOGIN', resetToken }) => {
  const { loginUser, registerUser, requestPasswordReset, resetPassword } = useAuction();
  const [authMode, setAuthMode] = useState(initialMode);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Email is kept when switching, so "Forgot password?" starts with what was typed
  const switchMode = (mode) => {
    setAuthMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
    setResetSent(false);
  };

  // Runs a server call with the busy flag; closes the modal shortly after a successful sign-in
  const submit = async (call, welcome) => {
    setBusy(true);
    setErrorMsg('');
    const res = await call();
    setBusy(false);
    if (res.success) {
      setSuccessMsg(welcome);
      setTimeout(onClose, 700);
    } else {
      setErrorMsg(res.error || 'Something went wrong. Please try again.');
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    submit(() => loginUser(email, password), `Welcome back! Logged in as ${email.split('@')[0]}`);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    submit(() => registerUser({ name, email, password, orgName }), `Account created successfully! Welcome, ${name}.`);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');
    const res = await requestPasswordReset(email);
    setBusy(false);
    if (res.success) setResetSent(true);
    else setErrorMsg(res.error);
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("The two passwords don't match.");
      return;
    }
    submit(() => resetPassword(resetToken, password), 'Password changed. You are now logged in.');
  };

  const { icon: TitleIcon, title } = TITLES[authMode];
  const linkButton = 'font-extrabold text-lime-700 hover:text-lime-800 hover:underline';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div role="dialog" aria-modal="true" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Top Accent background bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-lime-500 via-emerald-500 to-indigo-600"></div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center font-bold shadow-md">
              <TitleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 font-medium">Force Pulse · Player Auction Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-lime-50 border border-lime-300 text-lime-900 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-lime-600 shrink-0" />
            {successMsg}
          </div>
        )}

        {authMode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
            <Field label="Email Address" icon={Mail} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

            <div>
              <Field label="Password" icon={Lock} type="password" required autoComplete="current-password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="mt-2 text-right">
                <button type="button" onClick={() => switchMode('FORGOT')} className={linkButton}>
                  Forgot password?
                </button>
              </div>
            </div>

            <SubmitButton busy={busy} busyText="Logging in…">Login →</SubmitButton>

            <p className="text-center text-slate-500">
              Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('REGISTER')} className={linkButton}>Sign up</button>
            </p>
          </form>
        )}

        {authMode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
            <Field label="Your Full Name" icon={User} type="text" required autoComplete="name" placeholder="e.g. Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="League / Organization Name" icon={Building2} type="text" placeholder="e.g. Corporate Champions League" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <Field label="Email Address" icon={Mail} type="email" required autoComplete="email" placeholder="rahul@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="Choose Password" icon={Lock} type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />

            <SubmitButton busy={busy} busyText="Creating account…">Sign Up →</SubmitButton>

            <p className="text-center text-slate-500">
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('LOGIN')} className={linkButton}>Login</button>
            </p>
          </form>
        )}

        {authMode === 'FORGOT' && (
          resetSent ? (
            <div className="space-y-4 text-sm text-slate-600">
              <div className="bg-lime-50 border border-lime-300 text-lime-900 text-xs font-bold p-4 rounded-xl flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-600 shrink-0 mt-0.5" />
                <span>If an account exists for <strong>{email}</strong>, we've emailed a link to reset the password. It expires in 1 hour. Check your spam folder too.</span>
              </div>
              <button type="button" onClick={() => switchMode('LOGIN')} className={`inline-flex items-center gap-1.5 text-xs ${linkButton}`}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <p className="text-sm font-medium text-slate-500">
                Enter the email you signed up with and we'll send you a link to choose a new password.
              </p>
              <Field label="Email Address" icon={Mail} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

              <SubmitButton busy={busy} busyText="Sending link…">Send Reset Link →</SubmitButton>

              <button type="button" onClick={() => switchMode('LOGIN')} className={`inline-flex items-center gap-1.5 ${linkButton}`}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </button>
            </form>
          )
        )}

        {authMode === 'RESET' && (
          <form onSubmit={handleResetSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
            <Field label="New Password" icon={Lock} type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Field label="Confirm New Password" icon={Lock} type="password" required minLength={8} autoComplete="new-password" placeholder="Type it again" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

            <SubmitButton busy={busy} busyText="Saving…">Save New Password →</SubmitButton>

            <button type="button" onClick={() => switchMode('FORGOT')} className={linkButton}>
              Link expired? Send a new one
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
