import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How to Hire a Reliable Electrician in Sandton & Fourways (2026 Guide)',
  description: 'Looking for an electrician in Sandton or Fourways? Find out what to check before hiring, average costs, and how to avoid unlicensed electrical work in Gauteng.',
  keywords: ['electrician Sandton', 'electrician Fourways', 'electrician Johannesburg', 'find electrician Gauteng', 'licensed electrician JHB', 'emergency electrician Sandton'],
  openGraph: {
    title:       'How to Hire a Reliable Electrician in Sandton & Fourways',
    description: 'The complete guide to finding a licensed, affordable electrician in Sandton, Fourways and surrounding Johannesburg areas.',
    url:         'https://www.lungiza.co.za/blog/electrician-sandton',
    type:        'article',
  },
}

export default function ElectricianSandton() {
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
    .warning-box{background:rgba(226,75,74,.06);border:1px solid rgba(226,75,74,.2);border-radius:8px;padding:18px 20px;margin:24px 0}
    .warning-box p{margin:0;color:#b03030}
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
    '@type': 'Article',
    headline: 'How to Hire a Reliable Electrician in Sandton & Fourways (2026 Guide)',
    description: 'Complete guide to finding a licensed electrician in Sandton and Fourways.',
    author: { '@type': 'Organization', name: 'Lungisa' },
    publisher: { '@type': 'Organization', name: 'Lungisa' },
    datePublished: '2026-05-12',
    dateModified: '2026-05-12',
    mainEntityOfPage: 'https://www.lungiza.co.za/blog/electrician-sandton',
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
          <Link href="/">Home</Link> › <Link href="/blog">Blog</Link> › Electrical
        </div>

        <div className="article-cat">⚡ Electrical</div>
        <h1>What to Look for When Hiring an Electrician in Sandton and Fourways</h1>
        <div className="article-meta">
          <span>12 May 2026</span><span>·</span><span>4 min read</span><span>·</span><span>Sandton, Fourways, Gauteng</span>
        </div>

        <p className="article-intro">
          Electrical work done wrong doesn&apos;t just cost money to fix — it can burn your house down. Before you hire anyone to touch your wiring in Sandton, Fourways, or anywhere in Gauteng, here&apos;s exactly what to check.
        </p>

        <h2>Why Electrical Work Is Different from Other Home Repairs</h2>
        <p>Unlike painting or tiling, electrical work carries real safety risks. Faulty wiring causes roughly 30% of residential fires in South Africa. More importantly, electrical work that doesn&apos;t comply with SANS 10142 (the South African wiring code) can void your home insurance — meaning a claim after a fire could be rejected.</p>

        <div className="warning-box">
          <p>⚠ <strong>Important:</strong> In South Africa, all electrical installation work must be done by a registered electrician and a Certificate of Compliance (CoC) must be issued. Without a CoC, your insurance may not cover electrical damage or fire.</p>
        </div>

        <h2>Check Registration with the Department of Labour</h2>
        <p>All electricians in South Africa must be registered with the Department of Employment and Labour as either a Master Installation Electrician or Installation Electrician. You can verify registration at <strong>labour.gov.za</strong>.</p>
        <p>Anyone offering electrical work without this registration is operating illegally — and the risk falls on you as the homeowner.</p>

        <h2>The Certificate of Compliance (CoC)</h2>
        <p>For any electrical installation work — new circuits, DB board upgrades, new plugs or lights — a CoC must be issued. This certificate confirms the work meets South African safety standards. Always ask for a CoC before paying in full. If an electrician says you don&apos;t need one, find someone else.</p>

        <h2>Average Electrician Costs in Sandton and Fourways (2026)</h2>
        <table className="cost-table">
          <thead>
            <tr><th>Job type</th><th>Average cost</th><th>Range</th></tr>
          </thead>
          <tbody>
            <tr><td>DB board inspection</td><td>R800</td><td>R600 – R1,200</td></tr>
            <tr><td>DB board replacement</td><td>R3,500</td><td>R2,500 – R5,500</td></tr>
            <tr><td>Add new plug point</td><td>R650</td><td>R400 – R1,000</td></tr>
            <tr><td>Fault finding</td><td>R750</td><td>R500 – R1,200</td></tr>
            <tr><td>Outdoor light installation</td><td>R900</td><td>R600 – R1,500</td></tr>
            <tr><td>Certificate of Compliance</td><td>R1,200</td><td>R800 – R2,000</td></tr>
            <tr><td>Load shedding inverter install</td><td>R8,000</td><td>R5,000 – R15,000</td></tr>
          </tbody>
        </table>

        <div className="tip-box">
          <p>💡 <strong>Sandton and Fourways premium:</strong> Electricians in these areas often charge 20-30% more than Randburg or Roodepoort rates. Use Lungisa to get multiple bids and negotiate — homeowners regularly save R500-R1,500 on jobs over R3,000.</p>
        </div>

        <h2>5 Questions to Ask Before Hiring an Electrician</h2>
        <ol>
          <li><strong>Are you registered with the Department of Labour?</strong> Ask for their registration number.</li>
          <li><strong>Will you issue a Certificate of Compliance?</strong> Non-negotiable for any installation work.</li>
          <li><strong>Can you provide references from recent jobs in this area?</strong> Local experience matters.</li>
          <li><strong>What is included in your quote?</strong> Labour, materials, call-out fee — all should be itemised.</li>
          <li><strong>What happens if there are hidden issues?</strong> Good electricians communicate extras upfront, not after the fact.</li>
        </ol>

        <h2>Red Flags to Watch Out For</h2>
        <ul>
          <li>Quotes significantly lower than everyone else — often means corners are being cut</li>
          <li>Refuses to issue a CoC or says &quot;it&apos;s not necessary for this job&quot;</li>
          <li>Asks for full payment upfront before any work is done</li>
          <li>Cannot show registration documents when asked</li>
          <li>No physical address or verifiable contact details</li>
        </ul>

        <div className="cta-box">
          <h3>Need an Electrician in Sandton or Fourways?</h3>
          <p>Post your job on Lungisa. Get bids from registered, vetted electricians near you. Pay safely in escrow — money released only when you&apos;re satisfied.</p>
          <Link href="/auth"><span className="cta-btn">Post your job free →</span></Link>
        </div>

        <h2>Frequently Asked Questions</h2>
        <h3>How much does an electrician cost in Sandton?</h3>
        <p>Most standard electrical jobs in Sandton range from R600 to R2,500. DB board work, solar and inverter installations cost significantly more. Always get at least 3 quotes.</p>

        <h3>Do I need a Certificate of Compliance for minor electrical work?</h3>
        <p>Technically, a CoC is required for any new installation. For simple repairs like replacing a light switch, it is less strictly enforced — but for anything involving new circuits, DB boards or outdoor wiring, insist on a CoC.</p>

        <h3>Can I do my own electrical work in South Africa?</h3>
        <p>Minor repairs like replacing a plug cover are generally acceptable. Any work involving wiring, DB boards or new installations must legally be done by a registered electrician.</p>

        <div className="related">
          <div className="related-title">Related articles</div>
          <div className="related-grid">
            <Link href="/blog/home-repairs-gauteng">
              <div className="related-card">
                <div className="related-card-title">💰 Home Repair Costs in Gauteng 2026</div>
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