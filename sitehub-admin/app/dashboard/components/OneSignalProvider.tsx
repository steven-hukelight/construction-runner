"use client";

import { useEffect, useRef } from "react";
import OneSignal from "react-onesignal";
import { getUidFromCookie } from "@/lib/utils/cookies";

const FALLBACK_ONESIGNAL_APP_ID = "c50b1f72-8ef7-4458-be1b-c9c6af27a9da";

/**
 * Initializes OneSignal web push and logs in the user by external_id (public.users.id)
 * so they receive briefings / tasks / messages / safety alerts push from sendPushToUsers.
 */
export default function OneSignalProvider() {
  const initRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || initRef.current) return;

    const appId =
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ??
      FALLBACK_ONESIGNAL_APP_ID;
    if (!appId?.trim()) return;

    initRef.current = true;

    OneSignal.init({
      appId: appId.trim(),
      allowLocalhostAsSecureOrigin: true,
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: true,
              delay: { pageViews: 1, timeDelay: 2 },
              text: {
                actionMessage: "Enable push notifications for briefings and task updates.",
                acceptButton: "Allow",
                cancelButton: "Not now",
              },
            },
          ],
        },
      },
    })
      .then(() => {
        const uid = getUidFromCookie();
        if (uid) {
          OneSignal.login(uid);
        }
      })
      .catch((e) => {
        console.warn("[OneSignal] init error:", e);
      });
  }, []);

  return null;
}
