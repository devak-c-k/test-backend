import { Redis } from '@upstash/redis';

// Initialize Redis client assuming env vars KV_REST_API_URL and KV_REST_API_TOKEN are set
// or just use Redis.fromEnv() if the names match standard Upstash ones.
// The .env has KV_REST_API_URL and KV_REST_API_TOKEN.
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const MAX_REQUESTS_PER_MINUTE = 3;
const KEYS: string[] = [];

// Load keys 1-10
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GOOGLE_API_KEY${i}`];
  if (key) {
    KEYS.push(key);
  }
}

export class GeminiKeyManager {
  /**
   * Retrieves an available Gemini API key ensuring rate limits are respected.
   * Uses Round-Robin strategy with Redis to track usage limits.
   */
  static async getAvailableKey(): Promise<string> {
    if (KEYS.length === 0) {
      throw new Error('No Google API keys configured.');
    }

    const now = new Date();
    // Unique timestamp for the current minute to track rate limits window
    const currentMinute = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}:${now.getHours()}:${now.getMinutes()}`;

    // Improve Round-Robin: get a global counter to determine starting key offset
    // This ensures we distribute load even if new instances are spun up
    const globalCounter = await redis.incr('gemini:global_request_counter');
    const startIndex = globalCounter % KEYS.length;

    for (let i = 0; i < KEYS.length; i++) {
        const index = (startIndex + i) % KEYS.length;
        const key = KEYS[index];
        const keyUsageKey = `gemini:usage:${index}:${currentMinute}`;

        // Check current usage for this key
        // We use incr which returns the new value. 
        // If it's the first time, it starts at 1.
        const currentUsage = await redis.incr(keyUsageKey);

        if (currentUsage === 1) {
            // Set expiry for this key to auto-clean up after 2 minutes (just to be safe)
            await redis.expire(keyUsageKey, 120);
        }

        if (currentUsage <= MAX_REQUESTS_PER_MINUTE) {
            console.log(`Using Gemini Key Index: ${index + 1} (Usage: ${currentUsage}/${MAX_REQUESTS_PER_MINUTE})`);
            return key;
        } else {
            // If limit exceeded, we just continue to the next key
            // Ideally we should decrement the counter if we are NOT using it, 
            // BUT "checking" and "booking" is a race condition. 
            // Since we already INCR'd, we "booked" a slot. 
            // If we don't use it, we should theoretically decr, 
            // but since we are skipping it because it's full, it's fine.
            // Wait, if we are skipping because it's full (currentUsage > Max), 
            // then we didn't "consume" a valid slot, we just saw it was full.
            // The INCR operation persists. 
            // If currentUsage > Max, we effectively fail this key.
            // Loop continues.
            console.log(`Skipping Gemini Key Index: ${index + 1} (Usage limit reached)`);
        }
    }

    throw new Error('All Gemini API keys are currently rate limited. Please try again later.');
  }
}
