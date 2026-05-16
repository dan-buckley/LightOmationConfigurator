import { useConnectionStatus } from '../hooks/useConnectionStatus';

export function ConnectionStatus() {
  const connected = useConnectionStatus();

  if (connected === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        Checking…
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 text-xs ${connected ? 'text-green-700' : 'text-red-600'}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
      />
      Backend {connected ? 'connected' : 'unreachable'}
    </div>
  );
}
