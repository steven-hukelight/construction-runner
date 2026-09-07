"use client";

import Link from "next/link";
import { Mail, Trash2, ArrowLeft } from "lucide-react";
import {
  ACCOUNT_DELETION_REQUEST_MAILTO,
  FEEDBACK_EMAIL,
} from "@/lib/feedback";

export default function AccountDeletionRequestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-red-50 p-2 text-red-600">
            <Trash2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Request data or account deletion
            </h1>
            <p className="text-sm text-gray-500">
              Construction Runner — request deletion of specific data or your
              whole account
            </p>
          </div>
        </div>

        <div className="space-y-6 text-gray-700">
          <p className="text-sm leading-relaxed">
            You can email us to ask for{" "}
            <strong>some</strong> of your personal data to be deleted while
            keeping your account open—for example certain uploads, notes, or
            categories you describe—or to ask for your <strong>full</strong>{" "}
            account closure and deletion of the personal data we hold for you.
            We will confirm by email. Some information may need to be retained
            where the law or legitimate health &amp; safety obligations require
            it; we will explain what that is and why.
          </p>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              What to include
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm">
              <li>The email address your account is registered with</li>
              <li>Your full name and company name (if applicable)</li>
              <li>
                Whether you want <strong>specific</strong> data removed (say
                what, e.g. photos, messages, profile fields) or your{" "}
                <strong>entire</strong> account and associated personal data
                deleted
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-blue-100 bg-blue-50/80 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 shrink-0 text-blue-600" size={22} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Send your request by email
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Use the button to open your mail app with a helpful subject
                    line. In the body, describe partial deletion or full
                    account deletion—whichever you need.
                  </p>
                </div>
              </div>
              <Link
                href={ACCOUNT_DELETION_REQUEST_MAILTO}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Email {FEEDBACK_EMAIL}
              </Link>
            </div>
          </section>

          <p className="text-xs text-gray-500">
            If you cannot use email, contact your company administrator, who can
            escalate to us on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}
