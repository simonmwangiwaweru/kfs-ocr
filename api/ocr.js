// Vercel serverless function: POST /api/ocr  { imageBase64, mimeType }
// Holds the Gemini key server-side so it is never shipped to the browser.
const { handleOcr } = require('../web/server/ocrCore.cjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ code: 'METHOD', error: 'Use POST.' });
  }
  const { status, json } = await handleOcr(req.body || {}, process.env);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(json);
};
