import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center justify-center gap-1.5 rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/15 px-3 py-2 sm:py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2B7FFF]/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-[4px] border border-[#232734] bg-[#11131A] px-3 py-2 sm:py-1.5 text-xs font-medium text-[#E5E7EB] transition-colors hover:border-[#2B7FFF] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] whitespace-nowrap shrink-0"
        >
          <Share className="h-3.5 w-3.5 text-[#8E96AA]" aria-hidden="true" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-[6px] border border-[#232734] bg-[#11131A] p-5 text-[#E5E7EB]">
              <div className="flex items-start justify-between gap-4 border-b border-[#232734] pb-3">
                <h3 id="ios-install-title" className="text-sm font-semibold text-white">
                  Install Astro FIT Console
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-[4px] border border-[#232734] p-1 text-[#8E96AA] hover:text-white"
                  aria-label="Close installation instructions"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2 text-xs text-[#8E96AA]">
                <li>1. Tap the Share button in Safari.</li>
                <li>2. Select Add to Home Screen.</li>
                <li>3. Launch Astro FIT for offline flight-deck access.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/15 py-2 text-xs font-semibold text-white hover:bg-[#2B7FFF]/25"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
