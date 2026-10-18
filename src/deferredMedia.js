let nearViewportObserver
const callbacks = new WeakMap()

function getNearViewportObserver() {
  if (nearViewportObserver || !('IntersectionObserver' in window)) return nearViewportObserver

  nearViewportObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      callbacks.get(entry.target)?.()
      callbacks.delete(entry.target)
      observer.unobserve(entry.target)
    })
  }, { rootMargin: '500px 0px', threshold: 0.01 })

  return nearViewportObserver
}

export function observeNearViewport(element, callback) {
  if (!element) return () => {}
  const observer = getNearViewportObserver()
  if (!observer) {
    callback()
    return () => {}
  }

  callbacks.set(element, callback)
  observer.observe(element)
  return () => {
    callbacks.delete(element)
    observer.unobserve(element)
  }
}

export function loadDeferredImage(image) {
  if (!image || image.dataset.mediaLoaded === 'true') return
  image.classList.add('is-media-loading')
  image.addEventListener('load', () => image.classList.remove('is-media-loading'), { once: true })
  if (image.dataset.srcset) image.srcset = image.dataset.srcset
  if (image.dataset.sizes) image.sizes = image.dataset.sizes
  if (image.dataset.src) image.src = image.dataset.src
  image.dataset.mediaLoaded = 'true'
}

export function observeDeferredImage(image) {
  return observeNearViewport(image, () => loadDeferredImage(image))
}
