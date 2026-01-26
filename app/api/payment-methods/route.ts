import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/payment-methods
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payment_methods: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
