'use client';
import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar,
  AlertCircle,
  Plus,
  X,
  Target as TargetIcon
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminBattlesPage() {
  const supabase = createClient();
  const [battles, setBattles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', start_date: '', end_date: '' });

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch weekly battles
    const { data: btls } = await supabase
      .from('weekly_battles')
      .select('*, winner_team:teams(name)')
      .order('end_date', { ascending: false });
    
    if (btls) setBattles(btls);

    // Fetch team performance for current week
    const { data: tm } = await supabase
      .from('teams')
      .select('*')
      .order('score', { ascending: false });
    
    if (tm) setTeams(tm);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
        const { error } = await supabase
            .from('weekly_battles')
            .insert([{
                title: form.title,
                description: form.description,
                start_date: new Date(form.start_date).toISOString(),
                end_date: new Date(form.end_date).toISOString(),
                status: 'active'
            }]);
        
        if (error) throw error;
        
        setShowModal(false);
        setForm({ title: '', description: '', start_date: '', end_date: '' });
        fetchData();
    } catch (err) {
        alert(err.message);
    } finally {
        setCreating(false);
    }
  };

  const getWinner = () => teams[0] || null;

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Weekly Battles & League</h1>
          <p className="admin-page-subtitle">Analyze team performance and manage weekly competitions.</p>
        </div>
        <div className="admin-page-header-right">
            <button className="admin-btn admin-btn-blue" onClick={() => setShowModal(true)}>
                <Plus size={16} /> CREATE BATTLE
            </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Current Leaderboard Summary */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Live League Standings</h3>
              <span className="admin-badge admin-badge-green">CURRENT WEEK</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Weekly Score</th>
                    <th>Growth</th>
                    <th>Members</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, idx) => (
                    <tr key={team.id}>
                      <td>
                        <div style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            background: idx === 0 ? 'rgba(243,156,18,0.1)' : 'var(--as2)', 
                            color: idx === 0 ? '#f39c12' : 'var(--amuted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 900
                        }}>
                            {idx + 1}
                        </div>
                      </td>
                      <td>
                        <div className="admin-cell-name">{team.name}</div>
                        <div className="admin-cell-sub">ID: {team.id.slice(0,8)}</div>
                      </td>
                      <td><span className="admin-amount-pos" style={{ fontWeight: 800 }}>{team.score} PTS</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--agreen)', fontSize: '12px', fontWeight: 700 }}>
                            <TrendingUp size={12} /> +{((team.score / (team.total_deposit || 1)) * 10).toFixed(1)}%
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <Users size={14} color="var(--amuted)" /> {Math.floor(team.score / 100) + 5} {/* Mock member count if not in DB */}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && <tr className="admin-table-empty-row"><td colSpan="5">No teams participating currently.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Battle History */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Battle History</h3>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Event Title</th>
                    <th>Winner</th>
                    <th>Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {battles.length === 0 ? (
                    <tr className="admin-table-empty-row"><td colSpan="4">No battle history records found.</td></tr>
                  ) : battles.map(btl => (
                    <tr key={btl.id}>
                      <td><div className="admin-cell-name">{btl.title}</div></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trophy size={14} color="#f39c12" />
                            <span className="admin-cell-name">{btl.winner_team?.name || 'TBD'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-cell-sub">
                            {new Date(btl.start_date).toLocaleDateString()} - {new Date(btl.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge-${btl.status === 'active' ? 'blue' : 'muted'}`}>
                            {btl.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!battles.length && (
            <div style={{ background: 'rgba(79,142,247,0.05)', padding: '24px', borderRadius: '16px', border: '1px dashed rgba(79,142,247,0.3)', textAlign: 'center' }}>
                <AlertCircle size={32} color="var(--blue-text)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--atext)', marginBottom: '8px' }}>No Battles Defined</h4>
                <p style={{ fontSize: '13px', color: 'var(--amuted)', maxWidth: '400px', margin: '0 auto' }}>You can define weekly battles in the database to track formal competitions and award winners.</p>
            </div>
          )}

        </div>
      )}

      {/* Create Battle Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
            <div className="admin-modal" style={{ maxWidth: '480px' }}>
                <div className="admin-modal-header">
                    <h3 className="admin-modal-title">Create Weekly Battle</h3>
                    <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                </div>
                <form onSubmit={handleCreate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="admin-form-group">
                        <label className="admin-label">BATTLE TITLE</label>
                        <input 
                            className="admin-input" placeholder="e.g. Week 1 Championship" required
                            value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                        />
                    </div>
                    <div className="admin-form-group">
                        <label className="admin-label">DESCRIPTION (OPTIONAL)</label>
                        <textarea 
                            className="admin-input" placeholder="Rules or prizes..." rows="3"
                            value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                            style={{ resize: 'none' }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="admin-form-group">
                            <label className="admin-label">START DATE</label>
                            <input 
                                type="date" className="admin-input" required
                                value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-label">END DATE</label>
                            <input 
                                type="date" className="admin-input" required
                                value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button type="button" className="admin-btn admin-btn-muted" style={{ flex: 1 }} onClick={() => setShowModal(false)}>CANCEL</button>
                        <button type="submit" className="admin-btn admin-btn-blue" style={{ flex: 1 }} disabled={creating}>
                            {creating ? 'CREATING...' : 'CREATE EVENT'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
