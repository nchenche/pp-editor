import React, { useCallback, useState } from 'react';

import DataPolicyDialog from '../common/DataPolicyDialog';
import { useShellTheme } from '../../theme/ShellThemeProvider';
import { APP_VERSION } from '../../config';

/* ── Logo map keyed by mode ─────────────────────────────────────────────── */
const LOGOS = {
  dark: {
    upc:    '/assets/logo/UniversiteParis_monogramme_couleur_RVB.png',
    cnrs:   '/assets/logo/LOGO_CNRS_BLANC.png',
    inserm: '/assets/logo/InsermSeul_rvb_blanc.png',
  },
  light: {
    upc:    '/assets/logo/UniversiteParis_monogramme_couleur_RVB.png',
    cnrs:   '/assets/logo/LOGO_CNRS_BLEU.png',
    inserm: '/assets/logo/InsermSeul_Rvb__noir.png',
  },
};

const LOGO_HEIGHT = 24;

/* ── Styled external link (opens new tab) ────────────────────────────────── */
function ExtLink({ href, style, children, ...rest }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', ...style }}
      {...rest}
    >
      {children}
    </a>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */
function Footer() {
  const { shell, mode } = useShellTheme();
  const [open, setOpen] = useState(false);

  const openPolicy = useCallback(() => setOpen(true), []);
  const closePolicy = useCallback(() => setOpen(false), []);

  const logos = LOGOS[mode] || LOGOS.dark;

  const linkStyle = {
    color: shell.textMuted,
    textDecoration: 'none',
    transition: 'color 0.15s',
  };
  const linkHoverHandlers = {
    onMouseEnter: (e) => { e.currentTarget.style.color = shell.text; },
    onMouseLeave: (e) => { e.currentTarget.style.color = shell.textMuted; },
  };

  return (
    <footer
      className="mt-auto shrink-0"
      style={{
        padding: '6px 20px',
        backgroundColor: shell.bg,
        borderTop: `1px solid ${shell.border}`,
        color: shell.textMuted,
      }}
    >
      <div className="flex items-center justify-between gap-4" style={{ minHeight: 36 }}>
        {/* ── Left: institution logos ──────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <ExtLink href="https://u-paris.fr/">
            <img src={logos.upc} alt="Université Paris Cité" height={LOGO_HEIGHT} style={{ height: LOGO_HEIGHT, width: 'auto' }} />
          </ExtLink>
          <ExtLink href="https://www.cnrs.fr/">
            <img src={logos.cnrs} alt="CNRS" height={LOGO_HEIGHT} style={{ height: LOGO_HEIGHT, width: 'auto' }} />
          </ExtLink>
          <ExtLink href="https://www.inserm.fr/">
            <img src={logos.inserm} alt="Inserm" height={LOGO_HEIGHT} style={{ height: LOGO_HEIGHT, width: 'auto' }} />
          </ExtLink>
        </div>

        {/* ── Center: copyright & affiliation ─────────────────────────── */}
        <div className="flex flex-col items-center text-center leading-tight" style={{ fontSize: '0.75rem' }}>
          <span>
            © 2025 PEP-EDIT —{' '}
            <ExtLink href="https://bfa.u-pariscite.fr/rpbs/" style={linkStyle} {...linkHoverHandlers}>
              RPBS Platform
            </ExtLink>
          </span>
          <span style={{ opacity: 0.8 }}>
            <ExtLink href="https://bfa.u-pariscite.fr/" style={linkStyle} {...linkHoverHandlers}>
              BFA
            </ExtLink>
            {' — '}
            <ExtLink href="https://bfa.u-pariscite.fr/" style={linkStyle} {...linkHoverHandlers}>
              UMR 8251
            </ExtLink>
            {' · '}
            <ExtLink href="https://u-paris.fr/" style={linkStyle} {...linkHoverHandlers}>
              Université Paris Cité
            </ExtLink>
          </span>
        </div>

        {/* ── Right: version + policy ─────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0" style={{ fontSize: '0.75rem' }}>
          <span
            style={{
              border: `1px solid ${shell.border}`,
              borderRadius: 4,
              padding: '1px 6px',
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: shell.textMuted,
            }}
          >
            v{APP_VERSION}
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <button
            type="button"
            className="underline underline-offset-2"
            style={{ color: shell.textMuted, fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = shell.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = shell.textMuted; }}
            onClick={openPolicy}
          >
            Data &amp; Privacy Policy
          </button>
        </div>
      </div>

      <DataPolicyDialog open={open} mode="footer" onClose={closePolicy} />
    </footer>
  );
}

export default Footer;