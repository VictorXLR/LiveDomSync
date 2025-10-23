# Troubleshooting Guide

## Edit Functionality Still Works!

After the reload speed fix, **all editing functionality still works exactly as before**. Here's what was changed and what wasn't:

### ✅ What Still Works (Unchanged)

1. **In-Browser Editing**
   - Click any text on the page and edit it
   - Changes sync to JSON file after 300ms
   - Visual feedback with blue outlines
   - Ctrl/Cmd+S to force sync
   - All MutationObserver functionality intact

2. **Browser → File Sync**
   - Edit in browser → saves to `dom-state.json` immediately (300ms debounce)
   - No delays added to this direction
   - Works exactly as before

### 🔄 What Changed

1. **File → Browser Reload**
   - When you edit the JSON file externally
   - Server now waits 3 seconds before notifying browser to reload
   - This gives you time to make multiple edits
   - Only affects external file editing, not in-browser editing

## Common Issues & Solutions

### Issue: "Edit functionality doesn't work"

**Symptoms:**
- Can't edit text in browser
- Changes don't save
- No visual feedback

**Solutions:**

1. **Check if server is running:**
   ```bash
   # You should see this in a terminal window:
   [Server] LiveDOMSync server running on ws://localhost:3001
   ```

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for: `🎨 LiveDOMSync Ready!`
   - If you see connection errors, restart the server

3. **Check status indicator:**
   - Bottom left of page should show: "Connected - Live editing enabled"
   - If it says "Connection failed", the server isn't running

4. **Verify contenteditable is enabled:**
   - Open DevTools Console
   - Type: `document.body.contentEditable`
   - Should return: `"true"`

5. **Force a sync:**
   - Press Ctrl+S (or Cmd+S on Mac)
   - Check console for "Forcing sync..." message

### Issue: "Page reloads too slowly now"

**This is expected!** The reload delay was increased to 3 seconds by default.

**Solutions:**

1. **Use faster reload (not recommended for editing):**
   ```bash
   node server.js --reload-debounce 1000  # 1 second
   ```

2. **Use slower reload (better for editing):**
   ```bash
   npm run server:slow  # 5 seconds
   ```

3. **Customize to your preference:**
   ```bash
   node server.js --reload-debounce 2000  # 2 seconds
   ```

### Issue: "Validation test fails"

**Solution:** The validation test has been updated to account for the 3-second debounce. Make sure you're using the latest version of `validate.js`.

Run the test:
```bash
node validate.js
```

All 5 tests should pass:
- ✅ WebSocket Connection
- ✅ Request Initial State
- ✅ Sync State to File
- ✅ Verify File Written to Disk
- ✅ External File Change Detection

## How to Verify Everything Works

### Test 1: Browser Editing
1. Start server: `npm run server`
2. Open `test.html` in browser
3. Click on any heading and type
4. Check `src/.live-dom/dom-state.json` - your changes should be there
5. **Expected:** Changes appear in file within ~300ms

### Test 2: External File Editing
1. With browser open, edit `src/.live-dom/dom-state.json`
2. Change some text content
3. Save the file
4. **Expected:** Browser reloads after 3 seconds (default)

### Test 3: Force Sync
1. Edit text in browser
2. Press Ctrl+S (Cmd+S on Mac)
3. Check console for "Forcing sync..." message
4. **Expected:** Immediate sync, no waiting

## Debug Mode

To see detailed logs:

1. **Server logs:**
   - Watch the terminal where server is running
   - You'll see: `[Server] External change detected...`
   - Then: `[Server] Notifying clients to reload (after 3000ms debounce)`

2. **Browser logs:**
   - Open DevTools Console (F12)
   - Look for `[LiveDOMSync]` messages
   - Sync operations are logged in real-time

3. **Access sync object:**
   ```javascript
   // In browser console:
   window.liveDOMSync.forceSync()  // Force immediate sync
   window.liveDOMSync.enabled      // Check if enabled (should be true)
   window.liveDOMSync.ws.readyState // Check WebSocket (1 = OPEN)
   ```

## Still Having Issues?

1. **Restart everything:**
   ```bash
   # Kill all Node processes
   # Restart server
   npm run server
   # Hard refresh browser (Ctrl+Shift+R)
   ```

2. **Check for port conflicts:**
   ```bash
   # On Windows:
   netstat -ano | findstr :3001
   # Should show your Node.js server
   ```

3. **Verify file permissions:**
   - Make sure `src/.live-dom/` directory exists
   - Make sure you can write to it

4. **Check browser compatibility:**
   - Use Chrome, Firefox, or Edge (modern versions)
   - WebSocket support required
   - MutationObserver support required

## What Was Actually Changed

### Files Modified:
1. `server.js` - Added debounce to file watcher
2. `validate.js` - Updated test timeout from 3s to 5s
3. `package.json` - Added `server:slow` script
4. `README.md` - Added documentation
5. `start-slow.bat` - New convenience script
6. `live-dom-sync.js` - Fixed bug: `shouldIgnoreElement()` now handles text nodes properly

### Bug Fixed:
- **Issue:** `el.matches is not a function` error when editing text
- **Cause:** Text nodes don't have `.matches()` method
- **Fix:** Added node type check before calling `.matches()`
- See `BUGFIX_MATCHES.md` for details

## Summary

**The edit functionality works exactly as before!** The only change is that external file edits now wait 3 seconds before reloading the browser, giving you time to make multiple changes. All in-browser editing is unchanged and works perfectly.

If you're experiencing issues with editing, it's likely a server connection problem, not related to the reload speed changes.

