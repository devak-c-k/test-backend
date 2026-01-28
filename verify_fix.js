const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// Use a fake but valid-shaped token
// Note: This token is obviously invalid for delivery, but we want to see if we get past schema validation.
// A real token would be better, but we don't have one.
// However, Expo API validates syntax first.
const messages = [
    {
        to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        sound: 'default',
        title: 'Test',
        body: 'Test body',
        color: '#7c3aed', // Lowercase hex
    }
];

async function test() {
    try {
        console.log("Testing color: #7c3aed");
        const tickets = await expo.sendPushNotificationsAsync(messages);
        console.log("Tickets:", tickets);
    } catch (error) {
        // If we get here, check if it is the color error
        console.error("Caught error:", error);
    }
}

test();
