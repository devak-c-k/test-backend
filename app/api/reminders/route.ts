import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// QStash configuration - you'll need to set these in .env
const QSTASH_URL = process.env.QSTASH_URL || 'https://qstash.upstash.io';
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// POST /api/reminders - Create a reminder with QStash scheduling
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { debt_id, user_id, scheduled_for } = body;

    if (!debt_id || !user_id || !scheduled_for) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create reminder in database first
    const { data: reminder, error: dbError } = await supabase
      .from('reminders')
      .insert({
        debt_id,
        user_id,
        scheduled_for,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Schedule with QStash if token is configured
    if (QSTASH_TOKEN) {
      console.log(`[QStash] Scheduling reminder for ${scheduled_for}. Delay: ${Math.max(0, Math.floor((new Date(scheduled_for).getTime() - Date.now()) / 1000))}s`);
      try {
        const scheduledTime = new Date(scheduled_for).getTime();
        const delay = Math.max(0, Math.floor((scheduledTime - Date.now()) / 1000));

        const qstashUrl = `${QSTASH_URL}/v2/publish/${WEBHOOK_URL}/api/webhooks/reminder`;
        console.log(`[QStash] Publishing to: ${qstashUrl}`);

        const qstashResponse = await fetch(qstashUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${QSTASH_TOKEN}`,
            'Content-Type': 'application/json',
            'Upstash-Delay': `${delay}s`,
          },
          body: JSON.stringify({
            reminder_id: reminder.id,
            debt_id,
            user_id,
          }),
        });
        
        console.log(`[QStash] Response status: ${qstashResponse.status}`);

        if (qstashResponse.ok) {
          const qstashData = await qstashResponse.json();
          console.log('[QStash] Success:', JSON.stringify(qstashData));
          
          // Update reminder with QStash message ID
          await supabase
            .from('reminders')
            .update({ qstash_message_id: qstashData.messageId })
            .eq('id', reminder.id);
        } else {
          const errorText = await qstashResponse.text();
          console.error('[QStash] Failed:', errorText);
        }
      } catch (qstashError) {
        console.error('QStash scheduling failed:', qstashError);
        // Continue even if QStash fails - reminder is still in DB
      }
    } else {
      console.warn('[QStash] Token is missing, skipping scheduling');
    }

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/reminders?debt_id=xxx or ?user_id=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const debtId = searchParams.get('debt_id');
  const userId = searchParams.get('user_id');

  if (!debtId && !userId) {
    return NextResponse.json({ error: 'debt_id or user_id is required' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('reminders')
      .select('*, debt:debts(*)')
      .order('scheduled_for', { ascending: true });

    if (debtId) {
      query = query.eq('debt_id', debtId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reminders: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/reminders?id=xxx - Cancel a reminder
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const reminderId = searchParams.get('id');

  if (!reminderId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    // Get the reminder to check for QStash message ID
    const { data: reminder } = await supabase
      .from('reminders')
      .select('qstash_message_id')
      .eq('id', reminderId)
      .single();

    // Cancel in QStash if message ID exists
    if (reminder?.qstash_message_id && QSTASH_TOKEN) {
      try {
        await fetch(`${QSTASH_URL}/v2/messages/${reminder.qstash_message_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${QSTASH_TOKEN}`,
          },
        });
      } catch (qstashError) {
        console.error('QStash cancellation failed:', qstashError);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
