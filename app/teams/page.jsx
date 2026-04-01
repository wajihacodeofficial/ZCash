'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  MessageSquare, 
  Plus, 
  Settings, 
  Trash2, 
  Shield, 
  ChevronRight, 
  Send,
  Trophy,
  History,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import PageWrapper from '../../components/PageWrapper';

export default function TeamsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userProfile, setUserProfile] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [teamMessages, setTeamMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('list'); // 'list', 'my-team', 'chat', 'create'
  const [newMessage, setNewMessage] = useState('');
  const [teamNameForm, setTeamNameForm] = useState('');
  const [requestStatus, setRequestStatus] = useState(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberNote, setMemberNote] = useState('');
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [submittingMemberReq, setSubmittingMemberReq] = useState(false);
  const scrollRef = useRef(null);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        router.push('/login');
        return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, teams(*)')
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserProfile(profile);
      setMyTeam(profile.teams);
      if (profile.teams) setActiveView('my-team');
      if (profile.teams?.name) setEditTeamName(profile.teams.name);
    }

    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('status', 'approved')
      .order('score', { ascending: false });

    if (teams) setAllTeams(teams);

    const { data: requests } = await supabase
        .from('team_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();
    
    if (requests) setRequestStatus(requests);

    setLoading(false);
  };

  const fetchMessages = async (teamId) => {
    const { data } = await supabase
      .from('team_messages')
      .select('*, sender:profiles(full_name, email)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    
    if (data) setTeamMessages(data);
  };

  useEffect(() => {
    fetchData();

    const teamsChannel = supabase.channel('teams_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(teamsChannel); };
  }, []);

  useEffect(() => {
    if (activeView === 'chat' && myTeam) {
        fetchMessages(myTeam.id);
        const chatChannel = supabase.channel(`team_chat_${myTeam.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'team_messages',
                filter: `team_id=eq.${myTeam.id}`
            }, (payload) => {
                fetchMessages(myTeam.id); // Simple refresh
            })
            .subscribe();
        return () => { supabase.removeChannel(chatChannel); };
    }
  }, [activeView, myTeam]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [teamMessages]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamNameForm.trim()) return;
    
    const { error } = await supabase.from('team_requests').insert({
        user_id: userProfile.id,
        team_name: teamNameForm,
        request_type: 'create',
    });

    if (error) alert(error.message);
    else {
        alert("Team creation request sent to Admin for approval.");
        fetchData();
        setActiveView('list');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !myTeam) return;

    const { error } = await supabase.from('team_messages').insert({
        team_id: myTeam.id,
        sender_id: userProfile.id,
        body: newMessage
    });

    if (!error) setNewMessage('');
  };

  const handleJoinTeam = async (teamId) => {
      const { error } = await supabase.from('profiles').update({ team_id: teamId }).eq('id', userProfile.id);
      if (error) alert(error.message);
      else fetchData();
  };

  const handleDeleteRequest = async () => {
    if (!confirm("Are you sure you want to request team deletion? Admin must approve this.")) return;
    
    const { error } = await supabase.from('team_requests').insert({
        user_id: userProfile.id,
        team_id: myTeam.id,
        request_type: 'delete',
    });

    if (error) alert(error.message);
    else alert("Deletion request sent.");
  }

  const handleUpdateTeamName = async (e) => {
    e.preventDefault();
    if (!myTeam || !editTeamName.trim() || editTeamName.trim() === myTeam.name) return;
    setUpdatingTeam(true);
    const { error } = await supabase
      .from('teams')
      .update({ name: editTeamName.trim() })
      .eq('id', myTeam.id);
    setUpdatingTeam(false);
    if (error) alert(error.message);
    else {
      alert('Team name updated.');
      fetchData();
    }
  };

  const handleAddMemberRequest = async (e) => {
    e.preventDefault();
    if (!myTeam || !memberEmail.trim()) return;
    setSubmittingMemberReq(true);

    const { data: targetUser, error: targetErr } = await supabase
      .from('profiles')
      .select('id, email, team_id')
      .ilike('email', memberEmail.trim())
      .single();

    if (targetErr || !targetUser) {
      setSubmittingMemberReq(false);
      alert('User not found by email.');
      return;
    }

    if (targetUser.team_id) {
      setSubmittingMemberReq(false);
      alert('This user is already assigned to a team.');
      return;
    }

    const { error } = await supabase.from('team_member_requests').insert({
      team_id: myTeam.id,
      requested_by: userProfile.id,
      target_user_id: targetUser.id,
      status: 'pending',
      note: memberNote.trim() || null,
    });

    setSubmittingMemberReq(false);
    if (error) {
      alert(error.message);
    } else {
      setMemberEmail('');
      setMemberNote('');
      alert('Member addition request sent to Admin for approval.');
    }
  };

  if (loading) return <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>;

  return (
    <PageWrapper 
      title="TEAM HUB" 
      showNavbar={true} 
      activeTab="invite"
      onBack={() => router.push('/')}
    >
      {/* Tab Switcher Area */}
      <div style={{ padding: '16px 20px 10px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        {myTeam ? (
            <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'var(--bg-light)', borderRadius: '14px' }}>
                <button 
                  onClick={() => setActiveView('my-team')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: activeView === 'my-team' ? 'var(--bg-card)' : 'transparent', color: activeView === 'my-team' ? 'var(--blue-text)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '800', transition: '0.2s' }}
                >
                    STATUS
                </button>
                <button 
                  onClick={() => setActiveView('chat')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: activeView === 'chat' ? 'var(--bg-card)' : 'transparent', color: activeView === 'chat' ? 'var(--blue-text)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '800', transition: '0.2s' }}
                >
                    CHAT
                </button>
                <button 
                  onClick={() => setActiveView('list')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: activeView === 'list' ? 'var(--bg-card)' : 'transparent', color: activeView === 'list' ? 'var(--blue-text)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '800', transition: '0.2s' }}
                >
                    DISCOVER
                </button>
            </div>
        ) : (
            <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'var(--bg-light)', borderRadius: '14px' }}>
                <button 
                  onClick={() => setActiveView('list')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: activeView === 'list' ? 'var(--bg-card)' : 'transparent', color: activeView === 'list' ? 'var(--blue-text)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '800' }}
                >
                    ALL TEAMS
                </button>
                <button 
                  onClick={() => setActiveView('create')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: activeView === 'create' ? 'var(--bg-card)' : 'transparent', color: activeView === 'create' ? 'var(--blue-text)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '800' }}
                >
                    NEW TEAM
                </button>
            </div>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        
        {/* VIEW: List of Teams */}
        {activeView === 'list' && (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-dark)' }}>LEADERBOARD</h3>
                    <Trophy size={16} color="var(--blue-text)" />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {allTeams.map((team, idx) => (
                        <div key={team.id} style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: idx === 0 ? 'rgba(243,156,18,0.1)' : 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: idx === 0 ? '#f39c12' : 'var(--text-muted)', fontSize: '13px' }}>
                                    #{idx + 1}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-dark)' }}>{team.name}</h4>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Score: <span style={{ color: 'var(--blue-text)' }}>{team.score}</span></p>
                                </div>
                            </div>
                            {!myTeam && (
                                <button onClick={() => handleJoinTeam(team.id)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'var(--blue-text)', color: '#fff', fontSize: '12px', fontWeight: '800' }}>Join</button>
                            )}
                            {myTeam?.id === team.id && (
                                <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--green-text)', background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: '6px' }}>MEMBER</span>
                            )}
                        </div>
                    ))}
                    {allTeams.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No teams found.</p>}
                </div>
            </div>
        )}

        {/* VIEW: My Team Details */}
        {activeView === 'my-team' && myTeam && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '32px', border: '2px solid var(--blue-text)', textAlign: 'center', boxShadow: '0 10px 30px rgba(79,142,247,0.1)' }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(79,142,247,0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'var(--blue-text)' }}>
                        <Shield size={32} />
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-dark)', marginBottom: '5px' }}>{myTeam.name}</h3>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>TEAM ID: {myTeam.id.slice(0,8).toUpperCase()}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px' }}>TEAM SCORE</p>
                        <p style={{ fontSize: '20px', fontWeight: '900', color: 'var(--blue-text)' }}>{myTeam.score}</p>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '5px' }}>LIVE PROFIT</p>
                        <p style={{ fontSize: '20px', fontWeight: '900', color: 'var(--green-text)' }}>+${myTeam.live_profit}</p>
                    </div>
                </div>

                {/* Team Head Controls */}
                {myTeam.owner_id === userProfile.id && (
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-dark)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={16} /> TEAM HEAD CONTROLS
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <form onSubmit={handleUpdateTeamName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Edit Team Name</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                      type="text"
                                      value={editTeamName}
                                      onChange={e => setEditTeamName(e.target.value)}
                                      placeholder="Enter team name"
                                      style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-light)', color: 'var(--text-dark)', fontSize: '12px', fontWeight: '700', outline: 'none' }}
                                    />
                                    <button type="submit" disabled={updatingTeam || !editTeamName.trim()} style={{ padding: '10px 12px', borderRadius: '10px', border: 'none', background: 'var(--blue-text)', color: '#fff', fontSize: '12px', fontWeight: '800' }}>
                                        {updatingTeam ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </form>

                            <form onSubmit={handleAddMemberRequest} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Request Member Addition (Admin Approval)</label>
                                <input
                                  type="email"
                                  value={memberEmail}
                                  onChange={e => setMemberEmail(e.target.value)}
                                  placeholder="Member email"
                                  required
                                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-light)', color: 'var(--text-dark)', fontSize: '12px', fontWeight: '700', outline: 'none' }}
                                />
                                <input
                                  type="text"
                                  value={memberNote}
                                  onChange={e => setMemberNote(e.target.value)}
                                  placeholder="Optional note for admin"
                                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-light)', color: 'var(--text-dark)', fontSize: '12px', fontWeight: '700', outline: 'none' }}
                                />
                                <button type="submit" disabled={submittingMemberReq} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--bg-light)', color: 'var(--text-dark)', fontSize: '12px', fontWeight: '800', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {submittingMemberReq ? 'Submitting...' : 'Add Member Request'} <Plus size={14} />
                                </button>
                            </form>

                            <button onClick={handleDeleteRequest} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', fontWeight: '800', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                Delete Team Request <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* VIEW: Chat Room */}
        {activeView === 'chat' && myTeam && (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)' }}>
                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '15px' }}>
                    {teamMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)' }}>
                            <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                            <p style={{ fontWeight: '800', fontSize: '14px' }}>Team Discussion Room</p>
                            <p style={{ fontSize: '11px' }}>Messages are visible only to your teammates.</p>
                        </div>
                    ) : teamMessages.map(msg => (
                        <div key={msg.id} style={{ alignSelf: msg.sender_id === userProfile.id ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '2px', marginLeft: msg.sender_id === userProfile.id ? '0' : '8px', textAlign: msg.sender_id === userProfile.id ? 'right' : 'left' }}>
                                {msg.sender_id === userProfile.id ? 'You' : (msg.sender?.full_name || 'Teammate')}
                            </div>
                            <div style={{ background: msg.sender_id === userProfile.id ? 'var(--blue-text)' : 'var(--bg-card)', color: msg.sender_id === userProfile.id ? '#fff' : 'var(--text-dark)', padding: '10px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '600', border: msg.sender_id === userProfile.id ? 'none' : '1px solid var(--border)' }}>
                                {msg.body}
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', textAlign: msg.sender_id === userProfile.id ? 'right' : 'left', fontWeight: '700' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                </div>
                
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', background: 'var(--bg-card)', padding: '10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    <input 
                      type="text" 
                      value={newMessage} 
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Discuss strategy..." 
                      style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', padding: '5px' }}
                    />
                    <button type="submit" disabled={!newMessage.trim()} style={{ background: 'var(--blue-text)', border: 'none', width: '36px', height: '36px', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        )}

        {/* VIEW: Create Team */}
        {activeView === 'create' && (
            <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '32px', border: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                    <div style={{ width: '50px', height: '50px', background: 'rgba(79,142,247,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'var(--blue-text)' }}>
                        <Plus size={24} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-dark)' }}>Form New Team</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Once approved, you will become the Team Head.</p>
                </div>

                {requestStatus ? (
                    <div style={{ background: 'var(--bg-light)', padding: '20px', borderRadius: '20px', textAlign: 'center' }}>
                        <History size={24} color="var(--blue-text)" style={{ marginBottom: '10px' }} />
                        <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)' }}>Request Pending</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Admin is reviewing your request for "{requestStatus.team_name}".</p>
                    </div>
                ) : (
                    <form onSubmit={handleCreateTeam}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>TEAM NAME</label>
                            <input 
                              required 
                              type="text" 
                              value={teamNameForm} 
                              onChange={e => setTeamNameForm(e.target.value)}
                              placeholder="e.g. Phoenix Rockets 🚀" 
                              style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid var(--border)', background: 'var(--bg-light)', fontWeight: '700', outline: 'none' }}
                            />
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: '18px', border: 'none', background: 'var(--blue-text)', color: '#fff', fontSize: '14px', fontWeight: '900', boxShadow: '0 8px 24px rgba(79,142,247,0.3)' }}>
                            Submit Request
                        </button>
                    </form>
                )}
            </div>
        )}

      </div>
    </PageWrapper>
  );
}
