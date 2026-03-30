'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Share2, Copy, MessageCircle, X } from 'lucide-react';
import TabHeader from '../TabHeader';

export default function InviteTab({ userProfile, setNotifOpen, unreadCount, onAvatarClick, showInternalHeader = true }) {
  const [refLink, setRefLink] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const supabase = createClient();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    if (userProfile?.id) {
      setRefLink(`${window.location.origin}/signup?ref=EP-${userProfile.id.substring(0, 6).toUpperCase()}`);
    }
  }, [userProfile]);

  const copyLink = () => {
    navigator.clipboard.writeText(refLink).then(() => showToast('Referral link copied!')).catch(() => {});
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EasyPay - Lifetime Earning Platform',
          text: 'Join EasyPay and start earning daily! Use my referral link:',
          url: refLink,
        });
      } catch (err) {
        // Fallback to copy if user cancels or error
      }
    } else {
      copyLink();
    }
  };

  const handleWhatsApp = () => {
    const message = `Join EasyPay — Lifetime Earning Platform!%0A%0A✅ Lifetime project — earn daily profits!%0A💰 Min Deposit: $3 (Rs. 840)%0A🏧 Min Withdraw: $0.15 (Rs. 42)%0A🚀 No referral withdraw needed!%0A⚡ Fast payouts within 12h%0A%0AJoin now: ${refLink}`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <section style={{ paddingBottom: '100px', background: 'var(--bg-light)', minHeight: '100%', position: 'relative' }}>
      
      {/* Custom Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: '#fff', padding: '12px 24px', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px',
          fontWeight: '700', fontSize: '14px', animation: 'fadeInDown 0.3s ease forwards'
        }}>
          {toast.message}
          <X size={16} onClick={() => setToast({ ...toast, show: false })} style={{ cursor: 'pointer' }} />
        </div>
      )}

      {showInternalHeader && (
          <TabHeader title="Invite & Earn" userProfile={userProfile} setNotifOpen={setNotifOpen} unreadCount={unreadCount} onAvatarClick={onAvatarClick} />
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Share card */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ color: 'var(--blue-text)', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <Share2 size={48} strokeWidth={2} />
          </div>
          <h2 style={{ color: 'var(--text-dark)', fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Invite & Earn</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', padding: '0 8px' }}>
            Share your link and earn commissions on every investment
          </p>

          {/* Referral link box */}
          <div style={{ 
            background: 'var(--bg-light)', 
            borderRadius: '24px', 
            border: '1px solid var(--border)', 
            padding: '16px 12px', 
            marginBottom: '20px',
            textAlign: 'center',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <span style={{ 
              color: 'var(--text-muted)', 
              fontSize: '11px', 
              fontWeight: '500', 
              fontFamily: 'monospace', 
              opacity: 1, 
              wordBreak: 'break-all',
              lineHeight: '1.4',
              letterSpacing: '0.2px'
            }}>
              {refLink || 'Loading your referral link...'}
            </span>
          </div>

          {/* Action buttons matching screenshot */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button 
              onClick={copyLink} 
              className="clicky" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#F39C12', color: '#000', border: 'none', borderRadius: '18px', padding: '12px 0', fontWeight: '700', fontSize: '11px' }}
            >
              <Copy size={14} strokeWidth={3} /> Copy
            </button>
            
            <button 
              onClick={handleShare}
              className="clicky" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#e8e6e1', color: '#000', border: 'none', borderRadius: '18px', padding: '12px 0', fontWeight: '700', fontSize: '11px' }}
            >
              <Share2 size={14} strokeWidth={3} /> Share
            </button>
            
            <button 
              onClick={handleWhatsApp}
              className="clicky" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '18px', padding: '12px 0', fontWeight: '700', fontSize: '11px' }}
            >
              <MessageCircle size={14} strokeWidth={3} /> WhatsApp
            </button>
          </div>
        </div>

        {/* Preview message */}
        <div>
          <p style={{ color: 'var(--text-dark)', fontSize: '12px', fontWeight: '800', letterSpacing: '1px', marginBottom: '10px' }}>PREVIEW MESSAGE</p>
          <div style={{ background: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { emoji: '⭐', text: <strong style={{ color: 'var(--text-dark)' }}>Join EasyPay — Lifetime Earning Platform!</strong> },
              { emoji: '✅', text: 'Lifetime project — earn daily profits!' },
              { emoji: '💰', text: <span>Minimum Deposit: <strong style={{ color: 'var(--blue-text)' }}>$3</strong> (Rs. 840)</span> },
              { emoji: '🏧', text: <span>Minimum Withdrawal: <strong style={{ color: 'var(--green-text)' }}>$0.15</strong> (Rs. 42)</span> },
              { emoji: '🚀', text: 'Without referral withdrawal system!' },
              { emoji: '📈', text: '5-Level Referral Commission (up to 6%)' },
              { emoji: '⚡', text: 'Fast withdrawals within 12 hours' },
              { emoji: '🔒', text: '100% Secure & Trusted' },
            ].map(({ emoji, text }, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{emoji}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', lineHeight: '1.5' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </section>
  );
}
