'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminProofsPage() {
  const supabase = createClient();
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [proofModal, setProofModal] = useState(null);

  const showAction = (msg, type = 'success') => {
    setActionMsg({ text: msg, type });
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchProofs = async () => {
    setLoading(true);
    const { data: txs } = await supabase
      .from('transactions')
      .select('*, profiles(full_name, email)')
      .in('type', ['deposit', 'investment'])
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (txs) {
      const withProofs = txs.map(tx => {
        let url = tx.screenshot_url || tx.proof_url;
        if (!url && tx.notes) {
          const match = tx.notes.match(/Payment proof: (http[^\s|]+)/);
          if (match) url = match[1];
        }
        const txMatch = tx.notes?.match(/TX:\s*([^|]+)/i);
        const reqMatch = tx.notes?.match(/Request Number:\s*([^|]+)/i);
        const requestNumber = tx.request_number || txMatch?.[1]?.trim() || reqMatch?.[1]?.trim() || null;
        return { ...tx, extractedProofUrl: url, extractedRequestNumber: requestNumber };
      }).filter(tx => tx.extractedProofUrl);
      setProofs(withProofs);
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchProofs(); 

    const proofChannel = supabase
      .channel('admin_proofs_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchProofs())
      .subscribe();

    return () => {
      supabase.removeChannel(proofChannel);
    };
  }, []);

  const handleAction = async (tx, action) => {
    const { id, user_id: userId, amount, plan_id: planId, proof_url: proofUrl } = tx;
    
    // Check if already processed
    const { data: currentTx } = await supabase.from('transactions').select('status').eq('id', id).single();
    if (currentTx?.status !== 'pending') {
      showAction('Error: Transaction already processed.', 'error');
      return;
    }

    const { error } = await supabase.from('transactions').update({ status: action }).eq('id', id);
    if (error) { showAction('Error: ' + error.message, 'error'); return; }

    if (action === 'approved') {
      // 1. Credit balance if it was a proof-based payment (deposit or investment with proof)
      // Extract proof URL from notes if not in proof_url column (legacy)
      let hasProof = !!proofUrl;
      if (!hasProof && tx.notes?.includes('Payment proof: http')) hasProof = true;

      // If it has a proof, we should credit the balance (treating it as a deposit)
      // If it's an investment from balance, we don't credit it back.
      if (hasProof || tx.type === 'deposit') {
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
        if (profile) {
          await supabase.from('profiles').update({ 
            balance: (profile.balance || 0) + Number(amount) 
          }).eq('id', userId);
        }
      }

      // 2. If it's an investment, activate the plan
      if (planId) {
        const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();
        if (plan) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(startDate.getDate() + plan.duration_days);

          await supabase.from('user_plans').insert({
            user_id: userId,
            plan_id: planId,
            amount_invested: Number(amount),
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            active: true
          });
        }
      }
    }

    setProofs(prev => prev.filter(t => t.id !== id));
    showAction(`Transaction ${action === 'approved' ? 'approved & processed' : 'rejected'}.`);
    setProofModal(null);
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Payment Proof Gallery</h1>
          <p className="admin-page-subtitle">
            Inspect uploaded screenshots for pending deposits.
            {proofs.length > 0 && <span style={{ color: 'var(--ayellow)', marginLeft: '8px', fontWeight: 700 }}>{proofs.length} awaiting review</span>}
          </p>
        </div>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchProofs}>Refresh</button>
      </div>

      {actionMsg && (
        <div className={`admin-alert admin-alert-${actionMsg.type === 'error' ? 'error' : 'success'}`}>{actionMsg.text}</div>
      )}

      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : proofs.length === 0 ? (
        <div className="admin-empty" style={{ marginTop: '60px' }}>
          <div className="admin-empty-icon">🎉</div>
          <div className="admin-empty-text">No pending payment proofs to review!</div>
          <div style={{ fontSize: '12px', color: 'var(--amuted)', marginTop: '6px' }}>All deposits are processed.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '16px' }}>
          {proofs.map(tx => (
            <div key={tx.id} className="admin-card" style={{ cursor: 'pointer' }}>
              {/* Image Thumbnail */}
              <div
                style={{ height: '210px', position: 'relative', overflow: 'hidden', background: '#000', cursor: 'zoom-in' }}
                onClick={() => setProofModal(tx)}>
                <img
                  src={tx.extractedProofUrl}
                  alt="Proof"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, transition: '0.3s' }}
                  onMouseOver={e => e.currentTarget.style.opacity = 1}
                  onMouseOut={e => e.currentTarget.style.opacity = 0.85}
                />
                {/* Amount badge */}
                <div style={{
                  position: 'absolute', top: '10px', left: '10px',
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                  padding: '4px 12px', borderRadius: '20px',
                  color: 'var(--agreen)', fontWeight: 800, fontSize: '14px'
                }}>
                  +${Number(tx.amount).toFixed(2)}
                </div>
                {/* Zoom hint */}
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: '0.2s', background: 'rgba(0,0,0,0.3)',
                  fontSize: '24px', color: '#fff'
                }}
                  onMouseOver={e => e.currentTarget.style.opacity = 1}
                  onMouseOut={e => e.currentTarget.style.opacity = 0}
                >
                  🔍
                </div>
              </div>

              {/* Card Body */}
              <div className="admin-card-body">
                <div className="admin-user-cell" style={{ marginBottom: '14px' }}>
                  <div className="admin-avatar">{(tx.profiles?.full_name || 'U').charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="admin-cell-name">{tx.profiles?.full_name || 'Unknown'}</div>
                    <div className="admin-cell-sub">{tx.profiles?.email}</div>
                  </div>
                </div>
                <div className="admin-cell-sub" style={{ marginBottom: '12px' }}>
                  {new Date(tx.created_at).toLocaleString()}
                </div>
                <div className="admin-badge admin-badge-muted" style={{ marginBottom: '12px' }}>
                  Request: {tx.extractedRequestNumber || 'N/A'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="admin-btn admin-btn-success admin-btn-sm" style={{ flex: 1 }}
                    onClick={() => handleAction(tx, 'approved')}>
                    Approve
                  </button>
                  <button className="admin-btn admin-btn-danger-outline admin-btn-sm" style={{ flex: 1 }}
                    onClick={() => handleAction(tx, 'rejected')}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen Proof Modal */}
      {proofModal && (
        <div className="admin-modal-overlay" style={{ padding: '16px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '860px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                  {proofModal.profiles?.full_name || 'Unknown'} — Payment Proof
                </div>
                <div className="admin-amount-pos" style={{ fontSize: '16px', marginTop: '2px' }}>
                  +${Number(proofModal.amount).toFixed(2)} deposit request
                </div>
                <div className="admin-cell-sub" style={{ marginTop: '4px' }}>
                  Request: {proofModal.extractedRequestNumber || 'N/A'}
                </div>
              </div>
              <button className="admin-modal-close" style={{ position: 'static' }} onClick={() => setProofModal(null)}>✕</button>
            </div>

            {/* Image */}
            <div style={{ flex: 1, overflow: 'auto', background: '#000', borderRadius: '12px', border: '1px solid var(--aborder)', display: 'flex', justifyContent: 'center', maxHeight: '60vh' }}>
              <img src={proofModal.extractedProofUrl} alt="Full proof" style={{ maxWidth: '100%', objectFit: 'contain' }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="admin-btn admin-btn-success" style={{ minWidth: '160px' }}
                onClick={() => handleAction(proofModal, 'approved')}>
                ✓ Approve Transaction
              </button>
              <button className="admin-btn admin-btn-danger-outline" style={{ minWidth: '160px' }}
                onClick={() => handleAction(proofModal, 'rejected')}>
                ✕ Reject Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
