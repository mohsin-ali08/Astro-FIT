import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Brain,
  CheckCircle2,
  FileImage,
  ScanLine,
  Sliders,
  Timer,
  Upload,
  X,
} from 'lucide-react';
import {
  BiomarkerReading,
  ClinicalStatus,
  DiagnosticScanFinding,
} from '../lib/hrpEngine';

interface SelfCheckModalProps {
  isOpen: boolean;
  initialReadings: BiomarkerReading;
  isLinkAvailable: boolean;
  onClose: () => void;
  onSubmitSelfCheck: (payload: {
    readings: BiomarkerReading;
    scanFinding: DiagnosticScanFinding | null;
    notes: string;
  }) => Promise<void>;
}

type ModalTab = 'vitals' | 'pvt' | 'scan';
type PvtPhase = 'idle' | 'waiting' | 'stimulus' | 'complete';

interface ScanPreset {
  id: string;
  scanType: DiagnosticScanFinding['scanType'];
  scanLabel: string;
  targetSystem: DiagnosticScanFinding['targetSystem'];
  severity: ClinicalStatus;
  findingTitle: string;
  summary: string;
  suggestedBiomarkerPatch?: Partial<BiomarkerReading>;
}

const DIAGNOSTIC_SCAN_PRESETS: ScanPreset[] = [
  {
    id: 'ocular-nominal',
    scanType: 'ocular_sans',
    scanLabel: 'Ocular Optic Nerve Sheath Ultrasound (SANS)',
    targetSystem: 'neuro_behavioral',
    severity: 'NOMINAL',
    findingTitle: 'Nominal ONSD (4.4 mm bilateral)',
    summary: 'No posterior globe flattening or optic disc edema detected.',
  },
  {
    id: 'ocular-sans-elevated',
    scanType: 'ocular_sans',
    scanLabel: 'Ocular Optic Nerve Sheath Ultrasound (SANS)',
    targetSystem: 'neuro_behavioral',
    severity: 'CAUTION',
    findingTitle: 'Elevated ONSD (6.1 mm) · Mild SANS Fluid Shift',
    summary: 'Optic nerve sheath distension detected; recommend LBNP and visual acuity monitoring.',
    suggestedBiomarkerPatch: { moodCognitiveScore: 5.8 },
  },
  {
    id: 'msk-qus-dip',
    scanType: 'musculoskeletal_qus',
    scanLabel: 'Musculoskeletal Calcaneal QUS Bone Scan',
    targetSystem: 'musculoskeletal',
    severity: 'CAUTION',
    findingTitle: 'Trabecular Attenuation Dip (T-score -1.35)',
    summary: 'Early calcaneal mineral loss detected; escalate ARED resistive axial load.',
    suggestedBiomarkerPatch: { boneDensityIndex: -1.35 },
  },
  {
    id: 'cardiac-echo-strain',
    scanType: 'cardiac_echo',
    scanLabel: 'Thoracic Cardiac & IVC Filling Ultrasound',
    targetSystem: 'cardiovascular',
    severity: 'CRITICAL',
    findingTitle: 'Hyperdynamic LV & >55% IVC Collapse (Hypovolemia)',
    summary: 'Marked intravascular volume depletion; initiate immediate isotonic rehydration.',
    suggestedBiomarkerPatch: { heartRate: 112, systolicBP: 144 },
  },
];

export const SelfCheckModal: React.FC<SelfCheckModalProps> = ({
  isOpen,
  initialReadings,
  isLinkAvailable,
  onClose,
  onSubmitSelfCheck,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('vitals');
  const [draft, setDraft] = useState<BiomarkerReading>(initialReadings);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pvtPhase, setPvtPhase] = useState<PvtPhase>('idle');
  const [pvtTimeRemaining, setPvtTimeRemaining] = useState(15);
  const [reactionTimesMs, setReactionTimesMs] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [calculatedCogScore, setCalculatedCogScore] = useState<number | null>(null);
  const stimulusStartRef = useRef<number>(0);
  const stimulusTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialReadings);
      setNotes('');
      setActiveTab('vitals');
      setPvtPhase('idle');
      setPvtTimeRemaining(15);
      setReactionTimesMs([]);
      setFalseStarts(0);
      setCalculatedCogScore(null);
      setSelectedScanId('');
      setUploadedImageName(null);
      setUploadedPreviewUrl(null);
    }
  }, [isOpen, initialReadings]);

  useEffect(() => {
    return () => {
      if (stimulusTimeoutRef.current) window.clearTimeout(stimulusTimeoutRef.current);
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const scheduleNextStimulus = () => {
    if (stimulusTimeoutRef.current) window.clearTimeout(stimulusTimeoutRef.current);
    const delay = 900 + Math.random() * 1400;
    stimulusTimeoutRef.current = window.setTimeout(() => {
      stimulusStartRef.current = performance.now();
      setPvtPhase('stimulus');
    }, delay);
  };

  const finalizePvtTest = (times: number[], falseTapCount: number) => {
    if (stimulusTimeoutRef.current) window.clearTimeout(stimulusTimeoutRef.current);
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    setPvtPhase('complete');

    const avgMs =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 420;
    const lapses = times.filter((t) => t > 380).length;
    const speedPenalty = Math.max(0, (avgMs - 240) / 55);
    const lapsePenalty = lapses * 0.6 + falseTapCount * 0.4;
    const computedScore = Number(
      Math.max(2.0, Math.min(9.8, 9.4 - speedPenalty - lapsePenalty)).toFixed(1)
    );
    setCalculatedCogScore(computedScore);
    setDraft((prev) => ({ ...prev, moodCognitiveScore: computedScore }));
  };

  const startPvtTest = () => {
    if (stimulusTimeoutRef.current) window.clearTimeout(stimulusTimeoutRef.current);
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);

    const localTimes: number[] = [];
    let localFalseStarts = 0;

    setReactionTimesMs([]);
    setFalseStarts(0);
    setCalculatedCogScore(null);
    setPvtTimeRemaining(15);
    setPvtPhase('waiting');
    scheduleNextStimulus();

    let remaining = 15;
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      setPvtTimeRemaining(remaining);
      if (remaining <= 0) {
        finalizePvtTest(localTimes, localFalseStarts);
      }
    }, 1000);

    (startPvtTest as unknown as {
      pushReaction?: (ms: number) => void;
      pushFalse?: () => void;
    }).pushReaction = (ms: number) => {
      localTimes.push(ms);
      setReactionTimesMs([...localTimes]);
    };
    (startPvtTest as unknown as {
      pushReaction?: (ms: number) => void;
      pushFalse?: () => void;
    }).pushFalse = () => {
      localFalseStarts += 1;
      setFalseStarts(localFalseStarts);
    };
  };

  const handlePvtPadClick = () => {
    if (pvtPhase === 'waiting') {
      const tracker = startPvtTest as unknown as { pushFalse?: () => void };
      tracker.pushFalse?.();
      setFalseStarts((f) => f + 1);
      return;
    }
    if (pvtPhase === 'stimulus') {
      const elapsed = Math.round(performance.now() - stimulusStartRef.current);
      const tracker = startPvtTest as unknown as { pushReaction?: (ms: number) => void };
      if (tracker.pushReaction) {
        tracker.pushReaction(elapsed);
      } else {
        setReactionTimesMs((prev) => [...prev, elapsed]);
      }
      setPvtPhase('waiting');
      scheduleNextStimulus();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    if (!selectedScanId) {
      setSelectedScanId('ocular-sans-elevated');
    }
  };

  const selectedPreset = DIAGNOSTIC_SCAN_PRESETS.find((p) => p.id === selectedScanId) ?? null;

  const handleSelectPreset = (preset: ScanPreset) => {
    setSelectedScanId(preset.id);
    if (preset.suggestedBiomarkerPatch) {
      setDraft((prev) => ({ ...prev, ...preset.suggestedBiomarkerPatch }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const scanFinding: DiagnosticScanFinding | null = selectedPreset
        ? {
            scanType: selectedPreset.scanType,
            scanLabel: selectedPreset.scanLabel,
            targetSystem: selectedPreset.targetSystem,
            severity: selectedPreset.severity,
            summary: selectedPreset.summary,
            capturedAtIso: new Date().toISOString(),
            uploadedFileName: uploadedImageName ?? undefined,
          }
        : null;

      const summaryParts = [
        notes.trim() || 'Multi-modal self-check submission',
        calculatedCogScore !== null
          ? `PVT-B Cog Score: ${calculatedCogScore}/10`
          : null,
        scanFinding ? `Scan: ${selectedPreset?.findingTitle}` : null,
      ].filter(Boolean);

      await onSubmitSelfCheck({
        readings: draft,
        scanFinding,
        notes: summaryParts.join(' · '),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-check-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] sm:max-h-[90vh] w-full max-w-3xl flex-col rounded-t-[6px] sm:rounded-[6px] border border-[#232734] bg-[#11131A] text-[#E5E7EB]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#232734] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <div className="flight-micro-label truncate">Crew Medical Input · Multi-Modal Capture</div>
            <h2 id="self-check-modal-title" className="mt-0.5 text-sm sm:text-base font-semibold text-white truncate">
              Biomedical Self-Check Logger
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-1.5 text-[#8E96AA] hover:border-[#2B7FFF] hover:text-white shrink-0"
            aria-label="Close self-check modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Tab Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto border-b border-[#232734] bg-[#0D0F15] px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab('vitals')}
            className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'vitals'
                ? 'border-[#2B7FFF] bg-[#2B7FFF]/15 text-white'
                : 'border-[#232734] bg-[#11131A] text-[#8E96AA] hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
            <span>1. Vitals &amp; Biomarkers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pvt')}
            className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'pvt'
                ? 'border-[#2B7FFF] bg-[#2B7FFF]/15 text-white'
                : 'border-[#232734] bg-[#11131A] text-[#8E96AA] hover:text-white'
            }`}
          >
            <Brain className="h-3.5 w-3.5" aria-hidden="true" />
            <span>2. 15s Cognitive PVT-B</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'scan'
                ? 'border-[#2B7FFF] bg-[#2B7FFF]/15 text-white'
                : 'border-[#232734] bg-[#11131A] text-[#8E96AA] hover:text-white'
            }`}
          >
            <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
            <span>3. Diagnostic Ultrasound</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 bg-[#090A0F]">
            {activeTab === 'vitals' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'heartRate' as const, label: 'Heart Rate', unit: 'bpm', min: 40, max: 145, step: 1, dec: 0 },
                  { key: 'systolicBP' as const, label: 'Systolic Blood Pressure', unit: 'mmHg', min: 80, max: 170, step: 1, dec: 0 },
                  { key: 'diastolicBP' as const, label: 'Diastolic Blood Pressure', unit: 'mmHg', min: 45, max: 110, step: 1, dec: 0 },
                  { key: 'bloodGlucose' as const, label: 'Blood Sugar / Glucose', unit: 'mg/dL', min: 50, max: 190, step: 1, dec: 0 },
                  { key: 'bodyTemp' as const, label: 'Body Temperature', unit: '°C', min: 35.0, max: 39.5, step: 0.1, dec: 1 },
                  { key: 'sleepHours' as const, label: 'Sleep Hours (24h)', unit: 'hrs', min: 2.5, max: 10.5, step: 0.1, dec: 1 },
                  { key: 'moodCognitiveScore' as const, label: 'Mood & Cognitive Score', unit: '/10', min: 1.0, max: 10.0, step: 0.1, dec: 1 },
                  { key: 'cumulativeRadiation' as const, label: 'Cumulative Radiation', unit: 'mSv', min: 0, max: 220, step: 0.5, dec: 1 },
                ].map((field) => (
                  <div
                    key={field.key}
                    className="rounded-[4px] border border-[#232734] bg-[#11131A] p-3 sm:p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`modal-${field.key}`} className="flight-micro-label truncate">
                        {field.label}
                      </label>
                      <span className="font-mono-tabular text-sm font-semibold text-white shrink-0">
                        {draft[field.key].toFixed(field.dec)} <span className="text-xs text-[#8E96AA]">{field.unit}</span>
                      </span>
                    </div>
                    <input
                      id={`modal-${field.key}`}
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={draft[field.key]}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [field.key]: Number(e.target.value),
                        }))
                      }
                      className="mt-2.5 h-2 sm:h-1.5 w-full cursor-pointer appearance-none rounded-[2px] bg-[#232734] accent-[#2B7FFF] touch-pan-y"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'pvt' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#232734] bg-[#11131A] px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      15-Second Psychomotor Vigilance Task (NASA PVT-B)
                    </h3>
                    <p className="text-xs text-[#8E96AA]">
                      Tap the target pad immediately upon blue stimulus illumination.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono-tabular text-sm font-semibold text-[#2B7FFF]">
                    <Timer className="h-4 w-4" aria-hidden="true" />
                    <span>{pvtTimeRemaining}s</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-[4px] border border-[#232734] bg-[#11131A] p-4 sm:p-6">
                  {pvtPhase === 'idle' && (
                    <button
                      type="button"
                      onClick={startPvtTest}
                      className="w-full sm:w-auto rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/15 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2B7FFF]/25 transition-colors"
                    >
                      Initiate 15-Second Reflex Test
                    </button>
                  )}

                  {(pvtPhase === 'waiting' || pvtPhase === 'stimulus') && (
                    <button
                      type="button"
                      onClick={handlePvtPadClick}
                      className={`flex h-40 sm:h-44 w-full max-w-md flex-col items-center justify-center rounded-[4px] border-2 font-mono-tabular text-sm font-bold tracking-wider transition-colors select-none touch-manipulation ${
                        pvtPhase === 'stimulus'
                          ? 'border-[#2B7FFF] bg-[#2B7FFF] text-white'
                          : 'border-[#232734] bg-[#0D0F15] text-[#8E96AA]'
                      }`}
                    >
                      {pvtPhase === 'stimulus' ? 'TAP TARGET NOW' : 'AWAITING STIMULUS...'}
                    </button>
                  )}

                  {pvtPhase === 'complete' && (
                    <div className="w-full max-w-md space-y-3 text-center">
                      <div className="inline-flex items-center gap-2 text-[#10B981] font-semibold text-xs font-mono-tabular">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>PVT-B ASSESSMENT COMPLETE</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono-tabular text-xs">
                        <div className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-2.5">
                          <div className="flight-micro-label">Mean Latency</div>
                          <div className="mt-1 text-base font-semibold text-white">
                            {reactionTimesMs.length > 0
                              ? Math.round(
                                  reactionTimesMs.reduce((a, b) => a + b, 0) /
                                    reactionTimesMs.length
                                )
                              : '--'}{' '}
                            ms
                          </div>
                        </div>
                        <div className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-2.5">
                          <div className="flight-micro-label">False Starts</div>
                          <div className="mt-1 text-base font-semibold text-[#F59E0B]">
                            {falseStarts}
                          </div>
                        </div>
                        <div className="rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/10 p-2.5">
                          <div className="flight-micro-label">Cog Score</div>
                          <div className="mt-1 text-base font-semibold text-white">
                            {calculatedCogScore ?? draft.moodCognitiveScore}/10
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={startPvtTest}
                        className="rounded-[4px] border border-[#232734] bg-[#0D0F15] px-4 py-2 text-xs font-medium text-[#E5E7EB] hover:border-[#2B7FFF]"
                      >
                        Re-run PVT-B Test
                      </button>
                    </div>
                  )}

                  {reactionTimesMs.length > 0 && pvtPhase !== 'complete' && (
                    <div className="mt-3 font-mono-tabular text-xs text-[#8E96AA]">
                      Last reaction: <span className="text-white">{reactionTimesMs[reactionTimesMs.length - 1]} ms</span> ({reactionTimesMs.length} taps)
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'scan' && (
              <div className="space-y-4">
                <div className="rounded-[4px] border border-[#232734] bg-[#11131A] p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Diagnostic Scan Upload &amp; Ultrasound Selector
                      </h3>
                      <p className="text-xs text-[#8E96AA]">
                        Visual diagnostic classification updates the anatomical CAD schematic on submission
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2B7FFF]/25">
                      <Upload className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
                      <span>Upload Scan</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {uploadedPreviewUrl && (
                    <div className="mt-3 flex items-center gap-3 rounded-[4px] border border-[#232734] bg-[#0D0F15] p-2.5">
                      <img
                        src={uploadedPreviewUrl}
                        alt="Uploaded diagnostic scan preview"
                        className="h-16 w-20 rounded-[2px] object-cover border border-[#232734] shrink-0"
                      />
                      <div className="text-xs min-w-0">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          <FileImage className="h-3.5 w-3.5 text-[#2B7FFF] shrink-0" aria-hidden="true" />
                          <span className="truncate">{uploadedImageName}</span>
                        </div>
                        <p className="mt-0.5 text-[#8E96AA]">
                          Scan attached. Confirm matching diagnostic ultrasound profile below.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DIAGNOSTIC_SCAN_PRESETS.map((preset) => {
                    const active = selectedScanId === preset.id;
                    const sevColor =
                      preset.severity === 'CRITICAL'
                        ? 'text-[#EF4444]'
                        : preset.severity === 'CAUTION'
                        ? 'text-[#F59E0B]'
                        : 'text-[#10B981]';
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`rounded-[4px] border p-3.5 text-left transition-colors ${
                          active
                            ? 'border-[#2B7FFF] bg-[#161A24]'
                            : 'border-[#232734] bg-[#11131A] hover:border-[#3B4254]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular">
                          <span className="text-[#8E96AA] truncate">{preset.scanLabel}</span>
                          <span className={`font-semibold shrink-0 ${sevColor}`}>{preset.severity}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Activity className="h-3.5 w-3.5 text-[#2B7FFF] shrink-0" aria-hidden="true" />
                          <span>{preset.findingTitle}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#8E96AA] leading-relaxed">
                          {preset.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="self-check-notes" className="block flight-micro-label">
                Clinical Observation Notes
              </label>
              <input
                id="self-check-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Post-EVA hydration check, mild headache resolved after CO2 scrub"
                className="mt-1.5 w-full rounded-[4px] border border-[#232734] bg-[#11131A] px-3 py-2 text-xs text-white placeholder:text-[#8E96AA]/60 focus:border-[#2B7FFF] focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#232734] bg-[#11131A] px-4 py-3 sm:px-6 sm:py-3.5">
            <div className="font-mono-tabular text-[11px] text-[#8E96AA] truncate">
              {selectedPreset
                ? `SCAN: ${selectedPreset.findingTitle}`
                : calculatedCogScore !== null
                ? `PVT-B COG SCORE: ${calculatedCogScore}/10`
                : 'READY FOR INDEXEDDB COMMIT'}
            </div>
            <div className="flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial rounded-[4px] border border-[#232734] bg-[#0D0F15] px-4 py-2 text-xs font-medium text-[#8E96AA] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-initial rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/20 px-4 py-2 text-xs font-semibold text-white hover:bg-[#2B7FFF]/30 disabled:opacity-50"
              >
                {submitting
                  ? 'UPDATING...'
                  : isLinkAvailable
                  ? 'COMMIT & SYNC'
                  : 'COMMIT OFFLINE'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
