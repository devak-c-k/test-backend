// Run with: npx ts-node scripts/test-setu-auth-variations.ts

async function testAuthVariations() {
    // UPDATED KEYS from User
    const CLIENT_ID = '18beef1c-d476-4fd5-b141-0e4fcd5c3666';
    const CLIENT_SECRET = '5KqiTAyM8dZ6jGxH07NSwgmTdvind6pr';
    const PRODUCT_ID = '6df2c0eb-2218-43a4-ae35-b32ffca9b516';

    console.log('--- TEST 1: Get Token from Account Service ---');
    try {
        // Variation 1: The one from docs/search (clientID, secret)
        // Trying check if 'grant_type' failure is due to value mismatch or missing header?
        console.log('\n--- Attempt 1: clientID, secret, grant_type="client_credentials" ---');
        const res1 = await fetch('https://accountservice.setu.co/v1/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientID: CLIENT_ID,
                secret: CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        console.log(`Status: ${res1.status}`);
        console.log('Body:', await res1.text());

        // Variation 2: OAuth Standard (client_id, client_secret)
        console.log('\n--- Attempt 2: client_id, client_secret, grant_type="client_credentials" ---');
        const res2 = await fetch('https://accountservice.setu.co/v1/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        console.log(`Status: ${res2.status}`);
        console.log('Body:', await res2.text());
        
        // Variation 3: Maybe grant_type is not needed or different?
        // Note: The error was specific to 'grant-type' tag.
        


    } catch (e) {
        console.error('Test 1 Exception:', e);
    }
}

testAuthVariations();
