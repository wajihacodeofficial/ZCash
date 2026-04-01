'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Calendar, ExternalLink, Search, Loader2 } from 'lucide-react';
import TabHeader from '../../components/TabHeader';
import PageWrapper from '../../components/PageWrapper';

export default function SlipsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userProfile, setUserProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);
    };
    checkUser();
  }, [supabase, router]);

  useEffect(() => {
    if (userProfile?.id) {
      fetchSlips();
    }
  }, [userProfile?.id]);

  const fetchSlips = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .in('type', ['deposit', 'investment'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const extractProofUrl = (notes) => {
    const match = notes?.match(/Proof: (https?:\/\/[^\s]+)/);
    return match ? match[1] : null;
  };

  const getProofUrl = (tx) => tx.screenshot_url || tx.proof_url || extractProofUrl(tx.notes);

  const filteredSlips = transactions.filter(tx => {
    const proof = getProofUrl(tx);
    return proof && (
      tx.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.amount.toString().includes(searchTerm) ||
      tx.status.toLowerCase().includes(searchTerm) ||
      (tx.request_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <PageWrapper 
      title="DEPOSIT SLIPS" 
      showNavbar={true} 
      activeTab="profile"
      onBack={() => router.back()}
    >
      <div style={{ padding: '20px 16px' }}>
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by amount or status..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 46px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: '15px', fontWeight: '800' }}>Loading your slips...</div>
          </div>
        ) : filteredSlips.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ImageIcon size={48} color="rgba(255,255,255,0.05)" style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '4px' }}>No Slips Found</div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Screenshots from your deposits will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {filteredSlips.map(tx => {
              const url = getProofUrl(tx);
              return (
                <div key={tx.id} style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ width: '100%', height: '140px', background: 'rgba(255,255,255,0.03)', position: 'relative' }}>
                    <img src={url} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ 
                      position: 'absolute', top: '8px', right: '8px', 
                      background: tx.status === 'approved' ? '#22c55e' : tx.status === 'rejected' ? '#ef4444' : '#f39c12',
                      color: '#fff', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      {tx.status}
                    </div>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '2px' }}>${tx.amount} {tx.type === 'deposit' ? 'Deposit' : 'Investment'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', marginBottom: '10px' }}>
                      <Calendar size={10} /> {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                    <div className="admin-badge admin-badge-muted" style={{ marginBottom: '10px' }}>
                      Request: {tx.request_number || 'N/A'}
                    </div>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px', background: 'rgba(243,156,18,0.1)', color: 'var(--blue-text)', textDecoration: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}
                    >
                      <ExternalLink size={12} /> View Full
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </PageWrapper>
  );
}
