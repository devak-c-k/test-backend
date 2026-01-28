import { GeminiKeyManager } from '../lib/gemini-manager';
import { Redis } from '@upstash/redis';

// Mock Redis to avoid hitting production limits during test if possible, 
// OR just use the real one and observe logs.
// For this test, we will run it and see the console logs from the manager.

async function testRoundRobin() {
  console.log("Starting Round-Robin Test (simulating 15 requests)...");

  for (let i = 0; i < 15; i++) {
    try {
      console.log(`\nRequest #${i + 1}:`);
      const key = await GeminiKeyManager.getAvailableKey();
      console.log(`Success! Got key ending in ...${key.slice(-4)}`);
    } catch (error: any) {
      console.error(`Failed: ${error.message}`);
    }
    // Small delay to prevent race conditions in test output log
    await new Promise(r => setTimeout(r, 100));
  }
}

testRoundRobin().catch(console.error);
