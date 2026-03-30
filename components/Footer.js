'use client';
import React from 'react';

export default function CodeVertexFooter({ light = true }) {
  return (
    <footer style={{ 
      width: '100%', 
      textAlign: 'center', 
      padding: '24px 0', 
      opacity: 0.6,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <p style={{ 
        fontSize: '11px', 
        fontWeight: '800', 
        letterSpacing: '1px', 
        color: light ? 'var(--text-muted)' : '#94a3b8',
        textTransform: 'uppercase'
      }}>
        Digital Architecture by
      </p>
      <h5 style={{ 
        fontSize: '13px', 
        fontWeight: '900', 
        color: light ? 'var(--text-dark)' : '#fff',
        margin: 0
      }}>
        CODE VERTEX SOLUTIONS
      </h5>
    </footer>
  );
}
