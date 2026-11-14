importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDkISiLKl_1XuY66Y52rLoryKL8m9J7BK8",
  authDomain: "jjcodersjchatt.firebaseapp.com",
  projectId: "jjcodersjchatt",
  databaseURL: "https://jjcodersjchatt-default-rtdb.firebaseio.com",
  storageBucket: "jjcodersjchatt.appspot.com",
  messagingSenderId: "306552756545",
  appId: "1:306552756545:web:f7cf551b8560b77b5ca9c0",
  measurementId: "G-HDLNBL64PV"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
