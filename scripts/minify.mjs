import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { transform } from 'esbuild'

const siteDir = process.argv[2] || '_site'
const cssRoot = path.join(siteDir, 'static', 'css')
const jsRoot = path.join(siteDir, 'static', 'js')

async function collectFiles(dir, result = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') {
      return result
    }
    throw error
  }

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(filePath, result)
    } else if (entry.isFile()) {
      result.push(filePath)
    }
  }
  return result
}

async function minifyFile(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  const loader = extension === '.css' ? 'css' : extension === '.js' ? 'js' : null
  if (!loader) {
    return null
  }

  const source = await readFile(filePath, 'utf8')
  const output = await transform(source, {
    loader,
    minify: true,
    charset: 'utf8',
    legalComments: 'none',
    target: loader === 'js' ? 'es2018' : undefined
  })

  await writeFile(filePath, output.code)
  return {
    file: path.relative(siteDir, filePath).replaceAll(path.sep, '/'),
    before: Buffer.byteLength(source),
    after: Buffer.byteLength(output.code)
  }
}

const cssFiles = await collectFiles(cssRoot)
const jsFiles = (await collectFiles(jsRoot)).filter(
  file => !file.includes(`${path.sep}vendor${path.sep}`)
)
const files = [...cssFiles, ...jsFiles, path.join(siteDir, 'service-worker.js')]
const results = []

for (const file of files) {
  try {
    await stat(file)
  } catch (error) {
    if (error.code === 'ENOENT') {
      continue
    }
    throw error
  }

  const result = await minifyFile(file)
  if (result) {
    results.push(result)
  }
}

const before = results.reduce((sum, item) => sum + item.before, 0)
const after = results.reduce((sum, item) => sum + item.after, 0)
if (!results.length) {
  console.log('No JS or CSS files found to minify.')
} else {
  for (const item of results) {
    console.log(`${item.file}: ${item.before} -> ${item.after} bytes`)
  }
  console.log(`Total: ${before} -> ${after} bytes (${(((before - after) / before) * 100).toFixed(1)}% saved)`)
}
