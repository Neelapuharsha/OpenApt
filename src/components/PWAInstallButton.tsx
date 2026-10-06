import React, { useState } from 'react';
import { Smartphone, Download, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.js';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#16803c] bg-[#ecfdf3] border border-[#d1fae5] rounded-full">
        App Active
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowIOSGuide(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f5f6f8] px-2.5 py-1.5 text-xs font-medium text-[#4b5563] transition"
        title="Install OpenApt on device"
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-600" />
        <span>Install</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-[#1f2937]">Install OpenApt</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f5f6f8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#4b5563]">
              <div className="p-3 bg-[#f5f6f8] rounded-lg border border-[#e5e7eb] space-y-1.5">
                <div className="font-semibold text-blue-600 flex items-center gap-1.5">
                  <Share className="w-3.5 h-3.5" />
                  iPhone & iPad (Safari):
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[#374151]">
                  <li>Tap the <strong>Share</strong> button at bottom bar.</li>
                  <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
                </ol>
              </div>

              <div className="p-3 bg-[#f5f6f8] rounded-lg border border-[#e5e7eb] space-y-1.5">
                <div className="font-semibold text-blue-600 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Android (Chrome):
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[#374151]">
                  <li>Tap the three dots menu (⋮).</li>
                  <li>Select <strong>Install App</strong>.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-sm transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
