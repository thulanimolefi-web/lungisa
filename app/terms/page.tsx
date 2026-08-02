'use client'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
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
    .contact-box{background:#2C2C28;border-radius:12px;padding:24px;margin-top:40px;text-align:center}
  `

  return (
    <>
      <style>{css}</style>
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

        <h1>Terms of Service</h1>
        <div className="updated">Last updated: 1 August 2026 · TVM Capital Link Pty Ltd · lungiza.co.za</div>

        <h2>1. About Lungisa</h2>
        <p>Lungisa is a home repair marketplace operated by TVM Capital Link Pty Ltd, registered in South Africa. We connect homeowners with vetted tradespeople through a competitive bidding platform with escrow-protected payments.</p>
        <p>By using lungiza.co.za you agree to these Terms of Service. Please read them carefully.</p>

        <h2>2. Who Can Use Lungisa</h2>
        <p>Lungisa is available to:</p>
        <ul>
          <li>Homeowners aged 18 and older located in South Africa</li>
          <li>Tradespeople aged 18 and older operating in South Africa</li>
          <li>Any person who has completed registration and verification</li>
        </ul>
        <p>We reserve the right to refuse or terminate access to anyone who violates these terms.</p>

        <h2>3. For Homeowners</h2>
        <p>Posting a job on Lungisa is free. When you accept a bid or quote, you agree to pay the agreed amount into escrow before work begins.</p>
        <div className="highlight">
          Your payment is held securely. It is released to the tradesperson only when you confirm the job is complete and done to your satisfaction. If you raise a dispute, payment remains in escrow until resolved by Lungisa.
        </div>
        <p>You agree to:</p>
        <ul>
          <li>Provide accurate descriptions of the work required</li>
          <li>Be available and responsive during the job process</li>
          <li>Confirm job completion promptly once the work is done</li>
          <li>Pay the agreed amount in full — no chargebacks without first raising a dispute through Lungisa</li>
        </ul>

        <h2>4. For Tradespeople</h2>
        <p>Joining Lungisa as a tradesperson is free. You pay a commission of <strong>8% on each successfully completed and paid job only</strong>. There are no subscription fees, no listing fees and no per-bid fees.</p>
        <div className="highlight">
          <strong>Commission structure:</strong> 8% of the agreed job amount is retained by Lungisa. The remaining 92% is paid to you via EFT to your registered bank account within 24 hours of the homeowner confirming completion.
        </div>
        <p>You agree to:</p>
        <ul>
          <li>Provide accurate and truthful profile information</li>
          <li>Upload a valid South African ID document for verification</li>
          <li>Bid only on jobs you are qualified and available to complete</li>
          <li>Complete jobs to a professional standard</li>
          <li>Submit completion photos and a work report before requesting payment release</li>
          <li>Not request or accept payment outside the Lungisa platform for jobs found through Lungisa</li>
        </ul>

        <h2>5. Payments and Escrow</h2>
        <p>Payments are processed through Yoco, a registered South African payment provider. Lungisa holds funds in trust between payment and release.</p>
        <ul>
          <li>All payments are in South African Rand (ZAR)</li>
          <li>Minimum job value: R300</li>
          <li>Lungisa commission: 8% of gross job amount</li>
          <li>Tradesperson payout: 92% of gross job amount</li>
          <li>Payout method: EFT to registered bank account</li>
          <li>Payout timing: within 24 hours of homeowner confirming completion</li>
        </ul>
        <p>Payment processing fees charged by Yoco are absorbed into Lungisa&apos;s commission and are not charged separately to homeowners or tradespeople.</p>

        <h2>6. Disputes</h2>
        <p>If a homeowner and tradesperson cannot agree on whether a job has been completed satisfactorily, either party may raise a dispute through the Lungisa platform.</p>
        <ul>
          <li>Payment remains in escrow during any active dispute</li>
          <li>Lungisa will review the dispute within 48 hours</li>
          <li>Both parties will be asked to provide evidence</li>
          <li>Lungisa&apos;s decision is final and binding</li>
          <li>Resolved funds are released within 24 hours of decision</li>
        </ul>

        <h2>7. Verification and Safety</h2>
        <p>All tradespeople are required to submit a valid South African ID document. Lungisa reviews and verifies these documents before awarding a verified badge. Homeowners can see the verification status of any tradesperson before accepting a bid.</p>
        <p>Lungisa does not guarantee the quality of work performed by tradespeople. We provide the platform, escrow protection and dispute resolution. The contract for services is between the homeowner and the tradesperson.</p>

        <h2>8. Prohibited Conduct</h2>
        <p>You may not:</p>
        <ul>
          <li>Create fake profiles or misrepresent your identity or qualifications</li>
          <li>Circumvent Lungisa payments by transacting directly outside the platform</li>
          <li>Leave false or misleading reviews</li>
          <li>Harass, threaten or abuse other users</li>
          <li>Use Lungisa for any unlawful purpose</li>
          <li>Attempt to reverse engineer, scrape or damage the platform</li>
        </ul>

        <h2>9. Intellectual Property</h2>
        <p>Lungisa, the Lungisa name, logo, tagline &ldquo;Post It. Bid It. Fix It.&rdquo; and all platform content are owned by TVM Capital Link Pty Ltd. You may not copy, reproduce or use any of these without written permission.</p>

        <h2>10. Limitation of Liability</h2>
        <p>Lungisa is a marketplace platform. We are not liable for the quality of work performed, injuries, property damage or losses arising from jobs arranged through the platform beyond the escrow amount held for that specific job.</p>

        <h2>11. Privacy</h2>
        <p>We collect and process personal information in accordance with the Protection of Personal Information Act (POPIA) 4 of 2013. Your banking details are encrypted and used only for processing payouts. We do not sell your data to third parties.</p>

        <h2>12. Changes to These Terms</h2>
        <p>We may update these terms from time to time. We will notify you by email and in-app notification when we make material changes. Continued use of Lungisa after changes constitutes acceptance of the updated terms.</p>

        <h2>13. Governing Law</h2>
        <p>These terms are governed by the laws of the Republic of South Africa. Any disputes arising from these terms will be resolved in South African courts.</p>

        <h2>14. Contact</h2>
        <div className="contact-box">
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:'#F5F0E8',marginBottom:12}}>QUESTIONS ABOUT THESE TERMS?</div>
          <p style={{color:'rgba(245,240,232,.6)',marginBottom:8}}>Contact us at any time:</p>
          <a href="mailto:info@lungiza.co.za" style={{color:'#E07A5F',fontSize:15,fontWeight:600}}>info@lungiza.co.za</a>
          <p style={{color:'rgba(245,240,232,.4)',fontSize:13,marginTop:8}}>TVM Capital Link Pty Ltd · Johannesburg, South Africa</p>
        </div>

      </div>
    </>
  )
}