import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Layout, CheckCircle2, ChevronRight, Moon, Zap, User } from 'lucide-react';
import { useBrowserStore } from '@/lib/store';

const steps = [
  {
    title: 'Welcome to Veil',
    description: 'A native, modern browsing experience built for speed and privacy.',
    icon: Sparkles,
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10'
  },
  {
    title: 'Floating Interface',
    description: 'A beautiful, glassmorphic UI that floats above the content, letting the web shine.',
    icon: Layout,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-400/10'
  },
  {
    title: 'Privacy First',
    description: 'Built-in Tor networking and advanced tracking protection.',
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10'
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

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--bg-base)] flex items-center justify-center overflow-hidden">
      {/* Zen Background Elements */}
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
        <div className="bg-[var(--bg-element)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Main Content Area */}
          <div className="relative h-[400px] flex items-center justify-center p-12 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center max-w-md mx-auto"
              >
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-8 ${steps[currentStep].bg}`}>
                  {React.createElement(steps[currentStep].icon, { size: 48, className: steps[currentStep].color })}
                </div>
                
                <h2 className="text-3xl font-bold mb-4 tracking-tight text-[var(--text-primary)]">
                  {steps[currentStep].title}
                </h2>
                
                <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                  {steps[currentStep].description}
                </p>

                {currentStep === 2 && (
                  <div className="mt-8 flex gap-4 w-full justify-center">
                    <button 
                      onClick={() => updateSettings({ torMode: !settings.torMode })}
                      className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        settings.torMode 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-[var(--surface-icon-bg)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-icon-hover)]'
                      }`}
                    >
                      <Shield size={18} />
                      Enable Tor Mode
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Area */}
          <div className="border-t border-[var(--border-color)] bg-[var(--surface-icon-bg)] p-6 flex items-center justify-between">
            {/* Progress Indicators */}
            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-8 bg-[var(--accent-primary)]' : 'w-2 bg-[var(--text-tertiary)] opacity-30'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-[var(--text-primary)] text-[var(--bg-base)] font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep === steps.length - 1 ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
