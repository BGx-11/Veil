'use client';

import { useBrowserStore, isInternal } from '@/lib/store';
import html2canvas from 'html2canvas';

/**
 * Takes a screenshot of the currently active tab's iframe and copies to clipboard + triggers download.
 * Falls back to a toast if the tab is an internal page or the iframe is cross-origin.
 */
export async function captureScreenshot(addToast: (msg: string, type?: 'success' | 'info' | 'warning') => void) {
  try {
    // UI Feedback: Create a flash overlay
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-white z-[999999] opacity-80 pointer-events-none transition-opacity duration-500 ease-out';
    document.body.appendChild(flash);
    
    // Force reflow and start fade out
    flash.getBoundingClientRect();
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 500);
    });

    // Capture the entire browser window (PrtScn functionality)
    const canvas = await html2canvas(document.body, { 
      useCORS: true,
      logging: false,
      ignoreElements: (element) => element === flash
    });
    
    canvas.toBlob(async (blob: Blob | null) => {
      if (blob) {
        await copyBlobToClipboard(blob, addToast);
      }
    }, 'image/png');
  } catch (err) {
    addToast('Failed to capture screenshot', 'warning');
  }
}

async function copyBlobToClipboard(blob: Blob, addToast: (msg: string, type?: 'success' | 'info' | 'warning') => void) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    addToast('Screenshot copied to clipboard!', 'success');
  } catch (err) {
    // Fallback: download the image if clipboard fails
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veil-screenshot-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Screenshot saved to downloads', 'success');
  }
}
