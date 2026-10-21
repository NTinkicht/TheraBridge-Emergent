// Small bundled deny-list (12+ characters; shorter ones already fail the length rule). Lower-case.
export const COMMON_PASSWORDS = new Set([
  'password1234', 'password12345', 'password123456', 'password123!', 'passwordpassword', 'password1234!',
  '123456789012', '1234567890123', '12345678901234', '111111111111', '000000000000', '123123123123',
  'qwertyuiopas', 'qwerty123456', 'qwertyqwerty', '1q2w3e4r5t6y', 'asdfghjklzxc', 'zxcvbnmasdfg',
  'iloveyou1234', 'welcome12345', 'welcome123456', 'letmein12345', 'changeme1234', 'changeme12345',
  'administrator', 'administrator1', 'admin1234567', 'abc123456789', 'aaaaaaaaaaaa', 'abcdefghijkl',
  'therabridge1', 'therabridge123', 'therabridge2026', 'sunshine1234', 'football1234', 'baseball1234',
  'princess1234', 'monkey123456', 'dragon123456', 'superman1234', 'trustno11234', 'master123456',
]);
