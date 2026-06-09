import React, { useEffect, useState } from 'react';
import { Download, File, FolderOpen, AlertCircle, CheckCircle2, Pause, Play, X, Trash2 } from 'lucide-react';

interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  savePath: string;
  startTime?: number;
  isPaused?: boolean;
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

  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

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

  const getSpeed = (dl: DownloadItem) => {
    if (!dl.startTime || dl.state !== 'progressing' || dl.isPaused) return '';
    const elapsed = (Date.now() - dl.startTime) / 1000;
    if (elapsed < 1) return '';
    const speed = dl.receivedBytes / elapsed;
    return `${formatBytes(speed)}/s`;
  };

  const getETA = (dl: DownloadItem) => {
    if (!dl.startTime || dl.state !== 'progressing' || dl.isPaused || dl.totalBytes === 0) return '';
    const elapsed = (Date.now() - dl.startTime) / 1000;
    if (elapsed < 1) return '';
    const speed = dl.receivedBytes / elapsed;
    if (speed === 0) return '';
    const remaining = (dl.totalBytes - dl.receivedBytes) / speed;
    if (remaining < 60) return `${Math.ceil(remaining)}s left`;
    if (remaining < 3600) return `${Math.ceil(remaining / 60)}m left`;
    return `${Math.floor(remaining / 3600)}h ${Math.ceil((remaining % 3600) / 60)}m left`;
  };

  const openFile = (path: string) => api?.openFile(path);
  const pauseDownload = (id: string) => api?.pauseDownload(id);
  const resumeDownload = (id: string) => api?.resumeDownload(id);
  const cancelDownload = (id: string) => api?.cancelDownload(id);
  const clearCompleted = () => {
    api?.clearCompletedDownloads();
    setDownloads(prev => prev.filter(d => d.state === 'progressing'));
  };

  const hasCompleted = downloads.some(d => d.state !== 'progressing');

  return (
    <div style={{ padding: '40px', color: 'var(--text-1)', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px' }}>
          <Download size={24} color="var(--purple)" /> Downloads
        </h1>
        {hasCompleted && (
          <button
            onClick={clearCompleted}
            style={{
              padding: '8px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            <Trash2 size={14} /> Clear Completed
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {downloads.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-3)', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <Download size={48} color="var(--text-4)" style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No downloads yet</p>
            <span style={{ fontSize: '13px', color: 'var(--text-4)' }}>Files you download will appear here.</span>
          </div>
        ) : (
          downloads.map(dl => (
            <div key={dl.id} style={{ 
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px', 
              padding: '20px', 
              border: '1px solid var(--glass-border)',
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}>
              <div style={{ 
                width: '48px', height: '48px', 
                background: dl.state === 'completed' ? 'rgba(50,215,75,0.1)' : dl.state === 'progressing' ? 'rgba(0,122,255,0.1)' : 'rgba(255,69,58,0.1)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: dl.state === 'completed' ? 'var(--green)' : dl.state === 'progressing' ? 'var(--accent)' : 'var(--red)',
                flexShrink: 0,
              }}>
                {dl.state === 'completed' ? <CheckCircle2 size={24} /> : dl.state === 'progressing' ? <Download size={24} /> : <AlertCircle size={24} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dl.filename}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dl.url}
                </div>

                {dl.state === 'progressing' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>
                      <span>{formatBytes(dl.receivedBytes)} / {formatBytes(dl.totalBytes)}</span>
                      <span style={{ display: 'flex', gap: '12px' }}>
                        {getSpeed(dl) && <span style={{ color: 'var(--accent)' }}>{getSpeed(dl)}</span>}
                        {getETA(dl) && <span style={{ color: 'var(--text-3)' }}>{getETA(dl)}</span>}
                        <span>{getPercent(dl)}%</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'var(--surface-active)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${getPercent(dl)}%`, 
                        height: '100%', 
                        background: dl.isPaused ? 'var(--orange)' : 'var(--accent)', 
                        transition: 'width 0.3s, background 0.3s',
                        borderRadius: '2px',
                        boxShadow: dl.isPaused ? 'none' : '0 0 8px var(--accent-glow)',
                      }} />
                    </div>
                  </div>
                )}
                
                {(dl.state === 'cancelled' || dl.state === 'interrupted') && (
                  <div style={{ marginTop: '8px', color: 'var(--red)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Download {dl.state}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {dl.state === 'progressing' && (
                  <>
                    <button
                      onClick={() => dl.isPaused ? resumeDownload(dl.id) : pauseDownload(dl.id)}
                      style={{
                        width: '36px', height: '36px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title={dl.isPaused ? 'Resume' : 'Pause'}
                    >
                      {dl.isPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <button
                      onClick={() => cancelDownload(dl.id)}
                      style={{
                        width: '36px', height: '36px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--red)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                {dl.state === 'completed' && (
                  <button 
                    onClick={() => openFile(dl.savePath)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FolderOpen size={14} /> Open
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
