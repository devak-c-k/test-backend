const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// Fake token - format must be valid for isExpoPushToken
const token = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

const colorsToTest = [
    '#7C3AED', // Original Uppercase
    '#7c3aed', // Lowercase
    '#FFFFFF', // White
    '#000000', // Black
    'blue',    // Invalid
    '#123',    // Short (Invalid?)
];

async function test() {
    console.log("Starting reproduction test...");

    for (const color of colorsToTest) {
        const messages = [{
            to: token,
            title: 'Test',
            body: 'Test body',
            color: color,
        }];

        console.log(`Testing color: "${color}"`);
        try {
            // We expect this to fail with a network error probably (invalid token/network),
            // OR a validation error if the color is invalid.
            await expo.sendPushNotificationsAsync(messages);
            console.log(`  -> SUCCESS (No validation error) for ${color}`);
        } catch (error) {
            if (error.code === 'VALIDATION_ERROR' || error.message.includes('Must be a valid hex color')) {
                console.error(`  -> VALIDATION ERROR for ${color}: ${error.message}`);
            } else {
                console.log(`  -> Other Error (likely network/token) which means VALIDATION PASSED for ${color}. Error: ${error.code || error.message}`);
            }
        }
    }
}

test().catch(console.error);
