import React from 'react';
import {
  CheckCircle2,
  Circle,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import {
  BodySystemId,
  DAILY_ROUTINE_TASKS,
  MissionReadinessSummary,
} from '../lib/hrpEngine';

interface CrewReadinessHUDProps {
  readiness: MissionReadinessSummary;
  streakDays: number;
  completedRoutineIds: string[];
  onToggleRoutineTask: (taskId: string) => void;
  onInspectSystem: (systemId: BodySystemId) => void;
}

export const CrewReadinessHUD: React.FC<CrewReadinessHUDProps> = ({
  readiness,
  streakDays,
  completedRoutineIds,
  onToggleRoutineTask,
  onInspectSystem,
}) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (readiness.score / 100) * circumference;

  const scoreTone =
    readiness.score >= 85
      ? { stroke: '#10B981', text: 'text-[#10B981]', border: 'border-[#232734]' }
      : readiness.score >= 65
      ? { stroke: '#F59E0B', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/50' }
      : { stroke: '#EF4444', text: 'text-[#EF4444]', border: 'border-[#EF4444]/60' };

  return (
    <section className={`rounded-[6px] border ${scoreTone.border} bg-[#11131A] p-3.5 sm:p-4`}>
      {/* Readiness Score + Daily Health Streak Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232734] pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-16 w-16 items-center justify-center shrink-0">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="#1C202B"
                strokeWidth="5"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke={scoreTone.stroke}
                strokeWidth="5"
                strokeLinecap="butt"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute font-mono-tabular text-sm font-bold text-white">
              {readiness.score}%
            </span>
          </div>

          <div className="min-w-0">
            <div className="flight-micro-label">Mission Readiness</div>
            <div className={`mt-0.5 text-base font-semibold ${scoreTone.text} truncate`}>
              {readiness.tierLabel}
            </div>
            <div className="font-mono-tabular text-[11px] text-[#8E96AA]">
              Routine: {readiness.routineCompletionRatio} complete
            </div>
          </div>
        </div>

        {/* Daily Health Streak Indicator */}
        <div className="flex flex-col items-start sm:items-end text-left sm:text-right shrink-0">
          <div className="inline-flex items-center gap-1 rounded-[4px] border border-[#232734] bg-[#0D0F15] px-2 py-1 font-mono-tabular text-xs font-semibold text-[#F59E0B]">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{streakDays}D STREAK</span>
          </div>
          <span className="mt-1 font-mono-tabular text-[10px] text-[#8E96AA]">
            {readiness.allRoutineDone ? 'STREAK +1 LOGGED' : '4/4 EXTENDS STREAK'}
          </span>
        </div>
      </div>

      {/* Interactive Daily Mission Routine Checklist */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flight-micro-label">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
            <span>Daily Mission Routine</span>
          </div>
          <span className="font-mono-tabular text-[10px] text-[#8E96AA]">
            MITIGATES CAUTION
          </span>
        </div>

        <ul className="mt-2 space-y-1.5">
          {DAILY_ROUTINE_TASKS.map((task) => {
            const checked = completedRoutineIds.includes(task.id);
            return (
              <li key={task.id}>
                <div
                  className={`flex items-start justify-between gap-2.5 rounded-[4px] border p-2.5 transition-colors ${
                    checked
                      ? 'border-[#10B981]/50 bg-[#10B981]/10'
                      : 'border-[#232734] bg-[#0D0F15] hover:border-[#3B4254]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleRoutineTask(task.id)}
                    className="flex flex-1 items-start gap-2.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2B7FFF] rounded-[2px]"
                  >
                    {checked ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#10B981] shrink-0" aria-hidden="true" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 text-[#8E96AA] shrink-0" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-medium ${
                          checked ? 'text-[#10B981] line-through decoration-[#10B981]/60' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#8E96AA] leading-snug">
                        {task.description}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onInspectSystem(task.targetSystem)}
                    className="font-mono-tabular text-[10px] font-semibold text-[#2B7FFF] hover:text-white shrink-0 pt-0.5"
                    title="Inspect target body system"
                  >
                    +{task.readinessPoints}%
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
