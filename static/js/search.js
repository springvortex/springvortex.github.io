// 加载全文检索数据，优先使用当前构建版本对应的本地缓存
function loadAllPostData(callback) {
  const cache = readCachedPostData()
  if (cache) {
    callback(cache)
    return
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(function () {
    controller.abort()
  }, 20000)

  fetch(blog.baseurl + '/static/xml/search.xml?t=' + blog.buildAt, {
    credentials: 'same-origin',
    signal: controller.signal
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status)
      }
      return response.text()
    })
    .then(function (data) {
      cachePostData(data)
      callback(data)
    })
    .catch(function (error) {
      console.error('全文检索数据加载失败', error)
      callback(null)
    })
    .finally(function () {
      clearTimeout(timeoutId)
    })
}

function readCachedPostData() {
  try {
    if (localStorage.db && localStorage.dbVersion === blog.buildAt) {
      return localStorage.db
    }
  } catch (error) {
    return null
  }
  return null
}

function cachePostData(data) {
  try {
    localStorage.db = data
    localStorage.dbVersion = blog.buildAt
  } catch (error) {
    // 索引过大或存储被禁用时，本次搜索仍然使用内存数据
  }
}

// 搜索功能
blog.addLoadEvent(function () {
  let titles = []
  let contents = []
  const input = document.getElementById('search-input')
  const status = document.getElementById('search-status')
  const loadingDOM = document.querySelector('.page-search .search-result-heading img')

  // 非搜索页面
  if (!input || !status || !loadingDOM) {
    return
  }

  let ready = false
  let inputLock = false
  let searchTimer = null

  const popularSearchList = document.getElementById('popular-search-list')
  const popularSearchEmpty = document.getElementById('popular-search-empty')
  let countedSearchesMemory = null

  function normalizeSearchKeyword(value) {
    const keyword = String(value || '').replace(/\s+/g, ' ').trim()
    return keyword.length && keyword.length <= 50 ? keyword : ''
  }

  function readPopularSearches() {
    try {
      const data = JSON.parse(localStorage.getItem('popularSearches') || '{}')
      return data && typeof data === 'object' ? data : {}
    } catch (error) {
      return {}
    }
  }

  function savePopularSearches(data) {
    try {
      localStorage.setItem('popularSearches', JSON.stringify(data))
    } catch (error) {
      // 存储不可用时，本次会话内仍然可以搜索，只是无法累计
    }
  }

  function readCountedSearches() {
    try {
      const data = JSON.parse(sessionStorage.getItem('countedSearches') || '{}')
      return data && typeof data === 'object' ? data : {}
    } catch (error) {
      if (!countedSearchesMemory) {
        countedSearchesMemory = {}
      }
      return countedSearchesMemory
    }
  }

  function markSearchCounted(keyword) {
    const counted = readCountedSearches()
    if (counted[keyword]) {
      return true
    }

    counted[keyword] = true
    try {
      sessionStorage.setItem('countedSearches', JSON.stringify(counted))
    } catch (error) {
      // 隐私模式下接受重复计数，避免功能整体失效
    }
    return false
  }

  function renderPopularSearches() {
    if (!popularSearchList || !popularSearchEmpty) {
      return
    }

    const entries = Object.values(readPopularSearches())
      .filter(function (item) {
        return item && normalizeSearchKeyword(item.keyword)
      })
      .sort(function (a, b) {
        return b.count - a.count || b.updatedAt - a.updatedAt
      })
      .slice(0, 20)

    popularSearchList.textContent = ''
    popularSearchEmpty.hidden = entries.length > 0

    entries.forEach(function (item) {
      const keyword = normalizeSearchKeyword(item.keyword)
      const listItem = document.createElement('li')
      const term = document.createElement('button')
      term.type = 'button'
      term.className = 'search-term'
      term.title = keyword
      term.textContent = keyword
      term.addEventListener('click', function () {
        input.value = keyword
        recordPopularSearch(keyword)
        renderPopularSearches()
        searchNow(keyword)
        input.focus()
      })
      listItem.appendChild(term)
      popularSearchList.appendChild(listItem)
    })
  }

  function recordPopularSearch(value) {
    const keyword = normalizeSearchKeyword(value)
    if (!keyword || markSearchCounted(keyword)) {
      return
    }

    const searches = readPopularSearches()
    const current = searches[keyword] || { keyword: keyword, count: 0, updatedAt: 0 }
    current.count += 1
    current.updatedAt = Date.now()
    searches[keyword] = current

    const compact = Object.values(searches)
      .sort(function (a, b) {
        return b.count - a.count || b.updatedAt - a.updatedAt
      })
      .slice(0, 100)
      .reduce(function (result, item) {
        result[item.keyword] = item
        return result
      }, {})
    savePopularSearches(compact)
  }

  loadingDOM.style.opacity = 1
  setStatus('正在加载搜索索引...')
  renderPopularSearches()

  loadAllPostData(function (data) {
    loadingDOM.style.opacity = 0

    if (data === null) {
      setStatus('搜索索引加载失败，请刷新重试')
      return
    }

    titles = parseTitle()
    contents = parseContent(data)
    ready = true
    searchNow(input.value)
  })

  function setStatus(text) {
    status.textContent = text
    status.hidden = !text
  }

  function parseTitle() {
    return Array.prototype.map.call(document.querySelectorAll('.list-search .title'), function (dom) {
      return dom.textContent
    })
  }

  function parseContent(data) {
    const root = new DOMParser().parseFromString(data, 'text/html')
    return Array.prototype.map.call(root.querySelectorAll('li'), function (dom) {
      return dom.textContent
    })
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]
    })
  }

  function highlight(text, pattern) {
    let result = ''
    let lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      result += escapeHtml(text.slice(lastIndex, match.index))
      result += '<span class="hint">' + escapeHtml(match[0]) + '</span>'
      lastIndex = match.index + match[0].length
      pattern.lastIndex = lastIndex
    }

    return result + escapeHtml(text.slice(lastIndex))
  }

  function searchNow(value) {
    if (!ready) {
      return
    }

    const key = blog.trim(value)
    const pattern = key
      ? new RegExp(blog.encodeRegChar(key), 'gi')
      : null
    const doms = document.querySelectorAll('.list-search li')
    let resultCount = 0

    for (let i = 0; i < doms.length; i++) {
      const title = titles[i] || ''
      const content = contents[i] || ''
      const domItem = doms[i]
      const domTitle = domItem.querySelector('.title')
      const domContent = domItem.querySelector('.content')
      const matchedTitle = pattern ? pattern.exec(title) : null
      if (pattern) pattern.lastIndex = 0
      const matchedContent = pattern ? pattern.exec(content) : null
      if (pattern) pattern.lastIndex = 0

      if (pattern) {
        domTitle.innerHTML = highlight(title, pattern)
      } else {
        domTitle.textContent = title
      }
      domContent.innerHTML = ''

      if (!pattern) {
        domItem.setAttribute('hidden', 'hidden')
        continue
      }

      if (!matchedTitle && !matchedContent) {
        domItem.setAttribute('hidden', 'hidden')
        continue
      }

      resultCount++
      domItem.removeAttribute('hidden')

      if (matchedTitle) {
        domTitle.innerHTML = highlight(title, pattern)
      }

      if (matchedContent) {
        const left = Math.max(matchedContent.index - 10, 0)
        const right = Math.min(left + 100, content.length)
        const snippet = content.slice(left, right)
        const snippetPattern = new RegExp(blog.encodeRegChar(key), 'gi')
        domContent.innerHTML = highlight(snippet, snippetPattern) + '...'
      } else {
        domContent.innerHTML = escapeHtml(content.slice(0, 100)) + '...'
      }
    }

    if (!pattern) {
      setStatus('暂无搜索结果')
    } else if (resultCount === 0) {
      setStatus('暂无搜索结果')
    } else {
      setStatus('')
    }
  }

  function scheduleSearch() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(function () {
      searchNow(input.value)
    }, 150)
  }

  input.addEventListener('input', function () {
    if (ready && !inputLock) {
      scheduleSearch()
    }
  })

  input.addEventListener('compositionstart', function () {
    inputLock = true
    clearTimeout(searchTimer)
  })

  input.addEventListener('compositionend', function () {
    inputLock = false
    searchNow(input.value)
  })

  input.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || event.isComposing) {
      return
    }
    event.preventDefault()
    recordPopularSearch(input.value)
    renderPopularSearches()
    searchNow(input.value)
  })

  input.addEventListener('change', function () {
    recordPopularSearch(input.value)
    renderPopularSearches()
  })
})
