type Level = "debug" | "info" | "warn" | "error";

interface LogMeta {
  requestId?: string;
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

function emit(level: Level, message: string, meta?: LogMeta) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => emit("debug", message, meta),
  info: (message: string, meta?: LogMeta) => emit("info", message, meta),
  warn: (message: string, meta?: LogMeta) => emit("warn", message, meta),
  error: (message: string, meta?: LogMeta) => emit("error", message, meta),

  child(bound: LogMeta) {
    return {
      debug: (message: string, meta?: LogMeta) => emit("debug", message, { ...bound, ...meta }),
      info: (message: string, meta?: LogMeta) => emit("info", message, { ...bound, ...meta }),
      warn: (message: string, meta?: LogMeta) => emit("warn", message, { ...bound, ...meta }),
      error: (message: string, meta?: LogMeta) => emit("error", message, { ...bound, ...meta }),
    };
  },
};

// — logger.ts: JSON lines to stdout/stderr; child() binds request/route meta for API logs.

