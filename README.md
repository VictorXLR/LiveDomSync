# LiveDOMSync

**Real-time DOM manipulation with source file synchronization**

Edit your UI directly in the browser and have changes automatically sync to source files. Perfect for rapid UI development and bridging the designer-developer workflow.

## 🎯 Core Features

- **Live DOM Editing**: Content-editable mode with visual feedback
- **Real-time Sync**: Changes automatically saved to JSON files (300ms debounce)
- **Bidirectional Updates**: Edit files externally → browser auto-reloads
- **Element Tracking**: Unique IDs for precise change tracking
- **WebSocket Communication**: Instant sync between browser and file system
- **VCS-Friendly**: Clean JSON diffs for version control

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the WebSocket Server

```bash
npm run server
# Or with custom options:
node server.js --port 3001 --dir ./src
```

### 3. Serve Your HTML (any method works)

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node http-server
npx http-server -p 8000

# Option 3: PHP
php -S localhost:8000
```

### 4. Open in Browser

```
http://localhost:8000/test.html
```

You should see:
- ✅ "Connected - Live editing enabled" status
- 🔴 "LIVE EDIT MODE" indicator in top-right
- Blue outlines on hover (editable elements)

### 5. Edit and Watch the Magic

1. **Click any text** and start typing
2. **Watch the console** - you'll see sync logs
3. **Check `src/.live-dom/dom-state.json`** - your changes are saved!
4. **Edit the JSON file** - browser reloads automatically

## 📖 Integration Guide

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div class="app">
    <h1>My Editable App</h1>
    <p>Start editing to see changes sync!</p>
  </div>

  <script type="module">
    import { LiveDOMSync } from './live-dom-sync.js';

    const sync = new LiveDOMSync({
      wsUrl: 'ws://localhost:3001',
      sourceFile: 'my-app-state.json'
    });

    sync.connect().then(() => {
      sync.enable();
    });
  </script>
</body>
</html>
```

### Advanced Configuration

```javascript
const sync = new LiveDOMSync({
  wsUrl: 'ws://localhost:3001',           // WebSocket server URL
  sourceFile: 'dom-state.json',           // State file name
  debounceMs: 300,                        // Sync debounce (ms)
  ignoredSelectors: [                     // Elements to ignore
    '[data-live-dom-ignore]',
    'script',
    'style',
    '.no-sync'
  ]
});

// Connect and enable
await sync.connect();
sync.enable();

// Manual controls
sync.disable();                           // Stop tracking
sync.enable();                            // Resume tracking
sync.forceSync();                         // Immediate sync (bypass debounce)

// Keyboard shortcut: Cmd/Ctrl + S to force sync
```

### Ignoring Elements

```html
<!-- Ignore specific elements -->
<div data-live-dom-ignore>
  This won't be tracked or synced
</div>

<!-- Or use custom selectors -->
<div class="no-sync">
  Also ignored if added to ignoredSelectors
</div>
```

## 🏗️ Architecture

```
┌─────────────────┐         WebSocket         ┌──────────────────┐
│  Browser Client │ ←────────────────────────→ │  Sync Server     │
│                 │                            │                  │
│  - DOM Observer │     Mutations (JSON)       │  - File Watcher  │
│  - Change Queue │  ────────────────────────→ │  - JSON Writer   │
│  - UI Overlay   │                            │  - Change Notify │
│                 │     State Updates          │                  │
│                 │ ←──────────────────────────│                  │
└─────────────────┘                            └──────────────────┘
                                                        │
                                                        ↓
                                                  ┌─────────────┐
                                                  │  JSON Files │
                                                  │  (versioned)│
                                                  └─────────────┘
```

## 📁 State File Format

```json
{
  "elements": [
    {
      "selector": "[data-live-id=\"live-0\"]",
      "tagName": "h1",
      "attributes": {
        "class": "hero-title"
      },
      "styles": {
        "color": "blue",
        "font-size": "48px"
      },
      "textContent": "My Awesome Title"
    }
  ],
  "timestamp": 1729123456789,
  "url": "/index.html",
  "syncedAt": "2025-10-23T12:34:56.789Z",
  "version": 1
}
```

## 🔧 Server Options

```bash
node server.js [options]

Options:
  --port <number>           WebSocket port (default: 3001)
  --dir <path>              Project directory (default: ./src)
  --reload-debounce <ms>    Delay before reloading on file changes (default: 3000)
```

State files are saved to: `<dir>/.live-dom/<sourceFile>`

### Slower Reload for Easier Editing

If the page reloads too quickly when you're editing the JSON files, you can increase the reload delay:

```bash
# Use the slower preset (5 second delay)
npm run server:slow

# Or customize the delay
node server.js --reload-debounce 5000

# On Windows, use the convenience script
start-slow.bat
```

## 🎯 Use Cases

### 1. Rapid UI Development
Skip the code-save-reload cycle. Edit directly in browser, changes persist to source.

### 2. Designer Handoff
Designers can tweak the real UI without touching code. Developers get clean JSON diffs.

### 3. VLM Integration (Coming Soon)
Feed the state JSON to VLMs for:
- "Make this more spacious" → AI adjusts spacing
- "Match this screenshot" → AI generates changes
- "Add a dark mode toggle" → AI creates variant

### 4. A/B Testing
Quickly create variations by editing the JSON file:
```bash
cp dom-state.json dom-state-variant-a.json
# Edit variant-a.json
# Switch between them to test
```

## 🐛 Debugging

### Enable Verbose Logging

All logs are prefixed with `[LiveDOMSync]` or `[Server]`.

Browser console:
```javascript
// Check connection status
window.liveDOMSync.ws.readyState
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED

// Force sync
window.liveDOMSync.forceSync();

// Capture current state
const snapshot = window.liveDOMSync.captureSnapshot();
console.log(snapshot);
```

Server logs:
```bash
# Shows all connections, syncs, and file changes
[Server] Client connected
[Server] Synced state to src/.live-dom/dom-state.json
[Server] - 12 elements tracked
[Server] External change detected in src/.live-dom/dom-state.json
```

### Common Issues

**"Connection failed"**
- Ensure server is running: `npm run server`
- Check WebSocket URL matches server port
- Check browser console for CORS/mixed-content errors

**"Changes not syncing"**
- Check element isn't in `ignoredSelectors`
- Look for console errors
- Try manual sync: `Cmd/Ctrl + S`

**"Page not reloading on external edits"**
- Verify file watcher is active (check server logs)
- Ensure you're editing the correct state file
- Check file permissions

## 🚧 Roadmap

- [ ] **VLM Integration Layer**: Send snapshots to Claude/GPT for AI-assisted editing
- [ ] **Component Extraction**: Detect repeated patterns → suggest components
- [ ] **Undo/Redo**: State history with time-travel debugging
- [ ] **Collaborative Editing**: Multi-user real-time sync
- [ ] **CSS Variable Support**: Track design tokens
- [ ] **Framework Adapters**: React, Vue, Svelte wrappers
- [ ] **Git Integration**: Auto-commit on sync
- [ ] **Visual Diff Tool**: Side-by-side comparison

## 📝 License

MIT

## 🤝 Contributing

This is a rapid prototype built for real-world use. Contributions welcome!

Priority areas:
1. VLM integration examples
2. Framework adapters
3. Performance optimizations
4. More robust element selectors

---

**Built for developers who are tired of the UI development cycle.**

Start editing. Changes just work. Ship faster. 🚀
# LiveDomSync
