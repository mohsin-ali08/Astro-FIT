import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Send,
  Terminal,
  User,
  X,
} from 'lucide-react';
import {
  generateLocalFlightSurgeonReply,
  MissionEvaluationReport,
  MissionReadinessSummary,
  ScenarioId,
  MISSION_SCENARIOS,
} from '../lib/hrpEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceLabel?: string;
}

interface FlightSurgeonAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  report: MissionEvaluationReport;
  readiness: MissionReadinessSummary;
  scenarioId: ScenarioId;
  isLinkAvailable: boolean;
}

const QUICK_PROMPTS = [
  'Why is my resting heart rate elevated in microgravity?',
  'Guide me through a cardiac ultrasound',
  "What countermeasures do I need for today's radiation spike?",
  'How do I check for SANS optic nerve swelling?',
];

export const FlightSurgeonAssistant: React.FC<FlightSurgeonAssistantProps> = ({
  isOpen,
  onClose,
  report,
  readiness,
  scenarioId,
  isLinkAvailable,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Flight Surgeon Clinical Decision Support online. Live dashboard vitals, NASA HRP 5 Hazards baselines, and onboard self-exam protocols are synchronized. Select a query or enter a clinical prompt.',
      sourceLabel: 'FLIGHT SURGEON CONSOLE',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      if (!isLinkAvailable) {
        const localReply = generateLocalFlightSurgeonReply(
          trimmed,
          report,
          readiness.score
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: localReply,
            sourceLabel: 'LOCAL ONBOARD HRP KNOWLEDGE BASE (OFFLINE)',
          },
        ]);
        return;
      }

      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/flight-surgeon/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          telemetryContext: {
            environmentName: report.environment.name,
            gravityLabel: report.environment.gravityLabel,
            earthDelayLabel: report.environment.earthDelayLabel,
            autonomousModeActive: report.autonomousModeActive,
            scenarioName: MISSION_SCENARIOS[scenarioId].name,
            overallStatus: report.overallStatus,
            readinessScore: readiness.score,
            readings: report.reading,
            systemStatuses: {
              neuro_behavioral: report.systemEvaluations.neuro_behavioral.status,
              cardiovascular: report.systemEvaluations.cardiovascular.status,
              musculoskeletal: report.systemEvaluations.musculoskeletal.status,
              radiation_immune: report.systemEvaluations.radiation_immune.status,
            },
            activeCountermeasures: report.prioritizedCountermeasures.slice(0, 4).map((c) => ({
              title: c.title,
              priority: c.priority,
              protocolCode: c.protocolCode,
            })),
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { reply?: string };
        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: `asst-${Date.now()}`,
              role: 'assistant',
              content: data.reply!,
              sourceLabel: 'FLIGHT SURGEON AI // TELEMETRY LINKED',
            },
          ]);
          return;
        }
      }

      const fallbackReply = generateLocalFlightSurgeonReply(
        trimmed,
        report,
        readiness.score
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: fallbackReply,
          sourceLabel: 'LOCAL ONBOARD HRP KNOWLEDGE BASE',
        },
      ]);
    } catch {
      const fallbackReply = generateLocalFlightSurgeonReply(
        trimmed,
        report,
        readiness.score
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: fallbackReply,
          sourceLabel: 'LOCAL ONBOARD HRP KNOWLEDGE BASE',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flight-surgeon-title"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col border-l border-[#232734] bg-[#090A0F] text-[#E5E7EB]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#232734] bg-[#11131A] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[#2B7FFF] shrink-0" aria-hidden="true" />
              <h2 id="flight-surgeon-title" className="text-sm font-semibold text-white truncate">
                Autonomous Flight Surgeon Co-Pilot
              </h2>
            </div>
            <p className="mt-1 font-mono-tabular text-[11px] text-[#8E96AA] break-words">
              {report.environment.shortName} · HR {report.reading.heartRate} bpm · {report.reading.cumulativeRadiation.toFixed(1)} mSv · READINESS {readiness.score}%
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[4px] border border-[#232734] bg-[#0D0F15] p-1.5 text-[#8E96AA] hover:border-[#2B7FFF] hover:text-white shrink-0"
            aria-label="Close Flight Surgeon Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Prompts Bar */}
        <div className="border-b border-[#232734] bg-[#0D0F15] px-4 py-2.5 sm:px-5 sm:py-3 max-h-36 overflow-y-auto sm:max-h-none">
          <div className="mb-2 flex items-center gap-1.5 flight-micro-label">
            <Terminal className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
            <span>Quick Clinical Queries</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessage(qp)}
                className="rounded-[4px] border border-[#232734] bg-[#11131A] px-2.5 py-1.5 text-left text-[11px] text-[#E5E7EB] transition-colors hover:border-[#2B7FFF] hover:text-white disabled:opacity-50"
              >
                {qp}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-[#232734] bg-[#11131A] text-[#2B7FFF]">
                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-[4px] border px-3.5 py-2.5 text-xs leading-relaxed break-words ${
                    isUser
                      ? 'border-[#2B7FFF] bg-[#2B7FFF]/15 text-white'
                      : 'border-[#232734] bg-[#11131A] text-[#E5E7EB]'
                  }`}
                >
                  {msg.sourceLabel && (
                    <div className="mb-1 font-mono-tabular text-[10px] text-[#2B7FFF]">
                      {msg.sourceLabel}
                    </div>
                  )}
                  <div className="whitespace-pre-line">{msg.content}</div>
                </div>

                {isUser && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-[#232734] bg-[#11131A] text-[#8E96AA]">
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-[#2B7FFF] font-mono-tabular">
              <Bot className="h-4 w-4" aria-hidden="true" />
              <span>PROCESSING LIVE TELEMETRY &amp; HRP PROTOCOLS...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="border-t border-[#232734] bg-[#11131A] p-3.5 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter clinical query..."
              aria-label="Ask Flight Surgeon Assistant"
              className="flex-1 min-w-0 rounded-[4px] border border-[#232734] bg-[#090A0F] px-3 py-2 text-xs text-white placeholder:text-[#8E96AA]/60 focus:border-[#2B7FFF] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#2B7FFF] bg-[#2B7FFF]/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2B7FFF]/30 disabled:opacity-40 shrink-0"
            >
              <Send className="h-3.5 w-3.5 text-[#2B7FFF]" aria-hidden="true" />
              <span>SEND</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};
