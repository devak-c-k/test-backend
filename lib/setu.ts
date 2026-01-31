import { createClient } from '@supabase/supabase-js';

// Environment variables
const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID;
const SETU_CLIENT_SECRET = process.env.SETU_CLIENT_SECRET;
const SETU_BASE_URL = process.env.SETU_ENV === 'production' 
  ? 'https://fiu-api.setu.co' 
  : 'https://fiu-sandbox.setu.co';

const PRODUCT_INSTANCE_ID = process.env.SETU_PRODUCT_INSTANCE_ID;

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
 * Generate Setu API Headers (Auth)
 */
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'x-client-id': SETU_CLIENT_ID!,
    'x-client-secret': SETU_CLIENT_SECRET!,
    'x-product-instance-id': PRODUCT_INSTANCE_ID!
  };
};

/**
 * 1. Create Consent Request
 */
export async function createConsentRequest({ userId, mobileNumber }: CreateConsentParams): Promise<ConsentResponse> {
  const endpoint = `${SETU_BASE_URL}/consents`;
  
  const payload = {
    detail: {
      consentStart: new Date().toISOString(),
      consentExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // 1 Year
      ConsentMode: "STORE",
      fetchType: "PERIODIC",
      consentTypes: ["TRANSACTIONS", "PROFILE", "SUMMARY"],
      fiTypes: ["DEPOSIT"],
      DataLife: {
        unit: "YEAR",
        value: 1
      },
      Frequency: {
        value: 30,
        unit: "DAY"
      },
      DataFilter: [
        {
          type: "TRANSACTIONAMOUNT",
          value: "100",
          operator: ">="
        }
      ]
    },
    context: [
      { key: "accounttype", value: "SAVINGS" }
    ],
    // Setu requires HTTPS redirect URL. We point to our backend, which redirects to the app.
    redirectUrl: "https://test-backend-theta-one.vercel.app/api/setu/frontend-callback",
    Customer: {
      id: userId // Our DB User ID
    }
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("Setu Consent Error:", JSON.stringify(data));
      throw new Error(data.message || "Failed to create consent");
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
 * 2. Get Consent Status
 */
export async function getConsentStatus(consentId: string) {
  const endpoint = `${SETU_BASE_URL}/consents/${consentId}`;
  
  const res = await fetch(endpoint, { headers: getHeaders() });
  return res.json();
}

/**
 * 3. Create Data Session (After Consent Active)
 */
export async function createDataSession(consentId: string, fromDate: string, toDate: string) {
  const endpoint = `${SETU_BASE_URL}/sessions`;
  
  const payload = {
    consentId,
    DataRange: {
      from: fromDate, // ISO Date
      to: toDate
    },
    format: "json"
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  
  return res.json();
}

/**
 * 4. Fetch FI Data (After Session Ready)
 */
export async function fetchFIData(sessionId: string) {
  const endpoint = `${SETU_BASE_URL}/sessions/${sessionId}`;
  const res = await fetch(endpoint, { headers: getHeaders() });
  return res.json();
}
