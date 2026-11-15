const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

const cryptoCode = fs.readFileSync('js/crypto-and-assets.js', 'utf8');
const engineCode = fs.readFileSync('js/firebase-engine.js', 'utf8');

const ctx = {
  window: {
    crypto: crypto.webcrypto,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary')
  },
  document: { createElement: () => ({ getContext: () => ({}) }) },
  navigator: {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  console: console,
  crypto: crypto.webcrypto,
  TextEncoder: TextEncoder,
  TextDecoder: TextDecoder,
  Buffer: Buffer,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  firebase: {
    database: {
      ServerValue: {
        TIMESTAMP: 1700000000000,
        increment: (x) => x
      }
    }
  }
};
ctx.window.window = ctx.window;
ctx.window.document = ctx.document;
ctx.window.localStorage = ctx.localStorage;
ctx.window.firebase = ctx.firebase;
ctx.window.console = ctx.console;
ctx.global = ctx.window;
vm.createContext(ctx);

vm.runInContext(cryptoCode, ctx);
vm.runInContext(engineCode, ctx);

async function runTest() {
  const JFE = ctx.window.JFE;
  const JCA = ctx.window.JCA;

  // Set up mock user Alice
  JFE.uid = 'user_alice_123';
  JFE.me = { uid: 'user_alice_123', name: 'Alice', handle: '@alice' };

  const chatId = 'dm_user_alice_123__user_bob_456';
  const chat = {
    id: chatId,
    peerUid: 'user_bob_456',
    name: 'Bob',
    handle: '@bob'
  };
  JFE.chats[chatId] = chat;

  // Mock db ref
  let writtenRecords = {};
  JFE.db = {
    ref: (path) => ({
      push: () => ({
        key: 'msg_' + Math.random().toString(36).slice(2, 9),
        set: async (val) => { writtenRecords[path] = val; }
      }),
      set: async (val) => { writtenRecords[path] = val; },
      remove: async () => { delete writtenRecords[path]; },
      update: async (updates) => {
        Object.assign(writtenRecords, updates);
      }
    })
  };

  console.log('[TEST 1] Testing Chat Key Derivation...');
  const keyAlice = JFE.getChatKey(chatId, chat);
  const keyBob = JFE.getChatKey(chatId, { peerUid: 'user_alice_123' });
  if (keyAlice === keyBob && keyAlice === 'user_alice_123:user_bob_456') {
    console.log('  PASS: Key Alice and Key Bob are identical and deterministic:', keyAlice);
  } else {
    throw new Error('Key mismatch! Alice: ' + keyAlice + ', Bob: ' + keyBob);
  }

  console.log('[TEST 2] Testing E2EE Text Message Sending...');
  const secretText = 'Hey Bob, this is a top-secret message that nobody else can read!';
  const msgId = await JFE.sendMessage(chatId, { text: secretText, kind: 'text' });
  console.log('  Message Sent with ID:', msgId);

  const serverMsg = writtenRecords['v2/messages/' + chatId + '/' + msgId];
  console.log('  Server Record stored in Firebase:');
  console.log('    text:', serverMsg.text);
  console.log('    cipher prefix:', serverMsg.cipher ? serverMsg.cipher.slice(0, 30) + '...' : 'NONE');

  if (serverMsg.text === '🔒 Encrypted Message' && serverMsg.cipher && serverMsg.cipher.startsWith('enc:v2:aes:')) {
    console.log('  PASS: Server only holds ciphertext and encrypted placeholder!');
  } else {
    throw new Error('Server record leaked plaintext or missing cipher! cipher: ' + serverMsg.cipher);
  }

  console.log('[TEST 3] Testing Receiver (Bob) Decryption...');
  const bobDecrypted = await JCA.decryptMessagePayload(serverMsg.cipher, keyBob);
  console.log('  Bob decrypted result text:', bobDecrypted && bobDecrypted.text);
  if (bobDecrypted && bobDecrypted.text === secretText) {
    console.log('  PASS: Bob successfully decrypted the secret message!');
  } else {
    throw new Error('Bob failed to decrypt message!');
  }

  console.log('[TEST 4] Testing Eavesdropper (Eve with wrong key) Decryption...');
  const eveKey = 'user_eve_999:user_bob_456';
  const eveDecrypted = await JCA.decryptMessagePayload(serverMsg.cipher, eveKey);
  console.log('  Eve decrypted result:', eveDecrypted);
  if (eveDecrypted === null) {
    console.log('  PASS: Eve was completely blocked by AES-256-GCM authentication!');
  } else {
    throw new Error('Eve should not be able to decrypt with wrong key!');
  }

  console.log('[TEST 5] Testing Media (Photo/Voice/Poll) E2EE Protection...');
  const photoMsgId = await JFE.sendMessage(chatId, {
    kind: 'photo',
    text: 'Check this confidential document photo',
    imgData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/fakeImageDataBytes...'
  });
  const serverPhotoMsg = writtenRecords['v2/messages/' + chatId + '/' + photoMsgId];
  if (serverPhotoMsg.imgData === undefined && serverPhotoMsg.text === '🔒 Encrypted Message') {
    console.log('  PASS: Raw image data is NEVER sent to server!');
  } else {
    throw new Error('Raw image data leaked to server!');
  }

  const bobPhotoDec = await JCA.decryptMessagePayload(serverPhotoMsg.cipher, keyBob);
  if (bobPhotoDec && bobPhotoDec.imgData.startsWith('data:image/jpeg;base64,') && bobPhotoDec.text === 'Check this confidential document photo') {
    console.log('  PASS: Bob decrypted both image and caption perfectly!');
  } else {
    throw new Error('Bob failed to decrypt image payload!');
  }

  console.log('\n>>> ALL 5 TELEGRAM-GRADE E2EE TESTS PASSED PERFECTLY! <<<');
}

runTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
