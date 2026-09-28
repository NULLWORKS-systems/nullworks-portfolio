'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { dbGet, dbPatch, dbPost, dbUpsert } from '../../../lib/fieldBackend';

type Row = {
  tag_id: string;
  alias: string;
  kind: string;
  displayed_hours: number | null;
  status: 'IN SERVICE' | 'OUT OF SERVICE';
  paired_at: string;
  updated_at: string;
  last_scanned_at: string;
};

type Schedule = {
  tag_id: string;
  cadence: 'NONE' | 'MONTHLY' | 'QUARTERLY';
  next_due_on: string | null;
  last_completed_on: string | null;
};

type EventRow = {
  event_type: string;
  value_text: string | null;
  created_at: string;
};

const bubble: React.CSSProperties = {
  background: 'rgba(2, 8, 6, 0.88)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 18,
  boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
};

const field: React.CSSProperties = {
  ...bubble,
  width: '100%',
  marginTop: 8,
  padding: 16,
  fontSize: 20,
  fontWeight: 800,
  color: '#fff',
  boxSizing: 'border-box',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function nextDueFor(cadence: Schedule['cadence'], from = todayISO()) {
  if (cadence === 'MONTHLY') return addMonths(from, 1);
  if (cadence === 'QUARTERLY') return addMonths(from, 3);
  return null;
}

function dueState(nextDue: string | null) {
  if (!nextDue) return 'none';
  return nextDue < todayISO() ? 'overdue' : 'ok';
}

export default function PMARTagPage() {
  const params = useParams<{ tag: string }>();
  const tag = useMemo(
    () => decodeURIComponent(params?.tag || '').toUpperCase(),
    [params],
  );
  const [binding, setBinding] = useState<Row | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [lastNote, setLastNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState('');
  const [kind, setKind] = useState('');
  const [hours, setHours] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [confirmStatus, setConfirmStatus] = useState(false);

  async function loadRecord(currentTag: string) {
    const [rows, schedules, events] = await Promise.all([
      dbGet<Row[]>(`pmars_tags?tag_id=eq.${encodeURIComponent(currentTag)}&select=*`),
      dbGet<Schedule[]>(`pmars_pm_schedules?tag_id=eq.${encodeURIComponent(currentTag)}&select=*`),
      dbGet<EventRow[]>(
        `pmars_events?tag_id=eq.${encodeURIComponent(currentTag)}&event_type=eq.STATUS_NOTE&select=event_type,value_text,created_at&order=created_at.desc&limit=1`,
      ),
    ]);
    if (rows[0]) {
      setBinding(rows[0]);
      setHours(rows[0].displayed_hours != null ? String(rows[0].displayed_hours) : '');
    }
    setSchedule(schedules[0] || null);
    setLastNote(events[0]?.value_text || '');
    return rows[0] || null;
  }

  useEffect(() => {
    if (!tag) return;
    (async () => {
      try {
        const row = await loadRecord(tag);
        if (row) {
          await dbPatch(`pmars_tags?tag_id=eq.${encodeURIComponent(tag)}`, {
            last_scanned_at: new Date().toISOString(),
          });
        }
      } catch {
        setError('Shared backend unavailable. Try again.');
      } finally {
        setLoaded(true);
      }
    })();
  }, [tag]);

  async function bind() {
    if (!alias.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const rows = await dbPost<Row[]>('pmars_tags', {
        tag_id: tag,
        alias: alias.trim().toUpperCase(),
        kind: kind.trim() || 'Physical asset',
        displayed_hours: hours.trim() ? Number(hours) : null,
        status: 'IN SERVICE',
      });
      setBinding(rows[0]);
      await dbPost(
        'pmars_events',
        { tag_id: tag, event_type: 'PAIRED', value_text: alias.trim().toUpperCase() },
        'return=minimal',
      );
      if (hours.trim()) {
        await dbPost(
          'pmars_meter_observations',
          {
            tag_id: tag,
            reading: Number(hours),
            meter_type: 'hour_meter',
            meter_source: 'display',
            notes: 'Paired from field scan',
          },
          'return=minimal',
        );
      }
    } catch {
      setError('Could not pair this marker. Check connection and retry.');
    } finally {
      setBusy(false);
    }
  }

  async function saveHours() {
    if (!binding || busy) return;
    const reading = Number(hours);
    if (!Number.isFinite(reading) || reading < 0) {
      setError('Enter a valid hour reading.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const rows = await dbPatch<Row[]>(`pmars_tags?tag_id=eq.${encodeURIComponent(tag)}`, {
        displayed_hours: reading,
        updated_at: new Date().toISOString(),
        last_scanned_at: new Date().toISOString(),
      });
      setBinding(rows[0]);
      await dbPost(
        'pmars_meter_observations',
        {
          tag_id: tag,
          reading,
          meter_type: 'hour_meter',
          meter_source: 'display',
          notes: 'Updated from field scan',
        },
        'return=minimal',
      );
      await dbPost(
        'pmars_events',
        { tag_id: tag, event_type: 'HOURS_UPDATED', value_text: String(reading) },
        'return=minimal',
      );
    } catch {
      setError('Hour update failed. Retry.');
    } finally {
      setBusy(false);
    }
  }

  async function applyStatus() {
    if (!binding || busy) return;
    const note = statusNote.trim();
    if (note.length < 4) {
      setError('Write what you saw before changing service state.');
      return;
    }
    setBusy(true);
    setError('');
    const status = binding.status === 'IN SERVICE' ? 'OUT OF SERVICE' : 'IN SERVICE';
    try {
      const rows = await dbPatch<Row[]>(`pmars_tags?tag_id=eq.${encodeURIComponent(tag)}`, {
        status,
        updated_at: new Date().toISOString(),
        last_scanned_at: new Date().toISOString(),
      });
      setBinding(rows[0]);
      await dbPost(
        'pmars_events',
        { tag_id: tag, event_type: 'STATUS', value_text: status },
        'return=minimal',
      );
      const noteText = `${status} — ${note}`;
      await dbPost(
        'pmars_events',
        { tag_id: tag, event_type: 'STATUS_NOTE', value_text: noteText },
        'return=minimal',
      );
      setLastNote(noteText);
      setStatusNote('');
      setConfirmStatus(false);
    } catch {
      setError('Status update failed. Retry.');
    } finally {
      setBusy(false);
    }
  }

  async function saveCadence(cadence: Schedule['cadence']) {
    if (!binding || busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = {
        tag_id: tag,
        cadence,
        next_due_on: nextDueFor(cadence),
        last_completed_on: schedule?.last_completed_on || null,
        updated_at: new Date().toISOString(),
      };
      const rows = await dbUpsert<Schedule[]>('pmars_pm_schedules', payload, 'tag_id');
      setSchedule(rows[0]);
      await dbPost(
        'pmars_events',
        { tag_id: tag, event_type: 'PM_SCHEDULED', value_text: cadence },
        'return=minimal',
      );
    } catch {
      setError('Could not save PM cadence.');
    } finally {
      setBusy(false);
    }
  }

  async function completePm() {
    if (!binding || busy) return;
    const cadence = schedule?.cadence && schedule.cadence !== 'NONE' ? schedule.cadence : 'MONTHLY';
    setBusy(true);
    setError('');
    try {
      const payload = {
        tag_id: tag,
        cadence,
        last_completed_on: todayISO(),
        next_due_on: nextDueFor(cadence),
        updated_at: new Date().toISOString(),
      };
      const rows = await dbUpsert<Schedule[]>('pmars_pm_schedules', payload, 'tag_id');
      setSchedule(rows[0]);
      await dbPost(
        'pmars_events',
        { tag_id: tag, event_type: 'PM_COMPLETED', value_text: `${cadence} · next ${payload.next_due_on}` },
        'return=minimal',
      );
    } catch {
      setError('Could not close this PM.');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <main style={{ minHeight: '100vh' }} />;

  const inService = binding?.status === 'IN SERVICE';
  const nextStatus = inService ? 'OUT OF SERVICE' : 'IN SERVICE';
  const due = dueState(schedule?.next_due_on || null);

  return (
    <main style={{ position: 'relative', minHeight: '100vh', padding: '32px 20px', color: '#fff' }}>
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(0,0,0,0.28)', zIndex: 0 }}
      />
      <div style={{ position: 'relative', zIndex: 3, maxWidth: 440, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header style={{ ...bubble, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.28em', color: '#4ade80' }}>PMARS LIVE</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 900 }}>{tag || 'UNKNOWN TAG'}</h1>
        </header>

        {error && (
          <div style={{ ...bubble, padding: 16, borderColor: 'rgba(248,113,113,0.45)', color: '#fecaca' }}>{error}</div>
        )}

        {!binding ? (
          <section style={{ ...bubble, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: '#4ade80' }}>NEW TRIANGLE</div>
            <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 900 }}>What did you put this on?</h2>
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.62)' }}>Pair this marker once. The record will then be shared across every device.</p>
            <label style={{ display: 'block', marginTop: 24, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>Asset ID</label>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="PJ53" style={field} />
            <label style={{ display: 'block', marginTop: 16, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>Type</label>
            <input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Toyota pallet jack" style={field} />
            <label style={{ display: 'block', marginTop: 16, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>Displayed hours</label>
            <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="1624" style={field} />
            <button disabled={busy} onClick={bind} style={{ width: '100%', marginTop: 24, padding: 20, borderRadius: 16, border: 0, background: '#22c55e', color: '#052e16', fontWeight: 900, fontSize: 18 }}>
              {busy ? 'PAIRING...' : 'PAIR THIS TRIANGLE'}
            </button>
          </section>
        ) : (
          <>
            <section style={{ ...bubble, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>YOU SCANNED</div>
              <h2 style={{ margin: '4px 0 0', fontSize: 48, fontWeight: 900 }}>{binding.alias}</h2>
              <p style={{ marginTop: 4, color: 'rgba(255,255,255,0.58)' }}>{binding.kind}</p>
              <div style={{ width: '100%', marginTop: 24, padding: 20, borderRadius: 16, fontWeight: 900, fontSize: 20, background: inService ? '#22c55e' : '#dc2626', color: inService ? '#052e16' : '#fff' }}>
                {binding.status}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', fontSize: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>PMARS point</span>
                <strong>{tag}</strong>
              </div>
              {lastNote && (
                <p style={{ marginTop: 16, color: 'rgba(254,202,202,0.9)', fontSize: 14, lineHeight: 1.4 }}>{lastNote}</p>
              )}
            </section>

            <section style={{ ...bubble, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: '#4ade80' }}>HOURS</div>
              <label style={{ display: 'block', marginTop: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>Displayed hours</label>
              <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2142" style={field} />
              <button disabled={busy} onClick={saveHours} style={{ width: '100%', marginTop: 16, padding: 18, borderRadius: 16, border: 0, background: '#86efac', color: '#052e16', fontWeight: 900, fontSize: 16 }}>
                {busy ? 'SAVING...' : 'UPDATE HOURS'}
              </button>
            </section>

            <section style={{ ...bubble, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: '#4ade80' }}>SERVICE STATE</div>
              <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.62)' }}>
                Changing state requires a note. Do not tap a dead jack back into service with no reason.
              </p>
              {!confirmStatus ? (
                <button
                  disabled={busy}
                  onClick={() => { setConfirmStatus(true); setError(''); }}
                  style={{ width: '100%', marginTop: 16, padding: 18, borderRadius: 16, border: 0, background: inService ? '#dc2626' : '#22c55e', color: inService ? '#fff' : '#052e16', fontWeight: 900, fontSize: 16 }}
                >
                  MARK {nextStatus}
                </button>
              ) : (
                <>
                  <label style={{ display: 'block', marginTop: 16, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>What did you see?</label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder={inService ? 'No lift under load. Red tagged.' : 'Lift verified under load. Returned to service.'}
                    rows={4}
                    style={{ ...field, fontSize: 16, fontWeight: 600, resize: 'vertical' }}
                  />
                  <button disabled={busy} onClick={applyStatus} style={{ width: '100%', marginTop: 16, padding: 18, borderRadius: 16, border: 0, background: inService ? '#dc2626' : '#22c55e', color: inService ? '#fff' : '#052e16', fontWeight: 900, fontSize: 16 }}>
                    CONFIRM {nextStatus}
                  </button>
                  <button disabled={busy} onClick={() => { setConfirmStatus(false); setStatusNote(''); }} style={{ width: '100%', marginTop: 10, padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 800 }}>
                    CANCEL
                  </button>
                </>
              )}
            </section>

            <section style={{ ...bubble, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: '#4ade80' }}>PM CADENCE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 16 }}>
                {(['NONE', 'MONTHLY', 'QUARTERLY'] as const).map((cadence) => {
                  const active = (schedule?.cadence || 'NONE') === cadence;
                  return (
                    <button
                      key={cadence}
                      disabled={busy}
                      onClick={() => saveCadence(cadence)}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: active ? '0' : '1px solid rgba(255,255,255,0.16)',
                        background: active ? '#86efac' : 'transparent',
                        color: active ? '#052e16' : '#fff',
                        fontWeight: 900,
                        fontSize: 11,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {cadence}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, color: due === 'overdue' ? '#fecaca' : 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                {schedule?.cadence && schedule.cadence !== 'NONE'
                  ? `Next due ${schedule.next_due_on || 'unset'}${due === 'overdue' ? ' · OVERDUE' : ''}`
                  : 'No recurring PM set'}
              </div>
              {schedule?.last_completed_on && (
                <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                  Last completed {schedule.last_completed_on}
                </div>
              )}
              <button disabled={busy} onClick={completePm} style={{ width: '100%', marginTop: 16, padding: 18, borderRadius: 16, border: 0, background: '#22c55e', color: '#052e16', fontWeight: 900, fontSize: 16 }}>
                PM DONE TODAY
              </button>
            </section>

            <p style={{ ...bubble, padding: 16, color: '#bbf7d0', fontWeight: 700 }}>
              LIVE SHARED RECORD · hours, status notes, and PM dates persist across devices.
            </p>
          </>
        )}

        <a href="/pmar/overview" style={{ ...bubble, display: 'block', padding: 16, textAlign: 'center', color: '#86efac', fontWeight: 900, textDecoration: 'none' }}>
          OPEN MAINTENANCE OVERVIEW
        </a>
        <p style={{ ...bubble, padding: '12px 16px', textAlign: 'center', letterSpacing: '0.16em', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.55)' }}>
          FIND BLUE. SCAN BLUE.
        </p>
      </div>
    </main>
  );
}
