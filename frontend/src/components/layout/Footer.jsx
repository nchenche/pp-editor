import React, { useCallback, useState } from 'react';

import DataPolicyDialog from '../common/DataPolicyDialog';

function Footer() {
  const [open, setOpen] = useState(false);

  const openPolicy = useCallback(() => setOpen(true), []);
  const closePolicy = useCallback(() => setOpen(false), []);

  return (
    <footer className="p-4 mt-auto">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <p className="text-sm text-center">© 2025 PEP-EDIT - RPBS Platform</p>
        <button
          type="button"
          className="text-sm underline underline-offset-2 opacity-80 hover:opacity-100"
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