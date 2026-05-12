import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — GTransfer",
  description: "Read the GTransfer Terms of Service before using the platform.",
};

const LAST_UPDATED = "11 May 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <img src="/logo.png" alt="GTransfer" className="w-[72px] h-[72px] object-contain" />
            GTransfer
          </Link>
          <Link href="/login" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700">

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using GTransfer (&ldquo;the Service&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;),
              you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the Service.
            </p>
            <p>
              These terms apply to all visitors, users, and anyone who accesses or uses the Service. We reserve the right
              to update these terms at any time. Continued use of the Service after changes constitutes acceptance of the
              revised terms.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              GTransfer is an independent third-party tool that helps you transfer files, emails, and data between
              your own cloud accounts — including Google accounts (Gmail, Google Drive) and external storage services
              such as Mega.nz and Drime. GTransfer is not affiliated with, sponsored by, or endorsed by Google LLC or
              any other third-party service provider.
            </p>
            <p>
              The Service operates by connecting to your accounts using official OAuth 2.0 protocols. Your credentials
              are never stored — only short-lived access tokens are retained, encrypted at rest in our database.
            </p>
          </Section>

          <Section title="3. Account Registration">
            <p>
              You must sign in using a valid Google account via OAuth. You are responsible for maintaining the security
              of your account and for all activity that occurs under your account. You must immediately notify us of any
              unauthorised use of your account.
            </p>
            <p>
              You agree to provide accurate information and to keep it up to date. We reserve the right to suspend or
              terminate accounts that provide false, misleading, or incomplete information.
            </p>
          </Section>

          <Section title="4. Use of Third-Party Services">
            <p>
              GTransfer integrates with third-party services including Google APIs, Stripe (payment processing),
              Mega.nz, and Drime. Your use of those services is subject to their respective terms and privacy policies.
              GTransfer&apos;s use of information received from Google APIs adheres to the{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </Section>

          <Section title="5. User Responsibilities">
            <p>You agree to use the Service only for lawful purposes. You must not:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Transfer data that infringes intellectual property rights or violates any applicable law</li>
              <li>Use the Service to transmit spam, malware, or any harmful content</li>
              <li>Attempt to gain unauthorised access to any system or network</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Reverse engineer, decompile, or attempt to extract source code from the Service</li>
              <li>Use the Service in a manner that exceeds reasonable or fair use</li>
            </ul>
            <p>
              You are solely responsible for the content you transfer and for ensuring you have the right to access
              and move that content between accounts.
            </p>
          </Section>

          <Section title="6. Payments and Refunds">
            <p>
              Paid plans (Essential and Pro) are offered as a one-time purchase. Payment is processed securely by
              Stripe. Once a plan is activated, access is granted immediately and permanently — no subscription or
              renewal is required.
            </p>
            <p>
              Due to the digital nature of the Service, we operate a no-refund policy once a plan has been activated
              and the features have been accessed. If you experience a technical issue that prevents you from using
              the Service, please contact support before requesting a chargeback. We will make reasonable efforts to
              resolve issues promptly.
            </p>
            <p>
              All prices are displayed inclusive of applicable taxes. We reserve the right to change pricing at any
              time; changes will not affect existing purchases.
            </p>
          </Section>

          <Section title="7. Data Access and Privacy">
            <p>
              GTransfer accesses your Google account data (Gmail, Drive) solely to perform the file transfers you
              explicitly initiate. We do not read, store, analyse, or share the content of your files, emails, or
              attachments for any purpose other than completing the requested transfer.
            </p>
            <p>
              Access tokens are stored encrypted. You may revoke GTransfer&apos;s access at any time through your
              Google Account security settings. For full details on how we handle your data, please read our{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
            </p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>
              All right, title, and interest in and to the Service — including its software, design, interface, and
              documentation — are the exclusive property of GTransfer. You are granted a limited, non-exclusive,
              non-transferable licence to use the Service for your personal or internal business purposes.
            </p>
            <p>
              You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise
              exploit any part of the Service without our prior written consent.
            </p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or
              implied, including but not limited to warranties of merchantability, fitness for a particular purpose,
              or non-infringement.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other
              harmful components. We do not warrant the accuracy or completeness of any information provided through
              the Service.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              To the fullest extent permitted by applicable law, GTransfer and its operators shall not be liable to
              you for any direct, indirect, incidental, special, consequential, or exemplary damages arising from
              your use of, or inability to use, the Service — including but not limited to loss of data, loss of
              revenue, or loss of profits.
            </p>
            <p>
              Our total liability to you for any claim arising out of or relating to these Terms or the Service
              shall not exceed the amount you paid us in the twelve months preceding the claim.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, with or without
              notice, for any reason including but not limited to violation of these Terms, suspected fraud, or
              extended inactivity.
            </p>
            <p>
              You may stop using the Service at any time. You may revoke account access tokens via your Google
              Account settings. Termination does not entitle you to a refund for any pre-paid plans.
            </p>
          </Section>

          <Section title="12. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of England and Wales.
              Any disputes arising in connection with these Terms shall be subject to the exclusive jurisdiction
              of the courts of England and Wales.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:support@gtransfer.app" className="text-blue-600 hover:underline">
                support@gtransfer.app
              </a>.
            </p>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            GTransfer is an independent tool and is not affiliated with, sponsored by, or endorsed by Google LLC.
          </p>
          <div className="flex gap-5 text-xs text-gray-400">
            <Link href="/terms"   className="hover:text-gray-700 transition-colors font-medium text-gray-600">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-gray-700 transition-colors">Support</Link>
            <Link href="/"        className="hover:text-gray-700 transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
