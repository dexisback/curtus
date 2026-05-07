import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import {
  SpanStatusCode,
  trace,
  type Attributes,
  type Tracer,
} from '@opentelemetry/api';

let sdkStarted = false;
let tracer: Tracer | null = null;

export async function initServerObservability() {
  if (sdkStarted) return;
  if (process.env.OBS_ENABLED === 'false') return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const tracesEndpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    (endpoint ? `${endpoint.replace(/\/$/, '')}/v1/traces` : undefined);

  if (!tracesEndpoint) return;

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: tracesEndpoint }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
  sdkStarted = true;
}

export function getServerTracer() {
  if (!tracer) {
    tracer = trace.getTracer(
      'ss-provider-socket',
      process.env.npm_package_version ?? 'unknown',
    );
  }
  return tracer;
}

export async function withSocketSpan<T>(
  spanName: string,
  attrs: Attributes,
  fn: () => Promise<T>,
): Promise<T> {
  const localTracer = getServerTracer();
  return localTracer.startActiveSpan(
    spanName,
    { attributes: attrs },
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
