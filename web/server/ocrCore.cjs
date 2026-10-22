// Server-side Gemini OCR proxy, shared by the Vercel function (api/ocr.js) and the Vite dev server.
// The API key lives only in the server environment and never reaches the browser bundle.

const config = require('../shared/ocr-config.json');

// Vercel rejects request bodies over 4.5 MB before our code runs, so stay safely under it.
const MAX_BASE64_CHARS = 4_200_000; // ~3.1 MB of image data
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function serverKey(env) {
  const key = (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '').trim();
  return key && !key.includes('MY_GEMINI_API_KEY') ? key : '';
}

/**
 * @param {{ imageBase64?: string, mimeType?: string }} body
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<{ status: number, json: object }>}
 */
async function handleOcr(body, env) {
  const apiKey = serverKey(env);
  if (!apiKey) {
    return { status: 501, json: { code: 'NO_SERVER_KEY', error: 'Server has no Gemini API key configured.' } };
  }

  const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';
  if (!imageBase64) return { status: 400, json: { code: 'BAD_REQUEST', error: 'imageBase64 is required.' } };
  if (!ALLOWED_MIME.has(mimeType)) return { status: 400, json: { code: 'BAD_REQUEST', error: 'Unsupported image type.' } };
  if (imageBase64.length > MAX_BASE64_CHARS) return { status: 413, json: { code: 'TOO_LARGE', error: 'Image is too large.' } };

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: config.prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
  });

  let lastError = { status: 502, json: { code: 'UPSTREAM', error: 'Gemini request failed.' } };

  for (const model of config.models) {
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: requestBody
      });
    } catch (e) {
      lastError = { status: 502, json: { code: 'UPSTREAM', error: `Cannot reach Gemini: ${e.message}` } };
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      if (!text) {
        lastError = { status: 502, json: { code: 'EMPTY', error: 'Gemini returned no text.' } };
        continue;
      }
      return { status: 200, json: { text, model } };
    }

    const err = await res.json().catch(() => ({}));
    const message = err?.error?.message || res.statusText || `HTTP ${res.status}`;
    if (res.status === 429) return { status: 429, json: { code: 'QUOTA_EXCEEDED', error: message } };
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const invalid = /API key|API_KEY|permission/i.test(message);
      return { status: invalid ? 401 : 400, json: { code: invalid ? 'INVALID_API_KEY' : 'BAD_REQUEST', error: message } };
    }
    lastError = { status: 502, json: { code: 'UPSTREAM', error: message } };
    // 404 / 5xx: try the next model
  }

  return lastError;
}

module.exports = { handleOcr, serverKey };
