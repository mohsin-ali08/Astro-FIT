/**
 * Astro FIT — Core NASA Human Research Program (HRP) Clinical Rule Engine
 *
 * Models telemetry, environmental baselines, deterministic clinical evaluation,
 * autonomous deep-space countermeasures, plain-English space physiology explanations,
 * self-exam instructions, and 14-day mission scenario time-series datasets aligned
 * with NASA's 5 Hazards of Human Spaceflight.
 */

export type MissionEnvironmentId =
  | 'iss_orbit'
  | 'mars_transit'
  | 'lunar_base'
  | 'pressurized_rover';

export type ClinicalStatus = 'NOMINAL' | 'CAUTION' | 'CRITICAL';

export type NasaHazard =
  | 'Space Radiation'
  | 'Isolation & Confinement'
  | 'Distance from Earth'
  | 'Gravity Fields'
  | 'Hostile Closed Environments';

export type BodySystemId =
  | 'neuro_behavioral'
  | 'cardiovascular'
  | 'musculoskeletal'
  | 'radiation_immune';

export type BiomarkerKey =
  | 'heartRate'
  | 'systolicBP'
  | 'diastolicBP'
  | 'bloodGlucose'
  | 'bodyTemp'
  | 'sleepHours'
  | 'cumulativeRadiation'
  | 'boneDensityIndex'
  | 'moodCognitiveScore';

export interface BiomarkerReading {
  heartRate: number; // bpm
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  bloodGlucose: number; // mg/dL
  bodyTemp: number; // °C
  sleepHours: number; // hrs / 24h
  cumulativeRadiation: number; // mSv
  boneDensityIndex: number; // DXA T-score proxy
  moodCognitiveScore: number; // 1-10 composite cognitive/mood index
}

export interface ThresholdRange {
  nominalMin: number;
  nominalMax: number;
  cautionMin: number;
  cautionMax: number;
  unit: string;
  label: string;
  precision: number;
}

export interface MissionEnvironmentProfile {
  id: MissionEnvironmentId;
  name: string;
  shortName: string;
  orbitOrLocation: string;
  gravityG: number;
  gravityLabel: string;
  earthDelaySeconds: number;
  earthDelayLabel: string;
  autonomousModeRequired: boolean;
  cabinAtmosphere: string;
  primaryHazards: NasaHazard[];
  baselines: Record<BiomarkerKey, ThresholdRange>;
}

export interface BiomarkerEvaluation {
  key: BiomarkerKey;
  label: string;
  value: number;
  unit: string;
  precision: number;
  status: ClinicalStatus;
  nominalRangeText: string;
  deltaFromNominalCenter: number;
  systemId: BodySystemId;
  linkedHazards: NasaHazard[];
  spacePhysiologySummary: string;
}

export interface CountermeasureAction {
  id: string;
  title: string;
  priority: 'ROUTINE' | 'ELEVATED' | 'IMMEDIATE';
  category:
    | 'Exercise & Loading'
    | 'Circadian & Behavioral'
    | 'Radiation Shielding'
    | 'Hydration & Metabolic'
    | 'Medical Officer Escalation';
  protocolCode: string;
  instruction: string;
  targetDurationOrDose: string;
  autonomousExecutionNote: string;
}

export interface SelfExamStep {
  stepNumber: number;
  title: string;
  instruction: string;
  hardwareRequired: string;
}

export interface BodySystemEvaluation {
  systemId: BodySystemId;
  displayName: string;
  anatomicalRegionLabel: string;
  status: ClinicalStatus;
  primaryHazards: NasaHazard[];
  biomarkers: BiomarkerEvaluation[];
  whyItMattersInSpace: string;
  clinicalFindingSummary: string;
  selfExamProtocolName: string;
  selfExamSteps: SelfExamStep[];
  countermeasures: CountermeasureAction[];
}

export interface MissionEvaluationReport {
  environment: MissionEnvironmentProfile;
  reading: BiomarkerReading;
  overallStatus: ClinicalStatus;
  autonomousModeActive: boolean;
  earthCommsStatusLabel: string;
  biomarkerEvaluations: Record<BiomarkerKey, BiomarkerEvaluation>;
  systemEvaluations: Record<BodySystemId, BodySystemEvaluation>;
  prioritizedCountermeasures: CountermeasureAction[];
  activeHazardCount: number;
  evaluatedAtIso: string;
}

export interface DailyTelemetryPoint {
  day: number;
  missionDayLabel: string;
  timestampIso: string;
  readings: BiomarkerReading;
  eventNote?: string;
}

export type ScenarioId =
  | 'nominal_iss'
  | 'mars_spe'
  | 'lunar_eva_strain'
  | 'day_180_confinement';

export interface MissionScenarioPreset {
  id: ScenarioId;
  code: string;
  name: string;
  subtitle: string;
  recommendedEnvironment: MissionEnvironmentId;
  missionElapsedTimeStart: string;
  description: string;
  triggerReading: BiomarkerReading;
  timeSeries14Day: DailyTelemetryPoint[];
}

export const BIOMARKER_TO_SYSTEM: Record<BiomarkerKey, BodySystemId> = {
  sleepHours: 'neuro_behavioral',
  moodCognitiveScore: 'neuro_behavioral',
  heartRate: 'cardiovascular',
  systolicBP: 'cardiovascular',
  diastolicBP: 'cardiovascular',
  boneDensityIndex: 'musculoskeletal',
  cumulativeRadiation: 'radiation_immune',
  bodyTemp: 'radiation_immune',
  bloodGlucose: 'cardiovascular',
};

export const BIOMARKER_HAZARD_MAP: Record<BiomarkerKey, NasaHazard[]> = {
  heartRate: ['Gravity Fields', 'Hostile Closed Environments', 'Distance from Earth'],
  systolicBP: ['Gravity Fields', 'Hostile Closed Environments'],
  diastolicBP: ['Gravity Fields', 'Hostile Closed Environments'],
  bloodGlucose: ['Hostile Closed Environments', 'Isolation & Confinement'],
  bodyTemp: ['Hostile Closed Environments', 'Space Radiation'],
  sleepHours: ['Isolation & Confinement', 'Hostile Closed Environments', 'Distance from Earth'],
  cumulativeRadiation: ['Space Radiation', 'Distance from Earth'],
  boneDensityIndex: ['Gravity Fields', 'Space Radiation'],
  moodCognitiveScore: ['Isolation & Confinement', 'Distance from Earth'],
};

export const BIOMARKER_SPACE_EXPLANATIONS: Record<BiomarkerKey, string> = {
  heartRate:
    'In microgravity and partial gravity, central fluid shifts and cardiovascular deconditioning alter resting vagal tone and elevate exertional heart rate during EVA or resistive training.',
  systolicBP:
    'Cephalad fluid redistribution in 0g reduces plasma volume by 10–15%, raising orthostatic intolerance risk upon gravity transitions or during high-workload EVA.',
  diastolicBP:
    'Vascular resistance adapts continuously to reduced hydrostatic gradients; elevated diastolic pressure indicates sympathetic stress, dehydration, or CO2 retention.',
  bloodGlucose:
    'Microgravity-induced insulin resistance and altered hepatic metabolism can destabilize glycemic control, impairing cognitive stamina and EVA endurance.',
  bodyTemp:
    'Closed-loop cabin thermal loads and impaired convective sweat evaporation in spaceflight can mask early febrile immune responses or heat-stress buildup inside EVA suits.',
  sleepHours:
    'Without terrestrial 24-hour solar cues—and under cabin noise, CO2 fluctuations, and operational shifts—circadian misalignment rapidly degrades executive accuracy.',
  cumulativeRadiation:
    'Outside Earth’s magnetosphere, Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE) inflict cumulative DNA double-strand breaks and hematopoietic suppression.',
  boneDensityIndex:
    'Mechanical unloading in microgravity accelerates osteoclastic bone resorption (~1–1.5% per month without ARED countermeasures), elevating fracture and renal stone risk.',
  moodCognitiveScore:
    'Extended Earth-out-of-view confinement and 20-minute comms delays increase psychosocial strain, monotony fatigue, and crew coordination friction.',
};

function createBaselines(overrides: Partial<Record<BiomarkerKey, Partial<ThresholdRange>>>): Record<BiomarkerKey, ThresholdRange> {
  const defaults: Record<BiomarkerKey, ThresholdRange> = {
    heartRate: {
      label: 'Heart Rate',
      unit: 'bpm',
      precision: 0,
      nominalMin: 52,
      nominalMax: 88,
      cautionMin: 45,
      cautionMax: 102,
    },
    systolicBP: {
      label: 'Systolic BP',
      unit: 'mmHg',
      precision: 0,
      nominalMin: 98,
      nominalMax: 128,
      cautionMin: 90,
      cautionMax: 142,
    },
    diastolicBP: {
      label: 'Diastolic BP',
      unit: 'mmHg',
      precision: 0,
      nominalMin: 60,
      nominalMax: 82,
      cautionMin: 52,
      cautionMax: 90,
    },
    bloodGlucose: {
      label: 'Blood Glucose',
      unit: 'mg/dL',
      precision: 0,
      nominalMin: 74,
      nominalMax: 118,
      cautionMin: 64,
      cautionMax: 142,
    },
    bodyTemp: {
      label: 'Body Temperature',
      unit: '°C',
      precision: 1,
      nominalMin: 36.2,
      nominalMax: 37.3,
      cautionMin: 35.6,
      cautionMax: 37.9,
    },
    sleepHours: {
      label: 'Daily Sleep',
      unit: 'hrs',
      precision: 1,
      nominalMin: 6.5,
      nominalMax: 8.8,
      cautionMin: 5.2,
      cautionMax: 9.8,
    },
    cumulativeRadiation: {
      label: 'Cumulative Radiation',
      unit: 'mSv',
      precision: 1,
      nominalMin: 0,
      nominalMax: 50,
      cautionMin: 0,
      cautionMax: 120,
    },
    boneDensityIndex: {
      label: 'Bone Density Index',
      unit: 'T-score',
      precision: 2,
      nominalMin: -0.8,
      nominalMax: 2.0,
      cautionMin: -1.5,
      cautionMax: 2.5,
    },
    moodCognitiveScore: {
      label: 'Mood / Cognitive Score',
      unit: '/10',
      precision: 1,
      nominalMin: 7.0,
      nominalMax: 10.0,
      cautionMin: 5.0,
      cautionMax: 10.0,
    },
  };

  const result = { ...defaults };
  (Object.keys(overrides) as BiomarkerKey[]).forEach((key) => {
    const patch = overrides[key];
    if (patch) {
      result[key] = { ...defaults[key], ...patch };
    }
  });
  return result;
}

export const MISSION_ENVIRONMENTS: Record<MissionEnvironmentId, MissionEnvironmentProfile> = {
  iss_orbit: {
    id: 'iss_orbit',
    name: 'ISS Orbital Station',
    shortName: 'ISS Orbit',
    orbitOrLocation: 'Low Earth Orbit · 408 km',
    gravityG: 0.0,
    gravityLabel: '0.00 g (Microgravity)',
    earthDelaySeconds: 0.4,
    earthDelayLabel: '0.4s TDRS Link',
    autonomousModeRequired: false,
    cabinAtmosphere: '101.3 kPa · 21% O2 · ppCO2 2.4 mmHg',
    primaryHazards: ['Gravity Fields', 'Hostile Closed Environments', 'Space Radiation'],
    baselines: createBaselines({
      cumulativeRadiation: { nominalMax: 45, cautionMax: 100 },
      boneDensityIndex: { nominalMin: -0.7, cautionMin: -1.4 },
    }),
  },
  mars_transit: {
    id: 'mars_transit',
    name: 'Mars Deep-Space Transit',
    shortName: 'Mars Transit',
    orbitOrLocation: 'Heliocentric Cruise · 1.42 AU',
    gravityG: 0.0,
    gravityLabel: '0.00 g (Microgravity)',
    earthDelaySeconds: 1122, // 18m 42s one-way light delay
    earthDelayLabel: '18m 42s Delay',
    autonomousModeRequired: true,
    cabinAtmosphere: '70.3 kPa · 26.5% O2 · ppCO2 3.1 mmHg',
    primaryHazards: [
      'Distance from Earth',
      'Space Radiation',
      'Isolation & Confinement',
      'Gravity Fields',
      'Hostile Closed Environments',
    ],
    baselines: createBaselines({
      heartRate: { nominalMin: 54, nominalMax: 90, cautionMin: 46, cautionMax: 104 },
      cumulativeRadiation: { nominalMax: 85, cautionMax: 145 },
      boneDensityIndex: { nominalMin: -0.9, cautionMin: -1.6 },
      sleepHours: { nominalMin: 6.3, cautionMin: 5.0 },
    }),
  },
  lunar_base: {
    id: 'lunar_base',
    name: 'Lunar Surface Base',
    shortName: 'Lunar Base',
    orbitOrLocation: 'Shackleton Rim · South Pole',
    gravityG: 0.16,
    gravityLabel: '0.16 g (Lunar Partial)',
    earthDelaySeconds: 1.3,
    earthDelayLabel: '1.3s Direct Link',
    autonomousModeRequired: false,
    cabinAtmosphere: '56.5 kPa · 34% O2 · Regolith Filtration Active',
    primaryHazards: ['Gravity Fields', 'Space Radiation', 'Hostile Closed Environments'],
    baselines: createBaselines({
      heartRate: { nominalMin: 55, nominalMax: 96, cautionMin: 48, cautionMax: 112 },
      systolicBP: { nominalMin: 100, nominalMax: 132, cautionMin: 90, cautionMax: 144 },
      bloodGlucose: { nominalMin: 72, nominalMax: 122, cautionMin: 65, cautionMax: 145 },
      cumulativeRadiation: { nominalMax: 60, cautionMax: 120 },
    }),
  },
  pressurized_rover: {
    id: 'pressurized_rover',
    name: 'Pressurized Rover',
    shortName: 'Pressurized Rover',
    orbitOrLocation: 'Mobile Surface Traverse · Mare Tranquillitatis',
    gravityG: 0.16,
    gravityLabel: '0.16 g (Mobile Traverse)',
    earthDelaySeconds: 3.8,
    earthDelayLabel: '3.8s Relay Hop',
    autonomousModeRequired: true,
    cabinAtmosphere: '55.2 kPa · 32% O2 · Compact ECLSS Loop',
    primaryHazards: ['Hostile Closed Environments', 'Isolation & Confinement', 'Space Radiation', 'Gravity Fields'],
    baselines: createBaselines({
      heartRate: { nominalMin: 56, nominalMax: 98, cautionMin: 48, cautionMax: 114 },
      sleepHours: { nominalMin: 6.0, cautionMin: 4.8 },
      cumulativeRadiation: { nominalMax: 65, cautionMax: 125 },
      moodCognitiveScore: { nominalMin: 6.8, cautionMin: 4.8 },
    }),
  },
};

export function classifyBiomarker(value: number, range: ThresholdRange): ClinicalStatus {
  if (value >= range.nominalMin && value <= range.nominalMax) {
    return 'NOMINAL';
  }
  if (value >= range.cautionMin && value <= range.cautionMax) {
    return 'CAUTION';
  }
  return 'CRITICAL';
}

export function formatDelayDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function worstStatus(statuses: ClinicalStatus[]): ClinicalStatus {
  if (statuses.includes('CRITICAL')) return 'CRITICAL';
  if (statuses.includes('CAUTION')) return 'CAUTION';
  return 'NOMINAL';
}

function buildSystemCountermeasures(
  systemId: BodySystemId,
  status: ClinicalStatus,
  env: MissionEnvironmentProfile,
  evals: Record<BiomarkerKey, BiomarkerEvaluation>
): CountermeasureAction[] {
  const actions: CountermeasureAction[] = [];
  const autonomousNote = env.autonomousModeRequired
    ? `Execute locally without waiting for Flight Surgeon confirmation (${env.earthDelayLabel} one-way Earth light lag).`
    : `Log execution to onboard EHR and sync with Mission Control Flight Surgeon (${env.earthDelayLabel}).`;

  if (systemId === 'neuro_behavioral') {
    const sleep = evals.sleepHours;
    const mood = evals.moodCognitiveScore;

    if (sleep.status !== 'NOMINAL') {
      actions.push({
        id: 'nb-circadian-light',
        title: 'Circadian Solid-State Light Therapy (480 nm)',
        priority: sleep.status === 'CRITICAL' ? 'IMMEDIATE' : 'ELEVATED',
        category: 'Circadian & Behavioral',
        protocolCode: 'HRP-SLEEP-04',
        instruction:
          'Initiate 45 minutes of high-melanopic blue-enriched cabin lighting at wake cycle; dim quarters to <10 lux 2 hours pre-sleep and verify cabin ppCO2 < 2.5 mmHg.',
        targetDurationOrDose: '45 min wake-pulse · 0.5 mg melatonin PRN',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (mood.status !== 'NOMINAL') {
      actions.push({
        id: 'nb-pvt-decompression',
        title: 'Cognitive Load Shedding & Asynchronous Behavioral Support',
        priority: mood.status === 'CRITICAL' ? 'IMMEDIATE' : 'ELEVATED',
        category: 'Circadian & Behavioral',
        protocolCode: 'HRP-BMed-12',
        instruction:
          'Defer non-critical science payload tasks for 24 hours. Complete 3-minute Psychomotor Vigilance Test (PVT-B) and run private Earth family video-journal downlink.',
        targetDurationOrDose: '24h workload reduction · 1x PVT-B baseline',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (status === 'CRITICAL') {
      actions.push({
        id: 'nb-cmo-neuro',
        title: 'Crew Medical Officer (CMO) Neuro-Cognitive Escalation',
        priority: 'IMMEDIATE',
        category: 'Medical Officer Escalation',
        protocolCode: 'CMO-NEURO-01',
        instruction:
          'Restrict autonomous rover/EVA operations until sleep debt recovers >6.5 hrs and PVT-B reaction lapses return below threshold. Crewmate buddy-check every 6 hours.',
        targetDurationOrDose: 'Immediate EVA stand-down',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: 'nb-routine',
        title: 'Maintain Fixed Circadian Lighting & Weekly PVT-B',
        priority: 'ROUTINE',
        category: 'Circadian & Behavioral',
        protocolCode: 'HRP-SLEEP-01',
        instruction:
          'Continue scheduled light-dark photoperiods and standard pre-sleep thermal regulation (19.5°C sleep station).',
        targetDurationOrDose: '7.5h target sleep window',
        autonomousExecutionNote: autonomousNote,
      });
    }
  }

  if (systemId === 'cardiovascular') {
    const hr = evals.heartRate;
    const sbp = evals.systolicBP;
    const dbp = evals.diastolicBP;
    const glu = evals.bloodGlucose;

    if (hr.status !== 'NOMINAL' || sbp.status !== 'NOMINAL' || dbp.status !== 'NOMINAL') {
      actions.push({
        id: 'cv-hydration-electrolyte',
        title: 'Isotonic Fluid & Electrolyte Loading Protocol',
        priority: status === 'CRITICAL' ? 'IMMEDIATE' : 'ELEVATED',
        category: 'Hydration & Metabolic',
        protocolCode: 'HRP-CV-07',
        instruction:
          'Administer 750 mL oral electrolyte solution (Na+ 110 mEq/L) over 45 minutes. Suspend high-intensity EVA exertion and repeat orthostatic cuff check after 30 minutes.',
        targetDurationOrDose: '750 mL oral isotonic bolus',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (glu.status !== 'NOMINAL') {
      actions.push({
        id: 'cv-glycemic-stabilization',
        title:
          glu.value < 74
            ? 'Rapid Complex-Carbohydrate Glycemic Rescue'
            : 'Low-Glycemic Nutrition & Metabolic Re-check',
        priority: glu.status === 'CRITICAL' ? 'IMMEDIATE' : 'ELEVATED',
        category: 'Hydration & Metabolic',
        protocolCode: 'HRP-MET-03',
        instruction:
          glu.value < 74
            ? 'Ingest 20 g fast-acting glucose gel followed by 15 g complex carbohydrate bar; re-test capillary glucose in 15 minutes.'
            : 'Switch next two crew meals to low-glycemic index rations and complete 30 min aerobic cycle ergometer session (CEVIS) if cleared.',
        targetDurationOrDose: glu.value < 74 ? '20 g glucose + 15m re-test' : '30 min moderate CEVIS',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (env.gravityG === 0 && status !== 'NOMINAL') {
      actions.push({
        id: 'cv-lbnp-conditioning',
        title: 'Lower-Body Negative Pressure (LBNP) Orthostatic Conditioning',
        priority: 'ELEVATED',
        category: 'Exercise & Loading',
        protocolCode: 'HRP-CV-11',
        instruction:
          'Run Chibis / LBNP suit session at -25 mmHg to -40 mmHg while monitoring brachial BP and heart rate recovery.',
        targetDurationOrDose: '20 min @ -30 mmHg',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: 'cv-routine',
        title: 'Daily Aerobic CEVIS / T2 Cardiovascular Conditioning',
        priority: 'ROUTINE',
        category: 'Exercise & Loading',
        protocolCode: 'HRP-CV-01',
        instruction:
          'Maintain 30–45 minutes of interval aerobic exercise at 65–75% max HR and target 2.5 L/day fluid intake.',
        targetDurationOrDose: '35 min aerobic · 2.5 L H2O',
        autonomousExecutionNote: autonomousNote,
      });
    }
  }

  if (systemId === 'musculoskeletal') {
    const bone = evals.boneDensityIndex;

    if (bone.status !== 'NOMINAL' || env.gravityG < 0.2) {
      actions.push({
        id: 'ms-ared-protocol',
        title: 'ARED High-Load Resistive Exercise Protocol',
        priority: bone.status === 'CRITICAL' ? 'IMMEDIATE' : bone.status === 'CAUTION' ? 'ELEVATED' : 'ROUTINE',
        category: 'Exercise & Loading',
        protocolCode: 'HRP-MSK-09',
        instruction:
          'Execute Advanced Resistive Exercise Device (ARED) axial-loading cycle: squats, deadlifts, and heel raises at 75–85% 1-RM equivalent to stimulate osteoblast remodeling.',
        targetDurationOrDose: '60 min ARED · 6 days/week',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (bone.status !== 'NOMINAL') {
      actions.push({
        id: 'ms-calcium-vitd',
        title: 'Vitamin D3, Calcium & Antiresorptive Bone Countermeasure',
        priority: bone.status === 'CRITICAL' ? 'IMMEDIATE' : 'ELEVATED',
        category: 'Hydration & Metabolic',
        protocolCode: 'HRP-MSK-14',
        instruction:
          'Verify daily 1,000 IU Vitamin D3 + 1,200 mg Calcium intake. Monitor urine citrate and hydration to mitigate hypercalciuria renal stone risk during bone resorption.',
        targetDurationOrDose: '1,000 IU Vit D3 + 2.8 L H2O/day',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (bone.status === 'CRITICAL') {
      actions.push({
        id: 'ms-cmo-bone',
        title: 'CMO Skeletal Fracture Risk & Bisphosphonate Review',
        priority: 'IMMEDIATE',
        category: 'Medical Officer Escalation',
        protocolCode: 'CMO-MSK-02',
        instruction:
          'Suspend high-impact EVA load transfers; perform quantitative ultrasound (QUS) calcaneal bone scan and transmit compressed scan packet to Flight Surgeon.',
        targetDurationOrDose: 'Immediate QUS scan + CMO review',
        autonomousExecutionNote: autonomousNote,
      });
    }
  }

  if (systemId === 'radiation_immune') {
    const rad = evals.cumulativeRadiation;
    const temp = evals.bodyTemp;

    if (rad.status !== 'NOMINAL') {
      actions.push({
        id: 'ri-spe-shelter',
        title: 'SPE Storm Shelter Retreat (Water-Wall / Polyethylene Core)',
        priority: rad.status === 'CRITICAL' ? 'IMMEDIATE' : 'ELEVATED',
        category: 'Radiation Shielding',
        protocolCode: 'HRP-RAD-01',
        instruction:
          'Relocate entire crew into high-hydrogen shielded habitat core (>20 g/cm² water/polyethylene equivalent). Suspend all unshielded EVA or cupola operations until solar proton flux <10 pfu.',
        targetDurationOrDose: 'Until SPE flux clears (~12–36h)',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (temp.status !== 'NOMINAL') {
      actions.push({
        id: 'ri-febrile-immune',
        title: 'Thermal Regulation & Latent Viral Reactivation Assay',
        priority: temp.status === 'CRITICAL' ? 'IMMEDIATE' : 'ELEVATED',
        category: 'Medical Officer Escalation',
        protocolCode: 'HRP-IMM-06',
        instruction:
          'Collect salivary PCR swab & fingerstick CBC differential to screen for spaceflight immune dysregulation or bacterial infection. Administer antipyretic protocol if >38.0°C.',
        targetDurationOrDose: '1x CBC + thermal trend q2h',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (rad.status === 'CRITICAL') {
      actions.push({
        id: 'ri-cmo-hematology',
        title: 'CMO Radiation Bio-Dosimetry & Lymphocyte Monitoring',
        priority: 'IMMEDIATE',
        category: 'Medical Officer Escalation',
        protocolCode: 'CMO-RAD-05',
        instruction:
          'Verify personal active dosimeter (RAD/HERA) against cabin TEPC readings. Perform 12h serial blood counts and prepare colony-stimulating factor kit if acute dose exceeds career threshold.',
        targetDurationOrDose: 'Serial 12h hematology check',
        autonomousExecutionNote: autonomousNote,
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: 'ri-routine',
        title: 'Continuous Dosimetry & Cabin Air Bio-Monitoring',
        priority: 'ROUTINE',
        category: 'Radiation Shielding',
        protocolCode: 'HRP-RAD-00',
        instruction:
          'Maintain personal TLD/active dosimeter wear and verify HEPA/activated-carbon ECLSS trace contaminant scrubbing.',
        targetDurationOrDose: 'Continuous passive + active log',
        autonomousExecutionNote: autonomousNote,
      });
    }
  }

  return actions;
}

const SYSTEM_METADATA: Record<
  BodySystemId,
  {
    displayName: string;
    anatomicalRegionLabel: string;
    whyItMattersInSpace: string;
    selfExamProtocolName: string;
    selfExamSteps: SelfExamStep[];
  }
> = {
  neuro_behavioral: {
    displayName: 'Neuro / Behavioral',
    anatomicalRegionLabel: 'Head & Cranial Region',
    whyItMattersInSpace:
      'Spaceflight-Associated Neuro-ocular Syndrome (SANS), circadian drift from 16 daily sunrises or deep-space darkness, and prolonged confinement directly degrade working memory, mood stability, and reaction time.',
    selfExamProtocolName: 'Autonomous PVT-B & Cranial Neuro Self-Exam',
    selfExamSteps: [
      {
        stepNumber: 1,
        title: 'Ambient Cabin & Pupil Baseline',
        hardwareRequired: 'Cabin CO2 Sensor · Handheld Ophthalmoscope',
        instruction:
          'Verify cabin ppCO2 (< 3.0 mmHg) before testing. Check pupil symmetry and visual acuity on the onboard Amsler grid for SANS optic disc changes.',
      },
      {
        stepNumber: 2,
        title: '3-Minute Psychomotor Vigilance Test (PVT-B)',
        hardwareRequired: 'Astro FIT Tablet / Crew Workstation',
        instruction:
          'Complete 3 minutes of visual stimulus reaction taps in quiet quarters. Record reaction latency (>355 ms counts as an attention lapse).',
      },
      {
        stepNumber: 3,
        title: 'Sleep & Mood Self-Log',
        hardwareRequired: 'Wrist Actigraph · Subjective Mood Scale',
        instruction:
          'Sync wrist actigraphy sleep duration and enter honest 1–10 cognitive/mood score into the local Astro FIT offline buffer.',
      },
    ],
  },
  cardiovascular: {
    displayName: 'Cardiovascular',
    anatomicalRegionLabel: 'Thorax & Vascular System',
    whyItMattersInSpace:
      'Without gravity pulling blood downward, ~2 liters of fluid shift into the chest and head. The heart remodels into a more spherical shape and plasma volume drops, creating severe fainting and arrhythmia risks during lunar/Martian gravity transitions.',
    selfExamProtocolName: 'Self-Guided Brachial BP, ECG & Capillary Glucose Check',
    selfExamSteps: [
      {
        stepNumber: 1,
        title: 'Zero-G Stabilized Cuff Placement',
        hardwareRequired: 'Wireless Oscillometric Cuff · Restraint Strap',
        instruction:
          'Anchor torso using foot restraints. Place cuff 2 cm above the antecubital fossa at heart level; remain still for 60 seconds prior to inflation.',
      },
      {
        stepNumber: 2,
        title: 'Single-Lead Rhythm & Vascular Ultrasound',
        hardwareRequired: 'Handheld Butterfly/Echo Ultrasound · Gel',
        instruction:
          'Apply acoustic gel at the left parasternal 4th intercostal space (long-axis view) to verify ventricular filling and rule out venous stasis.',
      },
      {
        stepNumber: 3,
        title: 'Capillary Glucose Calibration',
        hardwareRequired: 'Space-Certified Glucometer · Wipe',
        instruction:
          'Cleanse lateral fingertip, deploy lancet with surface-tension containment cap so blood droplet stays adhered, and touch test strip edge.',
      },
    ],
  },
  musculoskeletal: {
    displayName: 'Musculoskeletal',
    anatomicalRegionLabel: 'Axial & Appendicular Skeleton',
    whyItMattersInSpace:
      'Astronauts lose 1% to 1.5% of trabecular bone mineral density per month in microgravity—especially in the lumbar spine, femoral neck, and pelvis—while spinal discs swell and postural muscles atrophy rapidly.',
    selfExamProtocolName: 'ARED Load Verification & Quantitative Bone Ultrasound',
    selfExamSteps: [
      {
        stepNumber: 1,
        title: 'Calcaneal Quantitative Ultrasound (QUS)',
        hardwareRequired: 'Portable Bone Sonometry Cradle',
        instruction:
          'Insert right heel into acoustic coupling pads; run 45-second broadband ultrasound attenuation scan to update Bone Density T-score proxy.',
      },
      {
        stepNumber: 2,
        title: 'Lumbar & Hip Mobility Screen',
        hardwareRequired: 'Crew Restraint Frame',
        instruction:
          'Perform controlled axial extension and single-leg isometric squat check; note any sharp radicular pain or joint crepitus.',
      },
      {
        stepNumber: 3,
        title: 'ARED Load Calibration Audit',
        hardwareRequired: 'ARED Cylinder Pressure Telemetry',
        instruction:
          'Verify vacuum cylinder resistance calibration matches prescribed resistive workout log prior to next scheduled load session.',
      },
    ],
  },
  radiation_immune: {
    displayName: 'Radiation / Immune',
    anatomicalRegionLabel: 'Full-Body Hematopoietic & Immune Shield',
    whyItMattersInSpace:
      'High-energy Galactic Cosmic Rays and Solar Particle Events penetrate spacecraft hulls, damaging bone marrow stem cells and triggering latent viral reactivation alongside closed-cabin microbial exposure.',
    selfExamProtocolName: 'Active Dosimetry Cross-Check & Thermal/Immune Assay',
    selfExamSteps: [
      {
        stepNumber: 1,
        title: 'Personal Dosimeter & TEPC Sync',
        hardwareRequired: 'Crew Active Dosimeter (HERA / RAD)',
        instruction:
          'Read cumulative mSv badge on chest harness and cross-verify against habitat Tissue-Equivalent Proportional Counter (TEPC) flux.',
      },
      {
        stepNumber: 2,
        title: 'Tympanic / Temporal Core Temperature',
        hardwareRequired: 'Infrared Temporal Scanner',
        instruction:
          'Measure temporal artery temperature twice (30s apart) away from cabin ventilation ducts to avoid convective cooling skew.',
      },
      {
        stepNumber: 3,
        title: 'Lymph Node & Dermal Screening',
        hardwareRequired: 'Crew Mirror · High-CRI Inspection Light',
        instruction:
          'Palpate cervical and axillary lymph nodes for tenderness and inspect skin for radiation erythema or persistent closed-cabin dermatitis.',
      },
    ],
  },
};

export interface DiagnosticScanFinding {
  scanType: 'ocular_sans' | 'musculoskeletal_qus' | 'cardiac_echo';
  scanLabel: string;
  targetSystem: BodySystemId;
  severity: ClinicalStatus;
  summary: string;
  capturedAtIso: string;
  uploadedFileName?: string;
}

export interface EvaluationOptions {
  completedRoutineIds?: string[];
  completedCountermeasures?: string[];
  scanFinding?: DiagnosticScanFinding | null;
}

export interface DailyRoutineTask {
  id: string;
  title: string;
  targetSystem: BodySystemId;
  durationLabel: string;
  readinessPoints: number;
  description: string;
}

export const DAILY_ROUTINE_TASKS: DailyRoutineTask[] = [
  {
    id: 'routine-cv-check',
    title: 'Morning Cardiovascular & BP Check',
    targetSystem: 'cardiovascular',
    durationLabel: '10 min',
    readinessPoints: 6,
    description: 'Zero-G cuff calibration, resting HR check, and 500 mL electrolyte pre-load.',
  },
  {
    id: 'routine-ared-workout',
    title: '2-Hour ARED Resistance Workout',
    targetSystem: 'musculoskeletal',
    durationLabel: '120 min',
    readinessPoints: 8,
    description: 'Axial resistive squats, deadlifts, and T2 treadmill loading to counter bone resorption.',
  },
  {
    id: 'routine-rad-sync',
    title: 'Radiation Dosimeter Sync',
    targetSystem: 'radiation_immune',
    durationLabel: '5 min',
    readinessPoints: 5,
    description: 'Cross-check personal HERA/RAD badge with cabin TEPC and inspect storm shelter readiness.',
  },
  {
    id: 'routine-circadian-mood',
    title: 'Evening Circadian & Mood Log',
    targetSystem: 'neuro_behavioral',
    durationLabel: '15 min',
    readinessPoints: 6,
    description: 'Dim quarters <10 lux, verify ppCO2, and log PVT-B cognitive & sleep alignment.',
  },
];

export function evaluateMissionTelemetry(
  environmentId: MissionEnvironmentId,
  reading: BiomarkerReading,
  options: EvaluationOptions = {}
): MissionEvaluationReport {
  const {
    completedRoutineIds = [],
    completedCountermeasures = [],
    scanFinding = null,
  } = options;
  const environment = MISSION_ENVIRONMENTS[environmentId];
  const biomarkerEvaluations = {} as Record<BiomarkerKey, BiomarkerEvaluation>;

  (Object.keys(reading) as BiomarkerKey[]).forEach((key) => {
    const range = environment.baselines[key];
    const value = reading[key];
    const status = classifyBiomarker(value, range);
    const nominalCenter = (range.nominalMin + range.nominalMax) / 2;

    biomarkerEvaluations[key] = {
      key,
      label: range.label,
      value,
      unit: range.unit,
      precision: range.precision,
      status,
      nominalRangeText: `${range.nominalMin.toFixed(range.precision)}–${range.nominalMax.toFixed(range.precision)} ${range.unit}`,
      deltaFromNominalCenter: Number((value - nominalCenter).toFixed(2)),
      systemId: BIOMARKER_TO_SYSTEM[key],
      linkedHazards: BIOMARKER_HAZARD_MAP[key],
      spacePhysiologySummary: BIOMARKER_SPACE_EXPLANATIONS[key],
    };
  });

  const systemIds: BodySystemId[] = [
    'neuro_behavioral',
    'cardiovascular',
    'musculoskeletal',
    'radiation_immune',
  ];

  const systemPrefixMap: Record<BodySystemId, string> = {
    neuro_behavioral: 'nb-',
    cardiovascular: 'cv-',
    musculoskeletal: 'ms-',
    radiation_immune: 'ri-',
  };

  const systemEvaluations = {} as Record<BodySystemId, BodySystemEvaluation>;
  const allCountermeasures: CountermeasureAction[] = [];
  const activeHazards = new Set<NasaHazard>();

  systemIds.forEach((sysId) => {
    const meta = SYSTEM_METADATA[sysId];
    const sysBiomarkers = (Object.values(biomarkerEvaluations) as BiomarkerEvaluation[]).filter(
      (b) => b.systemId === sysId
    );
    let sysStatus = worstStatus(sysBiomarkers.map((b) => b.status));

    // Compound NASA HRP multi-system escalation rules:
    if (
      sysId === 'radiation_immune' &&
      biomarkerEvaluations.cumulativeRadiation.status === 'CAUTION' &&
      biomarkerEvaluations.sleepHours.status !== 'NOMINAL' &&
      biomarkerEvaluations.heartRate.status !== 'NOMINAL'
    ) {
      sysStatus = 'CRITICAL';
    }

    // Apply diagnostic scan finding if it targets this body system and is more severe
    if (scanFinding && scanFinding.targetSystem === sysId) {
      if (scanFinding.severity === 'CRITICAL') {
        sysStatus = 'CRITICAL';
      } else if (scanFinding.severity === 'CAUTION' && sysStatus === 'NOMINAL') {
        sysStatus = 'CAUTION';
      }
    }

    const countermeasures = buildSystemCountermeasures(
      sysId,
      sysStatus,
      environment,
      biomarkerEvaluations
    );

    const matchingRoutineDone = DAILY_ROUTINE_TASKS.some(
      (task) => task.targetSystem === sysId && completedRoutineIds.includes(task.id)
    );
    const matchingCountermeasureDone = countermeasures.some((cm) =>
      completedCountermeasures.includes(cm.id)
    );
    const prefixDone = completedCountermeasures.some((id) =>
      id.startsWith(systemPrefixMap[sysId])
    );

    let resolvedViaCountermeasure = false;
    if (
      sysStatus === 'CAUTION' &&
      (matchingRoutineDone || matchingCountermeasureDone || prefixDone)
    ) {
      sysStatus = 'NOMINAL';
      resolvedViaCountermeasure = true;
    }

    const sysHazards = Array.from(
      new Set(sysBiomarkers.flatMap((b) => b.linkedHazards))
    );

    if (sysStatus !== 'NOMINAL') {
      sysBiomarkers.forEach((b) => {
        if (b.status !== 'NOMINAL') {
          b.linkedHazards.forEach((h) => activeHazards.add(h));
        }
      });
    }

    const abnormalList = sysBiomarkers.filter((b) => b.status !== 'NOMINAL');
    let clinicalFindingSummary =
      abnormalList.length === 0
        ? `All ${meta.displayName.toLowerCase()} telemetry parameters are within calibrated ${environment.shortName} operational baselines.`
        : `${abnormalList.map((b) => `${b.label} (${b.value.toFixed(b.precision)} ${b.unit} · ${b.status})`).join('; ')} deviating from ${environment.shortName} baseline.`;

    if (scanFinding && scanFinding.targetSystem === sysId) {
      clinicalFindingSummary = `${scanFinding.scanLabel}: ${scanFinding.summary} ${clinicalFindingSummary}`;
    }

    if (resolvedViaCountermeasure) {
      clinicalFindingSummary = `CAUTION mitigated via completed NASA HRP countermeasure/routine protocol. ${clinicalFindingSummary}`;
    }

    countermeasures.forEach((cm) => allCountermeasures.push(cm));

    systemEvaluations[sysId] = {
      systemId: sysId,
      displayName: meta.displayName,
      anatomicalRegionLabel: meta.anatomicalRegionLabel,
      status: sysStatus,
      primaryHazards: sysHazards,
      biomarkers: sysBiomarkers,
      whyItMattersInSpace: meta.whyItMattersInSpace,
      clinicalFindingSummary,
      selfExamProtocolName: meta.selfExamProtocolName,
      selfExamSteps: meta.selfExamSteps,
      countermeasures,
    };
  });

  const overallStatus = worstStatus(systemIds.map((id) => systemEvaluations[id].status));

  const priorityRank: Record<CountermeasureAction['priority'], number> = {
    IMMEDIATE: 0,
    ELEVATED: 1,
    ROUTINE: 2,
  };

  const prioritizedCountermeasures = [...allCountermeasures].sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority]
  );

  const earthCommsStatusLabel = environment.autonomousModeRequired
    ? `${environment.earthDelayLabel} — Autonomous Mode Active`
    : `${environment.earthDelayLabel} — Real-Time Flight Surgeon Link`;

  return {
    environment,
    reading,
    overallStatus,
    autonomousModeActive: environment.autonomousModeRequired,
    earthCommsStatusLabel,
    biomarkerEvaluations,
    systemEvaluations,
    prioritizedCountermeasures,
    activeHazardCount: activeHazards.size,
    evaluatedAtIso: new Date().toISOString(),
  };
}

function build14DaySeries(
  startDayOffset: number,
  generator: (dayIdx: number) => { readings: BiomarkerReading; eventNote?: string }
): DailyTelemetryPoint[] {
  const baseDate = new Date('2026-11-01T08:00:00Z').getTime();
  return Array.from({ length: 14 }, (_, idx) => {
    const dayNumber = idx + 1;
    const missionSol = startDayOffset + idx;
    const { readings, eventNote } = generator(idx);
    return {
      day: dayNumber,
      missionDayLabel: `MD ${missionSol}`,
      timestampIso: new Date(baseDate + idx * 86400_000).toISOString(),
      readings,
      eventNote,
    };
  });
}

export const MISSION_SCENARIOS: Record<ScenarioId, MissionScenarioPreset> = {
  nominal_iss: {
    id: 'nominal_iss',
    code: 'SCN-A',
    name: 'Scenario A: Nominal ISS Orbit',
    subtitle: 'Steady LEO operations · All systems within HRP baseline',
    recommendedEnvironment: 'iss_orbit',
    missionElapsedTimeStart: 'T+ 042d 14:22:09',
    description:
      'Crew member operating on standard 16-orbit circadian schedule aboard ISS with ARED resistive training and nominal TDRS telemetry link.',
    triggerReading: {
      heartRate: 68,
      systolicBP: 118,
      diastolicBP: 74,
      bloodGlucose: 92,
      bodyTemp: 36.7,
      sleepHours: 7.4,
      cumulativeRadiation: 14.2,
      boneDensityIndex: -0.22,
      moodCognitiveScore: 8.6,
    },
    timeSeries14Day: build14DaySeries(29, (i) => ({
      readings: {
        heartRate: Math.round(66 + Math.sin(i * 0.7) * 3),
        systolicBP: Math.round(116 + Math.cos(i * 0.5) * 4),
        diastolicBP: Math.round(73 + Math.sin(i * 0.6) * 3),
        bloodGlucose: Math.round(90 + Math.sin(i * 0.9) * 5),
        bodyTemp: Number((36.6 + Math.sin(i * 0.4) * 0.15).toFixed(1)),
        sleepHours: Number((7.3 + Math.cos(i * 0.8) * 0.35).toFixed(1)),
        cumulativeRadiation: Number((10.3 + i * 0.3).toFixed(1)),
        boneDensityIndex: Number((-0.2 - i * 0.001).toFixed(2)),
        moodCognitiveScore: Number((8.5 + Math.sin(i * 0.5) * 0.3).toFixed(1)),
      },
      eventNote: i === 6 ? 'Weekly ARED & CEVIS assessment' : i === 13 ? 'Nominal baseline confirmed' : undefined,
    })),
  },

  mars_spe: {
    id: 'mars_spe',
    code: 'SCN-B',
    name: 'Scenario B: Mars Transit — Solar Particle Event',
    subtitle: 'Acute radiation spike, sleep disruption & tachycardia under 18m 42s comms delay',
    recommendedEnvironment: 'mars_transit',
    missionElapsedTimeStart: 'T+ 118d 07:45:18',
    description:
      'X-class solar flare triggers an acute Solar Particle Event during heliocentric cruise. Autonomous onboard countermeasures must engage immediately due to Earth light-lag.',
    triggerReading: {
      heartRate: 109,
      systolicBP: 146,
      diastolicBP: 92,
      bloodGlucose: 136,
      bodyTemp: 37.8,
      sleepHours: 4.1,
      cumulativeRadiation: 168.5,
      boneDensityIndex: -0.82,
      moodCognitiveScore: 4.6,
    },
    timeSeries14Day: build14DaySeries(105, (i) => {
      const speOnset = i >= 10;
      const ramp = speOnset ? i - 9 : 0; // 1..4
      return {
        readings: {
          heartRate: Math.round(72 + (speOnset ? ramp * 9.2 : Math.sin(i) * 3)),
          systolicBP: Math.round(122 + (speOnset ? ramp * 6 : Math.cos(i) * 3)),
          diastolicBP: Math.round(77 + (speOnset ? ramp * 3.8 : 0)),
          bloodGlucose: Math.round(98 + (speOnset ? ramp * 9.5 : 2)),
          bodyTemp: Number((36.8 + (speOnset ? ramp * 0.25 : 0)).toFixed(1)),
          sleepHours: Number((7.0 - (speOnset ? ramp * 0.72 : 0)).toFixed(1)),
          cumulativeRadiation: Number((58.0 + i * 1.4 + (speOnset ? ramp * 22.8 : 0)).toFixed(1)),
          boneDensityIndex: Number((-0.72 - i * 0.008).toFixed(2)),
          moodCognitiveScore: Number((7.8 - (speOnset ? ramp * 0.8 : 0)).toFixed(1)),
        },
        eventNote:
          i === 10
            ? 'NOAA/SEP Alert: X2.4 flare detected'
            : i === 13
            ? 'Peak SPE flux · Shelter protocol active'
            : undefined,
      };
    }),
  },

  lunar_eva_strain: {
    id: 'lunar_eva_strain',
    code: 'SCN-C',
    name: 'Scenario C: Lunar EVA — Cardiovascular Strain & Mild Dehydration',
    subtitle: 'South-pole surface traverse metabolic & fluid-balance alert',
    recommendedEnvironment: 'lunar_base',
    missionElapsedTimeStart: 'T+ 019d 19:08:52',
    description:
      'Extended 6.5-hour Shackleton crater geological EVA elevates core temperature and heart rate while depleting plasma hydration and blood glucose reserves.',
    triggerReading: {
      heartRate: 116,
      systolicBP: 145,
      diastolicBP: 93,
      bloodGlucose: 63,
      bodyTemp: 37.8,
      sleepHours: 5.7,
      cumulativeRadiation: 38.4,
      boneDensityIndex: -0.45,
      moodCognitiveScore: 6.4,
    },
    timeSeries14Day: build14DaySeries(6, (i) => {
      const evaPush = i >= 11;
      const delta = evaPush ? i - 10 : 0;
      return {
        readings: {
          heartRate: Math.round(74 + (evaPush ? delta * 14 : Math.sin(i) * 4)),
          systolicBP: Math.round(121 + (evaPush ? delta * 8 : 2)),
          diastolicBP: Math.round(78 + (evaPush ? delta * 5 : 1)),
          bloodGlucose: Math.round(91 - (evaPush ? delta * 9.3 : Math.sin(i) * 3)),
          bodyTemp: Number((36.8 + (evaPush ? delta * 0.33 : 0.1)).toFixed(1)),
          sleepHours: Number((6.9 - (evaPush ? delta * 0.4 : 0)).toFixed(1)),
          cumulativeRadiation: Number((26.0 + i * 0.95).toFixed(1)),
          boneDensityIndex: Number((-0.42 - i * 0.002).toFixed(2)),
          moodCognitiveScore: Number((7.9 - (evaPush ? delta * 0.5 : 0)).toFixed(1)),
        },
        eventNote:
          i === 11
            ? 'Lunar South Pole EVA-04 initiated'
            : i === 13
            ? 'Post-EVA tachycardia & mild hypoglycemia'
            : undefined,
      };
    }),
  },

  day_180_confinement: {
    id: 'day_180_confinement',
    code: 'SCN-D',
    name: 'Scenario D: Day 180 Confinement — Behavioral Fatigue & Bone Density Dip',
    subtitle: 'Long-duration deep-space isolation & skeletal unloading degradation',
    recommendedEnvironment: 'mars_transit',
    missionElapsedTimeStart: 'T+ 180d 03:11:44',
    description:
      'Six months into deep-space transit, cumulative Earth-out-of-view isolation, chronic sleep fragmentation, and microgravity unloading trigger behavioral fatigue and bone mineral loss.',
    triggerReading: {
      heartRate: 84,
      systolicBP: 129,
      diastolicBP: 85,
      bloodGlucose: 138,
      bodyTemp: 36.9,
      sleepHours: 4.5,
      cumulativeRadiation: 112.0,
      boneDensityIndex: -1.68,
      moodCognitiveScore: 3.8,
    },
    timeSeries14Day: build14DaySeries(167, (i) => ({
      readings: {
        heartRate: Math.round(74 + i * 0.75),
        systolicBP: Math.round(120 + i * 0.65),
        diastolicBP: Math.round(78 + i * 0.52),
        bloodGlucose: Math.round(106 + i * 2.4),
        bodyTemp: Number((36.7 + (i > 9 ? 0.2 : 0)).toFixed(1)),
        sleepHours: Number((6.1 - i * 0.12).toFixed(1)),
        cumulativeRadiation: Number((99.0 + i * 1.0).toFixed(1)),
        boneDensityIndex: Number((-1.26 - i * 0.032).toFixed(2)),
        moodCognitiveScore: Number((6.4 - i * 0.2).toFixed(1)),
      },
      eventNote:
        i === 7
          ? 'Earth-out-of-view psychological milestone'
          : i === 13
          ? 'QUS Bone T-score & PVT-B alert'
          : undefined,
    })),
  },
};

export function generateLiveMicroVariation(base: BiomarkerReading): BiomarkerReading {
  const jitter = (val: number, amplitude: number, decimals = 0) => {
    const offset = (Math.random() - 0.5) * 2 * amplitude;
    return Number((val + offset).toFixed(decimals));
  };
  return {
    ...base,
    heartRate: Math.max(38, Math.round(jitter(base.heartRate, 2, 0))),
    systolicBP: Math.max(75, Math.round(jitter(base.systolicBP, 2, 0))),
    diastolicBP: Math.max(45, Math.round(jitter(base.diastolicBP, 1, 0))),
    bodyTemp: jitter(base.bodyTemp, 0.05, 1),
  };
}

export interface MissionReadinessSummary {
  score: number; // 0-100
  tierLabel: 'EVA Cleared' | 'Flight Ready' | 'Monitor Closely' | 'Restricted Ops';
  routineCompletionRatio: string;
  allRoutineDone: boolean;
}

export function computeMissionReadiness(
  report: MissionEvaluationReport,
  completedRoutineIds: string[],
  completedCountermeasures: string[]
): MissionReadinessSummary {
  // Base physiological score starts at 75; system states adjust +/- and daily routine adds up to +25
  let physScore = 75;
  (Object.values(report.systemEvaluations) as BodySystemEvaluation[]).forEach((sys) => {
    if (sys.status === 'CAUTION') physScore -= 8;
    if (sys.status === 'CRITICAL') physScore -= 18;
  });

  const routinePoints = DAILY_ROUTINE_TASKS.reduce(
    (sum, task) => (completedRoutineIds.includes(task.id) ? sum + task.readinessPoints : sum),
    0
  );

  const countermeasureBonus = Math.min(10, completedCountermeasures.length * 3);
  const rawScore = Math.max(12, Math.min(100, physScore + routinePoints + countermeasureBonus));

  let tierLabel: MissionReadinessSummary['tierLabel'] = 'Monitor Closely';
  if (rawScore >= 90 && report.overallStatus === 'NOMINAL') {
    tierLabel = 'EVA Cleared';
  } else if (rawScore >= 75 && report.overallStatus !== 'CRITICAL') {
    tierLabel = 'Flight Ready';
  } else if (rawScore < 55 || report.overallStatus === 'CRITICAL') {
    tierLabel = 'Restricted Ops';
  }

  return {
    score: rawScore,
    tierLabel,
    routineCompletionRatio: `${completedRoutineIds.length}/${DAILY_ROUTINE_TASKS.length}`,
    allRoutineDone: completedRoutineIds.length === DAILY_ROUTINE_TASKS.length,
  };
}

export function generateLocalFlightSurgeonReply(
  question: string,
  report: MissionEvaluationReport,
  readinessScore: number
): string {
  const q = question.toLowerCase();
  const r = report.reading;
  const env = report.environment;
  const sys = report.systemEvaluations;

  if (q.includes('heart rate') || q.includes('tachycardia') || q.includes('bp') || q.includes('blood pressure')) {
    return [
      `Onboard Telemetry Assessment (${env.shortName}): Your current heart rate is ${r.heartRate} bpm and blood pressure is ${r.systolicBP}/${r.diastolicBP} mmHg (Cardiovascular status: ${sys.cardiovascular.status}).`,
      '',
      'Why This Occurs in Spaceflight:',
      '• Cephalad fluid shift in microgravity/partial gravity reduces circulating plasma volume by 10–15% and alters baroreceptor vagal tone.',
      '• Combined with EVA thermal exertion or mild dehydration, resting and exertional heart rate rises to maintain cardiac output.',
      '',
      'Immediate Autonomous Actions:',
      '• Ingest 750 mL isotonic oral electrolyte solution over 45 minutes.',
      '• Anchor in foot restraints and repeat brachial cuff BP after 30 minutes of rest.',
      '• Escalate to Crew Medical Officer (CMO) if resting HR stays >110 bpm or dizziness occurs.',
    ].join('\n');
  }

  if (q.includes('ultrasound') || q.includes('echo') || q.includes('cardiac')) {
    return [
      `Self-Guided Cardiac & Vascular Ultrasound Protocol (${env.shortName}):`,
      `Current vitals context: HR ${r.heartRate} bpm · BP ${r.systolicBP}/${r.diastolicBP} mmHg · Readiness ${readinessScore}%.`,
      '',
      'Step-by-Step Procedure:',
      '1. Anchor torso with crew foot loops so probe pressure does not push you away from the chest wall.',
      '2. Apply warm acoustic gel to the phased-array probe; place at the left parasternal 4th intercostal space (indicator toward right shoulder) for a Parasternal Long-Axis view.',
      '3. Capture a 5-second cine loop of left ventricular filling and aortic outflow.',
      '4. Slide probe subxiphoid to image the Inferior Vena Cava (IVC) collapsibility index (<50% collapse confirms adequate hydration).',
      '5. Save scan in the Multi-Modal Self-Check modal for onboard diagnostic evaluation.',
    ].join('\n');
  }

  if (q.includes('radiation') || q.includes('spe') || q.includes('msv') || q.includes('shelter')) {
    return [
      `Radiation & Immune Assessment (${env.shortName} · ${env.earthDelayLabel}):`,
      `Your cumulative dose is ${r.cumulativeRadiation.toFixed(1)} mSv (Baseline nominal limit: ${env.baselines.cumulativeRadiation.nominalMax} mSv · Status: ${sys.radiation_immune.status}). Core temp is ${r.bodyTemp.toFixed(1)}°C.`,
      '',
      'Prescribed NASA HRP Countermeasures:',
      '• Retreat immediately to the water-wall / polyethylene storm shelter core (>20 g/cm² shielding equivalent) until solar proton flux drops below 10 pfu.',
      '• Cross-verify your personal HERA/RAD dosimeter against the cabin TEPC monitor.',
      '• Maintain 2.5+ L hydration and monitor 12-hour serial lymphocyte / CBC trends if dose enters CRITICAL territory.',
    ].join('\n');
  }

  if (q.includes('sans') || q.includes('optic') || q.includes('eye') || q.includes('sleep') || q.includes('mood') || q.includes('fatigue')) {
    return [
      `Neuro-Behavioral & SANS Assessment (${env.shortName}):`,
      `Daily sleep is ${r.sleepHours.toFixed(1)} hrs and Mood/Cognitive score is ${r.moodCognitiveScore.toFixed(1)}/10 (Status: ${sys.neuro_behavioral.status}).`,
      '',
      'Guidance & Self-Exam:',
      '• Perform an Optic Nerve Sheath Diameter (ONSD) ocular ultrasound (>5.5 mm suggests cephalad fluid shift / SANS risk) and check the Amsler grid for visual distortion.',
      '• Run 45 minutes of 480 nm blue-enriched light at wake cycle and verify cabin ppCO2 < 2.5 mmHg.',
      '• Complete the 15-second PVT-B reflex test inside the Log Vitals modal to quantify reaction lapses.',
    ].join('\n');
  }

  if (q.includes('bone') || q.includes('ared') || q.includes('muscle') || q.includes('skeletal')) {
    return [
      `Musculoskeletal & Bone Integrity Brief (${env.shortName}):`,
      `Current Bone Density Index is ${r.boneDensityIndex.toFixed(2)} T-score (Status: ${sys.musculoskeletal.status}).`,
      '',
      'Autonomous Countermeasures:',
      '• Complete your 2-hour ARED high-load axial resistive workout (squats, deadlifts, heel raises at 75–85% 1-RM equivalent).',
      '• Maintain 1,000 IU Vitamin D3 + 1,200 mg Calcium and 2.8 L/day hydration to prevent hypercalciuria renal stones.',
      '• Log a Calcaneal QUS scan in the Self-Check modal to track weekly bone mineral trends.',
    ].join('\n');
  }

  return [
    `Astro FIT Onboard Clinical Summary (${env.name} · ${env.earthDelayLabel}):`,
    `• Overall Posture: ${report.overallStatus} | Mission Readiness: ${readinessScore}%`,
    `• Cardiovascular: HR ${r.heartRate} bpm · BP ${r.systolicBP}/${r.diastolicBP} mmHg (${sys.cardiovascular.status})`,
    `• Radiation / Immune: ${r.cumulativeRadiation.toFixed(1)} mSv · ${r.bodyTemp.toFixed(1)}°C (${sys.radiation_immune.status})`,
    `• Neuro / Behavioral: ${r.sleepHours.toFixed(1)}h sleep · ${r.moodCognitiveScore.toFixed(1)}/10 cog (${sys.neuro_behavioral.status})`,
    `• Musculoskeletal: ${r.boneDensityIndex.toFixed(2)} T-score (${sys.musculoskeletal.status})`,
    '',
    report.prioritizedCountermeasures[0]
      ? `Top Priority Action: [${report.prioritizedCountermeasures[0].priority}] ${report.prioritizedCountermeasures[0].title} — ${report.prioritizedCountermeasures[0].instruction}`
      : 'All physiological systems are operating within nominal NASA HRP tolerances.',
  ].join('\n');
}

export interface PredictiveTrajectoryAlert {
  metricKey: BiomarkerKey;
  chartGroup: 'cardiovascular' | 'radiation' | 'sleep_mood';
  targetSystem: BodySystemId;
  label: string;
  unit: string;
  precision: number;
  currentValue: number;
  dailySlope: number;
  horizonDays: number;
  projectedSeries: number[]; // +1d..+5d forecast values
  severity: 'CAUTION' | 'CRITICAL';
  daysUntilBreach: number; // 0 if already breached & worsening, otherwise 0.1..5.0
  thresholdValue: number;
  headline: string;
  detail: string;
}

export interface TrajectoryForecastBundle {
  horizonDays: number;
  alerts: PredictiveTrajectoryAlert[];
  forecastsByMetric: Record<
    'heartRate' | 'systolicBP' | 'cumulativeRadiation' | 'sleepHours' | 'moodCognitiveScore',
    {
      dailySlope: number;
      projectedSeries: number[];
      severity: ClinicalStatus;
      breachDayOffset: number | null; // 0..5 within horizon
      thresholdValue: number | null;
    }
  >;
}

function computeRecentSlope(values: number[]): number {
  // Linear least-squares slope over the last up to 5 points to capture acute mission ramps
  const window = values.slice(-5);
  const n = window.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += window[i];
    sumXY += i * window[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function computePredictiveTrajectoryAlerts(
  series: DailyTelemetryPoint[],
  environment: MissionEnvironmentProfile,
  liveReadings?: BiomarkerReading
): TrajectoryForecastBundle {
  const horizonDays = 5;
  const effectiveSeries = series.map((pt, idx) =>
    liveReadings && idx === series.length - 1 ? liveReadings : pt.readings
  );

  type MonitoredMetric =
    | 'heartRate'
    | 'systolicBP'
    | 'cumulativeRadiation'
    | 'sleepHours'
    | 'moodCognitiveScore';

  const specs: Array<{
    key: MonitoredMetric;
    direction: 'upper' | 'lower';
    chartGroup: PredictiveTrajectoryAlert['chartGroup'];
  }> = [
    { key: 'cumulativeRadiation', direction: 'upper', chartGroup: 'radiation' },
    { key: 'heartRate', direction: 'upper', chartGroup: 'cardiovascular' },
    { key: 'systolicBP', direction: 'upper', chartGroup: 'cardiovascular' },
    { key: 'sleepHours', direction: 'lower', chartGroup: 'sleep_mood' },
    { key: 'moodCognitiveScore', direction: 'lower', chartGroup: 'sleep_mood' },
  ];

  const alerts: PredictiveTrajectoryAlert[] = [];
  const forecastsByMetric = {} as TrajectoryForecastBundle['forecastsByMetric'];

  specs.forEach(({ key, direction, chartGroup }) => {
    const range = environment.baselines[key];
    const values = effectiveSeries.map((r) => r[key]);
    const currentValue = values[values.length - 1] ?? 0;
    const rawSlope = computeRecentSlope(values);
    // For cumulative radiation, slope cannot physically decrease
    const dailySlope = key === 'cumulativeRadiation' ? Math.max(0, rawSlope) : rawSlope;

    const projectedSeries = Array.from({ length: horizonDays }, (_, idx) => {
      const val = currentValue + dailySlope * (idx + 1);
      if (key === 'sleepHours') return Math.max(1.5, Math.min(12, val));
      if (key === 'moodCognitiveScore') return Math.max(1, Math.min(10, val));
      if (key === 'cumulativeRadiation') return Math.max(0, val);
      return Math.max(30, val);
    });

    const cautionLimit = direction === 'upper' ? range.nominalMax : range.nominalMin;
    const criticalLimit = direction === 'upper' ? range.cautionMax : range.cautionMin;

    const isWorsening =
      direction === 'upper' ? dailySlope > 0.05 : dailySlope < -0.04;

    const isCurrentlyCritical =
      direction === 'upper' ? currentValue > criticalLimit : currentValue < criticalLimit;
    const isCurrentlyCaution =
      direction === 'upper' ? currentValue > cautionLimit : currentValue < cautionLimit;

    let severity: ClinicalStatus = 'NOMINAL';
    let breachDayOffset: number | null = null;
    let thresholdValue: number | null = null;

    if (isCurrentlyCritical) {
      severity = 'CRITICAL';
      breachDayOffset = 0;
      thresholdValue = criticalLimit;
    } else if (isWorsening) {
      // Check when trajectory crosses criticalLimit or cautionLimit within +5 days
      const daysToCritical = (criticalLimit - currentValue) / dailySlope;
      const daysToCaution = (cautionLimit - currentValue) / dailySlope;

      if (daysToCritical > 0 && daysToCritical <= horizonDays) {
        severity = 'CRITICAL';
        breachDayOffset = Number(daysToCritical.toFixed(1));
        thresholdValue = criticalLimit;
      } else if (isCurrentlyCaution) {
        severity = 'CAUTION';
        breachDayOffset = 0;
        thresholdValue = cautionLimit;
      } else if (daysToCaution > 0 && daysToCaution <= horizonDays) {
        severity = 'CAUTION';
        breachDayOffset = Number(daysToCaution.toFixed(1));
        thresholdValue = cautionLimit;
      }
    } else if (isCurrentlyCaution) {
      severity = 'CAUTION';
      breachDayOffset = 0;
      thresholdValue = cautionLimit;
    }

    forecastsByMetric[key] = {
      dailySlope,
      projectedSeries,
      severity,
      breachDayOffset,
      thresholdValue,
    };

    // Emit actionable predictive alert whenever trajectory is worsening toward or beyond a limit
    if (severity !== 'NOMINAL' && thresholdValue !== null && (isWorsening || isCurrentlyCritical || isCurrentlyCaution)) {
      const slopeSign = dailySlope >= 0 ? '+' : '';
      const slopeText = `${slopeSign}${dailySlope.toFixed(range.precision === 0 ? 1 : range.precision)} ${range.unit}/day`;
      const endForecast = projectedSeries[projectedSeries.length - 1];

      const headline =
        breachDayOffset === 0
          ? `${range.label} ${severity === 'CRITICAL' ? 'limit breached' : 'above nominal'} (${slopeText})`
          : `${range.label} projected to breach ${thresholdValue.toFixed(range.precision)} ${range.unit} in ~${breachDayOffset}d`;

      const detail =
        breachDayOffset === 0
          ? `Current ${currentValue.toFixed(range.precision)} ${range.unit} · +5d trajectory reaches ${endForecast.toFixed(range.precision)} ${range.unit}`
          : `Trajectory (${slopeText}) reaches ${endForecast.toFixed(range.precision)} ${range.unit} by D+${horizonDays} vs. ${severity.toLowerCase()} limit ${thresholdValue.toFixed(range.precision)} ${range.unit}.`;

      alerts.push({
        metricKey: key,
        chartGroup,
        targetSystem: BIOMARKER_TO_SYSTEM[key],
        label: range.label,
        unit: range.unit,
        precision: range.precision,
        currentValue,
        dailySlope,
        horizonDays,
        projectedSeries,
        severity,
        daysUntilBreach: breachDayOffset ?? horizonDays,
        thresholdValue,
        headline,
        detail,
      });
    }
  });

  // Sort CRITICAL first, then soonest breach day
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'CRITICAL' ? -1 : 1;
    }
    return a.daysUntilBreach - b.daysUntilBreach;
  });

  return {
    horizonDays,
    alerts,
    forecastsByMetric,
  };
}


