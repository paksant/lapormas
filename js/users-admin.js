import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { adminCreateUser } from "./auth.js";
import { toast, confirmDialog, svgIcon, escapeHtml } from "./utils.js";

/**
 * Merender panel Kelola Pengguna (Admin) ke dalam `container` dan
 * mengembalikan fungsi cleanup untuk menghentikan listener realtime.
 */
export function initAdminUsersPanel(container, currentUserProfile) {
  let allUsers = [];
  let search = "";
  let roleFilter = "";

  container.innerHTML = `
    <div class="animate-fade-in space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-serif text-lg font-semibold text-slate-900 tracking-tight">Kelola Pengguna</h2>
          <p class="text-xs text-slate-500">Tambah, ubah, atau nonaktifkan akun staf &amp; admin.</p>
        </div>
        <button id="btn-add-user" class="inline-flex items-center justify-center gap-1.5 bg-navy-800 hover:bg-navy-900 active:scale-[0.99] text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-navy-900/15 transition-all">
          ${svgIcon("plus", "w-4 h-4")} Tambah Pengguna
        </button>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-5">
        <div class="grid sm:grid-cols-3 gap-3">
          <input type="text" id="user-search" placeholder="Cari nama / NIP…" class="sm:col-span-2 p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/60">
          <select id="user-role-filter" class="p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/60">
            <option value="">Semua Peran</option>
            <option value="staff">Staf</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div id="users-list" class="space-y-2.5">
        <p class="text-xs text-slate-400 text-center py-8">Memuat data pengguna…</p>
      </div>
    </div>

    <!-- Modal Tambah / Edit Pengguna -->
    <div id="user-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 id="user-modal-title" class="font-serif font-semibold text-slate-900 text-base">Tambah Pengguna</h3>
          <button id="close-user-modal" class="text-slate-400 hover:text-slate-600">${svgIcon("close", "w-5 h-5")}</button>
        </div>
        <form id="user-form" class="space-y-3.5">
          <input type="hidden" id="user-uid">
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
            <input type="text" id="user-name" required placeholder="Contoh: Budi Santoso, S.Pd." class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none">
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">NIP</label>
            <input type="text" id="user-nip" required placeholder="Nomor Induk Pegawai" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none disabled:bg-slate-100 disabled:text-slate-400">
            <p id="user-nip-hint" class="hidden text-[11px] text-slate-400">NIP tidak dapat diubah setelah akun dibuat.</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select id="user-status" required class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-navy-600 outline-none">
                <option value="PNS">PNS</option>
                <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peran</label>
              <select id="user-role" required class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-navy-600 outline-none">
                <option value="staff">Staf Tata Usaha</option>
                <option value="admin">Kepala Sekolah / Admin</option>
              </select>
            </div>
          </div>
          <div id="user-password-field" class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kata Sandi Awal</label>
            <input type="text" id="user-password" minlength="6" placeholder="Minimal 6 karakter" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none">
            <p class="text-[11px] text-slate-400">Sampaikan kata sandi ini kepada pengguna secara langsung.</p>
          </div>
          <div id="user-form-error" class="hidden text-rose-700 text-xs font-semibold bg-rose-50 p-3 rounded-xl border border-rose-100"></div>
          <div class="flex gap-2 pt-1">
            <button type="button" id="cancel-user-form" class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
            <button type="submit" id="save-user-btn" class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 transition-colors">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = container.querySelector("#user-modal");
  const form = container.querySelector("#user-form");
  const nipInput = container.querySelector("#user-nip");
  const nipHint = container.querySelector("#user-nip-hint");
  const passwordField = container.querySelector("#user-password-field");
  const errorBox = container.querySelector("#user-form-error");
  let mode = "create"; // 'create' | 'edit'

  function openCreateModal() {
    mode = "create";
    form.reset();
    container.querySelector("#user-modal-title").textContent = "Tambah Pengguna";
    container.querySelector("#user-uid").value = "";
    nipInput.disabled = false;
    nipHint.classList.add("hidden");
    passwordField.classList.remove("hidden");
    container.querySelector("#user-password").required = true;
    errorBox.classList.add("hidden");
    modal.classList.remove("hidden");
  }

  function openEditModal(u) {
    mode = "edit";
    form.reset();
    container.querySelector("#user-modal-title").textContent = "Edit Pengguna";
    container.querySelector("#user-uid").value = u.uid;
    container.querySelector("#user-name").value = u.name || "";
    nipInput.value = u.nip || "";
    nipInput.disabled = true;
    nipHint.classList.remove("hidden");
    container.querySelector("#user-status").value = u.status || "PNS";
    container.querySelector("#user-role").value = u.role || "staff";
    passwordField.classList.add("hidden");
    container.querySelector("#user-password").required = false;
    errorBox.classList.add("hidden");
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  container.querySelector("#btn-add-user").addEventListener("click", openCreateModal);
  container.querySelector("#close-user-modal").addEventListener("click", closeModal);
  container.querySelector("#cancel-user-form").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = container.querySelector("#save-user-btn");
    errorBox.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Menyimpan…";

    const name = container.querySelector("#user-name").value.trim();
    const nip = nipInput.value.trim();
    const status = container.querySelector("#user-status").value;
    const role = container.querySelector("#user-role").value;

    try {
      if (mode === "create") {
        const password = container.querySelector("#user-password").value;
        await adminCreateUser({ nip, password, name, status, role });
        toast("Pengguna baru berhasil ditambahkan.", "success");
      } else {
        const uid = container.querySelector("#user-uid").value;
        await updateDoc(doc(db, "users", uid), { name, status, role });
        toast("Data pengguna berhasil diperbarui.", "success");
      }
      closeModal();
    } catch (err) {
      console.error(err);
      const msg = (err.message || "").replace("Firebase: ", "");
      errorBox.textContent = msg.includes("email-already-in-use")
        ? "NIP ini sudah terdaftar."
        : msg || "Gagal menyimpan data pengguna.";
      errorBox.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan";
    }
  });

  async function handleDelete(u) {
    if (u.uid === currentUserProfile.uid) {
      toast("Anda tidak dapat menonaktifkan akun Anda sendiri.", "error");
      return;
    }
    const ok = await confirmDialog({
      title: "Nonaktifkan Pengguna?",
      message: `Profil "${u.name}" akan dihapus dari aplikasi sehingga tidak bisa login kembali. Akun autentikasinya tetap ada di sistem dan hanya dapat dihapus penuh melalui Firebase Console.`,
      confirmLabel: "Ya, Nonaktifkan",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "users", u.uid));
      toast("Pengguna berhasil dinonaktifkan.", "success");
    } catch (err) {
      console.error(err);
      toast("Gagal menonaktifkan pengguna: " + err.message, "error");
    }
  }

  // ---------- Filters ----------
  container.querySelector("#user-search").addEventListener("input", (e) => {
    search = e.target.value.trim().toLowerCase();
    renderList();
  });
  container.querySelector("#user-role-filter").addEventListener("change", (e) => {
    roleFilter = e.target.value;
    renderList();
  });

  function renderList() {
    const listEl = container.querySelector("#users-list");
    const filtered = allUsers.filter((u) => {
      const matchSearch = search
        ? (u.name || "").toLowerCase().includes(search) || (u.nip || "").includes(search)
        : true;
      const matchRole = roleFilter ? u.role === roleFilter : true;
      return matchSearch && matchRole;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-10 bg-white border border-dashed border-slate-300 rounded-2xl">Tidak ada pengguna yang cocok.</p>`;
      return;
    }

    listEl.innerHTML = filtered
      .map((u) => `
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl ${u.role === "admin" ? "bg-gold-50 text-gold-600 border-gold-100" : "bg-navy-50 text-navy-700 border-navy-100"} border flex items-center justify-center font-serif font-semibold text-sm shrink-0">
              ${escapeHtml((u.name || "?").trim().charAt(0).toUpperCase())}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-900 truncate">${escapeHtml(u.name)} ${u.uid === currentUserProfile.uid ? '<span class="text-[10px] text-navy-400 font-semibold">(Anda)</span>' : ""}</p>
              <p class="text-[11px] text-slate-400">NIP ${escapeHtml(u.nip)} · ${escapeHtml(u.status)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${u.role === "admin" ? "bg-gold-50 text-gold-600 border border-gold-100" : "bg-slate-100 text-slate-600 border border-slate-200"}">${u.role === "admin" ? "Admin" : "Staf"}</span>
            <button data-action="edit" data-uid="${u.uid}" class="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-navy-700 rounded-lg border border-slate-200 transition-colors" title="Edit Pengguna">${svgIcon("edit", "w-3.5 h-3.5")}</button>
            <button data-action="delete" data-uid="${u.uid}" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg border border-rose-100 transition-colors" title="Nonaktifkan Pengguna">${svgIcon("trash", "w-3.5 h-3.5")}</button>
          </div>
        </div>`)
      .join("");

    listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      const u = filtered.find((row) => row.uid === btn.dataset.uid);
      if (u) btn.addEventListener("click", () => openEditModal(u));
    });
    listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      const u = filtered.find((row) => row.uid === btn.dataset.uid);
      if (u) btn.addEventListener("click", () => handleDelete(u));
    });
  }

  // ---------- Realtime listener ----------
  const q = query(collection(db, "users"), orderBy("name", "asc"));
  const unsubscribe = onSnapshot(q, (snap) => {
    allUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderList();
  }, (err) => {
    console.error(err);
    toast("Gagal memuat data pengguna.", "error");
  });

  return () => unsubscribe();
}
