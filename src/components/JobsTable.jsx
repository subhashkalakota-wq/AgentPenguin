import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  RefreshCw,
  Zap,
  X,
  Inbox,
  CalendarDays,
  Download,
  Loader2
} from 'lucide-react';
import { PLATFORMS, platformOf } from '../data/platforms';
import { authFetch } from '../lib/api';

const DATE_OPTIONS = [
  { label: 'All time',     value: 'all' },
  { label: 'Today',        value: 'today' },
  { label: 'Yesterday',    value: 'yesterday' },
  { label: 'Last 7 days',  value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This month',   value: 'month' },
  { label: 'Custom range', value: 'custom' },
];

const STATUS_TABS = [
  { key: 'all',          label: 'All' },
  { key: 'applied',      label: 'Applied' },
  { key: 'shortlisted',  label: 'Shortlisted' },
  { key: 'needs_review', label: 'Needs review' },
  { key: 'discarded',    label: 'Filtered out' },
];

const STATUS_META = {
  applied:      { label: 'Applied',      cls: 'applied',  icon: CheckCircle2 },
  shortlisted:  { label: 'Shortlisted',  cls: 'short',    icon: Sparkles },
  needs_review: { label: 'Needs review', cls: 'review',   icon: AlertTriangle },
  discarded:    { label: 'Filtered out', cls: 'discard',  icon: XCircle },
};

const PAGE_SIZE = 15;

// appliedAt is either an ISO string or a time-only string like "10:42 AM" (assumed today)
function parseAppliedDate(appliedAt) {
  if (!appliedAt) return null;
  const iso = new Date(appliedAt);
  if (!isNaN(iso.getTime())) return iso;
  const [time, meridiem] = String(appliedAt).split(' ');
  const [h, m] = (time || '').split(':');
  let hours = parseInt(h, 10);
  if (isNaN(hours)) return null;
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, parseInt(m, 10) || 0, 0, 0);
  return d;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// "YYYY-MM-DD" from <input type="date"> → local Date
const parseInputDate = (v) => {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Resolves the selected preset (or custom From/To) into inclusive { from, to } bounds
function getRangeBounds(range, customFrom, customTo) {
  const today = new Date();
  switch (range) {
    case 'today':     return { from: startOfDay(today), to: endOfDay(today) };
    case 'yesterday': return { from: startOfDay(addDays(today, -1)), to: endOfDay(addDays(today, -1)) };
    case '7d':        return { from: startOfDay(addDays(today, -6)), to: endOfDay(today) };
    case '30d':       return { from: startOfDay(addDays(today, -29)), to: endOfDay(today) };
    case 'month':     return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: endOfDay(today) };
    case 'custom': {
      const from = parseInputDate(customFrom);
      const to = parseInputDate(customTo);
      return { from: from ? startOfDay(from) : null, to: to ? endOfDay(to) : null };
    }
    default:          return { from: null, to: null };
  }
}

function isWithinBounds(date, { from, to }) {
  if (!from && !to) return true;
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const getScore = (job) => job.matchScore || job.match_score || 0;
const getDate = (job) => parseAppliedDate(job.applied_at || job.appliedAt);

function formatDate(date) {
  if (!date) return { day: '—', time: '' };
  return {
    day: date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

function scoreTone(score) {
  if (score >= 85) return 'high';
  if (score >= 70) return 'mid';
  return 'low';
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: 'In queue', cls: 'queued' };
  return (
    <span className={`pg-jstatus pg-jstatus-${meta.cls}`}>
      <span className="pg-jstatus-dot" />
      {meta.label}
    </span>
  );
}

// Monochrome letter mark. Scraped/mock logo URLs are unreliable (often stock photos), so we don't render them.
export function CompanyLogo({ job, size = 34 }) {
  const letter = (job.company || '?').trim().charAt(0).toUpperCase();
  return (
    <span className="pg-logo" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {letter}
    </span>
  );
}

function SortHeader({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th className={className} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`pg-sort-btn ${active ? 'active' : ''}`} onClick={() => onSort(sortKey)}>
        {label}
        <Icon size={13} />
      </button>
    </th>
  );
}

export default function JobsTable({
  jobs,
  onSelectJob,
  activeJobId,
  onViewDetail,
  isLoadingFromDB,
  onRefresh,
  isProfileComplete = true,
  onIncompleteProfile,
  userName = '',
  onFinishReview
}) {
  const [filterTab, setFilterTabRaw] = useState('all');
  const [searchQuery, setSearchQueryRaw] = useState('');
  const [dateFilter, setDateFilterRaw] = useState('all');
  const [platformFilter, setPlatformFilterRaw] = useState('all');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);

  // Any filter change jumps back to the first page
  const withPageReset = (setter) => (value) => { setter(value); setPage(1); };
  const setFilterTab = withPageReset(setFilterTabRaw);
  const setSearchQuery = withPageReset(setSearchQueryRaw);
  const setDateFilter = withPageReset(setDateFilterRaw);
  const setPlatformFilter = withPageReset(setPlatformFilterRaw);
  const [customFrom, setCustomFromRaw] = useState(() => toInputDate(addDays(new Date(), -6)));
  const [todayInput] = useState(() => toInputDate(new Date()));
  const [customTo, setCustomToRaw] = useState(todayInput);
  const setCustomFrom = withPageReset(setCustomFromRaw);
  const setCustomTo = withPageReset(setCustomToRaw);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchApplying, setBatchApplying] = useState(false);

  const bounds = useMemo(
    () => getRangeBounds(dateFilter, customFrom, customTo),
    [dateFilter, customFrom, customTo]
  );
  const invalidRange = Boolean(bounds.from && bounds.to && bounds.from > bounds.to);

  // Jobs matching date range + search (status counts are based on this)
  const scopedJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return jobs.filter(job => {
      if (q && ![job.title, job.company, job.location].some(v => v?.toLowerCase().includes(q))) return false;
      if (platformFilter !== 'all' && platformOf(job) !== platformFilter) return false;
      return isWithinBounds(getDate(job), bounds);
    });
  }, [jobs, searchQuery, bounds, platformFilter]);

  const counts = useMemo(() => {
    const c = { all: scopedJobs.length, applied: 0, shortlisted: 0, needs_review: 0, discarded: 0 };
    scopedJobs.forEach(j => { if (c[j.status] != null) c[j.status] += 1; });
    return c;
  }, [scopedJobs]);

  const filteredJobs = useMemo(() => {
    const list = scopedJobs.filter(job => filterTab === 'all' || job.status === filterTab);

    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.key === 'score') return (getScore(a) - getScore(b)) * dir;
      if (sort.key === 'company') return (a.company || '').localeCompare(b.company || '') * dir;
      const da = getDate(a)?.getTime() ?? 0;
      const db = getDate(b)?.getTime() ?? 0;
      return (da - db) * dir;
    });
  }, [scopedJobs, filterTab, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageJobs = filteredJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (key) => {
    setPage(1);
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'company' ? 'asc' : 'desc' });
  };

  const toggleSelectJob = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allPageSelected = pageJobs.length > 0 && pageJobs.every(j => selectedIds.has(j.id));
  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageJobs.forEach(j => (allPageSelected ? next.delete(j.id) : next.add(j.id)));
      return next;
    });
  };

  const handleApplySelected = async () => {
    if (selectedIds.size === 0) return;
    if (!isProfileComplete) {
      if (onIncompleteProfile) onIncompleteProfile();
      return;
    }
    setBatchApplying(true);
    try {
      await authFetch('/api/apply-batch', {
        method: 'POST',
        body: JSON.stringify({ jobIds: Array.from(selectedIds) })
      });
      setSelectedIds(new Set());
    } catch (e) {
      console.error('Batch apply error:', e);
    } finally {
      setBatchApplying(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const { exportApplicationsPdf } = await import('../lib/exportApplicationsPdf');
      await exportApplicationsPdf({
        jobs: filteredJobs,
        getDate,
        getScore,
        from: bounds.from,
        to: dateFilter === 'all' ? null : bounds.to,
        rangeLabel: DATE_OPTIONS.find(o => o.value === dateFilter)?.label,
        statusLabel: filterTab === 'all' ? 'All statuses' : STATUS_TABS.find(t => t.key === filterTab)?.label,
        search: searchQuery.trim(),
        platformLabel: platformFilter === 'all' ? 'All platforms' : PLATFORMS.find(p => p.key === platformFilter)?.label,
        getPlatformLabel: (job) => PLATFORMS.find(p => p.key === platformOf(job))?.label || '—',
        userName,
      });
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('Could not generate the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = filterTab !== 'all' || searchQuery || dateFilter !== 'all' || platformFilter !== 'all';
  const clearFilters = () => { setFilterTab('all'); setSearchQuery(''); setDateFilter('all'); setPlatformFilter('all'); };

  return (
    <div className="pg-card pg-table-card">
      {/* Title row */}
      <div className="pg-table-head">
        <div>
          <h2 className="pg-card-title">Applications</h2>
          <p className="pg-card-sub">
            {filteredJobs.length} of {jobs.length} jobs
            {isLoadingFromDB && <span className="pg-syncing"><RefreshCw size={12} className="pg-spin" /> Syncing…</span>}
          </p>
        </div>
        <div className="pg-table-tools">
          <div className="pg-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search role, company, location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search applications"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} title="Clear search" aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>
          <select
            className="pg-select"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            aria-label="Filter by platform"
          >
            <option value="all">All platforms</option>
            {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          {onRefresh && (
            <button className="pg-icon-btn" onClick={onRefresh} title="Refresh from Supabase" aria-label="Refresh">
              <RefreshCw size={15} className={isLoadingFromDB ? 'pg-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Date range + export */}
      <div className="pg-date-bar">
        <div className="pg-date-presets" role="group" aria-label="Date range">
          <CalendarDays size={16} className="pg-date-icon" />
          {DATE_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              className={`pg-chip ${dateFilter === o.value ? 'active' : ''}`}
              aria-pressed={dateFilter === o.value}
              onClick={() => setDateFilter(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="pg-date-right">
          {dateFilter === 'custom' && (
            <div className={`pg-date-inputs ${invalidRange ? 'is-invalid' : ''}`}>
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  max={todayInput}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          )}
          <button
            type="button"
            className="pg-btn pg-btn-primary"
            onClick={handleExportPdf}
            disabled={exporting || invalidRange}
            title={`Download the ${filteredJobs.length} jobs shown as a PDF`}
          >
            {exporting ? <Loader2 size={14} className="pg-spin" /> : <Download size={14} />}
            {exporting ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
        {invalidRange && <p className="pg-date-error">“From” date must be on or before “To” date.</p>}
      </div>

      {/* Status segmented filter */}
      <div className="pg-segments" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={filterTab === t.key}
            className={`pg-segment ${filterTab === t.key ? 'active' : ''}`}
            onClick={() => setFilterTab(t.key)}
          >
            {t.label}
            <span className="pg-segment-count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="pg-bulk-bar">
          <span><strong>{selectedIds.size}</strong> selected</span>
          <div className="pg-bulk-actions">
            <button className="pg-btn pg-btn-primary" onClick={handleApplySelected} disabled={batchApplying}>
              <Zap size={14} />
              {batchApplying ? 'Applying…' : 'Apply to selected'}
            </button>
            <button className="pg-btn pg-btn-ghost" onClick={() => setSelectedIds(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="pg-table-scroll">
        <table className="pg-table">
          <thead>
            <tr>
              <th className="pg-col-check">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectPage}
                  aria-label="Select all on this page"
                />
              </th>
              <SortHeader label="Company" sortKey="company" sort={sort} onSort={handleSort} className="pg-col-company" />
              <th className="pg-col-role">Role</th>
              <th className="pg-col-loc">Location</th>
              <SortHeader label="Match" sortKey="score" sort={sort} onSort={handleSort} className="pg-col-score" />
              <th className="pg-col-status">Status</th>
              <SortHeader label="Applied" sortKey="date" sort={sort} onSort={handleSort} className="pg-col-date" />
              <th className="pg-col-actions"><span className="pg-sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {pageJobs.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="pg-empty">
                    <Inbox size={28} />
                    <strong>{isLoadingFromDB ? 'Loading your applications…' : hasFilters ? 'No jobs match these filters' : 'No applications yet'}</strong>
                    <span>{hasFilters ? 'Try a different status, date range or search term.' : 'Start the agent to discover and apply to jobs.'}</span>
                    {hasFilters && !isLoadingFromDB && (
                      <button className="pg-btn" onClick={clearFilters}>Clear filters</button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageJobs.map((job) => {
                const score = getScore(job);
                const date = formatDate(getDate(job));
                const isSelected = selectedIds.has(job.id);
                return (
                  <tr
                    key={job.id}
                    className={`${job.id === activeJobId ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onSelectJob(job)}
                  >
                    <td className="pg-col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectJob(job.id)}
                        aria-label={`Select ${job.title} at ${job.company}`}
                      />
                    </td>
                    <td className="pg-col-company">
                      <div className="pg-company">
                        <CompanyLogo job={job} size={32} />
                        <span className="pg-company-text">
                          <span className="pg-company-name" title={job.company}>{job.company || '—'}</span>
                          <span className="pg-platform-tag">{PLATFORMS.find(p => p.key === platformOf(job))?.label}</span>
                        </span>
                      </div>
                    </td>
                    <td className="pg-col-role">
                      <span className="pg-role-title" title={job.title}>{job.title || '—'}</span>
                    </td>
                    <td className="pg-col-loc">
                      <span className="pg-loc" title={job.location}>{job.location || '—'}</span>
                    </td>
                    <td className="pg-col-score">
                      {score ? (
                        <div className={`pg-score pg-score-${scoreTone(score)}`}>
                          <span className="pg-score-num">{score}%</span>
                          <span className="pg-score-track"><span style={{ width: `${score}%` }} /></span>
                        </div>
                      ) : <span className="pg-muted">—</span>}
                    </td>
                    <td className="pg-col-status">
                      <StatusBadge status={job.status} />
                      {job.status === 'needs_review' && job.reviewReason && (
                        <span className="pg-review-reason" title={job.reviewDetail || job.reviewReason}>{job.reviewReason}</span>
                      )}
                      {job.status === 'applied' && job.pipelineStage && (
                        <span className={`pg-stage pg-stage-sm is-${job.pipelineStage}`} title="From your email">
                          {{ interview: 'Interview', assessment: 'Assessment', offer: 'Offer', rejected: 'Not selected', viewed: 'Viewed', confirmation: 'Received' }[job.pipelineStage] || job.pipelineStage}
                          {job.pipelineWhen && ` · ${new Date(job.pipelineWhen).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        </span>
                      )}
                      {job.status === 'applied' && job.followUpSentAt && !['interview', 'offer', 'rejected'].includes(job.pipelineStage) && (
                        <span className="pg-review-reason">Followed up {new Date(job.followUpSentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      )}
                      {job.status === 'needs_review' && onFinishReview && (
                        <button
                          type="button"
                          className="pg-finish-btn"
                          onClick={(e) => { e.stopPropagation(); onFinishReview(job); }}
                        >
                          {job.reviewQuestions?.length ? `Answer ${job.reviewQuestions.length} & finish` : 'Finish'}
                        </button>
                      )}
                    </td>
                    <td className="pg-col-date">
                      <span className="pg-date">{date.day}</span>
                      {date.time && <span className="pg-time">{date.time}</span>}
                    </td>
                    <td className="pg-col-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="pg-row-actions">
                        <button
                          className="pg-view-btn"
                          onClick={() => (onViewDetail ? onViewDetail(job) : onSelectJob(job))}
                        >
                          View
                        </button>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            className="pg-icon-btn"
                            title="Open on LinkedIn"
                            aria-label="Open on LinkedIn"
                          >
                            <ArrowUpRight size={15} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredJobs.length > PAGE_SIZE && (
        <div className="pg-pagination">
          <span>
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length}
          </span>
          <div className="pg-pagination-btns">
            <button className="pg-icon-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">
              <ChevronLeft size={15} />
            </button>
            <span className="pg-page-num">{currentPage} / {pageCount}</span>
            <button className="pg-icon-btn" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
