import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.lungiza.co.za'),

  title: {
    default: 'Lungisa — Home Repairs in Gauteng | Find Vetted Tradespeople',
    template: '%s | Lungisa',
  },
  description: 'Lungisa is South Africa\'s home repair marketplace. Post a job, get competitive bids from vetted plumbers, electricians and tradespeople in Gauteng. Pay safely in escrow. Free to use.',

  keywords: [
    'plumber Johannesburg', 'electrician Sandton', 'home repairs Gauteng',
    'handyman Johannesburg', 'find tradesperson South Africa',
    'plumber near me', 'electrician near me', 'painter Johannesburg',
    'home repair marketplace South Africa', 'vetted tradespeople Gauteng',
    'escrow payment home repairs', 'competitive bids tradespeople',
    'Lungisa', 'home repairs Sandton', 'home repairs Pretoria',
  ],

  authors: [{ name: 'Lungisa', url: 'https://www.lungiza.co.za' }],
  creator: 'VaultLink Africa',
  publisher: 'TVM Capital Link Pty Ltd',

  // ── PWA ──────────────────────────────────────────────
  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    title: 'Lungisa',
    statusBarStyle: 'black-translucent',
  },

  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
  // ─────────────────────────────────────────────────────

  openGraph: {
    type:        'website',
    locale:      'en_ZA',
    url:         'https://www.lungiza.co.za',
    siteName:    'Lungisa',
    title:       'Lungisa — Home Repairs Done Right in Gauteng',
    description: 'Post a job, get competitive bids from vetted tradespeople, negotiate your price, pay safely in escrow. Free for homeowners.',
    images: [{
      url:    '/og-image.png',
      width:  1200,
      height: 630,
      alt:    'Lungisa — South Africa\'s Home Repair Marketplace',
    }],
  },

  twitter: {
    card:        'summary_large_image',
    title:       'Lungisa — Home Repairs in Gauteng',
    description: 'Post a job, get bids from vetted tradespeople, pay safely. Free to use.',
    images:      ['/og-image.png'],
    creator:     '@LungisaZA',
  },

  robots: {
    index:               true,
    follow:              true,
    googleBot: {
      index:             true,
      follow:            true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },

  icons: {
    icon:       '/favicon.ico',
    shortcut:   '/favicon.ico',
    apple:      '/icons/icon-192x192.png',
  },

  alternates: {
    canonical: 'https://www.lungiza.co.za',
  },

  verification: {
    google: 'mE8I1g0DzoGlvgRlvrXPfyPZTWi21Dn1rl8oUDa1onw',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <head>
        {/* PWA theme colour — also sets Android status bar colour */}
        <meta name="theme-color" content="#C4622D" />

        {/* Structured Data — LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type':    'OnlineBusiness',
            name:       'Lungisa',
            url:        'https://www.lungiza.co.za',
            logo:       'https://www.lungiza.co.za/logo.png',
            description: 'South Africa\'s home repair marketplace. Find vetted plumbers, electricians, painters and tradespeople in Gauteng.',
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
          })}}
        />
        {/* Structured Data — WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type':    'WebSite',
            name:       'Lungisa',
            url:        'https://www.lungiza.co.za',
            potentialAction: {
              '@type':       'SearchAction',
              target:        'https://www.lungiza.co.za/post?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          })}}
        />
        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{ __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(r) { console.log('SW registered:', r.scope); })
                  .catch(function(e) { console.log('SW failed:', e); });
              });
            }
          `}}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}