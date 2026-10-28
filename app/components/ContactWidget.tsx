'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ContactWidget
 * Floating WhatsApp + call widget for Lungisa.
 *
 * Drop in at: app/components/ContactWidget.tsx
 * Wire up in: app/layout.tsx  (renders on every page)
 *
 * No external dependencies. Inline styles, so it will not clash
 * with Tailwind or any existing stylesheet.
 */

// ---- Single source of truth for contact details ----------------------------
export const LUNGISA_CONTACT = {
  whatsappNumber: '27790737563',        // international, no + and no spaces
  displayNumber: '079 073 7563',
  telHref: 'tel:+27790737563',
  groupLink: 'https://chat.whatsapp.com/CL7luclh6tAJziltptijV0',
  email: 'info@lungiza.co.za',
};

const BRAND_ORANGE = '#C4593A';   // site terracotta
const WHATSAPP_GREEN = '#25D366';
const INK = '#1F1F1F';

// Pre-filled message so you can tell where the lead came from
const waMessage = encodeURIComponent(
  "Hi Lungisa, I have a question about the platform."
);
const waHref = `https://wa.me/${LUNGISA_CONTACT.whatsappNumber}?text=${waMessage}`;

export default function ContactWidget() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hidden = pathname?.startsWith('/admin') || pathname === '/reset-password';

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const actions = [
    {
      label: 'Chat on WhatsApp',
      sub: LUNGISA_CONTACT.displayNumber,
      href: waHref,
      color: WHATSAPP_GREEN,
      icon: <WhatsAppIcon />,
    },
    {
      label: 'Tradespeople WhatsApp group',
      sub: 'Join the Lungisa community',
      href: LUNGISA_CONTACT.groupLink,
      color: WHATSAPP_GREEN,
      icon: <GroupIcon />,
    },
    {
      label: 'Call us',
      sub: LUNGISA_CONTACT.displayNumber,
      href: LUNGISA_CONTACT.telHref,
      color: BRAND_ORANGE,
      icon: <PhoneIcon />,
      newTab: false,
    },
  ];

  if (hidden) return null;

  return (
    <>
    <style dangerouslySetInnerHTML={{__html: `.lz-cw{right:16px;bottom:calc(84px + env(safe-area-inset-bottom))}@media (min-width:901px){.lz-cw{right:20px;bottom:20px}}`}} />
    <div
      ref={wrapRef}
      className="lz-cw"
      style={{
        position: 'fixed',
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {open && (
        <div
          role="menu"
          style={{
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            width: 264,
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              background: INK,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.2,
            }}
          >
            Talk to Lungisa
          </div>

          {actions.map((a) => (
            <a
              key={a.label}
              href={a.href}
              target={a.newTab === false ? undefined : '_blank'}
              rel={a.newTab === false ? undefined : 'noopener noreferrer'}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 16px',
                textDecoration: 'none',
                color: INK,
                borderTop: '1px solid rgba(0,0,0,0.06)',
                transition: 'background 140ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = '#F7F7F7';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: a.color,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {a.icon}
              </span>
              <span style={{ lineHeight: 1.3 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>
                  {a.label}
                </span>
                <span style={{ display: 'block', fontSize: 12, opacity: 0.6 }}>
                  {a.sub}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}

      <button
        type="button"
        aria-label={open ? 'Close contact menu' : 'Contact Lungisa'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: open ? INK : WHATSAPP_GREEN,
          boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
          display: 'grid',
          placeItems: 'center',
          transition: 'background 160ms ease, transform 160ms ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        {open ? <CloseIcon /> : <WhatsAppIcon size={28} />}
      </button>
    </div>
    </>
  );
}

// ---- Inline footer block (optional, export separately) ---------------------

export function ContactFooterBlock() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: 14,
      }}
    >
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        style={pillStyle(WHATSAPP_GREEN)}
      >
        <WhatsAppIcon size={16} /> WhatsApp {LUNGISA_CONTACT.displayNumber}
      </a>
      <a href={LUNGISA_CONTACT.telHref} style={pillStyle(BRAND_ORANGE)}>
        <PhoneIcon size={16} /> Call {LUNGISA_CONTACT.displayNumber}
      </a>
      <a
        href={LUNGISA_CONTACT.groupLink}
        target="_blank"
        rel="noopener noreferrer"
        style={pillStyle(INK)}
      >
        <GroupIcon size={16} /> Join the tradespeople group
      </a>
    </div>
  );
}

function pillStyle(bg: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 999,
    background: bg,
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
  };
}

// ---- Icons -----------------------------------------------------------------

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.2 5.07 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 004.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.02h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.41a8.18 8.18 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23z" />
    </svg>
  );
}

function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function GroupIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
