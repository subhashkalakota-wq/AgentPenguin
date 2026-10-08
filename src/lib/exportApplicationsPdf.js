// Builds a PDF report of the given applications. Loaded on demand so jsPDF
// stays out of the main bundle.

const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  needs_review: 'Needs review',
  discarded: 'Filtered out',
};

const fmtDay = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtStamp = (d) => d.toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
});
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * @param {object}   opts
 * @param {Array}    opts.jobs        rows to export (already filtered + sorted)
 * @param {Function} opts.getDate     job -> Date | null
 * @param {Function} opts.getScore    job -> number
 * @param {Date|null} opts.from       range start (null = no lower bound)
 * @param {Date|null} opts.to         range end (null = no upper bound)
 * @param {string}   opts.rangeLabel  human label for the range, e.g. "Last 7 days"
 * @param {string}   opts.statusLabel e.g. "All statuses"
 * @param {string}   opts.search      active search text, if any
 * @param {string}   opts.userName
 */
export async function exportApplicationsPdf({ jobs, getDate, getScore, from, to, rangeLabel, statusLabel, search, userName, platformLabel, getPlatformLabel = () => '' }) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  // The CommonJS build is wrapped one level deeper under Vite dev than in production builds
  const autoTable = [autoTableModule.default, autoTableModule.default?.default, autoTableModule.autoTable]
    .find(fn => typeof fn === 'function');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;

  const periodText = from || to
    ? `${from ? fmtDay(from) : 'Start'} – ${to ? fmtDay(to) : 'Today'}`
    : 'All time';

  // Title block
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Job Applications Report', margin, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Agent Penguin${userName ? ` · ${userName}` : ''}`, margin, 49);
  doc.text(`Generated ${fmtStamp(new Date())} IST`, pageW - margin, 49, { align: 'right' });

  // Filters + summary
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10.5);
  const filterParts = [`Period: ${periodText}${rangeLabel && !['Custom range', 'All time'].includes(rangeLabel) ? ` (${rangeLabel})` : ''}`, `Status: ${statusLabel}`, `Platform: ${platformLabel || 'All platforms'}`];
  if (search) filterParts.push(`Search: "${search}"`);
  doc.text(filterParts.join('     '), margin, 88);

  const counts = jobs.reduce((acc, j) => { acc[j.status] = (acc[j.status] || 0) + 1; return acc; }, {});
  const summary = [`Total: ${jobs.length}`, ...Object.keys(STATUS_LABELS).filter(k => counts[k]).map(k => `${STATUS_LABELS[k]}: ${counts[k]}`)];
  doc.setFont('helvetica', 'bold');
  doc.text(summary.join('     '), margin, 106);

  autoTable(doc, {
    startY: 120,
    margin: { left: margin, right: margin },
    head: [['#', 'Role', 'Company', 'Platform', 'Location', 'Match', 'Status', 'Applied on', 'Job link']],
    body: jobs.map((job, i) => {
      const d = getDate(job);
      const score = getScore(job);
      return [
        i + 1,
        job.title || '—',
        job.company || '—',
        getPlatformLabel(job),
        job.location || '—',
        score ? `${score}%` : '—',
        STATUS_LABELS[job.status] || 'In queue',
        d ? fmtStamp(d) : '—',
        job.url ? 'Open job' : '—',
      ];
    }),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, valign: 'middle', textColor: [0, 0, 0], lineColor: [228, 228, 228], lineWidth: 0.5 },
    headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 26, halign: 'right' },
      1: { cellWidth: 170 },
      3: { cellWidth: 62 },
      5: { cellWidth: 46, halign: 'right' },
      6: { cellWidth: 76 },
      7: { cellWidth: 104 },
      8: { cellWidth: 58, fontStyle: 'bold' },
    },
    // Role and "Open job" cells link to the job posting
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const url = jobs[data.row.index]?.url;
      if (!url || (data.column.index !== 1 && data.column.index !== 8)) return;
      doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
      if (data.column.index === 8) {
        const textW = doc.getTextWidth('Open job');
        const tx = data.cell.x + data.cell.padding('left');
        const ty = data.cell.y + data.cell.height / 2 + 5;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        doc.line(tx, ty, tx + textW, ty);
      }
    },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageW - margin, pageH - 16, { align: 'right' });
    },
  });

  if (jobs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(97, 97, 97);
    doc.text('No applications in this period.', margin, 170);
  }

  const name = from || to
    ? `applications_${from ? isoDay(from) : 'start'}_to_${isoDay(to || new Date())}.pdf`
    : `applications_all_${isoDay(new Date())}.pdf`;
  doc.save(name);
}
