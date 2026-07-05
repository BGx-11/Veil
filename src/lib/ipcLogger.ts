import { invoke } from '@tauri-apps/api/core';
import { useBrowserStore } from './store';

/**
 * A central error-logging service wrapping Tauri `invoke` calls.
 * Catches errors, logs them to the console, and triggers UI Toasts for critical failures.
 */
export async function safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    if (typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__) {
      console.warn(`[Tauri Mock] ${cmd} called but Tauri is not available in this environment.`);
      return null;
    }
    const result = await invoke<T>(cmd, args);
    return result;
  } catch (error: any) {
    console.error(`[IPC Error] Failed to invoke '${cmd}':`, error);
    
    // Provide user feedback via toast
    const message = error?.message || error || `Failed to execute: ${cmd}`;
    useBrowserStore.getState().addToast(`System Error: ${message}`, 'warning');
    
    return null;
  }
}

/**
 * Invokes without waiting, used for 'fire and forget' operations
 * like closing a window where we don't care about the result.
 */
export function fireInvoke(cmd: string, args?: any): void {
  if (typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__) {
    return;
  }
  invoke(cmd, args).catch((error) => {
    console.error(`[IPC Error (Fire & Forget)] Failed to invoke '${cmd}':`, error);
  });
}
