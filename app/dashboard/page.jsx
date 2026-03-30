'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { createClient } from '../../lib/supabase/client';

export default function EarningsDashboard() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ earned: 0, deposited: 0, loss: 0, activePlans: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: plans } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id);

      let earned = 0;
      let activePlans = 0;
      if (plans) {
        plans.forEach(p => {
           earned += Number(p.total_earned || 0);
           if (p.active) activePlans += 1;
        });
      }

      const { data: incomingTxs } = await supabase
        .from('transactions')
        .select('amount, type, notes, proof_url')
        .eq('user_id', user.id)
        .in('type', ['deposit', 'investment'])
        .eq('status', 'approved');
      
      let deposited = 0;
      if (incomingTxs) {
        incomingTxs.forEach(tx => {
          // Count all deposits, and investments that have proof (meaning they were direct payments)
          const hasProof = tx.proof_url || tx.notes?.includes('Payment proof: http');
          if (tx.type === 'deposit' || hasProof) {
            deposited += Number(tx.amount);
          }
        });
      }

      const { data: roiTxs } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('type', 'roi_earning')
        .order('created_at', { ascending: true });

      let chartData = [];
      if (roiTxs && roiTxs.length > 0) {
        const grouped = roiTxs.reduce((acc, tx) => {
           const date = new Date(tx.created_at).toLocaleDateString(undefined, { weekday: 'short' });
           acc[date] = (acc[date] || 0) + Number(tx.amount);
           return acc;
        }, {});
        chartData = Object.keys(grouped).map(key => ({ name: key, profit: grouped[key] }));
      } else {
        chartData = [
          { name: 'Mon', profit: 0 }, { name: 'Tue', profit: 0 }, { name: 'Wed', profit: 0 },
          { name: 'Thu', profit: 0 }, { name: 'Fri', profit: 0 }, { name: 'Sat', profit: 0 }, { name: 'Sun', profit: 0 },
        ];
      }

      setData(chartData);
      setStats({ earned, deposited, loss: 0, activePlans });
      setLoading(false);
    };
    fetchData();

    // Real-time subscriptions for global sync
    const profileChannel = supabase
      .channel('dashboard_profile_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    const dataChannel = supabase
      .channel('dashboard_data_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_plans' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(dataChannel);
    };
  }, [supabase]);

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-light)', padding: '24px', paddingBottom: '110px' }}>
       <button onClick={() => router.push('/')} style={{ background: 'transparent', border: 'none', color: 'var(--blue-text)', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginBottom: '24px' }}>← Back to Home</button>
       
       <h1 style={{ fontSize: '28px', color: 'var(--text-dark)', marginBottom: '8px', fontWeight: '800' }}>Earnings Dashboard</h1>
       <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontWeight: '600' }}>Track your investments and ROI over time.</p>

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '2px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
             <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>TOTAL EARNED</p>
             <h3 style={{ color: 'var(--green-text)', fontSize: '24px', margin: '4px 0', fontWeight: '800' }}>${stats.earned.toFixed(2)}</h3>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '2px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
             <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>TOTAL DEPOSITED</p>
             <h3 style={{ color: 'var(--blue-text)', fontSize: '24px', margin: '4px 0', fontWeight: '800' }}>${stats.deposited.toFixed(2)}</h3>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '2px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
             <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>TOTAL LOSS</p>
             <h3 style={{ color: '#ef4444', fontSize: '24px', margin: '4px 0', fontWeight: '800' }}>${stats.loss.toFixed(2)}</h3>  
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '2px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
             <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>ACTIVE PLANS</p>
             <h3 style={{ color: 'var(--text-dark)', fontSize: '24px', margin: '4px 0', fontWeight: '800' }}>{stats.activePlans}</h3>
          </div>
       </div>

       <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '32px', border: '2px solid var(--border)', height: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.03)' }}>
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '20px', fontWeight: '800' }}>Profit History 📈</h3>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--blue-text)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--blue-text)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }} dx={-10} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontWeight: '700', color: 'var(--text-dark)' }} />
              <Area type="monotone" dataKey="profit" stroke="var(--blue-text)" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" activeDot={{ r: 8, fill: 'var(--blue-text)', stroke: '#fff', strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
}
