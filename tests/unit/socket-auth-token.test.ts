import { describe, expect, it } from 'vitest';
import {
  signSocketAuthToken,
  verifySocketAuthToken,
} from '../../lib/socket-auth-token';

describe('socket auth token', () => {
  it('verifies valid signed token', () => {
    const token = signSocketAuthToken('user_1', 'secret123', 120);
    expect(verifySocketAuthToken(token, 'secret123')).toBe('user_1');
  });

  it('rejects tampered token', () => {
    const token = signSocketAuthToken('user_1', 'secret123', 120);
    const tampered = `${token}x`;
    expect(verifySocketAuthToken(tampered, 'secret123')).toBeNull();
  });

  it('rejects expired token', async () => {
    const token = signSocketAuthToken('user_1', 'secret123', 1);
    await new Promise((r) => setTimeout(r, 1200));
    expect(verifySocketAuthToken(token, 'secret123')).toBeNull();
  });
});
