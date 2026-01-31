import { createClient } from '@supabase/supabase-js';

// Environment variables
const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID;
const SETU_CLIENT_SECRET = process.env.SETU_CLIENT_SECRET;
const PRODUCT_INSTANCE_ID = process.env.SETU_PRODUCT_INSTANCE_ID;

const SETU_AUTH_URL = 'https://orgservice-prod.setu.co/v1/users/login';
const SETU_BASE_URL = process.env.SETU_ENV === 'production' 
  ? 'https://fiu-api.setu.co/v2' 
  : 'https://fiu-sandbox.setu.co/v2';

// Types
interface CreateConsentParams {
  userId: string;
  mobileNumber: string;
}

interface ConsentResponse {
  id: string;
  url: string;
  status: string;
}

/**
 * 1. Get Access Token (OAuth Client Credentials)
 */
async function getAccessToken() {
  if (!SETU_CLIENT_ID || !SETU_CLIENT_SECRET) {
      throw new Error("Missing SETU_CLIENT_ID or SETU_CLIENT_SECRET");
  }

  try {
      const res = await fetch(SETU_AUTH_URL, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'client': 'bridge' // Required custom header for Setu
          },
          body: JSON.stringify({
              clientID: SETU_CLIENT_ID,
              secret: SETU_CLIENT_SECRET,
              grant_type: 'client_credentials'
          })
      });

      const data = await res.json();
      
      if (!res.ok || !data.access_token) {
          console.error("Setu Auth Failed:", JSON.stringify(data));
          throw new Error("Failed to authenticate with Setu");
      }

      return data.access_token;
  } catch (error) {
      console.error("Setu Auth Error:", error);
      throw error;
  }
}

/**
 * Helper to get Authenticated Headers
 */
const getHeaders = async () => {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-product-instance-id': PRODUCT_INSTANCE_ID!
  };
};

/**
 * 2. Create Consent Request (V2)
 */
export async function createConsentRequest({ userId, mobileNumber }: CreateConsentParams): Promise<ConsentResponse> {
  const endpoint = `${SETU_BASE_URL}/consents`;
  
  // V2 Payload Structure
  const payload = {
    vua: mobileNumber, // "9876543210"
    consentDuration: {
        unit: "YEAR", // or MONTH
        value: "1"
    },
    dataRange: {
        from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(), // 1 Year back
        to: new Date().toISOString()
    },
    // Optional: Data Life, Frequency etc. can be added if needed based on V2 spec
    // For Sandbox default minimal payload usually works
    
    // Redirect URL is usually configured in the Bridge Dashboard, 
    // or passed if API supports it. V2 might rely on Dashboard config.
    // We'll try passing it if supported, otherwise rely on Dashboard.
    additionalData: {
        redirectUrl: "https://test-backend-theta-one.vercel.app/api/setu/frontend-callback"
    }
  };

  try {
    const headers = await getHeaders();
    console.log(`Creating Consent at ${endpoint} with ProductID: ${PRODUCT_INSTANCE_ID}`);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { error: text }; }

    if (!res.ok) {
      console.error("Setu Consent Error:", JSON.stringify(data));
      throw new Error(data.message || data.errorMsg || "Failed to create consent");
    }

    return {
      id: data.id,
      url: data.url,
      status: data.status
    };

  } catch (error) {
    console.error("Setu API Error:", error);
    throw error;
  }
}

/**
 * 3. Get Consent Status
 */
export async function getConsentStatus(consentId: string) {
  const endpoint = `${SETU_BASE_URL}/consents/${consentId}`;
  const headers = await getHeaders();
  const res = await fetch(endpoint, { headers });
  return res.json();
}

/**
 * 4. Create Data Session
 */
export async function createDataSession(consentId: string, fromDate: string, toDate: string) {
  const endpoint = `${SETU_BASE_URL}/sessions`;
  const headers = await getHeaders();
  
  const payload = {
    consentId,
    dataRange: {
      from: fromDate,
      to: toDate
    },
    format: "json"
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  
  return res.json();
}

/**
 * 5. Fetch FI Data
 */
export async function fetchFIData(sessionId: string) {
  const endpoint = `${SETU_BASE_URL}/sessions/${sessionId}`;
  const headers = await getHeaders();
  const res = await fetch(endpoint, { headers });
  return res.json();
}
