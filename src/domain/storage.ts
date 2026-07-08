import { defaultPitchState, type PitchInput, type PitchState } from './pitch'

const STORAGE_KEY = 'pitchcraft-state-v1'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isPitchInput = (value: unknown): value is PitchInput => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<PitchInput>

  return (
    typeof candidate.projectName === 'string' &&
    typeof candidate.tagline === 'string' &&
    typeof candidate.problem === 'string' &&
    typeof candidate.audience === 'string' &&
    typeof candidate.solution === 'string' &&
    isStringArray(candidate.features) &&
    isStringArray(candidate.techStack) &&
    typeof candidate.impact === 'string' &&
    typeof candidate.demoPlan === 'string' &&
    isStringArray(candidate.nextSteps)
  )
}

const isPitchState = (value: unknown): value is PitchState => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<PitchState>

  return (
    isPitchInput(candidate.input) &&
    Array.isArray(candidate.savedPitches) &&
    candidate.savedPitches.every(isPitchInput)
  )
}

export const loadPitchState = (): PitchState => {
  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY)

    if (!rawState) {
      return defaultPitchState
    }

    const parsedState: unknown = JSON.parse(rawState)

    if (!isPitchState(parsedState)) {
      return defaultPitchState
    }

    return parsedState
  } catch (error) {
    console.error('Failed to load PitchCraft state', error)
    return defaultPitchState
  }
}

export const savePitchState = (state: PitchState): boolean => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (error) {
    console.error('Failed to save PitchCraft state', error)
    return false
  }
}

export const clearPitchState = (): boolean => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Failed to clear PitchCraft state', error)
    return false
  }
}
