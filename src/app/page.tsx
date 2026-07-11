"use client";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { Download, Shield, Zap, Lock, BrainCircuit, GitBranch, Monitor, Ghost, Search, SplitSquareHorizontal, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";

export default function LandingPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const yHero = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  // Framer Motion Variants - Sped up!
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, filter: "blur(5px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 120, damping: 15 },
    },
  };

  const featuresContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const featureItemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 font-sans selection:bg-accent-primary/30">
      <AuroraBackground>
        <div ref={containerRef} className="relative z-10 flex flex-col min-h-screen w-full">
          {/* Navigation */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex items-center justify-between p-6 md:px-12 max-w-7xl mx-auto absolute top-0 left-0 right-0 z-50"
          >
            <div className="flex items-center gap-3 group cursor-pointer">
              <Image src="/logo.png" alt="Veil Logo" width={40} height={40} className="group-hover:scale-105 transition-transform duration-300 drop-shadow-md rounded-xl" />
              <span className="text-2xl font-bold tracking-tight dark:text-white text-zinc-900">
                Veil
              </span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
              <Link href="#features" className="hidden sm:block text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                Features
              </Link>
              <a href="https://github.com/BGx-11/Veil" target="_blank" rel="noreferrer" className="hidden sm:flex text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors items-center gap-2 group">
                <GitBranch className="w-4 h-4 group-hover:scale-110 transition-transform" /> Source
              </a>
              <a href="https://github.com/BGx-11/Veil/releases/latest/download/Veil_Browser_Setup.exe" className="relative overflow-hidden group bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                  <Download className="w-4 h-4" /> <span>Download</span>
                </span>
              </a>
            </div>
          </motion.nav>

          {/* Hero Section */}
          <motion.div
            style={{ y: yHero, opacity: opacityHero }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto px-4 pt-32 pb-20"
          >

            <motion.h1 variants={itemVariants} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-zinc-900 dark:text-white max-w-4xl leading-[1.1] sm:leading-[1.1] mb-6">
              Browse beyond <br />
              <span className="relative inline-block">
                <span className="absolute -inset-1 blur-2xl bg-gradient-to-r from-indigo-600 to-purple-500 opacity-40 dark:opacity-30 rounded-full"></span>
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-white dark:to-zinc-400 drop-shadow-sm">
                  the surface.
                </span>
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg sm:text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl mt-4 leading-relaxed font-light">
              The private, AI-powered desktop browser. Featuring on-device summarization, integrated tracking protection, and seamless Tor routing.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-6 mt-12 w-full px-4 sm:px-0">
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://github.com/BGx-11/Veil/releases/latest/download/Veil_Browser_Setup.exe" 
                className="relative overflow-hidden group bg-gradient-to-r from-indigo-600 to-purple-600 px-8 sm:px-10 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-bold flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(79,70,229,0.5)] text-white w-full sm:w-auto"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <Download className="w-6 h-6 relative z-10" />
                <span className="relative z-10">Download for Windows</span>
              </motion.a>
              <motion.p variants={itemVariants} className="text-sm font-medium text-zinc-500 dark:text-zinc-500 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Free & Open Source • Windows 10/11 (64-bit)
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </AuroraBackground>

      {/* Main Content Area */}
      <div className="w-full bg-white dark:bg-zinc-950 relative z-20">
        
        {/* Features Grid */}
        <section id="features" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <motion.div 
            variants={featuresContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20"
          >
            <motion.h2 variants={featureItemVariants} className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">
              Everything you need. <span className="text-accent-primary">Nothing you don't.</span>
            </motion.h2>
          </motion.div>

          <motion.div 
            variants={featuresContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* Feature Cards */}
            <FeatureCard icon={<Ghost />} title="Ghostery Blocker" desc="Network-level ad & tracker blocking. Stops scripts before they even load." color="from-blue-500/10 to-indigo-500/10" textCol="text-blue-500" />
            <FeatureCard icon={<Lock />} title="Tor Network" desc="One-click SOCKS5 proxy through the Tor network. Real anonymity, not theater." color="from-purple-500/10 to-pink-500/10" textCol="text-purple-500" />
            <FeatureCard icon={<BrainCircuit />} title="On-Device AI" desc="WebGPU-accelerated LLM runs locally. Summarizes pages with zero cloud calls." color="from-emerald-500/10 to-teal-500/10" textCol="text-emerald-500" />
            <FeatureCard icon={<Shield />} title="Anti-Fingerprint" desc="Canvas noise injection and WebRTC leak protection. Be invisible." color="from-orange-500/10 to-red-500/10" textCol="text-orange-500" />
            
            <FeatureCard icon={<BookOpen />} title="Reader Mode" desc="Distraction-free reading with beautiful typography. Focus on content." color="from-zinc-500/10 to-stone-500/10" textCol="text-zinc-500" />
            <FeatureCard icon={<SplitSquareHorizontal />} title="Split View" desc="Side-by-side tab multitasking. Research and browse simultaneously." color="from-cyan-500/10 to-blue-500/10" textCol="text-cyan-500" />
            <FeatureCard icon={<Search />} title="Private Search" desc="DuckDuckGo integration with AI summaries. No tracking, no profiling." color="from-amber-500/10 to-orange-500/10" textCol="text-amber-500" />
            <FeatureCard icon={<Zap />} title="Blazing Fast" desc="Tauri + Rust + Next.js. Ultra-lightweight native rendering." color="from-yellow-500/10 to-amber-500/10" textCol="text-yellow-500" />
          </motion.div>
        </section>

        {/* Privacy Promise Section */}
        <section className="py-24 bg-zinc-100/50 dark:bg-zinc-900/30 border-y border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6">
                Your data stays <span className="text-accent-primary">yours.</span>
              </h2>
              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
                Unlike Chrome, Edge, or Safari — Veil doesn't collect telemetry, sync your history to corporate servers, or sell your search queries to advertisers. Every AI inference runs on your GPU. Every search is private. Every session is ephemeral.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" /> End-to-end encrypted sessions
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Tor network routing
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Zero telemetry collection
                </li>
                <li className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Anti-fingerprinting tech
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
              <div className="flex items-center gap-3 mb-4 text-accent-primary">
                <GitBranch className="w-6 h-6" />
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Open Source Transparency</h3>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                Veil is an open-source project released under the MIT License. It does not phone home, it does not auto-update without consent, and it is strictly driven by the community. We recommend reviewing the source code on GitHub.
              </p>
              <a href="https://github.com/BGx-11/Veil" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-accent-primary hover:underline">
                Audit on GitHub &rarr;
              </a>
            </div>
          </div>
        </section>

        {/* Release Notes & Support */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Updates */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Updates</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8">Release Notes - Track the evolution of Veil.</p>
            
            <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 pl-8 pb-8">
              <span className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-accent-primary border-4 border-white dark:border-zinc-950"></span>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Version 2.0</h3>
                <span className="bg-indigo-500/10 text-indigo-500 text-xs px-2 py-1 rounded-full font-bold">Latest</span>
              </div>
              <ul className="space-y-4 text-zinc-600 dark:text-zinc-400">
                <li><strong className="text-zinc-900 dark:text-zinc-200">Tor Network:</strong> Added Tor Progress UI and connection status feedback in the toolbar.</li>
                <li><strong className="text-zinc-900 dark:text-zinc-200">Privacy Controls:</strong> Implemented Export/Import configuration tools to backup and restore settings.</li>
                <li><strong className="text-zinc-900 dark:text-zinc-200">Proxy Layer:</strong> Enhanced CORS header filtering and proxy robustness for iframe rendering.</li>
                <li><strong className="text-zinc-900 dark:text-zinc-200">UI & Design:</strong> Completely overhauled the landing page with a dynamic Aurora background and faster animations.</li>
                <li><strong className="text-zinc-900 dark:text-zinc-200">Stability:</strong> Fixed IPC communication errors regarding privacy settings and stabilized history persistence.</li>
              </ul>
            </div>
          </div>

          {/* Support / FAQ */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Support</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8">Troubleshooting common installation issues.</p>
            
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                <h4 className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" /> Windows SmartScreen Warning
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Because Veil is an independent, open-source project, the <code>.exe</code> installer is not signed with an expensive EV certificate. Windows SmartScreen may flag it as an "Unrecognized App".
                </p>
                <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                  Solution: Click <strong className="text-zinc-900 dark:text-white">More info</strong> on the blue popup, and then click <strong className="text-zinc-900 dark:text-white">Run anyway</strong>. You can verify the integrity by compiling it from GitHub.
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Why is Tor disabled by default?</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Tor significantly reduces browsing speeds due to onion routing across global nodes. We leave Tor disabled by default for general browsing, allowing you to manually toggle it ON when you need absolute anonymity.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                <h4 className="font-bold text-zinc-900 dark:text-white mb-2">How does Local AI work without a GPU?</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Veil Browser leverages WebGPU. If a dedicated GPU is unavailable, Transformers.js will automatically fall back to WebAssembly (WASM) CPU execution. While slower, your data will still remain 100% local and secure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 bg-white dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Veil Logo" width={32} height={32} className="rounded-lg opacity-80" />
              <span className="text-zinc-500 font-semibold tracking-tight text-center sm:text-left">Veil Browser © {new Date().getFullYear()}</span>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm font-medium text-zinc-500">
              <Link href="/terms" className="hover:text-accent-primary transition-colors">Terms & Conditions</Link>
              <Link href="/privacy" className="hover:text-accent-primary transition-colors">Privacy Policy</Link>
              <a href="https://github.com/BGx-11/Veil" target="_blank" rel="noreferrer" className="hover:text-accent-primary transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Reusable Feature Card Component
function FeatureCard({ icon, title, desc, color, textCol }: { icon: React.ReactNode, title: string, desc: string, color: string, textCol: string }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} whileHover={{ y: -5 }} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 border border-zinc-100 dark:border-zinc-800`}>
        <div className={textCol}>{icon}</div>
      </div>
      <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}
