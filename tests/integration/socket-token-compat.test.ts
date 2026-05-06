import { describe, expect, it } from 'vitest';
import { signSocketAuthToken } from '../../lib/socket-auth-token';
import { verifySocketAuthToken as verifyOnServer } from '../../server/src/socket-auth-token';

describe('socket token compatibility (app -> server)', () => {
  it('server verifies tokens signed by app', () => {
    const secret = 'shared-secret';
    const token = signSocketAuthToken('user_compat', secret, 60);
    expect(verifyOnServer(token, secret)).toBe('user_compat');
  });

  it('fails with mismatched secret', () => {
    const token = signSocketAuthToken('user_compat', 'secret-a', 60);
    expect(verifyOnServer(token, 'secret-b')).toBeNull();
  });
});
