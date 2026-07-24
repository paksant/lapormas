import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, DOMAIN_EMAIL, getSecondaryAuth, disposeSecondaryApp } from "./firebase-config.js";

// Helper: Format NIP ke Email Internal
export const nipToEmail = (nip) => `${String(nip).trim()}${DOMAIN_EMAIL}`;

// ============================================================
// LOGIN
// ============================================================
export async function loginUser(nip, password) {
  const email = nipToEmail(nip);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

  if (!userDoc.exists()) {
    await signOut(auth);
    throw new Error("Akun ditemukan namun profil pengguna tidak ada. Hubungi Admin.");
  }
  return userDoc.data();
}

// ============================================================
// LOGOUT
// ============================================================
export async function logoutUser() {
  await signOut(auth);
}

// ============================================================
// ADMIN: BUAT AKUN STAF / ADMIN BARU (Kelola Pengguna -> Tambah)
// Menggunakan instance Firebase App kedua supaya sesi Admin yang
// sedang login tidak ikut tergantikan oleh akun baru.
// ============================================================
export async function adminCreateUser({ nip, password, name, status, role }) {
  const { secondaryApp, secondaryAuth } = getSecondaryAuth();

  try {
    const email = nipToEmail(nip);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;

    const userData = {
      uid,
      nip: String(nip).trim(),
      name: name.trim(),
      email,
      role,   // 'staff' atau 'admin'
      status, // 'PNS' atau 'PPPK Paruh Waktu'
      createdAt: new Date().toISOString(),
    };

    // Ditulis lewat `db` (instance utama) sehingga request ini terautentikasi
    // sebagai Admin yang sedang login -> sesuai Firestore Security Rules.
    await setDoc(doc(db, "users", uid), userData);

    await signOut(secondaryAuth);
    return userData;
  } finally {
    await disposeSecondaryApp(secondaryApp);
  }
}
