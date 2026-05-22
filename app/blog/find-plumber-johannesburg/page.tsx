import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How to Find a Reliable Plumber in Johannesburg (2026 Guide)',
  description: 'Looking for a plumber in Johannesburg? Discover how to find vetted, affordable plumbers near you — without paying upfront or getting overcharged. Free guide for Gauteng homeowners.',
  keywords: ['plumber Johannesburg', 'find plumber JHB', 'reliable plumber Sandton', 'emergency plumber Johannesburg', 'plumber Gauteng', 'affordable plumber near me'],
  openGraph: {
    title:       'How to Find a Reliable Plumber in Johannesburg (2026)',
    description: 'The complete guide to finding vetted, affordable plumbers in Johannesburg without getting burned.',
    url:         'https://www.lungiza.co.za/blog/find-plumber-johannesburg',
    type:        'article',
  },
}

export default function FindPlumberJohannesburg() {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--terra:#C4593A;--cream:#F5F0E8;--cream-d:#EAE3D6;--charcoal:#2C2C28;--charcoal-l:#5A5952;}
    body{font-family:'Barlow',sans-serif;background:var(--cream);color:var(--charcoal)}
    a{text-decoration:none;color:inherit}
    .nav{background:var(--charcoal);padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between}
    .nav-logo{display:flex;align-items:center;gap:10px}
    .nav-hex{width:30px;height:30px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center}
    .nav-word{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:#F5F0E8}
    .nav-cta{background:var(--terra);color:#fff;border:none;padding:9px 20px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer}
    .article-wrap{max-width:740px;margin:0 auto;padding:60px 40px}
    .breadcrumb{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;color:var(--charcoal-l);margin-bottom:24px;display:flex;gap:8px;align-items:center}
    .breadcrumb a{color:var(--terra)}
    .article-cat{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--terra);margin-bottom:12px}
    h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,56px);letter-spacing:1px;color:var(--charcoal);line-height:1;margin-bottom:16px}
    .article-meta{font-family:'Barlow Condensed',sans-serif;font-size:12px;color:var(--charcoal-l);margin-bottom:32px;display:flex;gap:12px}
    .article-intro{font-size:18px;color:var(--charcoal);line-height:1.7;margin-bottom:32px;font-weight:500}
    h2{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.5px;color:var(--charcoal);margin:36px 0 14px}
    h3{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:var(--charcoal);margin:24px 0 10px}
    p{font-size:15px;color:var(--charcoal-l);line-height:1.8;margin-bottom:16px}
    ul,ol{padding-left:20px;margin-bottom:16px}
    li{font-size:15px;color:var(--charcoal-l);line-height:1.8;margin-bottom:6px}
    .highlight-box{background:#fff;border-left:4px solid var(--terra);border-radius:0 8px 8px 0;padding:18px 20px;margin:24px 0}
    .highlight-box p{margin:0;color:var(--charcoal)}
    .tip-box{background:rgba(61,170,106,.06);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:18px 20px;margin:24px 0}
    .tip-box p{margin:0;color:#1a6e35}
    .warning-box{background:rgba(232,160,32,.06);border:1px solid rgba(232,160,32,.2);border-radius:8px;padding:18px 20px;margin:24px 0}
    .warning-box p{margin:0;color:#856404}
    .cost-table{width:100%;border-collapse:collapse;margin:20px 0;background:#fff;border-radius:8px;overflow:hidden;border:1px solid var(--cream-d)}
    .cost-table th{background:var(--charcoal);color:#F5F0E8;padding:12px 16px;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
    .cost-table td{padding:12px 16px;font-size:14px;border-bottom:1px solid var(--cream-d);color:var(--charcoal-l)}
    .cost-table tr:last-child td{border-bottom:none}
    .cta-box{background:var(--terra);border-radius:12px;padding:28px;margin:36px 0;text-align:center}
    .cta-box h3{color:#fff;font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;margin-bottom:8px}
    .cta-box p{color:rgba(255,255,255,.8);margin-bottom:16px}
    .cta-btn{background:#fff;color:var(--terra);border:none;padding:12px 28px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;display:inline-block}
    .related{margin-top:48px;padding-top:32px;border-top:1px solid var(--cream-d)}
    .related-title{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--charcoal-l);margin-bottom:16px}
    .related-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .related-card{background:#fff;border:1px solid var(--cream-d);border-radius:8px;padding:16px;transition:border-color .2s}
    .related-card:hover{border-color:var(--terra)}
    .related-card-title{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:var(--charcoal);line-height:1.4}
    .footer{background:var(--charcoal);padding:24px 40px;text-align:center;font-size:12px;color:rgba(245,240,232,.3);margin-top:60px}
    @media(max-width:600px){.article-wrap{padding:40px 20px}.related-grid{grid-template-columns:1fr}.nav{padding:0 20px}}
  `

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'Article',
    headline:   'How to Find a Reliable Plumber in Johannesburg (2026 Guide)',
    description: 'Complete guide to finding vetted, affordable plumbers in Johannesburg without getting burned.',
    author: { '@type':'Organization', name:'Lungisa' },
    publisher: {
      '@type': 'Organization',
      name:    'Lungisa',
      logo:    { '@type':'ImageObject', url:'https://www.lungiza.co.za/logo.png' },
    },
    datePublished:  '2026-05-15',
    dateModified:   '2026-05-15',
    mainEntityOfPage: 'https://www.lungiza.co.za/blog/find-plumber-johannesburg',
    about: [
      { '@type':'Thing', name:'Plumbing services Johannesburg' },
      { '@type':'Thing', name:'Home repairs Gauteng' },
    ],
  }

  return (
    <>
      <style>{css}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>

      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div className="nav-hex">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <span className="nav-word">LUNGISA</span>
        </Link>
        <Link href="/auth"><button className="nav-cta">Post a job free</button></Link>
      </nav>

      <article className="article-wrap">
        <div className="breadcrumb">
          <Link href="/">Home</Link> › <Link href="/blog">Blog</Link> › Plumbing
        </div>

        <div className="article-cat">🔧 Plumbing</div>
        <h1>How to Find a Reliable Plumber in Johannesburg Without Getting Burned</h1>
        <div className="article-meta">
          <span>15 May 2026</span><span>·</span><span>5 min read</span><span>·</span><span>Johannesburg, Gauteng</span>
        </div>

        <p className="article-intro">
          Finding a trustworthy plumber in Johannesburg should be simple. It rarely is. This guide gives you a practical, no-nonsense approach to finding a vetted plumber near you — whether you&apos;re in Sandton, Soweto, Randburg or anywhere across Gauteng.
        </p>

        <h2>Why Finding a Good Plumber in JHB Is So Hard</h2>
        <p>Johannesburg has no shortage of plumbers. The problem is knowing which ones are reliable. Most homeowners rely on word of mouth — which works until your neighbour&apos;s recommendation pitches late, does the job poorly, and disappears before you can call them back.</p>
        <p>The other common approach is searching Google and calling whoever comes up first. But Google rankings don&apos;t tell you whether a plumber is licensed, reliable, or fairly priced.</p>

        <div className="warning-box">
          <p>⚠ <strong>The biggest mistake Johannesburg homeowners make:</strong> Paying a large deposit upfront before any work begins. This is how most plumbing scams work in Gauteng.</p>
        </div>

        <h2>What to Look for in a Johannesburg Plumber</h2>
        <h3>1. Registration with the Plumbing Industry Registration Board (PIRB)</h3>
        <p>All licensed plumbers in South Africa should be registered with the PIRB. You can verify a plumber&apos;s registration at pirb.co.za before hiring. An unregistered plumber doing major work is both illegal and a liability risk for your property.</p>

        <h3>2. Clear, written quotes before work starts</h3>
        <p>Any reputable plumber will give you a written quote before starting. If someone arrives at your home and immediately starts talking about call-out fees and materials without giving you a total, that&apos;s a red flag.</p>

        <h3>3. No large upfront payments</h3>
        <p>Materials may require a small deposit — that&apos;s normal. But paying 50-70% upfront before a plumber has done anything is not. Use an escrow payment service like Lungisa where your money is held safely and only released once you confirm the job is done.</p>

        <h3>4. Real reviews from real people</h3>
        <p>Google reviews can be faked. The most reliable reviews are from a platform where the reviewer completed an actual paid transaction — not just left a comment on a profile.</p>

        <h2>Average Plumbing Costs in Johannesburg (2026)</h2>
        <table className="cost-table">
          <thead>
            <tr><th>Job type</th><th>Average cost (JHB)</th><th>Range</th></tr>
          </thead>
          <tbody>
            <tr><td>Burst pipe repair</td><td>R650</td><td>R400 – R1,200</td></tr>
            <tr><td>Toilet replacement</td><td>R1,800</td><td>R1,200 – R3,000</td></tr>
            <tr><td>Geyser replacement</td><td>R4,500</td><td>R3,500 – R7,000</td></tr>
            <tr><td>Tap replacement</td><td>R450</td><td>R300 – R800</td></tr>
            <tr><td>Drain unblocking</td><td>R550</td><td>R350 – R900</td></tr>
            <tr><td>Leak detection</td><td>R800</td><td>R500 – R1,500</td></tr>
          </tbody>
        </table>
        <p>These are averages based on jobs completed across Johannesburg. Prices vary significantly by area, complexity, and materials. Always get at least 3 quotes before accepting.</p>

        <div className="tip-box">
          <p>💡 <strong>Pro tip:</strong> Emergency call-outs (same day) typically cost 30-50% more than standard bookings. If your issue isn&apos;t a true emergency, booking for the next day can save you hundreds of rands.</p>
        </div>

        <h2>The Fastest Way to Find a Plumber in Johannesburg Right Now</h2>
        <p>The fastest and safest way to find a plumber in Johannesburg is to post your job on Lungisa. Here&apos;s how it works:</p>
        <ol>
          <li>Post your job in 2 minutes — describe the problem, add a photo, set your budget</li>
          <li>Receive competitive bids from vetted, ID-verified plumbers in your area</li>
          <li>Negotiate directly — counter-offer until you agree on a fair price</li>
          <li>Pay securely via escrow — money only released when you confirm the job is done</li>
        </ol>

        <div className="cta-box">
          <h3>Need a Plumber in Johannesburg?</h3>
          <p>Post your job free. Get competitive bids from vetted plumbers near you. Pay safely in escrow.</p>
          <Link href="/auth"><span className="cta-btn">Post your job free →</span></Link>
        </div>

        <h2>Areas We Cover in Johannesburg</h2>
        <p>Lungisa connects homeowners with vetted plumbers across all major Johannesburg areas including Sandton, Fourways, Randburg, Midrand, Soweto, Roodepoort, Germiston, Boksburg, Benoni, Kempton Park, and surrounding Gauteng areas.</p>

        <h2>Frequently Asked Questions</h2>
        <h3>How much does a plumber cost in Johannesburg?</h3>
        <p>Most plumbing jobs in Johannesburg range from R400 to R2,000 for standard repairs. Geyser replacements and major pipe work can cost R3,500 to R7,000+. Always get multiple quotes.</p>

        <h3>Do I need a licensed plumber in South Africa?</h3>
        <p>For major work involving municipal connections, geyser installations or new pipe runs, yes — you legally need a PIRB-registered plumber. For minor repairs, registration is not legally required but strongly recommended.</p>

        <h3>How do I avoid getting scammed by a plumber?</h3>
        <p>Never pay large upfront deposits. Use platforms with escrow payment protection. Check reviews from verified completed jobs. Get a written quote before work starts.</p>

        <div className="related">
          <div className="related-title">Related articles</div>
          <div className="related-grid">
            <Link href="/blog/home-repairs-gauteng">
              <div className="related-card">
                <div className="related-card-title">💰 Home Repair Costs in Gauteng: What You Should Actually Be Paying in 2026</div>
              </div>
            </Link>
            <Link href="/blog/how-escrow-protects-homeowners">
              <div className="related-card">
                <div className="related-card-title">🔒 Why You Should Never Pay a Tradesperson Upfront</div>
              </div>
            </Link>
          </div>
        </div>
      </article>

      <footer className="footer">
        © 2026 Lungisa · TVM Capital Link Pty Ltd · Johannesburg, South Africa
      </footer>
    </>
  )
}