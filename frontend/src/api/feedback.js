import { apiRequest } from './client.js'
import { API_ENDPOINTS } from './endpoints.js'

function parseFeedbackResponse(payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.success !== 'boolean' ||
    typeof payload.message !== 'string'
  ) {
    throw new TypeError('The feedback response is invalid.')
  }

  return {
    success: payload.success,
    message: payload.message,
  }
}

export async function submitFeedback(feedback, token, signal) {
  if (!token) {
    throw new TypeError('A bearer token is required to submit feedback.')
  }

  const payload = await apiRequest(API_ENDPOINTS.feedback, {
    method: 'POST',
    body: feedback,
    token,
    signal,
  })

  return parseFeedbackResponse(payload)
}