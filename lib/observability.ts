import {
  SpanStatusCode,
  context,
  propagation,
  trace,
  type Attributes,
  type Tracer,
} from '@opentelemetry/api';

const tracerName = 'ss-provider-web';
const tracerVersion = process.env.npm_package_version ?? 'unknown';

let cachedTracer: Tracer | null = null;

export function getWebTracer(): Tracer {
  if (!cachedTracer) {
    cachedTracer = trace.getTracer(tracerName, tracerVersion);
  }
  return cachedTracer;
}

export function extractTraceContextFromRequest(req: Request) {
  const carrier: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    carrier[key] = value;
  });
  return propagation.extract(context.active(), carrier);
}

export async function withObservedSpan<T>(
  spanName: string,
  attrs: Attributes,
  fn: () => Promise<T>,
  ctx = context.active(),
): Promise<T> {
  const tracer = getWebTracer();
  return tracer.startActiveSpan(
    spanName,
    { attributes: attrs },
    ctx,
    async (span) => {
      const started = Date.now();
      try {
        const result = await fn();
        span.setAttribute('duration_ms', Date.now() - started);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(
          error instanceof Error ? error : new Error(String(error)),
        );
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}
