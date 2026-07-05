'use client';

import { useBrowserStore, isInternal } from '@/lib/store';
import html2canvas from 'html2canvas';

/**
 * Takes a screenshot of the currently active tab's iframe and copies to clipboard + triggers download.
 * Falls back to a toast if the tab is an internal page or the iframe is cross-origin.
 */
export async function captureScreenshot(addToast: (msg: string, type?: 'success' | 'info' | 'warning') => void, wvRefs: React.MutableRefObject<Record<string, HTMLIFrameElement>>) {
  const { tabs, activeId } = useBrowserStore.getState();
  const active = tabs.find(t => t.id === activeId);

  if (!active) {
    addToast('No active tab to capture', 'warning');
    return;
  }

  if (isInternal(active.url)) {
    // For internal pages, capture the main content frame
    try {
      const mainContent = document.querySelector('.content-frame') as HTMLElement;
      if (!mainContent) {
        addToast('Could not find page content to capture', 'warning');
        return;
      }

      const canvas = await html2canvas(mainContent, { useCORS: true });
      canvas.toBlob(async (blob: Blob | null) => {
        if (blob) {
          await copyBlobToClipboard(blob, addToast);
        }
      }, 'image/png');
    } catch (err) {
      addToast('Failed to capture screenshot', 'warning');
    }
    return;
  }

  // For iframe content, try to capture the iframe
  const iframe = wvRefs.current[activeId];
  if (!iframe) {
    addToast('No page content to capture', 'warning');
    return;
  }

  try {
    // Try to access iframe content (same-origin only via proxy)
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc && doc.body) {
      const canvas = await html2canvas(doc.body, { 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          await copyBlobToClipboard(blob, addToast);
        }
      }, 'image/png');
    } else {
      throw new Error('Cannot access page content');
    }
  } catch (err) {
    // Cross-origin restriction or other error
    try {
      const rect = iframe.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#333';
        ctx.fillText(`Screenshot of: ${active.title}`, 20, 40);
        ctx.fillText(`URL: ${active.url}`, 20, 70);
        ctx.fillStyle = '#999';
        ctx.fillText('Full page screenshots require same-origin access', 20, canvas.height - 30);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            await copyBlobToClipboard(blob, addToast);
          }
        });
      }
    } catch (_) {
      addToast('Screenshot failed', 'warning');
    }
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
