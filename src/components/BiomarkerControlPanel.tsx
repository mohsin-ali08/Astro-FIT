import React, { useState } from 'react';
import { RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
import {
  BiomarkerEvaluation,
  BiomarkerKey,
  BiomarkerReading,
  BodySystemId,
  ClinicalStatus,
} from '../lib/hrpEngine';

interface BiomarkerControlPanelProps {
  evaluations: Record<BiomarkerKey, BiomarkerEvaluation>;
  readings: BiomarkerReading;
  isModified: boolean;
  isLinkAvailable: boolean;
  onUpdateBiomarker: (key: BiomarkerKey, value: number) => void;
  onResetScenario: () => void;
  onLogTelemetry: (notes: string) => Promise<void>;
  onSelectSystem: (systemId: BodySystemId) => void;
}

interface SliderSpec {
  key: BiomarkerKey;
  min: number;
  max: number;
  step: number;
}

const SLIDER_SPECS: SliderSpec[] = [
  { key: 'heartRate', min: 40, max: 145, step: 1 },
  { key: 'systolicBP', min: 80, max: 170, step: 1 },
  { key: 'diastolicBP', min: 45, max: 110, step: 1 },
  { key: 'bloodGlucose', min: 50, max: 190, step: 1 },
  { key: 'bodyTemp', min: 35.0, max: 39.5, step: 0.1 },
  { key: 'sleepHours', min: 2.5, max: 10.5, step: 0.1 },
  { key: 'cumulativeRadiation', min: 0, max: 220, step: 0.5 },
  { key: 'boneDensityIndex', min: -2.5, max: 1.5, step: 0.05 },
  { key: 'moodCognitiveScore', min: 1.0, max: 10.0, step: 0.1 },
];

const STATUS_STYLE: Record<
  ClinicalStatus,
  { border: string; text: string; glyph: string; label: string }
> = {
  NOMINAL: {
    border: 'border-[#232734] hover:border-[#3B4254]',
    text: 'text-[#10B981]',
    glyph: '●',
    label: 'NOMINAL',
  },
  CAUTION: {
    border: 'border-[#F59E0B]/60',
    text: 'text-[#F59E0B]',
    glyph: '▲',
    label: 'CAUTION',
  },
  CRITICAL: {
    border: 'border-[#EF4444]/70',
    text: 'text-[#EF4444]',
    glyph: '✖',
    label: 'CRITICAL',
  },
};

export const BiomarkerControlPanel: React.FC<BiomarkerControlPanelProps> = ({
  evaluations,
  readings,
  isModified,
  isLinkAvailable,
  onUpdateBiomarker,
  onResetScenario,
  onLogTelemetry,
  onSelectSystem,
}) => {
  const [logNotes, setLogNotes] = useState('');
  const [logFeedback, setLogFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onLogTelemetry(logNotes.trim() || 'Routine crew self-logged telemetry checkpoint');
      setLogNotes('');
      setLogFeedback(
        isLinkAvailable
          ? 'Saved locally & synced to Mission Control'
          : 'Saved offline in IndexedDB queue'
      );
      setTimeout(() => setLogFeedback(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="flex flex-col rounded-[6px] border border-[#232734] bg-[#11131A] p-3.5 sm:p-4 h-full">
      <div className="flex items-center justify-between gap-2 border-b border-[#232734] pb-3">
        <div>
          <div className="flight-micro-label">Sensor Channels · 9 Inputs</div>
          <div className="mt-0.5 flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">
              Biomarker Telemetry
            </h2>
          </div>
        </div>
        {isModified && (
          <button
            type="button"
            onClick={onResetScenario}
            className="inline-flex items-center gap-1 rounded-[4px] border border-[#232734] bg-[#0D0F15] px-2.5 py-1.5 sm:py-1 text-[11px] font-mono-tabular text-[#8E96AA] hover:border-[#2B7FFF] hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>RESET</span>
          </button>
        )}
      </div>

      {/* Biomarker Sliders / Live Readouts */}
      <div className="mt-3 flex-1 space-y-2">
        {SLIDER_SPECS.map((spec) => {
          const ev = evaluations[spec.key];
          const style = STATUS_STYLE[ev.status];
          const val = readings[spec.key];

          return (
            <div
              key={spec.key}
              className={`rounded-[4px] border ${style.border} bg-[#0D0F15] p-2.5 transition-colors`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectSystem(ev.systemId)}
                  className="text-left flight-micro-label hover:text-[#2B7FFF] transition-colors truncate"
                >
                  {ev.label}
                </button>
                <span className={`font-mono-tabular text-[10px] font-semibold ${style.text} shrink-0`}>
                  {style.glyph} {style.label}
                </span>
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline">
                  <span className="font-mono-tabular text-lg font-semibold text-white">
                    {val.toFixed(ev.precision)}
                  </span>
                  <span className="ml-1.5 font-mono-tabular text-[11px] text-[#8E96AA]">
                    {ev.unit}
                  </span>
                </div>
                <span className="font-mono-tabular text-[10px] text-[#8E96AA]">
                  NOM {ev.nominalRangeText}
                </span>
              </div>

              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={val}
                aria-label={`${ev.label} (${ev.unit})`}
                onChange={(e) => onUpdateBiomarker(spec.key, Number(e.target.value))}
                className="mt-2 h-2 sm:h-1.5 w-full cursor-pointer appearance-none rounded-[2px] bg-[#232734] accent-[#2B7FFF] touch-pan-y"
              />
            </div>
          );
        })}
      </div>

      {/* Self-Log & Offline Queue Capture Form */}
      <form
        onSubmit={(e) => void handleSave(e)}
        className="mt-3 border-t border-[#232734] pt-3 space-y-2"
      >
        <input
          type="text"
          value={logNotes}
          onChange={(e) => setLogNotes(e.target.value)}
          placeholder="Crew annotation (e.g. Post-ARED / EVA)"
          aria-label="Crew telemetry log note"
          className="w-full rounded-[4px] border border-[#232734] bg-[#090A0F] px-3 py-2 sm:py-1.5 text-xs text-white placeholder:text-[#8E96AA]/60 focus:border-[#2B7FFF] focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/15 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2B7FFF]/25 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF]"
        >
          <Save className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
          <span>
            {saving
              ? 'RECORDING...'
              : isLinkAvailable
              ? 'LOG VITALS & SYNC'
              : 'LOG TO OFFLINE QUEUE'}
          </span>
        </button>
        {logFeedback && (
          <p className="text-center font-mono-tabular text-[11px] text-[#10B981]" role="status">
            {logFeedback}
          </p>
        )}
      </form>
    </aside>
  );
};
