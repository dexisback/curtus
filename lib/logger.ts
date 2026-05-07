import { trace } from '@opentelemetry/api';

type Level = 'debug' | 'info' | 'warn' | 'error';

export interface LogMeta {
  service?: string;
  env?: string;
  version?: string;
  request_id?: string;
  trace_id?: string;
  span_id?: string;
  user_id_hash?: string;
  room_id?: string;
  event_name?: string;
  route?: string;
  duration_ms?: number;
  error_code?: string;
  [key: string]: unknown;
}

const DEFAULT_META = {
  service: 'ss-provider-web',
  env: process.env.NODE_ENV ?? 'development',
  version: process.env.npm_package_version ?? 'unknown',
} as const;

function resolveTraceMeta(
  meta?: LogMeta,
): Pick<LogMeta, 'trace_id' | 'span_id'> {
  if (meta?.trace_id || meta?.span_id) {
    return { trace_id: meta.trace_id, span_id: meta.span_id };
  }
  const span = trace.getActiveSpan();
  if (!span) return {};
  const spanContext = span.spanContext();
  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
  };
}

function emit(level: Level, message: string, meta?: LogMeta) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...DEFAULT_META,
    ...resolveTraceMeta(meta),
    ...meta,
  });
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

function createLogger(bound?: LogMeta) {
  const withBound = (meta?: LogMeta) => (bound ? { ...bound, ...meta } : meta);
  return {
    debug: (message: string, meta?: LogMeta) =>
      emit('debug', message, withBound(meta)),
    info: (message: string, meta?: LogMeta) =>
      emit('info', message, withBound(meta)),
    warn: (message: string, meta?: LogMeta) =>
      emit('warn', message, withBound(meta)),
    error: (message: string, meta?: LogMeta) =>
      emit('error', message, withBound(meta)),
    child: (nextBound: LogMeta) => createLogger(withBound(nextBound)),
  };
}

export const logger = createLogger();
