import { equal, notEqual } from 'node:assert/strict'
import { test } from 'node:test'
import { layoutKey } from './candidates.ts'

test('recognizes rotated, reflected, and relabeled layouts together with their docks', () => {
  const original = { grid: ['.A.', '.#B'], docks: ['N1', 'W1A', 'E2B'] }
  const rotated = { grid: ['..', '#A', 'B.'], docks: ['E1', 'N2A', 'S1B'] }
  const reflectedAndRelabeled = { grid: ['.B.', 'A#.'], docks: ['W2A', 'N3', 'E1B'] }

  equal(layoutKey(original), layoutKey(rotated))
  equal(layoutKey(original), layoutKey(reflectedAndRelabeled))
  notEqual(layoutKey(original), layoutKey({ ...original, docks: ['N2', 'W1A', 'E2B'] }))
})
