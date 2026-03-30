'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Check } from 'lucide-react';
import TabHeader from '../TabHeader';

export default function InvestTab({ activatePlan, userProfile, setNotifOpen, unreadCount, onAvatarClick, showInternalHeader = true }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase.from('plans').select('*').eq('active', true).order('price_usd', { ascending: true });
      if (data) setPlans(data);
      setLoading(false);
    };
    fetchPlans();
  }, [supabase]);

  return (
    <section style={{ paddingBottom: '100px', background: 'var(--bg-light)', minHeight: '100%' }}>
      {showInternalHeader && (
          <TabHeader title="INVESTMENT" userProfile={userProfile} setNotifOpen={setNotifOpen} unreadCount={unreadCount} onAvatarClick={onAvatarClick} />
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ color: 'var(--text-dark)', fontSize: '22px', fontWeight: '800', marginBottom: '2px' }}>Choose Your Plan</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Select an investment plan to start earning</p>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Loading plans...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {plans.map((plan) => {
              const pkr = plan.price_usd * 280;
              const daily = plan.price_usd * (plan.daily_roi_percent / 100);
              const roi = plan.daily_roi_percent * plan.duration_days;

              const features = [
                'Daily returns',
                plan.price_usd >= 10 ? 'VIP support'    : 'Basic support',
                plan.price_usd >= 30 ? 'Team bonus'     : null,
                plan.price_usd >= 50 ? 'Extra rewards'  : null,
                plan.price_usd >= 50 ? 'Exclusive access': null,
              ].filter(Boolean);

              return (
                <div key={plan.id} style={{ background: 'var(--bg-card)', borderRadius: '20px', border: plan.price_usd === 10 ? '1.5px solid rgba(243,156,18,0.4)' : '1px solid var(--border)', padding: '20px', boxShadow: 'var(--shadow)' }}>
                  {/* Name + badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ color: 'var(--text-dark)', fontSize: '19px', fontWeight: '800', margin: 0 }}>{plan.name}</h3>
                    {plan.price_usd === 10 && (
                      <span style={{ background: 'var(--blue-text)', color: '#000', fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px' }}>⭐ POPULAR</span>
                    )}
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                    <span style={{ color: 'var(--blue-text)', fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>${plan.price_usd}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>/ Rs. {pkr.toLocaleString()}</span>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { label: 'Daily',    value: `$${daily.toFixed(2)}`, color: 'var(--green-text)' },
                      { label: 'Duration', value: `${plan.duration_days} Days`, color: 'var(--text-dark)' },
                      { label: 'ROI',      value: `${roi}%`, color: 'var(--blue-text)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'var(--bg-light)', padding: '12px 8px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>{label}</div>
                        <div style={{ color, fontSize: '14px', fontWeight: '800' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                    {features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Check size={15} color="var(--green-text)" strokeWidth={3} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => activatePlan(plan)}
                    style={{ width: '100%', padding: '15px', borderRadius: '14px', border: 'none', background: 'linear-gradient(90deg, #F39C12, #e67e22)', color: '#000', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(243,156,18,0.25)' }}
                  >
                    Activate Plan
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
