'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Globe, Phone, Link2 } from 'lucide-react';
import CodeVertexFooter from '../../components/Footer';
import TabHeader from '../../components/TabHeader';
import { v4 as uuidv4 } from 'uuid';

export default function SignupPage() {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', country: '', phoneNumber: '', referral: 'YX-20455' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [theme, setTheme] = useState('light');
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('easypay-theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('easypay-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    const { fullName, email, password, country, phoneNumber } = formData;
    const token = uuidv4();
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, country, phoneNumber, token })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Registration successful! Check your email to verify.', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Signup failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'An error occurred. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const inputStyle = {
    width: '100%', padding: '13px 14px 13px 42px',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f4f0',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '12px', color: isDark ? '#fff' : '#111',
    fontSize: '14px', outline: 'none', fontFamily: 'inherit', fontWeight: '500',
    boxSizing: 'border-box',
  };

  const fields = [
    { name: 'fullName',     type: 'text',     placeholder: 'Full name',     Icon: User   },
    { name: 'email',        type: 'email',    placeholder: 'Email address', Icon: Mail   },
    { name: 'password',     type: 'password', placeholder: 'Password',      Icon: Lock   },
    { name: 'country',      type: 'text',     placeholder: 'Country',       Icon: Globe  },
    { name: 'phoneNumber',  type: 'tel',      placeholder: 'Phone Number',  Icon: Phone  },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-light)', color: 'var(--text-dark)' }}>

      <TabHeader 
        title="JOIN NOW"
        theme={theme} 
        toggleTheme={toggleTheme} 
        showActions={false} 
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', gap: '20px' }}>
        <div style={{ width: '100%', maxWidth: '360px', background: 'var(--bg-card)', borderRadius: '28px', border: '1px solid var(--border)', padding: '28px 22px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center' }}>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <Image src="/logo.png" alt="EasyPay" width={64} height={64} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '4px' }}>Create Account</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '22px' }}>Join us and start earning today.</p>

          {message.text && (
            <div style={{ padding: '11px 14px', marginBottom: '16px', borderRadius: '12px', background: message.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', color: message.type === 'error' ? '#EF4444' : '#22c55e', fontSize: '13px', fontWeight: '600', textAlign: 'center', border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {fields.map(({ name, type, placeholder, Icon }) => (
              <div key={name} style={{ position: 'relative' }}>
                <Icon size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input name={name} type={type} placeholder={placeholder} value={formData[name]} onChange={handleChange} required style={inputStyle} />
              </div>
            ))}

            <div style={{ position: 'relative' }}>
              <Link2 size={15} color="var(--blue-text)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input name="referral" type="text" value={formData.referral} readOnly style={{ ...inputStyle, color: 'var(--blue-text)', fontWeight: '700', background: isDark ? 'rgba(243,156,18,0.08)' : 'rgba(243,156,18,0.06)', border: '1px solid rgba(243,156,18,0.2)' }} />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--blue-text)', fontWeight: '800' }}>✓ AUTO</span>
            </div>

            <button type="submit" disabled={loading} style={{ background: 'linear-gradient(90deg,#F39C12,#e67e22)', border: 'none', borderRadius: '14px', padding: '14px', color: '#000', fontWeight: '800', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {loading ? 'Processing...' : 'SIGN UP'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--blue-text)', fontWeight: '800', textDecoration: 'none' }}>Login here</Link>
          </p>
        </div>

        <CodeVertexFooter light={!isDark} />
      </div>
    </div>
  );
}
