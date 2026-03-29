'use strict'

const crypto = require('node:crypto')
const { connectLambda, getStore } = require('@netlify/blobs')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8'
}

const STORE_NAME = 'cms-images'
const hasBlobsContext = event =>
  Boolean(
    event?.blobs ||
    process.env.NETLIFY_BLOBS_CONTEXT ||
    globalThis.netlifyBlobsContext
  )

exports.handler = async event => {
  if (!hasBlobsContext(event)) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        storage: 'catbox-fallback',
        store: STORE_NAME,
        write: null,
        read: null,
        note: '当前运行环境没有注入 Netlify Blobs 上下文，图片上传会自动回退到 Catbox。'
      })
    }
  }

  const status = {
    ok: true,
    storage: 'netlify-blobs',
    store: STORE_NAME
  }

  try {
    connectLambda(event)
    const store = getStore(STORE_NAME)
    const key = `_health/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`
    const value = `ok:${new Date().toISOString()}`

    await store.set(key, value, {
      metadata: {
        contentType: 'text/plain; charset=utf-8'
      }
    })

    const blob = await store.getWithMetadata(key, { type: 'text' })
    await store.delete(key)

    status.write = true
    status.read = blob?.data === value
    status.metadata = blob?.metadata || null
  } catch (error) {
    status.ok = false
    status.write = false
    status.read = false
    status.error = String(error?.message || error)
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(status)
  }
}
