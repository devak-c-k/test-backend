import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

// This webhook is called by QStash when a reminder is due
// POST /api/webhooks/reminder
export async function POST(request: Request) {
  try {
    // Verify QStash signature in production
    // const signature = request.headers.get('upstash-signature');
    // TODO: Verify signature with QSTASH_CURRENT_SIGNING_KEY

    const body = await request.json();
    console.log('REMINDER WEBHOOK HIT:', JSON.stringify(body, null, 2));
    const { reminder_id, debt_id, user_id } = body;

    if (!reminder_id || !debt_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the debt details
    const { data: debt, error: debtError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', debt_id)
      .single();

    if (debtError || !debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    // Get user details for notification
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      console.warn(`User not found for reminder notification. ReminderId=${reminder_id}, UserId=${user_id}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Mark reminder as sent
    await supabase
      .from('reminders')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', reminder_id);

    // Send Push Notification
    if (user.push_token && Expo.isExpoPushToken(user.push_token)) {
      try {
        await expo.sendPushNotificationsAsync([
          {
            to: user.push_token,
            sound: 'default', // Plays default listing sound
            title: `🔔 Reminder: ${debt.name}`,
            body: `${debt.direction === 'owed' ? '🔴 You owe' : '🟢 You are owed'} ₹${debt.amount}`,
            channelId: 'default', // Important for Android 8+
            priority: 'high', // For Android

            data: {
              debt_id,
              debt_type: debt.debt_type,
              amount: debt.amount,
            },
          } as any,
        ]);
        console.log('Push notification sent to:', user.push_token);
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    } else {
        console.log('No valid push token for user:', user.id);
    }

    // If recurring, schedule the next reminder
    if (debt.is_recurring && debt.reminder_enabled) {
      const nextScheduledFor = calculateNextReminderDate(debt);
      
      if (nextScheduledFor) {
        // Create next reminder (this will also schedule with QStash)
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debt_id,
            user_id,
            scheduled_for: nextScheduledFor.toISOString(),
          }),
        });
      }
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Reminder processed and notification sent',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateNextReminderDate(debt: any): Date | null {
  const now = new Date();
  const reminderTime = debt.reminder_time || '09:00:00';
  const [hours, minutes] = reminderTime.split(':').map(Number);

  switch (debt.reminder_schedule) {
    case 'daily': {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(hours, minutes, 0, 0);
      return next;
    }
    case 'weekly': {
      const next = new Date(now);
      const daysUntilTarget = (7 + (debt.reminder_day_of_week || 1) - now.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilTarget);
      next.setHours(hours, minutes, 0, 0);
      return next;
    }
    case 'monthly': {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(debt.reminder_day_of_month || 1, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      next.setHours(hours, minutes, 0, 0);
      return next;
    }
    case 'once':
      return null;
    default:
      return null;
  }
}
