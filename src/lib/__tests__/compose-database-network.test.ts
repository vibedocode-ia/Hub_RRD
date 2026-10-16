import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('Compose persists the external database network after every rollout', () => {
  const compose = readFileSync('docker-compose.yaml', 'utf8')
  assert.match(compose, /    networks:\n      - coolify\n/)
  assert.match(compose, /\nnetworks:\n  coolify:\n    external: true\n/)
})
