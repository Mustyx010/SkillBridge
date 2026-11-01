const DEFAULT_API_ORIGIN = 'https://skillbridge-api.tb-skillbridge-backend.workers.dev';
const MAX_BODY_BYTES = 4_400_000;
const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-type',
];

const getApiOrigin = () => {
  const configuredOrigin = process.env.SKILLBRIDGE_API_ORIGIN || DEFAULT_API_ORIGIN;
  const parsedOrigin = new URL(configuredOrigin);
  if (
    !['http:', 'https:'].includes(parsedOrigin.protocol)
    || parsedOrigin.pathname !== '/'
    || parsedOrigin.search
    || parsedOrigin.hash
    || parsedOrigin.username
    || parsedOrigin.password
  ) {
    throw new Error('SKILLBRIDGE_API_ORIGIN must be an HTTP(S) origin without a path.');
  }
  return parsedOrigin;
};

const readRequestBody = async (request) => {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bytes.length;
    if (totalBytes > MAX_BODY_BYTES) {
      const error = new Error('Request body exceeds the API proxy upload limit.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, totalBytes);
};

module.exports = async (request, response) => {
  const method = request.method || 'GET';
  const rawUrl = request.url || '';
  if (!/^\/api\/(?:auth|v1)(?:\/|$)/.test(rawUrl)) {
    response.status(404).json({ success: false, message: 'API route not found.' });
    return;
  }
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    response.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    response.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  let body;
  try {
    if (!['GET', 'DELETE'].includes(method)) body = await readRequestBody(request);
  } catch (error) {
    response.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Could not read the API request body.',
    });
    return;
  }

  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'content-type']) {
    const value = request.headers[name];
    if (typeof value === 'string') headers.set(name, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const apiOrigin = getApiOrigin();
    const upstreamUrl = new URL(rawUrl, apiOrigin);
    if (
      upstreamUrl.origin !== apiOrigin.origin
      || !/^\/api\/(?:auth|v1)(?:\/|$)/.test(upstreamUrl.pathname)
    ) {
      response.status(400).json({ success: false, message: 'Invalid API route.' });
      return;
    }

    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
      redirect: 'manual',
    });
    response.status(upstream.status);
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    response.end(responseBody);
  } catch (error) {
    if (error.name === 'AbortError') {
      response.status(504).json({ success: false, message: 'The SkillBridge API request timed out.' });
      return;
    }
    console.error('SkillBridge API proxy request failed:', error.message);
    response.status(502).json({ success: false, message: 'The SkillBridge API is temporarily unavailable.' });
  } finally {
    clearTimeout(timeout);
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
