import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const profileDirectory = await mkdtemp(join(tmpdir(), 'nicolopes-chrome-'))
const screenshotDirectory = await mkdtemp(join(tmpdir(), 'nicolopes-screens-'))
const debuggingPort = 9334
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

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pendingCommands.has(message.id)) {
    const { resolve, reject } = pendingCommands.get(message.id)
    pendingCommands.delete(message.id)
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
  return new Promise((resolve, reject) => {
    pendingCommands.set(commandId, { resolve, reject })
    socket.send(JSON.stringify({ id: commandId, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function navigate(url) {
  await send('Page.navigate', { url })
  await delay(900)
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

  for (const route of ['/', '/realisations/']) {
    await navigate(`http://127.0.0.1:4174${route}`)
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

    const initialTheme = await evaluate(`document.documentElement.dataset.theme`)
    await evaluate(`document.querySelector('.theme-toggle').click()`)
    await delay(1650)
    const toggledTheme = await evaluate(`document.documentElement.dataset.theme`)
    await evaluate(`document.querySelector('.theme-toggle').click()`)
    await delay(1650)
    const restoredTheme = await evaluate(`document.documentElement.dataset.theme`)

    let burger = 'not-applicable'
    if (width <= 768) {
      burger = await evaluate(`(() => {
        const button = document.querySelector('.menu-toggle')
        button.click()
        const opened = button.getAttribute('aria-expanded') === 'true' && document.querySelector('.main-nav').classList.contains('is-open')
        button.click()
        const closed = button.getAttribute('aria-expanded') === 'false' && !document.querySelector('.main-nav').classList.contains('is-open')
        return opened && closed
      })()`)
    }

    await evaluate(`scrollTo(0, document.documentElement.scrollHeight)`)
    await delay(1200)
    const loadedMediaChecks = await evaluate(`(() => ({
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
      mp4Requests: performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.mp4')).length,
      webpRequests: performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.webp')).length,
    }))()`)

    if ((width === 390 || width === 1280) && route === '/realisations/') {
      await evaluate(`document.querySelector('.theme-toggle').click()`)
      await delay(1650)
      const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
      await writeFile(join(screenshotDirectory, `realisations-${width}-dark.png`), Buffer.from(capture.data, 'base64'))
    }

    results.push({
      ...baseChecks,
      initialTheme,
      toggledTheme,
      restoredTheme,
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
await rm(profileDirectory, { recursive: true, force: true })
