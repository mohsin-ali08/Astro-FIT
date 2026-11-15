import React, { useState } from 'react';
import {
  Activity,
  Brain,
  Bone,
  ShieldAlert,
} from 'lucide-react';
import {
  BodySystemEvaluation,
  BodySystemId,
  ClinicalStatus,
} from '../lib/hrpEngine';

interface AnatomicalBodyMapProps {
  systems: Record<BodySystemId, BodySystemEvaluation>;
  selectedSystem: BodySystemId | null;
  onSelectSystem: (systemId: BodySystemId) => void;
}

const STATUS_SPEC: Record<
  ClinicalStatus,
  {
    stroke: string;
    fill: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  NOMINAL: {
    stroke: '#10B981',
    fill: 'rgba(16, 185, 129, 0.08)',
    text: 'text-[#10B981]',
    border: 'border-[#10B981]',
    badgeBg: 'bg-[#10B981]/15',
    badgeText: 'text-[#10B981]',
    label: 'NOMINAL',
  },
  CAUTION: {
    stroke: '#F59E0B',
    fill: 'rgba(245, 158, 11, 0.12)',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]',
    badgeBg: 'bg-[#F59E0B]/15',
    badgeText: 'text-[#F59E0B]',
    label: 'CAUTION',
  },
  CRITICAL: {
    stroke: '#EF4444',
    fill: 'rgba(239, 68, 68, 0.14)',
    text: 'text-[#EF4444]',
    border: 'border-[#EF4444]',
    badgeBg: 'bg-[#EF4444]/15',
    badgeText: 'text-[#EF4444]',
    label: 'CRITICAL',
  },
};

const SYSTEM_ICONS: Record<BodySystemId, React.ComponentType<{ className?: string }>> = {
  neuro_behavioral: Brain,
  cardiovascular: Activity,
  musculoskeletal: Bone,
  radiation_immune: ShieldAlert,
};

interface HotspotNodeMeta {
  id: BodySystemId;
  code: string;
  side: 'left' | 'right';
  anchorY: string;
  keyMetricLabel: (sys: BodySystemEvaluation) => string;
}

const HOTSPOT_CALLOUTS: HotspotNodeMeta[] = [
  {
    id: 'neuro_behavioral',
    code: 'SYS-01 // CRANIAL',
    side: 'left',
    anchorY: 'top-[6%]',
    keyMetricLabel: (sys) => {
      const sleep = sys.biomarkers.find((b) => b.key === 'sleepHours');
      const mood = sys.biomarkers.find((b) => b.key === 'moodCognitiveScore');
      return `${sleep?.value.toFixed(1) ?? '--'} hrs · ${mood?.value.toFixed(1) ?? '--'}/10`;
    },
  },
  {
    id: 'cardiovascular',
    code: 'SYS-02 // THORAX',
    side: 'right',
    anchorY: 'top-[22%]',
    keyMetricLabel: (sys) => {
      const hr = sys.biomarkers.find((b) => b.key === 'heartRate');
      const sbp = sys.biomarkers.find((b) => b.key === 'systolicBP');
      const dbp = sys.biomarkers.find((b) => b.key === 'diastolicBP');
      return `${hr?.value ?? '--'} bpm · ${sbp?.value ?? '--'}/${dbp?.value ?? '--'}`;
    },
  },
  {
    id: 'musculoskeletal',
    code: 'SYS-03 // AXIAL',
    side: 'left',
    anchorY: 'top-[58%]',
    keyMetricLabel: (sys) => {
      const bone = sys.biomarkers.find((b) => b.key === 'boneDensityIndex');
      return `BMD ${bone?.value.toFixed(2) ?? '--'} T`;
    },
  },
  {
    id: 'radiation_immune',
    code: 'SYS-04 // DOSIMETRY',
    side: 'right',
    anchorY: 'top-[62%]',
    keyMetricLabel: (sys) => {
      const rad = sys.biomarkers.find((b) => b.key === 'cumulativeRadiation');
      const temp = sys.biomarkers.find((b) => b.key === 'bodyTemp');
      return `${rad?.value.toFixed(1) ?? '--'} mSv · ${temp?.value.toFixed(1) ?? '--'}°C`;
    },
  },
];

export const AnatomicalBodyMap: React.FC<AnatomicalBodyMapProps> = ({
  systems,
  selectedSystem,
  onSelectSystem,
}) => {
  const [hoveredSystem, setHoveredSystem] = useState<BodySystemId | null>(null);

  const neuro = systems.neuro_behavioral;
  const cardio = systems.cardiovascular;
  const musculo = systems.musculoskeletal;
  const radImmune = systems.radiation_immune;

  const isHighlighted = (id: BodySystemId) =>
    selectedSystem === id || hoveredSystem === id;

  return (
    <div className="relative flex flex-col justify-between w-full h-full min-h-[420px] sm:min-h-[500px] rounded-[6px] border border-[#232734] bg-[#11131A] p-3.5 sm:p-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#232734] pb-3">
        <div>
          <div className="flight-micro-label">Biomedical CAD Schematic · Anatomical Mapping</div>
          <h2 className="mt-0.5 text-sm font-semibold text-white">
            Physiological Telemetry Wireframe
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono-tabular text-[10px] sm:text-[11px]">
          <span className="text-[#10B981]">● NOMINAL</span>
          <span className="text-[#F59E0B]">▲ CAUTION</span>
          <span className="text-[#EF4444]">✖ CRITICAL</span>
        </div>
      </div>

      {/* Central CAD Grid Stage */}
      <div className="relative my-3 flex w-full flex-1 items-center justify-center min-h-[300px] sm:min-h-[390px] xl:min-h-[410px] rounded-[4px] border border-[#232734] cad-grid-bg overflow-hidden px-2 py-6 sm:py-4">
        {/* Corner Coordinate Markers */}
        <div className="pointer-events-none absolute top-2 left-2.5 font-mono-tabular text-[9px] sm:text-[10px] text-[#8E96AA]">
          REF // ANAT-CAD-01
        </div>
        <div className="pointer-events-none absolute top-2 right-2.5 font-mono-tabular text-[9px] sm:text-[10px] text-[#8E96AA]">
          AXIS: SAGITTAL +0.00
        </div>

        {/* Tablet & Desktop Floating System Telemetry Readouts */}
        <div className="pointer-events-none absolute inset-0 hidden sm:block">
          {HOTSPOT_CALLOUTS.map((node) => {
            const sys = systems[node.id];
            const spec = STATUS_SPEC[sys.status];
            const Icon = SYSTEM_ICONS[node.id];
            const active = isHighlighted(node.id);

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectSystem(node.id)}
                onMouseEnter={() => setHoveredSystem(node.id)}
                onMouseLeave={() => setHoveredSystem(null)}
                className={`pointer-events-auto absolute ${node.anchorY} ${
                  node.side === 'left' ? 'left-2.5' : 'right-2.5'
                } w-36 md:w-44 xl:w-36 2xl:w-44 rounded-[4px] border px-2.5 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] ${
                  active
                    ? 'border-[#2B7FFF] bg-[#161A24]'
                    : 'border-[#232734] bg-[#11131A] hover:border-[#3B4254]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono-tabular text-[9px] tracking-[0.06em] text-[#8E96AA] truncate">
                    {node.code}
                  </span>
                  <span
                    className={`rounded-[2px] px-1 py-0.5 font-mono-tabular text-[9px] font-semibold ${spec.badgeBg} ${spec.badgeText}`}
                  >
                    {spec.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Icon className="h-3.5 w-3.5 text-[#8E96AA] shrink-0" aria-hidden="true" />
                  <span className="truncate">{sys.displayName}</span>
                </div>
                <div className="mt-1 font-mono-tabular text-[11px] font-medium text-[#E5E7EB] truncate">
                  {node.keyMetricLabel(sys)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Precision Clinical CAD Vector Wireframe SVG */}
        <svg
          viewBox="0 0 360 540"
          className="h-[280px] sm:h-[380px] xl:h-[420px] w-auto max-w-full select-none"
          role="img"
          aria-label="Clinical anatomical CAD wireframe schematic"
        >
          {/* Reference Scale Marks */}
          <g stroke="#232734" strokeWidth="1">
            <line x1="180" y1="14" x2="180" y2="526" strokeDasharray="3 4" />
            <line x1="28" y1="66" x2="332" y2="66" strokeDasharray="2 4" />
            <line x1="28" y1="182" x2="332" y2="182" strokeDasharray="2 4" />
            <line x1="28" y1="292" x2="332" y2="292" strokeDasharray="2 4" />
            <circle cx="180" cy="265" r="168" fill="none" stroke="#1C202B" />
          </g>

          {/* LAYER 4 (Full-Body): Radiation & Immune Perimeter Boundary */}
          <g
            className="cursor-pointer"
            onClick={() => onSelectSystem('radiation_immune')}
            onMouseEnter={() => setHoveredSystem('radiation_immune')}
            onMouseLeave={() => setHoveredSystem(null)}
            role="button"
            tabIndex={0}
            aria-label={`Radiation and Immune system, status ${radImmune.status}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSystem('radiation_immune');
              }
            }}
          >
            <path
              d="M180 24 C205 24 221 42 221 67 C221 85 210 99 201 106 L252 124 C272 132 281 153 285 178 L299 278 C302 293 291 304 278 302 C266 300 260 288 256 271 L243 188 L234 290 L248 486 C250 502 239 514 225 514 C213 514 205 504 202 488 L186 334 L174 334 L158 488 C155 504 147 514 135 514 C121 514 110 502 112 486 L126 290 L117 188 L104 271 C100 288 94 300 82 302 C69 304 58 293 61 278 L75 178 C79 153 88 132 108 124 L159 106 C150 99 139 85 139 67 C139 42 155 24 180 24 Z"
              fill={
                isHighlighted('radiation_immune') || radImmune.status !== 'NOMINAL'
                  ? STATUS_SPEC[radImmune.status].fill
                  : 'transparent'
              }
              stroke={
                isHighlighted('radiation_immune')
                  ? '#2B7FFF'
                  : radImmune.status === 'NOMINAL'
                  ? '#2E3547'
                  : STATUS_SPEC[radImmune.status].stroke
              }
              strokeWidth={isHighlighted('radiation_immune') ? 1.8 : 1}
              strokeDasharray="4 4"
              className={radImmune.status === 'CRITICAL' ? 'critical-reticle-blink' : undefined}
            />
          </g>

          {/* Base Clinical Human CAD Silhouette */}
          <path
            d="M180 34 C199 34 212 48 212 68 C212 84 201 97 194 103 L196 115 L242 130 C257 135 266 149 270 172 L286 274 C288 283 282 290 275 289 C268 288 263 280 260 268 L244 176 L232 174 L224 278 L238 482 C239 494 232 502 223 502 C215 502 210 494 208 482 L188 318 L172 318 L152 482 C150 494 145 502 137 502 C128 502 121 494 122 482 L136 278 L128 174 L116 176 L100 268 C97 280 92 288 85 289 C78 290 72 283 74 274 L90 172 C94 149 103 135 118 130 L164 115 L166 103 C159 97 148 84 148 68 C148 48 161 34 180 34 Z"
            fill="#11131A"
            fillOpacity="0.82"
            stroke="#3B4254"
            strokeWidth="1.25"
            className="pointer-events-none"
          />

          {/* LAYER 3: Skeletal / Musculoskeletal CAD Structure */}
          <g
            className="cursor-pointer"
            onClick={() => onSelectSystem('musculoskeletal')}
            onMouseEnter={() => setHoveredSystem('musculoskeletal')}
            onMouseLeave={() => setHoveredSystem(null)}
            role="button"
            tabIndex={0}
            aria-label={`Musculoskeletal system, status ${musculo.status}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSystem('musculoskeletal');
              }
            }}
          >
            <path
              d="M126 136 L234 136 L224 295 L235 480 L212 480 L190 310 L170 310 L148 480 L125 480 L136 295 Z"
              fill="transparent"
            />
            <path
              d="M124 142 Q152 132 180 138 Q208 132 236 142"
              fill="none"
              stroke={isHighlighted('musculoskeletal') ? '#2B7FFF' : STATUS_SPEC[musculo.status].stroke}
              strokeWidth={isHighlighted('musculoskeletal') ? 2 : 1.3}
            />
            <line
              x1="180"
              y1="112"
              x2="180"
              y2="286"
              stroke={isHighlighted('musculoskeletal') ? '#2B7FFF' : STATUS_SPEC[musculo.status].stroke}
              strokeWidth={isHighlighted('musculoskeletal') ? 2 : 1.4}
              strokeDasharray="3 3"
            />
            <path
              d="M142 272 Q180 294 218 272 L211 302 Q180 312 149 302 Z"
              fill={STATUS_SPEC[musculo.status].fill}
              stroke={isHighlighted('musculoskeletal') ? '#2B7FFF' : STATUS_SPEC[musculo.status].stroke}
              strokeWidth={isHighlighted('musculoskeletal') ? 2 : 1.3}
              className={musculo.status === 'CRITICAL' ? 'critical-reticle-blink' : undefined}
            />
            <path
              d="M152 302 L144 395 L138 482 M208 302 L216 395 L222 482"
              fill="none"
              stroke={isHighlighted('musculoskeletal') ? '#2B7FFF' : STATUS_SPEC[musculo.status].stroke}
              strokeWidth={isHighlighted('musculoskeletal') ? 2.1 : 1.4}
            />
            {/* Joint Target Reticles */}
            {[
              [144, 395],
              [216, 395],
            ].map(([cx, cy]) => (
              <g key={`${cx}-${cy}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill="#0D0F15"
                  stroke={isHighlighted('musculoskeletal') ? '#2B7FFF' : STATUS_SPEC[musculo.status].stroke}
                  strokeWidth="1.2"
                />
                <line x1={cx - 9} y1={cy} x2={cx + 9} y2={cy} stroke="#3B4254" strokeWidth="1" />
                <line x1={cx} y1={cy - 9} x2={cx} y2={cy + 9} stroke="#3B4254" strokeWidth="1" />
              </g>
            ))}
          </g>

          {/* LAYER 2: Chest / Cardiovascular Target Reticle */}
          <g
            className="cursor-pointer"
            onClick={() => onSelectSystem('cardiovascular')}
            onMouseEnter={() => setHoveredSystem('cardiovascular')}
            onMouseLeave={() => setHoveredSystem(null)}
            role="button"
            tabIndex={0}
            aria-label={`Cardiovascular system, status ${cardio.status}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSystem('cardiovascular');
              }
            }}
          >
            <path
              d="M144 162 Q180 154 216 162 M140 180 Q180 172 220 180 M144 198 Q180 190 216 198"
              fill="none"
              stroke="#3B4254"
              strokeWidth="1"
            />
            {/* Crisp Target Crosshair */}
            <circle
              cx="188"
              cy="182"
              r={isHighlighted('cardiovascular') ? 30 : 27}
              fill={STATUS_SPEC[cardio.status].fill}
              stroke={isHighlighted('cardiovascular') ? '#2B7FFF' : STATUS_SPEC[cardio.status].stroke}
              strokeWidth={isHighlighted('cardiovascular') ? 2 : 1.4}
              className={cardio.status === 'CRITICAL' ? 'critical-reticle-blink' : undefined}
            />
            <line x1="154" y1="182" x2="164" y2="182" stroke={STATUS_SPEC[cardio.status].stroke} strokeWidth="1" />
            <line x1="212" y1="182" x2="222" y2="182" stroke={STATUS_SPEC[cardio.status].stroke} strokeWidth="1" />
            <line x1="188" y1="148" x2="188" y2="158" stroke={STATUS_SPEC[cardio.status].stroke} strokeWidth="1" />
            <line x1="188" y1="206" x2="188" y2="216" stroke={STATUS_SPEC[cardio.status].stroke} strokeWidth="1" />
            <path
              d="M168 182 L178 182 L183 171 L188 194 L194 177 L198 182 L208 182"
              fill="none"
              stroke={STATUS_SPEC[cardio.status].stroke}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* LAYER 1: Head / Neuro-Behavioral Target Reticle */}
          <g
            className="cursor-pointer"
            onClick={() => onSelectSystem('neuro_behavioral')}
            onMouseEnter={() => setHoveredSystem('neuro_behavioral')}
            onMouseLeave={() => setHoveredSystem(null)}
            role="button"
            tabIndex={0}
            aria-label={`Neuro and Behavioral system, status ${neuro.status}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSystem('neuro_behavioral');
              }
            }}
          >
            <circle
              cx="180"
              cy="66"
              r={isHighlighted('neuro_behavioral') ? 29 : 26}
              fill={STATUS_SPEC[neuro.status].fill}
              stroke={isHighlighted('neuro_behavioral') ? '#2B7FFF' : STATUS_SPEC[neuro.status].stroke}
              strokeWidth={isHighlighted('neuro_behavioral') ? 2 : 1.4}
              className={neuro.status === 'CRITICAL' ? 'critical-reticle-blink' : undefined}
            />
            <line x1="147" y1="66" x2="157" y2="66" stroke={STATUS_SPEC[neuro.status].stroke} strokeWidth="1" />
            <line x1="203" y1="66" x2="213" y2="66" stroke={STATUS_SPEC[neuro.status].stroke} strokeWidth="1" />
            <line x1="180" y1="33" x2="180" y2="43" stroke={STATUS_SPEC[neuro.status].stroke} strokeWidth="1" />
            <line x1="180" y1="89" x2="180" y2="99" stroke={STATUS_SPEC[neuro.status].stroke} strokeWidth="1" />
            <path
              d="M167 64 Q180 51 193 64 Q187 77 180 78 Q173 77 167 64 Z"
              fill="none"
              stroke={STATUS_SPEC[neuro.status].stroke}
              strokeWidth="1.2"
            />
            <circle cx="173" cy="63" r="1.8" fill={STATUS_SPEC[neuro.status].stroke} />
            <circle cx="187" cy="63" r="1.8" fill={STATUS_SPEC[neuro.status].stroke} />
            <circle cx="180" cy="71" r="1.8" fill={STATUS_SPEC[neuro.status].stroke} />
          </g>

          {/* CAD Leader Lines */}
          <g className="hidden sm:inline pointer-events-none" stroke="#3B4254" strokeWidth="1">
            <line x1="78" y1="64" x2="152" y2="66" strokeDasharray="3 3" />
            <line x1="282" y1="154" x2="216" y2="178" strokeDasharray="3 3" />
            <line x1="78" y1="336" x2="145" y2="306" strokeDasharray="3 3" />
            <line x1="282" y1="360" x2="238" y2="338" strokeDasharray="3 3" />
          </g>
        </svg>
      </div>

      {/* Bottom 4-System Quick Inspection Matrix */}
      <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {(['neuro_behavioral', 'cardiovascular', 'musculoskeletal', 'radiation_immune'] as BodySystemId[]).map(
          (sysId) => {
            const sys = systems[sysId];
            const spec = STATUS_SPEC[sys.status];
            const Icon = SYSTEM_ICONS[sysId];
            const active = selectedSystem === sysId;
            const callout = HOTSPOT_CALLOUTS.find((h) => h.id === sysId);
            return (
              <button
                key={sysId}
                type="button"
                onClick={() => onSelectSystem(sysId)}
                onMouseEnter={() => setHoveredSystem(sysId)}
                onMouseLeave={() => setHoveredSystem(null)}
                className={`flex flex-col items-start rounded-[4px] border px-2.5 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] ${
                  active
                    ? 'border-[#2B7FFF] bg-[#161A24]'
                    : 'border-[#232734] bg-[#0D0F15] hover:border-[#3B4254]'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-[#8E96AA] shrink-0" aria-hidden="true" />
                  <span className={`font-mono-tabular text-[10px] font-semibold ${spec.text}`}>
                    {spec.label}
                  </span>
                </div>
                <span className="mt-1 text-xs font-medium text-[#E5E7EB] truncate w-full">
                  {sys.displayName}
                </span>
                {callout && (
                  <span className="mt-0.5 sm:hidden font-mono-tabular text-[10px] text-[#8E96AA] truncate w-full">
                    {callout.keyMetricLabel(sys)}
                  </span>
                )}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
};
