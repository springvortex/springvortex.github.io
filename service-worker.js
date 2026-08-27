---
layout: null
---
const version = '{{ site.buildAt }}'
const baseUrl = '{{ site.baseurl }}'
const cachePrefix = 'blog_'
const cacheKey = cachePrefix + version
const precacheUrls = [
  baseUrl + '/',
  baseUrl + '/static/css/common.css',
  baseUrl + '/static/css/theme-dark.css',
  baseUrl + '/static/css/page.css',
  baseUrl + '/static/css/post.css',
  baseUrl + '/static/css/code-light.css',
  baseUrl + '/static/css/code-dark.css',
  baseUrl + '/static/js/blog.js',
  baseUrl + '/static/font/consola.woff2',
  baseUrl + '/static/img/logo.webp'
]
const downloadPattern = /\.(?:rar|zip|7z|pdf)$/i
const networkOnlyPaths = [
  baseUrl + '/static/json/popular-posts.json'
]

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(cacheKey)
      .then(function (cache) {
        return Promise.allSettled(
          precacheUrls.map(function (url) {
            return cache.add(url)
          })
        )
      })
      .then(function () {
        return self.skipWaiting()
      })
  )
})
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.startsWith(cachePrefix) && key !== cacheKey
            })
            .map(function (key) {
              return caches.delete(key)
            })
        )
      })
      .then(function () {
        return self.clients.claim()
      })
  )
})

self.addEventListener('fetch', function (event) {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  try {
    const requestUrl = new URL(request.url)
    if (networkOnlyPaths.includes(requestUrl.pathname)) {
      event.respondWith(fetch(request))
      return
    }
    if (requestUrl.origin !== self.origin || downloadPattern.test(requestUrl.pathname)) {
      return
    }
  } catch (error) {
    return
  }

  event.respondWith(
    caches.open(cacheKey).then(function (cache) {
      const requestCacheUrl = new URL(request.url).pathname
      return cache.match(requestCacheUrl).then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request)
          .then(function (response) {
            if (response && response.ok) {
              cache.put(requestCacheUrl, response.clone())
            }
            return response
          })
          .catch(function () {
            if (request.mode !== 'navigate') {
              return Response.error()
            }

            return cache.match(baseUrl + '/').then(function (homeResponse) {
              return homeResponse || Response.error()
            })
          })
      })
    })
  )
})
