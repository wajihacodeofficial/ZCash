'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CodeVertexFooter from '../../components/Footer';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to login...');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may have expired.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error occurred during verification.');
      }
    };

    verifyEmail();
  }, [token, email]);

  const handleResend = async () => {
    if (!email) return;
    setStatus('verifying');
    setMessage('Resending verification link...');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('error'); // Keep error state but show success message for the resend
        setMessage('A new verification link has been sent to your email.');
      } else {
        const data = await res.json();
        setStatus('error');
        setMessage(data.error || 'Failed to resend link.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again later.');
    }
  };

  return (
    <div className="auth-card" style={{ 
      width: '100%', 
      maxWidth: '420px', 
      zIndex: 1, 
      background: 'var(--bg-card)', 
      padding: '60px 24px', 
      borderRadius: '40px', 
      boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
      animation: 'fadeIn 0.6s ease-out',
      textAlign: 'center'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <img 
          src="/logo.png" 
          alt="EasyPay" 
          style={{ width: '82px', height: '82px', objectFit: 'contain' }} 
        />
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px', color: '#1A202C' }}>
        {status === 'success' ? 'Verified!' : status === 'error' ? 'Verification Failed' : 'Verifying...'}
      </h1>
      
      <p style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '40px', lineHeight: '1.6' }}>
        {message}
      </p>

      {status === 'error' && email && (
        <button onClick={handleResend} className="clicky" style={{ 
          width: '100%',
          background: 'rgba(0, 112, 243, 0.1)', 
          border: '2px solid var(--blue-text)', 
          borderRadius: '24px', 
          padding: '16px', 
          color: 'var(--blue-text)', 
          fontWeight: '800', 
          fontSize: '14px',
          marginBottom: '12px',
          cursor: 'pointer'
        }}>
          RESEND VERIFICATION LINK
        </button>
      )}

      {status !== 'verifying' && (
        <Link href="/login" className="clicky" style={{ 
          display: 'block',
          background: 'var(--blue-text)', 
          border: 'none', 
          borderRadius: '24px', 
          padding: '20px', 
          color: '#fff', 
          fontWeight: '800', 
          fontSize: '16px',
          textDecoration: 'none',
          boxShadow: '0 10px 30px rgba(0, 112, 243, 0.25)',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          GO TO LOGIN
        </Link>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="auth-screen" style={{ 
      background: 'var(--bg-light)', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px',
      color: 'var(--text-dark)',
      fontFamily: 'inherit'
    }}>
      <Suspense fallback={<div style={{color: 'var(--text-dark)'}}>Loading...</div>}>
         <VerifyEmailContent />
      </Suspense>
      <div style={{ marginTop: '24px' }}>
         <CodeVertexFooter light={true} />
      </div>
    </div>
  );
}
