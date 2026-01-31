import { NextResponse } from 'next/server';
import { createConsentRequest } from '@/lib/setu';
import { createClient } from '@supabase/supabase-js';

// Lazy init Supabase
const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase credentials missing');
    return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, mobileNumber } = body; // Passed from App (Clerk ID and User Mobile)
    
    if (!userId || !mobileNumber) {
        return NextResponse.json({ error: 'Missing userId or mobileNumber' }, { status: 400 });
    }

    console.log(`[Setu API] Initiating consent for user: ${userId}`);

    // Call Setu Library
    // Note: We might want to look up the DB ID if 'userId' is the Clerk ID
    // For now assume passed userId is valid or mapped
    
    // Create Consent
    const consent = await createConsentRequest({ 
        userId, 
        mobileNumber 
    });

    // Save initial status to DB
    const supabase = getSupabase();
    await supabase.from('bank_consents').insert({
        user_id: userId, // Ensure this matches your UUID format in DB
        setu_consent_id: consent.id,
        status: consent.status,
        expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
    });

    return NextResponse.json({ 
        success: true, 
        url: consent.url,
        id: consent.id 
    });

  } catch (error: any) {
    console.error('[Setu API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
