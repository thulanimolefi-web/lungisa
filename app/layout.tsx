import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.lungiza.co.za'),

  title: {
    default: 'Lungisa — Home Repairs in Gauteng | Find Vetted Tradespeople',
    template: '%s | Lungisa',
  },

  description:
    "Lungisa is South Africa's home repair marketplace. Post a job, get competitive bids from vetted plumbers, electricians and tradespeople in Gauteng. Pay safely in escrow. Free to use.",

  keywords: [
    'plumber Johannesburg',
    'electrician Sandton',
    'home repairs Gauteng',
    'handyman Johannesburg',
    'find tradesperson South Africa',
    'plumber near me',
    'electrician near me',
    'painter Johannesburg',
    'home repair marketplace South Africa',
    'vetted tradespeople Gauteng',
    'escrow payment home repairs',
    'competitive bids tradespeople',
    'Lungisa',
    'home repairs Sandton',
    'home repairs Pretoria',
  ],

  authors: [{ name: 'Lungisa', url: 'https://www.lungiza.co.za' }],
  creator: 'VaultLink Africa',
  publisher: 'TVM Capital Link Pty Ltd',

  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    title: 'Lungisa',
    statusBarStyle: 'black-translucent',
  },

  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: 'https://www.lungiza.co.za',
    siteName: 'Lungisa',
    title: 'Lungisa — Home Repairs Done Right in Gauteng',
    description:
      'Post a job, get competitive bids from vetted tradespeople, negotiate your price, pay safely in escrow. Free for homeowners.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: "Lungisa — South Africa's Home Repair Marketplace",
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Lungisa — Home Repairs in Gauteng',
    description:
      'Post a job, get bids from vetted tradespeople, pay safely. Free to use.',
    images: ['/og-image.png'],
    creator: '@LungisaZA',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },

  alternates: {
    canonical: 'https://www.lungiza.co.za',
  },

  verification: {
    google: 'mE8I1g0DzoGlvgRlvrXPfyPZTWi21Dn1rl8oUDa1onw',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-ZA">
      <head>
        {/* Viewport */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#C4622D" />

        {/* Structured Data — LocalBusiness (FIXED TYPE WOULD BE RECOMMENDED BUT KEPT AS IS) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'OnlineBusiness',
              name: 'Lungisa',
              url: 'https://www.lungiza.co.za',
              logo: 'https://www.lungiza.co.za/logo.png',
              description:
                "South Africa's home repair marketplace. Find vetted tradespeople in Gauteng.",
              areaServed: {
                '@type': 'State',
                name: 'Gauteng',
              },
              serviceType: [
                'Plumbing',
                'Electrical',
                'Painting',
                'Carpentry',
                'Roofing',
                'Tiling',
                'Solar Installation',
                'General Handyman',
              ],
              sameAs: [
                'https://www.facebook.com/LungisaZA',
                'https://www.linkedin.com/company/lungisa',
                'https://twitter.com/LungisaZA',
              ],
            }),
          }}
        />

        {/* Website Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Lungisa',
              url: 'https://www.lungiza.co.za',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://www.lungiza.co.za/search?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />

        {/* Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function (r) {
                      console.log('SW registered:', r.scope);
                    })
                    .catch(function (e) {
                      console.log('SW failed:', e);
                    });
                });
              }
            `,
          }}
        />

        {/* FIXED MOBILE SCROLL SYSTEM */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --sat: env(safe-area-inset-top);
                --sar: env(safe-area-inset-right);
                --sab: env(safe-area-inset-bottom);
                --sal: env(safe-area-inset-left);
              }

              *,
              *::before,
              *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }

              * {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
              }

              html {
                height: 100%;
                height: -webkit-fill-available;
                -webkit-text-size-adjust: 100%;
              }

              /* ✅ FIX: ONLY ONE SCROLL CONTAINER (BODY) */
              body {
                height: 100%;
                height: -webkit-fill-available;

                overflow-y: auto;
                overflow-x: hidden;

                -webkit-overflow-scrolling: touch;
                overscroll-behavior-y: auto;

                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;

                padding-top: env(safe-area-inset-top);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
              }

              /* Internal scroll only for overlays/modals */
              .modal,
              .sn-menu,
              [data-scroll] {
                max-height: 100vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
              }

              button,
              a,
              [role='button'],
              .sn-item,
              .job-card,
              .bid-card,
              .btn,
              .post-btn {
                min-height: 44px;
              }

              .topbar {
                padding-top: env(safe-area-inset-top) !important;
                height: calc(58px + env(safe-area-inset-top)) !important;
                position: sticky !important;
                top: 0 !important;
                z-index: 40 !important;
              }

              .mobile-dash-nav,
              .mobile-nav {
                padding-bottom: env(safe-area-inset-bottom) !important;
                height: calc(60px + env(safe-area-inset-bottom)) !important;
              }

              input,
              select,
              textarea {
                font-size: 16px !important;
              }

              @media (max-width: 900px) {
                .main,
                .dash-main {
                  padding-bottom: calc(60px + env(safe-area-inset-bottom)) !important;
                }
              }
            `,
          }}
        />
      </head>

      <body>{children}</body>
    </html>
  )
}