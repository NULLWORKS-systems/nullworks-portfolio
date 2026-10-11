'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { dbGet } from '../../lib/fieldBackend';

type Row = {
  tag_id: string;
  alias: string;
  kind: string;
  displayed_hours: number | null;
  status: string;
  last_scanned_at: string;
  updated_at: string;
  last_work_on: string | null;
  last_work_note: string | null;
};

type Schedule = {
  tag_id: string;
  cadence?: string | null;
  next_due_on: string | null;
  last_completed_on: string | null;
};

type SortMode = 'NUM' | 'OUT' | 'DUE' | 'LAST';

const bubble: React.CSSProperties = {
  background: 'rgba(2, 8, 6, 0.88)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 18,
  boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
};

function aliasNumber(alias: string) {
  const match = alias.match(/(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function shortDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function byNumber(a: Row, b: Row) {
  const diff = aliasNumber(a.alias) - aliasNumber(b.alias);
  return diff !== 0 ? diff : a.alias.localeCompare(b.alias);
}

function lastWorkOn(row: Row, schedule?: Schedule) {
  return row.last_work_on || schedule?.last_completed_on || null;
}

function dueRank(schedule?: Schedule) {
  const due = schedule?.next_due_on || null;
  const cadence = schedule?.cadence;
  if (!due || cadence === 'NONE') return 3;
  const today = todayISO();
  if (due < today) return 0;
  if (due === today) return 1;
  return 2;
}

function assetClass(kind: string) {
  const k = (kind || '').toUpperCase();
  if (k.includes('BALER')) return 'BALER';
  if (k.includes('FORKLIFT')) return 'FORKLIFT';
  if (k.includes('TUG')) return 'TUGGER';
  if (k.includes('PALLET') || k.includes('JACK')) return 'JACK';
  return 'OTHER';
}

function isRecent(iso: string | null | undefined) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t < 36 * 60 * 60 * 1000;
}

function HoursChart({ title, items, color }: { title: string; items: Row[]; color: string }) {
  const list = items
    .filter((r) => r.displayed_hours !== null && Number.isFinite(Number(r.displayed_hours)))
    .slice()
    .sort((a, b) => Number(b.displayed_hours) - Number(a.displayed_hours));
  if (!list.length) return null;
  const max = Math.max(...list.map((r) => Number(r.displayed_hours)), 1);
  const rowH = 22;
  const labelW = 92;
  const padR = 78;
  const width = 900;
  const height = list.length * rowH + 8;
  return (
    <div style={{ ...bubble, padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', color: '#f4f1e9', marginBottom: 10 }}>{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={Math.min(height, 420)} role="img" aria-label={title}>
        {list.map((r, i) => {
          const hours = Number(r.displayed_hours);
          const barW = ((width - labelW - padR) * hours) / max;
          const y = i * rowH + 2;
          const recent = isRecent(r.last_scanned_at) && r.alias === 'FL13';
          const fill = r.status === 'OUT OF SERVICE' ? '#dc2626' : recent ? '#fde047' : color;
          return (
            <g key={r.tag_id}>
              <text x={0} y={y + 15} fill="#c8c3ba" fontSize={11} fontWeight={700}>
                {r.alias}
              </text>
              <rect x={labelW} y={y + 3} width={barW} height={14} rx={3} fill={fill} />
              <text x={labelW + barW + 6} y={y + 15} fill="#f4f1e9" fontSize={11} fontWeight={700}>
                {hours.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                {r.status === 'OUT OF SERVICE' ? ' OUT' : recent ? ' NEW' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
};

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'NUM', label: '#' },
  { id: 'OUT', label: 'OUT' },
  { id: 'DUE', label: 'DUE' },
  { id: 'LAST', label: 'LAST' },
];

export default function Overview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortMode>('NUM');
  const [refreshedAt, setRefreshedAt] = useState('');

  useEffect(() => {
    const saved = window.sessionStorage.getItem('pmars_overview_sort') as SortMode | null;
    if (saved && SORTS.some((s) => s.id === saved)) setSort(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tags, pm] = await Promise.all([
          dbGet<Row[]>('pmars_tags?select=*'),
          dbGet<Schedule[]>('pmars_pm_schedules?select=tag_id,cadence,next_due_on,last_completed_on'),
        ]);
        if (cancelled) return;
        setRows(tags);
        setSchedules(Object.fromEntries(pm.map((s) => [s.tag_id, s])));
        setError('');
        setRefreshedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      } catch {
        if (!cancelled) setError('Could not load shared fleet data.');
      }
    }
    load();
    const id = window.setInterval(load, 45000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  function chooseSort(next: SortMode) {
    setSort(next);
    window.sessionStorage.setItem('pmars_overview_sort', next);
  }

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const sa = schedules[a.tag_id];
      const sb = schedules[b.tag_id];
      if (sort === 'OUT') {
        const oa = a.status === 'OUT OF SERVICE' ? 0 : 1;
        const ob = b.status === 'OUT OF SERVICE' ? 0 : 1;
        if (oa !== ob) return oa - ob;
        return byNumber(a, b);
      }
      if (sort === 'DUE') {
        const da = dueRank(sa);
        const db = dueRank(sb);
        if (da !== db) return da - db;
        const dueA = sa?.next_due_on || '9999-12-31';
        const dueB = sb?.next_due_on || '9999-12-31';
        if (dueA !== dueB) return dueA.localeCompare(dueB);
        return byNumber(a, b);
      }
      if (sort === 'LAST') {
        const la = lastWorkOn(a, sa) || '0000-00-00';
        const lb = lastWorkOn(b, sb) || '0000-00-00';
        if (la !== lb) return lb.localeCompare(la);
        return byNumber(a, b);
      }
      return byNumber(a, b);
    });
    return list;
  }, [rows, schedules, sort]);

  const groups = useMemo(() => {
    const map: Record<string, Row[]> = { FORKLIFT: [], JACK: [], TUGGER: [], BALER: [], OTHER: [] };
    for (const r of rows) map[assetClass(r.kind)].push(r);
    return map;
  }, [rows]);

  const out = rows.filter((r) => r.status === 'OUT OF SERVICE').length;
  const overdue = rows.filter((r) => dueRank(schedules[r.tag_id]) === 0).length;

  return (
    <main style={{ position: 'relative', minHeight: '100vh', padding: '32px 20px', color: '#fff' }}>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(0,0,0,0.28)', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 3, maxWidth: 960, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header style={{ ...bubble, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.28em', color: '#4ade80' }}>PMARS LIVE</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 900 }}>MAINTENANCE OVERVIEW</h1>
          {refreshedAt && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Charts refresh every 45s · last {refreshedAt}</div>
          )}
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <div style={{ ...bubble, padding: 16 }}>
            <div style={{ fontSize: 30, fontWeight: 900 }}>{rows.length}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>ACTIVE TAGS</div>
          </div>
          <div style={{ ...bubble, padding: 16 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#86efac' }}>{rows.length - out}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>IN SERVICE</div>
          </div>
          <div style={{ ...bubble, padding: 16 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#fca5a5' }}>{out}</div>
            <div style={{ fontSize: 12, color: 'rgba(252,165,165,0.8)' }}>OUT OF SERVICE</div>
          </div>
        </div>

        {rows.length > 0 && (
          <div style={{ display: 'grid', gap: 12 }}>
            <HoursChart title="FORKLIFTS · displayed hours" items={groups.FORKLIFT} color="#86efac" />
            <HoursChart title="PALLET JACKS · displayed hours" items={groups.JACK} color="#f6b73c" />
            <HoursChart title="TUGGERS · displayed hours" items={groups.TUGGER} color="#7dd3fc" />
            <HoursChart title="BALERS · displayed hours" items={groups.BALER} color="#c4b5fd" />
            <div style={{ ...bubble, padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span><span style={{ color: '#86efac' }}>■</span> IN SERVICE</span>
              <span><span style={{ color: '#fde047' }}>■</span> NEW / RECENT</span>
              <span><span style={{ color: '#dc2626' }}>■</span> OUT OF SERVICE</span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {SORTS.map((option) => {
            const active = sort === option.id;
            return (
              <button
                key={option.id}
                onClick={() => chooseSort(option.id)}
                style={{
                  ...bubble,
                  padding: '18px 8px',
                  border: active ? '0' : '1px solid rgba(255,255,255,0.16)',
                  background: active ? '#86efac' : bubble.background,
                  color: active ? '#052e16' : '#fff',
                  fontWeight: 900,
                  fontSize: 16,
                  letterSpacing: '0.06em',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div style={{ ...bubble, padding: '10px 16px', color: 'rgba(255,255,255,0.62)', fontSize: 13, fontWeight: 700 }}>
          {sort === 'NUM' && 'NUMBER ORDER'}
          {sort === 'OUT' && `OUT OF SERVICE FIRST · ${out} DOWN`}
          {sort === 'DUE' && `PM DUE FIRST · ${overdue} OVERDUE`}
          {sort === 'LAST' && 'LAST WORK NEWEST FIRST'}
        </div>
        {error && <p style={{ ...bubble, padding: 16, color: '#fecaca' }}>{error}</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {sorted.map((r) => {
            const schedule = schedules[r.tag_id];
            const lastWork = lastWorkOn(r, schedule);
            const dateLabel = shortDate(lastWork);
            const rank = dueRank(schedule);
            const dueLabel = schedule?.next_due_on && rank < 3 ? shortDate(schedule.next_due_on) : null;
            return (
              <Link key={r.tag_id} href={`/pmar/t/${r.tag_id}`} style={{ ...bubble, padding: 16, display: 'block', color: '#fff', textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>{r.alias}</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{r.kind} · {r.tag_id}</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
                    <span style={{ ...pill, background: r.status === 'IN SERVICE' ? '#22c55e' : '#dc2626', color: r.status === 'IN SERVICE' ? '#052e16' : '#fff' }}>
                      {r.status === 'OUT OF SERVICE' ? 'OUT' : 'IN'}
                    </span>
                    {r.displayed_hours !== null && (
                      <span style={{ ...pill, background: 'rgba(134,239,172,0.16)', color: '#bbf7d0', border: '1px solid rgba(134,239,172,0.28)' }}>
                        {r.displayed_hours} HRS
                      </span>
                    )}
                    <span style={{ ...pill, background: dateLabel ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', color: dateLabel ? '#e5e7eb' : 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {dateLabel ? dateLabel : 'NO PM'}
                    </span>
                    {dueLabel && (
                      <span style={{ ...pill, background: rank === 0 ? '#dc2626' : 'rgba(250,204,21,0.16)', color: rank === 0 ? '#fff' : '#fde68a', border: rank === 0 ? '0' : '1px solid rgba(250,204,21,0.3)' }}>
                        {rank === 0 ? `OVERDUE ${dueLabel}` : `DUE ${dueLabel}`}
                      </span>
                    )}
                  </div>
                </div>
                {r.last_work_note && (
                  <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>{r.last_work_note}</div>
                )}
              </Link>
            );
          })}
          {!rows.length && !error && (
            <p style={{ ...bubble, padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No paired markers yet. The first field scan creates the fleet.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
