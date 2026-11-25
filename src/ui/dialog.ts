import type { Language, MessageKey } from '../i18n/index.ts'
import type { Copy } from '../game/render/board.ts'

export function actionButton(label: string, action: () => void, primary = false) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = primary ? 'action primary' : 'action'
  button.textContent = label
  button.addEventListener('click', action)
  return button
}

export function labeledControl(label: string, control: HTMLElement) {
  const row = document.createElement('label')
  row.className = 'setting-row'
  row.append(label, control)
  return row
}

export function languageSelect(language: Language, copy: Copy, change: (language: Language) => void) {
  const select = document.createElement('select')
  select.append(new Option(copy('languageEnglish'), 'en'), new Option(copy('languageCzech'), 'cs'))
  select.options[0].lang = 'en'
  select.options[1].lang = 'cs'
  select.value = language
  select.addEventListener('change', () => change(select.value === 'cs' ? 'cs' : 'en'))
  return select
}

export function starRating(count: number, maximum: number, label: string) {
  const rating = document.createElement('div')
  rating.className = 'rating'
  rating.setAttribute('role', 'img')
  rating.setAttribute('aria-label', label)
  if (maximum > 3) {
    rating.textContent = `★ ${count} / ${maximum}`
  } else {
    rating.textContent = '★'.repeat(count)
    const empty = document.createElement('span')
    empty.className = 'empty-stars'
    empty.textContent = '☆'.repeat(maximum - count)
    rating.append(empty)
  }
  return rating
}

export function dialogContent(
  dialog: HTMLDialogElement,
  copy: Copy,
  title: MessageKey,
  values: Record<string, string | number>,
  dismiss?: () => void,
) {
  const heading = document.createElement('h1')
  heading.id = 'dialog-title'
  heading.textContent = copy(title, values)
  const details = document.createElement('div')
  details.className = 'dialog-details'
  const actions = document.createElement('div')
  actions.className = 'dialog-actions'
  dialog.toggleAttribute('data-dismissible', dismiss !== undefined)
  if (dismiss) {
    const header = document.createElement('div')
    header.className = 'dialog-header'
    const close = actionButton('×', dismiss)
    close.classList.add('dialog-close')
    close.setAttribute('aria-label', copy('close'))
    header.append(heading, close)
    dialog.replaceChildren(header, details, actions)
  } else {
    dialog.replaceChildren(heading, details, actions)
  }
  return { details, actions }
}
