'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, X, Loader2, ArrowLeft, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import CodeVertexFooter from '../../components/Footer';
import { createClient } from '../../lib/supabase/client';
import TabHeader from '../../components/TabHeader';

// ─── Shared input style ──────────────────────────────────────────────────────
/** @type {import('react').CSSProperties} */
const inputStyle = {
  width: '100%',
  padding: '15px 16px 15px 46px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  color: '#fff',
  fontSize: '15px',
  outline: 'none',
  fontWeight: '500',
  boxSizing: 'border-box',
};

/** @type {import('react').CSSProperties} */
const btnStyle = {
  background: 'linear-gradient(90deg,#F39C12,#e67e22)',
  border: 'none',
  borderRadius: '14px',
  padding: '15px',
  color: '#000',
  fontWeight: '800',
  fontSize: '15px',
  cursor: 'pointer',
  width: '100%',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '4px',
};

// ─── OTP Input (6 boxes) ─────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const chars = value.split('');
  const inputRefs = Array.from({ length: 6 }, () => React.createRef());

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) {
      inputRefs[i - 1].current?.focus();
    }
  };

  const handleChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...chars];
    next[i] = v;
    onChange(next.join(''));
    if (v && i < 5) inputRefs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(text);
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={inputRefs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={chars[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: '42px',
            height: '52px',
            textAlign: 'center',
            fontSize: '22px',
            fontWeight: '900',
            background: chars[i] ? 'rgba(243,156,18,0.12)' : 'rgba(255,255,255,0.05)',
            border: chars[i] ? '2px solid #F39C12' : '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            color: '#fff',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  );
}

// ─── Password field with toggle ──────────────────────────────────────────────
function PasswordField({ name, placeholder, value, onChange, required }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
      <input
        name={name}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        style={{ ...inputStyle, paddingRight: '46px' }}
      />
      <div
        onClick={() => setShow(!show)}
        style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}
      >
        {show ? <EyeOff size={16} color="#fff" /> : <Eye size={16} color="#fff" />}
      </div>
    </div>
  );
}

// ─── Main Login Component ────────────────────────────────────────────────────
function LoginInner() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Forgot-password multi-step state
  // step: 0=login, 1=enter-email, 2=enter-otp, 3=new-password
  const [fpStep, setFpStep] = useState(0);
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpConfirmPass, setFpConfirmPass] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    if (searchParams.get('error') === 'account_disabled') {
      showToast('Your account has been disabled. Please contact support.', 'error');
    }
  }, [searchParams]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase.auth.signInWithPassword(formData);
    if (error) { setErrorMsg(error.message); setLoading(false); return; }

    const isCustomVerified = data?.user?.user_metadata?.is_verified === true;
    if (data?.user?.user_metadata?.is_verified === false && !data?.user?.email_confirmed_at && !isCustomVerified) {
      await supabase.auth.signOut();
      setErrorMsg('Please verify your email before logging in.');
      setLoading(false); return;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    const firstName = profile?.full_name?.split(' ')[0] || 'User';
    showToast(`Welcome ${firstName}! Redirecting...`, 'success');
    
    setTimeout(() => {
      const isAdmin = profile && ['admin', 'ADMIN', 'SUPERADMIN'].includes(profile.role);
      router.push('/');
      router.refresh();
    }, 1200);
  };

  // ── Forgot Password Handlers ────────────────────────────────────────────────

  const resetForgotPassword = () => {
    setFpStep(0);
    setFpEmail('');
    setFpOtp('');
    setFpNewPass('');
    setFpConfirmPass('');
    setFpError('');
    setFpLoading(false);
    setOtpResendTimer(0);
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setFpError('');
    if (!fpEmail.trim()) { setFpError('Please enter your email address.'); return; }

    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setFpError(data.error || 'Failed to send OTP.'); return; }
      setFpStep(2);
      setFpOtp('');
      setOtpResendTimer(60);
    } catch {
      setFpError('Network error. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setFpError('');
    if (fpOtp.length < 6) { setFpError('Please enter the complete 6-digit OTP.'); return; }

    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail.trim(), otp: fpOtp }),
      });
      const data = await res.json();
      if (!res.ok) { setFpError(data.error || 'Invalid OTP.'); return; }
      setFpStep(3);
    } catch {
      setFpError('Network error. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setFpError('');
    if (fpNewPass.length < 6) { setFpError('Password must be at least 6 characters.'); return; }
    if (fpNewPass !== fpConfirmPass) { setFpError('Passwords do not match.'); return; }

    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail.trim(), otp: fpOtp, newPassword: fpNewPass }),
      });
      const data = await res.json();
      if (!res.ok) { setFpError(data.error || 'Failed to reset password.'); return; }
      showToast('Password reset successfully! You can now log in.', 'success');
      resetForgotPassword();
    } catch {
      setFpError('Network error. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-light)', color: 'var(--text-dark)', position: 'relative' }}>

      {/* Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: '#fff', padding: '12px 24px', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px',
          fontWeight: '700', fontSize: '14px', animation: 'fadeInDown 0.3s ease forwards',
          textAlign: 'center', minWidth: '280px', maxWidth: '90vw',
        }}>
          {toast.message}
          <X size={16} onClick={() => setToast({ ...toast, show: false })} style={{ cursor: 'pointer', flexShrink: 0 }} />
        </div>
      )}

      <TabHeader 
        title="WELCOME" 
        showActions={false} 
        userProfile={null}
        onAvatarClick={() => {}}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: '360px', background: 'var(--bg-card)', borderRadius: '28px', border: '1px solid var(--border)', padding: '32px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center' }}>

          {/* ── Logo + Title ── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <Image src="/logo.png" alt="EasyPay" width={72} height={72} style={{ objectFit: 'contain' }} />
          </div>

          {/* ════ STEP 0: Normal Login ════ */}
          {fpStep === 0 && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '6px' }}>Login to EasyPay</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px', fontWeight: '500' }}>Welcome back! Please enter your details.</p>

              {errorMsg && (
                <div style={{ padding: '12px 14px', marginBottom: '20px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: '13px', fontWeight: '600', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    name="email" type="email" placeholder="Email address"
                    value={formData.email} onChange={handleChange} required
                    style={inputStyle}
                  />
                </div>
                <PasswordField
                  name="password" placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span
                    onClick={() => { setFpStep(1); setFpEmail(formData.email); setFpError(''); }}
                    style={{ fontSize: '13px', color: 'var(--blue-text)', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Forgot Password?
                  </span>
                </div>

                <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? <Loader2 size={18} className="spin" /> : 'SIGN IN'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                Don't have an account?{' '}
                <Link href="/signup" style={{ color: 'var(--blue-text)', fontWeight: '800', textDecoration: 'none' }}>Sign up</Link>
              </p>
            </>
          )}

          {/* ════ STEP 1: Enter Email for OTP ════ */}
          {fpStep === 1 && (
            <>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(243,156,18,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Mail size={24} color="#F39C12" />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '6px' }}>Forgot Password?</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: '500' }}>Enter your email and we'll send you a 6-digit OTP.</p>

              {fpError && (
                <div style={{ padding: '11px 14px', marginBottom: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {fpError}
                </div>
              )}

              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email" placeholder="your@email.com"
                    value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} required
                    style={inputStyle}
                  />
                </div>
                <button type="submit" disabled={fpLoading} style={{ ...btnStyle, opacity: fpLoading ? 0.7 : 1, cursor: fpLoading ? 'not-allowed' : 'pointer' }}>
                  {fpLoading ? <Loader2 size={18} className="spin" /> : 'SEND OTP'}
                </button>
              </form>

              <button onClick={resetForgotPassword} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', margin: '16px auto 0' }}>
                <ArrowLeft size={14} /> Back to Login
              </button>
            </>
          )}

          {/* ════ STEP 2: Enter OTP ════ */}
          {fpStep === 2 && (
            <>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(243,156,18,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <KeyRound size={24} color="#F39C12" />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '6px' }}>Enter OTP</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '500' }}>
                We sent a 6-digit code to
              </p>
              <p style={{ fontSize: '13px', color: 'var(--blue-text)', fontWeight: '800', marginBottom: '24px' }}>{fpEmail}</p>

              {fpError && (
                <div style={{ padding: '11px 14px', marginBottom: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {fpError}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <OtpInput value={fpOtp} onChange={setFpOtp} />
                <button type="submit" disabled={fpLoading || fpOtp.length < 6} style={{ ...btnStyle, opacity: (fpLoading || fpOtp.length < 6) ? 0.6 : 1, cursor: (fpLoading || fpOtp.length < 6) ? 'not-allowed' : 'pointer' }}>
                  {fpLoading ? <Loader2 size={18} className="spin" /> : 'VERIFY OTP'}
                </button>
              </form>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {otpResendTimer > 0 ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                    Resend in <strong style={{ color: 'var(--blue-text)' }}>{otpResendTimer}s</strong>
                  </span>
                ) : (
                  <span
                    onClick={() => handleSendOtp()}
                    style={{ fontSize: '13px', color: 'var(--blue-text)', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Resend OTP
                  </span>
                )}
              </div>

              <button onClick={() => setFpStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', margin: '12px auto 0' }}>
                <ArrowLeft size={14} /> Change Email
              </button>
            </>
          )}

          {/* ════ STEP 3: Set New Password ════ */}
          {fpStep === 3 && (
            <>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShieldCheck size={24} color="#22c55e" />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '6px' }}>Set New Password</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: '500' }}>OTP verified! Choose a strong new password.</p>

              {fpError && (
                <div style={{ padding: '11px 14px', marginBottom: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {fpError}
                </div>
              )}

              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <PasswordField
                  name="newPassword" placeholder="New Password (min. 6 chars)"
                  value={fpNewPass} onChange={(e) => setFpNewPass(e.target.value)} required
                />
                <PasswordField
                  name="confirmPassword" placeholder="Confirm New Password"
                  value={fpConfirmPass} onChange={(e) => setFpConfirmPass(e.target.value)} required
                />

                {/* Password strength bar */}
                {fpNewPass.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4].map((level) => {
                        const strength = fpNewPass.length >= 10 && /[A-Z]/.test(fpNewPass) && /[0-9]/.test(fpNewPass) && /[^A-Za-z0-9]/.test(fpNewPass) ? 4
                          : fpNewPass.length >= 8 && /[A-Z]/.test(fpNewPass) && /[0-9]/.test(fpNewPass) ? 3
                          : fpNewPass.length >= 6 ? 2
                          : 1;
                        const color = strength >= 3 ? '#22c55e' : strength === 2 ? '#F39C12' : '#ef4444';
                        return (
                          <div key={level} style={{ flex: 1, height: '4px', borderRadius: '4px', background: level <= strength ? color : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
                        );
                      })}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left', fontWeight: '600' }}>
                      {fpNewPass.length < 6 ? 'Too short' : fpNewPass.length >= 10 && /[A-Z]/.test(fpNewPass) && /[0-9]/.test(fpNewPass) ? 'Strong password' : fpNewPass.length >= 8 ? 'Medium strength' : 'Weak — add uppercase & numbers'}
                    </p>
                  </div>
                )}

                <button type="submit" disabled={fpLoading} style={{ ...btnStyle, opacity: fpLoading ? 0.7 : 1, cursor: fpLoading ? 'not-allowed' : 'pointer' }}>
                  {fpLoading ? <Loader2 size={18} className="spin" /> : 'RESET PASSWORD'}
                </button>
              </form>
            </>
          )}

        </div>

        <div style={{ marginTop: '24px' }}>
          <CodeVertexFooter light={false} />
        </div>
      </div>

      {/* @ts-ignore */}
      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-light)', color: 'var(--text-muted)', fontWeight: '700' }}>Loading...</div>}>
      <LoginInner />
    </Suspense>
  );
}
