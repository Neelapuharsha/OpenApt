import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#fff7ed] border border-[#fed7aa] px-3.5 py-2 text-xs font-semibold text-[#b45309] shadow-md">
      <WifiOff className="w-4 h-4 text-[#b45309]" />
      <span>Offline Mode — Cached data is being used.</span>
    </div>
  );
};
