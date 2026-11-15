import { emailActionToken } from './email-action-token';

describe('emailActionToken', () => {
  it('accepts a bare token or extracts a token without using the URL as an endpoint', () => {
    expect(emailActionToken(' Ab9_2- ', 'verify-account')).toBe('Ab9_2-');
    expect(emailActionToken('https://example.test/reset-password?token=Ab9_2-', 'reset-password')).toBe('Ab9_2-');
  });

  it.each([
    'https://example.test/verify-account?token=abc',
    'https://example.test/reset-password?token=abc&token=def',
    'https://example.test/reset-password?token=%3Cscript%3E',
    'javascript:alert(1)',
    'https://user@example.test/reset-password?token=abc',
  ])('rejects an unrelated or malformed input (%s)', (input) => {
    expect(emailActionToken(input, 'reset-password')).toBeNull();
  });
});
