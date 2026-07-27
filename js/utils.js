// ============================================================
// utils.js — Fungsi bantu bersama UI (toast, format, ikon, dsb.)
// ============================================================

/**
 * Mengubah objek Date menjadi string ISO "YYYY-MM-DD" berdasarkan
 * KOMPONEN TANGGAL LOKAL (bukan UTC). Ini penting untuk zona waktu
 * Indonesia (WIB/WITA/WIT, semuanya di depan UTC): memakai
 * `date.toISOString()` akan mengonversi ke UTC dan bisa menggeser
 * tanggal mundur 1 hari. Selalu gunakan fungsi ini, jangan
 * `toISOString()`, untuk merepresentasikan "tanggal hari ini".
 */
export function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const getTodayISO = () => toLocalISODate(new Date());

export function formatDateID(isoDate) {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Toast notifikasi non-blocking, pengganti alert() bawaan browser. */
export function toast(message, type = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[100] flex flex-col gap-2 items-center sm:items-end pointer-events-none";
    document.body.appendChild(host);
  }

  const palette = {
    success: "bg-emerald-600",
    error: "bg-rose-600",
    info: "bg-navy-800",
  };

  const el = document.createElement("div");
  el.className = `pointer-events-auto max-w-sm w-full sm:w-auto ${palette[type] || palette.info} text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg shadow-black/10 animate-toast-in`;
  el.textContent = message;
  host.appendChild(el);

  setTimeout(() => {
    el.classList.add("animate-toast-out");
    setTimeout(() => el.remove(), 200);
  }, 3200);
}

/** Dialog konfirmasi ringan (pengganti confirm() bawaan browser) — mengembalikan Promise<boolean>. */
export function confirmDialog({ title, message, confirmLabel = "Ya, lanjutkan", danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "fixed inset-0 z-[110] flex items-center justify-center p-4 modal-backdrop";
    wrap.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
        <h3 class="font-serif text-lg font-semibold text-slate-900">${escapeHtml(title)}</h3>
        <p class="text-sm text-slate-500 leading-relaxed">${escapeHtml(message)}</p>
        <div class="flex gap-2 pt-1">
          <button data-act="cancel" class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
          <button data-act="confirm" class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-navy-800 hover:bg-navy-900"} transition-colors">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.dataset.act === "cancel") {
        wrap.remove();
        resolve(false);
      } else if (e.target.dataset.act === "confirm") {
        wrap.remove();
        resolve(true);
      }
    });
  });
}

/** Kumpulan ikon SVG stroke tipis (bergaya konsisten) — dipakai menggantikan emoji. */
export const icon = {
  clipboard: `<path d="M9 2h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Z"/><path d="M9 12h6M9 16h6"/>`,
  alert: `<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>`,
  chat: `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/>`,
  edit: `<path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5Z"/>`,
  trash: `<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  reports: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`,
  close: `<path d="M18 6 6 18M6 6l12 12"/>`,
  shield: `<path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z"/><path d="m9 12 2 2 4-4"/>`,
  download: `<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>`,
};

export function svgIcon(name, cls = "w-4 h-4") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${icon[name] || ""}</svg>`;
}

// ============================================================
// Tabel Riwayat Laporan — dipakai bersama oleh staf & admin.
// `showName`: true untuk tampilan Admin (kolom Nama muncul, dan
// kolom Kendala berisi kontrol "Tanggapi Kendala"); false untuk
// tampilan Staf (kolom Nama disembunyikan, kolom Kendala berisi
// status "Sudah/Belum Ditanggapi").
// ============================================================
export function reportsTableHTML(rows, { showName }) {
  if (rows.length === 0) {
    return `<p class="text-sm text-slate-400 bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">Tidak ada data laporan.</p>`;
  }

  return `
    <div class="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-soft">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold border-b border-slate-200">
            <th class="px-3 py-3 w-10 text-center">No</th>
            <th class="px-3 py-3 w-28">Tanggal</th>
            ${showName ? '<th class="px-3 py-3 w-40">Nama</th>' : ""}
            <th class="px-3 py-3 w-64">Aktivitas</th>
            <th class="px-3 py-3 w-64">Kendala</th>
            <th class="px-3 py-3 w-64">Rencana Besok</th>
            <th class="px-3 py-3 w-20 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-xs text-slate-700">
          ${rows.map((r, i) => reportRowHTML(r, i, showName)).join("")}
        </tbody>
      </table>
    </div>
    <p class="sm:hidden text-[11px] text-slate-400 mt-2 text-center">Geser tabel ke samping untuk melihat kolom lainnya →</p>
  `;
}

function reportRowHTML(r, i, showName) {
  const nameCell = showName
    ? `<td class="px-3 py-3 align-top">
        <p class="font-semibold text-slate-900">${escapeHtml(r.userName)}</p>
        <p class="text-[10px] text-slate-400">${escapeHtml(r.userStatus)} · NIP ${escapeHtml(r.nip || "-")}</p>
      </td>`
    : "";

  const kendalaCell = showName
    ? `<td class="px-3 py-3 align-top">
        <p class="whitespace-pre-line leading-relaxed">${escapeHtml(r.obstacle)}</p>
        <button data-action="respond" data-id="${r.id}" class="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-colors ${
          r.adminResponse
            ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            : "text-navy-700 bg-navy-50 border-navy-100 hover:bg-navy-100"
        }">
          ${svgIcon("chat", "w-3 h-3")} ${r.adminResponse ? "Sudah Ditanggapi" : "Tanggapi Kendala"}
        </button>
      </td>`
    : `<td class="px-3 py-3 align-top">
        <p class="whitespace-pre-line leading-relaxed">${escapeHtml(r.obstacle)}</p>
        ${
          r.adminResponse
            ? `<button data-action="view-response" data-id="${r.id}" class="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-1 rounded-full transition-colors">${svgIcon("chat", "w-3 h-3")} Lihat Tanggapan</button>`
            : `<span class="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">Belum Ditanggapi</span>`
        }
      </td>`;

  return `
    <tr class="hover:bg-slate-50/70 transition-colors">
      <td class="px-3 py-3 text-center font-bold text-slate-400 align-top">${i + 1}</td>
      <td class="px-3 py-3 font-semibold text-navy-700 whitespace-nowrap align-top">${formatDateID(r.reportDate)}</td>
      ${nameCell}
      <td class="px-3 py-3 align-top"><p class="whitespace-pre-line leading-relaxed">${escapeHtml(r.activity)}</p></td>
      ${kendalaCell}
      <td class="px-3 py-3 align-top"><p class="whitespace-pre-line leading-relaxed">${escapeHtml(r.plan)}</p></td>
      <td class="px-3 py-3 align-top">
        <div class="flex items-center justify-center gap-1.5">
          <button data-action="edit" data-id="${r.id}" class="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-navy-700 rounded-lg border border-slate-200 transition-colors" title="Edit Laporan">${svgIcon("edit", "w-3.5 h-3.5")}</button>
          <button data-action="delete" data-id="${r.id}" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg border border-rose-100 transition-colors" title="Hapus Laporan">${svgIcon("trash", "w-3.5 h-3.5")}</button>
        </div>
      </td>
    </tr>`;
}

// ============================================================
// Unduh PDF — Riwayat Laporan Staf (diurutkan dari tanggal paling
// lama), dengan kop judul resmi dan blok tanda tangan di kanan
// bawah berisi tempat/tanggal cetak + nama pegawai yang login.
// ============================================================
export function downloadStaffReportsPDF(profile, rows) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    toast("Gagal memuat modul PDF. Periksa koneksi internet Anda.", "error");
    return;
  }
  if (!rows || rows.length === 0) {
    toast("Tidak ada laporan untuk diunduh.", "info");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    if (typeof docPdf.autoTable !== "function") {
      toast("Modul tabel PDF (AutoTable) belum termuat. Muat ulang halaman lalu coba lagi.", "error");
      return;
    }

    const pageWidth = docPdf.internal.pageSize.getWidth();
    const marginX = 40;

    // --- Kop / Judul ---
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(13);
    docPdf.text("LAPORAN KERJA STAF TATA USAHA SMA NEGERI 6 SURAKARTA", pageWidth / 2, 45, { align: "center" });

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.text(
      `Nama: ${profile.name}     NIP: ${profile.nip || "-"}     Status: ${profile.status || "-"}`,
      pageWidth / 2,
      62,
      { align: "center" }
    );
    docPdf.setDrawColor(20, 30, 66);
    docPdf.setLineWidth(1);
    docPdf.line(marginX, 72, pageWidth - marginX, 72);

    // --- Urutkan dari tanggal paling lama ---
    const sorted = [...rows].sort((a, b) => {
      const da = a.reportDate || "";
      const dbb = b.reportDate || "";
      return da.localeCompare(dbb);
    });

    const body = sorted.map((r, i) => [
      String(i + 1),
      formatDateID(r.reportDate),
      r.activity || "-",
      r.obstacle || "-",
      r.plan || "-",
    ]);

    docPdf.autoTable({
      startY: 84,
      margin: { left: marginX, right: marginX },
      head: [["No", "Tanggal", "Aktivitas Hari Ini", "Kendala / Hambatan", "Rencana Kerja Besok"]],
      body,
      styles: { fontSize: 8.5, cellPadding: 5, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: [33, 47, 86], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 26, halign: "center" },
        1: { cellWidth: 85 },
        2: { cellWidth: "auto" },
        3: { cellWidth: "auto" },
        4: { cellWidth: "auto" },
      },
    });

    // --- Blok tanda tangan (kanan bawah) ---
    const pageHeight = docPdf.internal.pageSize.getHeight();
    let signY = docPdf.lastAutoTable.finalY + 50;
    if (signY > pageHeight - 90) {
      docPdf.addPage();
      signY = 60;
    }

    const printDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const rightX = pageWidth - marginX;

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(10);
    docPdf.text(`Surakarta, ${printDate}`, rightX, signY, { align: "right" });
    docPdf.setFont("helvetica", "bold");
    docPdf.text(profile.name || "-", rightX, signY + 50, { align: "right" });
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(8.5);
    docPdf.text(`NIP ${profile.nip || "-"}`, rightX, signY + 62, { align: "right" });

    const safeName = (profile.name || "staf").replace(/[^a-z0-9]+/gi, "_");
    docPdf.save(`Laporan_${safeName}.pdf`);
  } catch (err) {
    console.error("Gagal membuat PDF:", err);
    toast("Gagal membuat PDF: " + (err.message || "terjadi kesalahan."), "error");
  }
}
