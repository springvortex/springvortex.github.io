import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const siteDir = path.resolve(process.argv[2] || '_site')
const manifestPath = path.join(siteDir, 'static/json/posts.json')
const outputPath = path.join(siteDir, 'static/json/popular-posts.json')
const endpoint = process.env.POPULAR_COUNTER_ENDPOINT || ''
const namespace = process.env.POPULAR_COUNTER_NAMESPACE || ''
const counterEnabled = Boolean(endpoint && namespace)
const limit = 20
const batchSize = 20
const batchInterval = 10000

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchViews(post, index) {
  if (!counterEnabled) {
    return 0
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt === 0 && index > 0 && index % batchSize === 0) {
      await sleep(batchInterval)
    }

    try {
      const response = await fetch(
        `${endpoint}/get/${encodeURIComponent(namespace)}/${encodeURIComponent(post.counterKey)}`,
        { headers: { accept: 'application/json' } }
      )
      if (response.status === 404) {
        return 0
      }
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get('retry-after')) * 1000
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : batchInterval)
        continue
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return Math.max(0, Number(data.value) || 0)
    } catch (error) {
      console.warn(`Skip ${post.counterKey}: ${error.message}`)
      return 0
    }
  }

  return 0
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const posts = Array.isArray(manifest.posts) ? manifest.posts : []
if (!posts.length) {
  throw new Error('No posts found in the generated manifest.')
}

for (let index = 0; index < posts.length; index += 1) {
  posts[index].views = await fetchViews(posts[index], index)
}

const selectedUrls = new Set()
const selected = posts
  .filter(post => post.views > 0)
  .sort((a, b) => b.views - a.views || b.date.localeCompare(a.date))
  .slice(0, limit)
  .filter(post => {
    selectedUrls.add(post.url)
    return true
  })

for (const post of posts) {
  if (selected.length >= limit) {
    break
  }
  if (!selectedUrls.has(post.url)) {
    selectedUrls.add(post.url)
    selected.push(post)
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  source: counterEnabled ? 'page-views' : 'recent',
  posts: selected.map(post => ({ title: post.title, url: post.url }))
}

await writeFile(outputPath, JSON.stringify(output, null, 2) + '\n')
console.log(
  `Popular posts generated: ${output.posts.length} entries (${counterEnabled ? 'page views' : 'recent fallback'}).`
)
