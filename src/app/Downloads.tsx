import React, { useEffect, useState } from 'react';
import { Download, FolderOpen, AlertCircle, CheckCircle2, Pause, Play, X, Trash2 } from 'lucide-react';

interface DownloadItem {
  id: string; filename: string; url: string; totalBytes: number;
  receivedBytes: number; state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  savePath: string; startTime?: number; isPaused?: boolean;
}

export default function Downloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  useEffect(() => {}, []);
  const api: any = null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getPercent = (dl: DownloadItem) => dl.totalBytes === 0 ? 0 : Math.round((dl.receivedBytes / dl.totalBytes) * 100);

  const getSpeed = (dl: DownloadItem) => {
    if (!dl.startTime || dl.state !== 'progressing' || dl.isPaused) return '';
    const elapsed = (Date.now() - dl.startTime) / 1000;
    if (elapsed < 1) return '';
    return `${formatBytes(dl.receivedBytes / elapsed)}/s`;
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

  function ActionButton({ onClick, title, danger, children }: { onClick: () => void; title?: string; danger?: boolean; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick} title={title}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: danger ? 'var(--danger)' : 'var(--text-secondary)' }}
        onMouseEnter={e => { e.currentTarget.style.background = danger ? 'var(--danger-surface)' : 'var(--glass-bg-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; }}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: 'transparent' }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="flex items-center gap-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            <Download size={22} style={{ color: 'var(--violet)' }} /> Downloads
          </h1>
          {hasCompleted && (
            <button
              onClick={clearCompleted}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'var(--glass-bg)', color: 'var(--text-tertiary)', border: '1px solid var(--glass-border)' }}
            >
              <Trash2 size={13} /> Clear Completed
            </button>
          )}
        </div>

        {/* Downloads List */}
        <div className="flex flex-col gap-3">
          {downloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-2xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <Download size={40} style={{ color: 'var(--text-ghost)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>No downloads yet</p>
              <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>Files you download will appear here.</span>
            </div>
          ) : (
            downloads.map(dl => (
              <div
                key={dl.id}
                className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
              >
                {/* Status icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: dl.state === 'completed' ? 'var(--success-surface)' : dl.state === 'progressing' ? 'var(--accent-surface)' : 'var(--danger-surface)',
                    color: dl.state === 'completed' ? 'var(--emerald)' : dl.state === 'progressing' ? 'var(--accent)' : 'var(--danger)',
                  }}
                >
                  {dl.state === 'completed' ? <CheckCircle2 size={20} /> : dl.state === 'progressing' ? <Download size={20} /> : <AlertCircle size={20} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{dl.filename}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-ghost)' }}>{dl.url}</div>

                  {dl.state === 'progressing' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                        <span>{formatBytes(dl.receivedBytes)} / {formatBytes(dl.totalBytes)}</span>
                        <span className="flex gap-3">
                          {getSpeed(dl) && <span style={{ color: 'var(--accent)' }}>{getSpeed(dl)}</span>}
                          {getETA(dl) && <span>{getETA(dl)}</span>}
                          <span>{getPercent(dl)}%</span>
                        </span>
                      </div>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg-active)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${getPercent(dl)}%`,
                            background: dl.isPaused ? 'var(--amber)' : 'var(--accent)',
                            boxShadow: dl.isPaused ? 'none' : 'var(--shadow-glow-accent)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {(dl.state === 'cancelled' || dl.state === 'interrupted') && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
                      <AlertCircle size={12} /> Download {dl.state}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {dl.state === 'progressing' && (
                    <>
                      <ActionButton onClick={() => dl.isPaused ? resumeDownload(dl.id) : pauseDownload(dl.id)} title={dl.isPaused ? 'Resume' : 'Pause'}>
                        {dl.isPaused ? <Play size={13} /> : <Pause size={13} />}
                      </ActionButton>
                      <ActionButton onClick={() => cancelDownload(dl.id)} title="Cancel" danger>
                        <X size={13} />
                      </ActionButton>
                    </>
                  )}
                  {dl.state === 'completed' && (
                    <button
                      onClick={() => openFile(dl.savePath)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                    >
                      <FolderOpen size={13} /> Open
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
