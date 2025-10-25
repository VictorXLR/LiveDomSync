# LiveDOMSync - Source File Sync

The sync command allows you to apply DOM changes from the frontend directly back to your HTML source files.

## Overview

LiveDOMSync captures DOM changes in JSON state files (stored in `src/.live-dom/`). The sync command reads these state files and updates your original HTML files with the changes.

```
Browser Edits → JSON State File → Sync Command → Updated HTML Source File
```

## Usage

### CLI Command

Sync a state file to an HTML file:

```bash
node sync.js <html-file> <state-file>
```

**Example:**
```bash
node sync.js test.html src/.live-dom/dom-state.json
```

Or using npm:
```bash
npm run sync test.html src/.live-dom/dom-state.json
```

### WebSocket Message

You can also trigger sync from the client via WebSocket:

```javascript
// Send SYNC_TO_SOURCE message
sync.send({
  type: 'SYNC_TO_SOURCE',
  sourceFile: 'dom-state.json',  // State file in src/.live-dom/
  htmlFile: 'test.html'           // HTML file to update
});

// Listen for completion
sync.ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'SYNC_TO_SOURCE_COMPLETE') {
    console.log(`Synced ${msg.updated} elements`);
  }
});
```

## What Gets Synced

The sync command updates the following in your HTML:

1. **Attributes** - All element attributes (class, id, etc.)
2. **Inline Styles** - Element `style` attributes
3. **Text Content** - Inner text of elements

Elements are matched by their `data-live-id` attribute.

## Workflow Example

### 1. Start the Server

```bash
npm run server
```

### 2. Open Your HTML in Browser

```bash
# Open test.html in your browser
# The LiveDOMSync client connects automatically
```

### 3. Edit Content in Browser

Make changes to any editable element:
- Change text content
- Modify styles via dev tools
- Update attributes

Changes are automatically saved to `src/.live-dom/dom-state.json`

### 4. Sync to Source File

Apply the changes back to your HTML:

```bash
npm run sync test.html src/.live-dom/dom-state.json
```

### 5. Verify Changes

Open `test.html` in your editor - you'll see the updates applied!

## How It Works

### State File Format

The JSON state file contains element data:

```json
{
  "elements": [
    {
      "selector": "[data-live-id=\"live-0\"]",
      "tagName": "h1",
      "attributes": {
        "class": "hero-title",
        "data-live-id": "live-0"
      },
      "styles": {
        "color": "blue",
        "font-size": "48px"
      },
      "textContent": "My Updated Title"
    }
  ],
  "timestamp": 1729867890123,
  "url": "/test.html",
  "syncedAt": "2025-10-25T20:00:00.000Z",
  "version": 1
}
```

### Sync Algorithm

1. Read the HTML file
2. For each element in the state file:
   - Find the element in HTML by `data-live-id`
   - Update attributes (except `data-live-id`)
   - Update inline styles
   - Update text content
3. Write the updated HTML back to file

### Element Matching

Elements are identified by the `data-live-id` attribute:

```html
<!-- Original -->
<h1 data-live-id="live-0" class="title">Hello</h1>

<!-- After editing "Hello" → "Hi" and syncing -->
<h1 data-live-id="live-0" class="title">Hi</h1>
```

## Advanced Usage

### Server Integration

The server can automatically sync on state changes:

```javascript
import { LiveDOMSyncServer } from './server.js';

const server = new LiveDOMSyncServer({
  port: 3001,
  dir: './src'
});

await server.start();
```

Send `SYNC_TO_SOURCE` message from client to trigger sync.

### Programmatic Usage

Use the HTMLSyncer class directly:

```javascript
import { HTMLSyncer } from './sync.js';

const syncer = new HTMLSyncer();
const result = await syncer.sync('test.html', 'src/.live-dom/dom-state.json');

console.log(`Updated ${result.updated} elements`);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

## Limitations

1. **Structure Changes** - The sync only updates existing elements, it doesn't add/remove elements or change the DOM structure
2. **Complex Selectors** - Elements must have `data-live-id` attributes to be tracked
3. **Formatting** - HTML formatting may change slightly during sync (whitespace normalization)

## Troubleshooting

### "State file not found"

Make sure the WebSocket server has received at least one `SYNC_STATE` message. Edit something in the browser to trigger a sync.

### "HTML file not found"

Check the file path - it should be relative to the project root, not the server's working directory.

### Elements not updating

Verify the element has a `data-live-id` attribute. Only elements with this attribute are tracked and synced.

### Unexpected results

Check the state file manually to see what data was captured. The sync applies exactly what's in the state file.

## Best Practices

1. **Commit Often** - Sync writes directly to your HTML files, so commit your work before syncing
2. **Review Changes** - Use git diff to review what changed after syncing
3. **Backup** - Keep backups of important files before running sync
4. **Test First** - Try syncing on a test file before using on production files

## Integration with VLMs

The sync command is perfect for AI-assisted development:

1. AI edits the JSON state file
2. Run sync to apply changes to HTML
3. Preview changes in browser
4. Iterate with AI

See [VLM_INTEGRATION.md](./VLM_INTEGRATION.md) for more details.
