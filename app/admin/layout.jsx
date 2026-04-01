'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import TabHeader from '../../components/TabHeader';
import NotificationPanel from '../../components/NotificationPanel';
import './admin.css';

/* ──────────────────────────────────────────
   NAV items — used for sidebar + mobile nav
────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      {
        name: 'Dashboard',
        path: '/admin',
        exact: true,
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Finance',
    items: [
      {
        name: 'Deposits',
        path: '/admin/deposits',
        exact: false,
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 4v16m8-8H4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        name: 'Withdrawals',
        path: '/admin/withdrawals',
        exact: false,
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 12h14M12 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        name: 'Transactions',
        path: '/admin/transactions',
        exact: false,
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        name: 'Payment Proofs',
        path: '/admin/proofs',
        exact: false,
        short: 'Proofs',
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 16M6 8h.01"
              strokeLinecap="round"
            />
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Management',
    items: [
      {
        name: 'Users',
        path: '/admin/users',
        exact: false,
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path
              d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        name: 'Investment Plans',
        path: '/admin/plans',
        exact: false,
        short: 'Plans',
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        ),
      },
      {
        name: 'Demo Plans',
        path: '/admin/demo-plans',
        exact: false,
        short: 'Demo Plans',
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        ),
      },
      {
        name: 'Messages',
        path: '/admin/messages',
        exact: false,
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        name: 'Announcements',
        path: '/admin/announcements',
        exact: false,
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Community',
    items: [
      {
        name: 'Teams',
        path: '/admin/teams',
        exact: false,
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        name: 'Battles',
        path: '/admin/battles',
        exact: false,
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M8 21l8-18M3 8h18M5 16h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'System',
    items: [
      {
        name: 'Settings',
        path: '/admin/settings',
        exact: false,
        icon: (
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

const ALL_ITEMS = NAV_ITEMS.flatMap((g) => g.items);

// Mobile bottom nav shows 4 main + "More" button
const MOBILE_PRIMARY = [
  ALL_ITEMS.find((i) => i.path === '/admin'),
  ALL_ITEMS.find((i) => i.path === '/admin/deposits'),
  ALL_ITEMS.find((i) => i.path === '/admin/withdrawals'),
  ALL_ITEMS.find((i) => i.path === '/admin/users'),
];
const MOBILE_MORE = ALL_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i));

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/deposits': 'Deposits',
  '/admin/withdrawals': 'Withdrawals',
  '/admin/plans': 'Investment Plans',
  '/admin/demo-plans': 'Demo Investment Plans',
  '/admin/transactions': 'Master Ledger',
  '/admin/proofs': 'Payment Proofs',
  '/admin/messages': 'Messages',
  '/admin/announcements': 'Announcements',
  '/admin/teams': 'Team Management',
  '/admin/battles': 'Weekly Battles',
  '/admin/settings': 'Settings',
};

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Remove unused theme states and effect, now using raw CSS variables
  // useEffect(() => {
  //   const saved = localStorage.getItem('easypay-theme') || 'light';
  //   setTheme(saved);
  //   if (typeof document !== 'undefined') {
  //     document.documentElement.setAttribute('data-theme', saved);
  //   }
  // }, []);

  // const toggleTheme = () => {
  //   const next = theme === 'dark' ? 'light' : 'dark';
  //   setTheme(next);
  //   localStorage.setItem('easypay-theme', next);
  //   if (typeof document !== 'undefined') {
  //     document.documentElement.setAttribute('data-theme', next);
  //   }
  // };

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  // Authenticate admin
  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', user.id)
        .single();
      if (
        !profile ||
        !['admin', 'ADMIN', 'SUPERADMIN'].includes(profile.role)
      ) {
        router.push('/dashboard');
        return;
      }
      setAdminUser(profile);
      setLoading(false);
    };
    checkAdmin();
  }, []);

  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/logout');
  };

  const isActive = useCallback(
    (item) => {
      return item.exact
        ? pathname === item.path
        : pathname === item.path || pathname.startsWith(item.path + '/');
    },
    [pathname]
  );

  if (loading) {
    return (
      <div className="admin-spinner-root">
        <div className="admin-spinner-wrap">
          <div className="admin-spinner" />
          <span className="admin-spinner-text">Authenticating Admin...</span>
        </div>
      </div>
    );
  }

  const currentPageTitle = PAGE_TITLES[pathname] || 'Admin';
  const initials = adminUser?.full_name
    ? adminUser.full_name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'A';

  return (
    <div className="admin-root">
      {/* ── SIDEBAR BACKDROP (mobile) ── */}
      <div
        className={`admin-sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── SIDEBAR ── */}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-img">
            <img src="/logo.png" alt="EasyPay" />
          </div>
          <div className="admin-sidebar-logo-text">
            <div className="admin-sidebar-logo-name">EasyPay</div>
            <div className="admin-sidebar-logo-sub">Admin Panel</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="admin-nav">
          {NAV_ITEMS.map(({ section, items }) => (
            <div key={section}>
              <div className="admin-nav-section">{section}</div>
              {items.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`admin-nav-item${isActive(item) ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">
               <img src="/logo.png" alt="Profile" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            </div>
            <div className="admin-user-info">
              <div className="admin-user-name">
                {adminUser?.full_name || 'Admin'}
              </div>
              <div className="admin-user-role">
                {adminUser?.role || 'Admin'}
              </div>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={() => setConfirmLogout(true)}>
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="admin-main">
        {/* Universal Top Bar */}
        <TabHeader
          title="ADMIN DASHBOARD"
          userProfile={adminUser}
          showActions={true}
          setNotifOpen={setNotifOpen}
          unreadCount={unreadCount}
          onBack={() => router.push('/')}
          onAvatarClick={() => router.push('/admin')}
        />

        <NotificationPanel 
          isOpen={notifOpen} 
          onClose={() => setNotifOpen(false)}
          onUnreadCountChange={setUnreadCount}
          isAdminView={true}
        />

        {/* Content */}
        <div className="admin-content">{children}</div>

        {/* System Confirm Modal */}
        {confirmLogout && (
          <div className="system-modal-overlay">
            <div className="system-modal">
              <div className="system-modal-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="system-modal-title">Logout EasyPay?</h3>
              <p className="system-modal-text">Are you sure you want to terminate your administrative session?</p>
              <div className="system-modal-actions">
                <button className="system-modal-btn system-modal-cancel" onClick={() => setConfirmLogout(false)}>Stay</button>
                <button className="system-modal-btn system-modal-confirm" onClick={handleLogout}>Logout</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="admin-mobile-nav">
        {MOBILE_PRIMARY.map(
          (item) =>
            item && (
              <Link
                key={item.path}
                href={item.path}
                className={`admin-mobile-nav-item${isActive(item) ? ' active' : ''}`}
              >
                {item.icon}
                <span>{item.short || item.name}</span>
              </Link>
            )
        )}

        {/* "More" button */}
        <button
          className={`admin-mobile-nav-item admin-mobile-nav-more${MOBILE_MORE.some((i) => isActive(i)) ? ' active' : ''}`}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="20"
            height="20"
          >
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <span>More</span>
        </button>
      </nav>

      {/* ── MORE PANEL (mobile) ── */}
      <div
        className={`admin-mobile-more-panel-backdrop${moreOpen ? ' open' : ''}`}
        onClick={() => setMoreOpen(false)}
      />
      <div className={`admin-mobile-more-panel${moreOpen ? ' open' : ''}`}>
        {MOBILE_MORE.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`admin-mobile-more-item${isActive(item) ? ' active' : ''}`}
            onClick={() => setMoreOpen(false)}
          >
            {item.icon}
            <span>{item.short || item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
