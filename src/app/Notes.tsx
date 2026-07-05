'use client';

import React, { useState, useEffect } from 'react';
import { useBrowserStore, type Note } from '@/lib/store';
import { Plus, Trash2, FileText, Search, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Notes() {
  const { settings, updateSettings } = useBrowserStore();
  const notes = settings.notes || [];
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');

  const activeNote = notes.find(n => n.id === activeNoteId);

  const createNote = () => {
    const newNote: Note = {
      id: Math.random().toString(36).slice(2, 11),
      title: 'Untitled Note',
      content: '',
      updatedAt: Date.now()
    };
    updateSettings({ notes: [newNote, ...notes] });
    setActiveNoteId(newNote.id);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    updateSettings({
      notes: notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n).sort((a, b) => b.updatedAt - a.updatedAt)
    });
  };

  const deleteNote = (id: string) => {
    const newNotes = notes.filter(n => n.id !== id);
    updateSettings({ notes: newNotes });
    if (activeNoteId === id) {
      setActiveNoteId(newNotes[0]?.id || null);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex w-full h-full bg-transparent overflow-hidden text-[var(--text-primary)]">
      {/* Sidebar List */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-[var(--glass-border)]" style={{ background: 'var(--glass-bg)' }}>
        <div className="p-4 flex flex-col gap-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText size={18} className="text-purple-500" />
              Secure Notes
            </h2>
            <button 
              onClick={createNote}
              className="p-1.5 rounded-full hover:bg-[var(--glass-bg-hover)] transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-active)] focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all group ${activeNoteId === note.id ? 'bg-purple-500/10 border border-purple-500/20' : 'hover:bg-[var(--glass-bg-hover)] border border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h3 className="font-medium text-sm truncate">{note.title || 'Untitled Note'}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-[var(--text-tertiary)] transition-all rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                  <span className="truncate flex-1">{note.content.substring(0, 40) || 'No content...'}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock size={10} />
                    {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 relative" style={{ background: 'var(--glass-bg-active)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
        {activeNote ? (
          <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-8 md:p-12 z-10">
            <input 
              type="text"
              value={activeNote.title}
              onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
              placeholder="Note Title"
              className="text-4xl font-bold bg-transparent border-none outline-none placeholder-[var(--text-tertiary)] mb-6"
            />
            <textarea
              value={activeNote.content}
              onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
              placeholder="Start typing your secure note here..."
              className="flex-1 resize-none bg-transparent border-none outline-none text-[var(--text-secondary)] text-lg leading-relaxed placeholder-[var(--text-tertiary)]"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)] z-10">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
