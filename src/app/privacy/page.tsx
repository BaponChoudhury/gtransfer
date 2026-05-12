import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — GTransfer",
  description: "How GTransfer collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "11 May 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <img src="/logo.png" alt="GTransfer" className="w-[108px] h-[108px] object-contain" />
            GTransfer
          </Link>
          <Link href="/login" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-gray-700">

          <Section title="1. Introduction">
            <p>
              GTransfer (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy
              Policy explains what information we collect when you use our Service, how we use it, and the choices
              you have. By using GTransfer, you agree to the collection and use of information in accordance with
              this policy.
            </p>
            <p>
              GTransfer is an independent third-party tool. We are not affiliated with Google LLC or any other
              service provider we integrate with.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <h3 className="font-semibold text-gray-800 mt-3 mb-1">2.1 Account Information</h3>
            <p>
              When you sign in via Google OAuth, we receive your name, email address, and profile picture from
              Google. This information is stored in our database to identify your account and personalise your
              experience.
            </p>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">2.2 OAuth Access Tokens</h3>
            <p>
              To perform transfers on your behalf, we store encrypted OAuth access tokens and refresh tokens for
              each Google account you connect. These tokens allow us to access your Gmail and Google Drive only
              when you initiate a transfer. Tokens are stored encrypted at rest and are never transmitted in
              plain text.
            </p>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">2.3 Transfer Logs</h3>
            <p>
              We store metadata about transfers you run — such as the number of files transferred, file sizes,
              timestamps, and success/error status. We do not store the contents of your emails, files, or
              attachments.
            </p>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">2.4 Payment Information</h3>
            <p>
              Payments are processed by Stripe. We do not collect or store your credit card number or banking
              details. We receive from Stripe a confirmation of payment, the plan purchased, and the transaction
              amount — which we store for record-keeping.
            </p>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">2.5 Usage Data</h3>
            <p>
              We may collect standard server logs including your IP address, browser type, pages visited, and
              timestamps. This data is used to maintain and improve the Service and is not linked to your
              personal identity.
            </p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>Authenticate you and manage your account</li>
              <li>Execute the file and email transfers you initiate</li>
              <li>Process and record payments</li>
              <li>Send transactional emails (e.g. purchase confirmation)</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Improve the reliability and performance of the Service</li>
              <li>Respond to your support requests</li>
            </ul>
            <p>
              We will not use your data for advertising, sell it to third parties, or use it for any purpose
              beyond operating and improving the Service.
            </p>
          </Section>

          <Section title="4. Google API Data — Limited Use Policy">
            <p>
              GTransfer&apos;s use and transfer of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p>In particular:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>We only access Google data that is necessary to perform the transfer you request</li>
              <li>We do not use Google user data to develop, improve, or train AI or ML models</li>
              <li>We do not allow humans to read your Google data unless you have given explicit permission or we are required to do so by law</li>
              <li>We do not transfer your Google data to third parties except as necessary to provide the Service (e.g. uploading to Mega.nz or Drime at your request)</li>
            </ul>
          </Section>

          <Section title="5. Data Sharing">
            <p>We do not sell or rent your personal data. We may share limited data with:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>
                <strong>Supabase</strong> — our database and authentication provider. Data is stored in encrypted
                form on their infrastructure.
              </li>
              <li>
                <strong>Stripe</strong> — for payment processing. Stripe has its own privacy policy and is
                PCI-DSS compliant.
              </li>
              <li>
                <strong>Resend</strong> — for sending transactional emails. Only your email address and name are
                shared for this purpose.
              </li>
              <li>
                <strong>Mega.nz / Drime</strong> — only when you explicitly request a transfer to these services.
                Your credentials for these services are stored encrypted and used solely to perform the transfer.
              </li>
            </ul>
            <p>
              We may also disclose your information if required by law, regulation, court order, or governmental
              authority.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your account information and transfer logs for as long as your account is active. OAuth
              access tokens are stored until you disconnect the linked account or revoke access via Google.
            </p>
            <p>
              You may request deletion of your account and all associated data at any time by contacting{" "}
              <a href="mailto:support@gtransfer.app" className="text-blue-600 hover:underline">
                support@gtransfer.app
              </a>. We will process deletion requests within 30 days.
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              GTransfer uses strictly necessary cookies to maintain your authenticated session. We do not use
              tracking cookies, advertising cookies, or third-party analytics cookies. No cookie consent banner
              is required for essential session cookies under applicable law.
            </p>
          </Section>

          <Section title="8. Data Security">
            <p>
              We take data security seriously. All data is transmitted over HTTPS (TLS). OAuth tokens and
              third-party credentials are encrypted at rest in our database. Access to our database is restricted
              to authorised personnel only.
            </p>
            <p>
              Despite these measures, no method of transmission over the Internet or method of electronic
              storage is 100% secure. We cannot guarantee absolute security and encourage you to use strong,
              unique passwords and review your Google account&apos;s connected apps regularly.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p>
              Depending on your jurisdiction, you may have rights regarding your personal data, including the
              right to access, correct, or delete your data, and the right to object to or restrict certain
              processing.
            </p>
            <p>
              You can revoke GTransfer&apos;s access to your Google accounts at any time by visiting{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                myaccount.google.com/permissions
              </a>{" "}
              and removing GTransfer from the list of connected apps.
            </p>
            <p>
              To exercise any other rights, contact us at{" "}
              <a href="mailto:support@gtransfer.app" className="text-blue-600 hover:underline">
                support@gtransfer.app
              </a>.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              GTransfer is not directed at children under the age of 13. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal information,
              please contact us and we will promptly delete it.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the &ldquo;Last updated&rdquo;
              date at the top of this page. We encourage you to review this policy periodically. Your continued
              use of the Service after changes are posted constitutes your acceptance of the revised policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices,
              please contact us at:{" "}
              <a href="mailto:support@gtransfer.app" className="text-blue-600 hover:underline">
                support@gtransfer.app
              </a>
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
            <Link href="/terms"   className="hover:text-gray-700 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition-colors font-medium text-gray-600">Privacy</Link>
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
