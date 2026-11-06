import fs from "fs";
import path from "path";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "AUDIT" | "SECURITY";

export interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  tenantId?: string | null;
  userId?: string | null;
  path?: string | null;
  ip?: string | null;
  meta?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

// In Next.js/Node runtime, store logs in logs/ directory
const LOGS_DIR = path.join(process.cwd(), "logs");

function ensureLogsDir() {
  if (typeof window === "undefined") {
    try {
      if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
      }
    } catch (_) {}
  }
}

function writeToFile(filename: string, entry: string) {
  if (typeof window === "undefined") {
    try {
      ensureLogsDir();
      const filePath = path.join(LOGS_DIR, filename);
      fs.appendFileSync(filePath, entry + "\n", "utf8");
    } catch (e) {
      console.error("[Logger File Write Error]:", e);
    }
  }
}

class EnterpriseLogger {
  private formatLog(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>,
    err?: unknown
  ): LogPayload {
    const errorObj =
      err instanceof Error
        ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
        : err
        ? { message: String(err) }
        : undefined;

    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      tenantId: meta?.tenantId || null,
      userId: meta?.userId || null,
      path: meta?.path || null,
      ip: meta?.ip || null,
      meta,
      error: errorObj,
    };
  }

  private dispatch(payload: LogPayload) {
    const jsonStr = JSON.stringify(payload);
    const datePrefix = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Console Output with color cues
    const colorTag =
      payload.level === "ERROR"
        ? "\x1b[31m[ERROR]\x1b[0m"
        : payload.level === "WARN"
        ? "\x1b[33m[WARN]\x1b[0m"
        : payload.level === "AUDIT"
        ? "\x1b[35m[AUDIT]\x1b[0m"
        : payload.level === "SECURITY"
        ? "\x1b[41m\x1b[37m[SECURITY]\x1b[0m"
        : "\x1b[36m[INFO]\x1b[0m";

    console.log(
      `${colorTag} [${payload.timestamp}] ${payload.message}${
        payload.tenantId ? ` [Tenant: ${payload.tenantId}]` : ""
      }${payload.error ? ` - Error: ${payload.error.message}` : ""}`
    );

    // 2. Persistent Daily File Logs
    writeToFile(`app-${datePrefix}.log`, jsonStr);

    if (payload.level === "ERROR" || payload.level === "SECURITY") {
      writeToFile(`error-${datePrefix}.log`, jsonStr);
    }

    if (payload.level === "AUDIT") {
      writeToFile(`audit-${datePrefix}.log`, jsonStr);
    }
  }

  info(message: string, meta?: Record<string, any>) {
    this.dispatch(this.formatLog("INFO", message, meta));
  }

  warn(message: string, meta?: Record<string, any>) {
    this.dispatch(this.formatLog("WARN", message, meta));
  }

  error(message: string, err?: unknown, meta?: Record<string, any>) {
    this.dispatch(this.formatLog("ERROR", message, meta, err));
  }

  audit(action: string, meta: { userId?: string; tenantId?: string; targetId?: string; details?: any }) {
    this.dispatch(
      this.formatLog("AUDIT", `Audit: ${action}`, {
        ...meta,
        action,
      })
    );
  }

  security(event: string, meta?: Record<string, any>) {
    this.dispatch(this.formatLog("SECURITY", `Security Alert: ${event}`, meta));
  }

  whatsapp(event: string, meta?: Record<string, any>) {
    const payload = this.formatLog("INFO", `[WhatsApp Gateway]: ${event}`, meta);
    const datePrefix = new Date().toISOString().split("T")[0];
    this.dispatch(payload);
    writeToFile(`whatsapp-${datePrefix}.log`, JSON.stringify(payload));
  }
}

export const logger = new EnterpriseLogger();
