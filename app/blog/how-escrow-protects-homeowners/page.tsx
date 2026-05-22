import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Why You Should Never Pay a Tradesperson Upfront in South Africa',
  description: 'Paying upfront is the number one home repair mistake in South Africa. Learn how escrow payment protects you, what your rights are, and how to pay safely for any home repair job.',
  keywords: ['escrow payment home repairs', 'tradesperson scam South Africa', 'safe payment home repair', 'protect yourself home repairs SA', 'deposit tradesperson South Africa'],
  openGraph: {
    title:       'Why You Should Never Pay a Tradesperson Upfront in SA',
    description: 'How escrow payment protects Gauteng homeowners from scams and incomplete work.',
    url:         'https://www.lungiza.co.za/blog/how-escrow-protects-homeowners',
    type:        'article',
  },
}

export default function EscrowProtectsHomeowners() {
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
    li{font-size:15px;color:var(--charcoal-l);line-height:1.8;margin-bottom:8px}
    .step-box{background:#fff;border:1px solid var(--cream-d);border-radius:10px;padding:20px;margin:12px 0;display:flex;gap:16px;align-items:flex-start}
    .step-num{width:36px;height:36px;border-radius:50%;background:var(--terra);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:18px;color:#fff;flex-shrink:0}
    .step-title{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--charcoal);margin-bottom:4px}
    .step-desc{font-size:14px;color:var(--charcoal-l);line-height:1.6}
    .warning-box{background:rgba(226,75,74,.06);border:1px solid rgba(226,75,74,.2);border-radius:8px;padding:18px 20px;margin:24px 0}
    .warning-box p{margin:0;color:#b03030}
    .tip-box{background:rgba(61,170,106,.06);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:18px 20px;margin:24px 0}
    .tip-box p{margin:0;color:#1a6e35}
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

  return (
    <>
      <style>{css}</style>
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
          <Link href="/">Home</Link> › <Link href="/blog">Blog</Link> › Safety & Protection
        </div>

        <div className="article-cat">🔒 Safety & Protection</div>
        <h1>Why You Should Never Pay a Tradesperson Upfront — And What to Do Instead</h1>
        <div className="article-meta">
          <span>3 May 2026</span><span>·</span><span>4 min read</span><span>·</span><span>South Africa</span>
        </div>

        <p className="article-intro">
          Paying upfront is the single biggest mistake South African homeowners make when hiring tradespeople. Every week, Gauteng homeowners lose thousands of rands to tradespeople who take a deposit and never return. Here&apos;s how to protect yourself.
        </p>

        <h2>The Upfront Payment Problem in South Africa</h2>
        <p>The pattern is always the same. You find a plumber or electrician, they quote you a price, and then ask for 50% upfront to &quot;buy materials.&quot; You pay. They either disappear entirely, do substandard work, or keep asking for more money before finishing the job.</p>
        <p>This isn&apos;t a fringe problem. It&apos;s one of the most common consumer complaints in the home services industry across South Africa — and it disproportionately affects homeowners who have no platform to vet tradespeople before hiring.</p>

        <div className="warning-box">
          <p>⚠ <strong>Red flag:</strong> Any tradesperson asking for more than 20-30% upfront for materials on a standard repair job is a risk. For jobs under R5,000, no deposit should be required at all.</p>
        </div>

        <h2>What is Escrow Payment?</h2>
        <p>Escrow is a payment method where your money is held by a neutral third party — not the tradesperson — until you confirm the work is done to your satisfaction. Only then is the money released.</p>
        <p>This model protects both parties. The homeowner knows their money is safe. The tradesperson knows they will be paid as soon as the job is confirmed complete. There&apos;s no trust required — the system enforces fairness.</p>

        <h2>How Escrow Works on Lungisa</h2>
        <div className="step-box">
          <div className="step-num">1</div>
          <div>
            <div className="step-title">Homeowner pays into escrow</div>
            <div className="step-desc">Once a bid is accepted and a price is agreed, the homeowner pays the full amount. The money is held securely — not accessible to the tradesperson yet.</div>
          </div>
        </div>
        <div className="step-box">
          <div className="step-num">2</div>
          <div>
            <div className="step-title">Tradesperson completes the work</div>
            <div className="step-desc">The tradesperson does the job, then submits a completion report with photos and a description of what was done.</div>
          </div>
        </div>
        <div className="step-box">
          <div className="step-num">3</div>
          <div>
            <div className="step-title">Homeowner reviews and confirms</div>
            <div className="step-desc">The homeowner reviews the completion report and photos. If satisfied, they confirm — and payment is released immediately.</div>
          </div>
        </div>
        <div className="step-box">
          <div className="step-num">4</div>
          <div>
            <div className="step-title">Dispute if needed</div>
            <div className="step-desc">If the work wasn&apos;t done properly, the homeowner raises a dispute. The payment stays in escrow while the Lungisa team reviews and resolves it.</div>
          </div>
        </div>

        <div className="tip-box">
          <p>💡 <strong>The result:</strong> The tradesperson is incentivised to do good work — because they only get paid when you&apos;re satisfied. And you never lose money to a no-show or incomplete job.</p>
        </div>

        <h2>What If the Tradesperson Needs Materials Upfront?</h2>
        <p>This is a legitimate concern for larger jobs. A fair approach is to agree on a materials-only advance — typically 20-30% of the job value — with the balance held in escrow until completion. On Lungisa, this is built into the negotiation process so both parties can agree on terms before any money changes hands.</p>

        <h2>Your Rights as a South African Homeowner</h2>
        <ul>
          <li>Under the Consumer Protection Act (CPA), you have the right to receive services that are of acceptable quality</li>
          <li>You can cancel a contract for services that haven&apos;t been started with reasonable notice</li>
          <li>You are not legally obligated to pay for work that wasn&apos;t completed or was done poorly</li>
          <li>The National Consumer Commission handles complaints against service providers</li>
        </ul>

        <div className="cta-box">
          <h3>Pay Safely on Every Job</h3>
          <p>Every Lungisa job uses escrow. Your money is protected until you confirm the work is done right.</p>
          <Link href="/auth"><span className="cta-btn">Post your first job free →</span></Link>
        </div>

        <div className="related">
          <div className="related-title">Related articles</div>
          <div className="related-grid">
            <Link href="/blog/find-plumber-johannesburg">
              <div className="related-card">
                <div className="related-card-title">🔧 How to Find a Reliable Plumber in Johannesburg</div>
              </div>
            </Link>
            <Link href="/blog/home-repairs-gauteng">
              <div className="related-card">
                <div className="related-card-title">💰 Home Repair Costs in Gauteng 2026</div>
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