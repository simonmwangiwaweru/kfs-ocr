const { handleOcr, getOcrStatus } = require('../web/server/ocrCore.cjs');

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return req.body ? JSON.parse(req.body) : {};
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const { status, json } = getOcrStatus(process.env);
    return res.status(status).json(json);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, code: 'METHOD', error: 'Use GET or POST.' });
  }

  try {
    const body = await readJsonBody(req);
    const { status, json } = await handleOcr(body, process.env);
    return res.status(status).json(json);
  } catch (err) {
    return res.status(400).json({
      ok: false,
      code: 'BAD_REQUEST',
      error: err && err.message ? err.message : 'Invalid JSON request payload.'
    });
  }
};
