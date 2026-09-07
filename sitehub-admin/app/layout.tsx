import "./globals.css";
import Footer from "./components/Footer";
import { Providers } from "./providers";
import { Toaster } from "./dashboard/components/ui/toaster";
import { AuthErrorHandler } from "./components/AuthErrorHandler";
import { CANONICAL_SITE_URL, getSiteUrlFromEnv } from "@/lib/url";

function safeMetadataBase(): URL {
  const fromEnv = getSiteUrlFromEnv();
  if (fromEnv) {
    try {
      return new URL(fromEnv);
    } catch {
      console.warn("[layout] Invalid site URL from env, using default metadata base");
    }
  }
  return new URL(CANONICAL_SITE_URL);
}

export const metadata = {
  metadataBase: safeMetadataBase(),
  title: "Construction Runner",
  description: "The modern platform for construction site management. Geo-verified attendance, induction compliance, and real-time site control.",
  icons: {
    icon: '/Logo.png',
    shortcut: '/Logo.png',
    apple: '/Logo.png',
  },
  openGraph: {
    title: "Construction Runner",
    description: "The modern platform for construction site management.",
    images: ['/Logo.png'],
  },
  other: {
    "color-scheme": "light dark",
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function RootLayout({ children }: any) {
  // No longer sync companyId from localStorage; always use cookies
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement,t=localStorage.getItem('theme');var r='light';if(t==='dark'||t==='light')r=t;else if(t==='system')r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=r;})();`,
          }}
        />
        <link rel="icon" href="/Logo.png?v=3" type="image/png" />
        <link rel="apple-touch-icon" href="/Logo.png?v=3" />
      </head>
      <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-300 min-h-screen flex flex-col font-sf">
        <div className="flex-1 flex flex-col">
          <Providers>
          <AuthErrorHandler />
          {children}
        </Providers>
          <Toaster />
        </div>
        <Footer />
      </body>
    </html>
  );
}
