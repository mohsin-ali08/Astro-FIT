import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import {
  BiomarkerReading,
  BodySystemId,
  computePredictiveTrajectoryAlerts,
  DailyTelemetryPoint,
  MissionEnvironmentProfile,
} from '../lib/hrpEngine';

interface DynamicTelemetryChartsProps {
  series: DailyTelemetryPoint[];
  environment: MissionEnvironmentProfile;
  liveReadings: BiomarkerReading;
  selectedDayIndex: number | null;
  onSelectDay: (dayIndex: number | null) => void;
  onInspectSystem: (systemId: BodySystemId) => void;
}

export const DynamicTelemetryCharts: React.FC<DynamicTelemetryChartsProps> = ({
  series,
  environment,
  liveReadings,
  selectedDayIndex,
  onSelectDay,
  onInspectSystem,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const activeIdx = hoveredIdx ?? selectedDayIndex ?? series.length - 1;
  const activePoint = series[activeIdx] ?? series[series.length - 1];

  const trajectory = useMemo(
    () =>
      computePredictiveTrajectoryAlerts(
        series,
        environment,
        selectedDayIndex === null ? liveReadings : undefined
      ),
    [series, environment, liveReadings, selectedDayIndex]
  );

  // Oscilloscope Plot Geometry: 14 historical days + 5-day forecast horizon
  const width = 460;
  const height = 116;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 20;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const totalSteps = series.length - 1 + trajectory.horizonDays;

  const getX = (stepIdx: number) =>
    padL + (stepIdx / Math.max(totalSteps, 1)) * plotW;

  const forecastBoundaryX = getX(series.length - 1);
  const forecastWidth = padL + plotW - forecastBoundaryX;

  const mapY = (val: number, min: number, max: number) => {
    const clamped = Math.max(min, Math.min(max, val));
    return padT + (1 - (clamped - min) / (max - min || 1)) * plotH;
  };

  const lastHistReadings =
    selectedDayIndex === null
      ? liveReadings
      : series[series.length - 1].readings;

  // 1. Cardiovascular (HR 40-140 bpm, Sys BP 85-170 mmHg)
  const hrMin = 40;
  const hrMax = 140;
  const hrSafeTop = mapY(environment.baselines.heartRate.nominalMax, hrMin, hrMax);
  const hrSafeBottom = mapY(environment.baselines.heartRate.nominalMin, hrMin, hrMax);
  const hrCautionLineY = mapY(environment.baselines.heartRate.cautionMax, hrMin, hrMax);
  const hrLine = series
    .map((pt, i) => {
      const val = i === series.length - 1 ? lastHistReadings.heartRate : pt.readings.heartRate;
      return `${getX(i).toFixed(1)},${mapY(val, hrMin, hrMax).toFixed(1)}`;
    })
    .join(' ');
  const bpLine = series
    .map((pt, i) => {
      const val = i === series.length - 1 ? lastHistReadings.systolicBP : pt.readings.systolicBP;
      return `${getX(i).toFixed(1)},${mapY(val, 85, 170).toFixed(1)}`;
    })
    .join(' ');

  const hrForecast = trajectory.forecastsByMetric.heartRate;
  const hrForecastLine = [
    `${forecastBoundaryX.toFixed(1)},${mapY(lastHistReadings.heartRate, hrMin, hrMax).toFixed(1)}`,
    ...hrForecast.projectedSeries.map(
      (val, idx) =>
        `${getX(series.length + idx).toFixed(1)},${mapY(val, hrMin, hrMax).toFixed(1)}`
    ),
  ].join(' ');
  const hrForecastColor =
    hrForecast.severity === 'CRITICAL'
      ? '#EF4444'
      : hrForecast.severity === 'CAUTION'
      ? '#F59E0B'
      : '#10B981';

  // 2. Cumulative Radiation (0 - dynamic max)
  const radCautionMax = environment.baselines.cumulativeRadiation.cautionMax;
  const radNominalMax = environment.baselines.cumulativeRadiation.nominalMax;
  const radForecast = trajectory.forecastsByMetric.cumulativeRadiation;
  const radMaxScale = Math.max(
    radCautionMax * 1.35,
    ...series.map((s) => s.readings.cumulativeRadiation * 1.12),
    ...radForecast.projectedSeries.map((v) => v * 1.08)
  );
  const radSafeTop = mapY(radNominalMax, 0, radMaxScale);
  const radSafeBottom = mapY(0, 0, radMaxScale);
  const radLimitY = mapY(radCautionMax, 0, radMaxScale);
  const radLine = series
    .map((pt, i) => {
      const val =
        i === series.length - 1
          ? lastHistReadings.cumulativeRadiation
          : pt.readings.cumulativeRadiation;
      return `${getX(i).toFixed(1)},${mapY(val, 0, radMaxScale).toFixed(1)}`;
    })
    .join(' ');
  const radForecastLine = [
    `${forecastBoundaryX.toFixed(1)},${mapY(lastHistReadings.cumulativeRadiation, 0, radMaxScale).toFixed(1)}`,
    ...radForecast.projectedSeries.map(
      (val, idx) =>
        `${getX(series.length + idx).toFixed(1)},${mapY(val, 0, radMaxScale).toFixed(1)}`
    ),
  ].join(' ');
  const radForecastColor =
    radForecast.severity === 'CRITICAL'
      ? '#EF4444'
      : radForecast.severity === 'CAUTION'
      ? '#F59E0B'
      : '#10B981';

  // 3. Sleep & Mood
  const sleepMin = 2;
  const sleepMax = 10;
  const sleepSafeTop = mapY(environment.baselines.sleepHours.nominalMax, sleepMin, sleepMax);
  const sleepSafeBottom = mapY(environment.baselines.sleepHours.nominalMin, sleepMin, sleepMax);
  const sleepLine = series
    .map((pt, i) => {
      const val = i === series.length - 1 ? lastHistReadings.sleepHours : pt.readings.sleepHours;
      return `${getX(i).toFixed(1)},${mapY(val, sleepMin, sleepMax).toFixed(1)}`;
    })
    .join(' ');
  const moodLine = series
    .map((pt, i) => {
      const val =
        i === series.length - 1
          ? lastHistReadings.moodCognitiveScore
          : pt.readings.moodCognitiveScore;
      return `${getX(i).toFixed(1)},${mapY(val, 1, 10).toFixed(1)}`;
    })
    .join(' ');

  const sleepForecast = trajectory.forecastsByMetric.sleepHours;
  const sleepForecastLine = [
    `${forecastBoundaryX.toFixed(1)},${mapY(lastHistReadings.sleepHours, sleepMin, sleepMax).toFixed(1)}`,
    ...sleepForecast.projectedSeries.map(
      (val, idx) =>
        `${getX(series.length + idx).toFixed(1)},${mapY(val, sleepMin, sleepMax).toFixed(1)}`
    ),
  ].join(' ');
  const sleepForecastColor =
    sleepForecast.severity === 'CRITICAL'
      ? '#EF4444'
      : sleepForecast.severity === 'CAUTION'
      ? '#F59E0B'
      : '#10B981';

  const getBreachMarkerCoords = (
    forecast: { breachDayOffset: number | null; projectedSeries: number[] },
    startVal: number,
    minScale: number,
    maxScale: number
  ) => {
    if (forecast.breachDayOffset === null) return null;
    if (forecast.breachDayOffset === 0) {
      return {
        x: forecastBoundaryX,
        y: mapY(startVal, minScale, maxScale),
      };
    }
    const stepX = getX(series.length - 1 + forecast.breachDayOffset);
    const idxFloor = Math.min(
      forecast.projectedSeries.length - 1,
      Math.max(0, Math.floor(forecast.breachDayOffset) - 1)
    );
    const val = forecast.projectedSeries[idxFloor] ?? startVal;
    return {
      x: stepX,
      y: mapY(val, minScale, maxScale),
    };
  };

  const radBreachCoord = getBreachMarkerCoords(
    radForecast,
    lastHistReadings.cumulativeRadiation,
    0,
    radMaxScale
  );
  const hrBreachCoord = getBreachMarkerCoords(
    hrForecast,
    lastHistReadings.heartRate,
    hrMin,
    hrMax
  );
  const sleepBreachCoord = getBreachMarkerCoords(
    sleepForecast,
    lastHistReadings.sleepHours,
    sleepMin,
    sleepMax
  );

  const renderGridlines = () => (
    <g stroke="#1C202B" strokeWidth="1">
      <line x1={padL} y1={padT} x2={padL + plotW} y2={padT} />
      <line x1={padL} y1={padT + plotH * 0.5} x2={padL + plotW} y2={padT + plotH * 0.5} />
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} />
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} />
    </g>
  );

  return (
    <section className="rounded-[6px] border border-[#232734] bg-[#11131A] p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232734] pb-2.5">
        <div>
          <div className="flight-micro-label">Oscilloscope Telemetry · 14d + 5d Horizon</div>
          <h2 className="mt-0.5 text-sm font-semibold text-white">
            Biomedical Time-Series &amp; Limit Forecast
          </h2>
        </div>
        {selectedDayIndex !== null ? (
          <button
            type="button"
            onClick={() => onSelectDay(null)}
            className="rounded-[4px] border border-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 text-[11px] font-mono-tabular font-medium text-[#F59E0B] hover:bg-[#F59E0B]/20 whitespace-nowrap"
          >
            RETURN TO LIVE
          </button>
        ) : (
          <span className="font-mono-tabular text-[11px] text-[#8E96AA]">
            {activePoint.missionDayLabel} (+5D PROJ)
          </span>
        )}
      </div>

      {/* Predictive Threshold Alerts Summary */}
      <div className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flight-micro-label">
            <TrendingUp className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
            <span>Predictive Trajectory Alerts ({trajectory.horizonDays}d)</span>
          </div>
          <span className="font-mono-tabular text-[10px] text-[#8E96AA]">
            {trajectory.alerts.length === 0
              ? '0 VIOLATIONS PROJECTED'
              : `${trajectory.alerts.length} ALERT${trajectory.alerts.length > 1 ? 'S' : ''}`}
          </span>
        </div>

        {trajectory.alerts.length === 0 ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#10B981]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>● Trajectory within {environment.shortName} safe operating bounds (+5d).</span>
          </div>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {trajectory.alerts.slice(0, 3).map((alert) => {
              const isCritical = alert.severity === 'CRITICAL';
              return (
                <li key={alert.metricKey}>
                  <button
                    type="button"
                    onClick={() => onInspectSystem(alert.targetSystem)}
                    className={`w-full rounded-[4px] border px-2.5 py-2 text-left transition-colors ${
                      isCritical
                        ? 'border-[#EF4444]/60 bg-[#EF4444]/10 hover:bg-[#EF4444]/15'
                        : 'border-[#F59E0B]/60 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/15'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          isCritical ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                        }`}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{alert.headline}</span>
                      </span>
                      <span
                        className={`font-mono-tabular text-[10px] font-semibold shrink-0 ${
                          isCritical ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                        }`}
                      >
                        {isCritical ? '✖ CRITICAL' : '▲ CAUTION'}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono-tabular text-[10px] text-[#E5E7EB]">
                      {alert.detail}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 1. Cardiovascular Oscilloscope Plot */}
      <div className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <span className="flight-micro-label">CH-01 // CARDIOVASCULAR (HR &amp; SYS BP)</span>
          <span className="font-mono-tabular text-[11px] font-semibold text-white">
            {activePoint.readings.heartRate} bpm · {activePoint.readings.systolicBP}/{activePoint.readings.diastolicBP} mmHg
          </span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-1.5 h-28 sm:h-24 w-full cursor-crosshair select-none"
          role="img"
          aria-label="14-day cardiovascular oscilloscope trace with 5-day forecast"
        >
          {renderGridlines()}
          <rect x={forecastBoundaryX} y={padT} width={forecastWidth} height={plotH} fill="#141824" fillOpacity="0.65" />
          <line x1={forecastBoundaryX} y1={padT} x2={forecastBoundaryX} y2={padT + plotH} stroke="#3B4254" strokeDasharray="2 2" />
          <text x={forecastBoundaryX + 4} y={padT + 10} className="fill-[#8E96AA] text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
            +5D PROJ
          </text>

          {/* Safe Nominal Band */}
          <rect
            x={padL}
            y={hrSafeTop}
            width={plotW}
            height={Math.max(2, hrSafeBottom - hrSafeTop)}
            fill="rgba(16, 185, 129, 0.06)"
          />
          <line x1={padL} y1={hrSafeTop} x2={padL + plotW} y2={hrSafeTop} stroke="#10B981" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={padL} y1={hrCautionLineY} x2={padL + plotW} y2={hrCautionLineY} stroke="#F59E0B" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="4 3" />

          <text x={padL - 5} y={padT + 4} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>140</text>
          <text x={padL - 5} y={padT + plotH} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>40</text>

          <polyline fill="none" stroke="#8E96AA" strokeWidth="1.2" strokeDasharray="3 3" points={bpLine} />
          <polyline fill="none" stroke="#2B7FFF" strokeWidth="1.5" points={hrLine} />
          <polyline fill="none" stroke={hrForecastColor} strokeWidth="1.5" strokeDasharray="3 3" points={hrForecastLine} />

          {hrBreachCoord && hrForecast.severity !== 'NOMINAL' && (
            <circle cx={hrBreachCoord.x} cy={hrBreachCoord.y} r="4" fill="none" stroke={hrForecastColor} strokeWidth="1.5" />
          )}

          <line x1={getX(activeIdx)} y1={padT} x2={getX(activeIdx)} y2={padT + plotH} stroke="#8E96AA" strokeOpacity="0.45" strokeDasharray="2 2" />
          {series.map((pt, i) => (
            <g
              key={pt.day}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectDay(i)}
              className="cursor-pointer"
            >
              <rect x={getX(i) - plotW / 38} y={padT} width={plotW / 19} height={plotH + padB} fill="transparent" />
              <circle
                cx={getX(i)}
                cy={mapY(i === series.length - 1 ? lastHistReadings.heartRate : pt.readings.heartRate, hrMin, hrMax)}
                r={activeIdx === i ? 3.2 : 1.6}
                fill={activeIdx === i ? '#FFFFFF' : '#2B7FFF'}
              />
              {i % 4 === 0 && (
                <text x={getX(i)} y={height - 4} textAnchor="middle" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
                  D{pt.day}
                </text>
              )}
            </g>
          ))}
          <text x={getX(totalSteps)} y={height - 4} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
            D+5
          </text>
        </svg>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-[#8E96AA] font-mono-tabular">
          <span>━ HR (bpm) · ┈ Sys BP · ┄ +5d Forecast</span>
          <span>Safe: {environment.baselines.heartRate.nominalMin}–{environment.baselines.heartRate.nominalMax} bpm</span>
        </div>
      </div>

      {/* 2. Radiation Exposure Oscilloscope Plot */}
      <div className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <span className="flight-micro-label">CH-02 // CUMULATIVE DOSIMETRY</span>
          <span className="font-mono-tabular text-[11px] font-semibold text-white">
            {activePoint.readings.cumulativeRadiation.toFixed(1)} / {radCautionMax} mSv
          </span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-1.5 h-28 sm:h-24 w-full cursor-crosshair select-none"
          role="img"
          aria-label="14-day cumulative radiation exposure oscilloscope plot"
        >
          {renderGridlines()}
          <rect x={forecastBoundaryX} y={padT} width={forecastWidth} height={plotH} fill="#141824" fillOpacity="0.65" />
          <line x1={forecastBoundaryX} y1={padT} x2={forecastBoundaryX} y2={padT + plotH} stroke="#3B4254" strokeDasharray="2 2" />
          <text x={forecastBoundaryX + 4} y={padT + 10} className="fill-[#8E96AA] text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
            +5D PROJ
          </text>

          <rect
            x={padL}
            y={radSafeTop}
            width={plotW}
            height={Math.max(2, radSafeBottom - radSafeTop)}
            fill="rgba(16, 185, 129, 0.06)"
          />
          <line x1={padL} y1={radSafeTop} x2={padL + plotW} y2={radSafeTop} stroke="#10B981" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={padL} y1={radLimitY} x2={padL + plotW} y2={radLimitY} stroke="#EF4444" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="4 3" />
          <text x={forecastBoundaryX - 4} y={radLimitY - 3} textAnchor="end" className="fill-[#EF4444] text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
            LIMIT {radCautionMax} mSv
          </text>

          <text x={padL - 5} y={padT + 4} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(radMaxScale)}</text>
          <text x={padL - 5} y={padT + plotH} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>0</text>

          <polyline fill="none" stroke="#EF4444" strokeWidth="1.5" points={radLine} />
          <polyline fill="none" stroke={radForecastColor} strokeWidth="1.5" strokeDasharray="3 3" points={radForecastLine} />

          {radBreachCoord && radForecast.severity !== 'NOMINAL' && (
            <circle cx={radBreachCoord.x} cy={radBreachCoord.y} r="4" fill="none" stroke={radForecastColor} strokeWidth="1.5" />
          )}

          <line x1={getX(activeIdx)} y1={padT} x2={getX(activeIdx)} y2={padT + plotH} stroke="#8E96AA" strokeOpacity="0.45" strokeDasharray="2 2" />
          {series.map((pt, i) => (
            <g
              key={pt.day}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectDay(i)}
              className="cursor-pointer"
            >
              <rect x={getX(i) - plotW / 38} y={padT} width={plotW / 19} height={plotH + padB} fill="transparent" />
              <circle
                cx={getX(i)}
                cy={mapY(i === series.length - 1 ? lastHistReadings.cumulativeRadiation : pt.readings.cumulativeRadiation, 0, radMaxScale)}
                r={activeIdx === i ? 3.2 : 1.6}
                fill={activeIdx === i ? '#FFFFFF' : '#EF4444'}
              />
              {i % 4 === 0 && (
                <text x={getX(i)} y={height - 4} textAnchor="middle" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
                  D{pt.day}
                </text>
              )}
            </g>
          ))}
          <text x={getX(totalSteps)} y={height - 4} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
            D+5
          </text>
        </svg>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-[#8E96AA] font-mono-tabular">
          <span>Safe &le;{radNominalMax} mSv · ┄ +5d Trajectory</span>
          <span>D+5 est: {radForecast.projectedSeries[radForecast.projectedSeries.length - 1].toFixed(1)} mSv</span>
        </div>
      </div>

      {/* 3. Sleep & Behavioral Mood Plot */}
      <div className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <span className="flight-micro-label">CH-03 // CIRCADIAN SLEEP &amp; COGNITIVE</span>
          <span className="font-mono-tabular text-[11px] font-semibold text-white">
            {activePoint.readings.sleepHours.toFixed(1)} hrs · {activePoint.readings.moodCognitiveScore.toFixed(1)}/10
          </span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-1.5 h-28 sm:h-24 w-full cursor-crosshair select-none"
          role="img"
          aria-label="14-day sleep duration and behavioral mood oscilloscope plot"
        >
          {renderGridlines()}
          <rect x={forecastBoundaryX} y={padT} width={forecastWidth} height={plotH} fill="#141824" fillOpacity="0.65" />
          <line x1={forecastBoundaryX} y1={padT} x2={forecastBoundaryX} y2={padT + plotH} stroke="#3B4254" strokeDasharray="2 2" />
          <text x={forecastBoundaryX + 4} y={padT + 10} className="fill-[#8E96AA] text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
            +5D PROJ
          </text>

          <rect
            x={padL}
            y={sleepSafeTop}
            width={plotW}
            height={Math.max(2, sleepSafeBottom - sleepSafeTop)}
            fill="rgba(16, 185, 129, 0.06)"
          />
          <line x1={padL} y1={sleepSafeBottom} x2={padL + plotW} y2={sleepSafeBottom} stroke="#10B981" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 3" />

          <text x={padL - 5} y={padT + 4} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>10</text>
          <text x={padL - 5} y={padT + plotH} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>2</text>

          <polyline fill="none" stroke="#F59E0B" strokeWidth="1.5" points={sleepLine} />
          <polyline fill="none" stroke="#10B981" strokeWidth="1.4" strokeDasharray="3 3" points={moodLine} />
          <polyline fill="none" stroke={sleepForecastColor} strokeWidth="1.5" strokeDasharray="3 3" points={sleepForecastLine} />

          {sleepBreachCoord && sleepForecast.severity !== 'NOMINAL' && (
            <circle cx={sleepBreachCoord.x} cy={sleepBreachCoord.y} r="4" fill="none" stroke={sleepForecastColor} strokeWidth="1.5" />
          )}

          <line x1={getX(activeIdx)} y1={padT} x2={getX(activeIdx)} y2={padT + plotH} stroke="#8E96AA" strokeOpacity="0.45" strokeDasharray="2 2" />
          {series.map((pt, i) => (
            <g
              key={pt.day}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectDay(i)}
              className="cursor-pointer"
            >
              <rect x={getX(i) - plotW / 38} y={padT} width={plotW / 19} height={plotH + padB} fill="transparent" />
              <circle
                cx={getX(i)}
                cy={mapY(i === series.length - 1 ? lastHistReadings.sleepHours : pt.readings.sleepHours, sleepMin, sleepMax)}
                r={activeIdx === i ? 3.2 : 1.6}
                fill={activeIdx === i ? '#FFFFFF' : '#F59E0B'}
              />
              {i % 4 === 0 && (
                <text x={getX(i)} y={height - 4} textAnchor="middle" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
                  D{pt.day}
                </text>
              )}
            </g>
          ))}
          <text x={getX(totalSteps)} y={height - 4} textAnchor="end" className="fill-[#8E96AA] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
            D+5
          </text>
        </svg>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-[#8E96AA] font-mono-tabular">
          <span>━ Sleep (hrs) · ┈ Mood/Cog · ┄ +5d Sleep</span>
          <span>D+5 est: {sleepForecast.projectedSeries[sleepForecast.projectedSeries.length - 1].toFixed(1)} hrs</span>
        </div>
      </div>
    </section>
  );
};
