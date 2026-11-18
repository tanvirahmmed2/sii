import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.TENANT_GATEWAY_ENCRYPTION_KEY || process.env.JWT_SECRET || 'tenant-secure-gateway-salt-key-enterprise-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

export function isEncryptedEnvelope(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value.__encrypted === true &&
    typeof value.ciphertext === 'string' &&
    typeof value.iv === 'string' &&
    typeof value.tag === 'string'
  );
}

export function encryptCredentials(plainObject) {
  if (!plainObject || typeof plainObject !== 'object') {
    return plainObject;
  }
  if (isEncryptedEnvelope(plainObject)) {
    return plainObject;
  }
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const text = JSON.stringify(plainObject);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    __encrypted: true,
    version: 1,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex')
  };
}

export function decryptCredentials(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return {};
  }
  if (!isEncryptedEnvelope(envelope)) {
    return { ...envelope };
  }
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(envelope.iv, 'hex');
    const tag = Buffer.from(envelope.tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'hex')),
      decipher.final()
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    return {};
  }
}

export function maskSecretValue(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (str.length <= 6) return '••••••';
  return str.slice(0, 3) + '••••••••••••' + str.slice(-3);
}

export function maskCredentials(credentials = {}, schema = []) {
  const plain = isEncryptedEnvelope(credentials) ? decryptCredentials(credentials) : (credentials || {});
  const masked = { ...plain };

  const secretFieldKeys = new Set([
    'app_key', 'app_secret', 'secret_key', 'password', 'merchant_private_key',
    'nagad_public_key', 'store_passwd', 'api_key', 'hash_secret',
    'merchant_password', 'webhook_secret', 'client_secret', 'key_secret',
    'hash_key'
  ]);

  let parsedSchema = schema;
  if (typeof schema === 'string') {
    try {
      parsedSchema = JSON.parse(schema);
    } catch {
      parsedSchema = [];
    }
  }

  if (Array.isArray(parsedSchema)) {
    parsedSchema.forEach(field => {
      if (field && field.secret && field.key) {
        secretFieldKeys.add(field.key);
      }
    });
  }

  for (const [key, val] of Object.entries(masked)) {
    if (secretFieldKeys.has(key) && val) {
      masked[key] = maskSecretValue(val);
      masked[`${key}_is_masked`] = true;
    }
  }

  return masked;
}

export function mergeCredentials(existing = {}, incoming = {}) {
  const base = isEncryptedEnvelope(existing) ? decryptCredentials(existing) : (existing || {});
  const merged = { ...base };

  for (const [key, val] of Object.entries(incoming || {})) {
    if (key.endsWith('_is_masked')) continue;
    if (typeof val === 'string' && val.includes('••••')) {
      continue;
    }
    if (val !== undefined && val !== null) {
      const trimmed = typeof val === 'string' ? val.trim() : val;
      if (trimmed === '' && base[key]) {
        continue;
      }
      merged[key] = trimmed;
    }
  }
  return merged;
}
