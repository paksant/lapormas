import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { toast, confirmDialog, svgIcon, escapeHtml, formatDateID, getTodayISO, reportsTableHTML, downloadStaffReportsPDF } from "./utils.js";

/**
 * Merender dashboard Staf ke dalam `container` dan mengembalikan
 * fungsi cleanup untuk menghentikan listener realtime.
 */
export function initStaffDashboard(container, profile) {
  container.innerHTML = `
    <div class="animate-fade-in space-y-6">
      <!-- Form Input Laporan -->
      <div class="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-5 sm:p-6 space-y-5">
        <div class="border-b border-slate-100 pb-3.5 flex items-start justify-between gap-3">
          <div>
            <h2 class="font-serif text-lg font-semibold text-slate-900 tracking-tight">Formulir Laporan Harian</h2>
            <p class="text-xs text-slate-500 mt-0.5">Isi 3 poin capaian operasional Anda hari ini.</p>
          </div>
          <span class="hidden sm:inline-flex shrink-0 text-[11px] font-bold bg-navy-50 text-navy-700 border border-navy-100 px-2.5 py-1 rounded-full uppercase">${escapeHtml(profile.status)}</span>
        </div>

        <form id="report-form" class="space-y-4">
          <div class="space-y-1 max-w-xs">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Laporan</label>
            <input type="date" id="rep-date" value="${getTodayISO()}" required class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-navy-600 focus:border-navy-600 outline-none bg-slate-50/60 transition">
          </div>

          <div class="space-y-1">
            <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span class="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-navy-800 text-white text-[10px]">1</span>
              Aktivitas Hari Ini
            </label>
            <textarea id="rep-activity" required rows="3" placeholder="Apa saja tugas / operasional yang diselesaikan hari ini?" class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 focus:border-navy-600 outline-none transition"></textarea>
          </div>

          <div class="space-y-1">
            <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span class="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-navy-800 text-white text-[10px]">2</span>
              Kendala / Hambatan
            </label>
            <textarea id="rep-obstacle" required rows="2" placeholder="Sebutkan kendala teknis atau administratif (tulis '-' jika tidak ada)" class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 focus:border-navy-600 outline-none transition"></textarea>
          </div>

          <div class="space-y-1">
            <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span class="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-navy-800 text-white text-[10px]">3</span>
              Rencana Kerja Besok
            </label>
            <textarea id="rep-plan" required rows="2" placeholder="Apa prioritas tugas yang akan dikerjakan besok?" class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 focus:border-navy-600 outline-none transition"></textarea>
          </div>

          <button type="submit" class="w-full sm:w-auto bg-navy-800 hover:bg-navy-900 active:scale-[0.99] text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-navy-900/15 transition-all">
            Kirim Laporan Harian
          </button>
        </form>
      </div>

      <!-- Riwayat -->
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-serif text-lg font-semibold text-slate-900 tracking-tight">Riwayat Laporan Saya</h2>
          <button id="btn-download-pdf" type="button" class="inline-flex items-center gap-1.5 bg-navy-800 hover:bg-navy-900 active:scale-[0.99] text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-lg shadow-navy-900/15 transition-all shrink-0">
            ${svgIcon("download", "w-3.5 h-3.5")} Unduh PDF
          </button>
        </div>
        <div id="staff-history-list" class="space-y-3">
          <p class="text-sm text-slate-400 text-center py-8">Memuat riwayat laporan…</p>
        </div>
      </div>
    </div>

    <!-- Modal Edit -->
    <div id="edit-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 class="font-serif font-semibold text-slate-900 text-base">Edit Laporan Harian</h3>
          <button id="close-modal-edit" class="text-slate-400 hover:text-slate-600">${svgIcon("close", "w-5 h-5")}</button>
        </div>
        <form id="edit-form" class="space-y-3.5">
          <input type="hidden" id="edit-id">
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</label>
            <input type="date" id="edit-date" required class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none">
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aktivitas Hari Ini</label>
            <textarea id="edit-activity" required rows="3" class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none"></textarea>
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kendala / Hambatan</label>
            <textarea id="edit-obstacle" required rows="2" class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none"></textarea>
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rencana Kerja Besok</label>
            <textarea id="edit-plan" required rows="2" class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none"></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-modal-edit" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs">Batal</button>
            <button type="submit" class="px-4 py-2.5 bg-navy-800 hover:bg-navy-900 text-white font-semibold rounded-xl text-xs">Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Lihat Tanggapan -->
    <div id="response-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-fade-in">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center">${svgIcon("chat", "w-4 h-4")}</div>
            <h3 class="font-serif font-semibold text-slate-900 text-base">Tanggapan Pimpinan</h3>
          </div>
          <button id="close-modal-response" class="text-slate-400 hover:text-slate-600">${svgIcon("close", "w-5 h-5")}</button>
        </div>
        <div class="space-y-3 text-xs">
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p class="text-slate-400 font-semibold mb-0.5 uppercase tracking-wide text-[10px]">Kendala yang dilaporkan</p>
            <p id="modal-obstacle-text" class="text-slate-700 font-medium whitespace-pre-line"></p>
          </div>
          <div class="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200/80 space-y-1">
            <p class="text-emerald-800 font-bold text-[10px] uppercase tracking-wider">Instruksi / Solusi</p>
            <p id="modal-response-text" class="text-emerald-950 font-medium leading-relaxed whitespace-pre-line text-sm"></p>
          </div>
        </div>
        <button type="button" id="ok-modal-response" class="w-full bg-navy-900 hover:bg-navy-950 text-white font-semibold py-2.5 rounded-xl text-xs">Tutup</button>
      </div>
    </div>
  `;

  // ---------- Submit laporan baru ----------
  container.querySelector("#report-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const dateVal = container.querySelector("#rep-date").value;
    const activity = container.querySelector("#rep-activity").value.trim();
    const obstacle = container.querySelector("#rep-obstacle").value.trim();
    const plan = container.querySelector("#rep-plan").value.trim();

    btn.disabled = true;
    btn.textContent = "Mengirim…";
    try {
      await addDoc(collection(db, "daily_reports"), {
        userId: profile.uid,
        nip: profile.nip,
        userName: profile.name,
        userStatus: profile.status,
        reportDate: dateVal,
        activity,
        obstacle,
        plan,
        adminResponse: "",
        createdAt: serverTimestamp(),
      });
      e.target.reset();
      container.querySelector("#rep-date").value = getTodayISO();
      toast("Laporan harian berhasil dikirim.", "success");
    } catch (err) {
      console.error(err);
      toast("Gagal mengirim laporan: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Kirim Laporan Harian";
    }
  });

  // ---------- Modal controls ----------
  const editModal = container.querySelector("#edit-modal");
  const responseModal = container.querySelector("#response-modal");

  container.querySelector("#close-modal-edit").addEventListener("click", () => editModal.classList.add("hidden"));
  container.querySelector("#cancel-modal-edit").addEventListener("click", () => editModal.classList.add("hidden"));
  container.querySelector("#close-modal-response").addEventListener("click", () => responseModal.classList.add("hidden"));
  container.querySelector("#ok-modal-response").addEventListener("click", () => responseModal.classList.add("hidden"));

  container.querySelector("#edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const docId = container.querySelector("#edit-id").value;
    const reportDate = container.querySelector("#edit-date").value;
    const activity = container.querySelector("#edit-activity").value.trim();
    const obstacle = container.querySelector("#edit-obstacle").value.trim();
    const plan = container.querySelector("#edit-plan").value.trim();

    try {
      await updateDoc(doc(db, "daily_reports", docId), { reportDate, activity, obstacle, plan });
      editModal.classList.add("hidden");
      toast("Laporan berhasil diperbarui.", "success");
    } catch (err) {
      console.error(err);
      toast("Gagal memperbarui laporan: " + err.message, "error");
    }
  });

  function openEditModal(r, docId) {
    container.querySelector("#edit-id").value = docId;
    container.querySelector("#edit-date").value = r.reportDate || getTodayISO();
    container.querySelector("#edit-activity").value = r.activity || "";
    container.querySelector("#edit-obstacle").value = r.obstacle || "";
    container.querySelector("#edit-plan").value = r.plan || "";
    editModal.classList.remove("hidden");
  }

  function openResponseModal(r) {
    container.querySelector("#modal-obstacle-text").innerText = r.obstacle || "";
    container.querySelector("#modal-response-text").innerText = r.adminResponse || "";
    responseModal.classList.remove("hidden");
  }

  async function handleDelete(docId) {
    const ok = await confirmDialog({
      title: "Hapus Laporan?",
      message: "Laporan yang dihapus tidak dapat dikembalikan.",
      confirmLabel: "Ya, Hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "daily_reports", docId));
      toast("Laporan berhasil dihapus.", "success");
    } catch (err) {
      console.error(err);
      toast("Gagal menghapus laporan: " + err.message, "error");
    }
  }

  // ---------- Unduh PDF ----------
  let latestRows = [];
  container.querySelector("#btn-download-pdf").addEventListener("click", () => {
    downloadStaffReportsPDF(profile, latestRows);
  });

  // ---------- Riwayat realtime ----------
  const listEl = container.querySelector("#staff-history-list");
  const q = query(
    collection(db, "daily_reports"),
    where("userId", "==", profile.uid),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      latestRows = rows;

      listEl.innerHTML = reportsTableHTML(rows, { showName: false });

      listEl.querySelectorAll("[data-action]").forEach((btn) => {
        const r = rows.find((row) => row.id === btn.dataset.id);
        if (!r) return;
        if (btn.dataset.action === "edit") btn.addEventListener("click", () => openEditModal(r, r.id));
        if (btn.dataset.action === "delete") btn.addEventListener("click", () => handleDelete(r.id));
        if (btn.dataset.action === "view-response") btn.addEventListener("click", () => openResponseModal(r));
      });
    },
    (err) => {
      console.error(err);
      toast("Gagal memuat riwayat laporan.", "error");
    }
  );

  return () => unsubscribe();
}
