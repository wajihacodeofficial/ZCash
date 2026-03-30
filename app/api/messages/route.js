import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch messages for the current user, or all messages (admin)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'admin_message' | 'support' | null for all
    const adminView = searchParams.get('adminView') === 'true';

    const db = supabaseAdmin();

    let query = db
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, email),
        receiver:profiles!messages_receiver_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (adminView) {
      // Admin fetches all messages of a given type
      if (type) query = query.eq('type', type);
    } else if (userId) {
      // User fetches their own notifications (messages sent to them)
      query = query.eq('receiver_id', userId);
      if (type) query = query.eq('type', type);
    }

    const { data, error } = await query.limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ messages: data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a new message
export async function POST(request) {
  try {
    const { sender_id, receiver_id, title, body, type } = await request.json();

    if (!sender_id || !receiver_id || !body) {
      return NextResponse.json({ error: 'sender_id, receiver_id, and body are required' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data, error } = await db.from('messages').insert({
      sender_id,
      receiver_id,
      title: title || 'New Message',
      body,
      type: type || 'admin_message',
      is_read: false,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
