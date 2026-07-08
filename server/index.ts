import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import OpenAI from 'openai'
import type { PitchInput, Slide } from '../src/domain/pitch.js'
import type { AiPitchResponse, AiSlidesResponse, DesignedSlide } from '../src/domain/ai.js'

const port = Number(process.env.PORT ?? 4173)
const distDir = resolve(process.cwd(), 'dist')
const model = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini'
const maxBodyBytes = 60_000

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const hasConfiguredApiKey = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  return Boolean(
    apiKey &&
      apiKey !== 'your_api_key' &&
      apiKey !== 'sk-proj-your-key-here' &&
      apiKey.startsWith('sk-'),
  )
}

const sendJson = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

const normalizeApiError = (error: unknown): { status: number; message: string } => {
  if (!(error instanceof Error)) {
    return { status: 500, message: 'Unexpected server error.' }
  }

  if (error.name === 'ConfigurationError') {
    return { status: 503, message: 'OPENAI_API_KEY is not configured on the server.' }
  }

  const errorWithStatus = error as Error & { status?: number }
  const rawMessage = error.message

  if (errorWithStatus.status === 401 || /incorrect api key|authentication/i.test(rawMessage)) {
    return { status: 401, message: 'OpenAI authentication failed. Check the server OPENAI_API_KEY value.' }
  }

  if (errorWithStatus.status === 404 || /model/i.test(rawMessage)) {
    return { status: 502, message: 'OpenAI model request failed. Check OPENAI_MODEL or use a model available to your account.' }
  }

  if (errorWithStatus.status === 429) {
    return { status: 429, message: 'OpenAI rate limit reached. Try again later or check account limits.' }
  }

  return { status: 500, message: rawMessage || 'AI request failed.' }
}

const readJsonBody = async (request: IncomingMessage): Promise<unknown> =>
  new Promise((resolveBody, rejectBody) => {
    let body = ''

    request.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8')

      if (Buffer.byteLength(body, 'utf8') > maxBodyBytes) {
        rejectBody(new Error('Request body is too large.'))
        request.destroy()
      }
    })

    request.on('end', () => {
      try {
        resolveBody(JSON.parse(body || '{}'))
      } catch {
        rejectBody(new Error('Request body must be valid JSON.'))
      }
    })

    request.on('error', rejectBody)
  })

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

const handleApi = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed.' })
      return
    }

    const body = await readJsonBody(request)
    const pitch = (body as { pitch?: unknown }).pitch

    if (!isPitchInput(pitch)) {
      sendJson(response, 400, { error: 'Invalid pitch payload.' })
      return
    }

    if (request.url === '/api/ai/improve-pitch') {
      sendJson(response, 200, await improvePitch(pitch))
      return
    }

    if (request.url === '/api/ai/generate-slides') {
      const fallbackSlides = (body as { slides?: unknown }).slides
      const slides = Array.isArray(fallbackSlides) ? fallbackSlides.filter((slide): slide is Slide => {
        const candidate = slide as Partial<Slide>
        return typeof candidate.title === 'string' && isStringArray(candidate.bullets)
      }) : []

      sendJson(response, 200, await generateDesignedSlides(pitch, slides))
      return
    }

    sendJson(response, 404, { error: 'API route not found.' })
  } catch (error) {
    const { message, status } = normalizeApiError(error)
    console.error('API request failed', { url: request.url, message })
    sendJson(response, status, { error: message })
  }
}

const serveStatic = async (request: IncomingMessage, response: ServerResponse) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const rawPath = decodeURIComponent(requestUrl.pathname)
  const relativePath = rawPath === '/' ? 'index.html' : rawPath.slice(1)
  const normalizedPath = normalize(relativePath)

  if (normalizedPath.startsWith('..')) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  const filePath = join(distDir, normalizedPath)

  try {
    const file = await readFile(filePath)
    response.writeHead(200, {
      'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    })
    response.end(file)
  } catch {
    const indexFile = await readFile(join(distDir, 'index.html'))
    response.writeHead(200, { 'content-type': contentTypes['.html'] })
    response.end(indexFile)
  }
}

createServer(async (request, response) => {
  if (request.url?.startsWith('/api/')) {
    await handleApi(request, response)
    return
  }

  await serveStatic(request, response)
}).listen(port, '0.0.0.0', () => {
  console.log(`PitchCraft server listening on http://0.0.0.0:${port}`)
  if (!hasConfiguredApiKey()) {
    console.warn('OPENAI_API_KEY is not configured. AI endpoints will return 503.')
  }
})
