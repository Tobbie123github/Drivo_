// src/services/firebase.js
// Firebase Cloud Messaging — push notifications for Drivo
// Works on web (PWA) and native (Capacitor Android/iOS via @capacitor-firebase/messaging)
//
// SETUP STEPS:
// 1. npm install firebase @capacitor-firebase/messaging
// 2. npx cap update
// 3. Add google-services.json to android/app/
// 4. Add GoogleService-Info.plist to ios/App/App/
// 5. Fill in firebaseConfig below from your Firebase console

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { Capacitor } from "@capacitor/core";

// ── Replace these with your actual Firebase project config ────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let app = null;
let messaging = null;

function initFirebase() {
  if (app) return app;
  app = initializeApp(firebaseConfig);
  return app;
}

// ── Get FCM token — call this once when user logs in ──────────────────────────
// Returns the FCM token string, or null if unavailable.
// Send this token to your backend so it can send push notifications to this device.
export async function getFCMToken() {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native: use @capacitor-firebase/messaging
      const { receive } = await FirebaseMessaging.requestPermissions();
      if (receive !== "granted") {
        console.warn("[FCM] Permission not granted");
        return null;
      }
      const { token } = await FirebaseMessaging.getToken();
      console.log("[FCM] Native token:", token);
      return token;
    } else {
      // Web: use firebase/messaging
      initFirebase();
      if (!("Notification" in window)) return null;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return null;

      messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      console.log("[FCM] Web token:", token);
      return token;
    }
  } catch (e) {
    console.error("[FCM] getToken failed:", e);
    return null;
  }
}

// ── Listen for foreground notifications ───────────────────────────────────────
// Call this once after login. The callback receives { title, body, data }.
export function onForegroundMessage(callback) {
  if (Capacitor.isNativePlatform()) {
    // Native: listen via Capacitor plugin
    FirebaseMessaging.addListener("notificationReceived", (notification) => {
      callback({
        title: notification.notification?.title || "Drivo",
        body: notification.notification?.body || "",
        data: notification.notification?.data || {},
      });
    });
    // Return cleanup fn
    return () => FirebaseMessaging.removeAllListeners();
  } else {
    // Web: listen via Firebase SDK
    initFirebase();
    if (!messaging) return () => {};
    return onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title || "Drivo",
        body: payload.notification?.body || "",
        data: payload.data || {},
      });
    });
  }
}

// ── Remove listeners ──────────────────────────────────────────────────────────
export async function removeFCMListeners() {
  if (Capacitor.isNativePlatform()) {
    await FirebaseMessaging.removeAllListeners();
  }
}
