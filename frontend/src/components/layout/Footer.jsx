import React, { useCallback, useState } from 'react';

import DataPolicyDialog from '../common/DataPolicyDialog';
import { useShellTheme } from '../../theme/ShellThemeProvider';

function Footer() {
  const { shell } = useShellTheme();
  const [open, setOpen] = useState(false);

  const openPolicy = useCallback(() => setOpen(true), []);
  const closePolicy = useCallback(() => setOpen(false), []);

  return (
    <footer
      className="mt-auto shrink-0"
      style={{
        padding: '10px 16px',
        backgroundColor: shell.bg,
        borderTop: `1px solid ${shell.border}`,
        color: shell.textMuted,
      }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <p className="text-sm text-center">© 2025 PEP-EDIT - RPBS Platform</p>
        <button
          type="button"
          className="text-sm underline underline-offset-2"
          style={{ color: shell.accent, opacity: 0.85 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
          onClick={openPolicy}
        >
          Data & Privacy Policy
        </button>
      </div>

      <DataPolicyDialog open={open} mode="footer" onClose={closePolicy} />
    </footer>
  );
}

export default Footer;