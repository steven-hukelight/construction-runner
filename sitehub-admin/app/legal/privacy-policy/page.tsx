"use client";

import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

const GDPR_NOTICE =
  "Your data is collected solely for the purposes of site access, safety compliance, induction, RAMS acceptance, and legal health & safety obligations. It is not used for marketing or profiling.";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-sm text-gray-500">Last updated: February 2025</p>
          </div>
        </div>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              1. Purpose and legal basis
            </h2>
            <p className="text-sm leading-relaxed">
              {GDPR_NOTICE} We process your data under the legal basis of contractual necessity and
              legal obligation (health and safety compliance in the construction sector).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              2. What data we collect
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Personal details: name, email, phone, address (optional if required by contractor)</li>
              <li>National Insurance Number (optional)</li>
              <li>Emergency contact details</li>
              <li>Right to work documents (passport/visa expiry and file; passport number not stored)</li>
              <li>Medical information (optional; allergies, medication, medical certificates)</li>
              <li>Certifications and training records</li>
              <li>RAMS acceptance records</li>
              <li>Induction and site access records</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              3. Why we collect it
            </h2>
            <p className="text-sm leading-relaxed">
              Data is used solely for site access management, safety compliance, pre-induction and
              site induction, RAMS acceptance tracking, and legal health & safety obligations. We do
              not use your data for marketing or profiling.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              4. Who can see your data
            </h2>
            <p className="text-sm leading-relaxed">
              Access is limited to: your employer (subcontractor or main contractor), site supervisors
              and main contractor admins for compliance purposes, and authorised administrators.
              Sensitive fields (NI number, medical notes, passport-related data) are restricted to
              yourself and admins only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              5. How long we keep your data
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Induction records: 3 years</li>
              <li>RAMS acceptance: 6 years</li>
              <li>Training records: 3 years</li>
              <li>Accident/incident records: 6 years</li>
              <li>Pre-Induction Profile: 3 years after last activity</li>
              <li>Deleted user accounts: purged after 90 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              6. Your rights
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Right to Access:</strong> Download a copy of your data from Profile → Privacy & Data.</li>
              <li><strong>Right to Rectification:</strong> Edit name, phone, address, emergency contact in your profile.</li>
              <li><strong>Right to Erasure:</strong> Request account deletion. Legally required H&S records will be retained.</li>
              <li><strong>Right to Restrict Processing:</strong> Toggle &quot;Restrict non-essential processing&quot; so only admins can view sensitive fields.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              7. How to request deletion
            </h2>
            <p className="text-sm leading-relaxed">
              Log in → Dashboard → Profile → Privacy & Data tab → &quot;Delete My Account&quot;. You can also contact
              your Data Protection Officer (see below). Deletion will anonymise your account; induction,
              RAMS and training records are retained for legal compliance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              8. How we secure your data
            </h2>
            <p className="text-sm leading-relaxed">
              We use HTTPS for all traffic, Supabase RLS and server-side validation for access control,
              and audit logging for verification and sensitive data access. Session
              timeout is 12 hours of inactivity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              9. Contact — Data Protection
            </h2>
            <p className="text-sm leading-relaxed">
              For privacy queries or to exercise your rights, contact your company&apos;s data protection
              officer or the Construction Runner administrator. Include your email and a description of your request.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <Shield size={16} />
            Manage your privacy in Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
