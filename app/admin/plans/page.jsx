'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminPlansPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('system');
  const [plans, setPlans] = useState([]);
  const [userPlans, setUserPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [editPlan, setEditPlan] = useState(null);

  const showAction = (msg, type = 'info') => {
    setActionMsg({ text: msg, type });
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: plansList } = await supabase.from('plans').select('*').order('price_usd');
    if (plansList) setPlans(plansList);
    const { data: upList } = await supabase
      .from('user_plans')
      .select('*, profiles(full_name, email), plans(name, daily_roi_percent)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (upList) setUserPlans(upList);
    setLoading(false);
  };

  useEffect(() => { 
    fetchData(); 

    const plansChannel = supabase
      .channel('admin_plans_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_plans' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(plansChannel);
    };
  }, []);

  const handleTogglePlan = async (planId, currentActive) => {
    const { error } = await supabase.from('plans').update({ active: !currentActive }).eq('id', planId);
    if (error) { showAction('Error: ' + error.message, 'error'); return; }
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, active: !currentActive } : p));
    showAction(!currentActive ? 'Plan enabled.' : 'Plan disabled.');
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (editPlan.id === 'NEW') {
      const { data, error } = await supabase.from('plans').insert({
        name: editPlan.name, price_usd: editPlan.price_usd,
        daily_roi_percent: editPlan.daily_roi_percent, duration_days: editPlan.duration_days, active: true
      }).select();
      if (error) { showAction('Error: ' + error.message, 'error'); return; }
      if (data) setPlans([...plans, data[0]]);
      showAction('New plan created.');
    } else {
      const { error } = await supabase.from('plans').update({
        name: editPlan.name, price_usd: editPlan.price_usd,
        daily_roi_percent: editPlan.daily_roi_percent, duration_days: editPlan.duration_days,
      }).eq('id', editPlan.id);
      if (error) { showAction('Error: ' + error.message, 'error'); return; }
      setPlans(prev => prev.map(p => p.id === editPlan.id ? { ...p, ...editPlan } : p));
      showAction('Plan updated successfully.');
    }
    setEditPlan(null);
  };

  const handleToggleUserPlan = async (planId, currentActive) => {
    const { error } = await supabase.from('user_plans').update({ active: !currentActive }).eq('id', planId);
    if (error) { showAction('Error: ' + error.message, 'error'); return; }
    setUserPlans(prev => prev.map(p => p.id === planId ? { ...p, active: !currentActive } : p));
    showAction(`User plan ${!currentActive ? 'activated' : 'deactivated'}.`);
  };

  // Projected earnings
  const projectedROI = (plan) => ((plan.price_usd * plan.daily_roi_percent / 100) * plan.duration_days).toFixed(2);

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Investment Plans</h1>
          <p className="admin-page-subtitle">Manage system investment packages and view user subscriptions.</p>
        </div>
        <div className="admin-page-header-right">
          <div className="admin-tabs">
            <button className={`admin-tab${activeTab === 'system' ? ' active' : ''}`} onClick={() => setActiveTab('system')}>
              System Plans ({plans.length})
            </button>
            <button className={`admin-tab${activeTab === 'user' ? ' active' : ''}`} onClick={() => setActiveTab('user')}>
              User Subscriptions ({userPlans.length})
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
              onClick={() => setEditPlan({ id: 'NEW', name: 'New Plan', price_usd: 10, daily_roi_percent: 2.0, duration_days: 30 })}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
              Create New Plan
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {plans.map(plan => (
              <div key={plan.id} className="admin-plan-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--atext)' }}>{plan.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--amuted)', marginTop: '2px' }}>Investment Package</div>
                  </div>
                  <span className={`admin-badge admin-badge-${plan.active ? 'green' : 'red'}`}>
                    {plan.active ? 'Active' : 'Off'}
                  </span>
                </div>

                <div style={{ background: 'var(--as2)', borderRadius: 'var(--radius-sm)', padding: '14px', border: '1px solid var(--aborder)' }}>
                  <div className="admin-plan-stat-row">
                    <span className="admin-plan-stat-key">Min. Investment</span>
                    <span className="admin-plan-stat-val">${plan.price_usd}</span>
                  </div>
                  <div className="admin-plan-stat-row">
                    <span className="admin-plan-stat-key">Daily ROI</span>
                    <span className="admin-plan-stat-val" style={{ color: 'var(--agreen)' }}>{plan.daily_roi_percent}%</span>
                  </div>
                  <div className="admin-plan-stat-row">
                    <span className="admin-plan-stat-key">Duration</span>
                    <span className="admin-plan-stat-val">{plan.duration_days} days</span>
                  </div>
                  <div className="admin-plan-stat-row" style={{ borderBottom: 'none' }}>
                    <span className="admin-plan-stat-key">Projected Return</span>
                    <span className="admin-plan-stat-val" style={{ color: 'var(--ablue)' }}>${projectedROI(plan)}</span>
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
                <div className="admin-empty-text">No plans created yet. Create one above.</div>
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
                <th>Plan</th>
                <th>Invested</th>
                <th>End Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {userPlans.length === 0 ? (
                <tr className="admin-table-empty-row"><td colSpan="6">No active user subscriptions.</td></tr>
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
                    <div className="admin-cell-name" style={{ color: 'var(--ablue)' }}>{up.plans?.name || 'Unknown Plan'}</div>
                    <div className="admin-cell-sub">{up.plans?.daily_roi_percent}% / day</div>
                  </td>
                  <td><span className="admin-amount-pos">${Number(up.amount_invested).toFixed(2)}</span></td>
                  <td><div className="admin-cell-name">{new Date(up.end_date).toLocaleDateString()}</div></td>
                  <td>
                    <span className={`admin-badge admin-badge-${up.active ? 'green' : 'red'}`}>
                      {up.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={`admin-btn admin-btn-sm ${up.active ? 'admin-btn-danger-outline' : 'admin-btn-success'}`}
                      onClick={() => handleToggleUserPlan(up.id, up.active)}>
                      {up.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editPlan && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <button className="admin-modal-close" onClick={() => setEditPlan(null)}>✕</button>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editPlan.id === 'NEW' ? 'Create New Plan' : 'Edit Plan'}</h3>
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
                  <label className="admin-label">Min. Price (USD)</label>
                  <input className="admin-input" type="number" step="0.01" value={editPlan.price_usd}
                    onChange={e => setEditPlan({ ...editPlan, price_usd: e.target.value })} required />
                </div>
                <div>
                  <label className="admin-label">Daily ROI (%)</label>
                  <input className="admin-input" type="number" step="0.01" value={editPlan.daily_roi_percent}
                    onChange={e => setEditPlan({ ...editPlan, daily_roi_percent: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="admin-label">Duration (Days)</label>
                <input className="admin-input" type="number" step="1" value={editPlan.duration_days}
                  onChange={e => setEditPlan({ ...editPlan, duration_days: e.target.value })} required />
              </div>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1 }}>Save Plan</button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditPlan(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
