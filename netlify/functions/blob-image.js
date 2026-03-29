'use strict'

const { connectLambda, getStore } = require('@netlify/blobs')

const STORE_NAME = 'cms-images'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'
}

const withCacheHeaders = extra => ({
  ...headers,
  'Cache-Control': 'public, max-age=31536000, immutable',
  ...extra
})

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const key = decodeURIComponent(String(event.queryStringParameters?.key || '').trim())
  if (!key) {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Missing key' })
    }
  }

  try {
    connectLambda(event)
    const store = getStore(STORE_NAME)
    const blob = await store.getWithMetadata(key, { type: 'arrayBuffer' })

    if (!blob || !blob.data) {
      return { statusCode: 404, headers, body: '' }
    }

    const contentType = blob.metadata?.contentType || 'application/octet-stream'
    const body = Buffer.from(blob.data).toString('base64')

    return {
      statusCode: 200,
      headers: withCacheHeaders({
        'Content-Type': contentType
      }),
      body: event.httpMethod === 'HEAD' ? '' : body,
      isBase64Encoded: event.httpMethod !== 'HEAD'
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: `Blob read failed: ${String(error?.message || error)}`
      })
    }
  }
}
