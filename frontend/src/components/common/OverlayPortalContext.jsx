import { createContext, useContext } from 'react';

const OverlayPortalContext = createContext(null);

export const OverlayPortalProvider = ({ rootRef, overlayActive, setOverlayActive, children }) => (
  <OverlayPortalContext.Provider value={{ rootRef, overlayActive, setOverlayActive }}>
    {children}
  </OverlayPortalContext.Provider>
);

export const useOverlayPortal = () => useContext(OverlayPortalContext);