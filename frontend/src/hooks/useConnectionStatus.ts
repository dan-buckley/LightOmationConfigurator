import { useEffect, useState } from 'react';

import { checkHealth } from '../api/health';

export function useConnectionStatus(): boolean | null {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const result = await checkHealth();
      setConnected(result.ok);
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  return connected;
}
