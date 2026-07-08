import type { PitchInput, Slide } from './pitch.js'

export type DesignedSlide = Slide & {
  layout: 'hero' | 'problem' | 'solution' | 'build' | 'roadmap'
  visualDirection: string
  speakerNote: string
}

export type AiPitchResponse = {
  pitch: PitchInput
  rationale: string[]
}

export type AiSlidesResponse = {
  slides: DesignedSlide[]
  designSystem: {
    theme: string
    colors: string[]
    typography: string
  }
}
