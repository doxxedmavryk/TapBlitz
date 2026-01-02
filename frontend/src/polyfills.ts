/**
 * Polyfills for Beacon SDK / Taquito compatibility
 * This file must be imported FIRST before any other imports
 *
 * Note: index.html has a synchronous Buffer shim that loads before this.
 * This module enhances it with the full buffer implementation.
 */

import { Buffer as BufferModule } from 'buffer';

// Enhance global polyfills with full buffer module
if (typeof window !== 'undefined') {
  // Replace the shim with full Buffer implementation
  (window as any).Buffer = BufferModule;
  (window as any).global = window;

  // Also set on globalThis for Node.js style access
  (globalThis as any).Buffer = BufferModule;

  // Process
  if (!(window as any).process) {
    (window as any).process = {
      env: {},
      version: 'v16.0.0',
      browser: true,
      nextTick: (fn: Function) => Promise.resolve().then(() => fn()),
    };
  }

  console.log('[POLYFILLS] Full Buffer module loaded:', typeof BufferModule, 'slice:', typeof BufferModule.prototype?.slice);
}

export { BufferModule as Buffer };
