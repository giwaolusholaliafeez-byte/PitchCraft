import type { AiPitchResponse, AiSlidesResponse } from '../domain/ai'
import type { PitchInput, Slide } from '../domain/pitch'

const postJson = async <TResponse>(url: string, body: unknown): Promise<TResponse> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  let payload: unknown = {}

  try {
    payload = responseText ? JSON.parse(responseText) : {}
  } catch {
    if (!response.ok) {
      throw new Error(
        'AI backend is not available. Run `npm run build && npm start` and set OPENAI_API_KEY on the server.',
      )
    }

    throw new Error('AI backend returned an invalid response.')
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : 'AI request failed.'

    throw new Error(message)
  }

  return payload as TResponse
}

export const improvePitchWithAi = (pitch: PitchInput): Promise<AiPitchResponse> =>
  postJson('/api/ai/improve-pitch', { pitch })

export const generateDesignedSlidesWithAi = (
  pitch: PitchInput,
  slides: Slide[],
): Promise<AiSlidesResponse> => postJson('/api/ai/generate-slides', { pitch, slides })
