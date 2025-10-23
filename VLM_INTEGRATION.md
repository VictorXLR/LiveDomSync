# VLM Integration Example

This demonstrates how LiveDOMSync can be integrated with Vision Language Models (VLMs) like Claude or GPT-4V to enable AI-assisted UI development.

## Concept

```
Designer describes change in natural language
    ↓
VLM interprets intent + current DOM state
    ↓
VLM generates updated state JSON
    ↓
LiveDOMSync applies changes
    ↓
Designer sees immediate visual feedback
```

## Example Workflow

### 1. Current State (dom-state.json)
```json
{
  "elements": [
    {
      "selector": "[data-live-id=\"hero-1\"]",
      "tagName": "div",
      "attributes": { "class": "hero" },
      "styles": {
        "padding": "40px",
        "background": "blue"
      },
      "textContent": "Welcome"
    }
  ]
}
```

### 2. Designer Request
> "Make the hero section more spacious and use a gradient instead of solid color"

### 3. VLM Prompt Template
```
You are a UI design assistant. Given the current DOM state and a design request, 
output an updated state JSON.

Current state:
{current_state_json}

Designer request: "{user_request}"

Output ONLY valid JSON in the exact same format, with your changes applied.
Consider:
- Spacing: use padding/margin for "spacious"
- Colors: CSS gradients for "gradient"
- Typography: font-size, line-height for readability
- Layout: flexbox/grid for structure
```

### 4. VLM Response
```json
{
  "elements": [
    {
      "selector": "[data-live-id=\"hero-1\"]",
      "tagName": "div",
      "attributes": { "class": "hero" },
      "styles": {
        "padding": "80px 40px",
        "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "min-height": "400px"
      },
      "textContent": "Welcome"
    }
  ]
}
```

### 5. Apply Changes
Write the VLM response back to `dom-state.json` → browser reloads with new design!

## Implementation Sketch

```javascript
// vlm-assistant.js
import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'fs/promises';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function processDesignRequest(request, stateFile) {
  // Read current state
  const currentState = JSON.parse(
    await readFile(stateFile, 'utf-8')
  );
  
  // Create prompt
  const prompt = `You are a UI design assistant. Given the current DOM state and a design request, output an updated state JSON.

Current state:
${JSON.stringify(currentState, null, 2)}

Designer request: "${request}"

Output ONLY valid JSON in the exact same format with your changes applied. Consider:
- Spacing: padding/margin for "spacious", "breathable", "cramped"
- Colors: CSS colors, gradients, opacity
- Typography: font-size, line-height, font-weight
- Layout: display, flex, grid properties

DO NOT include any text outside the JSON structure. Your entire response must be valid JSON.`;

  // Get VLM response
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  // Parse response
  const responseText = message.content[0].text;
  const updatedState = JSON.parse(responseText);
  
  // Write back to state file
  await writeFile(
    stateFile,
    JSON.stringify(updatedState, null, 2),
    'utf-8'
  );
  
  console.log('✅ Design applied!');
  console.log(`Changes: ${updatedState.elements.length} elements updated`);
}

// Usage
processDesignRequest(
  "Make this more spacious with a gradient background",
  "src/.live-dom/dom-state.json"
);
```

## Advanced: Visual Feedback Loop

```javascript
// 1. Designer makes change in browser
// 2. LiveDOMSync saves to dom-state.json
// 3. VLM reviews the change
// 4. VLM suggests improvements
// 5. Designer accepts/rejects
// 6. Cycle continues

async function reviewDesign(stateFile) {
  const state = JSON.parse(await readFile(stateFile, 'utf-8'));
  
  const prompt = `Review this UI design and suggest improvements:
  
${JSON.stringify(state, null, 2)}

Consider:
- Accessibility (contrast, sizing)
- Visual hierarchy
- Spacing consistency
- Design system patterns

Provide 3 specific, actionable suggestions.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return message.content[0].text;
}
```

## Multi-Modal: Screenshot → Code

```javascript
// With vision capabilities
async function designFromScreenshot(imageData, targetFile) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: imageData
          }
        },
        {
          type: 'text',
          text: `Analyze this UI design and generate a dom-state.json that recreates it.

Output format:
{
  "elements": [
    {
      "selector": "[data-live-id=\\\"...\\\"]",
      "tagName": "div",
      "attributes": { ... },
      "styles": { ... },
      "textContent": "..."
    }
  ]
}

Focus on layout, colors, typography, and spacing. Output ONLY valid JSON.`
        }
      ]
    }]
  });
  
  const state = JSON.parse(message.content[0].text);
  await writeFile(targetFile, JSON.stringify(state, null, 2), 'utf-8');
  
  console.log('✅ Design extracted from screenshot!');
}
```

## Real-World Use Cases

### 1. Design Iteration
```
Designer: "Make the CTA button more prominent"
VLM: *increases size, adds shadow, adjusts color*
Designer: "Good, but less shadow"
VLM: *reduces shadow intensity*
```

### 2. Responsive Design
```
Designer: "Optimize for mobile"
VLM: *adjusts font sizes, padding, switches to stacked layout*
```

### 3. Accessibility
```
Designer: "Check contrast ratios"
VLM: *analyzes colors, suggests WCAG-compliant alternatives*
```

### 4. Design System Adherence
```
Designer: "Apply our design system spacing scale"
VLM: *replaces arbitrary values with system tokens*
```

## Benefits

1. **Natural Language Interface**: Designers describe intent, not implementation
2. **Instant Feedback**: Changes visible immediately in browser
3. **Iterative**: Easy to refine with follow-up requests
4. **Learnable**: VLM learns your design patterns over time
5. **Reversible**: All changes are in Git-tracked JSON files

## Next Steps

To implement VLM integration:

1. Install Anthropic SDK: `npm install @anthropic-ai/sdk`
2. Set up API key: `export ANTHROPIC_API_KEY=your_key`
3. Create a simple CLI or web UI to accept design requests
4. Use the templates above as starting points
5. Iterate based on real usage!

---

**This bridges the designer-developer gap by making code as malleable as a design tool.**
