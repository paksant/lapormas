import {
  collection,
  query,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { toast, escapeHtml, getTodayISO, toLocalISODate } from "./utils.js";

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

/**
 * Mengembalikan array 5 tanggal ISO (Senin s.d. Jumat) dari minggu yang
 * relevan dengan `isoDateStr`. Untuk hari Senin–Sabtu, ini adalah minggu
 * berjalan (Senin s.d. Jumat minggu yang sama). Untuk hari Minggu, ini
 * adalah minggu BERIKUTNYA (Senin esok hari s.d. Jumat), karena hari
 * Minggu secara alami mengarah ke minggu kerja yang akan datang.
 */
function getWeekdayDates(isoDateStr) {
  const base = new Date(`${isoDateStr}T00:00:00`);
  const day = base.getDay(); // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
  const diffToMonday = 1 - day; // Senin=0, Selasa=-1, ..., Sabtu=-5, Minggu=+1 (minggu depan)
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    dates.push(toLocalISODate(cur));
  }
  return dates;
}

function formatDayLabel(isoDateStr) {
  const d = new Date(`${isoDateStr}T00:00:00`);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long" });
}

/**
 * Merender panel Rekap Pengisian (dipakai bersama oleh Admin & Staf):
 * menampilkan staf mana saja yang sudah mengisi laporan harian pada
 * rentang Senin–Jumat suatu minggu, ditandai dengan centang (V) hijau.
 */
export function initRecapPanel(container) {
  let allStaff = [];
  let allReports = [];
  let filterDate = getTodayISO();
  let search = "";

  container.innerHTML = `
    <div class="animate-fade-in space-y-6">
      <div>
        <h2 class="font-serif text-lg font-semibold text-slate-900 tracking-tight">Rekap Pengisian Laporan</h2>
        <p class="text-xs text-slate-500">Pantau staf yang sudah mengisi laporan harian pada minggu berjalan (Senin–Jumat).</p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-5">
        <div class="grid sm:grid-cols-3 gap-3">
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filter Tanggal</label>
            <input type="date" id="recap-filter-date" value="${filterDate}" class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/60">
          </div>
          <div class="sm:col-span-2 space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cari Nama</label>
            <input type="text" id="recap-search" placeholder="Cari nama staf…" class="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/60">
          </div>
        </div>
        <div class="flex justify-end mt-2.5">
          <button id="recap-reset" class="text-[11px] font-semibold text-navy-700 hover:underline">Kembali ke Minggu Ini</button>
        </div>
      </div>

      <div id="recap-table-wrap">
        <p class="text-xs text-slate-400 text-center py-8">Memuat data rekap…</p>
      </div>
    </div>
  `;

  container.querySelector("#recap-filter-date").addEventListener("change", (e) => {
    filterDate = e.target.value || getTodayISO();
    renderTable();
  });
  container.querySelector("#recap-search").addEventListener("input", (e) => {
    search = e.target.value.trim().toLowerCase();
    renderTable();
  });
  container.querySelector("#recap-reset").addEventListener("click", () => {
    filterDate = getTodayISO();
    search = "";
    container.querySelector("#recap-filter-date").value = filterDate;
    container.querySelector("#recap-search").value = "";
    renderTable();
  });

  function renderTable() {
    const wrap = container.querySelector("#recap-table-wrap");
    const weekDates = getWeekdayDates(filterDate);

    const filteredStaff = allStaff
      .filter((u) => (search ? (u.name || "").toLowerCase().includes(search) : true))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"));

    if (filteredStaff.length === 0) {
      wrap.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-10 bg-white border border-dashed border-slate-300 rounded-2xl">Tidak ada data staf yang cocok.</p>`;
      return;
    }

    const reportedSet = new Set(
      allReports
        .filter((r) => weekDates.includes(r.reportDate))
        .map((r) => `${r.userId}__${r.reportDate}`)
    );

    wrap.innerHTML = `
      <div class="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-soft">
        <table class="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold border-b border-slate-200">
              <th class="px-3 py-3 w-10 text-center">No</th>
              <th class="px-3 py-3 w-48">Nama</th>
              ${weekDates
                .map(
                  (d, i) => `
                <th class="px-3 py-3 text-center whitespace-nowrap">
                  <div>${DAY_NAMES[i]}</div>
                  <div class="font-semibold normal-case text-slate-400 text-[10px]">${formatDayLabel(d)}</div>
                </th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs text-slate-700">
            ${filteredStaff
              .map(
                (u, i) => `
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="px-3 py-3 text-center font-bold text-slate-400">${i + 1}</td>
                <td class="px-3 py-3 font-semibold text-slate-900">${escapeHtml(u.name)}</td>
                ${weekDates
                  .map(
                    (d) => `
                  <td class="px-3 py-3 text-center">
                    ${
                      reportedSet.has(`${u.uid}__${d}`)
                        ? `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 font-extrabold border border-emerald-200">V</span>`
                        : `<span class="text-slate-300">—</span>`
                    }
                  </td>`
                  )
                  .join("")}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="sm:hidden text-[11px] text-slate-400 mt-2 text-center">Geser tabel ke samping untuk melihat kolom lainnya →</p>
    `;
  }

  // ---------- Realtime listeners ----------
  const qStaff = query(collection(db, "users"), where("role", "==", "staff"));
  const unsubStaff = onSnapshot(
    qStaff,
    (snap) => {
      allStaff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTable();
    },
    (err) => {
      console.error(err);
      toast("Gagal memuat data staf.", "error");
    }
  );

  const qReports = query(collection(db, "daily_reports"));
  const unsubReports = onSnapshot(
    qReports,
    (snap) => {
      allReports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTable();
    },
    (err) => {
      console.error(err);
      toast("Gagal memuat data laporan.", "error");
    }
  );

  return () => {
    unsubStaff();
    unsubReports();
  };
}
