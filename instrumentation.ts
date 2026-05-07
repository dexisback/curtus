let started = false;

export async function register() {
  if (started) return;
  if (process.env.OBS_ENABLED === 'false') return;
  if (process.env.NEXT_RUNTIME === 'edge') return;

  const [{ NodeSDK }, { getNodeAutoInstrumentations }, { OTLPTraceExporter }] =
    await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/exporter-trace-otlp-http'),
    ]);

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
  started = true;
}
