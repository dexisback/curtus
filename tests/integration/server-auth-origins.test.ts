import { describe, expect, it } from 'vitest';
import { getSocketCorsOrigins } from '../../server/src/auth-urls';
import { withEnv } from '../helpers/env';

describe('server auth origins contract', () => {
  it('throws when no origins are configured', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        BETTER_AUTH_URL_LOCAL: undefined,
        BETTER_AUTH_TUNNEL_URL: undefined,
        NEXT_PUBLIC_APP_URL_LOCAL: undefined,
        NEXT_PUBLIC_APP_TUNNEL_URL: undefined,
        BETTER_AUTH_URL: undefined,
        NEXT_PUBLIC_APP_URL: undefined,
      },
      () => {
        expect(() => getSocketCorsOrigins()).toThrowError();
      },
    );
  });

  it('includes explicit production origin', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://ss-provider.vercel.app',
      },
      () => {
        const origins = getSocketCorsOrigins();
        expect(origins).toContain('https://ss-provider.vercel.app');
      },
    );
  });
});
