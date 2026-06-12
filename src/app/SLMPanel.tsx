import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, Loader2, Trash, Settings, Download, ChevronDown } from 'lucide-react';
import { getSLMPipeline, removeSLMProgressCallback, RECOMMENDED_MODELS, getActiveModelId, setActiveModelId } from '@/lib/slm';

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
  const [showSettings, setShowSettings] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('');
  
  const generatorRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentModel(getActiveModelId());
    initModel();
  }, [isOpen]);

  const initModel = async () => {
    let alive = true;
    setModelReady(false);
    setModelError(null);
    setDownloadProgress(0);
    setLoadingText('Initializing AI Engine...');

    const progressCb = (data: any) => {
      if (!alive) return;
      if (data.status === 'downloading') {
        setLoadingText(`Downloading Neural Engine...`);
        setDownloadProgress((data.loaded / data.total) * 100);
      } else if (data.status === 'init') {
        setLoadingText('Loading Engine to Memory...');
        setDownloadProgress(0);
      } else if (data.status === 'ready') {
        setLoadingText('Model ready!');
        setDownloadProgress(100);
      }
    };

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

    return () => {
      alive = false;
      removeSLMProgressCallback(progressCb);
    };
  };

  const switchModel = (modelId: string) => {
    if (modelId === currentModel) return;
    setActiveModelId(modelId);
    setCurrentModel(modelId);
    setShowSettings(false);
    setMessages([{ role: 'assistant', content: `Switched to ${RECOMMENDED_MODELS.find(m => m.id === modelId)?.name}. How can I help?` }]);
    initModel();
  };

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
      if (generatorRef.current && !modelError) {
        const systemPrompt = `You are Veil AI, a highly advanced assistant integrated directly into the Veil Browser. 
CRITICAL INSTRUCTIONS:
1. Keep responses under 50 words.
2. You are Veil AI, built into this browser.
3. DO NOT hallucinate fake UI menus, "hamburger menus", or step-by-step guides for things that don't exist.
4. Just answer the user's question directly and concisely.
5. If "Context from page:" is provided, use it to answer questions about the current website.`;

        const messagesArray = [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.role !== 'system'),
          { role: 'user', content: currentContext ? `Context from page:\n${currentContext}\n\n${userMsg}` : userMsg }
        ];
        
        const result = await generatorRef.current(messagesArray, {
          max_new_tokens: 150,
          temperature: 0.2,
          top_p: 0.95,
          repetition_penalty: 1.15,
          do_sample: true
        });
        
        let finalResp = result[0].generated_text;
        if (Array.isArray(finalResp)) {
          finalResp = finalResp[finalResp.length - 1].content;
        } else if (typeof finalResp === 'string') {
          if (finalResp.includes('<|assistant|>\n')) {
            finalResp = finalResp.split('<|assistant|>\n').pop()?.trim() || finalResp;
          }
          if (finalResp.length > 490) {
             finalResp = finalResp.substring(0, 490) + '...';
          }
        }
        setMessages(prev => [...prev, { role: 'assistant', content: finalResp }]);
      } else {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: "I'm currently in lightweight offline mode (or model failed to load). I've received: " + userMsg }]);
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
        <button className="slm-title" onClick={() => setShowSettings(!showSettings)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}>
          <Sparkles size={16} color="var(--purple)" />
          <span style={{ fontWeight: 600 }}>Veil AI <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'normal' }}>({RECOMMENDED_MODELS.find(m => m.id === currentModel)?.name || 'Unknown'})</span></span>
          <ChevronDown size={14} color="var(--text-3)" style={{ transition: 'transform 0.2s', transform: showSettings ? 'rotate(180deg)' : 'none' }} />
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="slm-close" onClick={() => setMessages([{ role: 'assistant', content: 'Hello! I am Veil AI. How can I help you today?' }])} title="Clear Chat">
            <Trash size={14} />
          </button>
          <button className="slm-close" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div className="slm-chat-area" style={{ position: 'relative' }}>
        
        {/* Model Manager Overlay */}
        {showSettings && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--surface)', zIndex: 10, padding: '15px', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'var(--text-1)' }}>Available Models</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {RECOMMENDED_MODELS.map(model => (
                <div key={model.id} style={{ padding: '12px', background: currentModel === model.id ? 'var(--surface-active)' : 'var(--surface-hover)', border: currentModel === model.id ? '1px solid var(--purple)' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => switchModel(model.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: currentModel === model.id ? 'var(--purple)' : 'var(--text-1)' }}>{model.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{model.size}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: 0 }}>{model.desc}</p>
                  {currentModel === model.id && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--purple)' }}></span> Active
                    </div>
                  )}
                  {currentModel !== model.id && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Download size={12} /> Click to download & switch
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!modelReady && !showSettings && (
          <div className="slm-loading-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="slm-loading-model" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)' }}>
              <Loader2 className="slm-spin" size={16} />
              <span>{loadingText}</span>
            </div>
            {downloadProgress > 0 && !modelError && (
              <div style={{ width: '80%', height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'var(--purple)', transition: 'width 0.2s', boxShadow: '0 0 10px var(--purple)' }} />
              </div>
            )}
            {modelError && (
              <div style={{ width: '80%', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '11px', borderRadius: '4px', marginTop: '10px', wordBreak: 'break-all' }}>
                {modelError}
              </div>
            )}
          </div>
        )}
        
        {modelReady && !showSettings && messages.map((m, i) => (
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
        {isTyping && !showSettings && (
          <div className="slm-message assistant">
            <div className="slm-avatar"><Bot size={14} /></div>
            <div className="slm-typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="slm-input-area" onSubmit={handleSend} style={{ opacity: showSettings ? 0.5 : 1, pointerEvents: showSettings ? 'none' : 'auto' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder={modelReady ? "Ask Veil anything..." : "Neural Engine loading..."}
          disabled={!modelReady || showSettings}
        />
        <button type="submit" disabled={!input.trim() || isTyping || !modelReady || showSettings} className="slm-send-btn">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
