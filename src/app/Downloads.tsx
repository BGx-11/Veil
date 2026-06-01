import React, { useEffect, useState } from 'react';
import { Download, File, FolderOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  savePath: string;
}

export default function Downloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  useEffect(() => {
    // Initial fetch
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.getDownloads().then(setDownloads);
      
      // Listen for updates
      (window as any).electronAPI.onDownloadUpdated((dl: DownloadItem) => {
        setDownloads((prev) => {
          const idx = prev.findIndex(d => d.id === dl.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = dl;
            return next;
          }
          return [dl, ...prev];
        });
      });
    }
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getPercent = (dl: DownloadItem) => {
    if (dl.totalBytes === 0) return 0;
    return Math.round((dl.receivedBytes / dl.totalBytes) * 100);
  };

  const openFile = (path: string) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.openFile(path);
    }
  };

  return (
    <div style={{ padding: '40px', color: 'var(--text-1)', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', marginBottom: '30px' }}>
        <Download size={24} color="var(--purple)" /> Downloads
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {downloads.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', background: 'var(--surface)', borderRadius: '12px' }}>
            No downloads yet.
          </div>
        ) : (
          downloads.map(dl => (
            <div key={dl.id} style={{ 
              background: 'var(--surface)', 
              borderRadius: '12px', 
              padding: '20px', 
              border: '1px solid var(--surface-hover)',
              display: 'flex',
              gap: '20px',
              alignItems: 'center'
            }}>
              <div style={{ 
                width: '48px', height: '48px', 
                background: dl.state === 'completed' ? 'rgba(191,90,242,0.1)' : 'var(--surface-hover)',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: dl.state === 'completed' ? 'var(--purple)' : 'var(--text-2)'
              }}>
                {dl.state === 'completed' ? <CheckCircle2 size={24} /> : <File size={24} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', marginBottom: '4px', wordBreak: 'break-all' }}>{dl.filename}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-3)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span>{dl.url}</span>
                </div>

                {dl.state === 'progressing' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)', marginBottom: '4px' }}>
                      <span>{formatBytes(dl.receivedBytes)} / {formatBytes(dl.totalBytes)}</span>
                      <span>{getPercent(dl)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${getPercent(dl)}%`, height: '100%', background: 'var(--purple)', transition: 'width 0.2s' }} />
                    </div>
                  </div>
                )}
                
                {dl.state === 'cancelled' || dl.state === 'interrupted' ? (
                  <div style={{ marginTop: '8px', color: 'var(--red)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Download {dl.state}
                  </div>
                ) : null}
              </div>

              {dl.state === 'completed' && (
                <button 
                  onClick={() => openFile(dl.savePath)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--surface-hover)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--text-1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--surface-active)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                >
                  <FolderOpen size={14} /> Open
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
