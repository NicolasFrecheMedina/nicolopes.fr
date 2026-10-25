import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const previewPort = Number(process.env.NICOLOPES_QA_PORT || 4174)
const profileDirectory = await mkdtemp(join(tmpdir(), 'nicolopes-chrome-'))
const screenshotDirectory = await mkdtemp(join(tmpdir(), 'nicolopes-screens-'))
const debuggingPort = 9400 + Math.floor(Math.random() * 500)
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-allow-origins=*',
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profileDirectory}`,
  'about:blank',
], { stdio: 'ignore' })
const chromeExit = new Promise((resolve) => chrome.once('exit', resolve))

const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration))

async function retry(callback, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await callback()
    } catch {
      await delay(100)
    }
  }
  throw new Error('Chrome DevTools Protocol indisponible')
}

const version = await retry(async () => {
  const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`)
  if (!response.ok) throw new Error('Chrome non prêt')
  return response.json()
})

const pageResponse = await fetch(`http://127.0.0.1:${debuggingPort}/json/new?about:blank`, { method: 'PUT' })
const page = await pageResponse.json()
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
const keepAlive = setInterval(() => {}, 1000)

let commandId = 0
const pendingCommands = new Map()
const consoleErrors = []

socket.addEventListener('message', async (event) => {
  const payload = typeof event.data === 'string' ? event.data : await event.data.text()
  const message = JSON.parse(payload)
  if (message.id && pendingCommands.has(message.id)) {
    const { resolve, reject, timeout } = pendingCommands.get(message.id)
    pendingCommands.delete(message.id)
    clearTimeout(timeout)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(message.params.exceptionDetails.text)
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    consoleErrors.push(message.params.entry.text)
  }
})

function send(method, params = {}) {
  commandId += 1
  const id = commandId
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCommands.delete(id)
      reject(new Error(`Délai dépassé pour la commande Chrome ${method}`))
    }, 10000)
    pendingCommands.set(id, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text
    throw new Error(description)
  }
  return result.result.value
}

async function navigate(url) {
  await send('Page.navigate', { url })
  await retry(async () => {
    const ready = await evaluate(`document.readyState === 'complete' && Boolean(document.querySelector('.theme-toggle'))`)
    if (!ready) throw new Error('Page non prête')
    return true
  })
  await delay(300)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Network.enable')

const results = []
for (const width of [390, 768, 1280]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: width === 390 ? 844 : width === 768 ? 1024 : 900,
    deviceScaleFactor: 1,
    mobile: width <= 768,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: width <= 760, maxTouchPoints: 1 })

  for (const route of ['/', '/realisations/']) {
    await navigate(`http://127.0.0.1:${previewPort}${route}`)
    await delay(900)

    const baseChecks = await evaluate(`(() => {
      const credit = document.querySelector('.footer-credit-link')
      const images = [...document.images]
      return {
        route: location.pathname,
        width: innerWidth,
        overflow: document.documentElement.scrollWidth - innerWidth,
        asciiSignature: document.childNodes[0]?.nodeType === Node.COMMENT_NODE && document.childNodes[0].textContent.includes('Powered by'),
        nacodev: credit?.textContent.trim() === 'Nacodev' && credit?.href === 'https://nacodev.com/' && credit?.target === '_blank' && credit?.rel === 'noopener noreferrer',
        brokenImages: images.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
        heroVideoSources: [...document.querySelectorAll('.realisations-hero-video')].filter((video) => video.getAttribute('src')).length,
      }
    })()`)

    const comparatorSelector = route === '/'
      ? '.comparison-grid .comparison-card:last-child .before-after'
      : '#projet-v1 .before-after'
    const comparatorChecks = await evaluate(`(() => {
      const slider = document.querySelector(${JSON.stringify(comparatorSelector)})
      const images = slider ? [...slider.querySelectorAll('img')] : []
      slider?.focus()
      return {
        found: Boolean(slider),
        before: images[1]?.dataset.src || images[1]?.getAttribute('src') || '',
        after: images[0]?.dataset.src || images[0]?.getAttribute('src') || '',
        labels: slider ? [...slider.querySelectorAll('.comparison-label')].map((label) => label.textContent.trim()) : [],
        initialPosition: slider?.getAttribute('aria-valuenow') || null,
      }
    })()`)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    comparatorChecks.keyboardPosition = await evaluate(`document.querySelector(${JSON.stringify(comparatorSelector)})?.getAttribute('aria-valuenow')`)

    await evaluate(`document.querySelector(${JSON.stringify(comparatorSelector)})?.scrollIntoView({ block: 'center' })`)
    await delay(150)
    const comparatorBounds = await evaluate(`(() => {
      const bounds = document.querySelector(${JSON.stringify(comparatorSelector)})?.getBoundingClientRect()
      return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null
    })()`)
    if (comparatorBounds && width === 390 && route === '/realisations/') {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
      const y = comparatorBounds.y + comparatorBounds.height / 2
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: comparatorBounds.x + comparatorBounds.width * 0.3, y }] })
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: comparatorBounds.x + comparatorBounds.width * 0.7, y }] })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      comparatorChecks.touchPosition = await evaluate(`document.querySelector(${JSON.stringify(comparatorSelector)})?.getAttribute('aria-valuenow')`)
    }
    if (comparatorBounds && width >= 1280) {
      const y = comparatorBounds.y + comparatorBounds.height / 2
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: comparatorBounds.x + comparatorBounds.width * 0.3, y, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: comparatorBounds.x + comparatorBounds.width * 0.7, y, button: 'left' })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: comparatorBounds.x + comparatorBounds.width * 0.7, y, button: 'left', clickCount: 1 })
      comparatorChecks.mousePosition = await evaluate(`document.querySelector(${JSON.stringify(comparatorSelector)})?.getAttribute('aria-valuenow')`)
    }
    comparatorChecks.locationAfterInteraction = await evaluate(`location.pathname`)

    const contentChecks = route === '/' ? await evaluate(`(() => {
      const reviewsSection = document.querySelector('.customer-reviews-section')
      const alloGarage = reviewsSection?.querySelector('.customer-reviews-actions > a')
      const google = document.querySelector('.google-reviews-link')
      const legal = document.querySelector('[aria-labelledby="legal-dialog-title"]')?.textContent || ''
      const privacy = document.querySelector('[aria-labelledby="privacy-dialog-title"]')?.textContent || ''
      return {
        googlePreserved: google?.href.includes('google.com/maps') && google?.target === '_blank',
        alloGarageHref: alloGarage?.href,
        alloGarageLabel: alloGarage?.textContent.trim(),
        reviewTitle: reviewsSection?.querySelector('h2')?.textContent.trim(),
        reviewDates: [...(reviewsSection?.querySelectorAll('.customer-review-card[data-review-clone="false"] cite') || [])].map((date) => date.textContent.trim()),
        reviewCardCount: reviewsSection?.querySelectorAll('.customer-review-card[data-review-clone="false"]').length || 0,
        renderedReviewCardCount: reviewsSection?.querySelectorAll('.customer-review-card').length || 0,
        embeddedReviewWidgets: reviewsSection?.querySelectorAll('iframe, script').length || 0,
        legalComplete: ['SARL CARROSSERIE NICOLOPES', '94531614900018', 'FR05945316149', '5 000 €', 'Netlify, Inc.', 'Jonathan NICOLAS et Christophe LOPES'].every((value) => legal.includes(value)),
        legalRemovedContent: ['Leur qualité exacte reste à confirmer', 'Immatriculation au RCS', 'OVHcloud'].every((value) => !legal.includes(value)),
        legalAddress: legal.includes('83 Rue Friques Ouest, 40260 Castets'),
        privacyIdentity: privacy.includes('SARL CARROSSERIE NICOLOPES') && privacy.includes('83 Rue Friques Ouest, 40260 Castets'),
      }
    })()`) : null

    let reviewChecks = null
    if (route === '/') {
      await evaluate(`document.querySelector('.customer-reviews-section')?.scrollIntoView({ block: 'center' })`)
      await delay(200)
      reviewChecks = await evaluate(`(() => {
        const track = document.querySelector('.customer-reviews-track')
        const card = track?.querySelector('.customer-review-card')
        return {
          visibleCards: track && card ? Math.round(track.clientWidth / card.getBoundingClientRect().width) : 0,
          initialScrollLeft: track?.scrollLeft || 0,
          arrowsAlwaysActive: [...document.querySelectorAll('.customer-reviews-arrows button')].every((button) => !button.disabled),
          sectionHeight: document.querySelector('.customer-reviews-section')?.getBoundingClientRect().height || 0,
        }
      })()`)

      const getReviewLoopState = `(() => {
        const track = document.querySelector('.customer-reviews-track')
        if (!track) return null
        const trackBounds = track.getBoundingClientRect()
        const cards = [...track.querySelectorAll('.customer-review-card')]
        const visibleReviewIndexes = cards
          .filter((card) => {
            const bounds = card.getBoundingClientRect()
            return bounds.right > trackBounds.left + 2 && bounds.left < trackBounds.right - 2
          })
          .map((card) => Number(card.dataset.reviewIndex))
        const firstVisible = visibleReviewIndexes[0]
        return {
          firstVisible,
          visibleReviewIndexes,
          uniqueVisibleReviews: new Set(visibleReviewIndexes).size === visibleReviewIndexes.length,
          scrollLeft: track.scrollLeft,
        }
      })()`

      reviewChecks.forwardLoop = []
      for (let click = 0; click < 22; click += 1) {
        await evaluate(`document.querySelector('.customer-reviews-arrows button:last-child')?.click()`)
        await delay(360)
        reviewChecks.forwardLoop.push(await evaluate(getReviewLoopState))
      }

      reviewChecks.backwardLoop = []
      for (let click = 0; click < 22; click += 1) {
        await evaluate(`document.querySelector('.customer-reviews-arrows button:first-child')?.click()`)
        await delay(360)
        reviewChecks.backwardLoop.push(await evaluate(getReviewLoopState))
      }

      await evaluate(`document.querySelector('.customer-reviews-track')?.focus()`)
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 })
      await delay(360)
      reviewChecks.keyboardState = await evaluate(getReviewLoopState)

      if (width === 390) {
        const reviewBounds = await evaluate(`(() => {
          const bounds = document.querySelector('.customer-reviews-track')?.getBoundingClientRect()
          return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null
        })()`)
        if (reviewBounds) {
          const y = reviewBounds.y + reviewBounds.height / 2
          await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: reviewBounds.x + reviewBounds.width * 0.75, y }] })
          await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: reviewBounds.x + reviewBounds.width * 0.25, y }] })
          await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          await delay(500)
          reviewChecks.touchState = await evaluate(getReviewLoopState)
        }
      }

      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      })
      await delay(50)
      const reducedMotionBefore = await evaluate(getReviewLoopState)
      await evaluate(`document.querySelector('.customer-reviews-arrows button:last-child')?.click()`)
      await delay(30)
      const reducedMotionAfter = await evaluate(getReviewLoopState)
      reviewChecks.reducedMotion = {
        before: reducedMotionBefore?.firstVisible,
        after: reducedMotionAfter?.firstVisible,
        immediate: reducedMotionBefore?.firstVisible !== reducedMotionAfter?.firstVisible,
      }
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
      })
      await delay(50)
    }

    const initialTheme = await evaluate(`document.documentElement.dataset.theme`)
    const themeToggleAvailable = await evaluate(`(() => {
      const button = document.querySelector('.theme-toggle')
      button?.click()
      return Boolean(button)
    })()`)
    await delay(1650)
    const toggledTheme = await evaluate(`document.documentElement.dataset.theme`)
    await evaluate(`document.querySelector('.theme-toggle')?.click()`)
    await delay(1650)
    const restoredTheme = await evaluate(`document.documentElement.dataset.theme`)

    const visualTarget = route === '/' ? '.customer-reviews-section' : '#projet-v1'
    await evaluate(`document.querySelector(${JSON.stringify(visualTarget)})?.scrollIntoView({ block: 'center' })`)
    await delay(300)
    const routeSlug = route === '/' ? 'accueil' : 'realisations'
    const restoredCapture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    await writeFile(join(screenshotDirectory, `${routeSlug}-${width}-${restoredTheme}.png`), Buffer.from(restoredCapture.data, 'base64'))
    await evaluate(`document.querySelector('.theme-toggle')?.click()`)
    await delay(1650)
    const alternateTheme = await evaluate(`document.documentElement.dataset.theme`)
    const alternateCapture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    await writeFile(join(screenshotDirectory, `${routeSlug}-${width}-${alternateTheme}.png`), Buffer.from(alternateCapture.data, 'base64'))
    await evaluate(`document.querySelector('.theme-toggle')?.click()`)
    await delay(1650)

    let burger = 'not-applicable'
    if (width <= 760) {
      await evaluate(`document.querySelector('.menu-toggle')?.click()`)
      await delay(50)
      const opened = await evaluate(`document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true' && document.querySelector('.main-nav')?.classList.contains('is-open')`)
      await evaluate(`document.querySelector('.menu-toggle')?.click()`)
      await delay(50)
      const closed = await evaluate(`document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'false' && !document.querySelector('.main-nav')?.classList.contains('is-open')`)
      burger = opened && closed
    }

    await evaluate(`scrollTo(0, document.documentElement.scrollHeight)`)
    await delay(1200)
    const loadedMediaChecks = await evaluate(`(() => ({
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
      mp4Requests: performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.mp4')).length,
      webpRequests: performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.webp')).length,
    }))()`)

    results.push({
      ...baseChecks,
      comparatorChecks,
      contentChecks,
      reviewChecks,
      initialTheme,
      toggledTheme,
      restoredTheme,
      themeToggleAvailable,
      burger,
      loadedMediaChecks,
    })
  }
}

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await navigate('http://127.0.0.1:4174/')
const introOnNavigation = await evaluate(`Boolean(document.querySelector('.garage-intro'))`)
await delay(1500)
await send('Page.reload', { ignoreCache: true })
await delay(250)
const introOnReload = await evaluate(`Boolean(document.querySelector('.garage-intro'))`)

const responseChecks = await Promise.all(['/','/realisations','/realisations/'].map(async (route) => {
  const response = await fetch(`http://127.0.0.1:4174${route}`)
  return { route, status: response.status, contentType: response.headers.get('content-type') }
}))

console.log(JSON.stringify({
  chrome: version.Browser,
  results,
  introOnNavigation,
  introOnReload,
  responseChecks,
  consoleErrors,
  screenshotDirectory,
}, null, 2))

socket.close()
chrome.kill()
clearInterval(keepAlive)
await Promise.race([chromeExit, delay(3000)])
await rm(profileDirectory, { recursive: true, force: true })
