type SoundEvent = 'move' | 'delivery' | 'blocked' | 'undo' | 'win'

interface Note {
  offset: number
  duration: number
  pitch: number
  endPitch?: number
  type: OscillatorType
}

const masterVolume = 0.2
const events: Record<SoundEvent, readonly Note[]> = {
  move: [{ offset: 0, duration: 0.045, pitch: 330, endPitch: 220, type: 'triangle' }],
  delivery: [{ offset: 0, duration: 0.14, pitch: 495, type: 'sine' }],
  blocked: [{ offset: 0, duration: 0.055, pitch: 145, endPitch: 90, type: 'sine' }],
  undo: [{ offset: 0, duration: 0.09, pitch: 310, endPitch: 170, type: 'triangle' }],
  win: [
    { offset: 0, duration: 0.11, pitch: 392, type: 'sine' },
    { offset: 0.09, duration: 0.11, pitch: 494, type: 'sine' },
    { offset: 0.18, duration: 0.16, pitch: 587, type: 'sine' },
  ],
}

export class GameAudio {
  private output: { context: AudioContext; gain: GainNode } | undefined
  private enabled = true
  private visible = true

  unlock(): void {
    if (typeof AudioContext !== 'function') return

    if (!this.output || this.output.context.state === 'closed') {
      const context = new AudioContext()
      const gain = context.createGain()
      gain.connect(context.destination)
      this.output = { context, gain }
      this.update(this.enabled, this.visible)
    }

    const output = this.output
    if (output.context.state !== 'running') {
      void output.context.resume().catch((error: unknown) => {
        if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') throw error
        if (this.output === output) this.output = undefined
      })
    }
  }

  update(enabled: boolean, visible: boolean): void {
    this.enabled = enabled
    this.visible = visible
    if (this.output) this.output.gain.gain.value = enabled && visible ? masterVolume : 0
  }

  play(event: SoundEvent): void {
    if (!this.output || !this.enabled || !this.visible) return

    const { context, gain } = this.output
    const now = context.currentTime

    for (const note of events[event]) {
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      const start = now + note.offset
      const end = start + note.duration

      oscillator.type = note.type
      oscillator.frequency.setValueAtTime(note.pitch, start)
      if (note.endPitch) oscillator.frequency.exponentialRampToValueAtTime(note.endPitch, end)
      envelope.gain.setValueAtTime(0, start)
      envelope.gain.linearRampToValueAtTime(0.75, start + 0.004)
      envelope.gain.exponentialRampToValueAtTime(0.001, end)

      oscillator.connect(envelope).connect(gain)
      oscillator.start(start)
      oscillator.stop(end)
      oscillator.onended = () => {
        oscillator.disconnect()
        envelope.disconnect()
      }
    }
  }
}
