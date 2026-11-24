import assert from 'node:assert/strict'
import { test } from 'node:test'
import cs from './cs.json' with { type: 'json' }
import en from './en.json' with { type: 'json' }
import { browserLanguage, translate } from './index.ts'

test('chooses the first supported locale from ordered browser preferences', () => {
  assert.equal(browserLanguage(['de-DE', 'cs-CZ', 'en-GB'], 'de-DE'), 'cs')
  assert.equal(browserLanguage(['en-GB', 'cs-CZ'], 'en-GB'), 'en')
  assert.equal(browserLanguage(['CS-CZ'], 'en'), 'cs')
})

test('uses the primary locale for an empty list and English for unsupported locales', () => {
  assert.equal(browserLanguage([], 'cs-CZ'), 'cs')
  assert.equal(browserLanguage(undefined, 'cs-CZ'), 'cs')
  assert.equal(browserLanguage([], 'fr-FR'), 'en')
  assert.equal(browserLanguage(['de-DE', 'ja-JP'], 'cs-CZ'), 'en')
})

test('keeps both dictionaries complete and interpolation variables aligned', () => {
  assert.deepEqual(Object.keys(cs).sort(), Object.keys(en).sort())

  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assert.ok(en[key].trim())
    assert.ok(cs[key].trim())
    assert.deepEqual(
      cs[key].match(/\{[a-z]+\}/gi)?.sort(),
      en[key].match(/\{[a-z]+\}/gi)?.sort(),
    )
  }
})

test('interpolates positions, counts, and localized directions', () => {
  assert.equal(translate('en', 'moves', { count: 0 }), 'Moves: 0')
  assert.equal(translate('cs', 'moves', { count: 12 }), 'Tahů: 12')
  assert.equal(
    translate('cs', 'dock', { side: translate('cs', 'west'), index: 1, parcel: 'A' }),
    'Dok A, levý okraj, pozice 1',
  )
})
