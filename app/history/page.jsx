'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '../../lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Filter, Calendar, Plus, Minus, Info, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import TabHeader from '../../components/TabHeader';

function HistoryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [userProfile, setUserProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);
    };
    checkUser();
  }, [supabase, router]);

  useEffect(() => {
    if (userProfile?.id) {
      fetchHistory();
    }
  }, [userProfile?.id]);

  const fetchHistory = async () => {
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    const res = await query;
    const data = res['data'];
    const error = res['error'];
    
    if (!error && data) {
      setHistory(data);
    }
    setLoading(false);
  };

  const filteredHistory = history.filter(tx => {
    const matchesSearch = tx.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.amount.toString().includes(searchTerm);
    
    const txDate = new Date(tx.created_at).toISOString().split('T')[0];
    const matchesStart = !dateRange.start || txDate >= dateRange.start;
    const matchesEnd = !dateRange.end || txDate <= dateRange.end;

    return matchesSearch && matchesStart && matchesEnd;
  });

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit': return <Plus size={16} color="#22c55e" />;
      case 'withdrawal': return <Minus size={16} color="#ef4444" />;
      case 'investment': return <ArrowUpRight size={16} color="#f39c12" />;
      case 'roi_earning':
      case 'promo_bonus':
      case 'referral_bonus': return <ArrowDownLeft size={16} color="#22c55e" />;
      default: return <Info size={16} color="var(--text-muted)" />;
    }
  };

  const getTransactionLabel = (type) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-light)', paddingBottom: '40px' }}>
      <TabHeader 
        title="TRANSACTIONS" 
        showActions={false} 
        userProfile={userProfile} 
        onAvatarClick={() => router.push('/profile')} 
      />
      
      <div style={{ padding: '20px 16px' }}>
        <button 
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--blue-text)', fontWeight: '800', fontSize: '14px', marginBottom: '24px', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} /> BACK
        </button>

        <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 14px 12px 42px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '14px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Type Filter */}
              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setTimeout(() => fetchHistory(), 10); }}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '14px', color: '#fff', fontSize: '13px', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="all">All Types</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="investment">Investments</option>
                  <option value="roi_earning">ROI Earned</option>
                  <option value="referral_bonus">Referrals</option>
                </select>
                <Filter size={14} color="var(--text-muted)" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Date Filters */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', marginLeft: '4px', marginBottom: '4px', display: 'block' }}>FROM DATE</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={e => setDateRange({...dateRange, start: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: '#fff', fontSize: '12px', outline: 'none' }}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', marginLeft: '4px', marginBottom: '4px', display: 'block' }}>TO DATE</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={e => setDateRange({...dateRange, end: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: '#fff', fontSize: '12px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: '700' }}>Fetching History...</div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-dark)' }}>No matches found</div>
              <div style={{ fontSize: '13px', fontWeight: '500' }}>Try adjusting your search or filters</div>
            </div>
          ) : (
            filteredHistory.map((tx, i) => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: i < filteredHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {getTransactionIcon(tx.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-dark)', fontSize: '14px', fontWeight: '800' }}>{getTransactionLabel(tx.type)}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500' }}>{new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  {(tx.request_number || tx.screenshot_url || tx.proof_url) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span className="admin-badge admin-badge-muted" style={{ fontSize: '10px' }}>
                        Req: {tx.request_number || 'N/A'}
                      </span>
                      {(tx.screenshot_url || tx.proof_url) && (
                        <a
                          href={tx.screenshot_url || tx.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--blue-text)', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}
                        >
                          View Proof
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '15px', fontWeight: '900', 
                    color: ['withdrawal', 'investment'].includes(tx.type) ? '#ef4444' : '#22c55e',
                    marginBottom: '2px'
                  }}>
                    {['withdrawal', 'investment'].includes(tx.type) ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                  </div>
                  <div style={{ 
                    fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px',
                    color: tx.status === 'approved' || tx.status === 'completed' ? '#22c55e' : tx.status === 'rejected' ? '#ef4444' : '#f39c12',
                    padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', display: 'inline-block'
                  }}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HistoryInner />
    </Suspense>
  );
}
