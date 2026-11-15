import React from 'react';
import {
  CloudOff,
  Download,
  RefreshCw,
  Satellite,
  X,
} from 'lucide-react';
import { OfflineTelemetryEntry } from '../lib/offlineSync';
import { MISSION_ENVIRONMENTS } from '../lib/hrpEngine';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  browserOnline: boolean;
  simulateBlackout: boolean;
  onToggleSimulateBlackout: () => void;
  isLinkAvailable: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAtIso: string | null;
  logs: OfflineTelemetryEntry[];
  onSyncNow: () => Promise<number>;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  browserOnline,
  simulateBlackout,
  onToggleSimulateBlackout,
  isLinkAvailable,
  isSyncing,
  pendingCount,
  lastSyncedAtIso,
  logs,
  onSyncNow,
}) => {
  if (!isOpen) return null;

  const handleExportBundle = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astro-fit-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-sync-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] sm:max-h-[85vh] w-full max-w-2xl flex-col rounded-t-[6px] sm:rounded-[6px] border border-[#232734] bg-[#11131A] text-[#E5E7EB]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#232734] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <div className="flight-micro-label truncate">IndexedDB Telemetry Buffer · DSN Link</div>
            <h2 id="offline-sync-title" className="mt-0.5 text-sm sm:text-base font-semibold text-white truncate">
              Deep-Space Offline Store &amp; Sync Queue
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-1.5 text-[#8E96AA] hover:border-[#2B7FFF] hover:text-white shrink-0"
            aria-label="Close offline sync modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Connectivity & Blackout Controls */}
        <div className="border-b border-[#232734] bg-[#0D0F15] px-4 py-3 sm:px-6 sm:py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs min-w-0">
              {isLinkAvailable ? (
                <Satellite className="h-4 w-4 text-[#10B981] shrink-0" aria-hidden="true" />
              ) : (
                <CloudOff className="h-4 w-4 text-[#F59E0B] shrink-0" aria-hidden="true" />
              )}
              <span className="font-mono-tabular font-medium text-white break-words">
                {isLinkAvailable
                  ? 'DSN TELEMETRY LINK AVAILABLE'
                  : !browserOnline
                  ? 'OFFLINE MODE — LOCAL CACHE ACTIVE'
                  : 'SIMULATED CONJUNCTION BLACKOUT — QUEUEING'}
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleSimulateBlackout}
              className={`w-full sm:w-auto rounded-[4px] border px-3 py-1.5 text-xs font-mono-tabular font-medium transition-colors whitespace-nowrap shrink-0 ${
                simulateBlackout
                  ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]'
                  : 'border-[#232734] bg-[#11131A] text-[#E5E7EB] hover:border-[#2B7FFF]'
              }`}
            >
              {simulateBlackout ? 'RESTORE DSN LINK' : 'SIMULATE BLACKOUT'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 text-xs text-[#8E96AA]">
            <div className="font-mono-tabular">
              QUEUED: <strong className="text-white">{pendingCount}</strong>
              <span className="mx-2 text-[#3B4254]">·</span>
              TOTAL: <strong className="text-white">{logs.length}</strong>
              {lastSyncedAtIso && (
                <>
                  <span className="mx-2 text-[#3B4254]">·</span>
                  LAST SYNC: {new Date(lastSyncedAtIso).toLocaleTimeString()}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBundle}
                disabled={logs.length === 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-[4px] border border-[#232734] bg-[#11131A] px-3 py-1.5 text-xs font-medium text-[#E5E7EB] hover:border-[#2B7FFF] disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={() => void onSyncNow()}
                disabled={!isLinkAvailable || pendingCount === 0 || isSyncing}
                className="inline-flex items-center justify-center gap-1.5 rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2B7FFF]/30 disabled:opacity-40"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-[#2B7FFF] ${isSyncing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isSyncing ? 'TRANSMITTING...' : 'SYNC QUEUE'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto bg-[#090A0F] px-4 py-4 sm:px-6">
          {logs.length === 0 ? (
            <div className="rounded-[4px] border border-dashed border-[#232734] py-10 px-4 text-center text-xs text-[#8E96AA]">
              No telemetry checkpoints logged. Submit a vitals reading to inspect IndexedDB queueing.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((entry) => {
                const env = MISSION_ENVIRONMENTS[entry.environmentId];
                const isPending = entry.syncStatus === 'pending';
                return (
                  <div
                    key={entry.id}
                    className="rounded-[4px] border border-[#232734] bg-[#11131A] p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[#8E96AA]">
                        <span className="font-semibold text-white">
                          {new Date(entry.loggedAtIso).toLocaleString()}
                        </span>
                        <span className="text-[#3B4254]">·</span>
                        <span>{env.shortName}</span>
                      </div>
                      <span
                        className={`font-mono-tabular text-[11px] font-semibold ${
                          isPending ? 'text-[#F59E0B]' : 'text-[#10B981]'
                        }`}
                      >
                        {isPending ? '▲ QUEUED OFFLINE' : '● SYNCED'}
                      </span>
                    </div>
                    <div className="mt-1.5 font-mono-tabular text-[#E5E7EB] break-words">
                      HR {entry.readings.heartRate} bpm · BP {entry.readings.systolicBP}/{entry.readings.diastolicBP} mmHg · RAD {entry.readings.cumulativeRadiation.toFixed(1)} mSv · SLEEP {entry.readings.sleepHours.toFixed(1)}h · COG {entry.readings.moodCognitiveScore.toFixed(1)}/10
                    </div>
                    {entry.notes && (
                      <p className="mt-1 text-[#8E96AA] break-words">{entry.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
