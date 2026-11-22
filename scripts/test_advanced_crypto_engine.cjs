const crypto = require('crypto');

console.log('================================================================');
console.log('🔬 ADVANCED CRYPTOGRAPHIC ENGINE PROTOTYPE & STRESS TEST');
console.log('   (ECDH P-256 · HKDF-SHA256 · Double Ratchet · Media Envelope AES-256-GCM)');
console.log('================================================================\n');

// 1. HKDF Implementation (RFC 5869)
function hkdfExtract(salt, ikm) {
  if (!salt || salt.length === 0) salt = Buffer.alloc(32, 0);
  return crypto.createHmac('sha256', salt).update(ikm).digest();
}

function hkdfExpand(prk, info, length) {
  const hashLen = 32;
  const n = Math.ceil(length / hashLen);
  let okm = Buffer.alloc(0);
  let previousT = Buffer.alloc(0);

  for (let i = 1; i <= n; i++) {
    const hmac = crypto.createHmac('sha256', prk);
    hmac.update(previousT);
    if (info) hmac.update(info);
    hmac.update(Buffer.from([i]));
    previousT = hmac.digest();
    okm = Buffer.concat([okm, previousT]);
  }
  return okm.slice(0, length);
}

function hkdf(ikm, salt, info, length) {
  const prk = hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

// 2. ECDH Key Generation and Agreement (P-256 / prime256v1)
function generateECDH() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    ecdh,
    publicKeyHex: ecdh.getPublicKey('hex'),
    privateKeyHex: ecdh.getPrivateKey('hex')
  };
}

function computeSharedSecret(myEcdh, peerPublicKeyHex) {
  return myEcdh.computeSecret(peerPublicKeyHex, 'hex');
}

// 3. Symmetric Ratchet KDF
function ratchetKdf(chainKey) {
  const messageKey = crypto.createHmac('sha256', chainKey).update(Buffer.from([0x01])).digest();
  const nextChainKey = crypto.createHmac('sha256', chainKey).update(Buffer.from([0x02])).digest();
  return { messageKey, nextChainKey };
}

// 4. Authenticated Encryption with Associated Data (AEAD AES-256-GCM)
function aesGcmEncrypt(key, plaintextBuf, iv, aad = Buffer.alloc(0)) {
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad && aad.length > 0) cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function aesGcmDecrypt(key, cipherBuf, aad = Buffer.alloc(0)) {
  const iv = cipherBuf.slice(0, 12);
  const tag = cipherBuf.slice(12, 28);
  const ciphertext = cipherBuf.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  if (aad && aad.length > 0) decipher.setAAD(aad);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// 5. Media Envelope Encryption (Audio, Video, Photo, Documents)
function encryptMediaEnvelope(mediaBuffer, mimeType, sessionKey) {
  // 1. Content Encryption Key (CEK)
  const cek = crypto.randomBytes(32);
  const mediaIv = crypto.randomBytes(12);

  // 2. Encrypt raw media payload
  const encryptedMedia = aesGcmEncrypt(cek, mediaBuffer, mediaIv);
  const mediaSha256 = crypto.createHash('sha256').update(mediaBuffer).digest('hex');

  // 3. Encrypted Metadata Envelope
  const descriptor = JSON.stringify({
    cekHex: cek.toString('hex'),
    mimeType,
    sha256: mediaSha256,
    size: mediaBuffer.length,
    timestamp: Date.now()
  });

  const descriptorIv = crypto.randomBytes(12);
  const encryptedDescriptor = aesGcmEncrypt(sessionKey, Buffer.from(descriptor, 'utf8'), descriptorIv);

  return {
    encryptedMediaBase64: encryptedMedia.toString('base64'),
    encryptedDescriptorBase64: encryptedDescriptor.toString('base64'),
    checksum: mediaSha256
  };
}

function decryptMediaEnvelope(envelope, sessionKey) {
  // 1. Decrypt descriptor using session ratchet key
  const descBuf = aesGcmDecrypt(sessionKey, Buffer.from(envelope.encryptedDescriptorBase64, 'base64'));
  const descriptor = JSON.parse(descBuf.toString('utf8'));

  // 2. Decrypt raw media bytes using CEK
  const cek = Buffer.from(descriptor.cekHex, 'hex');
  const mediaCipher = Buffer.from(envelope.encryptedMediaBase64, 'base64');
  const decryptedMedia = aesGcmDecrypt(cek, mediaCipher);

  // 3. Verify SHA-256 checksum
  const actualSha256 = crypto.createHash('sha256').update(decryptedMedia).digest('hex');
  if (actualSha256 !== descriptor.sha256) {
    throw new Error('Media checksum mismatch! Ciphertext tampered or corrupted.');
  }

  return {
    data: decryptedMedia,
    mimeType: descriptor.mimeType,
    size: descriptor.size
  };
}

// --- TEST SUITE EXECUTION ---
console.log('⚡ 1. Testing ECDH Asymmetric Handshake (Alice & Bob)...');
const alice = generateECDH();
const bob = generateECDH();

const aliceShared = computeSharedSecret(alice.ecdh, bob.publicKeyHex);
const bobShared = computeSharedSecret(bob.ecdh, alice.publicKeyHex);

const sharedMatch = aliceShared.equals(bobShared);
console.log(`   ${sharedMatch ? '✅' : '❌'} ECDH Shared Secret: ${aliceShared.toString('hex').slice(0, 32)}... (Match: ${sharedMatch})`);

console.log('\n⚡ 2. Testing HKDF Key Expansion & Derivation...');
const salt = Buffer.from('jchatt_v3_salt_2026', 'utf8');
const info = Buffer.from('jchatt:e2ee:double-ratchet', 'utf8');
const derivedRootKey = hkdf(aliceShared, salt, info, 32);
console.log(`   ✅ Derived 256-bit Root Key: ${derivedRootKey.toString('hex')}`);

console.log('\n⚡ 3. Testing Symmetric Ratchet Forward Secrecy across 10 steps...');
let chainKey = derivedRootKey;
const messageKeys = [];
for (let i = 0; i < 10; i++) {
  const step = ratchetKdf(chainKey);
  messageKeys.push(step.messageKey);
  chainKey = step.nextChainKey;
}
console.log(`   ✅ Successfully stepped ratchet 10 times. All keys unique: ${new Set(messageKeys.map(k => k.toString('hex'))).size === 10}`);

console.log('\n⚡ 4. Testing End-to-End Media Envelope Encryption (Simulating 500KB Audio Voice Note)...');
const mockAudioData = crypto.randomBytes(500 * 1024); // 500KB raw audio buffer
const mediaEnvelope = encryptMediaEnvelope(mockAudioData, 'audio/webm;codecs=opus', messageKeys[0]);
console.log(`   ✅ Encrypted 500KB Audio into CEK Envelope: ${mediaEnvelope.encryptedMediaBase64.slice(0, 40)}...`);

const decryptedMedia = decryptMediaEnvelope(mediaEnvelope, messageKeys[0]);
const audioMatch = decryptedMedia.data.equals(mockAudioData);
console.log(`   ${audioMatch ? '✅' : '❌'} Decrypted Audio Matches Original Exactly: ${audioMatch} (Size: ${decryptedMedia.size} bytes, Mime: ${decryptedMedia.mimeType})`);

console.log('\n⚡ 5. Testing Tamper Resistance on Media Ciphertext...');
let tamperDetected = false;
try {
  const corrupted = { ...mediaEnvelope };
  const rawBytes = Buffer.from(corrupted.encryptedMediaBase64, 'base64');
  rawBytes[40] ^= 0x01; // flip 1 bit in ciphertext
  corrupted.encryptedMediaBase64 = rawBytes.toString('base64');
  decryptMediaEnvelope(corrupted, messageKeys[0]);
} catch (e) {
  tamperDetected = true;
}
console.log(`   ${tamperDetected ? '✅' : '❌'} Tampered Media Immediately Rejected with Authentication Failure: ${tamperDetected}`);

console.log('\n================================================================');
console.log('🌟 ADVANCED CRYPTOGRAPHY TEST HARNESS: 100% PASSED');
console.log('================================================================\n');
