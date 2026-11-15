import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Radio,
  Shield,
} from 'lucide-react';
import {
  BodySystemId,
  ClinicalStatus,
  MissionEvaluationReport,
  NasaHazard,
} from '../lib/hrpEngine';

interface AutonomousCountermeasurePanelProps {
  report: MissionEvaluationReport;
  completedCountermeasures: string[];
  onToggleCountermeasure: (id: string) => void;
  onInspectSystem: (systemId: BodySystemId) => void;
}

const ALL_FIVE_HAZARDS: NasaHazard[] = [
  'Space Radiation',
  'Isolation & Confinement',
  'Distance from Earth',
  'Gravity Fields',
  'Hostile Closed Environments',
];

const STATUS_DISPLAY: Record<
  ClinicalStatus,
  { border: string; text: string; glyph: string; label: string }
> = {
  NOMINAL: {
    border: 'border-[#232734]',
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

const PRIORITY_BADGE: Record<string, string> = {
  IMMEDIATE: 'border-[#EF4444]/60 bg-[#EF4444]/10 text-[#EF4444]',
  ELEVATED: 'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B]',
  ROUTINE: 'border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]',
};

export const AutonomousCountermeasurePanel: React.FC<
  AutonomousCountermeasurePanelProps
> = ({
  report,
  completedCountermeasures,
  onToggleCountermeasure,
  onInspectSystem,
}) => {
  const overallStyle = STATUS_DISPLAY[report.overallStatus];

  const isHazardElevated = (hazard: NasaHazard): ClinicalStatus => {
    const matchingBiomarkers = Object.values(report.biomarkerEvaluations).filter((b) =>
      b.linkedHazards.includes(hazard)
    );
    if (matchingBiomarkers.some((b) => b.status === 'CRITICAL')) return 'CRITICAL';
    if (matchingBiomarkers.some((b) => b.status === 'CAUTION')) return 'CAUTION';
    if (hazard === 'Distance from Earth' && report.autonomousModeActive) {
      return 'CAUTION';
    }
    return 'NOMINAL';
  };

  return (
    <aside className="flex flex-col gap-4 h-full">
      {/* Overall Clinical Posture Module */}
      <section className={`rounded-[6px] border ${overallStyle.border} bg-[#11131A] p-3.5 sm:p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flight-micro-label">Crew Medical Posture</span>
          <span className={`font-mono-tabular text-[11px] font-semibold ${overallStyle.text}`}>
            {overallStyle.glyph} {overallStyle.label}
          </span>
        </div>

        <div className="mt-2 flex items-start sm:items-center gap-2 text-xs text-[#E5E7EB]">
          <Radio className="h-3.5 w-3.5 text-[#2B7FFF] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <span className="font-mono-tabular break-words">{report.earthCommsStatusLabel}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#232734] pt-3">
          <div>
            <div className="flight-micro-label">Gravity Field</div>
            <div className="mt-0.5 font-mono-tabular text-xs font-medium text-white">
              {report.environment.gravityLabel}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flight-micro-label">Cabin ECLSS</div>
            <div
              className="mt-0.5 font-mono-tabular text-xs font-medium text-white truncate"
              title={report.environment.cabinAtmosphere}
            >
              {report.environment.cabinAtmosphere.split('·')[0].trim()}
            </div>
          </div>
        </div>
      </section>

      {/* NASA HRP 5 Hazards Exposure Matrix */}
      <section className="rounded-[6px] border border-[#232734] bg-[#11131A] p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2 border-b border-[#232734] pb-2.5">
          <div>
            <div className="flight-micro-label">Hazard Classification · HRP-5</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">NASA 5 Hazards Matrix</h2>
            </div>
          </div>
        </div>

        <ul className="mt-2.5 space-y-1.5">
          {ALL_FIVE_HAZARDS.map((hazard) => {
            const hStatus = isHazardElevated(hazard);
            const hStyle = STATUS_DISPLAY[hStatus];
            return (
              <li
                key={hazard}
                className="flex items-center justify-between gap-2 rounded-[4px] border border-[#232734] bg-[#0D0F15] px-3 py-2 text-xs"
              >
                <span className="text-[#E5E7EB] font-medium truncate">{hazard}</span>
                <span className={`font-mono-tabular text-[10px] font-semibold shrink-0 ${hStyle.text}`}>
                  {hStyle.glyph} {hStyle.label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Prioritized Autonomous Countermeasures Queue */}
      <section className="flex flex-1 flex-col rounded-[6px] border border-[#232734] bg-[#11131A] p-3.5 sm:p-4 min-h-[240px]">
        <div className="flex items-center justify-between gap-2 border-b border-[#232734] pb-2.5">
          <div>
            <div className="flight-micro-label">Autonomous Decision Engine</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">Countermeasure Queue</h2>
            </div>
          </div>
          <span className="font-mono-tabular text-[11px] text-[#8E96AA]">
            {report.prioritizedCountermeasures.length} ACTIVE
          </span>
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {report.prioritizedCountermeasures.map((cm) => {
            const isDone = completedCountermeasures.includes(cm.id);
            const targetSystem: BodySystemId = cm.id.startsWith('nb-')
              ? 'neuro_behavioral'
              : cm.id.startsWith('cv-')
              ? 'cardiovascular'
              : cm.id.startsWith('ms-')
              ? 'musculoskeletal'
              : 'radiation_immune';

            return (
              <div
                key={cm.id}
                className={`rounded-[4px] border p-3 transition-colors ${
                  isDone
                    ? 'border-[#10B981]/50 bg-[#10B981]/10'
                    : 'border-[#232734] bg-[#0D0F15]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-[2px] border px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold ${
                      PRIORITY_BADGE[cm.priority]
                    }`}
                  >
                    {cm.priority}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleCountermeasure(cm.id)}
                    className={`inline-flex items-center gap-1 text-[11px] font-mono-tabular font-medium transition-colors ${
                      isDone ? 'text-[#10B981]' : 'text-[#8E96AA] hover:text-white'
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
                        <span>LOG</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onInspectSystem(targetSystem)}
                  className="mt-1.5 text-left text-xs font-semibold text-white hover:text-[#2B7FFF] transition-colors"
                >
                  {cm.title}
                </button>
                <p className="mt-1 text-xs leading-relaxed text-[#8E96AA]">
                  {cm.instruction}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#232734] pt-2 font-mono-tabular text-[10px] text-[#8E96AA]">
                  <span className="text-[#2B7FFF]">{cm.protocolCode}</span>
                  <span>{cm.targetDurationOrDose}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
};
