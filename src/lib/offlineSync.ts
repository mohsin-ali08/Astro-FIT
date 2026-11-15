import { useCallback, useEffect, useState } from 'react';
import {
  BiomarkerReading,
  DiagnosticScanFinding,
  MissionEnvironmentId,
  ScenarioId,
} from './hrpEngine';

export interface OfflineTelemetryEntry {
  id: string;
  loggedAtIso: string;
  missionDayLabel: string;
  environmentId: MissionEnvironmentId;
  scenarioId: ScenarioId;
  readings: BiomarkerReading;
  notes: string;
  syncStatus: 'pending' | 'synced';
  syncedAtIso?: string;
}

export interface OfflineSnapshot {
  environmentId: MissionEnvironmentId;
  scenarioId: ScenarioId;
  readings: BiomarkerReading;
  completedCountermeasures: string[];
  completedRoutineIds?: string[];
  streakDays?: number;
  scanFinding?: DiagnosticScanFinding | null;
  updatedAtIso: string;
}

const DB_NAME = 'astrofit-offline-db';
const DB_VERSION = 1;
const STORE_LOGS = 'telemetry_logs';
const STORE_STATE = 'mission_state';
const STATE_KEY = 'active_snapshot';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
        logStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        logStore.createIndex('loggedAtIso', 'loggedAtIso', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSnapshot(snapshot: OfflineSnapshot): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readwrite');
      tx.objectStore(STORE_STATE).put({ key: STATE_KEY, ...snapshot });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB is blocked
    try {
      localStorage.setItem('astrofit_snapshot', JSON.stringify(snapshot));
    } catch {
      // Ignore quota errors
    }
  }
}

export async function loadOfflineSnapshot(): Promise<OfflineSnapshot | null> {
  try {
    const db = await openDatabase();
    return await new Promise<OfflineSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readonly');
      const req = tx.objectStore(STORE_STATE).get(STATE_KEY);
      req.onsuccess = () => {
        if (!req.result) {
          resolve(null);
          return;
        }
        const { key: _ignored, ...snapshot } = req.result as OfflineSnapshot & { key: string };
        resolve(snapshot);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem('astrofit_snapshot');
      return raw ? (JSON.parse(raw) as OfflineSnapshot) : null;
    } catch {
      return null;
    }
  }
}

export async function appendTelemetryLog(entry: OfflineTelemetryEntry): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS, 'readwrite');
      tx.objectStore(STORE_LOGS).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = await listTelemetryLogs();
    localStorage.setItem('astrofit_logs', JSON.stringify([entry, ...existing]));
  }
}

export async function listTelemetryLogs(): Promise<OfflineTelemetryEntry[]> {
  try {
    const db = await openDatabase();
    return await new Promise<OfflineTelemetryEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS, 'readonly');
      const req = tx.objectStore(STORE_LOGS).getAll();
      req.onsuccess = () => {
        const items = (req.result as OfflineTelemetryEntry[]) || [];
        items.sort((a, b) => b.loggedAtIso.localeCompare(a.loggedAtIso));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem('astrofit_logs');
      return raw ? (JSON.parse(raw) as OfflineTelemetryEntry[]) : [];
    } catch {
      return [];
    }
  }
}

export async function markLogsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const nowIso = new Date().toISOString();
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS, 'readwrite');
      const store = tx.objectStore(STORE_LOGS);
      ids.forEach((id) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const item = getReq.result as OfflineTelemetryEntry | undefined;
          if (item) {
            store.put({
              ...item,
              syncStatus: 'synced',
              syncedAtIso: nowIso,
            });
          }
        };
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = await listTelemetryLogs();
    const updated = existing.map((item) =>
      ids.includes(item.id)
        ? { ...item, syncStatus: 'synced' as const, syncedAtIso: nowIso }
        : item
    );
    localStorage.setItem('astrofit_logs', JSON.stringify(updated));
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useOfflineTelemetrySync(simulateDeepSpaceBlackout: boolean) {
  const browserOnline = useOnlineStatus();
  const isLinkAvailable = browserOnline && !simulateDeepSpaceBlackout;

  const [logs, setLogs] = useState<OfflineTelemetryEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAtIso, setLastSyncedAtIso] = useState<string | null>(null);

  const refreshLogs = useCallback(async () => {
    const loaded = await listTelemetryLogs();
    setLogs(loaded);
  }, []);

  useEffect(() => {
    void refreshLogs();
  }, [refreshLogs]);

  const syncPendingLogs = useCallback(async () => {
    if (!isLinkAvailable) return 0;
    const current = await listTelemetryLogs();
    const pending = current.filter((item) => item.syncStatus === 'pending');
    if (pending.length === 0) return 0;

    setIsSyncing(true);
    try {
      // Simulate Earth-link packet burst handoff
      await new Promise((r) => setTimeout(r, 450));
      await markLogsSynced(pending.map((p) => p.id));
      const updated = await listTelemetryLogs();
      setLogs(updated);
      setLastSyncedAtIso(new Date().toISOString());
      return pending.length;
    } finally {
      setIsSyncing(false);
    }
  }, [isLinkAvailable]);

  // Automatically flush queued offline records when connectivity restores
  useEffect(() => {
    if (isLinkAvailable) {
      void syncPendingLogs();
    }
  }, [isLinkAvailable, syncPendingLogs]);

  const logVitalsOfflineAware = useCallback(
    async (payload: {
      missionDayLabel: string;
      environmentId: MissionEnvironmentId;
      scenarioId: ScenarioId;
      readings: BiomarkerReading;
      notes: string;
    }) => {
      const entry: OfflineTelemetryEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        loggedAtIso: new Date().toISOString(),
        missionDayLabel: payload.missionDayLabel,
        environmentId: payload.environmentId,
        scenarioId: payload.scenarioId,
        readings: payload.readings,
        notes: payload.notes,
        syncStatus: isLinkAvailable ? 'synced' : 'pending',
        syncedAtIso: isLinkAvailable ? new Date().toISOString() : undefined,
      };
      await appendTelemetryLog(entry);
      const updated = await listTelemetryLogs();
      setLogs(updated);
      if (isLinkAvailable) {
        setLastSyncedAtIso(new Date().toISOString());
      }
      return entry;
    },
    [isLinkAvailable]
  );

  const pendingCount = logs.filter((l) => l.syncStatus === 'pending').length;

  return {
    browserOnline,
    isLinkAvailable,
    logs,
    pendingCount,
    isSyncing,
    lastSyncedAtIso,
    logVitalsOfflineAware,
    syncPendingLogs,
    refreshLogs,
  };
}
