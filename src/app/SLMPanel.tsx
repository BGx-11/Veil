import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, X, Loader2, Trash, Settings, Download, ChevronDown, Square, Languages, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { getSLMPipeline, removeSLMProgressCallback, RECOMMENDED_MODELS, getActiveModelId, setActiveModelId } from '@/lib/slm';
import { useBrowserStore } from '@/lib/store';

interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

export default function SLMPanel({ isOpen, onClose, currentContext }: { isOpen: boolean, onClose: () => void, currentContext?: string }) {
  const { settings, updateSettings } = useBrowserStore();
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'Hello! I am Veil AI. How can I help you today?' }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadingText, setLoadingText] = useState('Checking Engine Status...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const generatorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !settings.slmConsent) return;
    setCurrentModel(getActiveModelId());
    initModel();
  }, [isOpen, settings.slmConsent]);

  const initModel = async () => {
    let alive = true;
    setModelReady(false); setModelError(null); setDownloadProgress(0); setLoadingText('Initializing AI Engine...');
    const progressCb = (data: any) => {
      if (!alive) return;
      if (data.status === 'downloading') { setLoadingText(`Downloading Neural Engine...`); setDownloadProgress((data.loaded / data.total) * 100); }
      else if (data.status === 'init') { setLoadingText('Loading Engine to Memory...'); setDownloadProgress(0); }
      else if (data.status === 'ready') { setLoadingText('Model ready!'); setDownloadProgress(100); }
    };
    try {
      generatorRef.current = await getSLMPipeline(progressCb);
      if (alive) { setModelReady(true); setModelError(null); }
    } catch (err: any) {
      if (alive) { console.warn("Could not load AI model", err); setModelError(`Error: ${err.message}`); setModelReady(true); }
    }
    return () => { alive = false; removeSLMProgressCallback(progressCb); };
  };

  const switchModel = (modelId: string) => {
    if (modelId === currentModel) return;
    setActiveModelId(modelId); setCurrentModel(modelId); setShowSettings(false);
    setMessages([{ role: 'assistant', content: `Switched to ${RECOMMENDED_MODELS.find(m => m.id === modelId)?.name}. How can I help?` }]);
    initModel();
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent, overrideMsg?: string) => {
    e?.preventDefault();
    const userMsg = overrideMsg || input.trim();
    if (!userMsg || isTyping) return;
    setInput(''); setMessages(prev => [...prev, { role: 'user', content: userMsg }]); setIsTyping(true);
    
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    try {
      if (generatorRef.current && !modelError) {
        const systemPrompt = `You are Veil AI, an advanced, secure, and highly intelligent browser assistant built directly into the Veil Browser. Your primary goal is to provide accurate, helpful, and exceptionally well-reasoned answers. You must NOT hallucinate features, URLs, or download packages (e.g., do not say "The internal link veil refers to a download package"). Keep responses concise unless asked for details.`;
        const messagesArray = [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.role !== 'system'),
          { role: 'user', content: currentContext ? `Context from page:\n${currentContext}\n\n${userMsg}` : userMsg }
        ];
        const callback = () => { if (newAbortController.signal.aborted) throw new Error("Generation aborted by user"); };
        const result = await generatorRef.current(messagesArray, { max_new_tokens: 250, temperature: 0.3, top_p: 0.95, repetition_penalty: 1.15, do_sample: true, callback_function: callback });
        if (newAbortController.signal.aborted) return;
        let finalResp = result[0].generated_text;
        if (Array.isArray(finalResp)) finalResp = finalResp[finalResp.length - 1].content;
        else if (typeof finalResp === 'string') {
          if (finalResp.includes('<|assistant|>\n')) finalResp = finalResp.split('<|assistant|>\n').pop()?.trim() || finalResp;
          if (finalResp.length > 800) finalResp = finalResp.substring(0, 800) + '...';
        }
        setMessages(prev => [...prev, { role: 'assistant', content: finalResp }]);
      } else {
        setTimeout(() => {
          if (!newAbortController.signal.aborted) setMessages(prev => [...prev, { role: 'assistant', content: "Offline mode: " + userMsg }]);
        }, 1000);
      }
    } catch (err: any) {
      if (err.message !== "Generation aborted by user") setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
      else setMessages(prev => [...prev, { role: 'assistant', content: '*(Generation Stopped)*' }]);
    } finally {
      setIsTyping(false); setAbortController(null);
    }
  };

  const handleStop = () => abortController?.abort();
  const translatePage = (lang: string = "English") => {
    setTranslateOpen(false);
    handleSend(undefined, `Please translate the content of this page to ${lang}.`);
  };
  const summarizePage = () => handleSend(undefined, "Please summarize the content of this page.");

  if (!isOpen) return null;

  return (
    <motion.div
      className="absolute top-0 right-0 h-full flex flex-col z-40 flex-shrink-0 glass-panel-heavy border-l border-white/20 shadow-[-10px_0_30px_rgba(0,0,0,0.05)]"
      style={{ width: '380px' }}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 bg-transparent">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-3 py-2 -ml-2 rounded-xl glass-btn transition-colors"
        >
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <span className="font-semibold text-[14px] text-[var(--text-primary)]">Veil AI</span>
          <ChevronDown size={14} className={`text-[var(--text-tertiary)] transition-transform ${showSettings ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-3 relative">
          <button
            onClick={summarizePage}
            title="Summarize Page"
            className="w-8 h-8 flex items-center justify-center rounded-xl glass-btn text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-primary)]"
          >
            <FileText size={14} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => {
                if (showSettings) setShowSettings(false);
                setTranslateOpen(!translateOpen);
              }}
              title="Translate Page"
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${translateOpen ? 'glass-panel shadow-inner text-[var(--accent-primary)] border border-indigo-200/50' : 'glass-btn text-[var(--text-secondary)]'}`}
            >
              <Languages size={14} />
            </button>
            <AnimatePresence>
              {translateOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-40 glass-panel-heavy p-2 z-50 flex flex-col gap-1 rounded-xl shadow-xl border border-[var(--glass-border)]"
                >
                  <span className="text-xs font-semibold px-2 py-1 text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Translate To</span>
                  {['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Chinese'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => translatePage(lang)}
                      className="text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-[var(--glass-bg-hover)] text-[var(--text-primary)] transition-colors"
                    >
                      {lang}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setMessages([{ role: 'assistant', content: 'Hello! I am Veil AI. How can I help you today?' }])}
            title="Clear Chat"
            className="w-8 h-8 flex items-center justify-center rounded-xl glass-btn text-[var(--text-secondary)] transition-colors"
          >
            <Trash size={14} />
          </button>
          <div className="w-px h-6 bg-slate-300 opacity-30" />
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl glass-btn text-[var(--accent-danger)] transition-colors hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4">
        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              className="absolute inset-0 z-10 p-4 bg-[var(--bg-element)]/95 backdrop-blur-md flex flex-col gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 px-1">Available Models</h4>
              {RECOMMENDED_MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => switchModel(model.id)}
                  className={`p-4 rounded-2xl text-left transition-all
                    ${currentModel === model.id 
                      ? 'glass-panel shadow-inner text-[var(--accent-primary)] border border-indigo-200/50' 
                      : 'glass-btn text-[var(--text-primary)]'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-semibold text-sm ${currentModel === model.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {model.name}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] opacity-70 px-2 py-0.5 rounded-full glass-panel">{model.size}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{model.desc}</p>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {!modelReady && !showSettings && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 size={32} className="animate-spin text-[var(--accent-primary)]" />
            <div className="text-sm font-medium text-[var(--text-secondary)]">
              {loadingText}
            </div>
            {downloadProgress > 0 && !modelError && (
              <div className="w-48 h-1.5 rounded-full bg-[var(--border-color)] overflow-hidden">
                <div 
                  className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            )}
            {modelError && (
              <div className="w-full p-3 rounded-lg text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 break-words">
                {modelError}
              </div>
            )}
          </div>
        )}

        {/* Chat Messages */}
        {modelReady && !showSettings && messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 glass-panel shadow-inner text-[var(--accent-primary)]">
                <Bot size={18} />
              </div>
            )}
            <div
              className={`px-5 py-3.5 max-w-[85%] ${
                m.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md rounded-2xl rounded-tr-md' 
                  : 'glass-panel text-[var(--text-primary)] rounded-2xl rounded-tl-md shadow-sm'
              }`}
            >
              {m.role === 'assistant' ? (
                <div className="markdown-body">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="text-sm font-medium">{m.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && !showSettings && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--surface-icon-bg)] text-[var(--accent-primary)]">
              <Bot size={16} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-element)] border border-[var(--border-color)]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-5 flex gap-3"
        style={{ opacity: showSettings ? 0.5 : 1, pointerEvents: showSettings ? 'none' : 'auto' }}
      >
        <div className="flex-1 glass-input rounded-2xl flex items-center">
          <input
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)}
            placeholder={modelReady ? "Message Veil AI..." : "Engine loading..."}
            disabled={!modelReady || showSettings}
            className="w-full px-5 py-3.5 bg-transparent border-none outline-none text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-medium"
          />
        </div>
        {isTyping ? (
          <button
            type="button"
            onClick={handleStop}
            className="w-12 h-12 flex items-center justify-center rounded-2xl glass-btn text-red-500 hover:text-red-600 transition-colors shadow-sm"
            title="Stop Generation"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || !modelReady || showSettings}
            className="w-12 h-12 flex items-center justify-center rounded-2xl glass-btn-accent text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
          >
            <Send size={18} className="ml-1" />
          </button>
        )}
      </form>
      
      {/* Consent Screen Overlay */}
      {!settings.slmConsent && (
        <div className="absolute inset-0 z-50 bg-[var(--bg-element)]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full glass-panel shadow-lg flex items-center justify-center text-[var(--accent-primary)] mb-6">
            <Sparkles size={32} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Enable Veil AI</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
            Veil AI runs a Small Language Model (SLM) entirely in your browser using WebGPU for ultimate privacy. 
            The initial download will require approximately <strong>~350MB - 800MB</strong> depending on the model.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-[250px]">
            <button 
              onClick={() => updateSettings({ slmConsent: true })}
              className="w-full py-3 rounded-xl glass-btn-accent text-white font-semibold transition-transform active:scale-95"
            >
              Download & Enable AI
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 rounded-xl glass-btn text-[var(--text-tertiary)] font-medium transition-colors hover:text-[var(--text-primary)]"
            >
              Not Right Now
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
