/**
 * Development proxy for browser testing.
 *
 * The ibnIPS backend sends no CORS headers, so a browser will refuse to read
 * any response from it. Native builds are unaffected because they do not
 * enforce CORS, which is why this is only needed for `expo start --web`.
 *
 * Point the app at this server (the Backend screen on the login screen makes
 * that a one-field change) and it forwards each request to the real backend
 * while adding the headers a browser requires.
 *
 * This file is a development tool. It is not part of the shipped app and it
 * does not modify the backend in any way.
 */
import http from 'node:http'

const PORT = Number(process.env.IBNIPS_PROXY_PORT ?? 8787)
const UPSTREAM = (
  process.env.IBNIPS_UPSTREAM ?? 'https://ibnips.onrender.com'
).replace(/\/+$/, '')
const ALLOWED_ORIGIN = process.env.IBNIPS_ALLOWED_ORIGIN ?? '*'

/** Request headers worth forwarding; the rest are per-connection. */
const FORWARDED_REQUEST_HEADERS = ['content-type', 'authorization', 'accept']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '600',
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []

    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, CORS_HEADERS)
    response.end()
    return
  }

  const target = `${UPSTREAM}${request.url}`

  try {
    const body =
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await readBody(request)

    const headers = {}

    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers[name]

      if (value) {
        headers[name] = value
      }
    }

    const upstreamResponse = await fetch(target, {
      method: request.method,
      headers,
      body,
    })

    const payload = Buffer.from(await upstreamResponse.arrayBuffer())

    response.writeHead(upstreamResponse.status, {
      ...CORS_HEADERS,
      'Content-Type':
        upstreamResponse.headers.get('content-type') ?? 'text/plain',
      'Content-Length': payload.byteLength,
    })
    response.end(payload)

    console.log(`${request.method} ${request.url} -> ${upstreamResponse.status}`)
  } catch (error) {
    console.error(`${request.method} ${request.url} failed:`, error.message)

    response.writeHead(502, {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    })
    response.end(
      JSON.stringify({
        error: 'upstream_unreachable',
        message: `Could not reach ${UPSTREAM}. Is the backend running?`,
      }),
    )
  }
})

server.listen(PORT, () => {
  console.log(`ibnIPS dev proxy listening on http://localhost:${PORT}`)
  console.log(`Forwarding to ${UPSTREAM}`)
  console.log('Set the backend address in the app to the address above.')
})
