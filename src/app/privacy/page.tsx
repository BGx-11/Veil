import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-20 px-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-accent-primary hover:underline mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-12">Last Updated: June 2026</p>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
          <p>
            At Veil Browser, privacy is not an afterthought, a toggle in a buried settings menu, or a marketing term—it is our absolute foundational principle. This Privacy Policy outlines exactly how data is (and isn't) handled when you use the Veil Browser.
          </p>

          <h2 className="text-2xl font-semibold mt-8">1. Zero Telemetry & No Data Collection</h2>
          <p>
            Veil Browser is engineered to collect absolutely zero telemetry. We do not track your clicks, we do not log your search history, we do not monitor your active tabs, and we do not send crash reports or diagnostic data back to our servers. Your browsing behavior remains entirely on your local machine.
          </p>

          <h2 className="text-2xl font-semibold mt-8">2. On-Device AI Processing</h2>
          <p>
            All Artificial Intelligence features integrated into Veil Browser (such as page summarization and reader-mode entity extraction) are processed 100% locally on your hardware.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>We utilize WebGPU and Transformers.js to execute Local Language Models (SLMs).</li>
            <li>No text, images, or page content are ever transmitted to OpenAI, Anthropic, Google, or any external cloud API for processing.</li>
            <li>The model weights are downloaded directly from HuggingFace to your local cache upon first use.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">3. Network Traffic & Tor Routing</h2>
          <p>
            When the integrated Tor mode is enabled, your traffic is encrypted and routed through the decentralized Tor network.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>We do not monitor, log, or have the capability to decrypt the traffic passing through these relays.</li>
            <li>Your ISP will only see an encrypted connection to the Tor entry node.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">4. Local Data Storage</h2>
          <p>
            Any data stored by the browser (such as bookmarks, downloads history, and session state) is stored locally on your hard drive inside your OS user profile folder. We do not offer a "Sync" feature, and therefore we do not possess any servers holding your personal data.
          </p>

          <h2 className="text-2xl font-semibold mt-8">5. Tracking Protection (Ghostery)</h2>
          <p>
            Veil Browser ships with a hardened tracking blocker powered by Ghostery engine rulesets. This system intercepts requests locally and drops known tracking pixels, analytics scripts, and advertising networks before they execute. No information about blocked trackers is ever uploaded.
          </p>

          <h2 className="text-2xl font-semibold mt-8">6. Open Source Transparency</h2>
          <p>
            Because Veil Browser is entirely open source, our privacy claims are mathematically and programmatically verifiable. Security researchers and users are encouraged to audit the codebase on GitHub to confirm the absence of telemetry, tracking, or data exfiltration mechanisms.
          </p>
        </div>
      </div>
    </div>
  );
}
