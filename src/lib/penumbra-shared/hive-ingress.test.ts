import test from 'node:test';
import assert from 'node:assert/strict';
import { HIVE_STARTERS, validHivePath } from './hive-ingress.ts';

test('named project and receipt packets are admitted',()=>{
  for (const entry of HIVE_STARTERS) assert.equal(validHivePath(entry.path),true);
  assert.equal(validHivePath('HIVE_BOOT.yaml'),true);
  assert.equal(validHivePath('hive/projects/PORTUS_LUNARIS/architecture.md'),true);
});
test('paths cannot escape governed text-only scopes',()=>{
  for(const item of [
    '../HIVE_BOOT.yaml', 'hive/current/../../.git/config',
    'hive/secrets/key.yaml', 'hive/current/.env',
    'hive/current/credential.pem', 'hive/current//file.yaml',
    'https://evil.example/a.yaml','hive/current/hello%2Fworld.yaml',
    'hive/current/../events/anything.yaml',
    'hive/events/a.yaml?token=a',
  ]) assert.equal(validHivePath(item),false,item);
});
