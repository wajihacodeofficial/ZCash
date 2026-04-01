'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { CreditCard, Copy, Upload } from 'lucide-react';
import PageWrapper from '../../components/PageWrapper';

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function DepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');
  const initialAmount = searchParams.get('amount') || '';

  const [amount, setAmount] = useState(initialAmount);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [step, setStep] = useState(1);
  const [senderName, setSenderName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [txId, setTxId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [planName, setPlanName] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (planId) {
      const fetchPlan = async () => {
        const { data } = await supabase
          .from('plans')
          .select('name')
          .eq('id', planId)
          .single();
        if (data) setPlanName(data.name);
      };
      fetchPlan();
    }
  }, [planId, supabase]);

  const displayAmount = amount ? Number(amount) : 0;
  const pkrAmount = displayAmount * 280;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMsg({
        text: 'Invalid file type. Upload JPG, PNG, or WebP.',
        type: 'error',
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setMsg({
        text: `File too large. Max ${MAX_FILE_SIZE_MB}MB.`,
        type: 'error',
      });
      return;
    }
    setMsg({ text: '', type: '' });
    setProofFile(file);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied: ' + text);
  };

  const handleDeposit = async (e) => {
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
    if (parseFloat(amount) < 3 && !planId) {
      setMsg({ text: 'Min. deposit $3', type: 'error' });
      setLoading(false);
      return;
    }
    if (!paymentMethod) {
      setMsg({ text: 'Select payment method.', type: 'error' });
      setLoading(false);
      return;
    }
    if (!txId && !proofFile) {
      setMsg({ text: 'Transaction ID or Proof required.', type: 'error' });
      setLoading(false);
      return;
    }

    let proofUrl = null;
    if (proofFile) {
      const fileName = `${user.id}/${Date.now()}-${proofFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, proofFile);
      if (uploadError) {
        setMsg({ text: uploadError.message, type: 'error' });
        setLoading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from('payment-proofs').getPublicUrl(uploadData.path);
      proofUrl = publicUrl;
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: planId ? 'investment' : 'deposit',
      amount: parseFloat(amount),
      status: 'pending',
      plan_id: planId || null,
      request_number: txId || null,
      screenshot_url: proofUrl || null,
      proof_url: proofUrl || null,
      notes: `Method: ${paymentMethod} | Sender: ${senderName} (${senderNumber}) | TX: ${txId || 'none'} | Request Number: ${txId || 'none'} | Payment proof: ${proofUrl || 'none'} | Proof: ${proofUrl || 'none'}`,
    });

    if (error) {
      setMsg({ text: error.message, type: 'error' });
    } else {
      setMsg({
        text: 'Deposit submitted! Admin will verify.',
        type: 'success',
      });
      setTimeout(() => router.push('/'), 2000);
    }
    setLoading(false);
  };

  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div
          style={{
            flex: 1,
            height: '4px',
            background: 'var(--blue-text)',
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            flex: 1,
            height: '4px',
            background: 'var(--border)',
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            flex: 1,
            height: '4px',
            background: 'var(--border)',
            borderRadius: '2px',
          }}
        />
      </div>

      {!planId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              color: 'var(--text-dark)',
              fontSize: '14px',
              fontWeight: '700',
            }}
          >
            Amount (USD)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="Min. $3"
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-dark)',
              fontSize: '16px',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>
      )}

      <div>
        <h3
          style={{
            color: 'var(--text-dark)',
            fontSize: '18px',
            marginBottom: '16px',
            fontWeight: '700',
          }}
        >
          Select Payment Method
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {['JazzCash', 'EasyPaisa', 'Bank Transfer'].map((m) => (
            <div key={m} onClick={() => { setPaymentMethod(m); setStep(2); }} className="clicky" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
              <div style={{ background: 'rgba(243, 156, 18, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F39C12', overflow: 'hidden' }}>
                {m === 'JazzCash' ? <img src="/jazzcash.jpeg" alt="JazzCash" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                 m === 'EasyPaisa' ? <img src="/easypaisa.jpeg" alt="EasyPaisa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                 <CreditCard size={24} />}
              </div>
              <div style={{ flex: 1 }}><h4 style={{ color: 'var(--text-dark)', fontSize: '16px', marginBottom: '4px', fontWeight: '700' }}>{m}</h4><p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Send payment to this account</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div
          style={{
            flex: 1,
            height: '4px',
            background: 'var(--blue-text)',
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            flex: 1,
            height: '4px',
            background: 'var(--blue-text)',
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            flex: 1,
            height: '4px',
            background: 'var(--border)',
            borderRadius: '2px',
          }}
        />
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '24px',
          padding: '24px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '12px',
              margin: '0 0 4px 0',
            }}
          >
            Transfer Exactly
          </p>
          <p
            style={{
              color: 'var(--blue-text)',
              fontSize: '24px',
              fontWeight: '800',
            }}
          >
            Rs. {pkrAmount.toLocaleString()}
          </p>
        </div>

        <div>
          <h4
            style={{
              color: 'var(--text-dark)',
              fontSize: '14px',
              fontWeight: '700',
              marginBottom: '12px',
            }}
          >
            Account Details ({paymentMethod})
          </h4>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  margin: 0,
                }}
              >
                Account Name
              </p>
              <p
                style={{
                  color: 'var(--text-dark)',
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                EasyPay
              </p>
            </div>
            <div
              className="clicky"
              onClick={() => copyToClipboard('EasyPay')}
              style={{
                padding: '6px 12px',
                background: 'var(--bg-light)',
                borderRadius: '8px',
                color: 'var(--text-dark)',
                fontSize: '12px',
              }}
            >
              <Copy size={13} /> Copy
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  margin: 0,
                }}
              >
                Account Number
              </p>
              <p
                style={{
                  color: 'var(--text-dark)',
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                03310313831
              </p>
            </div>
            <div
              className="clicky"
              onClick={() => copyToClipboard('03310313831')}
              style={{
                padding: '6px 12px',
                background: 'var(--bg-light)',
                borderRadius: '8px',
                color: 'var(--text-dark)',
                fontSize: '12px',
              }}
            >
              <Copy size={13} /> Copy
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Sender Account Name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: 'var(--bg-light)',
              border: '1px solid var(--border)',
              color: 'var(--text-dark)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Sender Account Number"
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value)}
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: 'var(--bg-light)',
              border: '1px solid var(--border)',
              color: 'var(--text-dark)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Transaction ID / Reference No."
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: 'var(--bg-light)',
              border: '1px solid var(--border)',
              color: 'var(--text-dark)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <label
            htmlFor="p"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px',
              borderRadius: '14px',
              background: 'var(--bg-light)',
              border: '1px dashed var(--border)',
              color: 'var(--text-dark)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />{' '}
            {proofFile ? 'Proof Added' : 'Upload Proof (Screenshot)'}
          </label>
          <input
            id="p"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {msg.text && (
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              background:
                msg.type === 'error'
                  ? 'rgba(239,68,68,0.1)'
                  : 'rgba(34,197,94,0.1)',
              color: msg.type === 'error' ? '#ef4444' : 'var(--green-text)',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {msg.text}
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={loading}
          className="clicky"
          style={{
            background: 'var(--blue-text)',
            color: '#000',
            padding: '16px',
            borderRadius: '14px',
            fontWeight: '800',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {loading ? 'PROCESSING...' : 'Confirm Deposit'}
        </button>
      </div>
    </div>
  );

  return (
    <PageWrapper
      title={planId ? `Activate Plan` : 'Deposit'}
      onBack={() => (step === 2 ? setStep(1) : router.push('/'))}
      showNavbar={true}
      activeTab="home"
    >
      <div style={{ padding: '24px 20px' }}>
        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </PageWrapper>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={null}>
      <DepositContent />
    </Suspense>
  );
}
