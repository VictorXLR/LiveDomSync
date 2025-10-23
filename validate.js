#!/usr/bin/env node

/**
 * Validation script for LiveDOMSync
 * Tests WebSocket connection, state sync, and file watching
 */

import WebSocket from 'ws';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const WS_URL = 'ws://localhost:3001';
const STATE_FILE = 'src/.live-dom/test-validation.json';

console.log('🧪 LiveDOMSync Validation Test\n');

async function runTests() {
  let ws;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: WebSocket Connection
    console.log('Test 1: WebSocket Connection...');
    ws = new WebSocket(WS_URL);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ WebSocket connected successfully\n');
        testsPassed++;
        resolve();
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Test 2: Request State
    console.log('Test 2: Request Initial State...');
    let stateReceived = false;

    ws.send(JSON.stringify({
      type: 'REQUEST_STATE',
      sourceFile: 'test-validation.json'
    }));

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('No response received'));
      }, 3000);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'INITIAL_STATE') {
          clearTimeout(timeout);
          stateReceived = true;
          console.log('✅ Initial state request handled');
          console.log(`   State exists: ${message.state !== null}\n`);
          testsPassed++;
          resolve();
        }
      });
    });

    // Test 3: Sync State
    console.log('Test 3: Sync State to File...');
    const testState = {
      elements: [
        {
          selector: '[data-live-id="test-1"]',
          tagName: 'div',
          attributes: { class: 'test-element' },
          styles: { color: 'red' },
          textContent: 'Validation Test Element'
        }
      ],
      timestamp: Date.now(),
      url: '/test.html'
    };

    ws.send(JSON.stringify({
      type: 'SYNC_STATE',
      sourceFile: 'test-validation.json',
      state: testState
    }));

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync not confirmed'));
      }, 3000);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'SYNC_CONFIRMED') {
          clearTimeout(timeout);
          console.log('✅ State synced successfully');
          console.log(`   File: ${message.file}\n`);
          testsPassed++;
          resolve();
        }
      });
    });

    // Test 4: Verify File Written
    console.log('Test 4: Verify File Written to Disk...');
    if (existsSync(STATE_FILE)) {
      const content = await readFile(STATE_FILE, 'utf-8');
      const savedState = JSON.parse(content);
      
      if (savedState.elements && savedState.elements.length === 1) {
        console.log('✅ File written correctly');
        console.log(`   Elements: ${savedState.elements.length}`);
        console.log(`   Synced at: ${savedState.syncedAt}\n`);
        testsPassed++;
      } else {
        throw new Error('File content invalid');
      }
    } else {
      throw new Error('File not found');
    }

    // Test 5: File Change Detection
    console.log('Test 5: External File Change Detection...');
    const modifiedState = {
      ...testState,
      elements: [
        ...testState.elements,
        {
          selector: '[data-live-id="test-2"]',
          tagName: 'span',
          textContent: 'Second Element'
        }
      ]
    };

    // Listen for update notification
    const updatePromise = new Promise((resolve, reject) => {
      // Increased timeout to account for server's reload debounce (default 3000ms)
      const timeout = setTimeout(() => {
        reject(new Error('No update notification received'));
      }, 5000);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'STATE_UPDATE') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    // Modify file externally
    setTimeout(async () => {
      await writeFile(
        STATE_FILE,
        JSON.stringify({ ...modifiedState, syncedAt: new Date().toISOString() }, null, 2),
        'utf-8'
      );
    }, 500);

    await updatePromise;
    console.log('✅ External file change detected');
    console.log('   Server correctly notified of external edit\n');
    testsPassed++;

    // Summary
    console.log('━'.repeat(50));
    console.log(`\n🎉 Validation Complete!`);
    console.log(`   ✅ Passed: ${testsPassed}`);
    console.log(`   ❌ Failed: ${testsFailed}`);
    console.log(`\n✨ LiveDOMSync is working correctly!`);
    console.log(`\nNext steps:`);
    console.log(`   1. Start the server: npm run server`);
    console.log(`   2. Serve test.html with any HTTP server`);
    console.log(`   3. Open http://localhost:8000/test.html`);
    console.log(`   4. Start editing!\n`);

  } catch (err) {
    testsFailed++;
    console.error(`❌ Test failed: ${err.message}\n`);
    
    console.log('━'.repeat(50));
    console.log(`\n⚠️  Validation Failed`);
    console.log(`   ✅ Passed: ${testsPassed}`);
    console.log(`   ❌ Failed: ${testsFailed}`);
    console.log(`\nTroubleshooting:`);
    console.log(`   • Is the server running? (npm run server)`);
    console.log(`   • Check server logs for errors`);
    console.log(`   • Ensure port 3001 is not in use\n`);
    
    process.exit(1);
  } finally {
    if (ws) {
      ws.close();
    }
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
