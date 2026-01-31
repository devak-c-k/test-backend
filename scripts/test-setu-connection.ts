require('dotenv').config(); // Load env from .env by default

async function testSetu() {
    const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID;
    const SETU_CLIENT_SECRET = process.env.SETU_CLIENT_SECRET;
    const PRODUCT_INSTANCE_ID = process.env.SETU_PRODUCT_INSTANCE_ID;
    
    // Explicitly use the Sandbox URL we believe is correct
    const BASE_URL = 'https://fiu-sandbox.setu.co';
    const ENDPOINT = `${BASE_URL}/consents`;

    console.log('Testing Setu Connection...');
    console.log(`URL: ${ENDPOINT}`);
    console.log(`Client ID: ${SETU_CLIENT_ID ? 'Present' : 'MISSING'}`);
    console.log(`Product ID: ${PRODUCT_INSTANCE_ID ? 'Present' : 'MISSING'}`);

    if (!SETU_CLIENT_ID || !SETU_CLIENT_SECRET || !PRODUCT_INSTANCE_ID) {
        console.error('❌ Missing Environment Variables. Check .env.local');
        return;
    }

    const payload = {
        detail: {
            consentStart: new Date().toISOString(),
            consentExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            ConsentMode: "STORE",
            fetchType: "PERIODIC",
            consentTypes: ["TRANSACTIONS", "PROFILE", "SUMMARY"],
            fiTypes: ["DEPOSIT"],
            DataLife: { unit: "YEAR", value: 1 },
            Frequency: { value: 30, unit: "DAY" },
            DataFilter: [{ type: "TRANSACTIONAMOUNT", value: "100", operator: ">=" }]
        },
        context: [{ key: "accounttype", value: "SAVINGS" }],
        redirectUrl: "https://test-backend-theta-one.vercel.app/api/setu/frontend-callback",
        Customer: { id: "test-user-123" }
    };

    try {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': SETU_CLIENT_ID,
                'x-client-secret': SETU_CLIENT_SECRET,
                'x-product-instance-id': PRODUCT_INSTANCE_ID
            },
            body: JSON.stringify(payload)
        });

        console.log(`\nStatus: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log('Response Body:');
        console.log(text.substring(0, 1000)); // Print first 1000 chars

        if (text.trim().startsWith('<')) {
            console.error('\n❌ RECEIVED HTML instead of JSON. Likely 404 or Auth Error page.');
        } else {
            console.log('\n✅ JSON Response (likely success or API error):');
            console.log(JSON.parse(text));
        }

    } catch (e) {
        console.error('\n❌ Request Failed:', e);
    }
}

testSetu();
