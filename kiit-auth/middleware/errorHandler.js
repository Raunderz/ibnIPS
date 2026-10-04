// @ts-check

/**
 * Body-parser failures carry an HTTP status and a machine-readable `type`.
 * Anything reaching this handler with a 4xx status is the client's fault and
 * must not be reported as a server fault.
 */
const CLIENT_ERROR_TYPES = new Set([
  'entity.parse.failed',
  'entity.too.large',
  'charset.unsupported',
  'encoding.unsupported',
  'request.aborted',
  'parameters.too.many'
]);

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isClientError(error) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = /** @type {{ status?: unknown, statusCode?: unknown, type?: unknown }} */ (
    error
  );

  const status =
    typeof candidate.status === 'number'
      ? candidate.status
      : typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : 0;

  if (status >= 400 && status < 500) {
    return true;
  }

  return typeof candidate.type === 'string' && CLIENT_ERROR_TYPES.has(candidate.type);
}

/**
 * Express error-handling middleware.
 *
 * @param {Error} error
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (isClientError(error)) {
    // Not a server fault: log at a low volume and do not expose internals.
    console.warn(`${req.method} ${req.originalUrl} rejected:`, error.message);

    const reported = /** @type {{ status?: unknown }} */ (/** @type {unknown} */ (error)).status;
    const status = typeof reported === 'number' && reported >= 400 && reported < 500 ? reported : 400;

    return res.status(status).json({
      error: status === 413 ? 'Payload too large' : 'Bad request'
    });
  }

  console.error(`${req.method} ${req.originalUrl} failed:`, error);

  return res.status(500).json({
    error: 'Internal server error'
  });
}
