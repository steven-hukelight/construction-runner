import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "./dashboard/components/ui/toaster";
import { AuthErrorHandler } from "./components/AuthErrorHandler";

export const metadata = {
  title: "Construction Runner Admin",
  description: "Admin portal",
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
  other: {
    "color-scheme": "light dark",
  },
};

import Footer from "./components/Footer";

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
        <link rel="icon" href="/icon.png?v=2" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=2" />
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
