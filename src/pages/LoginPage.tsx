import { useState } from 'react';
import { Mail, Lock, LogIn, CheckCircle, ShieldCheck, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigateToSignup: () => void;
  onLoginSuccess: () => void;
}

type Mode = 'otp-request' | 'otp-verify' | 'password' | 'forgot-password';
type OtpChannel = 'email' | 'phone';

export default function LoginPage({ onNavigateToSignup, onLoginSuccess }: LoginPageProps) {
  const { signIn, requestPasswordReset, sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [mode, setMode] = useState<Mode>('otp-request');
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('email');
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

    const { error: otpError } =
      otpChannel === 'email' ? await sendEmailOtp(email) : await sendPhoneOtp(e164Phone);

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

    const { error: verifyError } =
      otpChannel === 'email'
        ? await verifyEmailOtp(email, otpCode.trim())
        : await verifyPhoneOtp(e164Phone, otpCode.trim());

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
      <div className="min-h-screen bg-gradient-to-br from-[#211C17] to-[#3F5A34] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-[#211C17]/10 rounded-full mb-4">
                <Mail className="w-12 h-12 text-[#211C17]" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
              <p className="text-gray-600 mt-2">
                {resetSent
                  ? "We've sent a reset link to your email."
                  : "Enter your email and we'll send you a link to reset your password."}
              </p>
            </div>

            {resetSent ? (
              <div className="text-center space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 text-left">
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
                  className="text-[#211C17] font-semibold hover:underline"
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
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetSending}
                  className="w-full bg-[#211C17] text-white py-3 rounded-lg font-semibold hover:bg-[#140F0C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetSending ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('password')}
                  className="w-full text-center text-[#211C17] font-semibold hover:underline"
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
    <div className="min-h-screen bg-gradient-to-br from-[#211C17] to-[#3F5A34] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-[#211C17]/10 rounded-full mb-4">
              {mode === 'otp-verify' ? (
                <ShieldCheck className="w-12 h-12 text-[#211C17]" />
              ) : (
                <LogIn className="w-12 h-12 text-[#211C17]" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {mode === 'otp-verify' ? 'Enter Verification Code' : 'Welcome Back'}
            </h1>
            <p className="text-gray-600 mt-2">
              {mode === 'otp-verify'
                ? `We sent a 6-digit code to ${otpChannel === 'email' ? email : `your WhatsApp (${e164Phone})`}`
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
            <>
              <div className="flex rounded-lg border border-gray-200 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setOtpChannel('email');
                    setError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-colors ${
                    otpChannel === 'email' ? 'bg-[#211C17] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpChannel('phone');
                    setError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-colors ${
                    otpChannel === 'phone' ? 'bg-[#211C17] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-6">
                {otpChannel === 'email' ? (
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp Number
                    </label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-gray-500">+91</span>
                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-[4.5rem] pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                        placeholder="98765 43210"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (otpChannel === 'phone' && phone.length !== 10)}
                  className="w-full bg-[#211C17] text-white py-3 rounded-lg font-semibold hover:bg-[#140F0C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending code...' : 'Send Verification Code'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  {otpChannel === 'email'
                    ? "New here? We'll create your account automatically once you verify your email."
                    : "New here? We'll create your account automatically once you verify your WhatsApp number."}
              </p>
              </form>
            </>
          )}

          {mode === 'otp-verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent text-center text-2xl tracking-[0.5em] font-semibold"
                  placeholder="------"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-[#211C17] text-white py-3 rounded-lg font-semibold hover:bg-[#140F0C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="text-gray-600 hover:underline"
                >
                  Use a different {otpChannel === 'email' ? 'email' : 'number'}
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  className="text-[#211C17] font-medium hover:underline"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {mode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="pw-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="pw-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setMode('forgot-password');
                    }}
                    className="text-sm text-[#211C17] font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#211C17] text-white py-3 rounded-lg font-semibold hover:bg-[#140F0C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            {mode !== 'password' ? (
              <p className="text-gray-600 text-sm">
                Admin or team member?{' '}
                <button
                  onClick={() => {
                    setMode('password');
                    setError('');
                  }}
                  className="text-[#211C17] font-semibold hover:underline"
                >
                  Sign in with password
                </button>
              </p>
            ) : (
              <p className="text-gray-600 text-sm">
                Shopping with us?{' '}
                <button
                  onClick={() => {
                    setMode('otp-request');
                    setError('');
                  }}
                  className="text-[#211C17] font-semibold hover:underline"
                >
                  Sign in with email code
                </button>
              </p>
            )}
            <p className="text-gray-600">
              Setting up a team account?{' '}
              <button
                onClick={onNavigateToSignup}
                className="text-[#211C17] font-semibold hover:underline"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
