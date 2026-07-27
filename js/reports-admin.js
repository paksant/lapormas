import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { toast, confirmDialog, svgIcon, formatDateID, getTodayISO, reportsTableHTML } from "./utils.js";

/**
 * Merender panel Rekap Laporan (Admin) ke dalam `container` dan
 * mengembalikan fungsi cleanup untuk menghentikan listener realtime.
 */
export function initAdminReportsPanel(container) {
  let allReports = [];
  let allStaff = [];
  let filters = { date: "", search: "", status: "" };

  container.innerHTML = `
    <div class="animate-fade-in space-y-6">
      <!-- Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="stat-cards">
        ${["", "", "", ""].map(() => `<div class="bg-white rounded-2xl border border-slate-200/80 p-5 h-[92px] animate-pulse"></div>`).join("")}
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-5">
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Filter Data</p>
        <div class="grid sm:grid-cols-4 gap-3">
          <input type="date" id="filter-date" class="p-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/60">
          <input type="text" id="filter-search" placeholder="Cari nama / NIP…" class="sm:col-span-2 p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/60">
          <select id="filter-status" class="p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/60">
            <option value="">Semua Status</option>
            <option value="PNS">PNS</option>
            <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
          </select>
        </div>
        <div class="flex justify-end mt-2.5">
          <button id="reset-filters" class="text-[11px] font-semibold text-navy-700 hover:underline">Reset Filter</button>
        </div>
      </div>

      <!-- Rekap -->
      <div class="space-y-3">
        <div>
          <h2 class="font-serif text-lg font-semibold text-slate-900 tracking-tight">Rekap Laporan Seluruh Staf</h2>
          <p class="text-xs text-slate-500">Pantau dan beri solusi atas kendala staf Tata Usaha.</p>
        </div>
        <div id="admin-reports-list" class="space-y-3">
          <p class="text-xs text-slate-400 text-center py-8">Memuat rekap laporan…</p>
        </div>
      </div>
    </div>

    <!-- Modal Tanggapi Kendala -->
    <div id="respond-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-fade-in">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 class="font-serif font-semibold text-slate-900 text-base">Tanggapi Kendala</h3>
          <button id="close-respond-modal" class="text-slate-400 hover:text-slate-600">${svgIcon("close", "w-5 h-5")}</button>
        </div>
        <p id="respond-staff-name" class="text-xs text-slate-500"></p>
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Kendala Dilaporkan</p>
          <p id="respond-obstacle-text" class="text-sm text-slate-700 whitespace-pre-line"></p>
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Catatan / Solusi</label>
          <textarea id="respond-input" rows="3" placeholder="Contoh: Akan ditindaklanjuti ke Waka Sarpras." class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none"></textarea>
        </div>
        <div class="flex gap-2 pt-1">
          <button id="cancel-respond" class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
          <button id="save-respond" class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 transition-colors">Simpan Tanggapan</button>
        </div>
      </div>
    </div>

    <!-- Modal Edit Laporan (Admin) -->
    <div id="edit-report-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 class="font-serif font-semibold text-slate-900 text-base">Edit Laporan Harian</h3>
          <button id="close-edit-report-modal" class="text-slate-400 hover:text-slate-600">${svgIcon("close", "w-5 h-5")}</button>
        </div>
        <p id="edit-report-staff-name" class="text-xs text-slate-500"></p>
        <form id="edit-report-form" class="space-y-3.5">
          <input type="hidden" id="edit-report-id">
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</label>
            <input type="date" id="edit-report-date" required class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none">
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aktivitas Hari Ini</label>
            <textarea id="edit-report-activity" required rows="3" class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none"></textarea>
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kendala / Hambatan</label>
            <textarea id="edit-report-obstacle" required rows="2" class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none"></textarea>
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rencana Kerja Besok</label>
            <textarea id="edit-report-plan" required rows="2" class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-600 outline-none"></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-edit-report" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs">Batal</button>
            <button type="submit" class="px-4 py-2.5 bg-navy-800 hover:bg-navy-900 text-white font-semibold rounded-xl text-xs">Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = container.querySelector("#respond-modal");
  let activeReportId = null;

  container.querySelector("#close-respond-modal").addEventListener("click", closeModal);
  container.querySelector("#cancel-respond").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  function closeModal() {
    modal.classList.add("hidden");
    activeReportId = null;
  }

  function openModal(r) {
    activeReportId = r.id;
    container.querySelector("#respond-staff-name").textContent = `${r.userName} · ${r.userStatus} · NIP ${r.nip}`;
    container.querySelector("#respond-obstacle-text").textContent = r.obstacle || "-";
    container.querySelector("#respond-input").value = r.adminResponse || "";
    modal.classList.remove("hidden");
  }

  container.querySelector("#save-respond").addEventListener("click", async () => {
    if (!activeReportId) return;
    const btn = container.querySelector("#save-respond");
    const text = container.querySelector("#respond-input").value.trim();
    btn.disabled = true;
    btn.textContent = "Menyimpan…";
    try {
      await updateDoc(doc(db, "daily_reports", activeReportId), { adminResponse: text });
      toast("Tanggapan berhasil disimpan.", "success");
      closeModal();
    } catch (err) {
      console.error(err);
      toast("Gagal menyimpan tanggapan: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Simpan Tanggapan";
    }
  });

  // ---------- Edit modal ----------
  const editModal = container.querySelector("#edit-report-modal");
  container.querySelector("#close-edit-report-modal").addEventListener("click", () => editModal.classList.add("hidden"));
  container.querySelector("#cancel-edit-report").addEventListener("click", () => editModal.classList.add("hidden"));
  editModal.addEventListener("click", (e) => { if (e.target === editModal) editModal.classList.add("hidden"); });

  function openEditModal(r) {
    container.querySelector("#edit-report-staff-name").textContent = `${r.userName} · ${r.userStatus} · NIP ${r.nip}`;
    container.querySelector("#edit-report-id").value = r.id;
    container.querySelector("#edit-report-date").value = r.reportDate || getTodayISO();
    container.querySelector("#edit-report-activity").value = r.activity || "";
    container.querySelector("#edit-report-obstacle").value = r.obstacle || "";
    container.querySelector("#edit-report-plan").value = r.plan || "";
    editModal.classList.remove("hidden");
  }

  container.querySelector("#edit-report-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const docId = container.querySelector("#edit-report-id").value;
    const reportDate = container.querySelector("#edit-report-date").value;
    const activity = container.querySelector("#edit-report-activity").value.trim();
    const obstacle = container.querySelector("#edit-report-obstacle").value.trim();
    const plan = container.querySelector("#edit-report-plan").value.trim();

    try {
      await updateDoc(doc(db, "daily_reports", docId), { reportDate, activity, obstacle, plan });
      editModal.classList.add("hidden");
      toast("Laporan berhasil diperbarui.", "success");
    } catch (err) {
      console.error(err);
      toast("Gagal memperbarui laporan: " + err.message, "error");
    }
  });

  async function handleDelete(r) {
    const ok = await confirmDialog({
      title: "Hapus Laporan?",
      message: `Laporan milik "${r.userName}" tanggal ${formatDateID(r.reportDate)} akan dihapus permanen.`,
      confirmLabel: "Ya, Hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "daily_reports", r.id));
      toast("Laporan berhasil dihapus.", "success");
    } catch (err) {
      console.error(err);
      toast("Gagal menghapus laporan: " + err.message, "error");
    }
  }

  // ---------- Filters ----------
  container.querySelector("#filter-date").addEventListener("change", (e) => { filters.date = e.target.value; renderList(); });
  container.querySelector("#filter-search").addEventListener("input", (e) => { filters.search = e.target.value.toLowerCase(); renderList(); });
  container.querySelector("#filter-status").addEventListener("change", (e) => { filters.status = e.target.value; renderList(); });
  container.querySelector("#reset-filters").addEventListener("click", () => {
    filters = { date: "", search: "", status: "" };
    container.querySelector("#filter-date").value = "";
    container.querySelector("#filter-search").value = "";
    container.querySelector("#filter-status").value = "";
    renderList();
  });

  function renderStatCards() {
    const el = container.querySelector("#stat-cards");
    const today = getTodayISO();
    const totalStaff = allStaff.length;
    const reportedToday = new Set(allReports.filter((r) => r.reportDate === today).map((r) => r.userId));
    const sudahLapor = reportedToday.size;
    const belumLapor = Math.max(totalStaff - sudahLapor, 0);
    const kendalaPending = allReports.filter((r) => r.obstacle && r.obstacle !== "-" && !r.adminResponse).length;

    const cards = [
      { label: "Total Staf Tata Usaha", value: totalStaff, tone: "navy", ic: "users" },
      { label: "Sudah Lapor Hari Ini", value: sudahLapor, tone: "emerald", ic: "reports" },
      { label: "Belum Lapor Hari Ini", value: belumLapor, tone: "rose", ic: "alert" },
      { label: "Kendala Perlu Solusi", value: kendalaPending, tone: "gold", ic: "chat" },
    ];

    const toneMap = {
      navy: "bg-navy-50 text-navy-700 border-navy-100",
      emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
      rose: "bg-rose-50 text-rose-700 border-rose-100",
      gold: "bg-gold-50 text-gold-600 border-gold-100",
    };

    el.innerHTML = cards
      .map((c) => `
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-5 flex items-center gap-3.5">
          <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${toneMap[c.tone]} border flex items-center justify-center shrink-0">
            ${svgIcon(c.ic, "w-5 h-5")}
          </div>
          <div class="min-w-0">
            <p class="text-2xl font-extrabold text-slate-900 leading-none font-serif">${c.value}</p>
            <p class="text-[11px] text-slate-500 mt-1 leading-tight">${c.label}</p>
          </div>
        </div>`)
      .join("");
  }

  function renderList() {
    const listEl = container.querySelector("#admin-reports-list");
    const filtered = allReports.filter((r) => {
      const matchDate = filters.date ? r.reportDate === filters.date : true;
      const matchSearch = filters.search
        ? (r.userName || "").toLowerCase().includes(filters.search) || (r.nip || "").includes(filters.search)
        : true;
      const matchStatus = filters.status ? r.userStatus === filters.status : true;
      return matchDate && matchSearch && matchStatus;
    });

    listEl.innerHTML = reportsTableHTML(filtered, { showName: true });

    listEl.querySelectorAll("[data-action]").forEach((btn) => {
      const r = filtered.find((row) => row.id === btn.dataset.id);
      if (!r) return;
      if (btn.dataset.action === "respond") btn.addEventListener("click", () => openModal(r));
      if (btn.dataset.action === "edit") btn.addEventListener("click", () => openEditModal(r));
      if (btn.dataset.action === "delete") btn.addEventListener("click", () => handleDelete(r));
    });
  }

  // ---------- Realtime listeners ----------
  const qStaff = query(collection(db, "users"), where("role", "==", "staff"));
  const unsubStaff = onSnapshot(qStaff, (snap) => {
    allStaff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderStatCards();
  }, (err) => console.error(err));

  const qReports = query(collection(db, "daily_reports"), orderBy("createdAt", "desc"));
  const unsubReports = onSnapshot(qReports, (snap) => {
    allReports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderStatCards();
    renderList();
  }, (err) => {
    console.error(err);
    toast("Gagal memuat data laporan.", "error");
  });

  return () => { unsubStaff(); unsubReports(); };
}
