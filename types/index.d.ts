export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'test' | 'production';

      // Auth/app URLs
      BETTER_AUTH_URL?: string;
      BETTER_AUTH_URL_LOCAL?: string;
      BETTER_AUTH_TUNNEL_URL?: string;
      BETTER_AUTH_SECRET?: string;
      NEXT_PUBLIC_APP_URL?: string;
      NEXT_PUBLIC_APP_URL_LOCAL?: string;
      NEXT_PUBLIC_APP_TUNNEL_URL?: string;

      // Realtime/socket
      NEXT_PUBLIC_SOCKET_URL?: string;
      NEXT_PUBLIC_SOCKET_URL_LOCAL?: string;
      NEXT_PUBLIC_SOCKET_TUNNEL_URL?: string;

      // Feature flags / behavior toggles
      AUTH_USE_TUNNEL?: '0' | '1' | 'true' | 'false' | 'yes' | 'no';
      AUTH_USE_REDIS_SECONDARY?: 'true' | 'false';
      AUTH_USE_REDIS_RATELIMIT?: 'true' | 'false';

      // OAuth providers
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      GITHUB_CLIENT_ID?: string;
      GITHUB_CLIENT_SECRET?: string;

      // Data stores
      DATABASE_URL?: string;
      PRISMA_DATABASE_URL?: string;
      UPSTASH_REDIS_URL?: string;
      UPSTASH_REDIS_TOKEN?: string;
      UPSTASH_REDIS_REST_URL?: string;
      UPSTASH_REDIS_REST_TOKEN?: string;

      // Frontend assets/config
      NEXT_PUBLIC_SOUNDS_BASE_URL?: string;
      NEXT_PUBLIC_RTC_ICE_SERVERS_JSON?: string;

      // Observability
      OBS_ENABLED?: 'true' | 'false';
      OTEL_EXPORTER_OTLP_ENDPOINT?: string;
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
      OTEL_EXPORTER_OTLP_HEADERS?: string;
      GRAFANA_OTLP_ENDPOINT?: string;
      GRAFANA_OTLP_AUTH?: string;
      GRAFANA_LOKI_ENDPOINT?: string;
      GRAFANA_LOKI_USER?: string;
      GRAFANA_LOKI_API_KEY?: string;
    }
  }
}
