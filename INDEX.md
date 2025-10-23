# LiveDOMSync 🎨

**Real-time DOM manipulation with source file synchronization**

Edit your UI directly in the browser. Changes automatically sync to JSON files. Perfect for rapid development and AI-assisted design workflows.

---

## 🚀 Quick Start (2 minutes)

```bash
npm install
npm run validate    # Run tests
npm run server      # Start sync server

# In another terminal:
python3 -m http.server 8000

# Open: http://localhost:8000/test.html
# Start editing!
```

Or run the one-command setup:
```bash
./setup.sh
```

---

## 📚 Documentation

### Getting Started
- **[QUICKSTART.md](./QUICKSTART.md)** - 2-minute setup guide
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Validation results & overview

### Deep Dive
- **[README.md](./README.md)** - Complete documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design & data flow
- **[VLM_INTEGRATION.md](./VLM_INTEGRATION.md)** - AI integration examples

---

## 🎯 What Problem Does This Solve?

### Before:
```
Edit code → Save → Reload browser → Check result → Repeat
```
**10-30 seconds per iteration** 😴

### After:
```
Edit in browser → Changes sync automatically
```
**Instant feedback** ⚡

---

## ✨ Key Features

✅ **Live DOM Editing** - Content-editable with visual feedback  
✅ **Real-time Sync** - Changes auto-saved (300ms debounce)  
✅ **Bidirectional** - Edit files externally → browser reloads  
✅ **VLM-Ready** - Perfect for AI-assisted design  
✅ **Version Control** - Clean JSON diffs in Git  
✅ **Zero Dependencies** - Only `ws` for WebSocket  

---

## 🏗️ Architecture

```
Browser (edits) ←WebSocket→ Server ←watches→ JSON Files
                                              ↓
                                      (VCS, AI, editors)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagrams.

---

## 📦 What's Included

### Core Files
- `live-dom-sync.js` - Browser library (12KB)
- `server.js` - WebSocket server
- `package.json` - NPM configuration

### Examples & Tests
- `test.html` - Interactive demo page
- `validate.js` - Automated test suite
- `test-runner.js` - Test orchestration

### Scripts
- `setup.sh` - One-command setup
- `npm run server` - Start sync server
- `npm run validate` - Run tests

---

## 💻 Usage

```javascript
import { LiveDOMSync } from './live-dom-sync.js';

const sync = new LiveDOMSync({
  wsUrl: 'ws://localhost:3001',
  sourceFile: 'my-app.json'
});

await sync.connect();
sync.enable();

// Start editing - changes sync automatically!
```

---

## 🤖 VLM Integration

Perfect for AI-assisted UI development:

```python
# Designer: "Make this more spacious"
current_state = read_json("dom-state.json")
updated_state = claude.generate(request + current_state)
write_json("dom-state.json", updated_state)
# → Browser auto-reloads with new design
```

See [VLM_INTEGRATION.md](./VLM_INTEGRATION.md) for complete examples.

---

## ✅ Validation Results

All tests passed ✨

```
✅ WebSocket Connection
✅ Request Initial State  
✅ Sync State to File
✅ Verify File Written
✅ External File Change Detection

Result: 5/5 tests passed
```

Full results in [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

---

## 🎯 Use Cases

1. **Rapid UI Development** - Skip the edit-save-reload cycle
2. **Designer-Developer Bridge** - Designers edit real UI, not mockups
3. **AI-Assisted Design** - VLM interprets requests, updates UI
4. **A/B Testing** - Quickly create variants by editing JSON
5. **Responsive Design** - Test changes across viewports instantly

---

## 🚧 Roadmap

- [ ] VLM CLI for natural language editing
- [ ] Component extraction from patterns
- [ ] Undo/redo with state history
- [ ] Visual diff tool
- [ ] Framework adapters (React, Vue, Svelte)

---

## 📝 Why Doesn't This Exist Already?

Most frameworks assume **code dictates UI**, but designers think **visually first**.

This bridges the gap by making **browser the source of truth** while keeping outputs:
- ✅ Version controlled (JSON)
- ✅ AI-readable
- ✅ Framework-agnostic
- ✅ Developer-friendly

---

## 🛠️ Technical Details

- **Browser Library**: Vanilla JS, no dependencies
- **Server**: Node.js + ws (WebSocket)
- **State Format**: JSON (VCS-friendly)
- **Protocol**: WebSocket (bidirectional, real-time)
- **File Watching**: Native fs.watch()

---

## 📊 Performance

- Mutation detection: <1ms
- Sync latency: ~350ms (300ms debounce + network)
- File writes: <10ms
- Browser reload: 200-500ms

**Result**: Near-instant feedback for rapid iteration

---

## 🔒 Development Only

LiveDOMSync is designed for **development workflows only**. Don't enable in production.

```javascript
if (process.env.NODE_ENV === 'development') {
  sync.enable();
}
```

---

## 📖 Learn More

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](./QUICKSTART.md) | Get running in 2 minutes |
| [README.md](./README.md) | Full API documentation |
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | Technical overview |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design details |
| [VLM_INTEGRATION.md](./VLM_INTEGRATION.md) | AI integration guide |

---

## 🎉 Get Started

```bash
# Install
npm install

# Validate
npm run validate

# Start server
npm run server

# Open test page
# http://localhost:8000/test.html
```

**Start editing. Changes just work. Ship faster.** 🚀

---

## 💡 Built With Staff Engineer Mentality

✅ Solve the core problem  
✅ Ship fast  
✅ Iterate based on real usage  

No over-engineering. No unnecessary abstractions. Just a tool that **actually solves the problem**.

---

## 📄 License

MIT

---

## 🤝 Contributing

This is a working prototype built for real-world use. Contributions welcome!

Priority areas:
1. VLM integration examples
2. Framework adapters
3. Performance optimizations

---

**Question:** Why doesn't this exist?

**Answer:** Because most tools force developers to write code first. This flips it around - **visual changes drive code structure**. Combined with VLMs, it creates a workflow where designers and AI can collaborate on real, working UIs.

Now it exists. Use it. Ship faster. 🎨
