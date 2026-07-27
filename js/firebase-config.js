import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Ganti dengan kredensial Proyek Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyAM7Soj5ePqXXo_fQ3M-A1xhVD31fG9W9Q",
  authDomain: "lapormas-87dc3.firebaseapp.com",
  projectId: "lapormas-87dc3",
  storageBucket: "lapormas-87dc3.firebasestorage.app",
  messagingSenderId: "768757700292",
  appId: "1:768757700292:web:60abfd42a84780ea3a1b91"
};

// Initialize Firebase (instance utama - dipakai untuk sesi login yang sedang aktif)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const DOMAIN_EMAIL = "@sman6surakarta.sch.id";

/**
 * Firebase Auth (khususnya createUserWithEmailAndPassword) otomatis mengganti
 * sesi login yang sedang aktif menjadi akun yang baru dibuat. Ini bermasalah
 * ketika Admin membuat akun staf baru dari dalam aplikasi, karena Admin akan
 * ikut ter-logout dan tergantikan oleh akun staf yang baru saja dibuat.
 *
 * Solusinya: buat instance Firebase App kedua ("secondary") khusus untuk
 * proses pembuatan akun. Sesi Admin di app utama tidak tersentuh sama sekali.
 */
export function getSecondaryAuth() {
  const secondaryApp = initializeApp(firebaseConfig, `Secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  return { secondaryApp, secondaryAuth };
}

export async function disposeSecondaryApp(secondaryApp) {
  try {
    await deleteApp(secondaryApp);
  } catch (err) {
    console.warn("Gagal membersihkan instance sementara:", err);
  }
}
