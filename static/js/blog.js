// 打印主题标识,请保留出处
;(function () {
  const style1 = 'background:#4BB596;color:#ffffff;border-radius: 2px;'
  const style2 = 'color:auto;'
  const author = ' zjc'
  console.info('%c Author %c' + author, style1, style2)
})()

/**
 * 工具，在 DOM 就绪后执行，脚本在页尾时会立即执行
 * @param {方法} func
 */
blog.addLoadEvent = function (func) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', func)
  } else {
    func()
  }
}

/**
 * 工具，添加事件监听
 * @param {单个DOM节点} dom
 * @param {事件名} eventName
 * @param {事件方法} func
 * @param {是否捕获} useCapture
 */
blog.addEvent = function (dom, eventName, func, useCapture) {
  dom.addEventListener(eventName, func, useCapture === true)
}

/**
 * 工具，DOM添加某个class
 * @param {单个DOM节点} dom
 * @param {class名} className
 */
blog.addClass = function (dom, className) {
  dom.classList.add(className)
}

/**
 * 工具，DOM是否有某个class
 * @param {单个DOM节点} dom
 * @param {class名} className
 */
blog.hasClass = function (dom, className) {
  return dom.classList.contains(className)
}

/**
 * 工具，DOM删除某个class
 * @param {单个DOM节点} dom
 * @param {class名} className
 */
blog.removeClass = function (dom, className) {
  dom.classList.remove(className)
}

/**
 * 工具，去除字符串首尾空白字符
 * @param {字符串} str
 */
blog.trim = function (str) {
  return String(str).trim()
}

/**
 * 工具， 转义正则关键字
 * @param {字符串} str
 */
blog.encodeRegChar = function (str) {
  return str.replace(/[\\.^$*+?{}[\]|()-]/g, '\\$&')
}

/**
 * 特效：点击页面文字冒出特效
 */
blog.initClickEffect = function (textArr) {
  function createDOM(text) {
    const dom = document.createElement('span')
    dom.innerText = text
    dom.style.left = 0
    dom.style.top = 0
    dom.style.position = 'fixed'
    dom.style.fontSize = '12px'
    dom.style.whiteSpace = 'nowrap'
    dom.style.webkitUserSelect = 'none'
    dom.style.userSelect = 'none'
    dom.style.opacity = 0
    dom.style.transform = 'translateY(0)'
    dom.style.webkitTransform = 'translateY(0)'
    return dom
  }

  blog.addEvent(window, 'click', function (ev) {
    const tagName = ev.target.tagName.toLocaleLowerCase()
    if (tagName == 'a') {
      return
    }
    const text = textArr[Math.floor(Math.random() * textArr.length)]
    const dom = createDOM(text)

    document.body.appendChild(dom)
    const w = parseInt(window.getComputedStyle(dom, null).getPropertyValue('width'))
    const h = parseInt(window.getComputedStyle(dom, null).getPropertyValue('height'))

    dom.style.left = ev.clientX - w / 2 + 'px'
    dom.style.top = ev.clientY - h + 'px'
    dom.style.opacity = 1

    setTimeout(function () {
      dom.style.transition = 'transform 500ms ease-out, opacity 500ms ease-out'
      dom.style.webkitTransition = 'transform 500ms ease-out, opacity 500ms ease-out'
      dom.style.opacity = 0
      dom.style.transform = 'translateY(-26px)'
      dom.style.webkitTransform = 'translateY(-26px)'
    }, 20)

    setTimeout(function () {
      document.body.removeChild(dom)
    }, 520)
  })
}

// 新建DIV包裹TABLE
blog.addLoadEvent(function () {
  // 文章页生效
  if (document.getElementsByClassName('page-post').length == 0) {
    return
  }
  const tables = document.querySelectorAll('table')
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    const elem = document.createElement('div')
    elem.setAttribute('class', 'table-container')
    table.parentNode.insertBefore(elem, table)
    elem.appendChild(table)
  }
})

// 文章代码块复制
blog.initCodeCopy = function () {
  const page = document.querySelector('.page-post')
  if (!page) {
    return
  }

  const pres = page.querySelectorAll('pre')
  for (let i = 0; i < pres.length; i++) {
    const pre = pres[i]
    const code = pre.querySelector('code')
    if (!code || (code.className || '').indexOf('language-mermaid') !== -1) {
      continue
    }

    let container = pre.parentNode
    if (
      !container.classList ||
      (!container.classList.contains('highlight') && !container.classList.contains('code-block'))
    ) {
      container = document.createElement('div')
      container.className = 'code-block'
      pre.parentNode.insertBefore(container, pre)
      container.appendChild(pre)
    }

    if (container.querySelector('.code-copy-button')) {
      continue
    }

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'code-copy-button'
    button.title = 'Copy code'
    button.setAttribute('aria-label', 'Copy code')
    button.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>' +
      '<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>' +
      '</svg><span>copy</span>'

    blog.addEvent(button, 'click', function (event) {
      event.stopPropagation()
      const currentButton = event.currentTarget
      const currentCode = currentButton.parentNode.querySelector('code')
      copyText(currentCode.textContent.replace(/^[\r\n]+/, '').replace(/\s+$/, ''), currentButton)
    })

    container.appendChild(button)
  }

  function copyText(text, button) {
    function done(success) {
      const label = button.querySelector('span')
      button.className = success ? 'code-copy-button copied' : 'code-copy-button failed'
      label.innerText = success ? 'copied' : 'copy failed'
      button.title = success ? 'Copied' : 'Copy failed, please select code manually'
      button.setAttribute('aria-label', button.title)

      clearTimeout(button.resetTimer)
      button.resetTimer = setTimeout(function () {
        button.className = 'code-copy-button'
        label.innerText = 'copy'
        button.title = 'Copy code'
        button.setAttribute('aria-label', 'Copy code')
      }, 1800)
    }

    function copyByTextarea() {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'readonly')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      let success = false
      try {
        success = document.execCommand('copy')
      } catch (e) {
        success = false
      }
      document.body.removeChild(textarea)
      done(success)
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          done(true)
        },
        function () {
          copyByTextarea()
        }
      )
      return
    }

    copyByTextarea()
  }
}

// 手机端右下角快捷操作
blog.addLoadEvent(function () {
  const actions = document.getElementById('footer-actions')
  const actionsPanel = document.getElementById('footer-actions-panel')
  const actionsToggle = document.getElementById('footer-actions-toggle')
  if (!actions || !actionsPanel || !actionsToggle) {
    return
  }

  const mobileLayout = window.matchMedia('(max-width: 700px)')
  actions.classList.add('footer-actions-ready')

  function isOpen() {
    return actions.classList.contains('footer-actions-open')
  }

  function setOpen(open, returnFocus) {
    const nextOpen = open && mobileLayout.matches
    actions.classList.toggle('footer-actions-open', nextOpen)
    actionsToggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false')
    actionsToggle.setAttribute(
      'aria-label',
      nextOpen ? '收起快捷操作' : '展开快捷操作'
    )
    actionsToggle.title = nextOpen ? '收起快捷操作' : '展开快捷操作'
    if (!nextOpen && returnFocus && actionsPanel.contains(document.activeElement)) {
      actionsToggle.focus()
    }
  }

  blog.addEvent(actionsToggle, 'click', function (event) {
    event.stopPropagation()
    const nextOpen = !isOpen()
    setOpen(nextOpen)
    if (nextOpen && event.detail === 0) {
      window.requestAnimationFrame(function () {
        const firstAction = Array.prototype.slice.call(actionsPanel.children).find(function (item) {
          return !item.hidden && (!item.id || item.id !== 'to-top' || item.classList.contains('show'))
        })
        if (firstAction) {
          firstAction.focus()
        }
      })
    }
  })

  blog.addEvent(actionsPanel, 'click', function () {
    if (mobileLayout.matches) {
      setOpen(false, true)
    }
  }, true)

  blog.addEvent(document, 'click', function (event) {
    if (isOpen() && !actions.contains(event.target)) {
      setOpen(false)
    }
  }, true)

  blog.addEvent(document, 'keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false, true)
    }
  })

  blog.addEvent(mobileLayout, 'change', function () {
    if (!mobileLayout.matches) {
      setOpen(false)
    }
  })
})

// 回到顶部
blog.addLoadEvent(function () {
  const toTopDOM = document.getElementById('to-top')
  if (!toTopDOM) {
    return
  }

  function getScrollTop() {
    return window.scrollY
  }

  let updating = false
  function updateToTop() {
    updating = false
    toTopDOM.classList.toggle('show', getScrollTop() > 200)
  }

  function scheduleUpdateToTop() {
    if (!updating) {
      updating = true
      window.requestAnimationFrame(updateToTop)
    }
  }

  window.addEventListener('scroll', scheduleUpdateToTop, { passive: true })
  blog.addEvent(
    toTopDOM,
    'click',
    function (event) {
      window.scrollTo(0, 0)
      event.stopPropagation()
    },
    true
  )
  blog.addEvent(
    toTopDOM,
    'keydown',
    function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        window.scrollTo(0, 0)
      }
    },
    true
  )
  updateToTop()
})

// 点击图片全屏预览
blog.addLoadEvent(function () {
  if (!document.querySelector('.page-post')) {
    return
  }
  //console.debug('init post img click event')
  let imgMoveOrigin = null
  let imgMoveOriginRect = null
  let restoreLock = false
  const imgArr = document.querySelectorAll('.page-post img')

  const css = [
    '.img-move-bg {',
    '  transition: opacity 300ms ease;',
    '  position: fixed;',
    '  left: 0;',
    '  top: 0;',
    '  right: 0;',
    '  bottom: 0;',
    '  opacity: 0;',
    '  background-color: #000000;',
    '  z-index: 100;',
    '}',
    '.img-move-item {',
    '  transition: all 300ms ease;',
    '  position: fixed;',
    '  opacity: 0;',
    '  cursor: pointer;',
    '  z-index: 101;',
    '}'
  ].join('')
  const styleDOM = document.createElement('style')
  styleDOM.appendChild(document.createTextNode(css))
  document.head.appendChild(styleDOM)

  window.addEventListener('resize', toCenter, { passive: true })

  for (let i = 0; i < imgArr.length; i++) {
    imgArr[i].addEventListener('click', imgClickEvent)
  }

  function prevent(ev) {
    ev.preventDefault()
  }

  function toCenter() {
    if (!imgMoveOrigin) {
      return
    }
    if (!imgMoveOrigin.naturalWidth || !imgMoveOrigin.naturalHeight) {
      return
    }

    let width = Math.min(imgMoveOrigin.naturalWidth, document.documentElement.clientWidth * 0.9)
    let height = (width * imgMoveOrigin.naturalHeight) / imgMoveOrigin.naturalWidth
    if (window.innerHeight * 0.95 < height) {
      height = Math.min(imgMoveOrigin.naturalHeight, window.innerHeight * 0.95)
      width = (height * imgMoveOrigin.naturalWidth) / imgMoveOrigin.naturalHeight
    }

    const img = document.querySelector('.img-move-item')
    img.style.left = (document.documentElement.clientWidth - width) / 2 + 'px'
    img.style.top = (window.innerHeight - height) / 2 + 'px'
    img.style.width = width + 'px'
    img.style.height = height + 'px'
  }

  function restore() {
    if (restoreLock) {
      return
    }
    restoreLock = true
    const div = document.querySelector('.img-move-bg')
    const img = document.querySelector('.img-move-item')
    if (!div || !img) {
      restoreLock = false
      imgMoveOrigin = null
      return
    }

    div.style.opacity = 0
    img.style.opacity = 0
    img.style.left = imgMoveOriginRect.left + 'px'
    img.style.top = imgMoveOriginRect.top + 'px'
    img.style.width = imgMoveOriginRect.width + 'px'
    img.style.height = imgMoveOriginRect.height + 'px'

    setTimeout(function () {
      restoreLock = false
      document.body.removeChild(div)
      document.body.removeChild(img)
      imgMoveOrigin = null
    }, 300)
  }

  function imgClickEvent(event) {
    event.preventDefault()
    const source = event.currentTarget
    if (imgMoveOrigin || !source.complete || !source.naturalWidth) {
      return
    }

    imgMoveOrigin = source
    const originRect = source.getBoundingClientRect()
    imgMoveOriginRect = originRect

    const div = document.createElement('div')
    div.className = 'img-move-bg'

    const img = document.createElement('img')
    img.className = 'img-move-item'
    img.src = imgMoveOrigin.currentSrc || imgMoveOrigin.src
    img.style.left = originRect.left + 'px'
    img.style.top = originRect.top + 'px'
    img.style.width = originRect.width + 'px'
    img.style.height = originRect.height + 'px'

    div.addEventListener('click', restore)
    div.addEventListener('wheel', restore, { passive: true })
    div.addEventListener('touchmove', prevent, { passive: false })

    img.addEventListener('click', restore)
    img.addEventListener('wheel', restore, { passive: true })
    img.addEventListener('touchmove', prevent, { passive: false })
    img.addEventListener('dragstart', prevent)

    document.body.appendChild(div)
    document.body.appendChild(img)

    setTimeout(function () {
      div.style.opacity = 0.5
      img.style.opacity = 1
      toCenter()
    }, 0)
  }
})

// 切换夜间模式
blog.addLoadEvent(function () {
  const $themeToggle = document.getElementById('theme-toggle')

  function toggleTheme() {
    blog.setDarkTheme(!blog.darkTheme)
    blog.setStoredTheme(blog.darkTheme)
  }

  if ($themeToggle) {
    blog.addEvent($themeToggle, 'click', function (event) {
      toggleTheme()
      event.stopPropagation()
    })
  }
})

// 标题定位
blog.addLoadEvent(function () {
  if (!document.querySelector('.page-post')) {
    return
  }
  const list = document.querySelectorAll('.post h1, .post h2, .post h3, .post h4, .post h5')
  for (let i = 0; i < list.length; i++) {
    blog.addEvent(list[i], 'click', function (event) {
      const el = event.currentTarget
      el.scrollIntoView({ block: 'start' })
      if (el.id) {
        history.replaceState({}, '', '#' + el.id)
      }
    })
  }
})

// 文章目录：桌面端固定右侧，非桌面端从右下角展开
blog.initPostToc = function () {
  const page = document.querySelector('.page-post')
  const actions = document.getElementById('footer-actions')
  if (!page) {
    return
  }

  const headings = Array.from(page.querySelectorAll('.post h3, .post h4, .post h5'))
  if (headings.length < 2) {
    return
  }

  const tocToggle = document.createElement('button')
  tocToggle.id = 'toc-toggle'
  tocToggle.type = 'button'
  tocToggle.setAttribute('aria-label', '展开文章目录')
  tocToggle.title = '文章目录'
  tocToggle.setAttribute('aria-controls', 'post-toc-panel')
  tocToggle.setAttribute('aria-expanded', 'false')
  tocToggle.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>' +
    '<path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>' +
    '</svg>'

  const aside = document.createElement('aside')
  aside.className = 'post-toc'
  aside.id = 'post-toc-panel'
  aside.setAttribute('aria-label', '文章目录')

  const tocOverlay = document.createElement('div')
  tocOverlay.className = 'post-toc-overlay'
  tocOverlay.setAttribute('aria-hidden', 'true')

  const list = document.createElement('ul')
  list.className = 'post-toc-list'
  const links = []
  let firstLink = null

  headings.forEach(function (heading, index) {
    if (!heading.id) {
      heading.id = 'toc-heading-' + (index + 1)
    }

    const item = document.createElement('li')
    item.className = 'toc-level-' + heading.tagName.toLowerCase()

    const link = document.createElement('a')
    link.href = '#' + encodeURIComponent(heading.id)
    link.textContent = heading.textContent
    link.title = heading.textContent
    link.onclick = function (event) {
      event.preventDefault()
      setActive(link)
      setTocOpen(false, true)
      window.scrollTo(0, window.scrollY + heading.getBoundingClientRect().top - 16)
      history.replaceState({}, '', '#' + encodeURIComponent(heading.id))
    }

    links.push(link)
    if (!firstLink) {
      firstLink = link
    }
    item.appendChild(link)
    list.appendChild(item)
  })

  aside.appendChild(list)
  tocToggle.onclick = function (event) {
    event.stopPropagation()
    setTocOpen(!aside.classList.contains('open'), false)
  }

  function setTocOpen(opened, returnFocus) {
    aside.classList.toggle('open', opened)
    tocOverlay.classList.toggle('show', opened)
    document.body.classList.toggle('toc-open', opened)
    tocToggle.setAttribute('aria-expanded', opened ? 'true' : 'false')

    if (opened && firstLink) {
      window.requestAnimationFrame(function () {
        firstLink.focus()
      })
    } else if (!opened && returnFocus && aside.contains(document.activeElement)) {
      const focusTarget =
        window.matchMedia('(max-width: 700px)').matches
          ? document.getElementById('footer-actions-toggle') || tocToggle
          : tocToggle
      focusTarget.focus()
    }
  }

  function closeToc() {
    setTocOpen(false, true)
  }

  document.body.appendChild(aside)
  document.body.appendChild(tocOverlay)
  blog.addEvent(tocOverlay, 'click', closeToc)

  if (actions) {
    const actionsPanel = document.getElementById('footer-actions-panel')
    if (actionsPanel) {
      actionsPanel.appendChild(tocToggle)
    } else {
      actions.appendChild(tocToggle)
    }
    blog.addClass(actions, 'has-mobile-toc')
  }

  blog.addEvent(document, 'keydown', function (event) {
    if (event.key === 'Escape' && aside.classList.contains('open')) {
      closeToc()
    }
  })

  const desktopViewport = window.matchMedia('(min-width: 1200px)')
  function resetOnDesktop(event) {
    if (event.matches) {
      setTocOpen(false, false)
    }
  }

  desktopViewport.addEventListener('change', resetOnDesktop)

  let ticking = false

  function setActive(link) {
    links.forEach(function (item) {
      blog.removeClass(item, 'active')
    })
    blog.addClass(link, 'active')
  }

  function updateActiveHeading() {
    ticking = false

    const scrolledToBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4

    if (scrolledToBottom) {
      setActive(links[links.length - 1])
      return
    }

    let activeLink = null
    links.forEach(function (link, index) {
      if (headings[index].getBoundingClientRect().top <= 120) {
        activeLink = link
      }
    })

    if (activeLink) {
      setActive(activeLink)
    } else {
      links.forEach(function (item) {
        blog.removeClass(item, 'active')
      })
    }
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true
      window.requestAnimationFrame(updateActiveHeading)
    }
  }, { passive: true })

  updateActiveHeading()
}

blog.addLoadEvent(blog.initPostToc)
blog.addLoadEvent(blog.initCodeCopy)

// 标记当前导航项，帮助读者确认所在页面
blog.addLoadEvent(function () {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'
  const menuLinks = document.querySelectorAll('.header .menu a')
  menuLinks.forEach(function (link) {
    const linkPath = link.pathname.replace(/\/+$/, '') || '/'
    if (linkPath === currentPath) {
      link.classList.add('is-active')
      link.setAttribute('aria-current', 'page')
    }
  })
})

// 文章打开计数；失败时静默跳过，不影响阅读体验
blog.addLoadEvent(function () {
  const page = document.querySelector('.page-post[data-counter-key]')
  if (
    !page ||
    !blog.pageViewEndpoint ||
    !blog.pageViewNamespace ||
    window.location.hostname !== 'uhaiin.com'
  ) {
    return
  }

  const key = blog.trim(page.getAttribute('data-counter-key'))
  if (!/^[A-Za-z0-9_.-]{3,64}$/.test(key)) {
    return
  }

  const namespace = encodeURIComponent(blog.pageViewNamespace)
  const counterKey = encodeURIComponent(key)
  fetch(blog.pageViewEndpoint + '/hit/' + namespace + '/' + counterKey, {
    cache: 'no-store',
    credentials: 'omit',
    keepalive: true,
    redirect: 'error',
    referrerPolicy: 'no-referrer'
  }).catch(function () {})
})

// 首页热门文章：构建时生成热门索引，异常时保留最新文章兜底
blog.addLoadEvent(function () {
  const sidebar = document.querySelector('body.popular-body .popular-index')
  const list = sidebar ? sidebar.querySelector('ul') : null
  if (!list) {
    return
  }

  fetch(blog.baseurl + '/static/json/popular-posts.json', {
    cache: 'no-store',
    credentials: 'omit'
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('popular posts request failed')
      }
      return response.json()
    })
    .then(function (data) {
      const posts = Array.isArray(data.posts) ? data.posts.slice(0, 20) : []
      if (!posts.length) {
        return
      }

      list.textContent = ''
      posts.forEach(function (post) {
        if (!post.url || !post.title) {
          return
        }

        const item = document.createElement('li')
        const link = document.createElement('a')
        link.href = post.url
        link.title = post.title
        link.textContent = post.title
        item.appendChild(link)
        list.appendChild(item)
      })
    })
    .catch(function () {})
})

// 首页最新评论：构建时从 GitHub Discussions 拉取
blog.addLoadEvent(function () {
  const list = document.getElementById('latest-comment-list')
  const empty = document.getElementById('latest-comment-empty')
  if (!list || !empty) {
    return
  }

  fetch(blog.baseurl + '/static/json/latest-comments.json', {
    cache: 'no-store',
    credentials: 'omit'
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('latest comments request failed')
      }
      return response.json()
    })
    .then(function (data) {
      const comments = Array.isArray(data.comments) ? data.comments.slice(0, 10) : []
      list.textContent = ''
      empty.hidden = comments.length > 0
      const rail = list.closest('.right-rail')

      comments.forEach(function (comment) {
        if (!comment.postUrl || !comment.author) {
          return
        }

        const body = blog.trim(comment.body) || '评论'
        const text = comment.author + '：' + body
        const item = document.createElement('li')
        const link = document.createElement('a')
        link.href = blog.baseurl + comment.postUrl + '#post-comments'
        link.title = text

        const name = document.createElement('span')
        name.className = 'rail-name'
        name.textContent = text
        link.appendChild(name)
        item.appendChild(link)
        list.appendChild(item)
      })

      if (rail) {
        while (list.lastElementChild && rail.scrollHeight > rail.clientHeight) {
          list.removeChild(list.lastElementChild)
        }
      }

      empty.hidden = list.children.length > 0
    })
    .catch(function () {})
})

// 首页年份列表和分类列表手动分批展示
blog.addLoadEvent(function () {
  const buttons = document.querySelectorAll('.list-post .load-more')

  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i]
    const section = button.closest('.list-post')
    const list = section ? section.querySelector('ul') : null
    if (!list) {
      continue
    }

    blog.addEvent(button, 'click', function () {
      const hiddenItems = Array.prototype.filter.call(list.children, function (item) {
        return item.hidden
      })
      if (!hiddenItems.length) {
        return
      }

      const pageSize = Number(button.getAttribute('data-page-size')) || 20
      const nextItems = hiddenItems.slice(0, pageSize)
      nextItems.forEach(function (item) {
        item.hidden = false
      })

      const remainingCount = hiddenItems.length - nextItems.length
      const count = button.querySelector('.load-more-count')
      if (!remainingCount) {
        button.remove()
      } else {
        count.textContent = '还有 ' + remainingCount + ' 篇'
      }

      window.requestAnimationFrame(function () {
        const header = document.querySelector('.header')
        const headerBottom = header ? Math.max(header.getBoundingClientRect().bottom, 0) : 0
        const nextTop = window.scrollY + nextItems[0].getBoundingClientRect().top - headerBottom - 12
        window.scrollTo({ top: Math.max(nextTop, 0), behavior: 'smooth' })
      })
    })
  }
})
