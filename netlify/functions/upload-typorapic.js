'use strict'

const crypto = require('node:crypto')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const extByType = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8'
  },
  body: JSON.stringify(body)
})

const sanitizeFileName = (name, fallbackExt) => {
  const safe = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')

  if (safe) return safe
  return `paste-${Date.now()}.${fallbackExt}`
}

const normalizeBase64 = input => String(input || '')
  .replace(/^data:[^;]+;base64,/, '')
  .replace(/\s/g, '')

const buildSiteOrigin = event => {
  if (process.env.URL) return process.env.URL.replace(/\/$/, '')

  const proto = event.headers['x-forwarded-proto'] || 'https'
  const host = event.headers.host
  return `${proto}://${host}`
}

const verifyIdentity = async event => {
  const auth = event.headers.authorization || event.headers.Authorization
  if (!auth) return false

  const siteOrigin = buildSiteOrigin(event)
  const response = await fetch(`${siteOrigin}/.netlify/identity/user`, {
    headers: { Authorization: auth }
  })

  return response.ok
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!(await verifyIdentity(event))) {
    return json(401, { error: 'Unauthorized' })
  }

  const token = process.env.TYPORAPIC_TOKEN || process.env.GITHUB_TOKEN
  if (!token) {
    return json(500, { error: 'Missing TYPORAPIC_TOKEN environment variable' })
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch (error) {
    return json(400, { error: 'Invalid JSON body' })
  }

  const contentType = payload.contentType || 'image/png'
  if (!contentType.startsWith('image/')) {
    return json(400, { error: 'Only image uploads are supported' })
  }

  const owner = process.env.TYPORAPIC_OWNER || 'zjncs'
  const repo = process.env.TYPORAPIC_REPO || 'TyporaPic'
  const branch = process.env.TYPORAPIC_BRANCH || 'main'
  const cdnBase = (process.env.TYPORAPIC_CDN_BASE || `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}`).replace(/\/$/, '')

  const ext = extByType[contentType] || 'png'
  const source = normalizeBase64(payload.imageBase64)

  if (!source) {
    return json(400, { error: 'Missing imageBase64 payload' })
  }

  const sizeInBytes = Math.floor((source.length * 3) / 4)
  if (sizeInBytes > 10 * 1024 * 1024) {
    return json(413, { error: 'Image is too large. Keep it under 10MB.' })
  }

  const originalName = sanitizeFileName(payload.originalName, ext)
  const stamp = crypto.randomBytes(6).toString('hex')
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const filePath = `${year}/${month}/${day}/${stamp}-${originalName}`

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
  const commitMessage = `upload: ${filePath}`

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'decap-typorapic-upload'
    },
    body: JSON.stringify({
      message: commitMessage,
      branch,
      content: source
    })
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    return json(response.status, {
      error: result.message || 'GitHub upload failed'
    })
  }

  const url = `${cdnBase}/${filePath}`

  return json(200, {
    ok: true,
    path: filePath,
    url,
    markdown: `![](${url})`
  })
}
