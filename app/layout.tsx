import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.lungiza.co.za'),

  title: {
    default: 'Lungisa — Home Repairs in Gauteng | Find Vetted Tradespeople',
    template: '%s | Lungisa',
  },

  description: 'Post a job, get competitive bids from vetted tradespeople in Gauteng. Negotiate your price, pay safely in escrow. Free for homeowners.',

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
    type:     'website',
    locale:   'en_ZA',
    url:      'https://www.lungiza.co.za',
    siteName: 'Lungisa',
    title:    'Lungisa — Home Repairs Done Right in Gauteng',
    description: 'Post a job, get competitive bids from vetted tradespeople. Negotiate your price, pay safely in escrow. Free for homeowners.',
    images: [{
      url:    '/og-image.png',
      width:  1200,
      height: 630,
      alt:    "Lungisa — South Africa's Home Repair Marketplace",
    }],
  },

  twitter: {
    card:        'summary_large_image',
    title:       'Lungisa — Home Repairs in Gauteng',
    description: 'Post a job, get bids from vetted tradespeople, pay safely in escrow. Free for homeowners.',
    images:      ['/og-image.png'],
    creator:     '@LungisaZA',
  },

  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:             true,
      follow:            true,
      'max-video-preview':  -1,
      'max-image-preview':  'large',
      'max-snippet':        -1,
    },
  },

  icons: {
    icon:     '/favicon.ico',
    shortcut: '/favicon.ico',
    apple:    '/icons/icon-192x192.png',
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
        {/* ── Viewport — prevents zoom, fits edge to edge ── */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* ── iOS PWA full screen — critical for island/notch fix ── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#C4622D" />

        {/* Structured Data — LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type':    'OnlineBusiness',
              name:       'Lungisa',
              url:        'https://www.lungiza.co.za',
              logo:       'https://www.lungiza.co.za/logo.png',
              description: "South Africa's home repair marketplace. Find vetted tradespeople in Gauteng.",
              areaServed: {
                '@type': 'State',
                name:    'Gauteng',
                containsPlace: [
                  { '@type':'City', name:'Johannesburg' },
                  { '@type':'City', name:'Pretoria' },
                  { '@type':'City', name:'Sandton' },
                  { '@type':'City', name:'Randburg' },
                  { '@type':'City', name:'Midrand' },
                  { '@type':'City', name:'Soweto' },
                  { '@type':'City', name:'Fourways' },
                  { '@type':'City', name:'Roodepoort' },
                ],
              },
              serviceType: [
                'Plumbing', 'Electrical', 'Painting', 'Carpentry',
                'Roofing', 'Tiling', 'Solar Installation', 'General Handyman',
              ],
              offers: {
                '@type':       'Offer',
                description:   'Free to post jobs. 5% commission on completed work.',
                price:         '0',
                priceCurrency: 'ZAR',
              },
              sameAs: [
                'https://www.facebook.com/LungisaZA',
                'https://www.linkedin.com/company/lungisa',
                'https://twitter.com/LungisaZA',
              ],
            }),
          }}
        />

        {/* Structured Data — WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type':    'WebSite',
              name:       'Lungisa',
              url:        'https://www.lungiza.co.za',
              potentialAction: {
                '@type':       'SearchAction',
                target:        'https://www.lungiza.co.za/post?q={search_term_string}',
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
                    .then(function (r) { console.log('SW registered:', r.scope); })
                    .catch(function (e) { console.log('SW failed:', e); });
                });
              }
            `,
          }}
        />

        {/* ── Global mobile UX fixes ──────────────────────────────── */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* SAFE AREA VARIABLES
                 env(safe-area-inset-*) injected by iOS/Android OS.
                 Pushes content clear of Dynamic Island, notch,
                 home indicator and rounded screen corners.          */
              :root {
                --sat: env(safe-area-inset-top);
                --sar: env(safe-area-inset-right);
                --sab: env(safe-area-inset-bottom);
                --sal: env(safe-area-inset-left);
              }

              *, *::before, *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }

              /* REMOVE 300MS TAP DELAY + GREY FLASH */
              * {
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
              }

              /* PREVENT BOUNCE SCROLL */
              html {
                height: 100%;
                height: -webkit-fill-available;
                overflow: hidden;
                overscroll-behavior: none;
                -webkit-text-size-adjust: 100%;
                text-size-adjust: 100%;
              }

              body {
                height: 100%;
                height: -webkit-fill-available;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior-y: auto;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;

                /* ISLAND / NOTCH FIX
                   Pushes body below the Dynamic Island/notch.      */
                padding-top:   env(safe-area-inset-top);
                padding-left:  env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
              }

              /* MODAL / OVERLAY scroll containers */
              .modal,
              .sn-menu,
              [data-scroll] {
                max-height: 100vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
              }

              /* MINIMUM TAP TARGET — 44px Apple HIG minimum */
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

              /* TOPBAR — sits below the Dynamic Island */
              .topbar {
                padding-top: env(safe-area-inset-top) !important;
                height: calc(58px + env(safe-area-inset-top)) !important;
                position: sticky !important;
                top: 0 !important;
                z-index: 40 !important;
              }

              /* MOBILE BOTTOM NAV — above home indicator bar */
              .mobile-dash-nav,
              .mobile-nav {
                padding-bottom: env(safe-area-inset-bottom) !important;
                height: calc(60px + env(safe-area-inset-bottom)) !important;
              }

              /* SIDEBAR — account for left safe area on landscape */
              .sidenav {
                padding-left: env(safe-area-inset-left);
              }

              /* INPUT FONT SIZE — prevents iOS auto-zoom on focus */
              input,
              select,
              textarea {
                font-size: 16px !important;
              }

              /* MODAL OVERLAYS — respect safe areas */
              .modal-overlay,
              .overlay,
              .contact-overlay {
                padding-top:    env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
              }

              /* MAIN CONTENT — pad for mobile nav + home bar */
              @media (max-width: 900px) {
                .main,
                .dash-main {
                  padding-bottom: calc(60px + env(safe-area-inset-bottom)) !important;
                }
              }

              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}