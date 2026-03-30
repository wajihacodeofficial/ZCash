'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import CodeVertexFooter from '../../components/Footer';

import { createClient } from '../../lib/supabase/client';

export default function LogoutPage() {
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    handleLogout();
  }, [supabase]);

  return (
    <div className="auth-screen" style={{ 
      background: 'var(--bg-light)', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px',
      color: 'var(--text-dark)',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      <div className="auth-card" style={{ 
        width: '100%', 
        maxWidth: '420px', 
        zIndex: 1, 
        background: 'var(--bg-card)', 
        padding: '60px 24px', 
        borderRadius: '40px', 
        boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
        textAlign: 'center',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <div className="loading-spinner" style={{ 
              width: '50px', 
              height: '50px', 
              border: '4px solid var(--border)', 
              borderTop: '4px solid var(--blue-text)', 
              borderRadius: '50%', 
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-dark)' }}>Securing your exit...</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600' }}>Cleaning up session data...</p>
          </div>
        ) : (
          <>
            <div className="logout-icon" style={{ 
              fontSize: '72px', 
              marginBottom: '32px',
              animation: 'bounce 2s infinite'
            }}>
              👋
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', color: '#1A202C', letterSpacing: '-0.5px' }}>Logged Out</h1>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600', lineHeight: '1.6', marginBottom: '40px' }}>
              Your session has been securely terminated. <br/>Thank you for using EasyPay.
            </p>

            <Link href="/login" className="clicky" style={{ 
              display: 'block',
              background: 'var(--blue-text)', 
              border: 'none', 
              borderRadius: '24px', 
              padding: '20px', 
              color: '#fff', 
              fontWeight: '800', 
              fontSize: '16px', 
              textDecoration: 'none',
              boxShadow: '0 10px 30px rgba(255, 109, 0, 0.25)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              LOGIN AGAIN
            </Link>
            
            <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>
               SAFE TRAVELS!
            </p>
          </>
        )}
      </div>

      <div style={{ marginTop: '32px' }}>
         <CodeVertexFooter light={true} />
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
