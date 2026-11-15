import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface FlightSurgeonRequestBody {
  message: string;
  history?: ChatHistoryTurn[];
  telemetryContext?: {
    environmentName: string;
    gravityLabel: string;
    earthDelayLabel: string;
    autonomousModeActive: boolean;
    scenarioName: string;
    overallStatus: string;
    readinessScore: number;
    readings: Record<string, number>;
    systemStatuses: Record<string, string>;
    activeCountermeasures: Array<{
      title: string;
      priority: string;
      protocolCode: string;
    }>;
  };
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/flight-surgeon/chat', async (req: Request, res: Response) => {
    const body = req.body as FlightSurgeonRequestBody;
    const userMessage = (body?.message ?? '').trim();

    if (!userMessage) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in server environment.',
        fallbackRequired: true,
      });
      return;
    }

    const ctx = body.telemetryContext;
    const contextSummary = ctx
      ? [
          `Active Mission Environment: ${ctx.environmentName} (${ctx.gravityLabel})`,
          `Earth Comms Delay: ${ctx.earthDelayLabel} (Autonomous Mode: ${ctx.autonomousModeActive ? 'ACTIVE' : 'OFF'})`,
          `Active Scenario: ${ctx.scenarioName}`,
          `Overall Crew Posture: ${ctx.overallStatus} | Mission Readiness Score: ${ctx.readinessScore}%`,
          `Live Biomarkers: HR=${ctx.readings.heartRate} bpm, BP=${ctx.readings.systolicBP}/${ctx.readings.diastolicBP} mmHg, Glucose=${ctx.readings.bloodGlucose} mg/dL, Temp=${ctx.readings.bodyTemp}°C, Sleep=${ctx.readings.sleepHours} hrs, Cumulative Radiation=${ctx.readings.cumulativeRadiation} mSv, Bone T-score=${ctx.readings.boneDensityIndex}, Mood/Cog=${ctx.readings.moodCognitiveScore}/10`,
          `System Statuses: Neuro=${ctx.systemStatuses.neuro_behavioral}, Cardiovascular=${ctx.systemStatuses.cardiovascular}, Musculoskeletal=${ctx.systemStatuses.musculoskeletal}, Radiation/Immune=${ctx.systemStatuses.radiation_immune}`,
          `Prioritized Countermeasures: ${ctx.activeCountermeasures.map((c) => `[${c.priority}] ${c.protocolCode} ${c.title}`).join('; ')}`,
        ].join('\n')
      : 'No live telemetry context provided.';

    const systemInstruction = [
      'You are Astro FIT Autonomous Flight Surgeon Co-Pilot, an aerospace biomedical clinical decision-support assistant aligned with NASA Human Research Program (HRP) 5 Hazards of Human Spaceflight (Space Radiation, Isolation & Confinement, Distance from Earth, Gravity Fields, Hostile Closed Environments).',
      'Always tailor your medical guidance directly to the crew member’s live dashboard vitals below.',
      'Format responses cleanly with short headings or bullet points (max ~180 words), plain-English physiological rationale, step-by-step self-exam or countermeasure actions, and clear escalation criteria for the Crew Medical Officer (CMO).',
      'Never invent fake numbers—cite only the exact vitals provided in the live telemetry context.',
      '',
      'LIVE CREW TELEMETRY CONTEXT:',
      contextSummary,
    ].join('\n');

    const conversationLines = (body.history ?? [])
      .slice(-6)
      .map((turn) => `${turn.role === 'user' ? 'Astronaut' : 'Flight Surgeon'}: ${turn.content}`)
      .join('\n');

    const prompt = conversationLines
      ? `${conversationLines}\nAstronaut: ${userMessage}`
      : userMessage;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const replyText = (response.text ?? '').trim();
      if (!replyText) {
        res.status(502).json({
          error: 'Empty response from Gemini Flight Surgeon model.',
          fallbackRequired: true,
        });
        return;
      }

      res.json({
        reply: replyText,
        source: 'gemini',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Gemini API error';
      res.status(502).json({
        error: message,
        fallbackRequired: true,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        ws: disableHmr ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Astro FIT server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
