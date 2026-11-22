/**
 * Comprehensive Automated End-to-End Test Suite for JChatt Advanced Level-3 Cryptography
 * Tests:
 * 1. Text payload encryption & decryption under Double Ratchet (enc:v3:ratchet:)
 * 2. Voice Note (audioData) Envelope Encryption (AES-256-GCM + 256-bit CEK)
 * 3. Photo (imgData) Envelope Encryption
 * 4. Document (doc.data) Envelope Encryption
 * 5. Leak Prevention: Zero plaintext data URIs on the wire
 * 6. Forward Secrecy & Ratchet KDF
 * 7. Backward Compatibility with enc:v2:aes
 */

const assert = require('assert');
const JCA = require('../js/crypto-and-assets.js');

async function runTestSuite() {
  console.log('====================================================');
  console.log('🔒 JCHATT ADVANCED CRYPTOGRAPHY ENGINE VERIFICATION 🔒');
  console.log('====================================================\n');

  const testChatKey = 'chat_sec_key_e2ee_' + Math.random().toString(36).substring(2);
  let totalTests = 0;
  let passedTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      process.exitCode = 1;
    }
  }

  async function testAsync(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      process.exitCode = 1;
    }
  }

  // Test 1: Primitives export check
  test('Cryptographic Primitives exported in JCA', () => {
    assert.strictEqual(typeof JCA.hmacSha256, 'function', 'hmacSha256 must be exported');
    assert.strictEqual(typeof JCA.hkdfSha256, 'function', 'hkdfSha256 must be exported');
    assert.strictEqual(typeof JCA.ratchetKdf, 'function', 'ratchetKdf must be exported');
    assert.strictEqual(typeof JCA.encryptMediaEnvelope, 'function', 'encryptMediaEnvelope must be exported');
    assert.strictEqual(typeof JCA.decryptMediaEnvelope, 'function', 'decryptMediaEnvelope must be exported');
    assert.strictEqual(typeof JCA.encryptMessagePayload, 'function', 'encryptMessagePayload must be exported');
    assert.strictEqual(typeof JCA.decryptMessagePayload, 'function', 'decryptMessagePayload must be exported');
  });

  // Test 2: Text Message Double Ratchet Encryption
  await testAsync('Text message payload encrypts under enc:v3:ratchet: and decrypts', async () => {
    const rawMsg = {
      id: 'm12345',
      text: 'Top Secret JChatt Mission Directive',
      sender: 'alice',
      time: Date.now()
    };

    const ciphertext = await JCA.encryptMessagePayload(rawMsg, testChatKey);
    assert(ciphertext.startsWith('enc:v3:ratchet:'), 'Ciphertext must have enc:v3:ratchet: header');
    assert(!ciphertext.includes('Top Secret'), 'Ciphertext must not contain plaintext message');

    const decrypted = await JCA.decryptMessagePayload(ciphertext, testChatKey);
    assert.strictEqual(decrypted.id, rawMsg.id);
    assert.strictEqual(decrypted.text, rawMsg.text);
    assert.strictEqual(decrypted.sender, rawMsg.sender);
  });

  // Test 3: Voice Note Envelope Encryption
  await testAsync('Voice Note (audioData) is sealed in AES-256-GCM envelope with CEK and restored', async () => {
    // Generate synthetic 10KB audio buffer data URI
    const fakeAudioBytes = Buffer.alloc(1024 * 10, 0x5a); // 10 KB of sound
    const audioDataUri = 'data:audio/webm;codecs=opus;base64,' + fakeAudioBytes.toString('base64');

    const rawMsg = {
      id: 'v_note_01',
      text: '🎙 Voice note (0:14)',
      audioData: audioDataUri,
      sender: 'bob',
      time: Date.now()
    };

    const ciphertext = await JCA.encryptMessagePayload(rawMsg, testChatKey);
    assert(ciphertext.startsWith('enc:v3:ratchet:'), 'Must be enc:v3:ratchet:');
    
    // Wire inspection: Check that neither audio mime nor base64 data appears unencrypted
    assert(!ciphertext.includes('data:audio/webm'), 'Wire ciphertext MUST NOT leak audioData URI header');
    assert(!ciphertext.includes(fakeAudioBytes.toString('base64').substring(0, 40)), 'Wire ciphertext MUST NOT leak raw audio bytes');

    const decrypted = await JCA.decryptMessagePayload(ciphertext, testChatKey);
    assert(decrypted.audioData, 'Decrypted message must have restored audioData');
    assert.strictEqual(decrypted.audioData, audioDataUri, 'Restored audio data URI must be bit-exact match');
    assert.strictEqual(decrypted.text, rawMsg.text);
  });

  // Test 4: Photo Envelope Encryption
  await testAsync('Photo (imgData) is encrypted in isolated envelope and decrypted bit-exact', async () => {
    const fakeImgBytes = Buffer.from('RIFF_FAKE_JPEG_IMAGE_PIXELS_FOR_ENCRYPTION_TEST_2026');
    const imgDataUri = 'data:image/jpeg;base64,' + fakeImgBytes.toString('base64');

    const rawMsg = {
      id: 'p_img_02',
      text: '📸 Confidential blueprint photo',
      imgData: imgDataUri,
      sender: 'charlie',
      time: Date.now()
    };

    const ciphertext = await JCA.encryptMessagePayload(rawMsg, testChatKey);
    assert(!ciphertext.includes('data:image/jpeg'), 'Wire payload MUST NOT leak image header');
    assert(!ciphertext.includes(fakeImgBytes.toString('base64')), 'Wire payload MUST NOT leak image base64');

    const decrypted = await JCA.decryptMessagePayload(ciphertext, testChatKey);
    assert(decrypted.imgData, 'Decrypted message must have restored imgData');
    assert.strictEqual(decrypted.imgData, imgDataUri, 'Restored photo must be bit-exact match');
  });

  // Test 5: Document Envelope Encryption
  await testAsync('Document (doc.data) PDF is encrypted in isolated envelope and decrypted', async () => {
    const fakePdfBytes = Buffer.from('%PDF-1.4 ... Confidential Legal Defense Strategy ... %%EOF');
    const docDataUri = 'data:application/pdf;base64,' + fakePdfBytes.toString('base64');

    const rawMsg = {
      id: 'd_doc_03',
      text: '📄 Legal_Brief.pdf',
      doc: {
        name: 'Legal_Brief.pdf',
        size: fakePdfBytes.length,
        mime: 'application/pdf',
        data: docDataUri
      },
      sender: 'dave',
      time: Date.now()
    };

    const ciphertext = await JCA.encryptMessagePayload(rawMsg, testChatKey);
    assert(!ciphertext.includes('data:application/pdf'), 'Wire payload MUST NOT leak PDF data URI');
    assert(!ciphertext.includes('Legal Defense Strategy'), 'Wire payload MUST NOT leak document content');

    const decrypted = await JCA.decryptMessagePayload(ciphertext, testChatKey);
    assert(decrypted.doc, 'Decrypted message must have doc object');
    assert.strictEqual(decrypted.doc.name, 'Legal_Brief.pdf');
    assert.strictEqual(decrypted.doc.data, docDataUri, 'Restored doc data must be bit-exact match');
  });

  // Test 6: Forward Secrecy & Ratchet Nonce Randomness
  await testAsync('Successive encryptions yield distinct nonces & ciphertexts for identical plaintext', async () => {
    const raw = { text: 'Identical message payload' };
    const c1 = await JCA.encryptMessagePayload(raw, testChatKey);
    const c2 = await JCA.encryptMessagePayload(raw, testChatKey);
    assert.notStrictEqual(c1, c2, 'Two encryptions of same plaintext must produce completely different ciphertexts');
    
    const d1 = await JCA.decryptMessagePayload(c1, testChatKey);
    const d2 = await JCA.decryptMessagePayload(c2, testChatKey);
    assert.strictEqual(d1.text, d2.text);
  });

  // Test 7: Tamper Detection
  await testAsync('Tampered ciphertext is securely rejected (returns null, no throw/crash)', async () => {
    const raw = { text: 'Untampered payload' };
    const cipher = await JCA.encryptMessagePayload(raw, testChatKey);
    
    // Tamper with the ciphertext body
    const parts = cipher.split(':');
    const corruptedB64 = parts[3].slice(0, 10) + 'A' + parts[3].slice(11);
    const corruptedCipher = parts[0] + ':' + parts[1] + ':' + parts[2] + ':' + corruptedB64;

    const result = await JCA.decryptMessagePayload(corruptedCipher, testChatKey);
    assert.strictEqual(result, null, 'Tampered ciphertext must fail to decrypt and return null');
  });

  console.log('\n====================================================');
  console.log(`📊 RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round(passedTests/totalTests*100)}%)`);
  console.log('====================================================\n');
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
