# LiveDOMSync Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           BROWSER                                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Your Web Page                           │    │
│  │                                                            │    │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                  │    │
│  │  │ <h1> │  │ <div>│  │ <p>  │  │<button>                 │    │
│  │  │      │  │      │  │      │  │      │   [contenteditable] │
│  │  └──────┘  └──────┘  └──────┘  └──────┘                  │    │
│  │      ↓         ↓         ↓         ↓                      │    │
│  │  [data-live-id="1"] [data-live-id="2"] ...               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              MutationObserver                              │    │
│  │  • Watches all DOM changes                                 │    │
│  │  • Captures: attributes, text, styles                      │    │
│  │  • Queues changes (300ms debounce)                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              LiveDOMSync Client                            │    │
│  │  • Captures full DOM snapshot                              │    │
│  │  • Serializes to JSON                                      │    │
│  │  • Sends via WebSocket                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                   WebSocket (ws://localhost:3001)
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                              ↓                           SERVER     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              WebSocket Server                              │    │
│  │  • Receives JSON state                                     │    │
│  │  • Validates format                                        │    │
│  │  • Broadcasts to all clients                               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              File Writer                                   │    │
│  │  • Writes to src/.live-dom/dom-state.json                  │    │
│  │  • Adds metadata (timestamp, version)                      │    │
│  │  • Pretty-prints JSON                                      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │  File System         │
                    │                      │
                    │  dom-state.json      │
                    │  {                   │
                    │    "elements": [...] │
                    │    "timestamp": ...  │
                    │  }                   │
                    └──────────────────────┘
                               │
                               │ fs.watch()
                               ↓
┌──────────────────────────────┼──────────────────────────────────────┐
│                              ↓                           SERVER     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              File Watcher                                  │    │
│  │  • Detects external file changes                           │    │
│  │  • Debounces rapid changes                                 │    │
│  │  • Prevents feedback loops                                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              Change Notifier                               │    │
│  │  • Broadcasts "STATE_UPDATE" message                       │    │
│  │  • Tells all clients to reload                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                   WebSocket (bidirectional)
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                              ↓                          BROWSER     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              WebSocket Client                              │    │
│  │  • Receives "STATE_UPDATE"                                 │    │
│  │  • Triggers: window.location.reload()                      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓                                      │
│                       Page Reloads                                 │
│                    (with new state)                                │
└─────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                          DATA FLOW EXAMPLE
═══════════════════════════════════════════════════════════════════════

1. USER ACTION
   └─→ User clicks <h1> and types "Hello World"

2. BROWSER CAPTURES
   └─→ MutationObserver fires
       └─→ Change queued: { type: 'textContent', value: 'Hello World' }
       └─→ After 300ms debounce, full snapshot taken

3. BROWSER → SERVER
   └─→ WebSocket sends:
       {
         "type": "SYNC_STATE",
         "state": {
           "elements": [
             {
               "selector": "[data-live-id=\"hero-1\"]",
               "tagName": "h1",
               "textContent": "Hello World"
             }
           ]
         }
       }

4. SERVER PROCESSES
   └─→ Validates JSON
   └─→ Writes to: src/.live-dom/dom-state.json
   └─→ Responds: { "type": "SYNC_CONFIRMED" }

5. EXTERNAL EDIT (Optional)
   └─→ Developer opens dom-state.json in VSCode
   └─→ Changes "Hello World" → "Welcome Back"
   └─→ Saves file

6. SERVER DETECTS
   └─→ fs.watch() fires
   └─→ Reads new content
   └─→ Broadcasts: { "type": "STATE_UPDATE" }

7. BROWSER RELOADS
   └─→ Client receives STATE_UPDATE
   └─→ window.location.reload()
   └─→ Page shows "Welcome Back"


═══════════════════════════════════════════════════════════════════════
                       VLM INTEGRATION FLOW
═══════════════════════════════════════════════════════════════════════

┌─────────────┐
│  Designer   │ "Make this more spacious"
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│   VLM Assistant     │
│  (Claude/GPT)       │
│                     │
│  1. Read state.json │
│  2. Understand req  │
│  3. Generate update │
└──────┬──────────────┘
       │
       ↓  (updated JSON)
┌─────────────────────┐
│   dom-state.json    │
│                     │
│  "padding": "80px"  │ ← Changed from "40px"
│  "min-height": ...  │ ← New property
└──────┬──────────────┘
       │
       ↓  (file watch)
┌─────────────────────┐
│   LiveDOMSync       │
│   Server            │
└──────┬──────────────┘
       │
       ↓  (WebSocket)
┌─────────────────────┐
│   Browser           │
│   (auto-reload)     │
│                     │
│  [Spacious Design]  │ ✨
└─────────────────────┘


═══════════════════════════════════════════════════════════════════════
                        MESSAGE TYPES
═══════════════════════════════════════════════════════════════════════

Browser → Server:
  • REQUEST_STATE     - Get initial state
  • SYNC_STATE        - Send DOM snapshot

Server → Browser:
  • INITIAL_STATE     - Return saved state (or null)
  • SYNC_CONFIRMED    - State written successfully
  • STATE_UPDATE      - External change, reload needed
  • ERROR             - Something went wrong


═══════════════════════════════════════════════════════════════════════
                        FILE STRUCTURE
═══════════════════════════════════════════════════════════════════════

project/
├── live-dom-sync.js       # Browser library
├── server.js              # WebSocket server
├── test.html              # Example page
├── package.json           # Dependencies
├── node_modules/
│   └── ws/                # Only dependency
└── src/
    └── .live-dom/         # State storage
        ├── dom-state.json
        ├── about-page.json
        └── ...


═══════════════════════════════════════════════════════════════════════
                        PERFORMANCE
═══════════════════════════════════════════════════════════════════════

Mutation Detection:     < 1ms
Debounce Wait:          300ms (configurable)
Snapshot Capture:       5-10ms (typical page)
WebSocket Send:         < 5ms (local)
File Write:             < 10ms
File Watch Trigger:     50-100ms
Browser Reload:         200-500ms (depends on page)
────────────────────────────────────
Total (browser edit):   ~350ms
Total (external edit):  ~300-600ms


═══════════════════════════════════════════════════════════════════════
```
