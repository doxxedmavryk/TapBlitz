/**
 * Polyfills for Beacon SDK / Taquito compatibility
 * This file must be imported FIRST before any other imports
 */

import { Buffer } from 'buffer';

// Setup global polyfills
if (typeof window !== 'undefined') {
  // Buffer
  (window as any).Buffer = Buffer;
  (window as any).global = window;

  // Process
  if (!(window as any).process) {
    (window as any).process = {
      env: {},
      version: '',
      nextTick: (fn: Function) => setTimeout(fn, 0),
    };
  }
}

console.log('[POLYFILLS] Buffer and global polyfills initialized');

export {};
