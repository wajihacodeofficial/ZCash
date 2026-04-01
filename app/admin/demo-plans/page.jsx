'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminDemoPlansPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('system');
  const [plans, setPlans] = useState([]);
  const [userPlans, setUserPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [editPlan, setEditPlan] = useState(null);
  const [editInvestment, setEditInvestment] = useState(null);

  const showAction = (msg, type = 'info') => {
    setActionMsg({ text: msg, type });
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: plansList } = await supabase.from('demo_plans').select('*').order('duration_days');
    if (plansList) setPlans(plansList);
    
    const { data: upList } = await supabase
      .from('demo_investments')
      .select('*, profiles(full_name, email), demo_plans(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (upList) setUserPlans(upList);
    
    setLoading(false);
  };

  useEffect(() => { 
    fetchData(); 

    const plansChannel = supabase
      .channel('admin_demo_plans_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_plans' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_investments' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(plansChannel);
    };
  }, []);

  const handleTogglePlan = async (planId, currentActive) => {
    const { error } = await supabase.from('demo_plans').update({ active: !currentActive }).eq('id', planId);
    if (error) { showAction('Error: ' + error.message, 'error'); return; }
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, active: !currentActive } : p));
    showAction(!currentActive ? 'Plan enabled.' : 'Plan disabled.');
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (editPlan.id === 'NEW') {
      const { data, error } = await supabase.from('demo_plans').insert({
        name: editPlan.name, 
        profit_percentage: parseFloat(editPlan.profit_percentage), 
        duration_days: parseInt(editPlan.duration_days, 10), 
        active: true
      }).select();
      if (error) { showAction('Error: ' + error.message, 'error'); return; }
      if (data) setPlans([...plans, data[0]]);
      showAction('New demo plan created.');
    } else {
      const { error } = await supabase.from('demo_plans').update({
        name: editPlan.name, 
        profit_percentage: parseFloat(editPlan.profit_percentage), 
        duration_days: parseInt(editPlan.duration_days, 10),
      }).eq('id', editPlan.id);
      if (error) { showAction('Error: ' + error.message, 'error'); return; }
      setPlans(prev => prev.map(p => p.id === editPlan.id ? { ...p, ...editPlan } : p));
      showAction('Demo plan updated successfully.');
    }
    setEditPlan(null);
  };

  const handleUpdateInvestmentDate = async (e) => {
    e.preventDefault();
    if (!editInvestment) return;
    
    // Update the end_date in Supabase
    const { error } = await supabase
      .from('demo_investments')
      .update({ end_date: new Date(editInvestment.end_date).toISOString() })
      .eq('id', editInvestment.id);
      
    if (error) {
      showAction('Error: ' + error.message, 'error');
      return;
    }
    
    // Optimistic update of UI
    setUserPlans(prev => prev.map(up => 
      up.id === editInvestment.id 
        ? { ...up, end_date: new Date(editInvestment.end_date).toISOString() } 
        : up
    ));
    
    showAction('Investment end date updated manually.', 'info');
    setEditInvestment(null);
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Demo Investment Plans</h1>
          <p className="admin-page-subtitle">Manage demo simulation packages and view user demo investments.</p>
        </div>
        <div className="admin-page-header-right">
          <div className="admin-tabs">
            <button className={`admin-tab${activeTab === 'system' ? ' active' : ''}`} onClick={() => setActiveTab('system')}>
              Demo Plans ({plans.length})
            </button>
            <button className={`admin-tab${activeTab === 'user' ? ' active' : ''}`} onClick={() => setActiveTab('user')}>
              Demo Investments ({userPlans.length})
            </button>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className={`admin-alert admin-alert-${actionMsg.type === 'error' ? 'error' : 'info'}`}>{actionMsg.text}</div>
      )}

      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : activeTab === 'system' ? (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <button className="admin-btn admin-btn-primary"
              onClick={() => setEditPlan({ id: 'NEW', name: 'New Demo Plan', profit_percentage: 10.0, duration_days: 10 })}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
              Create New Demo Plan
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {plans.map(plan => (
              <div key={plan.id} className="admin-plan-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--atext)' }}>{plan.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--amuted)', marginTop: '2px' }}>Simulation Package</div>
                  </div>
                  <span className={`admin-badge admin-badge-${plan.active ? 'green' : 'red'}`}>
                    {plan.active ? 'Active' : 'Off'}
                  </span>
                </div>

                <div style={{ background: 'var(--as2)', borderRadius: 'var(--radius-sm)', padding: '14px', border: '1px solid var(--aborder)' }}>
                  <div className="admin-plan-stat-row">
                    <span className="admin-plan-stat-key">Fixed Profit</span>
                    <span className="admin-plan-stat-val" style={{ color: 'var(--agreen)' }}>{plan.profit_percentage}%</span>
                  </div>
                  <div className="admin-plan-stat-row" style={{ borderBottom: 'none' }}>
                    <span className="admin-plan-stat-key">Duration</span>
                    <span className="admin-plan-stat-val">{plan.duration_days} days</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="admin-btn admin-btn-secondary" style={{ flex: 1 }} onClick={() => setEditPlan({ ...plan })}>
                    Edit
                  </button>
                  <button
                    className={`admin-btn ${plan.active ? 'admin-btn-danger-outline' : 'admin-btn-success'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleTogglePlan(plan.id, plan.active)}>
                    {plan.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="admin-empty" style={{ gridColumn: '1/-1' }}>
                <div className="admin-empty-icon">📊</div>
                <div className="admin-empty-text">No demo plans created yet. Create one above.</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan Name</th>
                <th>Invested Amount</th>
                <th>Profit %</th>
                <th>End Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userPlans.length === 0 ? (
                <tr className="admin-table-empty-row"><td colSpan="7">No active demo investments.</td></tr>
              ) : userPlans.map(up => (
                <tr key={up.id}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar">{(up.profiles?.full_name || 'U').charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="admin-cell-name">{up.profiles?.full_name || 'Unknown'}</div>
                        <div className="admin-cell-sub">{up.profiles?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-cell-name" style={{ color: 'var(--ablue)' }}>{up.demo_plans?.name || 'Unknown Plan'}</div>
                    <div className="admin-cell-sub">{up.duration_days} days</div>
                  </td>
                  <td><span className="admin-amount-pos">${Number(up.amount).toFixed(2)}</span></td>
                  <td><span style={{color: 'var(--agreen)', fontWeight: 'bold'}}>{Number(up.profit_percentage)}%</span></td>
                  <td>
                    <div className="admin-cell-name">
                      {new Date(up.end_date).toLocaleDateString()} {new Date(up.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${up.status === 'completed' ? 'green' : 'orange'}`}>
                      {up.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {up.status === 'active' && (
                      <button 
                        className="admin-btn admin-btn-sm admin-btn-secondary"
                        onClick={() => setEditInvestment({ id: up.id, end_date: new Date(up.end_date).toISOString().slice(0, 16), user_name: up.profiles?.full_name })}
                        title="Edit End Date">
                        Edit Date
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editPlan && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <button className="admin-modal-close" onClick={() => setEditPlan(null)}>✕</button>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editPlan.id === 'NEW' ? 'Create Demo Plan' : 'Edit Demo Plan'}</h3>
              <p className="admin-modal-sub">{editPlan.id !== 'NEW' && editPlan.name}</p>
            </div>
            <form onSubmit={handleUpdatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="admin-label">Plan Name</label>
                <input className="admin-input" type="text" value={editPlan.name}
                  onChange={e => setEditPlan({ ...editPlan, name: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="admin-label">Total Profit (%)</label>
                  <input className="admin-input" type="number" step="0.01" value={editPlan.profit_percentage}
                     onChange={e => setEditPlan({ ...editPlan, profit_percentage: e.target.value })} required />
                </div>
                <div>
                  <label className="admin-label">Duration (Days)</label>
                  <input className="admin-input" type="number" step="1" value={editPlan.duration_days}
                    onChange={e => setEditPlan({ ...editPlan, duration_days: e.target.value })} required />
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1 }}>Save Plan</button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditPlan(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Investment Date Modal */}
      {editInvestment && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '400px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Edit End Date</h3>
              <p className="admin-modal-sub">Change when the simulation completes for <strong>{editInvestment.user_name}</strong>.</p>
            </div>
            <form onSubmit={handleUpdateInvestmentDate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="admin-label">New End Date & Time</label>
                <input 
                  className="admin-input" 
                  type="datetime-local" 
                  value={editInvestment.end_date}
                  onChange={e => setEditInvestment({ ...editInvestment, end_date: e.target.value })} 
                  required 
                />
                <p style={{ fontSize: '11px', color: 'var(--amuted)', marginTop: '6px' }}>
                  Setting a date in the past will allow the cron job or UI to process the payout immediately.
                </p>
              </div>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1 }}>Save Date</button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditInvestment(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
