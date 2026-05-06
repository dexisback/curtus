import { describe, expect, it } from 'vitest';
import {
  authUseTunnel,
  buildTrustedAuthOrigins,
  effectiveBetterAuthUrl,
} from '../../lib/auth-urls';
import { withEnv } from '../helpers/env';

describe('auth URL resolution', () => {
  it('prefers BETTER_AUTH_URL in production', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://app.example.com',
        BETTER_AUTH_URL_LOCAL: 'http://localhost:3000',
        AUTH_USE_TUNNEL: '1',
        BETTER_AUTH_TUNNEL_URL: 'https://tunnel.example.com',
      },
      () => {
        expect(effectiveBetterAuthUrl()).toBe('https://app.example.com');
      },
    );
  });

  it('uses tunnel URL when enabled outside production', async () => {
    await withEnv(
      {
        NODE_ENV: 'development',
        AUTH_USE_TUNNEL: 'true',
        BETTER_AUTH_TUNNEL_URL: 'https://tunnel.example.com/',
      },
      () => {
        expect(authUseTunnel()).toBe(true);
        expect(effectiveBetterAuthUrl()).toBe('https://tunnel.example.com');
      },
    );
  });

  it('buildTrustedAuthOrigins includes wildcard in production', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://app.example.com',
      },
      () => {
        const origins = buildTrustedAuthOrigins();
        expect(origins).toContain('https://app.example.com');
        expect(origins).toContain('https://*.vercel.app');
      },
    );
  });
});
