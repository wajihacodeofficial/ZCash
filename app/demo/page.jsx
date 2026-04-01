'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import PageWrapper from '../../components/PageWrapper';
import TabHeader from '../../components/TabHeader';

export default function DemoTradingDashboard() {
  const [userProfile, setUserProfile] = useState(null);
  const [demoBalance, setDemoBalance] = useState(0);
  const [plans, setPlans] = useState([]);
  const [activeInvestments, setActiveInvestments] = useState([]);
  const [completedInvestments, setCompletedInvestments] = useState([]);
  const [amountInputs, setAmountInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [investingPlanId, setInvestingPlanId] = useState(null);
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  const supabase = createClient();

  const showAction = (msg, type = 'info') => {
    setActionMsg({ text: msg, type });
    setTimeout(() => setActionMsg({ text: '', type: '' }), 4000);
  };

  const fetchAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // First process any expired investments
    try {
      await fetch('/api/demo-invest/process', { method: 'POST' });
    } catch (err) {
      console.warn('Silent processing failed', err);
    }

    // Now fetch fresh data
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
      setUserProfile(profile);
      setDemoBalance(Number(profile.demo_balance || 0));
    }

    const { data: plansData } = await supabase.from('demo_plans').select('*').eq('active', true).order('duration_days', { ascending: true });
    if (plansData) setPlans(plansData);

    const { data: invData } = await supabase
      .from('demo_investments')
      .select('*, demo_plans(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (invData) {
      setActiveInvestments(invData.filter(i => i.status === 'active'));
      setCompletedInvestments(invData.filter(i => i.status === 'completed'));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
        // Redraw to update countdowns
        setActiveInvestments(prev => [...prev]);
    }, 1000);
    return () => clearInterval(interval);
  }, [supabase]);

  const handleInvest = async (plan) => {
    const amount = parseFloat(amountInputs[plan.id]);
    if (!amount || amount <= 0) {
      showAction('Please enter a valid amount.', 'error');
      return;
    }
    if (amount > demoBalance) {
      showAction('Insufficient demo balance. Ask an admin to add more.', 'error');
      return;
    }

    setInvestingPlanId(plan.id);
    try {
      const res = await fetch('/api/demo-invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, amount })
      });
      const data = await res.json();
      
      if (!res.ok) {
        showAction(data.error || 'Investment failed.', 'error');
      } else {
        showAction('Demo investment started successfully!', 'success');
        setAmountInputs({ ...amountInputs, [plan.id]: '' });
        fetchAllData(); // refresh UI
      }
    } catch (err) {
      showAction('An unexpected error occurred.', 'error');
    }
    setInvestingPlanId(null);
  };

  const getCountdown = (endDateString) => {
    const end = new Date(endDateString);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 'Processing...';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  return (
    <PageWrapper title="DEMO TRADING" activeTab="demo">
      <section style={{ paddingBottom: '100px', background: 'var(--bg-light)', minHeight: '100%' }}>
        <TabHeader title="SIMULATOR" userProfile={userProfile} />

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Action Message Banner */}
          {actionMsg.text && (
            <div style={{ 
              padding: '14px 20px', 
              borderRadius: '16px', 
              background: actionMsg.type === 'error' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)',
              border: `1px solid ${actionMsg.type === 'error' ? '#e74c3c' : '#2ecc71'}`,
              color: actionMsg.type === 'error' ? '#e74c3c' : '#2ecc71',
              fontWeight: 'bold',
              fontSize: '14px',
              animation: 'fadeIn 0.3s ease'
            }}>
              {actionMsg.text}
            </div>
          )}

          {/* Balance Hero Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1A2980 0%, #26D0CE 100%)',
            borderRadius: '24px',
            padding: '30px',
            color: 'white',
            boxShadow: '0 12px 30px rgba(38, 208, 206, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }}></div>
            <div style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, marginBottom: '8px' }}>Demo Wallet Balance</div>
            <div style={{ fontSize: '42px', fontWeight: '900', letterSpacing: '-1px' }}>
              ${demoBalance.toFixed(2)}
            </div>
            {demoBalance === 0 && (
              <div style={{ marginTop: '12px', fontSize: '13px', background: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '10px', display: 'inline-block' }}>
                💡 Tip: Ask an admin to credit your demo balance to test out plans!
              </div>
            )}
          </div>

          <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '10px 0' }} />

          {/* Available Plans */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px' }}>Available Simulation Plans</h2>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading simulation data...</div>
            ) : plans.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                No active demo plans available.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {plans.map(plan => (
                  <div key={plan.id} style={{
                    background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', padding: '20px', boxShadow: 'var(--shadow)', transition: 'transform 0.2s'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', margin: '0 0 12px 0' }}>{plan.name}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ background: 'var(--bg-light)', padding: '12px', borderRadius: '14px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Duration</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--blue-text)' }}>{plan.duration_days} Days</div>
                      </div>
                      <div style={{ background: 'var(--bg-light)', padding: '12px', borderRadius: '14px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Fixed Profit</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--green-text)' }}>{plan.profit_percentage}%</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: 'var(--text-dark)', fontWeight: 'bold' }}>$</div>
                        <input 
                          type="number" 
                          placeholder="Enter Investment Amount"
                          value={amountInputs[plan.id] || ''}
                          onChange={(e) => setAmountInputs({...amountInputs, [plan.id]: e.target.value})}
                          style={{
                            width: '100%', padding: '16px 16px 16px 36px', borderRadius: '14px', border: '2px solid var(--border)', background: 'var(--bg-light)',
                            fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)', outline: 'none', transition: 'border-color 0.2s'
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => handleInvest(plan)}
                        disabled={investingPlanId === plan.id || demoBalance <= 0}
                        style={{
                          width: '100%', padding: '16px', borderRadius: '14px', border: 'none', 
                          background: 'linear-gradient(90deg, var(--primary), var(--primary-glow))', color: '#000', 
                          fontWeight: '800', fontSize: '15px', cursor: (investingPlanId === plan.id || demoBalance <= 0) ? 'not-allowed' : 'pointer', 
                          opacity: (investingPlanId === plan.id || demoBalance <= 0) ? 0.6 : 1, transition: 'opacity 0.2s'
                        }}
                      >
                        {investingPlanId === plan.id ? 'Processing...' : 'Run Simulation'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '10px 0' }} />

          {/* Active Demo Investments */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px' }}>Active Simulations</h2>
            {activeInvestments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                No active demo investments. Start a simulation above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeInvestments.map(inv => {
                  const expectedProfit = parseFloat(inv.amount) * (parseFloat(inv.profit_percentage) / 100);
                  const totalReturn = parseFloat(inv.amount) + expectedProfit;
                  return (
                    <div key={inv.id} style={{ background: 'var(--bg-card)', borderRadius: '18px', padding: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)' }}>{inv.demo_plans?.name || 'Simulator'}</div>
                        <div style={{ background: 'rgba(243, 156, 18, 0.15)', color: '#d35400', fontSize: '12px', fontWeight: '800', padding: '4px 10px', borderRadius: '10px' }}>ACTIVE</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: 'var(--bg-light)', padding: '10px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Invested</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)' }}>${inv.amount}</div>
                        </div>
                        <div style={{ background: 'var(--bg-light)', padding: '10px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expected Return</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--green-text)' }}>${totalReturn.toFixed(2)}</div>
                        </div>
                      </div>
                      <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #e9ecef' }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#2c3e50', fontFamily: 'monospace', letterSpacing: '1px' }}>
                          ⏳ {getCountdown(inv.end_date)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', height: '1px', background: 'var(--border)', margin: '10px 0' }} />

          {/* Completed Demo Investments */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px' }}>Completed Log</h2>
            {completedInvestments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Your completed simulation results will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {completedInvestments.map(inv => {
                  const earned = parseFloat(inv.amount) * (parseFloat(inv.profit_percentage) / 100);
                  const returned = parseFloat(inv.amount) + earned;
                  return (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '16px', border: '1px solid var(--border)', borderRadius: '14px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '4px' }}>{inv.demo_plans?.name || 'Simulator'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Closed on {new Date(inv.end_date).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--green-text)', marginBottom: '2px' }}>+${returned.toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${inv.amount} + ${earned.toFixed(2)} Profit</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>
    </PageWrapper>
  );
}
