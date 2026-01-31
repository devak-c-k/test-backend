import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize lazily to avoid build-time errors if env vars are missing
const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    console.log('[Setu Webhook] Received:', JSON.stringify(body, null, 2));

    // Valid webhook structure usually has 'type' or similar
    // Setu FIU v2 structure often differs, we check key fields
    
    // 1. Consent Notification
    if (body.type === 'CONSENT_STATUS_UPDATE') {
      const { consentId, status, user } = body.data;
      console.log(`[Setu] Consent ${consentId} is now ${status}`);
      
      // Update DB
      // await supabase.from('bank_consents').update({ status }).eq('setu_consent_id', consentId);
      
      // If ACTIVE, you might want to trigger an initial fetch
      if (status === 'ACTIVE') {
         // triggerInitialFetch(consentId);
      }
    }

    // 2. FI Data Notification (Data Ready)
    else if (body.type === 'FI_NOTIFICATION') {
       const { sessionId, status } = body.data;
       console.log(`[Setu] Session ${sessionId} status: ${status}`);
       
       if (status === 'READY') {
         // Logic to call fetchFIData(sessionId)
         // Parse transactions
         // Notify User
       }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('[Setu Webhook] Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
