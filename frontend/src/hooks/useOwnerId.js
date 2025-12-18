import { useEffect, useState } from 'react';

import {
  getOwnerId,
  OWNER_ID_CHANGED_EVENT,
  OWNER_ID_STORAGE_KEY,
} from '../utils/api';

export function useOwnerId() {
  const [ownerId, setOwnerId] = useState(() => getOwnerId());

  useEffect(() => {
    const update = () => setOwnerId(getOwnerId());

    window.addEventListener(OWNER_ID_CHANGED_EVENT, update);

    // Cross-tab updates
    const onStorage = (e) => {
      if (e?.key === OWNER_ID_STORAGE_KEY) update();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(OWNER_ID_CHANGED_EVENT, update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return ownerId;
}
