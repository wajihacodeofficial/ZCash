'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [actionMsg, setActionMsg] = useState('');
  const [msgModal, setMsgModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminId, setAdminId] = useState(null);

  const showAction = (msg, type = 'success') => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setAdminId(user.id);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(10000);
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { 
    fetchUsers(); 

    const usersChannel = supabase
      .channel('admin_users_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const handleToggleUser = async (userId, currentRole) => {
    const newRole = currentRole === 'user' ? 'banned' : 'user';
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { showAction('Error: ' + error.message, 'error'); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    showAction(`User ${newRole === 'banned' ? 'banned' : 'activated'} successfully.`);
  };

  // Message logic removed for cleanup
  const handleSendMessage = async (e) => {
    e.preventDefault();
    showAction('Direct messaging is currently disabled.', 'error');
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal?.id) return;
    setIsDeleting(true);
    
    // Check if user is an admin - simple safety
    const targetUser = users.find(u => u.id === deleteModal.id);
    if (['admin', 'ADMIN', 'SUPERADMIN'].includes(targetUser?.role)) {
      showAction('Cannot delete an administrator account.', 'error');
      setIsDeleting(false);
      setDeleteModal(null);
      return;
    }

    const { error } = await supabase.from('profiles').delete().eq('id', deleteModal.id);
    
    if (error) {
      showAction('Error: ' + error.message, 'error');
    } else {
      showAction(`User ${deleteModal.userName} has been removed.`);
      setUsers(prev => prev.filter(u => u.id !== deleteModal.id));
    }
    
    setIsDeleting(false);
    setDeleteModal(null);
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.role === filterRole || (!u.role && filterRole === 'user');
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => ['admin','ADMIN','SUPERADMIN'].includes(u.role)).length,
    banned: users.filter(u => u.role === 'banned').length,
    regular: users.filter(u => !u.role || u.role === 'user').length,
  };

  const ROLE_BADGE = (role) => {
    if (['admin','ADMIN','SUPERADMIN'].includes(role)) return 'blue';
    if (role === 'banned') return 'red';
    return 'green';
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-subtitle">Manage all registered users and their account status.</p>
        </div>
        <button onClick={fetchUsers} className="admin-btn admin-btn-secondary" style={{ marginLeft: '16px' }}>
          Refresh List
        </button>
      </div>

      {/* Stats row */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        {[
          { label: 'Total Users', value: stats.total, col: 'blue' },
          { label: 'Regular Users', value: stats.regular, col: 'green' },
          { label: 'Admins', value: stats.admins, col: 'purple' },
          { label: 'Banned', value: stats.banned, col: 'red' },
        ].map(s => (
          <div key={s.label} className="admin-stat-card" style={{ padding: '16px 18px' }}>
            <div className="admin-stat-label">{s.label}</div>
            <div className="admin-stat-value" style={{ fontSize: '22px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alert */}
      {actionMsg && (
        <div className="admin-alert admin-alert-info">
          {actionMsg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <input
          className="admin-input" type="text" placeholder="Search name or email…"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: '280px' }}
        />
        <div className="admin-tabs">
          {['ALL', 'user', 'ADMIN', 'banned'].map(r => (
            <button key={r} className={`admin-tab${filterRole === r ? ' active' : ''}`}
              onClick={() => setFilterRole(r)}>
              {r === 'ALL' ? 'All' : r === 'user' ? 'Regular' : r === 'ADMIN' ? 'Admins' : 'Banned'}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--amuted)', fontWeight: 600 }}>
          {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Balance</th>
                <th>Joined</th>
                <th>Role</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr className="admin-table-empty-row"><td colSpan="5">No users found.</td></tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar" style={{ padding: '6px' }}>
                        <img src="/logo.png" alt="User" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <div>
                        <div className="admin-cell-name">{u.full_name || 'No Name'}</div>
                        <div className="admin-cell-sub">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-amount-pos">${Number(u.balance || 0).toFixed(2)}</span>
                  </td>
                  <td>
                    <div className="admin-cell-name">{new Date(u.created_at).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${ROLE_BADGE(u.role)}`}>
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {!['admin', 'ADMIN', 'SUPERADMIN'].includes(u.role) && (
                        <>
                          <button
                            className={`admin-btn admin-btn-sm ${u.role === 'banned' ? 'admin-btn-success' : 'admin-btn-secondary'}`}
                            onClick={() => handleToggleUser(u.id, u.role)}
                            title={u.role === 'banned' ? 'Activate User' : 'Ban User'}>
                            {u.role === 'banned' ? 'Activate' : 'Ban'}
                          </button>
                          <button 
                            className="admin-btn admin-btn-sm admin-btn-danger-ghost"
                            onClick={() => setDeleteModal({ id: u.id, userName: u.full_name || u.email })}
                            title="Delete User Permanently">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '400px' }}>
            <div className="admin-modal-header">
              <div style={{ background: 'var(--ared-dim)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <svg width="24" height="24" fill="none" stroke="var(--ared)" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="admin-modal-title">Delete User?</h3>
              <p className="admin-modal-sub">
                Are you sure you want to permanently delete <strong>{deleteModal.userName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="admin-modal-actions">
              <button 
                onClick={handleConfirmDelete} 
                className="admin-btn admin-btn-danger" 
                style={{ flex: 1 }}
                disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
              <button 
                onClick={() => setDeleteModal(null)} 
                className="admin-btn admin-btn-secondary" 
                style={{ flex: 1 }}>
                Keep User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
