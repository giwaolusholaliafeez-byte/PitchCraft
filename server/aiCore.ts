import OpenAI from 'openai'
import type { AiPitchResponse, AiSlidesResponse, DesignedSlide } from '../src/domain/ai.js'
import type { PitchInput, Slide } from '../src/domain/pitch.js'

const model = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type ApiResult = {
  status: number
  body: unknown
}

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

export const isPitchInput = (value: unknown): value is PitchInput => {
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

const hasConfiguredApiKey = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  return Boolean(
    apiKey &&
      apiKey !== 'your_api_key' &&
      apiKey !== 'sk-proj-your-key-here' &&
      apiKey.startsWith('sk-'),
  )
}

const isSlide = (value: unknown): value is DesignedSlide => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<DesignedSlide>

  return (
    typeof candidate.title === 'string' &&
    isStringArray(candidate.bullets) &&
    ['hero', 'problem', 'solution', 'build', 'roadmap'].includes(String(candidate.layout)) &&
    typeof candidate.visualDirection === 'string' &&
    typeof candidate.speakerNote === 'string'
  )
}

const extractJson = (text: string): unknown => {
  const trimmedText = text.trim()
  const fencedMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const jsonText = fencedMatch?.[1] ?? trimmedText

  return JSON.parse(jsonText)
}

const normalizeApiError = (error: unknown): ApiResult => {
  if (!(error instanceof Error)) {
    return { status: 500, body: { error: 'Unexpected server error.' } }
  }

  if (error.name === 'ConfigurationError') {
    return { status: 503, body: { error: 'OPENAI_API_KEY is not configured on the server.' } }
  }

  const errorWithStatus = error as Error & { status?: number }
  const rawMessage = error.message

  if (errorWithStatus.status === 401 || /incorrect api key|authentication/i.test(rawMessage)) {
    return { status: 401, body: { error: 'OpenAI authentication failed. Check the server OPENAI_API_KEY value.' } }
  }

  if (errorWithStatus.status === 404 || /model/i.test(rawMessage)) {
    return {
      status: 502,
      body: { error: 'OpenAI model request failed. Check OPENAI_MODEL or use a model available to your account.' },
    }
  }

  if (errorWithStatus.status === 429) {
    return { status: 429, body: { error: 'OpenAI rate limit reached. Try again later or check account limits.' } }
  }

  return { status: 500, body: { error: rawMessage || 'AI request failed.' } }
}

const createAiResponse = async (instructions: string, input: unknown): Promise<unknown> => {
  if (!hasConfiguredApiKey()) {
    const error = new Error('OPENAI_API_KEY is not configured.')
    error.name = 'ConfigurationError'
    throw error
  }

  const response = await client.responses.create({
    model,
    store: false,
    instructions,
    input: JSON.stringify(input),
  })

  return extractJson(response.output_text)
}

const improvePitch = async (pitch: PitchInput): Promise<AiPitchResponse> => {
  const result = await createAiResponse(
    [
      'You improve hackathon project pitches for Build Beyond submissions.',
      'Return only valid JSON with this exact shape:',
      '{"pitch": PitchInput, "rationale": string[]}',
      'Keep the same project idea. Improve clarity, specificity, judge appeal, and presentation readiness.',
      'PitchInput keys: projectName, tagline, problem, audience, solution, features, techStack, impact, demoPlan, nextSteps.',
      'features, techStack, and nextSteps must be arrays of concise strings.',
    ].join('\n'),
    { pitch },
  )

  if (
    typeof result !== 'object' ||
    result === null ||
    !isPitchInput((result as AiPitchResponse).pitch) ||
    !isStringArray((result as AiPitchResponse).rationale)
  ) {
    throw new Error('AI returned an invalid pitch response.')
  }

  return result as AiPitchResponse
}

const generateDesignedSlides = async (pitch: PitchInput, fallbackSlides: Slide[]): Promise<AiSlidesResponse> => {
  const result = await createAiResponse(
    [
      'You are a product presentation designer for hackathon projects.',
      'Return only valid JSON with this exact shape:',
      '{"slides": DesignedSlide[], "designSystem": {"theme": string, "colors": string[], "typography": string}}',
      'Create exactly five slides for a judge-facing project presentation.',
      'DesignedSlide keys: title, bullets, layout, visualDirection, speakerNote.',
      'layout must be one of: hero, problem, solution, build, roadmap.',
      'Bullets must be concise. visualDirection should describe layout, imagery, and design treatment.',
    ].join('\n'),
    { pitch, fallbackSlides },
  )

  const candidate = result as AiSlidesResponse

  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !Array.isArray(candidate.slides) ||
    candidate.slides.length !== 5 ||
    !candidate.slides.every(isSlide) ||
    typeof candidate.designSystem !== 'object' ||
    candidate.designSystem === null ||
    typeof candidate.designSystem.theme !== 'string' ||
    !isStringArray(candidate.designSystem.colors) ||
    typeof candidate.designSystem.typography !== 'string'
  ) {
    throw new Error('AI returned an invalid slide response.')
  }

  return candidate
}

export const handleAiRoute = async (route: 'improve-pitch' | 'generate-slides', body: unknown): Promise<ApiResult> => {
  try {
    const pitch = (body as { pitch?: unknown }).pitch

    if (!isPitchInput(pitch)) {
      return { status: 400, body: { error: 'Invalid pitch payload.' } }
    }

    if (route === 'improve-pitch') {
      return { status: 200, body: await improvePitch(pitch) }
    }

    const fallbackSlides = (body as { slides?: unknown }).slides
    const slides = Array.isArray(fallbackSlides)
      ? fallbackSlides.filter((slide): slide is Slide => {
          const candidate = slide as Partial<Slide>
          return typeof candidate.title === 'string' && isStringArray(candidate.bullets)
        })
      : []

    return { status: 200, body: await generateDesignedSlides(pitch, slides) }
  } catch (error) {
    const result = normalizeApiError(error)
    console.error('AI route failed', { route, status: result.status, body: result.body })
    return result
  }
}
