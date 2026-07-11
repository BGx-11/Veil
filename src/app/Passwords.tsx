'use client';

import React, { useState, useMemo } from 'react';
import { Lock, Search, Plus, Trash2, Key, Globe, Eye, EyeOff, ShieldCheck, Copy, ShieldAlert } from 'lucide-react';
import { useBrowserStore, PasswordEntry } from '@/lib/store';

export default function Passwords() {
  const { settings, updateSettings, addToast } = useBrowserStore();
  const passwords = settings.passwords || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  
  const [formData, setFormData] = useState({ domain: '', username: '', password: '' });
  const [isAdding, setIsAdding] = useState(false);

  const filteredPasswords = useMemo(() => {
    if (!searchQuery.trim()) return passwords;
    const query = searchQuery.toLowerCase();
    return passwords.filter(p => 
      p.domain.toLowerCase().includes(query) || 
      p.username.toLowerCase().includes(query)
    );
  }, [passwords, searchQuery]);

  const handleSave = () => {
    if (!formData.domain || !formData.username || !formData.password) {
      addToast('Please fill all fields', 'warning');
      return;
    }

    if (editingId) {
      const updated = passwords.map(p => 
        p.id === editingId ? { ...p, ...formData, updatedAt: Date.now() } : p
      );
      updateSettings({ passwords: updated });
      addToast('Password updated successfully', 'success');
    } else {
      const newEntry: PasswordEntry = {
        id: Math.random().toString(36).slice(2, 11),
        ...formData,
        updatedAt: Date.now()
      };
      updateSettings({ passwords: [...passwords, newEntry] });
      addToast('Password saved securely', 'success');
    }
    
    setEditingId(null);
    setFormData({ domain: '', username: '', password: '' });
    setIsAdding(false);
  };

  const handleEdit = (entry: PasswordEntry) => {
    setEditingId(entry.id);
    setFormData({ domain: entry.domain, username: entry.username, password: entry.password });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      title: 'Delete Password',
      message: 'Are you sure you want to delete this password? This action cannot be undone.',
      onConfirm: () => {
        updateSettings({ passwords: passwords.filter(p => p.id !== id) });
        addToast('Password deleted', 'info');
      }
    });
  };

  const toggleVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addToast(`${label} copied to clipboard`, 'success');
    }).catch(() => {
      addToast('Failed to copy', 'warning');
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-transparent relative flex flex-col pt-16 pb-20 px-8">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-[var(--text-primary)] mb-2 flex items-center gap-3">
              <Lock className="text-[var(--accent-primary)]" size={32} />
              Password Manager
            </h1>
            <p className="text-[var(--text-secondary)] flex items-center gap-2">
              <ShieldCheck size={16} className="text-green-500" />
              Your passwords are encrypted and stored locally in Veil.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ domain: '', username: '', password: '' });
              setIsAdding(true);
              // Smooth scroll to editor
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass-btn-accent text-white font-medium shadow-md transition-transform active:scale-95"
          >
            <Plus size={18} /> Add Password
          </button>
        </div>

        {/* Editor Panel */}
        {(isAdding || editingId || formData.domain !== '' || formData.username !== '' || formData.password !== '') && (
          <div className="glass-panel p-6 mb-8 animate-fade-in border border-[var(--accent-primary)] shadow-[0_0_20px_rgba(79,70,229,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Key size={100} />
            </div>
            
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
              {editingId ? 'Edit Password' : 'New Password'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Website / Domain</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"><Globe size={16} /></div>
                  <input
                    type="text"
                    placeholder="e.g. github.com"
                    value={formData.domain}
                    onChange={e => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input border border-[var(--glass-border)] text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Username / Email</label>
                <input
                  type="text"
                  placeholder="e.g. user@example.com"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg glass-input border border-[var(--glass-border)] text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Password</label>
                <div className="relative">
                  <input
                    type={showPasswordMap['editor'] ? 'text' : 'password'}
                    placeholder="Enter highly secure password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 pr-12 py-2.5 rounded-lg glass-input border border-[var(--glass-border)] text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('editor')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPasswordMap['editor'] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ domain: '', username: '', password: '' });
                  setIsAdding(false);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium glass-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl text-sm font-medium glass-btn-accent text-white transition-all shadow-md"
              >
                {editingId ? 'Save Changes' : 'Save Password'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-8">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search passwords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl glass-panel border border-[var(--glass-border)] text-[var(--text-primary)] font-medium outline-none focus:border-[var(--accent-primary)] shadow-sm transition-all"
          />
        </div>

        {/* Password List */}
        {filteredPasswords.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full glass-btn text-[var(--text-tertiary)] flex items-center justify-center mb-4">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No passwords found</h3>
            <p className="text-[var(--text-secondary)]">
              {searchQuery ? 'Try adjusting your search terms.' : 'Store your credentials securely in Veil.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPasswords.map(entry => {
              const isVisible = showPasswordMap[entry.id];
              return (
                <div key={entry.id} className="glass-panel p-5 flex flex-col gap-4 group transition-all hover:border-[var(--glass-border-hover)] hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0">
                        <img 
                          src={`https://icons.duckduckgo.com/ip3/${entry.domain}.ico`} 
                          alt="" 
                          className="w-5 h-5 rounded-sm"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-[var(--text-primary)] truncate">{entry.domain}</h4>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{entry.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(entry)} className="p-2 rounded-lg glass-btn text-[var(--text-secondary)] hover:text-[var(--accent-primary)]" title="Edit">
                        <Key size={14} />
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="p-2 rounded-lg glass-btn text-[var(--text-secondary)] hover:text-red-500" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative flex-1">
                      <input 
                        type={isVisible ? 'text' : 'password'}
                        value={entry.password}
                        readOnly
                        className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-lg px-3 py-1.5 text-sm font-mono text-[var(--text-primary)] outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => toggleVisibility(entry.id)}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors glass-btn"
                      title={isVisible ? "Hide" : "Show"}
                    >
                      {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button 
                      onClick={() => copyToClipboard(entry.password, 'Password')}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors glass-btn"
                      title="Copy Password"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="glass-panel-heavy p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 tracking-tight">
              {confirmModal.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setConfirmModal(null)} 
                className="px-4 py-2 rounded-xl text-sm font-medium glass-btn text-[var(--text-secondary)] hover:bg-[var(--surface-icon-hover)] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium glass-btn-accent shadow-md transition-all text-red-50"
                style={{ background: 'var(--danger)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
