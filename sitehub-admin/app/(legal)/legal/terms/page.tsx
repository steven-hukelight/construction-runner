"use client";

import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import MarketingShell from "@/app/components/marketing/MarketingShell";

/**
 * Construction Runner. Terms of Service
 * Includes confidentiality (NDA-style) and IP / trade mark / copyright.
 */
export default function TermsOfServicePage() {
  const lastUpdated = "September 2026";

  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 mb-8"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
            <Scale size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Terms of Service
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-slate-300">
          <section>
            <p className="text-sm leading-relaxed">
              These Terms of Service (&quot;Terms&quot;) govern your use of the Construction Runner
              website, mobile application, and related services (together, the &quot;Service&quot;).
              By creating an account, signing in, or using the Service, you agree to these Terms
              and to our{" "}
              <Link href="/legal/privacy-and-security" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy &amp; Security Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              1. Who these Terms apply to
            </h2>
            <p className="text-sm leading-relaxed">
              The Service is provided for construction companies, subcontractors, supervisors,
              and operatives to manage site access, attendance, induction, safety records, and
              related site operations. You must only use the Service in connection with legitimate
              work for a company that has authorised your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              2. Confidentiality, non-disclosure
            </h2>
            <p className="text-sm leading-relaxed mb-2">
              The Service may give you access to confidential information belonging to Construction
              Runner, your employer, a main contractor, other companies on a site, or other users.
              Confidential information includes, without limitation:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Personal data of operatives, supervisors, and other users</li>
              <li>Site locations, plans, attendance records, and access arrangements</li>
              <li>RAMS, inductions, briefings, near-miss and incident reports, and other H&amp;S records</li>
              <li>Commercial, pricing, programming, or project information visible in the Service</li>
              <li>Login credentials, invite codes, and any non-public technical details of the Service</li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">
              You must not disclose, copy, share, publish, or otherwise make confidential information
              available to anyone who is not authorised to receive it, except where required by law
              or a competent authority. This obligation continues after you stop using the Service
              or your account is closed. You must take reasonable care of devices and accounts used
              to access the Service, and tell your administrator promptly if you suspect unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              3. Copyright, trade marks, and intellectual property
            </h2>
            <p className="text-sm leading-relaxed mb-2">
              Construction Runner, the Construction Runner logo, and all related names, marks,
              product names, and branding are trade marks or registered trade marks of the
              Construction Runner business (or its licensors). You may not use them without
              prior written permission, except as needed to identify the Service in good faith.
            </p>
            <p className="text-sm leading-relaxed">
              The website, mobile app, software, design, layout, graphics, documentation, and
              all other content in the Service (excluding content you or your company lawfully
              upload) are protected by copyright and other intellectual property laws. You are
              granted a limited, non-exclusive, non-transferable licence to use the Service for
              its intended site-management purposes only. You must not copy, modify, reverse
              engineer, scrape, republish, sell, or create derivative works from the Service
              except as allowed by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              4. Your content and acceptable use
            </h2>
            <p className="text-sm leading-relaxed">
              You remain responsible for information and files you submit (including photos,
              delivery records, and safety reports). You must only upload material you are
              entitled to share. You must not use the Service to harass others, upload malware,
              attempt to access other accounts or systems, or interfere with the operation of
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              5. Accounts
            </h2>
            <p className="text-sm leading-relaxed">
              You must provide accurate registration details and keep your password confidential.
              Your company administrator may approve, suspend, or remove access. We may suspend
              or terminate access where these Terms are breached or where required for security
              or legal reasons.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              6. Availability
            </h2>
            <p className="text-sm leading-relaxed">
              We aim to keep the Service available, but it is provided as-is. We do not guarantee
              uninterrupted access, and we are not liable for delays or failures caused by
              networks, device settings, or events outside our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              7. Changes
            </h2>
            <p className="text-sm leading-relaxed">
              We may update these Terms from time to time. The &quot;Last updated&quot; date at the
              top of this page will change when we do. Continued use of the Service after an
              update means you accept the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              8. Contact
            </h2>
            <p className="text-sm leading-relaxed">
              Questions about these Terms:{" "}
              <a
                href="mailto:info@construction-runner.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                info@construction-runner.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-700 flex flex-wrap gap-4">
          <Link
            href="/legal/privacy-and-security"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
          >
            Privacy &amp; Security Policy
          </Link>
        </div>
        </div>
      </div>
    </MarketingShell>
  );
}
