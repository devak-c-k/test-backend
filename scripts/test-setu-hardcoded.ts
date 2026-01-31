// STEP 1: Get OAUTH Token FIRST
async function getSetuToken() {
    const clientID = '18beef1c-d476-4fd5-b141-0e4fcd5c3666';
    const secret = '5KqiTAyM8dZ6jGxH07NSwgmTdvind6pr';
    
    const tokenRes = await fetch('https://orgservice-prod.setu.co/v1/users/login', {
        method: 'POST',
        headers: {
            'client': 'bridge',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            clientID: clientID,
            grant_type: 'client_credentials',
            secret: secret
        })
    });
    
    const tokenData = await tokenRes.json();
    console.log('✅ TOKEN:', tokenData.access_token);
    return tokenData.access_token;
}

// STEP 2: Create Consent with Bearer Token
async function createConsent() {
    const token = await getSetuToken();
    
    const res = await fetch('https://fiu-sandbox.setu.co/v2/consents', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-product-instance-id': 'd50e223b-3c6a-49ff-aa73-1081c1711d2f'
        },
        body: JSON.stringify({
            vua: "9047021100",
            consentDuration: { unit: "MONTH", value: "4" },
            dataRange: {
                from: "2025-01-01T00:00:00Z",
                to: "2026-01-31T00:00:00Z"
            }
        })
    });
    
    const data = await res.json();
    console.log('✅ CONSENT:', data.url || data);
}

createConsent();
