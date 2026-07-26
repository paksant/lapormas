import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";
import { loginUser, logoutUser } from "./auth.js";
import { toast, svgIcon } from "./utils.js";
import { initStaffDashboard } from "./staff.js";
import { initAdminReportsPanel } from "./reports-admin.js";
import { initAdminUsersPanel } from "./users-admin.js";
import { initRecapPanel } from "./recap-admin.js";

let currentUserProfile = null;
let activeCleanups = [];

function runCleanups() {
  activeCleanups.forEach((fn) => typeof fn === "function" && fn());
  activeCleanups = [];
}

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    const spinner = document.getElementById("loading-spinner");
    runCleanups();

    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          currentUserProfile = userDoc.data();
          renderMainView();
        } else {
          await logoutUser();
          renderAuthView("Profil pengguna tidak ditemukan. Hubungi Admin Tata Usaha.");
        }
      } catch (err) {
        console.error("Gagal mengambil profil:", err);
        renderAuthView("Gagal memuat profil pengguna. Silakan coba lagi.");
      }
    } else {
      currentUserProfile = null;
      renderAuthView();
    }
    spinner.classList.add("hidden");
  });
});

function renderMainView() {
  if (currentUserProfile.role === "admin") {
    renderAdminShell();
  } else {
    renderStaffShell();
  }
}

// ==========================================================
// BRAND MARK (dipakai di layar login & header)
// ==========================================================
function brandMark(size = "md") {
  const dims = size === "lg" ? "w-16 h-16 text-2xl" : "w-10 h-10 text-base";
  return `
    <div class="${dims} mx-auto shrink-0 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-950 ring-1 ring-gold-400/60 flex items-center justify-center font-serif font-semibold text-gold-300 shadow-lg shadow-black/30">
        LM
    </div>`;
}

// ==========================================================
// HEADER / NAVBAR
// ==========================================================
function getHeaderHTML() {
  const isAdmin = currentUserProfile.role === "admin";
  return `
    <header class="relative bg-gradient-to-r from-navy-900 via-navy-950 to-navy-900 text-white sticky top-0 z-40 shadow-lg shadow-black/20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
            <div class="flex items-center justify-between gap-3 py-3.5">
                <div class="flex items-center gap-3">
                    ${brandMark("sm")}
                    <div>
                        <h1 class="font-serif font-semibold text-base sm:text-lg leading-tight tracking-tight text-white">LaporMas</h1>
                        <p class="text-[9px] text-slate-300 font-medium -mt-0.5">Laporan Operasional Rutin Manajemen Administrasi Sekolah</p>
                        <p class="text-[13px] text-slate-300 font-medium -mt-0.5">SMAN 6 Surakarta</p>
                    </div>
                </div>

                <div class="flex items-center gap-2.5 sm:gap-3">
                    <div class="hidden sm:flex items-center gap-2.5 border-r border-white/10 pr-3.5">
                        <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-serif font-semibold text-xs text-gold-200 shrink-0">
                            ${escapeInitial(currentUserProfile.name)}
                        </div>
                        <div class="text-right leading-tight">
                            <p class="text-xs font-semibold text-white">${currentUserProfile.name}</p>
                            <p class="text-[10px] text-slate-300">${currentUserProfile.status} · <span class="uppercase tracking-wider font-bold text-gold-300">${isAdmin ? "Admin" : "Staf"}</span></p>
                        </div>
                    </div>
                    <button id="btn-logout" title="Keluar" class="h-9 w-9 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 transition-colors">
                        ${svgIcon("logout", "w-4 h-4")}
                    </button>
                </div>
            </div>

            ${isAdmin ? `
            <nav class="flex gap-1 -mb-px">
                <button data-tab-btn="laporan" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5">
                    ${svgIcon("reports", "w-3.5 h-3.5")} Rekap Laporan
                </button>
                <button data-tab-btn="rekap" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5">
                    ${svgIcon("shield", "w-3.5 h-3.5")} Rekap Kehadiran
                </button>
                <button data-tab-btn="pengguna" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5">
                    ${svgIcon("users", "w-3.5 h-3.5")} Kelola Pengguna
                </button>
            </nav>` : `
            <nav class="flex gap-1 -mb-px">
                <button data-tab-btn="laporan" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5">
                    ${svgIcon("reports", "w-3.5 h-3.5")} Laporan Harian
                </button>
                <button data-tab-btn="rekap" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5">
                    ${svgIcon("shield", "w-3.5 h-3.5")} Rekap Kehadiran
                </button>
            </nav>`}
        </div>

        <!-- Aksen garis emas tipis, kesan "letterhead" resmi -->
        <div class="h-[2px] w-full bg-gradient-to-r from-transparent via-gold-400/70 to-transparent"></div>
    </header>

    <!-- Profile Banner (Mobile) -->
    <div class="sm:hidden bg-navy-900/95 text-white px-4 py-2.5 flex items-center justify-between text-xs border-b border-white/5">
        <span class="font-semibold">${currentUserProfile.name}</span>
        <span class="text-slate-300">${currentUserProfile.status} · <span class="text-gold-300 font-bold uppercase">${isAdmin ? "Admin" : "Staf"}</span></span>
    </div>`;
}

function escapeInitial(name = "") {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

function attachHeaderEvents() {
  document.getElementById("btn-logout").addEventListener("click", async () => {
    runCleanups();
    await logoutUser();
    toast("Anda telah keluar.", "info");
  });
}

/** Mengaktifkan mekanisme switch tab (dipakai bersama oleh Shell Admin & Staf). */
function setupTabs(defaultTab) {
  const tabButtons = document.querySelectorAll("[data-tab-btn]");
  const activeCls = "text-gold-300 border-gold-400 bg-white/[0.04]";
  const inactiveCls = "text-slate-300 border-transparent hover:text-white hover:bg-white/[0.04]";

  function setActiveTab(tab) {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tabBtn === tab;
      btn.className = `tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${isActive ? activeCls : inactiveCls}`;
    });
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.tabPanel === tab);
    });
  }

  tabButtons.forEach((btn) => btn.addEventListener("click", () => setActiveTab(btn.dataset.tabBtn)));
  setActiveTab(defaultTab);
}

// ==========================================================
// LOGIN VIEW (registrasi mandiri dihilangkan)
// ==========================================================
function renderAuthView(errorMessage = "") {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    <div class="min-h-full flex-grow flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
        <div class="w-full max-w-md">
            <div class="text-center mb-6">
                <div class="mx-auto mb-3">${brandMark("lg")}</div>
                <h2 class="font-serif text-2xl font-semibold text-white tracking-tight">LaporMas</h2>
                <p class="text-xs text-navy-300 font-medium mt-1.5 leading-relaxed">Laporan Operasional Rutin Manajemen Administrasi Sekolah<br>SMA Negeri 6 Surakarta</p>
            </div>

            <div class="bg-white rounded-3xl shadow-2xl shadow-black/30 border border-white/10 p-6 sm:p-8">
                <p class="text-sm font-semibold text-slate-900 mb-5">Masuk ke Akun Anda</p>

                <form id="auth-form" class="space-y-4">
                    <div class="space-y-1">
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">NIP (Nomor Induk Pegawai)</label>
                        <input type="text" id="auth-nip" required autocomplete="username" placeholder="Masukkan NIP Anda" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 focus:border-navy-600 outline-none transition">
                    </div>
                    <div class="space-y-1">
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kata Sandi</label>
                        <input type="password" id="auth-password" required autocomplete="current-password" placeholder="••••••••" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 focus:border-navy-600 outline-none transition">
                    </div>

                    <div id="auth-error" class="hidden text-rose-700 text-xs font-semibold bg-rose-50 p-3 rounded-xl border border-rose-100 text-center"></div>

                    <button type="submit" id="auth-submit-btn" class="w-full bg-navy-800 hover:bg-navy-900 active:scale-[0.99] text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-navy-900/20 transition-all duration-150">
                        Masuk
                    </button>
                </form>

                <p class="text-[11px] text-slate-400 text-center leading-relaxed mt-5">
                    Belum punya akun? Hubungi Admin Tata Usaha untuk didaftarkan.
                </p>
            </div>

            <p class="text-center text-[11px] text-navy-400 mt-6">© ${new Date().getFullYear()} Tata Usaha SMA Negeri 6 Surakarta</p>
        </div>
    </div>`;

  const errDiv = document.getElementById("auth-error");
  if (errorMessage) {
    errDiv.innerText = errorMessage;
    errDiv.classList.remove("hidden");
  }

  document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nip = document.getElementById("auth-nip").value;
    const password = document.getElementById("auth-password").value;
    const btn = document.getElementById("auth-submit-btn");
    errDiv.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Memproses…";

    try {
      await loginUser(nip, password);
      // onAuthStateChanged mengambil alih dari sini
    } catch (err) {
      errDiv.innerText = (err.message || "").replace("Firebase: ", "") || "NIP atau kata sandi salah.";
      errDiv.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Masuk";
    }
  });
}

// ==========================================================
// STAFF SHELL (dengan tab: Laporan Harian / Rekap Kehadiran)
// ==========================================================
function renderStaffShell() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    ${getHeaderHTML()}
    <main class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-grow">
        <div data-tab-panel="laporan" class="active"><div id="staff-panel"></div></div>
        <div data-tab-panel="rekap"><div id="staff-recap-panel"></div></div>
    </main>`;
  attachHeaderEvents();
  setupTabs("laporan");

  const cleanupDashboard = initStaffDashboard(document.getElementById("staff-panel"), currentUserProfile);
  const cleanupRecap = initRecapPanel(document.getElementById("staff-recap-panel"));
  activeCleanups.push(cleanupDashboard, cleanupRecap);
}

// ==========================================================
// ADMIN SHELL (dengan tab: Rekap Laporan / Rekap Kehadiran / Kelola Pengguna)
// ==========================================================
function renderAdminShell() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    ${getHeaderHTML()}
    <main class="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-grow">
        <div data-tab-panel="laporan" class="active"><div id="admin-reports-panel"></div></div>
        <div data-tab-panel="rekap"><div id="admin-recap-panel"></div></div>
        <div data-tab-panel="pengguna"><div id="admin-users-panel"></div></div>
    </main>`;
  attachHeaderEvents();
  setupTabs("laporan");

  const cleanupReports = initAdminReportsPanel(document.getElementById("admin-reports-panel"), currentUserProfile);
  const cleanupRecap = initRecapPanel(document.getElementById("admin-recap-panel"));
  const cleanupUsers = initAdminUsersPanel(document.getElementById("admin-users-panel"), currentUserProfile);
  activeCleanups.push(cleanupReports, cleanupRecap, cleanupUsers);
}
