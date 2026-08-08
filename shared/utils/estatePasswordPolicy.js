/**
 * Shared weak-password checks for Estate Vault PR signup and admin PIN rotation.
 * Client mirror of server common-password rejection (F-06).
 */

export const COMMON_ESTATE_PASSWORDS = [
  '123456',
  '12345678',
  '000000',
  '111111',
  '654321',
  '777777',
  '123123',
  '121212',
  '112233',
  'password',
  'password1',
  'abc123',
  'abc12345',
  'qwerty',
  'qwerty12'
];

export function isCommonEstatePassword(value) {
  return COMMON_ESTATE_PASSWORDS.includes(String(value || '').trim().toLowerCase());
}

export function commonEstatePasswordMessage() {
  return 'That password is too common. Choose something only you would know.';
}
