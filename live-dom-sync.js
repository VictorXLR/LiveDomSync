/**
 * LiveDOMSync - Real-time DOM manipulation with source file sync
 * 
 * Usage:
 *   import { LiveDOMSync } from './live-dom-sync.js';
 *   const sync = new LiveDOMSync({ wsUrl: 'ws://localhost:3001' });
 *   sync.enable();
 */

export class LiveDOMSync {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || 'ws://localhost:3001';
    this.sourceFile = options.sourceFile || 'dom-state.json';
    this.ws = null;
    this.observer = null;
    this.enabled = false;
    this.pendingChanges = [];
    this.debounceTimer = null;
    this.debounceMs = options.debounceMs || 300;
    this.ignoredSelectors = options.ignoredSelectors || [
      '[data-live-dom-ignore]',
      'script',
      'style'
    ];
    
    // Track elements with unique IDs for syncing
    this.idCounter = 0;
    this.elementRegistry = new WeakMap();
  }

  /**
   * Initialize WebSocket connection
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('[LiveDOMSync] Connected to sync server');
        this.requestInitialState();
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('[LiveDOMSync] WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };
      
      this.ws.onclose = () => {
        console.log('[LiveDOMSync] Disconnected from sync server');
        // Auto-reconnect after 2s
        setTimeout(() => this.connect(), 2000);
      };
    });
  }

  /**
   * Request initial state from server (if exists)
   */
  requestInitialState() {
    this.send({
      type: 'REQUEST_STATE',
      sourceFile: this.sourceFile
    });
  }

  /**
   * Handle incoming messages from server
   */
  handleServerMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'INITIAL_STATE':
          if (message.state) {
            this.applyState(message.state);
          }
          break;
          
        case 'STATE_UPDATE':
          // External change detected (e.g., file edited outside browser)
          console.log('[LiveDOMSync] External change detected, reloading...');
          window.location.reload();
          break;
          
        case 'SYNC_CONFIRMED':
          console.log('[LiveDOMSync] Changes synced to', message.file);
          break;
          
        case 'ERROR':
          console.error('[LiveDOMSync] Server error:', message.error);
          break;
      }
    } catch (err) {
      console.error('[LiveDOMSync] Failed to parse server message:', err);
    }
  }

  /**
   * Apply state to DOM (from saved file)
   */
  applyState(state) {
    // Temporarily disable observer to avoid feedback loop
    const wasEnabled = this.enabled;
    if (wasEnabled) this.disable();
    
    state.elements?.forEach(elementData => {
      const el = document.querySelector(elementData.selector);
      if (el) {
        // Apply attributes
        if (elementData.attributes) {
          Object.entries(elementData.attributes).forEach(([key, value]) => {
            el.setAttribute(key, value);
          });
        }
        
        // Apply styles
        if (elementData.styles) {
          Object.entries(elementData.styles).forEach(([key, value]) => {
            el.style[key] = value;
          });
        }
        
        // Apply text content (if no children)
        if (elementData.textContent !== undefined && el.children.length === 0) {
          el.textContent = elementData.textContent;
        }
      }
    });
    
    if (wasEnabled) this.enable();
  }

  /**
   * Enable live editing mode
   */
  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.tagEditableElements();
    this.startObserving();
    this.addEditingUI();
    
    console.log('[LiveDOMSync] Live editing enabled');
  }

  /**
   * Disable live editing mode
   */
  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.removeEditingUI();
    console.log('[LiveDOMSync] Live editing disabled');
  }

  /**
   * Tag elements with unique IDs for tracking
   */
  tagEditableElements() {
    document.querySelectorAll('body *').forEach(el => {
      if (this.shouldIgnoreElement(el)) return;
      if (!el.hasAttribute('data-live-id')) {
        el.setAttribute('data-live-id', `live-${this.idCounter++}`);
      }
    });
  }

  /**
   * Check if element should be ignored
   */
  shouldIgnoreElement(el) {
    // Check if it's an element node (not text node, comment, etc.)
    if (!el || el.nodeType !== 1) return true;
    return this.ignoredSelectors.some(selector => el.matches(selector));
  }

  /**
   * Start observing DOM mutations
   */
  startObserving() {
    this.observer = new MutationObserver((mutations) => {
      const changes = this.processMutations(mutations);
      if (changes.length > 0) {
        this.queueChanges(changes);
      }
    });

    this.observer.observe(document.body, {
      attributes: true,
      attributeOldValue: true,
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true
    });
  }

  /**
   * Process mutation records into structured changes
   */
  processMutations(mutations) {
    const changes = [];
    
    mutations.forEach(mutation => {
      const target = mutation.target;
      
      switch (mutation.type) {
        case 'attributes':
          // Only process element nodes for attributes
          if (target.nodeType !== 1) break;
          if (this.shouldIgnoreElement(target)) break;
          if (target.hasAttribute('data-live-dom-ignore')) break;
          if (mutation.attributeName === 'data-live-id') break;
          
          changes.push({
            type: 'attribute',
            selector: this.getSelector(target),
            attribute: mutation.attributeName,
            value: target.getAttribute(mutation.attributeName),
            oldValue: mutation.oldValue
          });
          break;
          
        case 'characterData':
          // Text nodes - get parent element
          if (!target.parentElement) break;
          if (this.shouldIgnoreElement(target.parentElement)) break;
          
          changes.push({
            type: 'textContent',
            selector: this.getSelector(target.parentElement),
            value: target.parentElement.textContent,
            oldValue: mutation.oldValue
          });
          break;
          
        case 'childList':
          // Tag new element nodes
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && !this.shouldIgnoreElement(node)) {
              if (!node.hasAttribute('data-live-id')) {
                node.setAttribute('data-live-id', `live-${this.idCounter++}`);
              }
            }
          });
          break;
      }
    });
    
    return changes;
  }

  /**
   * Get a stable selector for an element
   */
  getSelector(el) {
    if (!el || el === document.body) return 'body';
    
    // Prefer data-live-id
    if (el.hasAttribute('data-live-id')) {
      return `[data-live-id="${el.getAttribute('data-live-id')}"]`;
    }
    
    // Fallback to ID
    if (el.id) {
      return `#${el.id}`;
    }
    
    // Fallback to class-based selector
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }
    
    // Last resort: nth-child
    const parent = el.parentElement;
    const index = Array.from(parent.children).indexOf(el) + 1;
    return `${this.getSelector(parent)} > ${el.tagName.toLowerCase()}:nth-child(${index})`;
  }

  /**
   * Queue changes with debouncing
   */
  queueChanges(changes) {
    this.pendingChanges.push(...changes);
    
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncChanges();
    }, this.debounceMs);
  }

  /**
   * Sync pending changes to server
   */
  syncChanges() {
    if (this.pendingChanges.length === 0) return;
    
    const snapshot = this.captureSnapshot();
    
    this.send({
      type: 'SYNC_STATE',
      sourceFile: this.sourceFile,
      state: snapshot,
      timestamp: Date.now()
    });
    
    this.pendingChanges = [];
  }

  /**
   * Capture full DOM snapshot
   */
  captureSnapshot() {
    const elements = [];
    
    document.querySelectorAll('[data-live-id]').forEach(el => {
      if (this.shouldIgnoreElement(el)) return;
      
      const elementData = {
        selector: this.getSelector(el),
        tagName: el.tagName.toLowerCase(),
        attributes: {},
        styles: {}
      };
      
      // Capture relevant attributes
      Array.from(el.attributes).forEach(attr => {
        if (!attr.name.startsWith('data-live-')) {
          elementData.attributes[attr.name] = attr.value;
        }
      });
      
      // Capture inline styles
      if (el.style.length > 0) {
        Array.from(el.style).forEach(prop => {
          elementData.styles[prop] = el.style[prop];
        });
      }
      
      // Capture text content for leaf nodes
      if (el.children.length === 0 && el.textContent.trim()) {
        elementData.textContent = el.textContent;
      }
      
      elements.push(elementData);
    });
    
    return {
      elements,
      timestamp: Date.now(),
      url: window.location.pathname
    };
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[LiveDOMSync] WebSocket not connected, queuing message');
    }
  }

  /**
   * Add visual editing UI
   */
  addEditingUI() {
    const overlay = document.createElement('div');
    overlay.id = 'live-dom-overlay';
    overlay.setAttribute('data-live-dom-ignore', 'true');
    overlay.innerHTML = `
      <style>
        #live-dom-overlay {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 12px;
          z-index: 999999;
          pointer-events: none;
        }
        #live-dom-overlay.syncing {
          background: rgba(34, 197, 94, 0.8);
        }
        body[contenteditable="true"] * {
          outline: 1px dashed rgba(59, 130, 246, 0.5) !important;
        }
        body[contenteditable="true"] *:hover {
          outline: 2px solid rgba(59, 130, 246, 0.8) !important;
        }
      </style>
      <div>🔴 LIVE EDIT MODE</div>
    `;
    document.body.appendChild(overlay);
    
    // Make body editable
    document.body.setAttribute('contenteditable', 'true');
  }

  /**
   * Remove editing UI
   */
  removeEditingUI() {
    const overlay = document.getElementById('live-dom-overlay');
    if (overlay) overlay.remove();
    
    document.body.removeAttribute('contenteditable');
  }

  /**
   * Manual sync trigger (useful for testing)
   */
  forceSync() {
    clearTimeout(this.debounceTimer);
    this.syncChanges();
  }
}

// Auto-start if script loaded with data-auto-start
if (document.currentScript?.hasAttribute('data-auto-start')) {
  const wsUrl = document.currentScript.getAttribute('data-ws-url') || 'ws://localhost:3001';
  const sync = new LiveDOMSync({ wsUrl });
  
  sync.connect().then(() => {
    sync.enable();
  }).catch(err => {
    console.error('[LiveDOMSync] Failed to connect:', err);
  });
  
  // Expose globally for debugging
  window.liveDOMSync = sync;
}
