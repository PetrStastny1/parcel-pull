import type { Copy } from '../game/render/board.ts'

const sceneCells = 4

export function createTitleScreen() {
  const element = document.createElement('section')
  element.className = 'title-screen'
  element.hidden = true
  element.setAttribute('aria-labelledby', 'title-logo')
  element.innerHTML = `<div class="title-hero">
      <div class="title-scene" aria-hidden="true">
        <span class="scene-dock" data-parcel="A"><span class="parcel-symbol" data-parcel="A"></span><span class="magnet-arrow">←</span></span>
        ${'<span class="scene-cell"></span>'.repeat(sceneCells)}
        <span class="scene-parcel" data-parcel="A"><span class="parcel-symbol" data-parcel="A"></span></span>
      </div>
      <h1 class="title-logo" id="title-logo"></h1>
    </div>
    <div class="title-panel">
      <dl class="title-progress"></dl>
      <p class="title-notice" role="status"></p>
      <div class="title-actions"></div>
    </div>`
  const logo = element.querySelector<HTMLElement>('.title-logo')!
  const progress = element.querySelector<HTMLElement>('.title-progress')!
  const notice = element.querySelector<HTMLElement>('.title-notice')!
  const actions = element.querySelector<HTMLElement>('.title-actions')!

  function entry(label: string, value: string) {
    const item = document.createElement('div')
    const term = document.createElement('dt')
    term.textContent = label
    const detail = document.createElement('dd')
    detail.textContent = value
    item.append(term, detail)
    return item
  }

  function render(copy: Copy, completed: number, levels: number, stars: number, message: string) {
    logo.textContent = copy('title')
    const starsEntry = entry(copy('earnedStars'), `★ ${stars} / ${levels * 3}`)
    starsEntry.className = 'title-stars'
    progress.replaceChildren(entry(copy('completedLevels'), `${completed} / ${levels}`), starsEntry)
    notice.textContent = message
    notice.hidden = !message
    actions.replaceChildren()
    return actions
  }

  return { element, render }
}
