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
  last_completed_on: string | null;
};

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

const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
};

export default function Overview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      dbGet<Row[]>('pmars_tags?select=*'),
      dbGet<Schedule[]>('pmars_pm_schedules?select=tag_id,last_completed_on'),
    ])
      .then(([tags, pm]) => {
        setRows(tags);
        setSchedules(Object.fromEntries(pm.map((s) => [s.tag_id, s])));
      })
      .catch(() => setError('Could not load shared fleet data.'));
  }, []);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const diff = aliasNumber(a.alias) - aliasNumber(b.alias);
        return diff !== 0 ? diff : a.alias.localeCompare(b.alias);
      }),
    [rows],
  );

  const out = rows.filter((r) => r.status === 'OUT OF SERVICE').length;

  return (
    <main style={{ position: 'relative', minHeight: '100vh', padding: '32px 20px', color: '#fff' }}>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(0,0,0,0.28)', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 3, maxWidth: 960, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header style={{ ...bubble, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.28em', color: '#4ade80' }}>PMARS LIVE</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 900 }}>MAINTENANCE OVERVIEW</h1>
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
        {error && <p style={{ ...bubble, padding: 16, color: '#fecaca' }}>{error}</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {sorted.map((r) => {
            const lastWork = r.last_work_on || schedules[r.tag_id]?.last_completed_on || null;
            const dateLabel = shortDate(lastWork);
            return (
              <Link key={r.tag_id} href={`/pmar/t/${r.tag_id}`} style={{ ...bubble, padding: 16, display: 'block', color: '#fff', textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>{r.alias}</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{r.kind} · {r.tag_id}</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
                    <span style={{ ...pill, background: r.status === 'IN SERVICE' ? '#22c55e' : '#dc2626', color: r.status === 'IN SERVICE' ? '#052e16' : '#fff' }}>
                      {r.status}
                    </span>
                    {r.displayed_hours !== null && (
                      <span style={{ ...pill, background: 'rgba(134,239,172,0.16)', color: '#bbf7d0', border: '1px solid rgba(134,239,172,0.28)' }}>
                        {r.displayed_hours} HRS
                      </span>
                    )}
                    <span style={{ ...pill, background: dateLabel ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', color: dateLabel ? '#e5e7eb' : 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {dateLabel ? dateLabel : 'NO PM'}
                    </span>
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
