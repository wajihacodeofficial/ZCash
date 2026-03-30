'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeTab from '../components/tabs/HomeTab';
import InvestTab from '../components/tabs/InvestTab';
import EarnTab from '../components/tabs/EarnTab';
import InviteTab from '../components/tabs/InviteTab';
import ProfileTab from '../components/tabs/ProfileTab';
import MessagesTab from '../components/tabs/MessagesTab';

import PageWrapper from '../components/PageWrapper';
import { createClient } from '../lib/supabase/client';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'home');
  const [balance, setBalance] = useState(0.0);
  const [activePlans, setActivePlans] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const supabase = createClient();

  const refreshData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
      setUserProfile(profile);
      setBalance(Number(profile.balance || 0));
    }
    const { data: plans } = await supabase.from('user_plans').select('*, plans(name, daily_roi_percent)').eq('user_id', user.id).eq('active', true);
    if (plans) setActivePlans(plans);
  };

  useEffect(() => {
    refreshData();
  }, [supabase, router]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['home', 'invest', 'earn', 'invite', 'messages', 'profile'].includes(tabFromUrl)) {

      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const onTabChange = (tabId) => {
    setActiveTab(tabId);
    router.push(`/?tab=${tabId}`, { scroll: false });
  };

  const activatePlan = async (plan) => {
    if (!userProfile) return;
    if (balance < plan.price_usd && plan.price_usd > 0) {
      router.push(`/deposit?planId=${plan.id}&amount=${plan.price_usd}`); return;
    }
    const { error } = await supabase.rpc('buy_plan_from_balance', {
      p_user_id: userProfile.id, p_plan_id: plan.id, p_amount: plan.price_usd, p_duration_days: plan.duration_days
    });
    if (error) { 
      // Replace alert with toast if possible, or just log
      console.error(error.message);
    }
    else {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      refreshData();
    }
  };

  const titles = {
    home: 'DASHBOARD',
    invest: 'INVESTMENT',
    earn: 'DAILY STREAKS',
    invite: 'INVITE & EARN',
    messages: 'SUPPORT CHAT',
    profile: 'MY PROFILE'

  };

  return (
    <PageWrapper 
      title={titles[activeTab]} 
      activeTab={activeTab} 
      onTabChange={onTabChange}
    >
      {/* Success toast */}
      {showNotification && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#22c55e', color: '#000', padding: '10px 22px', borderRadius: '30px', zIndex: 600, fontWeight: '800', fontSize: '13px', whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
          ✓ Plan Activated!
        </div>
      )}

      {activeTab === 'home'    && <HomeTab    balance={balance} activePlans={activePlans} userProfile={userProfile} refreshData={refreshData} showInternalHeader={false} />}
      {activeTab === 'invest'  && <InvestTab  activatePlan={activatePlan} userProfile={userProfile} balance={balance} refreshData={refreshData} showInternalHeader={false} />}
      {activeTab === 'earn'    && <EarnTab    activePlans={activePlans} userProfile={userProfile} refreshData={refreshData} showInternalHeader={false} />}
      {activeTab === 'invite'  && <InviteTab  userProfile={userProfile} refreshData={refreshData} showInternalHeader={false} />}
      {activeTab === 'messages' && <MessagesTab userProfile={userProfile} refreshData={refreshData} />}
      {activeTab === 'profile' && <ProfileTab userProfile={userProfile} refreshData={refreshData} showInternalHeader={false} />}

    </PageWrapper>
  );
}

export default function Dashboard() {
  return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-light)', color: 'var(--text-dark)' }}>Loading...</div>}>
          <DashboardContent />
      </Suspense>
  );
}
