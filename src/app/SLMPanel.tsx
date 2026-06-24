import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, X, Loader2, Trash, Settings, Download, ChevronDown, Square, Languages } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { getSLMPipeline, removeSLMProgressCallback, RECOMMENDED_MODELS, getActiveModelId, setActiveModelId } from '@/lib/slm';

interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

export default function SLMPanel({ isOpen, onClose, currentContext }: { isOpen: boolean, onClose: () => void, currentContext?: string }) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'Hello! I am Veil AI. How can I help you today?' }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadingText, setLoadingText] = useState('Checking Engine Status...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const generatorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentModel(getActiveModelId());
    initModel();
  }, [isOpen]);

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
        const systemPrompt = `You are Veil AI. Keep responses under 50 words unless asked. Just answer directly.`;
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
  const translatePage = () => handleSend(undefined, "Please translate the content of this page to English.");

  if (!isOpen) return null;

  return (
    <motion.div
      className="absolute top-0 right-0 h-full flex flex-col z-40 flex-shrink-0 bg-[var(--bg-element)]/80 backdrop-blur-2xl border-l border-[var(--border-color)] shadow-2xl"
      style={{ width: '380px' }}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-[var(--border-color)] bg-transparent">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg hover:bg-[var(--surface-icon-hover)] transition-colors"
        >
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <span className="font-semibold text-[14px] text-[var(--text-primary)]">Veil AI</span>
          <ChevronDown size={14} className={`text-[var(--text-tertiary)] transition-transform ${showSettings ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={translatePage}
            title="Translate Page"
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--surface-icon-bg)] text-[var(--text-secondary)] transition-colors"
          >
            <Languages size={14} />
          </button>
          <button
            onClick={() => setMessages([{ role: 'assistant', content: 'Hello! I am Veil AI. How can I help you today?' }])}
            title="Clear Chat"
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--surface-icon-bg)] text-[var(--text-secondary)] transition-colors"
          >
            <Trash size={14} />
          </button>
          <div className="w-px h-4 mx-1 bg-[var(--border-color)]" />
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500 hover:text-white text-[var(--text-secondary)] transition-colors"
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
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Available Models</h4>
              {RECOMMENDED_MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => switchModel(model.id)}
                  className={`p-4 rounded-xl text-left border transition-all
                    ${currentModel === model.id 
                      ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]' 
                      : 'bg-[var(--bg-base)] border-[var(--border-color)] hover:border-[var(--text-tertiary)]'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-semibold text-sm ${currentModel === model.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {model.name}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-icon-bg)] px-2 py-0.5 rounded-full">{model.size}</span>
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
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--surface-icon-bg)] text-[var(--accent-primary)]">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`px-4 py-2.5 rounded-2xl max-w-[85%] ${
                m.role === 'user' 
                  ? 'bg-[var(--accent-primary)] text-white rounded-tr-sm' 
                  : 'bg-[var(--bg-element)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-sm'
              }`}
            >
              {m.role === 'assistant' ? (
                <div className="markdown-body">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="text-sm">{m.content}</span>
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
        className="p-4 bg-[var(--bg-element)] border-t border-[var(--border-color)] flex gap-2"
        style={{ opacity: showSettings ? 0.5 : 1, pointerEvents: showSettings ? 'none' : 'auto' }}
      >
        <input
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)}
          placeholder={modelReady ? "Message Veil AI..." : "Engine loading..."}
          disabled={!modelReady || showSettings}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-[var(--bg-base)] border border-transparent focus:bg-[var(--bg-element)] focus:border-[var(--accent-primary)] outline-none transition-all text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
        />
        {isTyping ? (
          <button
            type="button"
            onClick={handleStop}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Stop Generation"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || !modelReady || showSettings}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        )}
      </form>
    </motion.div>
  );
}
