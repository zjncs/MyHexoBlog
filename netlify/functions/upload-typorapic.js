'use strict'

const crypto = require('node:crypto')
const { connectLambda, getStore } = require('@netlify/blobs')

const STORE_NAME = 'cms-images'

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

const uploadViaCatbox = async ({ buffer, originalName }) => {
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', new Blob([buffer]), originalName)

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form
  })

  const text = (await response.text()).trim()
  if (!response.ok || !/^https?:\/\//.test(text)) {
    throw new Error(`Catbox upload failed: ${text || response.status}`)
  }

  return {
    ok: true,
    storage: 'catbox',
    path: text,
    url: text,
    markdown: `![](${text})`
  }
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

const getBlobsStore = async event => {
  try {
    connectLambda(event)
    return getStore(STORE_NAME)
  } catch (error) {
    throw new Error(`无法初始化 Netlify Blobs：${String(error?.message || error)}`)
  }
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!(await verifyIdentity(event))) {
    return json(401, { error: '登录状态已失效，请刷新后台后重新登录。' })
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch (error) {
    return json(400, { error: '请求体不是合法 JSON。' })
  }

  const contentType = payload.contentType || 'image/png'
  if (!contentType.startsWith('image/')) {
    return json(400, { error: '只支持图片上传。' })
  }

  const ext = extByType[contentType] || 'png'
  const source = normalizeBase64(payload.imageBase64)

  if (!source) {
    return json(400, { error: '缺少图片数据。' })
  }

  const sizeInBytes = Math.floor((source.length * 3) / 4)
  if (sizeInBytes > 10 * 1024 * 1024) {
    return json(413, { error: '图片过大，请控制在 10MB 以内。' })
  }

  const originalName = sanitizeFileName(payload.originalName, ext)
  const stamp = crypto.randomBytes(6).toString('hex')
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const filePath = `${year}/${month}/${day}/${stamp}-${originalName}`

  try {
    const store = await getBlobsStore(event)
    const buffer = Buffer.from(source, 'base64')

    await store.set(filePath, buffer, {
      metadata: {
        contentType,
        originalName,
        size: sizeInBytes,
        uploadedAt: new Date().toISOString()
      }
    })

    const siteOrigin = buildSiteOrigin(event)
    const encodedKey = encodeURIComponent(filePath)
    const url = `${siteOrigin}/.netlify/functions/blob-image?key=${encodedKey}`

    return json(200, {
      ok: true,
      storage: 'netlify-blobs',
      path: filePath,
      url,
      markdown: `![](${url})`
    })
  } catch (error) {
    try {
      const originalName = sanitizeFileName(payload.originalName, ext)
      const buffer = Buffer.from(source, 'base64')
      const fallback = await uploadViaCatbox({ buffer, originalName })
      return json(200, fallback)
    } catch (fallbackError) {
      return json(500, {
        error: `图片上传失败。Netlify 存储错误：${String(error?.message || error)}；Catbox 错误：${String(fallbackError?.message || fallbackError)}`
      })
    }
  }
}
