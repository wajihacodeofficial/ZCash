import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/cron/process-demo
// This endpoint is meant to be called by a cron job (e.g. Vercel Cron or corn-job.org)
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

    // Call the newly created atomic RPC function to process all fully matured demo investments
    // Passing no arguments or NULL will process investments for EVERY user.
    const { data, error } = await supabaseAdmin.rpc('process_demo_investments');

    if (error) {
      console.error('Process Demo Invest Backend Error:', error);
      throw error;
    }

    // data returns an array (or single row) of the returned fields from the RPG
    // e.g. [{ processed_count: X, credited_amount: Y }]
    const result = (Array.isArray(data) && data.length > 0) ? data[0] : { processed_count: 0, credited_amount: 0 };
    
    return NextResponse.json({ 
      success: true, 
      processed: parseInt(result.processed_count || 0, 10),
      credited: parseFloat(result.credited_amount || 0)
    });

  } catch (error) {
    console.error('Process Demo Cron Error:', error);
    return NextResponse.json({ error: 'Internal server error processing demo investments' }, { status: 500 });
  }
}
