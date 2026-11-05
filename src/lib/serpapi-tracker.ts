import { db } from "@/src/lib/firebase-admin";

export const MAX_DAILY_SERPAPI_CALLS = 4;

export interface SerpApiCallRecord {
  timestamp: string;
  bucketId: string;
  query: string;
  resultsCount: number;
}

export interface SerpApiDailyUsage {
  date: string; // YYYY-MM-DD
  callsCount: number;
  maxLimit: number;
  calls: SerpApiCallRecord[];
  updatedAt: string;
}

/**
 * Returns today's date string in YYYY-MM-DD format (IST / UTC safe)
 */
export function getTodayDateString(): string {
  // Use Indian Standard Time (UTC+5:30) for daily calendar boundary
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().slice(0, 10);
}

/**
 * Checks whether a SerpAPI call is allowed under the strict 4 calls/day quota.
 */
export async function checkDailySerpApiQuota(dateStr?: string): Promise<{
  canProceed: boolean;
  callsMade: number;
  maxAllowed: number;
  remaining: number;
}> {
  const date = dateStr || getTodayDateString();
  try {
    const docRef = db.collection("serpapi_usage_logs").doc(date);
    const snap = await docRef.get();

    if (!snap.exists) {
      return {
        canProceed: true,
        callsMade: 0,
        maxAllowed: MAX_DAILY_SERPAPI_CALLS,
        remaining: MAX_DAILY_SERPAPI_CALLS,
      };
    }

    const data = snap.data() as SerpApiDailyUsage;
    const callsMade = typeof data?.callsCount === "number" ? data.callsCount : 0;
    const remaining = Math.max(0, MAX_DAILY_SERPAPI_CALLS - callsMade);

    return {
      canProceed: callsMade < MAX_DAILY_SERPAPI_CALLS,
      callsMade,
      maxAllowed: MAX_DAILY_SERPAPI_CALLS,
      remaining,
    };
  } catch (err) {
    console.warn("[SerpAPI Tracker] Warning checking quota, proceeding conservatively:", err);
    return {
      canProceed: true,
      callsMade: 0,
      maxAllowed: MAX_DAILY_SERPAPI_CALLS,
      remaining: MAX_DAILY_SERPAPI_CALLS,
    };
  }
}

/**
 * Records an executed SerpAPI call to Firestore and increments daily call count.
 */
export async function recordSerpApiCallUsage(
  bucketId: string,
  query: string,
  resultsCount: number,
  dateStr?: string
): Promise<SerpApiDailyUsage> {
  const date = dateStr || getTodayDateString();
  const now = new Date().toISOString();
  const docRef = db.collection("serpapi_usage_logs").doc(date);

  try {
    const callEntry: SerpApiCallRecord = {
      timestamp: now,
      bucketId,
      query,
      resultsCount,
    };

    let updatedUsage: SerpApiDailyUsage;

    const snap = await docRef.get();
    if (!snap.exists) {
      updatedUsage = {
        date,
        callsCount: 1,
        maxLimit: MAX_DAILY_SERPAPI_CALLS,
        calls: [callEntry],
        updatedAt: now,
      };
      await docRef.set(updatedUsage);
    } else {
      const data = snap.data() as SerpApiDailyUsage;
      const currentCalls = Array.isArray(data.calls) ? data.calls : [];
      const newCount = (typeof data.callsCount === "number" ? data.callsCount : currentCalls.length) + 1;

      updatedUsage = {
        date,
        callsCount: newCount,
        maxLimit: MAX_DAILY_SERPAPI_CALLS,
        calls: [...currentCalls, callEntry],
        updatedAt: now,
      };
      await docRef.set(updatedUsage, { merge: true });
    }

    // Also write an audit log
    await db.collection("audit_logs").add({
      actorId: "SYSTEM",
      actorRole: "SERPAPI_TRACKER",
      action: "SERPAPI_CALL_RECORDED",
      entity: "SerpApiUsage",
      entityId: date,
      bucketId,
      callsToday: updatedUsage.callsCount,
      createdAt: now,
    });

    return updatedUsage;
  } catch (err) {
    console.error("[SerpAPI Tracker] Failed to record API call:", err);
    return {
      date,
      callsCount: 1,
      maxLimit: MAX_DAILY_SERPAPI_CALLS,
      calls: [],
      updatedAt: now,
    };
  }
}

/**
 * Gets today's SerpAPI usage summary
 */
export async function getDailySerpApiUsage(dateStr?: string): Promise<SerpApiDailyUsage> {
  const date = dateStr || getTodayDateString();
  const docRef = db.collection("serpapi_usage_logs").doc(date);
  const snap = await docRef.get();

  if (!snap.exists) {
    return {
      date,
      callsCount: 0,
      maxLimit: MAX_DAILY_SERPAPI_CALLS,
      calls: [],
      updatedAt: new Date().toISOString(),
    };
  }

  return snap.data() as SerpApiDailyUsage;
}

