import { useState } from 'react';
import { Mail, Lock, LogIn, CheckCircle, ShieldCheck, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type Mode = 'otp-request' | 'otp-verify' | 'password' | 'forgot-password';

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { signIn, requestPasswordReset, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [mode, setMode] = useState<Mode>('otp-request');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const e164Phone = `+91${phone.replace(/\D/g, '')}`;

  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      console.error('Login error:', signInError);

      if (signInError.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Please confirm your email address before logging in.');
      } else {
        setError(signInError.message);
      }
      setLoading(false);
    } else {
      onLoginSuccess();
    }
  };

  const sendOtp = async () => {
    setError('');
    setLoading(true);

    const { error: otpError } = await sendPhoneOtp(e164Phone);

    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setMode('otp-verify');
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: verifyError } = await verifyPhoneOtp(e164Phone, otpCode.trim());

    if (verifyError) {
      setError('Incorrect or expired code. Please try again.');
      setLoading(false);
    } else {
      onLoginSuccess();
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSending(true);

    const { error } = await requestPasswordReset(resetEmail);

    setResetSending(false);
    if (error) {
      setResetError(error.message);
    } else {
      setResetSent(true);
    }
  };

  if (mode === 'forgot-password') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl border border-black/10 p-8">
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-ink/10 rounded-full mb-4">
                <Mail className="w-12 h-12 text-ink" />
              </div>
              <h2 className="font-serif text-3xl font-semibold text-ink">Reset Password</h2>
              <p className="text-charcoal/70 mt-2">
                {resetSent
                  ? "We've sent a reset link to your email."
                  : "Enter your email and we'll send you a link to reset your password."}
              </p>
            </div>

            {resetSent ? (
              <div className="text-center space-y-6">
                <div className="p-4 bg-sage-tint border border-moss/30 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-green flex-shrink-0" />
                  <p className="text-sm text-ink text-left">
                    Check <strong>{resetEmail}</strong> for a password reset link. It may take a
                    few minutes to arrive — check spam too.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMode('password');
                    setResetSent(false);
                    setResetEmail('');
                  }}
                  className="text-ink font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-6">
                {resetError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{resetError}</p>
                  </div>
                )}
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-charcoal mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetSending}
                  className="w-full bg-ink text-white py-3 rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetSending ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('password')}
                  className="w-full text-center text-ink font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl border border-black/10 p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-ink/10 rounded-full mb-4">
              {mode === 'otp-verify' ? (
                <ShieldCheck className="w-12 h-12 text-ink" />
              ) : (
                <LogIn className="w-12 h-12 text-ink" />
              )}
            </div>
            <h2 className="font-serif text-3xl font-semibold text-ink">
              {mode === 'otp-verify' ? 'Enter Verification Code' : 'Welcome Back'}
            </h2>
            <p className="text-charcoal/70 mt-2">
              {mode === 'otp-verify'
                ? `We sent a 6-digit code to your WhatsApp (${e164Phone})`
                : mode === 'password'
                ? 'Sign in with your password'
                : 'Sign in or create an account'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {mode === 'otp-request' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-charcoal mb-2">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                  <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-charcoal/50">+91</span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-[4.5rem] pr-4 py-3 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    placeholder="98765 43210"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length !== 10}
                className="w-full bg-ink text-white py-3 rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </button>

              <p className="text-xs text-charcoal/50 text-center">
                New here? We'll create your account automatically once you verify your WhatsApp number.
              </p>
            </form>
          )}

          {mode === 'otp-verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-charcoal mb-2">
                  6-Digit Code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent text-center text-2xl tracking-[0.5em] font-semibold"
                  placeholder="------"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-ink text-white py-3 rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMode('otp-request');
                    setOtpCode('');
                    setError('');
                  }}
                  className="text-charcoal/70 hover:underline"
                >
                  Use a different number
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  className="text-ink font-medium hover:underline"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {mode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="pw-email" className="block text-sm font-medium text-charcoal mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                  <input
                    id="pw-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setMode('forgot-password');
                    }}
                    className="text-sm text-ink font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-white py-3 rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            {mode !== 'password' ? (
              <p className="text-charcoal/70 text-sm">
                Admin or team member?{' '}
                <button
                  onClick={() => {
                    setMode('password');
                    setError('');
                  }}
                  className="text-ink font-semibold hover:underline"
                >
                  Sign in with password
                </button>
              </p>
            ) : (
              <p className="text-charcoal/70 text-sm">
                Shopping with us?{' '}
                <button
                  onClick={() => {
                    setMode('otp-request');
                    setError('');
                  }}
                  className="text-ink font-semibold hover:underline"
                >
                  Sign in with WhatsApp code
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
