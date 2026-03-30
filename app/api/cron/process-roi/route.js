import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup this endpoint to be called periodically (e.g., daily cron job via Vercel or manual interval)
// Ideally protect it via a secure token. For demo, we leave it open or check a headers key.

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    // Optional: Protect cron route using a CRON_SECRET from your .env.local
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Fetch all active user_plans with details about the plan to get daily_roi_percent
    // and check if end_date > now()
    const { data: userPlans, error: plansError } = await supabaseAdmin
      .from('user_plans')
      .select('id, user_id, amount_invested, total_earned, plans(id, daily_roi_percent)')
      .eq('active', true)
      .gt('end_date', new Date().toISOString());

    if (plansError) throw plansError;

    let processedCount = 0;
    
    // 2. Loop through plans to calculate daily returns
    for (const userPlan of userPlans) {
        if (!userPlan.plans) continue;
        
        const dailyRoiPercent = userPlan.plans.daily_roi_percent;
        const dailyProfit = (userPlan.amount_invested * dailyRoiPercent) / 100.0;
        
        // Update user_plan total_earned
        const { error: updateError } = await supabaseAdmin
          .from('user_plans')
          .update({
             total_earned: userPlan.total_earned + dailyProfit
          })
          .eq('id', userPlan.id);

        if (updateError) {
          console.error(`Failed to update plan ${userPlan.id}`, updateError);
          continue;
        }

        // 4. Update profile balance (Credit user wallet)
        const { error: balanceError } = await supabaseAdmin.rpc('increment_profile_balance', { 
            user_id: userPlan.user_id, 
            amount: dailyProfit 
        });

        if (balanceError) {
           console.error(`Failed to credit balance for ${userPlan.user_id}`, balanceError);
        }

        // Insert a transaction record for history tracking
        const { error: txError } = await supabaseAdmin
          .from('transactions')
          .insert({
              user_id: userPlan.user_id,
              type: 'roi_earning',
              amount: dailyProfit,
              status: 'completed',
              notes: `Daily ROI from plan ${userPlan.plans.id}`
          });
          
        if (txError) {
           console.error(`Failed to log transaction for ${userPlan.user_id}`, txError);
        }

        processedCount++;
    }

    return NextResponse.json({ success: true, processed: processedCount });

  } catch (error) {
    console.error('Process ROI Error:', error);
    return NextResponse.json({ error: 'Internal server error processing ROI' }, { status: 500 });
  }
}
