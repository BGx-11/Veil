import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-20 px-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-accent-primary hover:underline mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
        <p className="text-sm text-zinc-500 mb-12">Last Updated: June 2026</p>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
          <p>
            Welcome to Veil Browser. These Terms and Conditions outline the rules and regulations for the use of the Veil Browser open-source software project. By downloading, accessing, or using Veil Browser, you accept these terms and conditions in full. Do not continue to use Veil Browser if you do not accept all of the terms and conditions stated on this page.
          </p>

          <h2 className="text-2xl font-semibold mt-8">1. Open Source License</h2>
          <p>
            Veil Browser is provided as open-source software under the MIT License. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
          </p>
          <p>
            The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
          </p>

          <h2 className="text-2xl font-semibold mt-8">2. Use of Tor Network Integration</h2>
          <p>
            Veil Browser includes an optional feature that routes your traffic through the decentralized Tor network via a SOCKS5 proxy. By enabling this feature, you acknowledge that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>We do not control, maintain, or operate the Tor network relays or exit nodes.</li>
            <li>You are solely responsible for compliance with the local, state, and federal laws of your jurisdiction regarding the use of privacy networks and encryption tools.</li>
            <li>Veil Browser contributors are not liable for any content accessed, transmitted, or intercepted while utilizing the Tor integration.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">3. Disclaimer of Warranties</h2>
          <p className="uppercase font-medium">
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
          </p>
          <p>
            In no event shall the authors, contributors, or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.
          </p>

          <h2 className="text-2xl font-semibold mt-8">4. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless the Veil Browser project, its contributors, and affiliates from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) that such parties may incur as a result of or arising from your (or anyone using your account/device) violation of these Terms and Conditions.
          </p>

          <h2 className="text-2xl font-semibold mt-8">5. Third-Party Integrations</h2>
          <p>
            Veil Browser integrates components such as Ghostery's tracker blocker lists and WebGPU-based Local Language Models (via Transformers.js). Your use of these components within Veil Browser is subject to the limitations of their respective open-source licenses. Veil Browser does not claim ownership over these third-party engines or models.
          </p>

          <h2 className="text-2xl font-semibold mt-8">6. Modifications to the Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. Changes will be posted to the official repository. By continuing to access or use our software after those revisions become effective, you agree to be bound by the revised terms.
          </p>
        </div>
      </div>
    </div>
  );
}
