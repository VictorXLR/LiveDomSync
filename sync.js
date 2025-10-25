#!/usr/bin/env node

/**
 * LiveDOMSync - Source File Sync Tool
 *
 * Applies DOM state changes from JSON files back to source HTML files
 *
 * Usage:
 *   node sync.js <html-file> <state-file>
 *   node sync.js test.html src/.live-dom/dom-state.json
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

class HTMLSyncer {
  /**
   * Syncs DOM state from JSON file to HTML source file
   * @param {string} htmlFilePath - Path to the HTML file to update
   * @param {string} stateFilePath - Path to the JSON state file
   * @returns {Promise<{updated: number, errors: string[]}>}
   */
  async sync(htmlFilePath, stateFilePath) {
    const result = {
      updated: 0,
      errors: []
    };

    try {
      // Read files
      const htmlContent = await readFile(htmlFilePath, 'utf-8');
      const stateContent = await readFile(stateFilePath, 'utf-8');
      const state = JSON.parse(stateContent);

      if (!state.elements || !Array.isArray(state.elements)) {
        throw new Error('Invalid state file: missing elements array');
      }

      let updatedHTML = htmlContent;

      // Process each element in the state
      for (const element of state.elements) {
        try {
          updatedHTML = this.updateElement(updatedHTML, element);
          result.updated++;
        } catch (err) {
          result.errors.push(`Failed to update ${element.selector}: ${err.message}`);
        }
      }

      // Write updated HTML back to file
      await writeFile(htmlFilePath, updatedHTML, 'utf-8');

      return result;
    } catch (err) {
      result.errors.push(`Sync failed: ${err.message}`);
      return result;
    }
  }

  /**
   * Updates a single element in the HTML content
   * @param {string} html - The HTML content
   * @param {object} element - Element data from state
   * @returns {string} - Updated HTML content
   */
  updateElement(html, element) {
    const { selector, attributes, styles, textContent } = element;

    // Extract data-live-id from selector
    const liveIdMatch = selector.match(/data-live-id="([^"]+)"/);
    if (!liveIdMatch) {
      throw new Error('Invalid selector: missing data-live-id');
    }

    const liveId = liveIdMatch[1];

    // Find the element in HTML by data-live-id
    // This regex matches opening tag with the specific data-live-id
    const elementRegex = new RegExp(
      `(<[^>]*data-live-id="${liveId}"[^>]*>)([^<]*)(</[^>]+>)?`,
      'g'
    );

    html = html.replace(elementRegex, (match, openTag, content, closeTag) => {
      let updatedOpenTag = openTag;

      // Update attributes
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          if (key === 'data-live-id') continue; // Don't modify data-live-id

          const attrRegex = new RegExp(`${key}="[^"]*"`, 'g');
          const newAttr = `${key}="${value}"`;

          if (attrRegex.test(updatedOpenTag)) {
            // Update existing attribute
            updatedOpenTag = updatedOpenTag.replace(attrRegex, newAttr);
          } else {
            // Add new attribute
            updatedOpenTag = updatedOpenTag.replace(/(\s*)>$/, ` ${newAttr}$1>`);
          }
        }
      }

      // Update inline styles
      if (styles && Object.keys(styles).length > 0) {
        const styleString = Object.entries(styles)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');

        const styleRegex = /style="[^"]*"/g;
        const newStyle = `style="${styleString}"`;

        if (styleRegex.test(updatedOpenTag)) {
          // Update existing style attribute
          updatedOpenTag = updatedOpenTag.replace(styleRegex, newStyle);
        } else {
          // Add new style attribute
          updatedOpenTag = updatedOpenTag.replace(/(\s*)>$/, ` ${newStyle}$1>`);
        }
      }

      // Update text content
      let updatedContent = content;
      if (textContent !== undefined && textContent !== null && textContent.trim() !== '') {
        updatedContent = textContent;
      }

      return updatedOpenTag + updatedContent + (closeTag || '');
    });

    return html;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node sync.js <html-file> <state-file>');
    console.error('');
    console.error('Example:');
    console.error('  node sync.js test.html src/.live-dom/dom-state.json');
    process.exit(1);
  }

  const htmlFile = resolve(args[0]);
  const stateFile = resolve(args[1]);

  // Validate files exist
  if (!existsSync(htmlFile)) {
    console.error(`Error: HTML file not found: ${htmlFile}`);
    process.exit(1);
  }

  if (!existsSync(stateFile)) {
    console.error(`Error: State file not found: ${stateFile}`);
    process.exit(1);
  }

  console.log('[Sync] Starting sync...');
  console.log(`[Sync] HTML file: ${htmlFile}`);
  console.log(`[Sync] State file: ${stateFile}`);

  const syncer = new HTMLSyncer();
  const result = await syncer.sync(htmlFile, stateFile);

  console.log(`[Sync] Updated ${result.updated} elements`);

  if (result.errors.length > 0) {
    console.error(`[Sync] Encountered ${result.errors.length} errors:`);
    result.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log('[Sync] ✓ Sync completed successfully');
}

// Run CLI if executed directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1]);
if (isMainModule || process.argv[1]?.includes('sync.js')) {
  main().catch(err => {
    console.error('[Sync] Fatal error:', err);
    process.exit(1);
  });
}

export { HTMLSyncer };
