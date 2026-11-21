const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateToken(length: number = 8): string {
  const len = typeof length === 'number' && length > 0 ? length : 8;
  let token = '';
  for (let i = 0; i < len; i++) {
    token += ALPHANUMERIC_CHARS.charAt(Math.floor(Math.random() * ALPHANUMERIC_CHARS.length));
  }
  return token;
}

export function generateRandomToken(length: number = 8): string {
  return generateToken(typeof length === 'number' ? length : 8);
}

export function generateRandomCode(min: number = 100000, max: number = 999999): string {
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

export function generateRandomHex(bytes: number = 16): string {
  const len = typeof bytes === 'number' && bytes > 0 ? bytes * 2 : 16;
  return generateToken(len);
}

const RandomUtils = {
  generateToken,
  generateRandomToken,
  generateRandomCode,
  generateRandomHex,
};

export default RandomUtils;
