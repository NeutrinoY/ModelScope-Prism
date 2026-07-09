import { describe, expect, it } from 'vitest';
import { extractApiKey } from './api-security';

function requestWithAuth(authorization: string | null): Request {
  return new Request('http://localhost/api/test', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('api security helpers', () => {
  it('only accepts bearer authorization headers as API keys', () => {
    expect(extractApiKey(requestWithAuth('Bearer ms-token') as never)).toBe('ms-token');
    expect(extractApiKey(requestWithAuth('Basic abc') as never)).toBe('');
    expect(extractApiKey(requestWithAuth('ms-token-without-scheme') as never)).toBe('');
  });

  it('falls back to the request body API key when authorization is not bearer', () => {
    expect(extractApiKey(requestWithAuth('Basic abc') as never, 'ms-body-token')).toBe(
      'ms-body-token'
    );
  });
});
