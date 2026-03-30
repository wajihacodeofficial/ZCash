import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Missing email or token' }, { status: 400 });
    }

    // Initialize Supabase admin client to bypass RLS and manage users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find the user by email using the admin api (iterating through pages to avoid 50 limit)
    let page = 1;
    let targetUser = null;
    let hasMore = true;

    while (hasMore) {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: 100
      });
      
      if (listError) throw listError;
      
      const found = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (found) {
        targetUser = found;
        break;
      }
      
      if (listData.users.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = targetUser;

    const userToken = user.user_metadata?.verification_token;
    const createdAt = user.user_metadata?.verification_token_created_at;
    
    if (!userToken || userToken !== token) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
    }

    if (createdAt) {
      const startTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const secondsDiff = Math.floor((now - startTime) / 1000);
      
      if (secondsDiff > 86400) {
        return NextResponse.json({ error: 'Verification link expired (24h limit). Please register again.' }, { status: 400 });
      }
    }

    // Update user metadata to set is_verified to true and remove token
    // Also set email_confirm: true and email_confirmed_at to mark it verified in Supabase natively
    console.log(`Verifying user ${user.id} (${email}). Current status:`, {
      email_confirmed_at: user.email_confirmed_at,
      is_verified_meta: user.user_metadata?.is_verified
    });

    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          is_verified: true,
          verification_token: null,
          verification_token_created_at: null
        },
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('Update error for user:', user.id, updateError);
      throw updateError;
    }

    console.log(`Successfully updated user ${user.id}. New status:`, {
      email_confirmed_at: updateData.user.email_confirmed_at,
      is_verified_meta: updateData.user.user_metadata?.is_verified
    });
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}
