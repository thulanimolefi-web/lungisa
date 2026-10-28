'use client'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Barlow',sans-serif;background:#F5F0E8;color:#2C2C28}
    .wrap{max-width:760px;margin:0 auto;padding:48px 24px 80px}
    .back{display:inline-flex;align-items:center;gap:8px;background:transparent;border:1px solid #D4CAB8;border-radius:6px;padding:8px 14px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5A5952;cursor:pointer;margin-bottom:32px;transition:all .15s}
    .back:hover{border-color:#C4593A;color:#C4593A}
    .logo-row{display:flex;align-items:center;gap:10px;margin-bottom:32px}
    .hex{width:36px;height:36px;background:#C4593A;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center}
    .logo-word{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:3px;color:#2C2C28}
    h1{font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:1px;color:#2C2C28;margin-bottom:6px}
    .updated{font-size:13px;color:#5A5952;margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #C4593A}
    h2{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px;color:#2C2C28;margin:36px 0 12px}
    p{font-size:15px;color:#5A5952;line-height:1.8;margin-bottom:14px}
    ul{margin:0 0 14px 20px}
    li{font-size:15px;color:#5A5952;line-height:1.8;margin-bottom:6px}
    .highlight{background:rgba(196,89,58,.08);border-left:4px solid #C4593A;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;font-size:15px;color:#2C2C28;line-height:1.7}
    strong{color:#2C2C28;font-weight:600}
    a{color:#C4593A}
    .contact-box{background:#2C2C28;border-radius:12px;padding:24px;margin-top:40px;text-align:center}
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: css}} />
      <div className="wrap">
        <button className="back" onClick={()=>router.push('/')}>← Back to Lungisa</button>

        <div className="logo-row">
          <div className="hex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <span className="logo-word">LUNGISA</span>
        </div>

        <h1>Privacy Policy</h1>
        <div className="updated">Last updated: 28 October 2026 · TVM Capital Link Pty Ltd · lungiza.co.za</div>

        <div className="highlight">
          We collect only what we need to run the marketplace, we keep your banking details and ID documents protected, and we do not sell your personal information.
        </div>

        <h2>1. Who we are</h2>
        <p>Lungisa is operated by TVM Capital Link Pty Ltd (&ldquo;Lungisa&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), based in South Africa. We are the responsible party for the personal information described in this policy under the Protection of Personal Information Act 4 of 2013 (POPIA).</p>

        <h2>2. What we collect</h2>
        <p><strong>All users:</strong></p>
        <ul>
          <li>Name, email address, phone number, and the suburb or area you select</li>
          <li>Your account password (stored securely by our authentication provider, never in plain text)</li>
          <li>Messages, bids, job details and photos you add to the platform</li>
          <li>Basic usage and device information, such as pages visited and browser type</li>
        </ul>
        <p><strong>Homeowners:</strong> the job address or area you provide, so tradespeople can quote.</p>
        <p><strong>Tradespeople:</strong></p>
        <ul>
          <li>A copy of your South African ID document, for identity verification</li>
          <li>Your trade, service areas, experience and profile details</li>
          <li>Bank account details, so we can pay you by EFT</li>
        </ul>
        <p><strong>Payments:</strong> card payments are handled by Yoco. We do not see or store your full card number.</p>

        <h2>3. Why we use it</h2>
        <ul>
          <li>To create your account and run the marketplace: posting jobs, bidding, messaging and notifications</li>
          <li>To verify tradespeople and help keep the platform safe</li>
          <li>To hold payments in escrow, release payouts and resolve disputes</li>
          <li>To send you service emails, such as login codes, bid alerts and payment confirmations</li>
          <li>To understand how the platform is used and improve it</li>
          <li>To meet our legal and accounting obligations</li>
        </ul>

        <h2>4. Who we share it with</h2>
        <p>We share information only where needed to provide the service:</p>
        <ul>
          <li><strong>Between users:</strong> homeowners and tradespeople see the details needed to quote, agree and complete a job, such as names, areas, bids, reviews and verification status. Your ID document and banking details are not shown to other users.</li>
          <li><strong>Service providers:</strong> payment processing (Yoco), database and authentication hosting (Supabase), website hosting (Vercel), email delivery, and address search (Mapbox).</li>
          <li><strong>Analytics:</strong> if enabled, Google Analytics, to measure site usage.</li>
          <li><strong>Legal:</strong> where the law requires it or to protect our rights.</li>
        </ul>
        <p>We do not sell your personal information. Some of our providers process data outside South Africa. Where that happens, we expect them to protect it to a standard consistent with POPIA.</p>

        <h2>5. How long we keep it</h2>
        <p>We keep your information while your account is active and for as long afterwards as we need it for payments, disputes, tax and legal records. You can ask us to delete your account and personal information, subject to those obligations.</p>

        <h2>6. How we protect it</h2>
        <p>We use access controls, encrypted connections and secured storage for sensitive information such as banking details and ID documents. No online service is completely risk free. If a breach affects your information, we will notify you and the Information Regulator as the law requires.</p>

        <h2>7. Your rights</h2>
        <p>Under POPIA you may ask us to:</p>
        <ul>
          <li>Tell you what personal information we hold about you</li>
          <li>Correct or update it</li>
          <li>Delete it, where we no longer need it</li>
          <li>Stop using it for a purpose you object to</li>
        </ul>
        <p>Email <a href="mailto:info@lungiza.co.za?subject=Privacy%20request">info@lungiza.co.za</a> with the subject &ldquo;Privacy request&rdquo; and we will respond within a reasonable time. If you are not satisfied, you may lodge a complaint with the Information Regulator of South Africa at <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">inforegulator.org.za</a>.</p>

        <h2>8. Cookies and local storage</h2>
        <p>We use cookies and your browser&apos;s local storage to keep you signed in, remember small preferences (such as whether you dismissed the install prompt), and, if enabled, measure usage. You can clear these in your browser settings, but parts of the platform may stop working.</p>

        <h2>9. Children</h2>
        <p>Lungisa is for people aged 18 and over. We do not knowingly collect information from children.</p>

        <h2>10. Changes to this policy</h2>
        <p>We may update this policy from time to time. We will post the new version here and update the date above. If a change is material, we will notify you by email or in the app.</p>

        <h2>11. Contact</h2>
        <div className="contact-box">
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:'#F5F0E8',marginBottom:12}}>QUESTIONS ABOUT YOUR PRIVACY?</div>
          <a href="mailto:info@lungiza.co.za" style={{color:'#E07A5F',fontSize:15,fontWeight:600}}>info@lungiza.co.za</a>
          <p style={{color:'rgba(245,240,232,.4)',fontSize:13,marginTop:8}}>TVM Capital Link Pty Ltd · Gauteng, South Africa</p>
        </div>
      </div>
    </>
  )
}
