import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Layout, CheckCircle2, ChevronRight, Moon, Sun, Monitor, Lock, Ghost, Cookie, EyeOff, Radio } from 'lucide-react';
import { useBrowserStore } from '@/lib/store';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Veil',
    description: 'A native, modern browsing experience built for speed and privacy.',
    icon: Sparkles,
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10'
  },
  {
    id: 'appearance',
    title: 'Choose Your Style',
    description: 'Select a theme that feels right for you. You can change this later in settings.',
    icon: Layout,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-400/10'
  },
  {
    id: 'layout',
    title: 'Tab Layout',
    description: 'Choose where you want your tabs to be displayed.',
    icon: Layout,
    color: 'text-sky-400',
    bg: 'bg-sky-400/10'
  },
  {
    id: 'privacy',
    title: 'Privacy Preferences',
    description: 'Customize what Veil blocks by default to keep you secure.',
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10'
  },
  {
    id: 'network',
    title: 'Advanced Networking',
    description: 'Route your traffic through the Tor network for maximum anonymity.',
    icon: Radio,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10'
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const { updateSettings, settings } = useBrowserStore();

  const handleNext = () => {
    if (animating) return;
    if (currentStep < steps.length - 1) {
      setAnimating(true);
      setCurrentStep(prev => prev + 1);
      setTimeout(() => setAnimating(false), 500);
    } else {
      updateSettings({ hasCompletedSetup: true });
    }
  };

  const renderStepContent = (stepId: string) => {
    switch (stepId) {
      case 'appearance':
        return (
          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={() => updateSettings({ darkMode: true })}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${settings.darkMode ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-[var(--border-color)] bg-[var(--surface-icon-bg)] hover:border-fuchsia-500/50'}`}
            >
              <Moon size={32} className={settings.darkMode ? 'text-fuchsia-400' : 'text-[var(--text-secondary)]'} />
              <span className="font-medium text-[var(--text-primary)]">Dark Mode</span>
            </button>
            <button 
              onClick={() => updateSettings({ darkMode: false })}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${!settings.darkMode ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-[var(--border-color)] bg-[var(--surface-icon-bg)] hover:border-fuchsia-500/50'}`}
            >
              <Sun size={32} className={!settings.darkMode ? 'text-fuchsia-400' : 'text-[var(--text-secondary)]'} />
              <span className="font-medium text-[var(--text-primary)]">Light Mode</span>
            </button>
          </div>
        );
      case 'layout':
        return (
          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={() => updateSettings({ useVerticalTabs: true })}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${settings.useVerticalTabs ? 'border-sky-500 bg-sky-500/10' : 'border-[var(--border-color)] bg-[var(--surface-icon-bg)] hover:border-sky-500/50'}`}
            >
              <Layout size={32} className={settings.useVerticalTabs ? 'text-sky-400' : 'text-[var(--text-secondary)]'} />
              <span className="font-medium text-[var(--text-primary)]">Sidebar Tabs</span>
              <span className="text-xs text-[var(--text-secondary)]">Modern vertical layout</span>
            </button>
            <button 
              onClick={() => updateSettings({ useVerticalTabs: false })}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${!settings.useVerticalTabs ? 'border-sky-500 bg-sky-500/10' : 'border-[var(--border-color)] bg-[var(--surface-icon-bg)] hover:border-sky-500/50'}`}
            >
              <Monitor size={32} className={!settings.useVerticalTabs ? 'text-sky-400' : 'text-[var(--text-secondary)]'} />
              <span className="font-medium text-[var(--text-primary)]">Top Tabs</span>
              <span className="text-xs text-[var(--text-secondary)]">Classic horizontal layout</span>
            </button>
          </div>
        );
      case 'privacy':
        return (
          <div className="mt-8 flex flex-col gap-3 w-full text-left">
            <label className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-icon-bg)] cursor-pointer hover:bg-[var(--surface-icon-hover)] transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)] mb-1">
                  <EyeOff size={16} className="text-emerald-400" /> Block Trackers & Ads
                </div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">Stops invasive trackers and intrusive advertisements.</div>
              </div>
              <input type="checkbox" checked={settings.adBlocker} onChange={(e) => updateSettings({ adBlocker: e.target.checked })} className="w-5 h-5 accent-emerald-500" />
            </label>
            <label className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-icon-bg)] cursor-pointer hover:bg-[var(--surface-icon-hover)] transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)] mb-1">
                  <Cookie size={16} className="text-emerald-400" /> Strict Cookie Blocking
                </div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">Blocks standard cookies. May break logins on some sites.</div>
              </div>
              <input type="checkbox" checked={settings.blockCookies} onChange={(e) => updateSettings({ blockCookies: e.target.checked })} className="w-5 h-5 accent-emerald-500" />
            </label>
            <label className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-icon-bg)] cursor-pointer hover:bg-[var(--surface-icon-hover)] transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium text-[var(--text-primary)] mb-1">
                  <Ghost size={16} className="text-emerald-400" /> Block WebRTC (IP Leaks)
                </div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">Prevents sites from discovering your real IP. May break video calls.</div>
              </div>
              <input type="checkbox" checked={settings.blockWebRTC} onChange={(e) => updateSettings({ blockWebRTC: e.target.checked })} className="w-5 h-5 accent-emerald-500" />
            </label>
          </div>
        );
      case 'network':
        return (
          <div className="mt-8 flex gap-4 w-full justify-center">
            <button 
              onClick={() => updateSettings({ torMode: !settings.torMode })}
              className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                settings.torMode 
                  ? 'bg-orange-500/10 border-orange-500 text-orange-400' 
                  : 'bg-[var(--surface-icon-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-orange-500/50 hover:text-orange-400'
              }`}
            >
              <Radio size={32} />
              <span className="font-semibold text-lg">{settings.torMode ? 'Tor Network Enabled' : 'Enable Tor Network'}</span>
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--bg-base)] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-fuchsia-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <motion.div 
        className="relative z-10 w-full max-w-2xl px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="bg-[var(--bg-element)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[550px]">
          
          <div className="relative flex-1 flex flex-col items-center p-10 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col items-center w-full max-w-md mx-auto my-auto"
              >
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-white/5 ${steps[currentStep].bg}`}>
                  {React.createElement(steps[currentStep].icon, { size: 40, className: steps[currentStep].color })}
                </div>
                
                <h2 className="text-3xl font-bold mb-3 tracking-tight text-[var(--text-primary)] text-center">
                  {steps[currentStep].title}
                </h2>
                
                <p className="text-base text-[var(--text-secondary)] leading-relaxed text-center max-w-sm">
                  {steps[currentStep].description}
                </p>

                {renderStepContent(steps[currentStep].id)}
                
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="border-t border-[var(--border-color)] bg-[var(--surface-icon-bg)]/50 backdrop-blur-md p-6 flex items-center justify-between mt-auto">
            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-10 bg-[var(--accent-primary)]' : 'w-2 bg-[var(--text-tertiary)] opacity-30'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3.5 bg-[var(--text-primary)] text-[var(--bg-base)] font-bold rounded-2xl hover:opacity-90 hover:scale-105 transition-all shadow-lg active:scale-95"
            >
              {currentStep === steps.length - 1 ? 'Start Browsing' : 'Continue'}
              {currentStep === steps.length - 1 ? <CheckCircle2 size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
