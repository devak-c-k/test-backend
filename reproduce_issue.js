const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const messages = [
    {
        to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        sound: 'default',
        title: 'Test',
        body: 'Test body',
        color: '#7C3AED', // The suspicious color
    }
];

try {
    // We don't need to actually send it, just constructing logic inside SDK usually validates?
    // Actually Expo.chunkPushNotifications does validation?
    // sendPushNotificationsAsync does validation.

    // Note: We need to mock the implementation or just see if the library throws immediately on validation before network.
    // The error "Must be a valid hex color" suggests it's a synchronous validation error.

    // Let's call the private validation method if accessible or just try to send (it will fail network but pass validation if valid)
    // However, SDK might validate before fetch.

    // The error stack trace in the user prompt:
    // at async POST (app\api\webhooks\reminder\route.ts:58:9)
    // implies it failed at await expo.sendPushNotificationsAsync

    console.log("Testing color: #7C3AED");

    // Create a chunk to see if validation happens during chunking (which is what usually happens or what users usually use)
    // But code uses sendPushNotificationsAsync directly.

    // Let's rely on the fact that sendPushNotificationsAsync calls chunking internally or validates.

    expo.sendPushNotificationsAsync(messages)
        .then(tickets => console.log("Tickets:", tickets))
        .catch(error => {
            console.error("Caught error:", error);
        });

} catch (error) {
    console.error("Sync error:", error);
}
