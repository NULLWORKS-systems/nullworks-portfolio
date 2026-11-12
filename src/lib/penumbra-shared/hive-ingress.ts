import { Buffer } from 'node:buffer';

/**
 * PENUMBRA does not grant models or room members credentials to the private Hive.
 * Only the owner can preview and explicitly attach a bounded source excerpt.
 */
export const HIVE_REPOSITORY = 'NULLWORKS-systems/nullworks-corporate-wifi-hive';
export const HIVE_STARTERS = [
  { label: 'PENUMBRA project handoff (historical)', path: 'hive/current/2026-09-05_penumbra_handoff.yaml' },
  { label: 'Production launch receipt (Nov 12)', path: 'hive/events/2026-11-12T21-26Z_penumbra_production_rollout_receipt.yaml' },
  { label: 'SMTP and passkey plan (Nov 12)', path: 'hive/events/2026-11-12_penumbra_auth_upgrade_plan.yaml' },
] as const;

export type HiveEvidence = { path: string; sha: string; content: string };

export function validHivePath(input: unknown): input is string {
  if (typeof input !== 'string' || input.length < 10 || input.length > 220) return false;
  if (input === 'HIVE_BOOT.yaml') return true;
  if (!/^hive\/(?:current|projects|events)\/[A-Za-z0-9_./-]+\.(?:yaml|yml|md|txt|json)$/.test(input)) return false;
  const parts = input.split('/');
  return parts.every(part => part && part !== '.' && part !== '..' && !part.startsWith('.'));
}

export async function fetchHiveEvidence(path: string): Promise<HiveEvidence> {
  if (!validHivePath(path)) throw new Error('HIVE_PATH_REJECTED');
  const token = process.env.HIVE_GITHUB_TOKEN?.trim();
  if (!token) throw new Error('HIVE_AUTH_NOT_CONFIGURED');

  const url = new URL(
    'https://api.github.com/repos/' + HIVE_REPOSITORY +
      '/contents/' + path.split('/').map(encodeURIComponent).join('/')
  );
  url.searchParams.set('ref','main');

  const res = await fetch(url, {
    method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'NULLWORKS-PENUMBRA-ReadOnly',
    },
  });
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'HIVE_ACCESS_REJECTED' : 'HIVE_READ_FAILED');
  const record = await res.json();
  if (!record || Array.isArray(record) || record.type !== 'file' || record.encoding !== 'base64' ||
      typeof record.content !== 'string' || record.content.length > 18000 || typeof record.sha !== 'string' ||
      !/^[a-f0-9]{40}$/i.test(record.sha) || record.path !== path) throw new Error('HIVE_SOURCE_INVALID');
  if (typeof record.size !== 'number' || record.size > 12000) throw new Error('HIVE_SOURCE_TOO_LARGE');

  const content = Buffer.from(record.content.replace(/\s/g,''), 'base64').toString('utf8');
  if (!content.trim() || Buffer.byteLength(content,'utf8') > 12000 || content.includes('\0')) {
    throw new Error('HIVE_SOURCE_TOO_LARGE');
  }
  return { path, sha: record.sha, content };
}
