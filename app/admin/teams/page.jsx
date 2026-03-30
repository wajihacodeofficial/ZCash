'use client';
import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Trash2, 
  Check, 
  X, 
  Shield, 
  Search, 
  Plus, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Award
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminTeamsPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState([]);
  const [requests, setRequests] = useState([]);
  const [memberRequests, setMemberRequests] = useState([]);
  const [membersByTeam, setMembersByTeam] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'member-requests', 'all'
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch requests
    const { data: reqs } = await supabase
      .from('team_requests')
      .select('*, user:profiles(full_name, email)')
      .eq('status', 'pending');
    
    if (reqs) setRequests(reqs);

    // Fetch team member-add requests
    const { data: memberReqs } = await supabase
      .from('team_member_requests')
      .select(`
        *,
        team:teams(name),
        requester:profiles!team_member_requests_requested_by_fkey(full_name, email),
        target:profiles!team_member_requests_target_user_id_fkey(full_name, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (memberReqs) setMemberRequests(memberReqs);

    // Fetch existing teams
    const { data: tm } = await supabase
      .from('teams')
      .select('*, owner:profiles(full_name, email)')
      .order('created_at', { ascending: false });
    
    if (tm) setTeams(tm);

    const teamIds = (tm || []).map((t) => t.id);
    if (teamIds.length > 0) {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, email, team_id')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false });
      const grouped = {};
      (members || []).forEach((m) => {
        if (!grouped[m.team_id]) grouped[m.team_id] = [];
        grouped[m.team_id].push(m);
      });
      setMembersByTeam(grouped);
    } else {
      setMembersByTeam({});
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const showAction = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3500);
  };

  const handleApprove = async (req) => {
    if (req.request_type === 'create') {
        const { data: newTeam, error: teamErr } = await supabase.from('teams').insert({
            name: req.team_name,
            owner_id: req.user_id,
            status: 'approved'
        }).select().single();

        if (teamErr) { showAction("Error creating team: " + teamErr.message); return; }

        await supabase.from('profiles').update({ team_id: newTeam.id }).eq('id', req.user_id);
    } else if (req.request_type === 'delete') {
        await supabase.from('teams').delete().eq('id', req.team_id);
    }

    await supabase.from('team_requests').update({ status: 'approved' }).eq('id', req.id);
    showAction("Request approved.");
    fetchData();
  };

  const handleReject = async (id) => {
    await supabase.from('team_requests').update({ status: 'rejected' }).eq('id', id);
    showAction("Request rejected.");
    fetchData();
  };

  const handleApproveMemberRequest = async (req) => {
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ team_id: req.team_id })
      .eq('id', req.target_user_id);
    if (profileErr) {
      showAction('Error assigning member: ' + profileErr.message);
      return;
    }

    await supabase
      .from('team_member_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', req.id);
    showAction('Member request approved.');
    fetchData();
  };

  const handleRejectMemberRequest = async (id) => {
    await supabase
      .from('team_member_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id);
    showAction('Member request rejected.');
    fetchData();
  };

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member from the team?')) return;
    const { error } = await supabase
      .from('profiles')
      .update({ team_id: null })
      .eq('id', memberId);
    if (error) showAction('Error removing member: ' + error.message);
    else {
      showAction('Member removed from team.');
      fetchData();
    }
  };

  const deleteTeamDirect = async (id) => {
    if (!confirm("Delete this team and remove all members?")) return;
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) showAction("Error: " + error.message);
    else { showAction("Team deleted."); fetchData(); }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Team Management</h1>
          <p className="admin-page-subtitle">Review formation requests and manage existing teams.</p>
        </div>
        <div className="admin-tabs">
            <button className={`admin-tab${activeTab === 'requests' ? ' active' : ''}`} onClick={() => setActiveTab('requests')}>
                Requests ({requests.length})
            </button>
            <button className={`admin-tab${activeTab === 'member-requests' ? ' active' : ''}`} onClick={() => setActiveTab('member-requests')}>
                Member Requests ({memberRequests.length})
            </button>
            <button className={`admin-tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>
                Active Teams ({teams.length})
            </button>
        </div>
      </div>

      {actionMsg && <div className="admin-alert admin-alert-info">{actionMsg}</div>}

      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : activeTab === 'requests' ? (
        <div className="admin-card">
            <div className="admin-card-header">
                <h3 className="admin-card-title">Pending Approvals</h3>
            </div>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Request Type</th>
                            <th>Target Name/ID</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr className="admin-table-empty-row"><td colSpan={5}>No pending requests found.</td></tr>
                        ) : requests.map(req => (
                            <tr key={req.id}>
                                <td>
                                    <div className="admin-cell-name">{req.user?.full_name || 'Anonymous'}</div>
                                    <div className="admin-cell-sub">{req.user?.email}</div>
                                </td>
                                <td>
                                    <span className={`admin-badge admin-badge-${req.request_type === 'create' ? 'blue' : 'red'}`}>
                                        {req.request_type.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <div className="admin-cell-name">{req.team_name || req.team_id}</div>
                                </td>
                                <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button onClick={() => handleApprove(req)} className="admin-btn admin-btn-sm admin-btn-primary">
                                            <Check size={14} /> Approve
                                        </button>
                                        <button onClick={() => handleReject(req.id)} className="admin-btn admin-btn-sm admin-btn-secondary">
                                            <X size={14} /> Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : activeTab === 'member-requests' ? (
        <div className="admin-card">
            <div className="admin-card-header">
                <h3 className="admin-card-title">Pending Member Additions</h3>
            </div>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Team</th>
                            <th>Requested By</th>
                            <th>Target User</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberRequests.length === 0 ? (
                            <tr className="admin-table-empty-row"><td colSpan={5}>No pending member requests.</td></tr>
                        ) : memberRequests.map(req => (
                            <tr key={req.id}>
                                <td><div className="admin-cell-name">{req.team?.name || 'Unknown Team'}</div></td>
                                <td>
                                    <div className="admin-cell-name">{req.requester?.full_name || 'Unknown'}</div>
                                    <div className="admin-cell-sub">{req.requester?.email}</div>
                                </td>
                                <td>
                                    <div className="admin-cell-name">{req.target?.full_name || 'Unknown'}</div>
                                    <div className="admin-cell-sub">{req.target?.email}</div>
                                </td>
                                <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button onClick={() => handleApproveMemberRequest(req)} className="admin-btn admin-btn-sm admin-btn-primary">
                                            <Check size={14} /> Approve
                                        </button>
                                        <button onClick={() => handleRejectMemberRequest(req.id)} className="admin-btn admin-btn-sm admin-btn-secondary">
                                            <X size={14} /> Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="admin-card">
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Team Details</th>
                            <th>Head / Owner</th>
                            <th>Performance</th>
                            <th style={{ textAlign: 'right' }}>Management</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map(team => (
                            <tr key={team.id}>
                                <td>
                                    <div className="admin-cell-name">{team.name}</div>
                                    <div className="admin-cell-sub">ID: {team.id.slice(0,8)}</div>
                                    <div className="admin-cell-sub">Members: {team.members_count ?? membersByTeam[team.id]?.length ?? 0}</div>
                                </td>
                                <td>
                                    <div className="admin-cell-name">{team.owner?.full_name || 'No Owner'}</div>
                                    <div className="admin-cell-sub">{team.owner?.email}</div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        <span className="admin-badge admin-badge-blue">Score: {team.score}</span>
                                        <span className="admin-badge admin-badge-green">Profit: ${team.live_profit}</span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button onClick={() => deleteTeamDirect(team.id)} className="admin-btn admin-btn-sm admin-btn-danger-ghost">
                                        <Trash2 size={14} /> Delete Team
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="admin-card-header" style={{ borderTop: '1px solid var(--aborder)', marginTop: '12px' }}>
                <h3 className="admin-card-title">Team Members</h3>
            </div>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Team</th>
                            <th>Member</th>
                            <th>Email</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.flatMap((team) => (membersByTeam[team.id] || []).map((member) => ({ team, member }))).length === 0 ? (
                            <tr className="admin-table-empty-row"><td colSpan={4}>No team members found.</td></tr>
                        ) : teams.flatMap((team) => (membersByTeam[team.id] || []).map((member) => ({ team, member }))).map(({ team, member }) => (
                            <tr key={member.id}>
                                <td><div className="admin-cell-name">{team.name}</div></td>
                                <td><div className="admin-cell-name">{member.full_name || 'Unknown'}</div></td>
                                <td><div className="admin-cell-sub">{member.email}</div></td>
                                <td style={{ textAlign: 'right' }}>
                                    <button onClick={() => removeMember(member.id)} className="admin-btn admin-btn-sm admin-btn-danger-ghost">
                                        <Trash2 size={14} /> Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}
