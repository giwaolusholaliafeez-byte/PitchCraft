import { handleAiRoute } from '../../server/aiCore.js'

type VercelRequest = {
  method?: string
  body?: unknown
}

type VercelResponse = {
  status: (statusCode: number) => {
    json: (body: unknown) => void
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const result = await handleAiRoute('improve-pitch', request.body)
  response.status(result.status).json(result.body)
}
