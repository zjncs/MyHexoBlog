'use strict'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8'
}

exports.handler = async () => {
  const token = process.env.TYPORAPIC_TOKEN || process.env.GITHUB_TOKEN

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      tokenConfigured: Boolean(token),
      tokenSource: process.env.TYPORAPIC_TOKEN ? 'TYPORAPIC_TOKEN' : (process.env.GITHUB_TOKEN ? 'GITHUB_TOKEN' : null),
      owner: process.env.TYPORAPIC_OWNER || 'zjncs',
      repo: process.env.TYPORAPIC_REPO || 'TyporaPic',
      branch: process.env.TYPORAPIC_BRANCH || 'main'
    })
  }
}
