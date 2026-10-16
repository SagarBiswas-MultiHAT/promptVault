/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT/promptVault)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Reactive wrapper around the browser's online/offline events.
 * Returns true when the browser reports a network connection.
 */

import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
