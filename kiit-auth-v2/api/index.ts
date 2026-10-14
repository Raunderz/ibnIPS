// Vercel serverless entry.
//
// Plain TypeScript on purpose: this file is not compiled from Civet, so it
// avoids that layer entirely. Only `src/` is Civet.
//
// Uses the Node-style `(req, res)` signature rather than a Web-standard
// `fetch` export, because that format is accepted by every Vercel runtime
// including Bun — so the deployment does not depend on newer Web-handler
// support being enabled for the plan.
//
// The bridge is hand-rolled rather than pulled from an adapter package: it is
// short, has no runtime dependency, and keeps `@types/node` types out of the
// request path.

import type { IncomingMessage, ServerResponse } from 'node:http'

import { buildApp } from '../build/src/app.ts'

const app = buildApp()

type VercelRequest = IncomingMessage & { body?: unknown }

type VercelResponse = ServerResponse

function originFor(req: VercelRequest): string {
  const forwardedHost = req.headers['x-forwarded-host']
  const host = forwardedHost ?? req.headers.host ?? 'localhost'
  const proto = req.headers['x-forwarded-proto'] ?? 'https'
  const hostname = (Array.isArray(host) ? host[0] : host) ?? 'localhost'

  return hostname.includes('://') ? hostname : `${proto}://${hostname}`
}

/**
 * Coerce whatever Vercel put in `req.body` into something `Request` accepts.
 *
 * Vercel parses a JSON request body into `req.body` as a plain object rather
 * than leaving it as text. Handing that straight to `Request` coerces it via
 * `toString`, so the body arrives as `[object Object]` — not JSON — and Elysia
 * rejects it before the handler runs. Every sign-in would fail with a bare 400
 * that gives no hint the deployment was at fault.
 *
 * The other shapes are passed through untouched: a Buffer or string is already
 * valid, and a stream is left alone so it is not consumed here.
 */
function requestBody(body: unknown): BodyInit | null {
  if (body === undefined || body === null) return null
  if (typeof body === 'string') return body
  if (body instanceof Uint8Array) return body as BodyInit
  if (typeof (body as { getReader?: unknown }).getReader === 'function')
    return body as BodyInit

  return JSON.stringify(body)
}

function toWebRequest(req: VercelRequest, origin: string): Request {
  const url = new URL(req.url ?? '/', origin)
  const headers = new Headers()

  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue

    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item)
    } else {
      headers.set(name, String(value))
    }
  }

  const method = req.method ?? 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const payload = hasBody ? requestBody(req.body) : null

  if (payload === null) {
    return new Request(url, { method: method, headers: headers })
  }

  const init: RequestInit & { duplex?: string } = {
    method: method,
    headers: headers,
    body: payload,
    // Required by the fetch spec whenever a stream body is supplied; Bun
    // enforces it rather than inferring.
    duplex: 'half',
  }

  return new Request(url, init)
}

async function writeWebResponse(
  res: VercelResponse,
  response: Response
): Promise<void> {
  res.statusCode = response.status

  response.headers.forEach((value, name) => {
    res.setHeader(name, value)
  })

  if (response.body === null) {
    res.end()
    return
  }

  res.end(Buffer.from(await response.arrayBuffer()))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const request = toWebRequest(req, originFor(req))
    const response = await app.fetch(request)

    await writeWebResponse(res, response)
  } catch (error) {
    // Never let an exception escape: Vercel would return a bodyless 500 and the
    // error would appear only in logs nobody correlates with a request.
    console.error('unhandled error in request pipeline:', error)

    if (res.headersSent === false) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
    }

    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}