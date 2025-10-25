#!/usr/bin/env node

/**
 * LiveDOMSync Server - WebSocket server for real-time DOM sync
 * 
 * Usage:
 *   node server.js [options]
 *   
 * Options:
 *   --port              WebSocket port (default: 3001)
 *   --dir               Project directory to watch (default: ./src)
 *   --reload-debounce   Delay in ms before reloading on file changes (default: 3000)
 */

import { WebSocketServer } from 'ws';
import { watch } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { HTMLSyncer } from './sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

class LiveDOMSyncServer {
  constructor(options = {}) {
    this.port = options.port || 3001;
    this.projectDir = options.dir || join(process.cwd(), 'src');
    this.stateDir = join(this.projectDir, '.live-dom');
    this.clients = new Set();
    this.fileWatchers = new Map();
    this.lastStates = new Map(); // Track last known state per file
    this.reloadDebounceMs = options.reloadDebounceMs || 3000; // Default 3 seconds
    this.reloadTimers = new Map(); // Track debounce timers per file
    this.syncer = new HTMLSyncer(); // HTML syncer instance
  }

  async start() {
    // Ensure state directory exists
    await this.ensureStateDir();

    // Start WebSocket server
    this.wss = new WebSocketServer({ port: this.port });
    
    this.wss.on('connection', (ws) => {
      console.log('[Server] Client connected');
      this.clients.add(ws);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(ws, message);
        } catch (err) {
          console.error('[Server] Error handling message:', err);
          this.sendError(ws, err.message);
        }
      });

      ws.on('close', () => {
        console.log('[Server] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[Server] WebSocket error:', err);
      });
    });

    console.log(`[Server] LiveDOMSync server running on ws://localhost:${this.port}`);
    console.log(`[Server] Watching project directory: ${this.projectDir}`);
    console.log(`[Server] State files stored in: ${this.stateDir}`);
    console.log(`[Server] Reload debounce: ${this.reloadDebounceMs}ms`);
  }

  async ensureStateDir() {
    if (!existsSync(this.stateDir)) {
      await mkdir(this.stateDir, { recursive: true });
      console.log(`[Server] Created state directory: ${this.stateDir}`);
    }
  }

  async handleClientMessage(ws, message) {
    switch (message.type) {
      case 'REQUEST_STATE':
        await this.handleRequestState(ws, message);
        break;

      case 'SYNC_STATE':
        await this.handleSyncState(ws, message);
        break;

      case 'SYNC_TO_SOURCE':
        await this.handleSyncToSource(ws, message);
        break;

      default:
        console.warn('[Server] Unknown message type:', message.type);
    }
  }

  async handleRequestState(ws, message) {
    const stateFile = this.getStateFilePath(message.sourceFile);
    
    try {
      if (existsSync(stateFile)) {
        const data = await readFile(stateFile, 'utf-8');
        const state = JSON.parse(data);
        
        ws.send(JSON.stringify({
          type: 'INITIAL_STATE',
          state
        }));
        
        console.log(`[Server] Sent initial state from ${stateFile}`);
        
        // Start watching this file for external changes
        this.watchStateFile(stateFile);
      } else {
        ws.send(JSON.stringify({
          type: 'INITIAL_STATE',
          state: null
        }));
        
        console.log(`[Server] No existing state file: ${stateFile}`);
      }
    } catch (err) {
      console.error('[Server] Error loading state:', err);
      this.sendError(ws, `Failed to load state: ${err.message}`);
    }
  }

  async handleSyncState(ws, message) {
    const stateFile = this.getStateFilePath(message.sourceFile);
    
    try {
      // Add metadata
      const stateWithMeta = {
        ...message.state,
        syncedAt: new Date().toISOString(),
        version: 1
      };
      
      // Write to file
      await writeFile(
        stateFile,
        JSON.stringify(stateWithMeta, null, 2),
        'utf-8'
      );
      
      // Update last known state
      this.lastStates.set(stateFile, JSON.stringify(stateWithMeta));
      
      console.log(`[Server] Synced state to ${stateFile}`);
      console.log(`[Server] - ${message.state.elements?.length || 0} elements tracked`);
      
      // Confirm sync
      ws.send(JSON.stringify({
        type: 'SYNC_CONFIRMED',
        file: stateFile,
        timestamp: Date.now()
      }));
      
      // Start watching this file
      this.watchStateFile(stateFile);
      
    } catch (err) {
      console.error('[Server] Error syncing state:', err);
      this.sendError(ws, `Failed to sync state: ${err.message}`);
    }
  }

  async handleSyncToSource(ws, message) {
    const { sourceFile, htmlFile } = message;

    if (!sourceFile || !htmlFile) {
      this.sendError(ws, 'SYNC_TO_SOURCE requires sourceFile and htmlFile parameters');
      return;
    }

    try {
      const stateFilePath = this.getStateFilePath(sourceFile);
      const htmlFilePath = join(process.cwd(), htmlFile);

      // Validate files exist
      if (!existsSync(stateFilePath)) {
        throw new Error(`State file not found: ${stateFilePath}`);
      }

      if (!existsSync(htmlFilePath)) {
        throw new Error(`HTML file not found: ${htmlFilePath}`);
      }

      console.log(`[Server] Syncing state to source file...`);
      console.log(`[Server] - State: ${stateFilePath}`);
      console.log(`[Server] - HTML: ${htmlFilePath}`);

      // Perform sync
      const result = await this.syncer.sync(htmlFilePath, stateFilePath);

      console.log(`[Server] ✓ Synced ${result.updated} elements to ${htmlFilePath}`);

      // Send confirmation
      ws.send(JSON.stringify({
        type: 'SYNC_TO_SOURCE_COMPLETE',
        htmlFile,
        updated: result.updated,
        errors: result.errors,
        timestamp: Date.now()
      }));

      // Broadcast to other clients
      this.broadcast({
        type: 'SOURCE_FILE_UPDATED',
        htmlFile,
        timestamp: Date.now()
      });

    } catch (err) {
      console.error('[Server] Error syncing to source:', err);
      this.sendError(ws, `Failed to sync to source: ${err.message}`);
    }
  }

  watchStateFile(stateFile) {
    // Don't create duplicate watchers
    if (this.fileWatchers.has(stateFile)) return;

    const watcher = watch(stateFile, async (eventType) => {
      if (eventType === 'change') {
        try {
          // Read the new content
          const newContent = await readFile(stateFile, 'utf-8');
          const lastContent = this.lastStates.get(stateFile);

          // Only notify if content actually changed (avoid feedback loop)
          if (newContent !== lastContent) {
            console.log(`[Server] External change detected in ${stateFile}`);
            this.lastStates.set(stateFile, newContent);

            // Clear any existing timer for this file
            if (this.reloadTimers.has(stateFile)) {
              clearTimeout(this.reloadTimers.get(stateFile));
            }

            // Debounce the reload notification
            const timer = setTimeout(() => {
              console.log(`[Server] Notifying clients to reload (after ${this.reloadDebounceMs}ms debounce)`);
              this.broadcast({
                type: 'STATE_UPDATE',
                file: stateFile,
                timestamp: Date.now()
              });
              this.reloadTimers.delete(stateFile);
            }, this.reloadDebounceMs);

            this.reloadTimers.set(stateFile, timer);
          }
        } catch (err) {
          console.error('[Server] Error reading changed file:', err);
        }
      }
    });

    this.fileWatchers.set(stateFile, watcher);
    console.log(`[Server] Watching for changes: ${stateFile} (reload debounce: ${this.reloadDebounceMs}ms)`);
  }

  getStateFilePath(filename) {
    return join(this.stateDir, filename);
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(data);
      }
    });
  }

  sendError(ws, error) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      error
    }));
  }

  stop() {
    // Clear all pending reload timers
    this.reloadTimers.forEach(timer => clearTimeout(timer));
    this.reloadTimers.clear();
    
    // Close all watchers
    this.fileWatchers.forEach(watcher => watcher.close());
    this.fileWatchers.clear();
    
    // Close WebSocket server
    this.wss.close();
    
    console.log('[Server] Server stopped');
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      options.port = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--dir' && args[i + 1]) {
      options.dir = args[i + 1];
      i++;
    } else if (args[i] === '--reload-debounce' && args[i + 1]) {
      options.reloadDebounceMs = parseInt(args[i + 1]);
      i++;
    }
  }
  
  return options;
}

// Start server if run directly
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  const options = parseArgs();
  const server = new LiveDOMSyncServer(options);
  
  server.start().catch(err => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    server.stop();
    process.exit(0);
  });
}

export { LiveDOMSyncServer };
