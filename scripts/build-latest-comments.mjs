import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const siteDir = path.resolve(process.argv[2] || '_site')
const manifestPath = path.join(siteDir, 'static/json/posts.json')
const outputPath = path.join(siteDir, 'static/json/latest-comments.json')
const repository = process.env.GITHUB_REPOSITORY || 'springvortex/springvortex.github.io'
const token = process.env.GITHUB_TOKEN || ''
const limit = 20
const requestInterval = 120

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseNextUrl(linkHeader) {
  const match = /<([^>]+)>;\s*rel="next"/.exec(linkHeader || '')
  return match ? match[1] : ''
}

async function requestJson(url) {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28'
  }
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers })
      if (response.status === 429 || response.status >= 500) {
        if (attempt < 2) {
          const retryAfter = Number(response.headers.get('retry-after')) * 1000
          await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : requestInterval * 10)
          continue
        }
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return {
        data: await response.json(),
        nextUrl: parseNextUrl(response.headers.get('link'))
      }
    } catch (error) {
      if (attempt === 2) {
        throw error
      }
      await sleep(requestInterval * 10)
    }
  }
}

async function fetchDiscussions() {
  const discussions = []
  let url = `https://api.github.com/repos/${repository}/discussions?sort=updated&direction=desc&per_page=100`

  while (url) {
    const response = await requestJson(url)
    discussions.push(...response.data)
    url = response.nextUrl
  }
  return discussions
}

async function fetchDiscussionComments(discussion) {
  const comments = []
  let url = `https://api.github.com/repos/${repository}/discussions/${discussion.number}/comments?per_page=100`

  while (url) {
    const response = await requestJson(url)
    comments.push(...response.data)
    url = response.nextUrl
  }
  return comments
}

function createExcerpt(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function normalizePostPath(value) {
  const path = String(value || '').trim()
  return path.startsWith('/') ? path : '/' + path
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const posts = Array.isArray(manifest.posts) ? manifest.posts : []
const postsByPath = new Map(posts.map(post => [post.url, post]))
const comments = []

try {
  const discussions = await fetchDiscussions()

  const commentedDiscussions = discussions.filter(
    discussion =>
      Number(discussion.comments) > 0 && postsByPath.has(normalizePostPath(discussion.title))
  )

  for (const discussion of commentedDiscussions) {
    const post = postsByPath.get(normalizePostPath(discussion.title))
    const discussionComments = await fetchDiscussionComments(discussion)
    for (const comment of discussionComments) {
      comments.push({
        author: comment.user?.login || 'GitHub 用户',
        body: createExcerpt(comment.body),
        createdAt: comment.created_at,
        discussionUrl: comment.html_url,
        postTitle: post.title,
        postUrl: post.url
      })
    }
    await sleep(requestInterval)
  }
} catch (error) {
  console.warn(`Skip latest comments generation: ${error.message}`)
}

comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

const output = {
  generatedAt: new Date().toISOString(),
  source: 'github-discussions',
  comments: comments.slice(0, limit)
}

await writeFile(outputPath, JSON.stringify(output, null, 2) + '\n')
console.log(`Latest comments generated: ${output.comments.length} entries.`)
