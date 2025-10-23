# 🚀 Quick Start Guide

Get LiveDOMSync running in 2 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Start the Sync Server

```bash
npm run server
```

You should see:
```
[Server] LiveDOMSync server running on ws://localhost:3001
[Server] Watching project directory: ./src
[Server] State files stored in: src/.live-dom
```

## Step 3: Serve the Test Page

In a new terminal:

```bash
# Option 1: Python
python3 -m http.server 8000

# Option 2: npx
npx http-server -p 8000

# Option 3: PHP
php -S localhost:8000
```

## Step 4: Open in Browser

Navigate to: **http://localhost:8000/test.html**

You should see:
- ✅ Green "Connected - Live editing enabled" status (bottom-left)
- 🔴 "LIVE EDIT MODE" indicator (top-right)
- Blue outlines appear when you hover over elements

## Step 5: Start Editing!

### Edit in Browser:
1. Click any text on the page
2. Start typing
3. Watch the console - you'll see: `[LiveDOMSync] Changes synced to src/.live-dom/dom-state.json`
4. Open `src/.live-dom/dom-state.json` to see your changes saved!

### Edit the JSON File:
1. Open `src/.live-dom/dom-state.json` in your editor
2. Change some text content
3. Save the file
4. Watch your browser reload automatically!

## Keyboard Shortcuts

- **Cmd/Ctrl + S**: Force immediate sync (bypasses 300ms debounce)

## Debugging

### Browser Console
```javascript
// Check connection
window.liveDOMSync.ws.readyState  // 1 = connected

// Manual sync
window.liveDOMSync.forceSync()

// Capture current state
window.liveDOMSync.captureSnapshot()
```

### Common Issues

**"Connection failed"**
- Make sure server is running: `npm run server`
- Check the WebSocket URL is `ws://localhost:3001`

**"Changes not syncing"**
- Check browser console for errors
- Try manual sync: Cmd/Ctrl + S
- Make sure element doesn't have `data-live-dom-ignore` attribute

**"Page not reloading on file edits"**
- Verify server logs show "External change detected"
- Make sure you're editing the correct file in `src/.live-dom/`

## What's Happening Behind the Scenes?

```
You edit text in browser
    ↓
DOM MutationObserver captures change
    ↓
Change queued (300ms debounce)
    ↓
Full DOM snapshot sent via WebSocket
    ↓
Server writes to JSON file
    ↓
File watcher detects external change
    ↓
Server notifies browser → reload
```

## Next: Integrate into Your App

See **README.md** for:
- Integration examples
- API documentation
- Configuration options
- Advanced usage patterns

Ready to revolutionize your UI workflow! 🎨
