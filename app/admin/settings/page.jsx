'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const [settings, setSettings] = useState({
    maintenance_mode: false,
    min_deposit: 5,
    min_withdraw: 10,
    jazzcash_number: '03000000000',
    easypaisa_number: '03450000000',
    bank_details: 'Habib Bank Limited\nAccount: 123456789\nTitle: EasyPay',
  });

  const showAction = (msg, type = 'success') => {
    setActionMsg({ text: msg, type });
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('*');
    if (data && data.length > 0) {
      const merged = { ...settings };
      data.forEach((row) => {
        merged[row.setting_key] = row.setting_value;
      });
      setSettings(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    const rows = Object.keys(settings).map((key) => ({
      setting_key: key,
      setting_value: settings[key],
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('site_settings').upsert(rows);
    if (error) {
      showAction('Error saving: ' + error.message, 'error');
    } else {
      showAction('✓ Settings saved successfully!');
    }
    setSaving(false);
  };

  const SettingSection = ({ title, children }) => (
    <div className="admin-card" style={{ marginBottom: '20px' }}>
      <div className="admin-card-header">
        <h3 className="admin-card-title">{title}</h3>
      </div>
      <div className="admin-card-body">{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '820px' }}>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Platform Configuration</h1>
          <p className="admin-page-subtitle">
            Manage site-wide settings, payment wallets, and system controls.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`admin-alert admin-alert-${actionMsg.type === 'error' ? 'error' : 'success'}`}
        >
          {actionMsg.text}
        </div>
      )}

      {loading ? (
        <div className="admin-spinner-wrap">
          <div className="admin-spinner" />
        </div>
      ) : (
        <form onSubmit={saveSettings}>
          {/* General Limits */}
          <SettingSection title="Transaction Limits">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
              }}
            >
              <div>
                <label className="admin-label">Minimum Deposit (USD)</label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '11px',
                      color: 'var(--amuted)',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    $
                  </span>
                  <input
                    className="admin-input"
                    type="number"
                    step="1"
                    style={{ paddingLeft: '28px' }}
                    value={settings.min_deposit}
                    onChange={(e) =>
                      handleChange('min_deposit', Number(e.target.value))
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="admin-label">Minimum Withdrawal (USD)</label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '11px',
                      color: 'var(--amuted)',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    $
                  </span>
                  <input
                    className="admin-input"
                    type="number"
                    step="1"
                    style={{ paddingLeft: '28px' }}
                    value={settings.min_withdraw}
                    onChange={(e) =>
                      handleChange('min_withdraw', Number(e.target.value))
                    }
                    required
                  />
                </div>
              </div>
            </div>
          </SettingSection>

          {/* Payment Wallets */}
          <SettingSection title="Payment Wallets & Details">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div>
                <label className="admin-label">JazzCash Number</label>
                <input
                  className="admin-input"
                  type="text"
                  value={settings.jazzcash_number}
                  onChange={(e) =>
                    handleChange('jazzcash_number', e.target.value)
                  }
                />
              </div>
              <div>
                <label className="admin-label">Easypaisa Number</label>
                <input
                  className="admin-input"
                  type="text"
                  value={settings.easypaisa_number}
                  onChange={(e) =>
                    handleChange('easypaisa_number', e.target.value)
                  }
                />
              </div>
            </div>
            <div>
              <label className="admin-label">Bank Account Details</label>
              <textarea
                className="admin-input"
                rows={4}
                value={settings.bank_details}
                onChange={(e) => handleChange('bank_details', e.target.value)}
                style={{ resize: 'vertical', lineHeight: '1.6' }}
              />
            </div>
          </SettingSection>

          {/* System Control */}
          <SettingSection title="System Control">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Toggle Switch */}
              <div
                style={{
                  width: '52px',
                  height: '28px',
                  background: settings.maintenance_mode
                    ? 'var(--ared)'
                    : 'var(--as2)',
                  borderRadius: '20px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: '0.3s',
                  border: '1px solid var(--aborder2)',
                  flexShrink: 0,
                }}
                onClick={() =>
                  handleChange('maintenance_mode', !settings.maintenance_mode)
                }
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    background: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '3px',
                    left: settings.maintenance_mode ? '28px' : '3px',
                    transition: '0.3s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: settings.maintenance_mode
                      ? 'var(--ared)'
                      : 'var(--atext)',
                  }}
                >
                  Maintenance Mode{' '}
                  {settings.maintenance_mode ? '— ACTIVE' : '— Off'}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--amuted)',
                    marginTop: '2px',
                  }}
                >
                  When enabled, users cannot login or make investments.
                </div>
              </div>
            </div>
          </SettingSection>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '8px',
            }}
          >
            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn-primary"
              style={{ minWidth: '180px', justifyContent: 'center' }}
            >
              {saving ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff',
                      borderRadius: '50%',
                      animation: 'admin-spin 0.7s linear infinite',
                    }}
                  />
                  Saving…
                </>
              ) : (
                'Save All Settings'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
