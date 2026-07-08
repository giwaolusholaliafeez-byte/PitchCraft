import { describe, expect, it } from 'vitest'
import {
  buildPitchSections,
  calculatePitchScore,
  defaultPitch,
  exportPitchMarkdown,
  generateSlides,
  normalizeList,
  type PitchInput,
} from './pitch'

const createPitch = (overrides: Partial<PitchInput> = {}): PitchInput => ({
  ...defaultPitch,
  ...overrides,
})

describe('PitchCraft domain rules', () => {
  it('marks incomplete pitch sections clearly', () => {
    const sections = buildPitchSections(createPitch({ projectName: '', features: ['One feature'] }))

    expect(sections.find((section) => section.id === 'name')?.complete).toBe(false)
    expect(sections.find((section) => section.id === 'features')?.complete).toBe(false)
  })

  it('calculates readiness score from completed pitch sections', () => {
    expect(calculatePitchScore(defaultPitch)).toBe(100)
    expect(calculatePitchScore(createPitch({ tagline: '', problem: '' }))).toBe(78)
  })

  it('normalizes multiline lists without keeping empty rows', () => {
    expect(normalizeList([' React ', '', 'TypeScript'])).toEqual(['React', 'TypeScript'])
  })

  it('generates a five-slide pitch outline', () => {
    const slides = generateSlides(defaultPitch)

    expect(slides).toHaveLength(5)
    expect(slides[0].title).toContain('PitchCraft')
    expect(slides[2].bullets).toContain('Guided pitch fields for problem, audience, solution, impact, and presentation flow')
  })

  it('exports a Devpost-ready Markdown pitch', () => {
    const markdown = exportPitchMarkdown(defaultPitch)

    expect(markdown).toContain('# PitchCraft')
    expect(markdown).toContain('## Project Overview')
    expect(markdown).toContain('# Presentation Outline')
  })
})
