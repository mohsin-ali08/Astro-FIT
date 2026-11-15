/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  ClipboardPlus,
  CloudOff,
  Flame,
  Radio,
  Satellite,
  ScanLine,
  WifiOff,
} from 'lucide-react';
import {
  BiomarkerKey,
  BiomarkerReading,
  BodySystemId,
  computeMissionReadiness,
  DAILY_ROUTINE_TASKS,
  DiagnosticScanFinding,
  evaluateMissionTelemetry,
  MISSION_ENVIRONMENTS,
  MISSION_SCENARIOS,
  MissionEnvironmentId,
  ScenarioId,
} from './lib/hrpEngine';
import {
  loadOfflineSnapshot,
  saveOfflineSnapshot,
  useOfflineTelemetrySync,
} from './lib/offlineSync';
import { AnatomicalBodyMap } from './components/AnatomicalBodyMap';
import { BiomarkerControlPanel } from './components/BiomarkerControlPanel';
import { ClinicalInspectionDrawer } from './components/ClinicalInspectionDrawer';
import { DynamicTelemetryCharts } from './components/DynamicTelemetryCharts';
import { AutonomousCountermeasurePanel } from './components/AutonomousCountermeasurePanel';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { CrewReadinessHUD } from './components/CrewReadinessHUD';
import { SelfCheckModal } from './components/SelfCheckModal';
import { FlightSurgeonAssistant } from './components/FlightSurgeonAssistant';
import { PWAInstallButton } from './components/PWAInstallButton';

interface VehicleConsoleMeta {
  vehicleCallsign: string;
  commsLatencyLabel: string;
}

const ENVIRONMENT_CONSOLE_META: Record<MissionEnvironmentId, VehicleConsoleMeta> = {
  iss_orbit: {
    vehicleCallsign: 'ORION-CM // ISS-NODE-2',
    commsLatencyLabel: '0.4s TDRS-LINK',
  },
  mars_transit: {
    vehicleCallsign: 'ORION-MPCV // TRANSIT-HAB',
    commsLatencyLabel: '18m 42s ONE-WAY',
  },
  lunar_base: {
    vehicleCallsign: 'ARTEMIS-HLS // SHACKLETON',
    commsLatencyLabel: '1.3s DIRECT',
  },
  pressurized_rover: {
    vehicleCallsign: 'LTV-ROVER // TRAVERSE-01',
    commsLatencyLabel: '3.8s RELAY',
  },
};

function parseMissionElapsedBase(metStr: string): number {
  const match = metStr.match(/T\+\s*(\d+)d\s+(\d+):(\d+):(\d+)/);
  if (!match) return 142 * 3600 + 18 * 60 + 9;
  const days = Number(match[1]);
  const hrs = Number(match[2]);
  const mins = Number(match[3]);
  const secs = Number(match[4]);
  return ((days * 24 + hrs) * 60 + mins) * 60 + secs;
}

function formatFlightDeckMET(totalSeconds: number): string {
  const totalHours = Math.floor(totalSeconds / 3600);
  const rem = totalSeconds % 3600;
  const mins = Math.floor(rem / 60);
  const secs = rem % 60;
  return `MET ${String(totalHours).padStart(3, '0')}:${String(mins).padStart(
    2,
    '0'
  )}:${String(secs).padStart(2, '0')}`;
}

export default function App() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('mars_spe');
  const [environmentId, setEnvironmentId] = useState<MissionEnvironmentId>(
    MISSION_SCENARIOS.mars_spe.recommendedEnvironment
  );
  const [readings, setReadings] = useState<BiomarkerReading>(
    MISSION_SCENARIOS.mars_spe.triggerReading
  );
  const [isModified, setIsModified] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<BodySystemId | null>(null);
  const [completedCountermeasures, setCompletedCountermeasures] = useState<string[]>([]);
  const [completedRoutineIds, setCompletedRoutineIds] = useState<string[]>([]);
  const [baseStreakDays, setBaseStreakDays] = useState<number>(13);
  const [activeScanFinding, setActiveScanFinding] = useState<DiagnosticScanFinding | null>(null);

  const [simulateBlackout, setSimulateBlackout] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSelfCheckOpen, setIsSelfCheckOpen] = useState(false);
  const [isSurgeonOpen, setIsSurgeonOpen] = useState(false);
  const [metOffsetSeconds, setMetOffsetSeconds] = useState(0);
  const [hydratedFromCache, setHydratedFromCache] = useState(false);

  const {
    browserOnline,
    isLinkAvailable,
    logs,
    pendingCount,
    isSyncing,
    lastSyncedAtIso,
    logVitalsOfflineAware,
    syncPendingLogs,
  } = useOfflineTelemetrySync(simulateBlackout);

  // Hydrate offline snapshot on startup
  useEffect(() => {
    let active = true;
    void loadOfflineSnapshot().then((snapshot) => {
      if (!active) return;
      if (snapshot) {
        setScenarioId(snapshot.scenarioId);
        setEnvironmentId(snapshot.environmentId);
        setReadings(snapshot.readings);
        setCompletedCountermeasures(snapshot.completedCountermeasures ?? []);
        setCompletedRoutineIds(snapshot.completedRoutineIds ?? []);
        if (typeof snapshot.streakDays === 'number') {
          setBaseStreakDays(snapshot.streakDays);
        }
        if (snapshot.scanFinding) {
          setActiveScanFinding(snapshot.scanFinding);
        }
      }
      setHydratedFromCache(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist snapshot to IndexedDB whenever state updates
  useEffect(() => {
    if (!hydratedFromCache) return;
    void saveOfflineSnapshot({
      environmentId,
      scenarioId,
      readings,
      completedCountermeasures,
      completedRoutineIds,
      streakDays: baseStreakDays,
      scanFinding: activeScanFinding,
      updatedAtIso: new Date().toISOString(),
    });
  }, [
    environmentId,
    scenarioId,
    readings,
    completedCountermeasures,
    completedRoutineIds,
    baseStreakDays,
    activeScanFinding,
    hydratedFromCache,
  ]);

  // Live ticking Mission Elapsed Time (MET) clock
  useEffect(() => {
    const timer = window.setInterval(() => {
      setMetOffsetSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeScenario = MISSION_SCENARIOS[scenarioId];
  const activeEnvironment = MISSION_ENVIRONMENTS[environmentId];
  const consoleMeta = ENVIRONMENT_CONSOLE_META[environmentId];

  const metDisplay = useMemo(() => {
    const baseSec = parseMissionElapsedBase(activeScenario.missionElapsedTimeStart);
    return formatFlightDeckMET(baseSec + metOffsetSeconds);
  }, [activeScenario.missionElapsedTimeStart, metOffsetSeconds]);

  const evaluationReport = useMemo(
    () =>
      evaluateMissionTelemetry(environmentId, readings, {
        completedRoutineIds,
        completedCountermeasures,
        scanFinding: activeScanFinding,
      }),
    [environmentId, readings, completedRoutineIds, completedCountermeasures, activeScanFinding]
  );

  const readinessSummary = useMemo(
    () =>
      computeMissionReadiness(
        evaluationReport,
        completedRoutineIds,
        completedCountermeasures
      ),
    [evaluationReport, completedRoutineIds, completedCountermeasures]
  );

  const displayStreakDays = readinessSummary.allRoutineDone
    ? baseStreakDays + 1
    : baseStreakDays;

  const overallStatusBadge =
    evaluationReport.overallStatus === 'CRITICAL'
      ? {
          text: '✖ CRITICAL',
          classes: 'border-[#EF4444]/60 bg-[#EF4444]/10 text-[#EF4444]',
        }
      : evaluationReport.overallStatus === 'CAUTION'
      ? {
          text: '▲ CAUTION',
          classes: 'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B]',
        }
      : {
          text: '● NOMINAL',
          classes: 'border-[#10B981]/60 bg-[#10B981]/10 text-[#10B981]',
        };

  const handleSelectScenario = (nextScenarioId: ScenarioId) => {
    const preset = MISSION_SCENARIOS[nextScenarioId];
    setScenarioId(nextScenarioId);
    setEnvironmentId(preset.recommendedEnvironment);
    setReadings(preset.triggerReading);
    setSelectedDayIndex(null);
    setActiveScanFinding(null);
    setIsModified(false);
    setMetOffsetSeconds(0);
  };

  const handleSelectDay = (dayIdx: number | null) => {
    setSelectedDayIndex(dayIdx);
    if (dayIdx === null) {
      setReadings(activeScenario.triggerReading);
      setIsModified(false);
    } else {
      const point = activeScenario.timeSeries14Day[dayIdx];
      if (point) {
        setReadings(point.readings);
        setIsModified(false);
      }
    }
  };

  const handleUpdateBiomarker = (key: BiomarkerKey, value: number) => {
    setReadings((prev) => ({ ...prev, [key]: value }));
    setIsModified(true);
  };

  const handleResetScenario = () => {
    setReadings(activeScenario.triggerReading);
    setSelectedDayIndex(null);
    setActiveScanFinding(null);
    setIsModified(false);
  };

  const handleToggleCountermeasure = (id: string) => {
    setCompletedCountermeasures((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleRoutineTask = (taskId: string) => {
    setCompletedRoutineIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleLogTelemetry = async (notes: string) => {
    const dayLabel =
      selectedDayIndex !== null
        ? activeScenario.timeSeries14Day[selectedDayIndex]?.missionDayLabel ?? 'Active'
        : 'Trigger Snapshot';
    await logVitalsOfflineAware({
      missionDayLabel: dayLabel,
      environmentId,
      scenarioId,
      readings,
      notes,
    });
  };

  const handleSelfCheckSubmit = async (payload: {
    readings: BiomarkerReading;
    scanFinding: DiagnosticScanFinding | null;
    notes: string;
  }) => {
    setReadings(payload.readings);
    setIsModified(true);
    if (payload.scanFinding) {
      setActiveScanFinding(payload.scanFinding);
      setSelectedSystem(payload.scanFinding.targetSystem);
    }
    const dayLabel =
      selectedDayIndex !== null
        ? activeScenario.timeSeries14Day[selectedDayIndex]?.missionDayLabel ?? 'Active'
        : 'Self-Check';
    await logVitalsOfflineAware({
      missionDayLabel: dayLabel,
      environmentId,
      scenarioId,
      readings: payload.readings,
      notes: payload.notes,
    });
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#E5E7EB] flex flex-col">
      {/* Operational Flight-Deck Console Header */}
      <header className="md:sticky md:top-0 z-30 border-b border-[#232734] bg-[#0D0F15]">
        {/* Tier 1: Flight Console Telemetry Strip */}
        <div className="border-b border-[#232734] bg-[#090A0F]">
          <div className="mx-auto flex max-w-[1680px] flex-col gap-2.5 px-3 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Brand + Flight Status */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[#232734] bg-[#11131A] text-[#2B7FFF] shrink-0">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                    Astro FIT
                  </span>
                  <span className="hidden sm:inline font-mono-tabular text-[10px] tracking-[0.08em] text-[#8E96AA] truncate">
                    HRP BIOMEDICAL FLIGHT CONSOLE
                  </span>
                </div>
              </div>

              {/* Mobile quick posture pill */}
              <div className="flex md:hidden items-center gap-2 font-mono-tabular text-[11px] font-semibold shrink-0">
                <span className="text-white">{readinessSummary.score}% RDY</span>
                <span className="inline-flex items-center gap-0.5 text-[#F59E0B]">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  {displayStreakDays}D
                </span>
              </div>
            </div>

            {/* Flight-Deck Telemetry Strips (MET / Vehicle / Comms / Crew ID) */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5">
              <div className="flex flex-col min-w-0">
                <span className="flight-micro-label">Mission Elapsed Time</span>
                <span className="font-mono-tabular text-[11px] sm:text-xs font-semibold text-white truncate">
                  {metDisplay}
                </span>
              </div>

              <div className="flex flex-col min-w-0 sm:border-l sm:border-[#232734] sm:pl-4">
                <span className="flight-micro-label">Active Vehicle</span>
                <span className="font-mono-tabular text-[11px] sm:text-xs font-semibold text-[#E5E7EB] truncate">
                  {consoleMeta.vehicleCallsign}
                </span>
              </div>

              <div className="flex flex-col min-w-0 sm:border-l sm:border-[#232734] sm:pl-4">
                <span className="flight-micro-label">Comms Latency</span>
                <span
                  className={`inline-flex items-center gap-1 font-mono-tabular text-[11px] sm:text-xs font-semibold truncate ${
                    activeEnvironment.autonomousModeRequired
                      ? 'text-[#F59E0B]'
                      : 'text-[#10B981]'
                  }`}
                >
                  <Radio className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{consoleMeta.commsLatencyLabel}</span>
                </span>
              </div>

              <div className="flex flex-col min-w-0 sm:border-l sm:border-[#232734] sm:pl-4">
                <span className="flight-micro-label">Crew Medical ID</span>
                <span className="font-mono-tabular text-[11px] sm:text-xs font-semibold text-[#E5E7EB] truncate">
                  CDR. M. ABBAS // BIO-ID 04
                </span>
              </div>

              <div className="hidden md:flex flex-col border-l border-[#232734] pl-4">
                <span className="flight-micro-label">System Posture</span>
                <div className="flex items-center gap-2 font-mono-tabular text-xs font-semibold">
                  <span className="text-white">{readinessSummary.score}% RDY</span>
                  <span className="inline-flex items-center gap-1 text-[#F59E0B]">
                    <Flame className="h-3 w-3" aria-hidden="true" />
                    {displayStreakDays}D
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: Environment Matrix, Scenario Selector & Action Controls */}
        <div className="bg-[#11131A]">
          <div className="mx-auto flex max-w-[1680px] flex-col gap-2 px-3 py-2 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
            {/* Environment Selector */}
            <div className="flex items-center gap-2 w-full xl:w-auto">
              <span className="hidden 2xl:inline flight-micro-label mr-1">Environment</span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1 rounded-[4px] border border-[#232734] bg-[#090A0F] p-0.5 w-full sm:w-auto">
                {(Object.keys(MISSION_ENVIRONMENTS) as MissionEnvironmentId[]).map((envKey) => {
                  const env = MISSION_ENVIRONMENTS[envKey];
                  const active = environmentId === envKey;
                  return (
                    <button
                      key={envKey}
                      type="button"
                      onClick={() => setEnvironmentId(envKey)}
                      className={`rounded-[4px] px-2.5 py-1.5 sm:py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] ${
                        active
                          ? 'bg-[#2B7FFF]/20 text-white border border-[#2B7FFF]'
                          : 'text-[#8E96AA] hover:text-white border border-transparent'
                      }`}
                    >
                      {env.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scenario Simulator + Action Controls */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 shrink-0 w-full xl:w-auto">
              <label htmlFor="scenario-select" className="sr-only">
                Mission Scenario Simulator
              </label>
              <select
                id="scenario-select"
                value={scenarioId}
                onChange={(e) => handleSelectScenario(e.target.value as ScenarioId)}
                className="w-full sm:w-auto sm:max-w-[235px] rounded-[4px] border border-[#232734] bg-[#090A0F] px-2.5 py-2 sm:py-1.5 font-mono-tabular text-xs font-medium text-[#E5E7EB] focus:border-[#2B7FFF] focus:outline-none"
              >
                {(Object.keys(MISSION_SCENARIOS) as ScenarioId[]).map((id) => {
                  const sc = MISSION_SCENARIOS[id];
                  return (
                    <option key={id} value={id}>
                      {sc.name}
                    </option>
                  );
                })}
              </select>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSelfCheckOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF] px-3 py-2 sm:py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E6AE5] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF]"
                >
                  <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Log Vitals</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSurgeonOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[4px] border border-[#232734] bg-[#0D0F15] px-3 py-2 sm:py-1.5 text-xs font-medium text-[#E5E7EB] transition-colors hover:border-[#2B7FFF] hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF]"
                >
                  <Bot className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
                  <span>Flight Surgeon</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(true)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-[4px] border px-2.5 py-2 sm:py-1.5 font-mono-tabular text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] ${
                    !isLinkAvailable
                      ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]'
                      : pendingCount > 0
                      ? 'border-[#2B7FFF] bg-[#2B7FFF]/15 text-[#2B7FFF]'
                      : 'border-[#232734] bg-[#0D0F15] text-[#E5E7EB] hover:border-[#2B7FFF]'
                  }`}
                  title="Inspect offline IndexedDB telemetry queue"
                >
                  {isLinkAvailable ? (
                    <Satellite className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {!isLinkAvailable
                      ? `OFFLINE (${pendingCount})`
                      : pendingCount > 0
                      ? `SYNC (${pendingCount})`
                      : 'DSN SYNCED'}
                  </span>
                </button>

                <PWAInstallButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Non-intrusive Offline / Deep-Space Blackout Banner */}
      {!isLinkAvailable && (
        <div
          role="status"
          className="border-b border-[#F59E0B]/50 bg-[#F59E0B]/10 px-3 py-2 text-xs text-[#F59E0B] sm:px-6"
        >
          <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2">
              <WifiOff className="h-3.5 w-3.5 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <span>
                {!browserOnline
                  ? 'OFFLINE MODE ACTIVE — Onboard NASA HRP engine & Flight Surgeon cache operating autonomously. Vitals queue in IndexedDB.'
                  : 'SIMULATED DEEP-SPACE BLACKOUT — Telemetry packets buffering locally in IndexedDB until Earth DSN link restores.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="font-mono-tabular font-semibold underline hover:text-white"
            >
              INSPECT QUEUE ({pendingCount})
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Telemetry Workspace: 1-col Mobile -> 2-col Tablet -> 3-col Desktop */}
      <main className="mx-auto w-full max-w-[1680px] flex-1 px-3 py-4 sm:px-6">
        {/* Active Scenario Brief + Diagnostic Scan Status Strip */}
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 rounded-[6px] border border-[#232734] bg-[#11131A] px-3.5 py-3 sm:px-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8E96AA]">
              <span
                className={`inline-flex items-center rounded-[4px] border px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold ${overallStatusBadge.classes}`}
              >
                {overallStatusBadge.text}
              </span>
              <span className="font-mono-tabular font-semibold text-[#2B7FFF]">
                {activeScenario.code}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">|</span>
              <span className="text-[#E5E7EB] font-medium">{activeEnvironment.name}</span>
              <span className="hidden sm:inline" aria-hidden="true">|</span>
              <span className="font-mono-tabular text-[11px]">{activeEnvironment.orbitOrLocation}</span>
              {activeScanFinding && (
                <>
                  <span className="hidden sm:inline" aria-hidden="true">|</span>
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-[11px] font-medium text-[#F59E0B]">
                    <ScanLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{activeScanFinding.scanLabel} ({activeScanFinding.severity})</span>
                  </span>
                </>
              )}
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-[#E5E7EB]">
              {activeScenario.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-tabular text-[11px] text-[#8E96AA] shrink-0 border-t border-[#232734] pt-2 lg:border-t-0 lg:pt-0">
            <span>
              ROUTINE{' '}
              <strong className="text-white">
                {DAILY_ROUTINE_TASKS.filter((t) => completedRoutineIds.includes(t.id)).length}/4
              </strong>
            </span>
            <span aria-hidden="true">|</span>
            <span>
              {selectedDayIndex !== null
                ? `INSPECTING DAY ${selectedDayIndex + 1}/14`
                : 'LIVE TRIGGER TELEMETRY'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 items-start">
          {/* Left Desktop (3 cols) / Bottom-Left Tablet (6 cols): Crew Readiness & Biomarker Controls */}
          <div className="order-3 md:order-2 md:col-span-6 xl:order-1 xl:col-span-3 flex flex-col gap-4 min-w-0">
            <CrewReadinessHUD
              readiness={readinessSummary}
              streakDays={displayStreakDays}
              completedRoutineIds={completedRoutineIds}
              onToggleRoutineTask={handleToggleRoutineTask}
              onInspectSystem={setSelectedSystem}
            />

            <BiomarkerControlPanel
              evaluations={evaluationReport.biomarkerEvaluations}
              readings={readings}
              isModified={isModified}
              isLinkAvailable={isLinkAvailable}
              onUpdateBiomarker={handleUpdateBiomarker}
              onResetScenario={handleResetScenario}
              onLogTelemetry={handleLogTelemetry}
              onSelectSystem={setSelectedSystem}
            />
          </div>

          {/* Centerpiece Desktop (5 cols sticky) / Full-Width Top Tablet (12 cols) / Top Mobile: Anatomical CAD Schematic */}
          <div className="order-1 md:order-1 md:col-span-12 xl:order-2 xl:col-span-5 xl:sticky xl:top-[116px] min-w-0">
            <AnatomicalBodyMap
              systems={evaluationReport.systemEvaluations}
              selectedSystem={selectedSystem}
              onSelectSystem={setSelectedSystem}
            />
          </div>

          {/* Right Desktop (4 cols) / Bottom-Right Tablet (6 cols): Oscilloscope Traces + Countermeasures */}
          <div className="order-2 md:order-3 md:col-span-6 xl:order-3 xl:col-span-4 flex flex-col gap-4 min-w-0">
            <DynamicTelemetryCharts
              series={activeScenario.timeSeries14Day}
              environment={activeEnvironment}
              liveReadings={readings}
              selectedDayIndex={selectedDayIndex}
              onSelectDay={handleSelectDay}
              onInspectSystem={setSelectedSystem}
            />

            <AutonomousCountermeasurePanel
              report={evaluationReport}
              completedCountermeasures={completedCountermeasures}
              onToggleCountermeasure={handleToggleCountermeasure}
              onInspectSystem={setSelectedSystem}
            />
          </div>
        </div>
      </main>

      {/* Clinical Inspection & Self-Exam Slide-Over Drawer */}
      <ClinicalInspectionDrawer
        system={
          selectedSystem ? evaluationReport.systemEvaluations[selectedSystem] : null
        }
        environment={activeEnvironment}
        completedCountermeasures={completedCountermeasures}
        onToggleCountermeasure={handleToggleCountermeasure}
        onClose={() => setSelectedSystem(null)}
      />

      {/* Multi-Modal Self-Check & PVT-B Cognitive Test Modal */}
      <SelfCheckModal
        isOpen={isSelfCheckOpen}
        initialReadings={readings}
        isLinkAvailable={isLinkAvailable}
        onClose={() => setIsSelfCheckOpen(false)}
        onSubmitSelfCheck={handleSelfCheckSubmit}
      />

      {/* Autonomous Flight Surgeon Co-Pilot Assistant Drawer */}
      <FlightSurgeonAssistant
        isOpen={isSurgeonOpen}
        onClose={() => setIsSurgeonOpen(false)}
        report={evaluationReport}
        readiness={readinessSummary}
        scenarioId={scenarioId}
        isLinkAvailable={isLinkAvailable}
      />

      {/* Offline Queue & Sync Modal */}
      <OfflineSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        browserOnline={browserOnline}
        simulateBlackout={simulateBlackout}
        onToggleSimulateBlackout={() => setSimulateBlackout((prev) => !prev)}
        isLinkAvailable={isLinkAvailable}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        lastSyncedAtIso={lastSyncedAtIso}
        logs={logs}
        onSyncNow={syncPendingLogs}
      />
    </div>
  );
}
