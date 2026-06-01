import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, ChevronRight, Loader2, Trash } from 'lucide-react';
import { getSLMPipeline, removeSLMProgressCallback } from '@/lib/slm';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function SLMPanel({ isOpen, onClose, currentContext }: { isOpen: boolean, onClose: () => void, currentContext?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am Veil AI. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadingText, setLoadingText] = useState('Checking Engine Status...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const generatorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize WebWorker or direct pipeline
    // For this prototype, we'll try to load a tiny model or mock it if unavailable
    let alive = true;
    const progressCb = (data: any) => {
      if (!alive) return;
      if (data.status === 'downloading') {
        setLoadingText(`Downloading Veil Neural Engine...`);
        setDownloadProgress((data.loaded / data.total) * 100);
      } else if (data.status === 'init') {
        setLoadingText('Initializing AI Engine...');
        setDownloadProgress(0);
      } else if (data.status === 'ready') {
        setLoadingText('Model ready!');
      }
    };

    const initModel = async () => {
      try {
        generatorRef.current = await getSLMPipeline(progressCb);
        if (alive) {
          setModelReady(true);
          setModelError(null);
        }
      } catch (err: any) {
        if (alive) {
          console.warn("Could not load AI model", err);
          setModelError(`Error: ${err.message}`);
          setModelReady(true); // fall back to mock
        }
      }
    };
    initModel();
    return () => {
      alive = false;
      removeSLMProgressCallback(progressCb);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      if (generatorRef.current) {
        const systemPrompt = `You are Veil AI, a highly direct, offline browser assistant. You always answer with at most two sentences. You never use filler phrases like "Sure thing" or "I'd be happy to". If the user asks for a website like youtube, you only output its URL. You know that Tor is an anonymous network.`;

        const messagesArray = [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.role !== 'system'),
          { role: 'user', content: currentContext ? `Context from page:\n${currentContext}\n\n${userMsg}` : userMsg }
        ];
        
        const result = await generatorRef.current(messagesArray, {
          max_new_tokens: 150,
          temperature: 0.7,
          top_p: 0.95,
          repetition_penalty: 1.15,
          do_sample: true
        });
        
        let generatedText = result[0].generated_text;
        if (Array.isArray(generatedText)) {
          generatedText = generatedText[generatedText.length - 1].content;
        } else if (typeof generatedText === 'string') {
          const splitStr = '<|assistant|>\n';
          if (generatedText.includes(splitStr)) {
            generatedText = generatedText.split(splitStr).pop()?.trim() || generatedText;
          }
        }

        setMessages(prev => [...prev, { role: 'assistant', content: generatedText }]);
      } else {
        // Mock response if model failed to load
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: "I'm currently in lightweight offline mode. I've received your message: " + userMsg }]);
        }, 1000);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="slm-panel">
      <div className="slm-header">
        <div className="slm-title">
          <Sparkles size={16} color="var(--purple)" />
          <span>Veil AI</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="slm-close" onClick={() => setMessages([{ role: 'assistant', content: 'Hello! I am Veil AI. How can I help you today?' }])} title="Clear Chat"><Trash size={14} /></button>
          <button className="slm-close" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div className="slm-chat-area">
        {!modelReady && (
          <div className="slm-loading-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="slm-loading-model" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)' }}>
              <Loader2 className="slm-spin" size={16} />
              <span>{loadingText}</span>
            </div>
            {downloadProgress > 0 && !modelError && (
              <div style={{ width: '80%', height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'var(--purple)', transition: 'width 0.2s', boxShadow: '0 0 10px var(--purple)' }} />
              </div>
            )}
            {modelError && (
              <div style={{ width: '80%', padding: '10px', background: 'var(--red)', color: '#fff', fontSize: '11px', borderRadius: '4px', marginTop: '10px', wordBreak: 'break-all' }}>
                {modelError}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`slm-message ${m.role}`}>
            {m.role === 'assistant' && <div className="slm-avatar"><Bot size={14} /></div>}
            <div className="slm-bubble">
              {m.content.split(/(https?:\/\/[^\s]+)/g).map((part, j) => {
                if (part.match(/(https?:\/\/[^\s]+)/)) {
                  return <a key={j} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple)', textDecoration: 'underline' }} onClick={(e) => e.stopPropagation()}>{part}</a>;
                }
                return <span key={j}>{part.split('\n').map((line, k) => <React.Fragment key={k}>{line}{k < part.split('\n').length - 1 ? <br/> : ''}</React.Fragment>)}</span>;
              })}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="slm-message assistant">
            <div className="slm-avatar"><Bot size={14} /></div>
            <div className="slm-typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="slm-input-area" onSubmit={handleSend}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder={modelReady ? "Ask Veil anything..." : "Neural Engine loading..."}
          disabled={!modelReady}
        />
        <button type="submit" disabled={!input.trim() || isTyping || !modelReady} className="slm-send-btn">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
