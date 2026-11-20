import React, { useState } from 'react';
import { ArrowRight, Car, KeyRound, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo, RoadNetworkGraphic } from './BrandMark';

type AuthMode = 'login' | 'register' | 'forgot' | 'admin';

export function AuthPortal() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, sendPasswordReset, logout } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [primaryVehicleReg, setPrimaryVehicleReg] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleGoogleAuth() {
    setError(null);
    setInfoMessage(null);
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setBusy(true);

    try {
      if (mode === 'login' || mode === 'admin') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both your email address and password.');
        }
        await loginWithEmail(email, password);
        if (mode === 'admin') {
          setInfoMessage('Signed in. Verifying administrative access...');
        }
      } else if (mode === 'register') {
        if (fullName.trim().length < 2) {
          throw new Error('Please enter your full name (at least 2 characters).');
        }
        if (!email.trim().includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (mobileNumber.trim().length < 8) {
          throw new Error('Please enter a valid mobile number.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await registerWithEmail({
          fullName,
          email,
          mobileNumber,
          password,
          primaryVehicleReg,
        });
      } else if (mode === 'forgot') {
        if (!email.trim().includes('@')) {
          throw new Error('Please enter your registered email address.');
        }
        await sendPasswordReset(email);
        setInfoMessage(
          'Password reset link dispatched. Check your inbox to set a new password.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication request failed.');
      if (mode === 'admin') {
        try {
          await logout();
        } catch {
          // ignore
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-[#171A1D] flex flex-col">
      {/* Dark Charcoal Top Bar */}
      <header className="bg-[#171A1D] text-white border-b border-[#24282C]">
        <div className="max-w-[1320px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <BrandLogo className="w-8 h-8" />
            <span className="font-display text-base font-bold tracking-tight text-white">
              TAFFIC-PRAHARI
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs text-[#92969A]">
            <span className="whitespace-nowrap shrink-0">Violation Reporting</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap shrink-0">AI Plate Recognition</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap shrink-0">Vehicle Challans</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'admin' ? 'login' : 'admin');
              setError(null);
              setInfoMessage(null);
            }}
            className="px-4 py-2 text-xs font-medium border border-[#3A4046] bg-[#24282C] text-white hover:border-[#F15A24] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {mode === 'admin' ? 'Citizen Access' : 'Admin Sign In'}
          </button>
        </div>
      </header>

      {/* Main Split */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch animate-page-enter">
        {/* Left Urban Mobility Brief */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.14em] text-[#F15A24] font-semibold mb-3">
                CITIZEN ROAD SAFETY PORTAL
              </p>
              <h1 className="font-display text-4xl lg:text-[46px] font-bold tracking-tight text-[#171A1D] leading-[1.1] max-w-2xl">
                Report Responsibly. Make Roads Safer.
              </h1>
              <p className="text-base text-[#4B5563] leading-relaxed max-w-xl mt-4">
                TAFFIC-PRAHARI connects everyday citizens with urban traffic oversight. File geotagged violation reports, extract vehicle plates with AI OCR, verify vehicle notices, and locate nearby traffic assistance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[#E2DFD7] pt-6">
              <div>
                <h2 className="text-sm font-semibold text-[#171A1D]">
                  Geotagged Evidence Capture
                </h2>
                <p className="text-xs text-[#6B7280] leading-relaxed mt-1">
                  Submit multi-photo evidence locked to verified browser GPS coordinates and street locations.
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#171A1D]">
                  AI Plate Recognition
                </h2>
                <p className="text-xs text-[#6B7280] leading-relaxed mt-1">
                  Automated plate reading with mandatory human verification before filing.
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#171A1D]">
                  Audited Resolution Timeline
                </h2>
                <p className="text-xs text-[#6B7280] leading-relaxed mt-1">
                  Every complaint receives a unique tracking ID and transparent administrative status log.
                </p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#171A1D]">
                  Vehicle Records & Assistance
                </h2>
                <p className="text-xs text-[#6B7280] leading-relaxed mt-1">
                  Check verified vehicle notices, challan integrations, and nearby police stations.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#171A1D] p-1 border border-[#24282C]">
            <RoadNetworkGraphic />
          </div>
        </section>

        {/* Right Authentication Card */}
        <section className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-white border border-[#E2DFD7] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between gap-4 border-b border-[#E2DFD7] pb-4 mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-[#171A1D]">
                  {mode === 'login' && 'Citizen Sign In'}
                  {mode === 'register' && 'Create Citizen Account'}
                  {mode === 'forgot' && 'Reset Password'}
                  {mode === 'admin' && 'Administrator Sign In'}
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {mode === 'admin'
                    ? 'Restricted to authorized traffic administration personnel.'
                    : 'Sign in to access your road safety workspace.'}
                </p>
              </div>
              {mode === 'admin' && <ShieldCheck className="w-5 h-5 text-[#F15A24] shrink-0" />}
            </div>

            {mode !== 'admin' && (
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#F5F3EF] border border-[#E2DFD7] mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    mode === 'login'
                      ? 'bg-[#171A1D] text-white'
                      : 'text-[#6B7280] hover:text-[#171A1D]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    mode === 'register'
                      ? 'bg-[#171A1D] text-white'
                      : 'text-[#6B7280] hover:text-[#171A1D]'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    mode === 'forgot'
                      ? 'bg-[#171A1D] text-white'
                      : 'text-[#6B7280] hover:text-[#171A1D]'
                  }`}
                >
                  Forgot
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B] leading-relaxed">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 p-3 bg-[#DCFCE7] border border-[#86EFAC] text-xs text-[#166534] leading-relaxed">
                {infoMessage}
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="mb-5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-[#171A1D] bg-white hover:bg-[#F5F3EF] text-sm font-medium text-[#171A1D] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>
                    {mode === 'admin' ? 'Continue with Authorized Google Account' : 'Continue with Google'}
                  </span>
                </button>

                <div className="relative flex items-center my-5">
                  <div className="flex-grow border-t border-[#E2DFD7]" />
                  <span className="mx-3 text-[11px] font-mono text-[#92969A] uppercase tracking-wider">
                    Or with Email
                  </span>
                  <div className="flex-grow border-t border-[#E2DFD7]" />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-[#24282C] mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Aarav Patel"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#24282C] mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="citizen@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#24282C] mb-1">
                      Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#24282C] mb-1">
                      Vehicle Registration Number (Optional)
                    </label>
                    <div className="relative">
                      <Car className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={primaryVehicleReg}
                        onChange={(e) => setPrimaryVehicleReg(e.target.value.toUpperCase())}
                        placeholder="GJ01AB1234"
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                      />
                    </div>
                  </div>
                </>
              )}

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs font-medium text-[#24282C] mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#92969A] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F15A24] hover:bg-[#D94A17] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {mode === 'login' && (
                  <>
                    <span>{busy ? 'Signing In...' : 'Sign In to Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
                {mode === 'register' && (
                  <>
                    <span>{busy ? 'Creating Account...' : 'Register Citizen Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
                {mode === 'forgot' && (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{busy ? 'Sending Reset Link...' : 'Send Password Reset Email'}</span>
                  </>
                )}
                {mode === 'admin' && (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{busy ? 'Verifying...' : 'Sign In as Administrator'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2DFD7] bg-white py-5">
        <div className="max-w-[1320px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <span>TAFFIC-PRAHARI · Report Responsibly. Make Roads Safer.</span>
          <span>Privacy Notice: Complainant identities are restricted to authorized traffic administrators.</span>
        </div>
      </footer>
    </div>
  );
}
