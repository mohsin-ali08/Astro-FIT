import React from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  BodySystemEvaluation,
  ClinicalStatus,
  MissionEnvironmentProfile,
} from '../lib/hrpEngine';

interface ClinicalInspectionDrawerProps {
  system: BodySystemEvaluation | null;
  environment: MissionEnvironmentProfile;
  completedCountermeasures: string[];
  onToggleCountermeasure: (countermeasureId: string) => void;
  onClose: () => void;
}

const STATUS_BADGE: Record<
  ClinicalStatus,
  { border: string; text: string; bg: string; glyph: string; label: string }
> = {
  NOMINAL: {
    border: 'border-[#10B981]/50',
    text: 'text-[#10B981]',
    bg: 'bg-[#10B981]/10',
    glyph: '●',
    label: 'NOMINAL',
  },
  CAUTION: {
    border: 'border-[#F59E0B]/60',
    text: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
    glyph: '▲',
    label: 'CAUTION',
  },
  CRITICAL: {
    border: 'border-[#EF4444]/70',
    text: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/10',
    glyph: '✖',
    label: 'CRITICAL',
  },
};

const PRIORITY_STYLE: Record<string, string> = {
  IMMEDIATE: 'text-[#EF4444] border-[#EF4444]/60 bg-[#EF4444]/10',
  ELEVATED: 'text-[#F59E0B] border-[#F59E0B]/60 bg-[#F59E0B]/10',
  ROUTINE: 'text-[#10B981] border-[#10B981]/50 bg-[#10B981]/10',
};

export const ClinicalInspectionDrawer: React.FC<ClinicalInspectionDrawerProps> = ({
  system,
  environment,
  completedCountermeasures,
  onToggleCountermeasure,
  onClose,
}) => {
  if (!system) return null;

  const badge = STATUS_BADGE[system.status];

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinical-drawer-title"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-xl flex-col border-l border-[#232734] bg-[#090A0F] text-[#E5E7EB]"
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#232734] bg-[#11131A] px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <div className="flight-micro-label truncate">
              {system.anatomicalRegionLabel} · {environment.shortName}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
              <h2
                id="clinical-drawer-title"
                className="text-base sm:text-lg font-semibold text-white"
              >
                {system.displayName}
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 font-mono-tabular text-[11px] font-semibold shrink-0 ${badge.border} ${badge.bg} ${badge.text}`}
              >
                {badge.glyph} {badge.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-2 text-[#8E96AA] transition-colors hover:border-[#2B7FFF] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] shrink-0"
            aria-label="Close clinical inspection drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Clinical Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-6">
          {/* Active Vitals for This System */}
          <section aria-labelledby="drawer-vitals-heading">
            <h3 id="drawer-vitals-heading" className="flight-micro-label">
              System Biomarkers &amp; Calibrated Baselines
            </h3>
            <p className="mt-2 text-xs text-[#E5E7EB] leading-relaxed">
              {system.clinicalFindingSummary}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {system.biomarkers.map((bio) => {
                const bioStyle = STATUS_BADGE[bio.status];
                return (
                  <div
                    key={bio.key}
                    className={`rounded-[4px] border ${bioStyle.border} bg-[#11131A] p-3.5`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flight-micro-label">{bio.label}</span>
                      <span className={`font-mono-tabular text-[10px] font-semibold ${bioStyle.text} shrink-0`}>
                        {bioStyle.glyph} {bioStyle.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline">
                      <span className="font-mono-tabular text-2xl font-semibold text-white">
                        {bio.value.toFixed(bio.precision)}
                      </span>
                      <span className="ml-1.5 font-mono-tabular text-xs text-[#8E96AA]">
                        {bio.unit}
                      </span>
                    </div>
                    <div className="mt-1 font-mono-tabular text-[11px] text-[#8E96AA]">
                      Baseline: {bio.nominalRangeText}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* NASA 5 Hazards Plain-Language Space Physiology Explanation */}
          <section
            aria-labelledby="drawer-hazards-heading"
            className="border-t border-[#232734] pt-5"
          >
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-[#2B7FFF]" aria-hidden="true" />
              <h3 id="drawer-hazards-heading" className="flight-micro-label">
                Spaceflight Physiology · NASA HRP 5 Hazards
              </h3>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono-tabular text-xs text-[#2B7FFF]">
              {system.primaryHazards.map((hazard, index) => (
                <React.Fragment key={hazard}>
                  {index > 0 && <span className="text-[#3B4254]" aria-hidden="true">/</span>}
                  <span>{hazard}</span>
                </React.Fragment>
              ))}
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-[#E5E7EB]">
              {system.whyItMattersInSpace}
            </p>
          </section>

          {/* Step-by-Step Self-Exam Instructions */}
          <section
            aria-labelledby="drawer-self-exam-heading"
            className="border-t border-[#232734] pt-5"
          >
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[#2B7FFF]" aria-hidden="true" />
              <h3 id="drawer-self-exam-heading" className="flight-micro-label">
                Self-Exam Protocol · {system.selfExamProtocolName}
              </h3>
            </div>
            <ol className="mt-3 space-y-2.5">
              {system.selfExamSteps.map((step) => (
                <li
                  key={step.stepNumber}
                  className="rounded-[4px] border border-[#232734] bg-[#11131A] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {step.stepNumber}. {step.title}
                    </span>
                  </div>
                  <div className="mt-1 font-mono-tabular text-[11px] text-[#2B7FFF]">
                    HARDWARE: {step.hardwareRequired}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#E5E7EB]">
                    {step.instruction}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Autonomous Countermeasures */}
          <section
            aria-labelledby="drawer-countermeasures-heading"
            className="border-t border-[#232734] pt-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#2B7FFF]" aria-hidden="true" />
                <h3 id="drawer-countermeasures-heading" className="flight-micro-label">
                  Prescribed Autonomous Countermeasures
                </h3>
              </div>
              <span className="font-mono-tabular text-[10px] text-[#8E96AA]">
                {environment.autonomousModeRequired ? 'AUTONOMOUS AUTH' : 'EARTH-SYNCED'}
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {system.countermeasures.map((cm) => {
                const isDone = completedCountermeasures.includes(cm.id);
                return (
                  <div
                    key={cm.id}
                    className={`rounded-[4px] border p-3.5 sm:p-4 transition-colors ${
                      isDone
                        ? 'border-[#10B981]/50 bg-[#10B981]/10'
                        : 'border-[#232734] bg-[#11131A]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-tabular">
                          <span
                            className={`rounded-[2px] border px-1.5 py-0.5 font-semibold ${
                              PRIORITY_STYLE[cm.priority]
                            }`}
                          >
                            {cm.priority}
                          </span>
                          <span className="text-[#8E96AA]">{cm.protocolCode}</span>
                          <span className="text-[#3B4254]" aria-hidden="true">·</span>
                          <span className="text-[#E5E7EB]">{cm.category}</span>
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-white">
                          {cm.title}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleCountermeasure(cm.id)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-xs font-mono-tabular font-medium transition-colors shrink-0 self-start focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] ${
                          isDone
                            ? 'border-[#10B981] bg-[#10B981]/15 text-[#10B981]'
                            : 'border-[#232734] bg-[#0D0F15] text-[#E5E7EB] hover:border-[#2B7FFF]'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>EXECUTED</span>
                          </>
                        ) : (
                          <>
                            <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>MARK EXECUTED</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[#E5E7EB]">
                      {cm.instruction}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#232734] pt-2 text-[11px]">
                      <span className="font-mono-tabular text-[#2B7FFF]">
                        TARGET: {cm.targetDurationOrDose}
                      </span>
                      <span className="text-[#8E96AA]">
                        {cm.autonomousExecutionNote}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
