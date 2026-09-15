import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Annale229 — Épreuves MBH | EPAC Bénin',
  description:
    'Plateforme collaborative centralisant les annales (devoirs, examens, rattrapages) de la filière Maintenance Biomédicale et Hospitalière (MBH), EPAC Bénin. Accès 100% libre et gratuit.',
  keywords: ['annale', 'MBH', 'EPAC', 'Bénin', 'biomédical', 'épreuves', 'examens', 'devoirs'],
  authors: [{ name: 'Elon G. — MBH EPAC' }],
  icons: {
    icon: '/favicon.svg',
    apple: '/logo.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="min-h-screen" suppressHydrationWarning>
      <head>
        {/* Script inline anti-flash : appliqué AVANT le premier rendu CSS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('annale229-theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && systemDark)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-surface-bg text-ink-primary font-sans transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
