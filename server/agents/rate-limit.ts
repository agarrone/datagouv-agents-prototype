import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";

const LIMITS = {
  // Un tour utilisateur peut produire jusqu'à cinq requêtes techniques lors
  // des reprises après tools. Ces seuils restent donc volontairement hauts.
  sessionPerHour: 300,
  sessionPerDay: 1_500,
  ipPerHour: 1_500,
  ipPerDay: 5_000,
  concurrentPerSession: 2,
  concurrentGlobal: 8,
  queueTimeoutMs: 30_000,
  retentionMs: 48 * 60 * 60 * 1_000,
} as const;

const FEEDBACK_LIMITS = {
  sessionPerHour: 60,
  ipPerHour: 240,
} as const;

type Counter = { count: number; expiresAt: number };
type QueueEntry = {
  resolve: () => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

const counters = new Map<string, Counter>();
const sessionConcurrency = new Map<string, number>();
const queue: QueueEntry[] = [];
let globalConcurrency = 0;
let generatedFallbackSecret: string | undefined;
let requestCount = 0;

function configNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : undefined;
}

function secret() {
  const config = useRuntimeConfig();
  const configured = config.rateLimitSecret || process.env.RATE_LIMIT_SECRET || config.albertApiKey || process.env.ALBERT_API_KEY;
  generatedFallbackSecret ??= randomBytes(32).toString("hex");
  return configured || generatedFallbackSecret;
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function sessionId(event: H3Event) {
  const cookie = getCookie(event, "datagouv_agent_session");
  if (cookie) {
    const separator = cookie.lastIndexOf(".");
    const id = cookie.slice(0, separator);
    const supplied = cookie.slice(separator + 1);
    const expected = signature(id);
    if (id && supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      return id;
    }
  }

  const id = crypto.randomUUID();
  setCookie(event, "datagouv_agent_session", `${id}.${signature(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 48 * 60 * 60,
  });
  return id;
}

function temporaryIpFingerprint(event: H3Event, now: number) {
  const day = new Date(now).toISOString().slice(0, 10);
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  return createHmac("sha256", secret()).update(`${day}:${ip}`).digest("base64url");
}

function windowKey(prefix: string, identity: string, durationMs: number, now: number) {
  return `${prefix}:${identity}:${Math.floor(now / durationMs)}`;
}

function consume(key: string, limit: number, durationMs: number, now: number) {
  const existing = counters.get(key);
  const counter = existing && existing.expiresAt > now
    ? existing
    : { count: 0, expiresAt: now + Math.min(durationMs, LIMITS.retentionMs) };
  if (counter.count >= limit) return false;
  counter.count += 1;
  counters.set(key, counter);
  return true;
}

function rateLimitError(code: "prototype_rate_limit" | "prototype_global_budget" | "prototype_queue_timeout", retryAfterSeconds: number, details: string) {
  return createError({
    statusCode: 429,
    statusMessage: code === "prototype_global_budget"
      ? "Le quota partagé du prototype est temporairement atteint."
      : code === "prototype_queue_timeout"
        ? "Le prototype reçoit beaucoup de demandes."
        : "Trop de demandes ont été envoyées.",
    data: {
      code,
      source: "prototype",
      retryable: true,
      retryAfterSeconds,
      technicalDetails: details,
    },
  });
}

function cleanup(now: number) {
  requestCount += 1;
  if (requestCount % 100 !== 0) return;
  for (const [key, counter] of counters) {
    if (counter.expiresAt <= now) counters.delete(key);
  }
}

function releaseSlot(session: string) {
  globalConcurrency = Math.max(0, globalConcurrency - 1);
  const current = sessionConcurrency.get(session) ?? 1;
  if (current <= 1) sessionConcurrency.delete(session);
  else sessionConcurrency.set(session, current - 1);

  const next = queue.shift();
  if (!next) return;
  clearTimeout(next.timer);
  next.resolve();
}

async function waitForGlobalSlot() {
  if (globalConcurrency < LIMITS.concurrentGlobal) return;
  await new Promise<void>((resolve, reject) => {
    const entry: QueueEntry = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = queue.indexOf(entry);
        if (index >= 0) queue.splice(index, 1);
        reject(rateLimitError("prototype_queue_timeout", 15, "La file d’attente locale a dépassé 30 secondes."));
      }, LIMITS.queueTimeoutMs),
    };
    queue.push(entry);
  });
}

export async function acquireAgentCapacity(event: H3Event) {
  const now = Date.now();
  cleanup(now);
  const session = sessionId(event);
  const ipFingerprint = temporaryIpFingerprint(event, now);
  const hour = 60 * 60 * 1_000;
  const day = 24 * hour;

  const checks = [
    [windowKey("session-hour", session, hour, now), LIMITS.sessionPerHour, hour],
    [windowKey("session-day", session, day, now), LIMITS.sessionPerDay, day],
    [windowKey("ip-hour", ipFingerprint, hour, now), LIMITS.ipPerHour, hour],
    [windowKey("ip-day", ipFingerprint, day, now), LIMITS.ipPerDay, day],
  ] as const;
  for (const [key, limit, duration] of checks) {
    if (!consume(key, limit, duration, now)) {
      throw rateLimitError("prototype_rate_limit", Math.ceil(duration / 1_000), `Limite locale atteinte pour ${key.split(":", 1)[0]}.`);
    }
  }

  const dailyQuota = configNumber(useRuntimeConfig().albertDailyRequestLimit || process.env.ALBERT_DAILY_REQUEST_LIMIT);
  if (dailyQuota) {
    const applicationBudget = Math.max(1, Math.floor(dailyQuota * 0.8));
    if (!consume(windowKey("global-day", "albert", day, now), applicationBudget, day, now)) {
      throw rateLimitError("prototype_global_budget", Math.ceil(day / 1_000), "Le plafond applicatif de 80 % du quota Albert est atteint.");
    }
  }

  if ((sessionConcurrency.get(session) ?? 0) >= LIMITS.concurrentPerSession) {
    throw rateLimitError("prototype_rate_limit", 5, "Deux réponses sont déjà en cours pour cette session.");
  }

  await waitForGlobalSlot();
  if ((sessionConcurrency.get(session) ?? 0) >= LIMITS.concurrentPerSession) {
    throw rateLimitError("prototype_rate_limit", 5, "Deux réponses sont déjà en cours pour cette session.");
  }
  globalConcurrency += 1;
  sessionConcurrency.set(session, (sessionConcurrency.get(session) ?? 0) + 1);
  setResponseHeader(event, "x-agent-queue", "ready");

  let released = false;
  const leaseTimer = setTimeout(() => release(), 4 * 60 * 1_000);
  function release() {
    if (released) return;
    released = true;
    clearTimeout(leaseTimer);
    releaseSlot(session);
  }
  return {
    release,
  };
}

/**
 * Protège l’endpoint public de feedback sans décompter une requête Albert ni
 * occuper un emplacement de génération. Les seuils autorisent largement un
 * usage humain normal tout en freinant les envois automatisés.
 */
export function enforceFeedbackRateLimit(event: H3Event) {
  const now = Date.now();
  cleanup(now);
  const session = sessionId(event);
  const ipFingerprint = temporaryIpFingerprint(event, now);
  const hour = 60 * 60 * 1_000;
  const checks = [
    [windowKey("feedback-session-hour", session, hour, now), FEEDBACK_LIMITS.sessionPerHour],
    [windowKey("feedback-ip-hour", ipFingerprint, hour, now), FEEDBACK_LIMITS.ipPerHour],
  ] as const;

  for (const [key, limit] of checks) {
    if (consume(key, limit, hour, now)) continue;
    setResponseHeader(event, "retry-after", 3600);
    throw createError({
      statusCode: 429,
      statusMessage: "Trop de retours ont été envoyés. Réessayez plus tard.",
    });
  }
}
