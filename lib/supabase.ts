import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role key
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database types
export interface User {
  id: string;
  clerk_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string;
  payment_method_id: string;
  amount: number;
  note: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithDetails extends Expense {
  category: Category;
  payment_method: PaymentMethod;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  amount: number;
  debt_type: 'rent' | 'loan' | 'subscription' | 'emi' | 'other';
  direction: 'owed' | 'receivable';
  due_date: string | null;
  is_recurring: boolean;
  reminder_enabled: boolean;
  reminder_schedule: 'daily' | 'weekly' | 'monthly' | 'custom' | 'once' | null;
  reminder_day_of_week: number | null;
  reminder_day_of_month: number | null;
  reminder_time: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  debt_id: string;
  user_id: string;
  qstash_message_id: string | null;
  scheduled_for: string;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}
