'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import PageWrapper from '../../components/PageWrapper';

export default function WithdrawPage() {
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [method, setMethod] = useState('EasyPaisa');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [balance, setBalance] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) setBalance(Number(profile.balance || 0));
      }
    };
    fetchProfile();
  }, [supabase]);

  const pkrBalance = (balance * 280).toFixed(0);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const usdAmount = parseFloat(amount) / 280;
    if (parseFloat(amount) < 200 || parseFloat(amount) > 100000) {
      setMsg({
        text: 'Amount must be between 200 and 100,000 PKR',
        type: 'error',
      });
      setLoading(false);
      return;
    }
    if (usdAmount > balance) {
      setMsg({ text: 'Insufficient balance.', type: 'error' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount: usdAmount,
      notes: `Method: ${method} | Name: ${accountName} | Acc: ${accountNumber}`,
      status: 'pending',
    });

    if (error) {
      setMsg({ text: error.message, type: 'error' });
    } else {
      setMsg({
        text: 'Withdrawal submitted! Admin will verify soon.',
        type: 'success',
      });
      setAmount('');
      setAccountName('');
      setAccountNumber('');
      setTimeout(() => router.push('/?tab=profile'), 2000);
    }
    setLoading(false);
  };

  return (
    <PageWrapper
      title="Withdrawal"
      onBack={() => router.push('/')}
      activeTab="home"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 20px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '500px',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              background: 'rgba(52, 152, 219, 0.1)',
              padding: '16px',
              borderRadius: '16px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  marginBottom: '4px',
                }}
              >
                AVAILABLE PKR
              </p>
              <p
                style={{
                  color: 'var(--blue-text)',
                  fontSize: '16px',
                  fontWeight: '800',
                }}
              >
                Rs. {pkrBalance}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  marginBottom: '4px',
                }}
              >
                LIMITS
              </p>
              <p
                style={{
                  color: 'var(--text-dark)',
                  fontSize: '14px',
                  fontWeight: '700',
                }}
              >
                200 - 100k
              </p>
            </div>
          </div>

          {msg.text && (
            <div
              style={{
                padding: '12px',
                marginBottom: '16px',
                borderRadius: '12px',
                background:
                  msg.type === 'error'
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(34, 197, 94, 0.1)',
                color: msg.type === 'error' ? '#ef4444' : 'var(--green-text)',
                fontSize: '14px',
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              {msg.text}
            </div>
          )}

          <form
            onSubmit={handleWithdraw}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-dark)',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                PAYMENT METHOD
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-light)',
                  color: 'var(--text-dark)',
                  fontSize: '15px',
                  outline: 'none',
                }}
              >
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-dark)',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                ACCOUNT NAME
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                placeholder="e.g. EasyPay"
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-light)',
                  color: 'var(--text-dark)',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-dark)',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                ACCOUNT NUMBER
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                placeholder="03XXXXXXXXX"
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-light)',
                  color: 'var(--text-dark)',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-dark)',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                AMOUNT (PKR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="200"
                max="100000"
                placeholder="Min Rs. 200"
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-light)',
                  color: 'var(--text-dark)',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontWeight: '800',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="clicky"
              style={{
                background: 'var(--blue-text)',
                color: '#000',
                border: 'none',
                padding: '16px',
                borderRadius: '14px',
                fontWeight: '800',
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '8px',
              }}
            >
              {loading ? 'PROCESSING...' : 'REQUEST WITHDRAWAL'}
            </button>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
