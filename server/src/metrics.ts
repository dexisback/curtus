import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

const register = new Registry();

collectDefaultMetrics({ register, prefix: 'ss_provider_' });

export const socketConnectionsTotal = new Counter({
  name: 'socket_connections_total',
  help: 'Total Socket.IO connections accepted',
  registers: [register],
});

export const socketReconnectsTotal = new Counter({
  name: 'socket_reconnects_total',
  help: 'Total reconnects seen by same user in short window',
  registers: [register],
});

export const roomJoinFailuresTotal = new Counter({
  name: 'room_join_failures_total',
  help: 'Total room join failures',
  labelNames: ['reason'] as const,
  registers: [register],
});

export const redisErrorsTotal = new Counter({
  name: 'redis_errors_total',
  help: 'Total Redis operation errors',
  labelNames: ['operation'] as const,
  registers: [register],
});

export const socketActiveConnections = new Gauge({
  name: 'socket_active_connections',
  help: 'Current active Socket.IO connections',
  registers: [register],
});

export const roomsActive = new Gauge({
  name: 'rooms_active',
  help: 'Current count of rooms with at least one member socket',
  registers: [register],
});

export const roomJoinDurationMs = new Histogram({
  name: 'room_join_duration_ms',
  help: 'Room join handler duration in milliseconds',
  buckets: [10, 25, 50, 100, 200, 500, 1000, 2000],
  registers: [register],
});

export const eventProcessingDurationMs = new Histogram({
  name: 'event_processing_duration_ms',
  help: 'Socket event processing duration in milliseconds',
  labelNames: ['event_name'] as const,
  buckets: [5, 10, 25, 50, 100, 200, 500, 1000, 2000],
  registers: [register],
});

export const redisOpDurationMs = new Histogram({
  name: 'redis_op_duration_ms',
  help: 'Redis operation duration in milliseconds',
  labelNames: ['operation'] as const,
  buckets: [1, 5, 10, 20, 50, 100, 250, 500, 1000],
  registers: [register],
});

export async function renderMetrics() {
  return register.metrics();
}

export function metricsContentType() {
  return register.contentType;
}
