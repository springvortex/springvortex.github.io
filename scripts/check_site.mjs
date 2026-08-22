import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { transform } from 'esbuild'
import { fileURLToPath } from 'node:url'

const siteDir = path.resolve(process.argv[2] || '_site')
const htmlRoot = path.join(siteDir)
const xmlFiles = [
  path.join(siteDir, 'static/xml/search.xml'),
  path.join(siteDir, 'static/xml/rss.xml'),
  path.join(siteDir, 'static/xml/sitemap.xml')
]
const serviceWorker = path.join(siteDir, 'service-worker.js')

async function collectFiles(dir, extension, result = []) {
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
      await collectFiles(filePath, extension, result)
    } else if (entry.isFile() && path.extname(entry.name) === extension) {
      result.push(filePath)
    }
  }
  return result
}

function display(file) {
  return path.relative(siteDir, file).replaceAll(path.sep, '/')
}

function decodePath(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function targetExists(root, currentDir, href) {
  const withoutFragment = href.split('#', 1)[0]
  const withoutQuery = withoutFragment.split('?', 1)[0]
  if (!withoutQuery) {
    return true
  }

  const decoded = decodePath(withoutQuery)
  const target = decoded.startsWith('/')
    ? path.join(root, `.${decoded}`)
    : path.resolve(currentDir, decoded)

  if (!target.startsWith(root + path.sep) && target !== root) {
    return false
  }
  return existsSync(target) || existsSync(path.join(target, 'index.html'))
}

function attributeValues(html, attribute) {
  return [...html.matchAll(new RegExp(`\\b${attribute}=(["'])(.*?)\\1`, 'gi'))].map(
    match => match[2]
  )
}

function isExternalOrSpecial(value) {
  return (
    !value ||
    value.startsWith('#') ||
    /^[a-z][a-z0-9+.-]*:/i.test(value) ||
    value.startsWith('//')
  )
}

function hasMetaDescription(html) {
  const match = html.match(
    /<meta\s+name=(["'])description\1\s+content=(["'])(.*?)\2\s*\/?>/i
  )
  return Boolean(match && match[3].trim())
}

function hasCanonical(html) {
  const match = html.match(/<link\s+[^>]*rel=(["'])canonical\1\s+href=(["'])(.*?)\2/i)
  return Boolean(match && match[3].trim())
}

function hasLanguage(html) {
  const match = html.match(/<html\s+[^>]*lang=(["'])(.*?)\1/i)
  return Boolean(match && match[2].trim())
}

function hasTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/is)
  return Boolean(match && match[1].trim())
}

async function main() {
  const errors = []
  const htmlFiles = await collectFiles(htmlRoot, '.html')
  let references = 0

  if (!htmlFiles.length) {
    errors.push('No generated HTML files found.')
  }

  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8')
    const relativeFile = display(file)

    if (!hasLanguage(html)) {
      errors.push(`${relativeFile}: missing html lang`)
    }
    if (!hasTitle(html)) {
      errors.push(`${relativeFile}: missing or empty title`)
    }
    if (!hasMetaDescription(html)) {
      errors.push(`${relativeFile}: missing meta description`)
    }
    if (!hasCanonical(html)) {
      errors.push(`${relativeFile}: missing canonical URL`)
    }

    for (const attribute of ['href', 'src']) {
      for (const value of attributeValues(html, attribute)) {
        if (isExternalOrSpecial(value)) {
          continue
        }
        references += 1
        if (!targetExists(siteDir, path.dirname(file), value)) {
          errors.push(`${relativeFile}: missing ${attribute} target "${value}"`)
        }
      }
    }
  }

  for (const xmlFile of xmlFiles) {
    try {
      await stat(xmlFile)
    } catch {
      errors.push(`${display(xmlFile)}: file not found`)
      continue
    }
  }

  if (xmlFiles.length) {
    const xmlChecker = fileURLToPath(new URL('./check_xml.rb', import.meta.url))
    const xmlCheck = spawnSync('ruby', [xmlChecker, ...xmlFiles], {
      encoding: 'utf8'
    })
    if (xmlCheck.error || xmlCheck.status !== 0) {
      errors.push(`XML validation failed: ${xmlCheck.stderr || xmlCheck.error}`)
    }
  }

  try {
    const source = await readFile(serviceWorker, 'utf8')
    await transform(source, { loader: 'js' })
  } catch {
    errors.push(`${display(serviceWorker)}: syntax validation failed`)
  }

  if (errors.length) {
    console.error(errors.join('\n'))
    process.exit(1)
  }

  console.log(
    `Site checks passed: ${htmlFiles.length} HTML files, ${references} internal references, ${xmlFiles.length} XML files, Service Worker syntax.`
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
