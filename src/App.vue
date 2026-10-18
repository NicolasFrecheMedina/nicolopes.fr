<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { businessInfo } from './config/business.js'
import BeforeAfter from './components/BeforeAfter.vue'
import { loadDeferredImage, observeDeferredImage, observeNearViewport } from './deferredMedia.js'

const menuOpen = ref(false)
const theme = ref(localStorage.getItem('nico-lopes-theme') === 'dark' ? 'dark' : 'light')
const themeTransitioning = ref(false)
const sprayActive = ref(false)
const contactDialog = ref(null)
const legalDialog = ref(null)
const privacyDialog = ref(null)
const serviceDialog = ref(null)
const galleryDialog = ref(null)
const galleryVideo = ref(null)
const galleryVideoPlaying = ref(false)
const realisationsVideoRefs = ref([])
const activeServiceIndex = ref(0)
const activeGalleryProjectIndex = ref(0)
const activeGalleryMediaIndex = ref(0)
const activeRealisationsVideoIndex = ref(0)
const galleryPageByProject = ref({})
const themeToggle = ref(null)
let lastServiceTrigger = null
let lastGalleryTrigger = null
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const realisationsVideoPaused = ref(reducedMotionQuery.matches)
const introVisible = ref(!reducedMotionQuery.matches)
const introOpening = ref(false)
let introAnimationFrame = null
let introFallbackTimeout = null
const normalisePath = (path) => path.replace(/\/+$/, '') || '/'
const currentPath = ref(normalisePath(window.location.pathname))
const isRealisationsPage = computed(() => currentPath.value === '/realisations')
document.documentElement.dataset.theme = theme.value
document.querySelector('meta[name="theme-color"]')?.setAttribute(
  'content',
  theme.value === 'dark' ? '#11151a' : '#f8f9fa',
)
const logoSource = computed(() => (
  theme.value === 'dark'
    ? '/ressources/01-logo/Nico-Lopes-navbar-144.webp'
    : '/ressources/01-logo/Nico-Lopes-navbar-light-144.webp'
))
const logoSrcset = computed(() => (
  theme.value === 'dark'
    ? '/ressources/01-logo/Nico-Lopes-navbar-144.webp 144w, /ressources/01-logo/Nico-Lopes-navbar-366.webp 366w'
    : '/ressources/01-logo/Nico-Lopes-navbar-light-144.webp 144w, /ressources/01-logo/Nico-Lopes-navbar-light-366.webp 366w'
))
const aboutPhotoName = computed(() => (theme.value === 'dark' ? 'c-v02' : 'c-v01'))
const aboutPhotoSource = computed(() => `/ressources/04-atelier/${aboutPhotoName.value}-400.webp`)
const aboutPhotoSrcset = computed(() => (
  `/ressources/04-atelier/${aboutPhotoName.value}-400.webp 400w, /ressources/04-atelier/${aboutPhotoName.value}-800.webp 800w`
))
const phoneHref = computed(() => `tel:${businessInfo.phone.replace(/\s/g, '')}`)
const emailHref = computed(() => `mailto:${businessInfo.email}`)
const directionsHref = 'https://www.google.com/maps/dir/?api=1&destination=43.8747615%2C-1.1543348'
const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
let sprayTimeout
let lastContactTrigger = null
let lastLegalTrigger = null
let revealObserver = null
let scrollAnimationFrame = null
const prefetchedAboutThemes = new Set()

const vDeferredImage = {
  mounted(element) {
    element.__stopDeferredImage = observeDeferredImage(element)
  },
  updated(element, binding) {
    if (binding.value === binding.oldValue || element.dataset.mediaLoaded !== 'true') return
    element.dataset.mediaLoaded = 'false'
    loadDeferredImage(element)
  },
  unmounted(element) {
    element.__stopDeferredImage?.()
  },
}

const vDeferredTrustBackground = {
  mounted(element) {
    element.__stopDeferredBackground = observeNearViewport(element, () => {
      const image = new Image()
      image.srcset = [
        '/ressources/04-atelier/confiance-768.webp 768w',
        '/ressources/04-atelier/confiance-1440.webp 1440w',
        '/ressources/04-atelier/confiance-1920.webp 1920w',
      ].join(', ')
      image.sizes = '100vw'
      image.addEventListener('load', () => {
        element.style.setProperty('--trust-photo-image', `url("${image.currentSrc || image.src}")`)
        element.classList.add('is-media-ready')
      }, { once: true })
      image.src = '/ressources/04-atelier/confiance-1440.webp'
    })
  },
  unmounted(element) {
    element.__stopDeferredBackground?.()
  },
}

function prefetchAlternateAboutPhoto() {
  const alternate = theme.value === 'dark' ? 'c-v01' : 'c-v02'
  if (prefetchedAboutThemes.has(alternate)) return
  prefetchedAboutThemes.add(alternate)
  const preload = () => {
    const image = new Image()
    image.srcset = [
      `/ressources/04-atelier/${alternate}-400.webp 400w`,
      `/ressources/04-atelier/${alternate}-800.webp 800w`,
    ].join(', ')
    image.sizes = '220px'
    image.src = `/ressources/04-atelier/${alternate}-400.webp`
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 1200 })
  else window.setTimeout(preload, 250)
}

function handleAboutPhotoLoad(event) {
  if (event.currentTarget.dataset.mediaLoaded === 'true') prefetchAlternateAboutPhoto()
}

const revealTitleSelectors = [
  '.services-section .section-heading',
  '.work-section .section-heading',
  '.about-copy > h2',
  '.free-choice-column > h3',
  '.trust-heading',
  '.realisation-project-heading',
]

const revealGroups = [
  { container: '.services-grid', items: ':scope > .service-card' },
  { container: '.comparison-grid', items: ':scope > .comparison-card' },
  { container: '.free-choice-list', items: ':scope > li' },
  { container: '.trust-grid', items: ':scope > .trust-item' },
  { container: '.realisations-gallery', items: ':scope > .gallery-thumbnail:not(.gallery-thumbnail-placeholder)' },
]

function prepareScrollReveals() {
  document.documentElement.classList.remove('scroll-effects-ready')
  revealObserver?.disconnect()
  revealObserver = null
}

function setupScrollReveals() {
  prepareScrollReveals()
  if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) return

  try {
    const targets = new Set()
    document.querySelectorAll(revealTitleSelectors.join(',')).forEach((element) => {
      element.classList.add('scroll-reveal', 'scroll-reveal-title')
      element.style.setProperty('--reveal-delay', '0ms')
      targets.add(element)
    })

    document.querySelectorAll('.about-copy-body').forEach((element) => {
      element.classList.add('scroll-reveal', 'scroll-reveal-media')
      element.style.setProperty('--reveal-delay', '120ms')
      targets.add(element)
    })

    revealGroups.forEach(({ container, items }) => {
      document.querySelectorAll(container).forEach((group) => {
        group.querySelectorAll(items).forEach((element, index) => {
          element.classList.add('scroll-reveal', 'scroll-reveal-item')
          element.style.setProperty('--reveal-delay', `${120 + Math.min(index, 5) * 105}ms`)
          targets.add(element)
        })
      })
    })

    document.querySelectorAll('.project-comparison').forEach((element) => {
      element.classList.add('scroll-reveal', 'scroll-reveal-media')
      element.style.setProperty('--reveal-delay', '120ms')
      targets.add(element)
    })

    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        observer.unobserve(entry.target)
      })
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12,
    })

    targets.forEach((element) => {
      const bounds = element.getBoundingClientRect()
      if (bounds.top < window.innerHeight * 0.92 && bounds.bottom > 0) {
        element.classList.add('is-revealed')
      } else {
        revealObserver.observe(element)
      }
    })
    document.documentElement.classList.add('scroll-effects-ready')
  } catch {
    prepareScrollReveals()
  }
}

function updateScrollEffects() {
  scrollAnimationFrame = null
  const header = document.querySelector('.site-header')
  header?.classList.toggle('is-scrolled', window.scrollY > 70)

  const hero = document.querySelector('.hero')
  const trustSection = document.querySelector('.trust-section')
  if (reducedMotionQuery.matches || window.innerWidth <= 760) {
    hero?.style.setProperty('--hero-parallax-y', '0px')
    trustSection?.style.setProperty('--trust-parallax-y', '0px')
    return
  }

  if (hero) {
    const heroOffset = Math.min(22, Math.max(0, window.scrollY * 0.04))
    hero.style.setProperty('--hero-parallax-y', `${heroOffset.toFixed(2)}px`)
  }

  if (trustSection) {
    const bounds = trustSection.getBoundingClientRect()
    const distanceFromCenter = window.innerHeight / 2 - (bounds.top + bounds.height / 2)
    const trustOffset = Math.min(20, Math.max(-20, distanceFromCenter * 0.035))
    trustSection.style.setProperty('--trust-parallax-y', `${trustOffset.toFixed(2)}px`)
  }
}

function scheduleScrollEffects() {
  if (scrollAnimationFrame !== null) return
  scrollAnimationFrame = window.requestAnimationFrame(updateScrollEffects)
}

function openContactDialog(event) {
  menuOpen.value = false
  lastContactTrigger = window.matchMedia('(max-width: 1060px)').matches
    ? document.querySelector('.menu-toggle')
    : event.currentTarget
  contactDialog.value?.showModal()
}

function closeContactDialog() {
  contactDialog.value?.close()
  restoreContactFocus()
}

function restoreContactFocus() {
  const trigger = lastContactTrigger
  window.setTimeout(() => trigger?.focus(), 0)
}

function openLegalDialog(type, event) {
  lastLegalTrigger = event.currentTarget
  const dialog = type === 'privacy' ? privacyDialog.value : legalDialog.value
  dialog?.showModal()
}

function closeLegalDialog(type) {
  const dialog = type === 'privacy' ? privacyDialog.value : legalDialog.value
  dialog?.close()
  const trigger = lastLegalTrigger
  window.setTimeout(() => trigger?.focus(), 0)
}

function toggleTheme() {
  if (themeTransitioning.value) return

  const nextTheme = theme.value === 'dark' ? 'light' : 'dark'
  const applyTheme = () => {
    theme.value = nextTheme
    document.documentElement.dataset.theme = nextTheme
    localStorage.setItem('nico-lopes-theme', nextTheme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      nextTheme === 'dark' ? '#11151a' : '#f8f9fa',
    )
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reducedMotion) {
    applyTheme()
    return
  }

  sprayActive.value = true
  window.clearTimeout(sprayTimeout)
  sprayTimeout = window.setTimeout(() => {
    sprayActive.value = false
  }, 600)

  if (document.startViewTransition) {
    themeTransitioning.value = true
    document.documentElement.classList.add('theme-transitioning')
    const transition = document.startViewTransition(applyTheme)
    transition.finished.then(
      () => {
        themeTransitioning.value = false
        document.documentElement.classList.remove('theme-transitioning')
      },
      () => {
        themeTransitioning.value = false
        document.documentElement.classList.remove('theme-transitioning')
      },
    )
    return
  }

  document.documentElement.classList.add('theme-color-transition')
  applyTheme()
  window.setTimeout(() => {
    document.documentElement.classList.remove('theme-color-transition')
  }, 1500)
}

function clearIntroSchedule() {
  window.clearTimeout(introFallbackTimeout)
  introFallbackTimeout = null
  if (introAnimationFrame !== null) {
    window.cancelAnimationFrame(introAnimationFrame)
    introAnimationFrame = null
  }
}

function finishIntro() {
  clearIntroSchedule()
  introOpening.value = false
  introVisible.value = false
}

function scheduleIntroOpening() {
  clearIntroSchedule()
  introOpening.value = false
  nextTick(() => {
    if (!introVisible.value || reducedMotionQuery.matches) return
    introAnimationFrame = window.requestAnimationFrame(() => {
      introAnimationFrame = window.requestAnimationFrame(() => {
        introOpening.value = true
        introAnimationFrame = null
      })
    })
  })
  introFallbackTimeout = window.setTimeout(finishIntro, 1600)
}

function startIntro() {
  if (reducedMotionQuery.matches || introVisible.value) return
  introVisible.value = true
  scheduleIntroOpening()
}

function handleIntroTransitionEnd(event) {
  if (event.propertyName === 'transform') finishIntro()
}

onBeforeUnmount(() => {
  window.clearTimeout(sprayTimeout)
  window.clearTimeout(heroVideoReleaseTimeout)
  clearIntroSchedule()
  prepareScrollReveals()
  if (scrollAnimationFrame !== null) window.cancelAnimationFrame(scrollAnimationFrame)
  window.removeEventListener('scroll', scheduleScrollEffects)
  window.removeEventListener('resize', scheduleScrollEffects)
  window.removeEventListener('popstate', syncPathFromLocation)
  reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
  pauseRealisationsVideos()
})

onMounted(() => {
  window.addEventListener('scroll', scheduleScrollEffects, { passive: true })
  window.addEventListener('resize', scheduleScrollEffects)
  window.addEventListener('popstate', syncPathFromLocation)
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  afterPageRender(() => {
    setupScrollReveals()
    scheduleScrollEffects()
  })
  if (isRealisationsPage.value && !realisationsVideoPaused.value) {
    afterPageRender(playActiveRealisationsVideo)
  }
  if (introVisible.value) {
    scheduleIntroOpening()
  }
})

const services = [
  {
    image: '/ressources/05-services-icons/carrosserie-192.webp',
    title: 'Carrosserie',
    description: 'La Carrosserie Nico & Lopes, située à Castets dans les Landes, vous accompagne pour la réparation automobile et la remise en état de votre carrosserie. Notre atelier intervient pour redonner à votre véhicule son aspect et ses finitions après un choc ou d’autres dommages de carrosserie.',
  },
  {
    image: '/ressources/05-services-icons/peinture-automobile-192.webp',
    title: 'Peinture automobile',
    description: 'Notre atelier de carrosserie à Castets réalise vos travaux de peinture automobile pour retrouver une finition soignée et harmonieuse. Qu’il s’agisse d’une remise en peinture ou de travaux associés à une réparation de carrosserie, nous accordons une attention particulière à l’aspect final de votre véhicule.',
  },
  {
    image: '/ressources/05-services-icons/remplacement-vitrages-192.webp',
    title: 'Remplacement de vitrages',
    description: 'La Carrosserie Nico & Lopes vous accompagne pour le remplacement de vos vitrages automobiles à Castets. Pare-brise et autres éléments vitrés de votre véhicule peuvent nécessiter une intervention adaptée pour retrouver une bonne visibilité et un vitrage en bon état.',
  },
  {
    image: '/ressources/05-services-icons/renovation-optiques-192.webp',
    preserveColor: true,
    title: 'Rénovation d’optiques',
    description: 'Avec le temps, les optiques de phares peuvent devenir ternes ou perdre de leur transparence. Notre service de rénovation d’optiques automobiles à Castets vise à améliorer leur clarté et leur aspect, afin de redonner à vos phares une meilleure présentation.',
  },
  {
    image: '/ressources/05-services-icons/vehicule-courtoisie-192.webp',
    courtesy: true,
    title: 'Véhicule de courtoisie',
    description: 'Pour faciliter votre mobilité pendant l’immobilisation de votre voiture, la Carrosserie Nico & Lopes propose des véhicules de courtoisie, selon les disponibilités. Une solution pratique pour vous accompagner durant les travaux de carrosserie ou de peinture automobile.',
  },
  {
    image: '/ressources/05-services-icons/toutes-assurances-192.webp',
    title: 'Prise en charge toutes assurances',
    description: 'La Carrosserie Nico & Lopes à Castets travaille avec les différentes compagnies d’assurance pour vous accompagner dans vos démarches après un sinistre automobile. Nous vous aidons à organiser la prise en charge des réparations de votre véhicule en lien avec votre assurance, selon les conditions de votre contrat.',
  },
]

const trustReasons = [
  { icon: 'icon-trust-star', label: 'Un travail de qualité' },
  { icon: 'icon-trust-team', label: 'Une équipe expérimentée' },
  { icon: 'icon-trust-clock', label: 'Des délais maîtrisés' },
  { icon: 'icon-trust-handshake', label: 'Accompagnement avec les assurances' },
  {
    image: '/ressources/05-services-icons/vehicule-courtoisie-96.webp',
    label: 'Véhicule de courtoisie',
  },
  { icon: 'icon-trust-shield', label: 'Garantie sur nos réparations' },
]

const activeService = computed(() => services[activeServiceIndex.value])

function openServiceDialog(index, event) {
  activeServiceIndex.value = index
  lastServiceTrigger = event.currentTarget
  serviceDialog.value?.showModal()
}

function closeServiceDialog() {
  serviceDialog.value?.close()
}

function restoreServiceFocus() {
  window.requestAnimationFrame(() => {
    lastServiceTrigger?.focus()
  })
}

function showPreviousService() {
  activeServiceIndex.value = (activeServiceIndex.value - 1 + services.length) % services.length
}

function showNextService() {
  activeServiceIndex.value = (activeServiceIndex.value + 1) % services.length
}

const demonstrationsPath = '/ressources/02-demonstration/'
const videosPath = '/ressources/03-video/'
const realisationsVideoPoster = '/ressources/03-video/realisations-poster-640.webp'
const realisationsVideos = [
  '/ressources/03-video/video-v1-hero.mp4',
  '/ressources/03-video/video-v4-hero.mp4',
  '/ressources/03-video/video-v3-hero.mp4',
]
const realisationsVideoSources = ref(realisationsVideos.map((video, index) => (
  index === 0 && !reducedMotionQuery.matches ? video : ''
)))
let heroVideoReleaseTimeout
const realisationProjects = [
  {
    id: 'V1',
    title: 'Remise en état de carrosserie',
    images: ['V1-01.jpeg', 'V1-02.jpeg', 'V1-03.jpeg', 'V1-04.jpeg'],
    video: {
      src: `${videosPath}video-v1-full.mp4`,
      poster: `${videosPath}video-v1-640.webp`,
    },
    comparison: {
      before: 'V1-01.jpeg',
      after: 'V1-02.jpeg',
      afterLabel: 'PENDANT',
      homeFraming: {
        before: { scale: 1.14, positionX: 42, positionY: 58 },
        after: { scale: 1, positionX: 50, positionY: 50 },
      },
    },
  },
  {
    id: 'V2',
    title: 'Réparation et finition automobile',
    images: ['V2-01.jpeg', 'V2-02.jpeg', 'V2-03.jpeg', 'V2-04.jpeg', 'V2-05.jpeg', 'V2-06.jpeg', 'V2-07.jpeg'],
    comparison: {
      before: 'V2-02.jpeg',
      after: 'V2-06.jpeg',
      afterLabel: 'APRÈS',
      homeFraming: {
        before: { scale: 1.14, positionX: 50, positionY: 62 },
        after: { scale: 1.12, positionX: 52, positionY: 58 },
      },
    },
  },
  {
    id: 'V3',
    title: 'Travaux réalisés à l’atelier',
    images: ['V3-01.jpeg', 'V3-02.jpeg', 'V3-03.jpeg'],
    video: {
      src: `${videosPath}video-v3-full.mp4`,
      poster: `${videosPath}video-v3-640.webp`,
    },
  },
  {
    id: 'V4',
    title: 'Rénovation de carrosserie',
    images: ['V4-00.jpeg', 'V4-01.jpeg', 'V4-02.jpeg', 'V4-03.jpeg', 'V4-04.jpeg', 'V4-05.jpeg'],
    video: {
      src: `${videosPath}video-v4-full.mp4`,
      poster: `${videosPath}video-v4-640.webp`,
    },
    comparison: {
      before: 'V4-01.jpeg',
      after: 'V4-04.jpeg',
      afterLabel: 'APRÈS',
      homeFraming: {
        before: { scale: 1, positionX: 50, positionY: 50 },
        after: { scale: 1.12, positionX: 50, positionY: 52 },
      },
    },
  },
  {
    id: 'V5',
    title: 'Remise en état d’un véhicule',
    images: ['V5-01.jpeg', 'V5-02.jpeg', 'V5-03.jpeg', 'V5-04.jpeg', 'V5-05.jpeg', 'V5-06.jpeg', 'V5-07.jpeg', 'V5-08.jpeg', 'V5-09.jpeg'],
    comparison: {
      before: 'V5-01.jpeg',
      after: 'V5-07.jpeg',
      afterLabel: 'APRÈS',
      homeFraming: {
        before: { scale: 1, positionX: 50, positionY: 50 },
        after: { scale: 1.12, positionX: 50, positionY: 54 },
      },
    },
  },
]

const homeComparisons = ['V2', 'V4', 'V5', 'V1'].map((id) => (
  realisationProjects.find((project) => project.id === id)
))
const galleryPageSize = 4
const activeGalleryProject = computed(() => realisationProjects[activeGalleryProjectIndex.value])
const activeGalleryMedia = computed(() => (
  projectMedia(activeGalleryProject.value)[activeGalleryMediaIndex.value]
))
const activeGalleryMediaCount = computed(() => projectMedia(activeGalleryProject.value).length)

function imageStem(filename) {
  return filename.replace(/\.[^.]+$/, '')
}

function imagePath(filename, variant = 'full') {
  return `${demonstrationsPath}${imageStem(filename)}-${variant}.webp`
}

function comparisonSrcset(filename) {
  const largeWidth = filename === 'V3-03.jpeg' ? 1200 : 1280
  return [
    `${imagePath(filename, '640')} 640w`,
    `${imagePath(filename, '960')} 960w`,
    `${imagePath(filename, 'large')} ${largeWidth}w`,
  ].join(', ')
}

function thumbnailSrcset(filename) {
  return [
    `${imagePath(filename, 'thumb-320')} 320w`,
    `${imagePath(filename, 'thumb-480')} 480w`,
  ].join(', ')
}

function iconSrcset(source) {
  return `${source.replace('-192.webp', '-96.webp')} 96w, ${source} 192w`
}

function projectMedia(project) {
  const media = project.images.map((filename, imageIndex) => ({
    id: `${project.id}-image-${filename}`,
    mediaIndex: imageIndex,
    type: 'image',
    src: imagePath(filename),
    thumbnail: imagePath(filename, 'thumb-320'),
    thumbnailSrcset: thumbnailSrcset(filename),
    alt: `${project.title} — photo ${imageIndex + 1}`,
  }))

  if (project.video) {
    media.push({
      id: `${project.id}-video`,
      mediaIndex: project.images.length,
      type: 'video',
      src: project.video.src,
      poster: project.video.poster,
      alt: `${project.title} — vidéo`,
    })
  }

  return media
}

function galleryPage(project) {
  return galleryPageByProject.value[project.id] ?? 1
}

function galleryPageCount(project) {
  return Math.ceil(projectMedia(project).length / galleryPageSize)
}

function visibleGalleryMedia(project) {
  const firstIndex = (galleryPage(project) - 1) * galleryPageSize
  const media = projectMedia(project).slice(firstIndex, firstIndex + galleryPageSize)
  return [...media, ...Array(galleryPageSize - media.length).fill(null)]
}

function showPreviousGalleryPage(project) {
  galleryPageByProject.value[project.id] = Math.max(1, galleryPage(project) - 1)
}

function showNextGalleryPage(project) {
  galleryPageByProject.value[project.id] = Math.min(
    galleryPageCount(project),
    galleryPage(project) + 1,
  )
}

function setRealisationsVideoRef(element, index) {
  if (element) realisationsVideoRefs.value[index] = element
}

function pauseRealisationsVideos() {
  realisationsVideoRefs.value.forEach((video) => video?.pause())
}

async function ensureRealisationsVideoSource(index) {
  if (!realisationsVideoSources.value[index]) {
    realisationsVideoSources.value[index] = realisationsVideos[index]
    await nextTick()
  }
  return realisationsVideoRefs.value[index]
}

function prepareNextRealisationsVideo(videoIndex, event) {
  if (videoIndex !== activeRealisationsVideoIndex.value) return
  const video = event.currentTarget
  if (!Number.isFinite(video.duration) || video.duration - video.currentTime > 3) return

  const nextIndex = (videoIndex + 1) % realisationsVideos.length
  if (realisationsVideoSources.value[nextIndex]) return
  realisationsVideoSources.value[nextIndex] = realisationsVideos[nextIndex]
}

function releaseInactiveRealisationsVideos() {
  window.clearTimeout(heroVideoReleaseTimeout)
  heroVideoReleaseTimeout = window.setTimeout(() => {
    realisationsVideoRefs.value.forEach((video, index) => {
      if (index === activeRealisationsVideoIndex.value) return
      video?.pause()
      realisationsVideoSources.value[index] = ''
      video?.removeAttribute('src')
      video?.load()
    })
  }, 650)
}

async function playActiveRealisationsVideo() {
  if (!isRealisationsPage.value || realisationsVideoPaused.value) return

  realisationsVideoRefs.value.forEach((video, index) => {
    if (index !== activeRealisationsVideoIndex.value) video?.pause()
  })

  const activeVideo = await ensureRealisationsVideoSource(activeRealisationsVideoIndex.value)
  if (!activeVideo) return

  try {
    await activeVideo.play()
  } catch {
    realisationsVideoPaused.value = true
  }
}

function showNextRealisationsVideo(endedIndex) {
  if (endedIndex !== activeRealisationsVideoIndex.value) return

  activeRealisationsVideoIndex.value = (endedIndex + 1) % realisationsVideos.length
  afterPageRender(() => {
    const nextVideo = realisationsVideoRefs.value[activeRealisationsVideoIndex.value]
    if (nextVideo) nextVideo.currentTime = 0
    playActiveRealisationsVideo()
    releaseInactiveRealisationsVideos()
  })
}

function toggleRealisationsVideo() {
  realisationsVideoPaused.value = !realisationsVideoPaused.value
  if (realisationsVideoPaused.value) {
    pauseRealisationsVideos()
  } else {
    playActiveRealisationsVideo()
  }
}

function handleReducedMotionChange(event) {
  realisationsVideoPaused.value = event.matches
  if (event.matches) {
    finishIntro()
    pauseRealisationsVideos()
    revealObserver?.disconnect()
    document.querySelectorAll('.scroll-reveal').forEach((element) => element.classList.add('is-revealed'))
  } else if (isRealisationsPage.value) {
    playActiveRealisationsVideo()
  }
  scheduleScrollEffects()
}

function afterPageRender(callback) {
  nextTick(() => window.requestAnimationFrame(callback))
}

function syncPathFromLocation() {
  prepareScrollReveals()
  currentPath.value = normalisePath(window.location.pathname)
  menuOpen.value = false
  afterPageRender(() => {
    setupScrollReveals()
    if (window.location.hash) {
      document.querySelector(window.location.hash)?.scrollIntoView()
    } else {
      window.scrollTo({ top: 0 })
    }
    if (isRealisationsPage.value) {
      playActiveRealisationsVideo()
    } else {
      pauseRealisationsVideos()
    }
  })
}

function openRealisationsPage(event) {
  event?.preventDefault()
  if (!isRealisationsPage.value) {
    prepareScrollReveals()
    window.history.pushState({}, '', '/realisations')
    currentPath.value = '/realisations'
  }
  menuOpen.value = false
  window.scrollTo({ top: 0 })
  afterPageRender(() => {
    setupScrollReveals()
    window.scrollTo({ top: 0 })
    scheduleScrollEffects()
    playActiveRealisationsVideo()
  })
}

function openHomeSection(event, sectionId = 'accueil') {
  menuOpen.value = false
  if (!isRealisationsPage.value) return
  event.preventDefault()
  pauseRealisationsVideos()
  prepareScrollReveals()
  window.history.pushState({}, '', `/#${sectionId}`)
  currentPath.value = '/'
  afterPageRender(() => {
    setupScrollReveals()
    document.getElementById(sectionId)?.scrollIntoView()
    scheduleScrollEffects()
  })
}

function openHomeFromNavbarLogo(event) {
  menuOpen.value = false
  const opensElsewhere = event.button !== 0
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
    || event.altKey
    || event.currentTarget.target === '_blank'

  if (event.defaultPrevented || opensElsewhere) return
  startIntro()
  openHomeSection(event, 'accueil')
}

function stopGalleryVideo() {
  galleryVideoPlaying.value = false
  if (galleryVideo.value) {
    galleryVideo.value.pause()
    galleryVideo.value.currentTime = 0
  }
}

async function playGalleryVideo() {
  const video = galleryVideo.value
  if (!video) return
  if (video.ended) video.currentTime = 0
  try {
    await video.play()
  } catch {
    galleryVideoPlaying.value = false
  }
}

function openGallery(projectIndex, mediaIndex, event) {
  galleryVideoPlaying.value = false
  activeGalleryProjectIndex.value = projectIndex
  activeGalleryMediaIndex.value = mediaIndex
  lastGalleryTrigger = event.currentTarget
  galleryDialog.value?.showModal()
}

function closeGallery() {
  stopGalleryVideo()
  galleryDialog.value?.close()
}

function restoreGalleryFocus() {
  stopGalleryVideo()
  window.requestAnimationFrame(() => lastGalleryTrigger?.focus())
}

function showPreviousGalleryMedia() {
  stopGalleryVideo()
  activeGalleryMediaIndex.value = (
    activeGalleryMediaIndex.value - 1 + activeGalleryMediaCount.value
  ) % activeGalleryMediaCount.value
}

function showNextGalleryMedia() {
  stopGalleryVideo()
  activeGalleryMediaIndex.value = (
    activeGalleryMediaIndex.value + 1
  ) % activeGalleryMediaCount.value
}
</script>

<template>
  <div
    v-if="introVisible"
    class="garage-intro"
    :class="{ 'is-opening': introOpening }"
    aria-hidden="true"
  >
    <div class="garage-intro-door" @transitionend.self="handleIntroTransitionEnd">
      <div class="garage-intro-logo-wrap">
        <img
          src="/ressources/01-logo/Nico-Lopes-navbar-366.webp"
          srcset="/ressources/01-logo/Nico-Lopes-navbar-144.webp 144w, /ressources/01-logo/Nico-Lopes-navbar-366.webp 366w"
          sizes="(max-width: 760px) 144px, 210px"
          width="366"
          height="263"
          alt=""
        />
      </div>
    </div>
  </div>

  <svg class="icon-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <symbol id="icon-arrow" viewBox="0 0 24 24">
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </symbol>
    <symbol id="icon-mail" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </symbol>
    <symbol id="icon-phone" viewBox="0 0 24 24">
      <path d="M7.2 3.5 10 7.2 8.3 9.6a14.2 14.2 0 0 0 6.1 6.1l2.4-1.7 3.7 2.8-.7 3.1c-.2.9-1.1 1.5-2 1.4A17.8 17.8 0 0 1 2.7 6.6c-.1-.9.5-1.8 1.4-2l3.1-1.1Z" />
    </symbol>
    <symbol id="icon-map-pin" viewBox="0 0 24 24">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </symbol>
    <symbol id="icon-external-link" viewBox="0 0 24 24">
      <path d="M14 4h6v6m0-6-9 9" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </symbol>
    <symbol id="icon-route" viewBox="0 0 24 24">
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h2a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h0" />
    </symbol>
    <symbol id="icon-close" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" />
    </symbol>
    <symbol id="icon-bodywork" viewBox="0 0 48 48">
      <path d="M5 31h3l4-9c1-3 4-5 7-5h12c4 0 6 2 8 5l3 5 3 1v7h-5a5 5 0 0 0-10 0H19a5 5 0 0 0-10 0H5v-4Z" />
      <path d="M13 27h27M18 18l-3 9m16-9 6 9M9 35a5 5 0 0 0 10 0m11 0a5 5 0 0 0 10 0M22 18v9" />
      <path d="M6 30h5m28 0h5" />
    </symbol>
    <symbol id="icon-paint" viewBox="0 0 48 48">
      <path d="M5 17h25l7 5-7 5H10a5 5 0 0 1-5-5v-5Zm25 0v10m7-5h6" />
      <path d="M13 27v5l4 2-2 9h10l2-10-5-6" />
      <path d="M9 17v-4h13m-4 0V8h11l4 5-4 4M42 16l3-2m-3 14 3 2" />
    </symbol>
    <symbol id="icon-glass" viewBox="0 0 48 48">
      <path d="M7 36 12 14c.5-2 2-3 4-3h16c2 0 3.5 1 4 3l5 22H7Z" />
      <path d="M13 30h22M18 15l-4 15m16-15 4 15M18 40h12" />
      <path d="m20 22 7-5m-5 10 8-6" />
    </symbol>
    <symbol id="icon-headlight" viewBox="0 0 48 48">
      <path d="M5 14h18c10 0 16 5 16 10s-6 10-16 10H5V14Z" />
      <path d="M12 19v10m7-11v12m7-11v10m13-11 5-3m-5 9h6m-6 5 5 3" />
    </symbol>
    <symbol id="icon-courtesy-car" viewBox="0 0 48 48">
      <path d="M5 30h3l4-9c1-3 4-5 7-5h12c4 0 6 2 8 5l3 6 3 1v7h-5a5 5 0 0 0-10 0H19a5 5 0 0 0-10 0H5v-5Z" />
      <path d="M13 27h27M18 17l-3 10m16-10 6 10M9 35a5 5 0 0 0 10 0m11 0a5 5 0 0 0 10 0" />
      <path d="M20 16v-5h10v5m-7-2h4" />
    </symbol>
    <symbol id="icon-insurance" viewBox="0 0 48 48">
      <path d="m24 5 16 7v11c0 10-6 16-16 20C14 39 8 33 8 23V12l16-7Z" />
      <path d="m16 25 5 5 11-12" />
      <path d="M16 14c5-2 11-2 16 0" />
    </symbol>
    <symbol id="icon-trust-star" viewBox="0 0 48 48">
      <path d="m24 5.5 5.6 11.3 12.5 1.8-9 8.8 2.1 12.4L24 34l-11.2 5.8 2.1-12.4-9-8.8 12.5-1.8L24 5.5Z" />
    </symbol>
    <symbol id="icon-trust-team" viewBox="0 0 48 48">
      <circle cx="24" cy="15" r="6" />
      <circle cx="10.5" cy="20" r="4" />
      <circle cx="37.5" cy="20" r="4" />
      <path d="M12 40v-5c0-6.1 5.4-11 12-11s12 4.9 12 11v5M3.5 39v-4c0-4.8 3.8-8.8 8.5-9.4M44.5 39v-4c0-4.8-3.8-8.8-8.5-9.4" />
    </symbol>
    <symbol id="icon-trust-clock" viewBox="0 0 48 48">
      <circle cx="24" cy="25" r="17" />
      <path d="M24 15v11l7 4M18 4h12" />
    </symbol>
    <symbol id="icon-trust-handshake" viewBox="0 0 48 48">
      <path d="m4 20 8-8 8 4-10 13-6-9Zm40 0-8-8-8 4 10 13 6-9Z" />
      <path d="m15 28 8.5 8.5a3 3 0 0 0 4.2 0l9-9M18 18l5-3 8 7-3 3a4 4 0 0 1-5.5 0l-2-1.8M12 27l-2 2m26-2 2 2M18 31l-3 3m7 1-2 3m7-1 2 2" />
    </symbol>
    <symbol id="icon-trust-shield" viewBox="0 0 48 48">
      <path d="m24 5 16 6v11c0 10.5-6.4 17.1-16 21-9.6-3.9-16-10.5-16-21V11l16-6Z" />
      <path d="m16.5 24.5 5 5 10-11" />
    </symbol>
  </svg>

  <header class="site-header">
    <a
      class="brand"
      :href="isRealisationsPage ? '/#accueil' : '#accueil'"
      aria-label="Nico & Lopes Carrosserie, accueil"
      @click="openHomeFromNavbarLogo"
    >
      <img
        class="brand-logo"
        :src="logoSource"
        :srcset="logoSrcset"
        sizes="(max-width: 760px) 52px, (max-width: 1060px) 58px, 72px"
        alt="Carrosserie Nico & Lopes"
        width="366"
        height="263"
      />
    </a>

    <button
      class="menu-toggle"
      type="button"
      :aria-expanded="menuOpen"
      aria-controls="main-navigation"
      :aria-label="menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
      @click="menuOpen = !menuOpen"
    >
      <span></span><span></span><span></span>
    </button>

    <nav id="main-navigation" class="main-nav" :class="{ 'is-open': menuOpen }" aria-label="Navigation principale">
      <div class="mobile-menu-actions" role="group" aria-label="Actions rapides">
        <a
          class="mobile-menu-action"
          :href="phoneHref"
          aria-label="Appeler le 05 58 89 42 81"
        >
          <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
          <span>05 58 89 42 81</span>
        </a>
      </div>
      <a :href="isRealisationsPage ? '/#services' : '#services'" @click="openHomeSection($event, 'services')">Nos services</a>
      <a :href="isRealisationsPage ? '/#realisations' : '#realisations'" @click="openHomeSection($event, 'realisations')">Réalisations</a>
      <a :href="isRealisationsPage ? '/#atelier' : '#atelier'" @click="openHomeSection($event, 'atelier')">La carrosserie</a>
      <a :href="isRealisationsPage ? '/#pourquoi-nous' : '#pourquoi-nous'" @click="openHomeSection($event, 'pourquoi-nous')">Pourquoi nous ?</a>
      <a href="#contact" aria-haspopup="dialog" @click.prevent="openContactDialog">Contact</a>
    </nav>

    <div class="header-actions" role="group" aria-label="Actions de contact">
      <button
        ref="themeToggle"
        class="header-action theme-toggle"
        :class="{ 'is-spraying': sprayActive }"
        type="button"
        :aria-label="theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'"
        :disabled="themeTransitioning"
        @click="toggleTheme"
      >
        <img
          class="theme-toggle-pictogram"
          src="/ressources/05-services-icons/peinture-automobile-96.webp"
          alt=""
          aria-hidden="true"
        />
      </button>
      <a
        class="header-action header-action-phone"
        :href="phoneHref"
        aria-label="Appeler le 05 58 89 42 81"
      >
        <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
        <span class="header-action-phone-label">05 58 89 42 81</span>
        <span class="action-tooltip" role="tooltip" aria-hidden="true">Nous appeler</span>
      </a>
    </div>
  </header>

  <dialog
    ref="contactDialog"
    class="contact-dialog"
    aria-labelledby="contact-dialog-title"
    @cancel.prevent="closeContactDialog"
    @keydown.esc.prevent="closeContactDialog"
    @close="restoreContactFocus"
    @click.self="closeContactDialog"
  >
    <div class="contact-dialog-header">
      <div>
        <p class="eyebrow">Une question, un renseignement ?</p>
        <h2 id="contact-dialog-title">CONTACTEZ-NOUS</h2>
        <p class="contact-dialog-subtitle">Appelez-nous ou écrivez-nous directement.</p>
      </div>
      <button class="contact-dialog-close" type="button" aria-label="Fermer la fenêtre de contact" @click="closeContactDialog">
        <svg class="icon" aria-hidden="true"><use href="#icon-close" /></svg>
      </button>
    </div>
    <div class="contact-dialog-actions">
      <a class="button button-primary contact-dialog-call" :href="phoneHref">
        <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
        Nous appeler
      </a>
      <a class="button contact-dialog-write" :href="emailHref">
        <svg class="icon" aria-hidden="true"><use href="#icon-mail" /></svg>
        Nous écrire
      </a>
      <a
        class="button contact-dialog-find"
        :href="directionsHref"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg class="icon" aria-hidden="true"><use href="#icon-map-pin" /></svg>
        Nous trouver
      </a>
    </div>
  </dialog>

  <dialog
    ref="serviceDialog"
    class="service-dialog"
    aria-labelledby="service-dialog-title"
    aria-describedby="service-dialog-description"
    @cancel.prevent="closeServiceDialog"
    @close="restoreServiceFocus"
    @click.self="closeServiceDialog"
  >
    <div class="service-dialog-topbar">
      <span>{{ String(activeServiceIndex + 1).padStart(2, '0') }} / {{ String(services.length).padStart(2, '0') }}</span>
      <button autofocus class="service-dialog-close" type="button" aria-label="Fermer le détail du service" @click="closeServiceDialog">
        <svg class="icon" aria-hidden="true"><use href="#icon-close" /></svg>
      </button>
    </div>
    <div class="service-dialog-content" aria-live="polite">
      <div class="service-dialog-heading">
        <span
          class="service-dialog-icon"
          :class="{ 'courtesy-marker': activeService.courtesy }"
          aria-hidden="true"
        >
          <img
            class="service-pictogram"
            :class="{ 'service-pictogram--original': activeService.preserveColor }"
            :src="activeService.image"
            :srcset="iconSrcset(activeService.image)"
            sizes="78px"
            alt=""
          />
        </span>
        <div class="service-dialog-heading-copy">
          <p class="eyebrow">Nos services</p>
          <h2 id="service-dialog-title">{{ activeService.title }}</h2>
        </div>
      </div>
      <p id="service-dialog-description">{{ activeService.description }}</p>
    </div>
    <div class="service-dialog-nav" aria-label="Navigation entre les services">
      <button type="button" :aria-label="`Service précédent : ${services[(activeServiceIndex - 1 + services.length) % services.length].title}`" @click="showPreviousService">
        <svg class="icon service-dialog-arrow-previous" aria-hidden="true"><use href="#icon-arrow" /></svg>
        Précédent
      </button>
      <button type="button" :aria-label="`Service suivant : ${services[(activeServiceIndex + 1) % services.length].title}`" @click="showNextService">
        Suivant
        <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
      </button>
    </div>
  </dialog>

  <dialog
    ref="galleryDialog"
    class="gallery-lightbox"
    aria-labelledby="gallery-dialog-title"
    @cancel.prevent="closeGallery"
    @close="restoreGalleryFocus"
    @click.self="closeGallery"
    @keydown.left.prevent="showPreviousGalleryMedia"
    @keydown.right.prevent="showNextGalleryMedia"
  >
    <div class="gallery-lightbox-topbar">
      <div>
        <p class="eyebrow">Nos réalisations</p>
        <h2 id="gallery-dialog-title">{{ activeGalleryProject.title }}</h2>
      </div>
      <button autofocus class="gallery-lightbox-close" type="button" aria-label="Fermer la photo agrandie" @click="closeGallery">
        <svg class="icon" aria-hidden="true"><use href="#icon-close" /></svg>
      </button>
    </div>
    <div class="gallery-lightbox-viewer">
      <button type="button" aria-label="Média précédent" @click="showPreviousGalleryMedia">
        <svg class="icon gallery-arrow-previous" aria-hidden="true"><use href="#icon-arrow" /></svg>
      </button>
      <figure :class="{ 'is-video': activeGalleryMedia.type === 'video' }">
        <img
          v-if="activeGalleryMedia.type === 'image'"
          :key="activeGalleryMedia.id"
          :src="activeGalleryMedia.src"
          :alt="activeGalleryMedia.alt"
        />
        <video
          v-else
          :key="activeGalleryMedia.id"
          ref="galleryVideo"
          :src="activeGalleryMedia.src"
          :poster="activeGalleryMedia.poster"
          controls
          playsinline
          preload="none"
          @play="galleryVideoPlaying = true"
          @pause="galleryVideoPlaying = false"
          @ended="galleryVideoPlaying = false"
        ></video>
        <button
          v-if="activeGalleryMedia.type === 'video' && !galleryVideoPlaying"
          class="gallery-lightbox-play"
          type="button"
          :aria-label="`Lire ${activeGalleryMedia.alt.toLowerCase()}`"
          @click="playGalleryVideo"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" /></svg>
        </button>
        <figcaption>
          {{ activeGalleryMediaIndex + 1 }} / {{ activeGalleryMediaCount }}
        </figcaption>
      </figure>
      <button type="button" aria-label="Média suivant" @click="showNextGalleryMedia">
        <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
      </button>
    </div>
  </dialog>

  <main v-if="!isRealisationsPage">
    <section id="accueil" class="hero">
      <div class="hero-shade"></div>
      <div class="hero-content">
        <p class="eyebrow">Carrosserie automobile à Castets</p>
        <h1>Nico <span>&amp;</span> Lopes</h1>
        <p class="hero-subtitle">Votre véhicule, notre savoir-faire.</p>
        <p class="hero-copy">
          Carrosserie et peinture automobile, remplacement de vitrages et rénovation d’optiques.
        </p>
        <div class="hero-actions">
          <a class="button button-primary hero-call" :href="phoneHref">
            <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
            Nous appeler
          </a>
          <a
            class="button hero-directions"
            :href="directionsHref"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg class="icon" aria-hidden="true"><use href="#icon-map-pin" /></svg>
            Itinéraire
          </a>
        </div>
      </div>
      <div class="hero-points" aria-label="Nos services">
        <span><i class="hero-point-pictogram-wrap" aria-hidden="true"><img src="/ressources/05-services-icons/carrosserie-96.webp" alt="" /></i> Carrosserie &amp; peinture</span>
        <span><i class="hero-point-pictogram-wrap" aria-hidden="true"><img src="/ressources/05-services-icons/remplacement-vitrages-96.webp" alt="" /></i> Remplacement de vitrages</span>
        <span><i class="hero-point-pictogram-wrap courtesy-marker" aria-hidden="true"><img src="/ressources/05-services-icons/vehicule-courtoisie-96.webp" alt="" /></i> Véhicule de courtoisie</span>
        <span><svg class="icon" aria-hidden="true"><use href="#icon-insurance" /></svg> Toutes assurances</span>
      </div>
    </section>

    <section id="services" class="section services-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Notre expertise</p>
          <h2>Nos services</h2>
        </div>
      </div>
      <div class="services-grid">
        <button
          v-for="(service, index) in services"
          :key="service.title"
          class="service-card"
          type="button"
          aria-haspopup="dialog"
          :aria-label="`Découvrir le service ${service.title}`"
          @click="openServiceDialog(index, $event)"
        >
          <span
            class="service-icon"
            :class="{ 'courtesy-marker': service.courtesy }"
            aria-hidden="true"
          >
            <img
              class="service-pictogram"
              :class="{ 'service-pictogram--original': service.preserveColor }"
              :src="service.image"
              :srcset="iconSrcset(service.image)"
              sizes="92px"
              alt=""
            />
          </span>
          <h3>{{ service.title }}</h3>
        </button>
      </div>
    </section>

    <section id="realisations" class="section work-section">
      <div class="section-heading section-heading-light">
        <div>
          <p class="eyebrow">Le savoir-faire en images</p>
          <h2>Nos réalisations</h2>
        </div>
        <a class="text-link home-realisations-link--desktop" href="/realisations" @click="openRealisationsPage">
          Voir nos réalisations
          <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
        </a>
      </div>
      <div class="comparison-grid">
        <BeforeAfter
          v-for="project in homeComparisons"
          :key="project.id"
          :project="`Projet ${project.id}`"
          :before="imagePath(project.comparison.before)"
          :after="imagePath(project.comparison.after)"
          :before-srcset="comparisonSrcset(project.comparison.before)"
          :after-srcset="comparisonSrcset(project.comparison.after)"
          sizes="(max-width: 760px) 45vw, (max-width: 1060px) 44vw, 24vw"
          :after-label="project.comparison.afterLabel"
          :before-frame="project.comparison.homeFraming.before"
          :after-frame="project.comparison.homeFraming.after"
          :show-caption="false"
          loading="lazy"
        />
      </div>
      <a class="home-realisations-link--mobile" href="/realisations" @click="openRealisationsPage">
        Voir nos réalisations
        <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
      </a>
    </section>

    <section id="atelier" class="section about-section" aria-labelledby="about-title">
      <div class="about-copy">
        <p class="eyebrow">À votre service à Castets</p>
        <h2 id="about-title">La carrosserie Nico &amp; Lopes</h2>
        <div class="about-copy-body">
          <img
            v-deferred-image="aboutPhotoName"
            class="about-photo"
            :class="{ 'about-photo--dark': theme === 'dark' }"
            :src="transparentPixel"
            :data-src="aboutPhotoSource"
            :data-srcset="aboutPhotoSrcset"
            data-sizes="220px"
            alt="La carrosserie Nico &amp; Lopes, sa façade et une voiture devant l’atelier"
            loading="lazy"
            decoding="async"
            @load="handleAboutPhotoLoad"
          />
          <div class="about-copy-description">
            <div class="about-copy-text">
              <p>
                Située à Castets, la carrosserie Nico &amp; Lopes vous accompagne dans vos travaux de
                carrosserie et peinture automobile, le remplacement de vitrages et la rénovation
                d’optiques.
              </p>
              <p>Un savoir-faire au service de votre véhicule.</p>
            </div>
            <a
              class="google-reviews-link"
              :href="businessInfo.googleReviewsUrl"
              target="_blank"
              rel="noopener noreferrer"
              :title="`Note et nombre d’avis indiqués à titre informatif et non actualisés automatiquement.`"
              :aria-label="`Consulter les avis Google de la Carrosserie Nico & Lopes : ${businessInfo.googleReviewRating} avis`"
            >
              <svg class="google-review-logo" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.05 5.05 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.15a11 11 0 0 0 0 9.88l3.69-2.84Z" />
                <path fill="#EA4335" d="M12 4.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0a11 11 0 0 0-9.85 6.06L5.84 8.9C6.71 6.3 9.14 4.37 12 4.37Z" />
              </svg>
              <span class="google-review-rating">
                <span class="google-review-stars" aria-hidden="true">★★★★★</span>
                <strong>{{ businessInfo.googleReviewRating }}</strong>
              </span>
              <span class="google-review-count">Avis Google</span>
              <svg class="icon google-review-external" aria-hidden="true"><use href="#icon-external-link" /></svg>
            </a>
          </div>
        </div>
      </div>

      <div class="free-choice-column" aria-labelledby="free-choice-title">
        <p class="eyebrow">Après un sinistre</p>
        <h3 id="free-choice-title">Le libre choix du réparateur</h3>
        <ol class="free-choice-list">
          <li>
            <span class="free-choice-number" aria-hidden="true">01</span>
            <div>
              <h4>Vous avez un véhicule de courtoisie</h4>
              <p>Même si votre carrossier préféré n'est pas agréé par votre assureur, ça ne change rien !</p>
            </div>
          </li>
          <li>
            <span class="free-choice-number" aria-hidden="true">02</span>
            <div>
              <h4>Vous ne faites pas l'avance des frais</h4>
              <p>C'est votre carrossier qui se met en lien avec votre assurance (agrément ou non).</p>
            </div>
          </li>
          <li>
            <span class="free-choice-number" aria-hidden="true">03</span>
            <div>
              <h4>Vous pouvez choisir la pièce de réemploi</h4>
              <p>Dans tous les cas vous avez le choix entre pièces neuves ou pièces de réemploi !</p>
            </div>
          </li>
        </ol>
      </div>

      <div class="location-column" aria-labelledby="location-title">
        <iframe
          class="atelier-map"
          src="https://maps.google.com/maps?q=43.8747615%2C-1.1543348&z=16&output=embed"
          title="Carte Google Maps de la Carrosserie Nico &amp; Lopes à Castets"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
        <div class="location-details">
          <h3 id="location-title">Carrosserie Nico &amp; Lopes</h3>
          <address>83 Rue Friques O, 40260 Castets, Landes</address>
          <div class="location-actions">
            <a class="location-action location-action-primary location-phone" href="tel:0558894281">
              <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
              05 58 89 42 81
            </a>
            <a
              class="location-action location-route"
              :href="directionsHref"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg class="icon" aria-hidden="true"><use href="#icon-map-pin" /></svg>
              Itinéraire
            </a>
          </div>
        </div>
      </div>
    </section>

    <section id="pourquoi-nous" v-deferred-trust-background class="trust-section" aria-labelledby="trust-title">
      <div class="trust-section-inner">
        <header class="trust-heading">
          <h2 id="trust-title">Pourquoi nous faire confiance&nbsp;?</h2>
        </header>
        <ul class="trust-grid">
          <li v-for="reason in trustReasons" :key="reason.label" class="trust-item">
            <span class="trust-icon-wrap" aria-hidden="true">
              <img v-if="reason.image" :src="reason.image" alt="" width="96" height="96" />
              <svg v-else><use :href="`#${reason.icon}`" /></svg>
            </span>
            <span>{{ reason.label }}</span>
          </li>
        </ul>
      </div>
    </section>
  </main>

  <main v-else class="realisations-page">
    <section class="realisations-hero">
      <div class="realisations-hero-media" aria-hidden="true">
        <video
          v-for="(video, videoIndex) in realisationsVideos"
          :key="video"
          :ref="(element) => setRealisationsVideoRef(element, videoIndex)"
          class="realisations-hero-video"
          :class="{ 'is-active': videoIndex === activeRealisationsVideoIndex }"
          :src="realisationsVideoSources[videoIndex] || undefined"
          :poster="realisationsVideoPoster"
          :autoplay="videoIndex === activeRealisationsVideoIndex && !realisationsVideoPaused"
          muted
          playsinline
          :preload="realisationsVideoSources[videoIndex] ? 'auto' : 'none'"
          @timeupdate="prepareNextRealisationsVideo(videoIndex, $event)"
          @ended="showNextRealisationsVideo(videoIndex)"
        ></video>
      </div>
      <div class="realisations-hero-overlay"></div>
      <div class="realisations-hero-content">
        <p class="eyebrow">Le savoir-faire en images</p>
        <h1>Nos réalisations</h1>
        <p>Découvrez en images les travaux réalisés au sein de notre atelier de carrosserie à Castets.</p>
      </div>
      <button
        class="realisations-video-control"
        type="button"
        :aria-label="realisationsVideoPaused ? 'Reprendre les vidéos du hero' : 'Mettre les vidéos du hero en pause'"
        :aria-pressed="realisationsVideoPaused"
        @click="toggleRealisationsVideo"
      >
        <svg v-if="realisationsVideoPaused" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m8 5 11 7-11 7Z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5v14M16 5v14" />
        </svg>
        {{ realisationsVideoPaused ? 'Reprendre' : 'Pause' }}
      </button>
    </section>

    <section
      v-for="(project, projectIndex) in realisationProjects"
      :key="project.id"
      :id="`projet-${project.id.toLowerCase()}`"
      class="section realisation-project"
    >
      <div class="realisation-project-heading">
        <p class="eyebrow">Nos réalisations</p>
        <h2>{{ project.title }}</h2>
      </div>

      <div class="realisation-project-layout" :class="{ 'is-gallery-only': !project.comparison }">
        <BeforeAfter
          v-if="project.comparison"
          class="project-comparison"
          :project="project.title"
          :before="imagePath(project.comparison.before)"
          :after="imagePath(project.comparison.after)"
          :before-srcset="comparisonSrcset(project.comparison.before)"
          :after-srcset="comparisonSrcset(project.comparison.after)"
          sizes="(max-width: 1120px) calc(100vw - 44px), 46vw"
          :after-label="project.comparison.afterLabel"
          :show-caption="false"
          loading="lazy"
        />

        <div class="project-gallery">
          <div class="realisations-gallery">
            <template v-for="(media, slotIndex) in visibleGalleryMedia(project)" :key="media?.id ?? `${project.id}-empty-${galleryPage(project)}-${slotIndex}`">
              <button
                v-if="media"
                class="gallery-thumbnail"
                :class="{ 'is-video': media.type === 'video' }"
                type="button"
                :aria-label="media.type === 'video' ? `Lire la vidéo de ${project.title}` : `Agrandir une photo de ${project.title}`"
                @click="openGallery(projectIndex, media.mediaIndex, $event)"
              >
                <img
                  v-deferred-image="media.id"
                  :src="transparentPixel"
                  :data-src="media.type === 'video' ? media.poster : media.thumbnail"
                  :data-srcset="media.type === 'video' ? undefined : media.thumbnailSrcset"
                  data-sizes="(max-width: 760px) 46vw, (max-width: 1120px) 23vw, 12vw"
                  :alt="media.alt"
                  loading="lazy"
                  decoding="async"
                />
                <span v-if="media.type === 'video'" class="gallery-video-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z" /></svg>
                </span>
              </button>
              <span v-else class="gallery-thumbnail gallery-thumbnail-placeholder" aria-hidden="true"></span>
            </template>
          </div>

          <nav
            v-if="galleryPageCount(project) > 1"
            class="gallery-pagination"
            :aria-label="`Pagination de la galerie ${project.title}`"
          >
            <button
              type="button"
              :disabled="galleryPage(project) === 1"
              :aria-label="`Page précédente de la galerie ${project.title}`"
              @click="showPreviousGalleryPage(project)"
            >
              <svg class="icon gallery-arrow-previous" aria-hidden="true"><use href="#icon-arrow" /></svg>
              Précédent
            </button>
            <span aria-live="polite">{{ galleryPage(project) }} / {{ galleryPageCount(project) }}</span>
            <button
              type="button"
              :disabled="galleryPage(project) === galleryPageCount(project)"
              :aria-label="`Page suivante de la galerie ${project.title}`"
              @click="showNextGalleryPage(project)"
            >
              Suivant
              <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
            </button>
          </nav>
        </div>
      </div>
    </section>
  </main>

  <footer id="contact" class="site-footer">
    <div class="footer-inner">
      <div class="footer-top">
        <a
          class="footer-brand"
          :href="isRealisationsPage ? '/#accueil' : '#accueil'"
          aria-label="Nico & Lopes Carrosserie, accueil"
          @click="openHomeSection($event, 'accueil')"
        >
          <img
            :src="logoSource"
            :srcset="logoSrcset"
            sizes="172px"
            alt="Carrosserie Nico & Lopes"
            width="366"
            height="263"
          />
        </a>
        <section class="footer-item footer-partner" aria-labelledby="footer-partner-title">
          <h2 id="footer-partner-title">Partenaire</h2>
          <a
            href="https://www.motrio.fr/garage-reparateur/carrosserie-nicolopes-10278"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Motrio, partenaire de la Carrosserie Nico & Lopes — ouvre dans un nouvel onglet"
          >
            <img
              v-deferred-image="'motrio'"
              :src="transparentPixel"
              data-src="/ressources/04-atelier/motrio-264.webp"
              data-sizes="132px"
              alt="Motrio"
              loading="lazy"
              decoding="async"
            />
          </a>
        </section>
        <section class="footer-item" aria-labelledby="footer-phone-title">
          <h2 id="footer-phone-title">Téléphone</h2>
          <a class="footer-contact-link" :href="phoneHref">
            <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
            {{ businessInfo.phone }}
          </a>
          <ul class="footer-detail-list" aria-label="Horaires d'ouverture">
            <li v-for="schedule in businessInfo.hours" :key="schedule.days">
              <span>{{ schedule.days }}</span>
              <span>{{ schedule.times }}</span>
            </li>
          </ul>
        </section>
        <section class="footer-item" aria-labelledby="footer-email-title">
          <h2 id="footer-email-title">Contact</h2>
          <a class="footer-contact-link" :href="emailHref">
            <svg class="icon" aria-hidden="true"><use href="#icon-mail" /></svg>
            Nous écrire
          </a>
          <a class="footer-detail footer-email-address" :href="emailHref">{{ businessInfo.email }}</a>
        </section>
        <section class="footer-item footer-directions" aria-labelledby="footer-directions-title">
          <h2 id="footer-directions-title">Itinéraire</h2>
          <a
            class="footer-contact-link"
            :href="directionsHref"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg class="icon" aria-hidden="true"><use href="#icon-map-pin" /></svg>
            Nous trouver
          </a>
          <address class="footer-detail footer-address">{{ businessInfo.address }}</address>
        </section>
      </div>

      <div class="footer-bottom">
        <span>© 2026 Carrosserie Nico &amp; Lopes</span>
        <nav class="footer-legal-links" aria-label="Informations légales">
          <button type="button" @click="openLegalDialog('legal', $event)">Mentions légales</button>
          <span aria-hidden="true">·</span>
          <button type="button" @click="openLegalDialog('privacy', $event)">Confidentialité</button>
        </nav>
      </div>
    </div>
  </footer>

  <dialog
    ref="legalDialog"
    class="info-dialog"
    aria-labelledby="legal-dialog-title"
    @cancel.prevent="closeLegalDialog('legal')"
    @keydown.esc.prevent="closeLegalDialog('legal')"
    @click.self="closeLegalDialog('legal')"
  >
    <header class="info-dialog-header">
      <h2 id="legal-dialog-title">MENTIONS LÉGALES</h2>
      <button class="contact-dialog-close" type="button" aria-label="Fermer les mentions légales" @click="closeLegalDialog('legal')">
        <svg class="icon" aria-hidden="true"><use href="#icon-close" /></svg>
      </button>
    </header>
    <div class="info-dialog-content">
      <p>
        Les présentes mentions légales précisent les informations relatives au site de la
        Carrosserie Nico &amp; Lopes et à son éditeur.
      </p>
      <section>
        <h3>Éditeur du site</h3>
        <p>Nom commercial : Carrosserie Nico &amp; Lopes.</p>
        <p>Raison sociale : [RAISON SOCIALE À RENSEIGNER].</p>
        <p>Forme juridique : [FORME JURIDIQUE À RENSEIGNER].</p>
        <p>Adresse de l’établissement : {{ businessInfo.address }}.</p>
        <p>Adresse du siège social : [ADRESSE DU SIÈGE SOCIAL À RENSEIGNER].</p>
      </section>
      <section>
        <h3>Immatriculation</h3>
        <p>SIREN : [SIREN À RENSEIGNER].</p>
        <p>SIRET : [SIRET À RENSEIGNER].</p>
        <p>Immatriculation au RCS ou au répertoire des métiers, le cas échéant : [IMMATRICULATION À RENSEIGNER].</p>
      </section>
      <section>
        <h3>Contact et directeur de la publication</h3>
        <p>
          Téléphone : <a :href="phoneHref">{{ businessInfo.phone }}</a>.
          E-mail : <a :href="emailHref">{{ businessInfo.email }}</a>.
        </p>
        <p>Directeur de la publication : [RESPONSABLE DE PUBLICATION À RENSEIGNER].</p>
      </section>
      <section>
        <h3>Hébergement</h3>
        <p>Hébergeur : [NOM DE L’HÉBERGEUR À RENSEIGNER].</p>
        <p>Adresse et coordonnées de l’hébergeur : [COORDONNÉES DE L’HÉBERGEUR À RENSEIGNER].</p>
      </section>
      <section>
        <h3>Propriété intellectuelle</h3>
        <p>
          Les contenus présents sur ce site, notamment les textes, photographies, graphismes et
          éléments visuels, sont protégés par les règles relatives à la propriété intellectuelle.
          Les droits appartiennent à la Carrosserie Nico &amp; Lopes ou à leurs titulaires respectifs.
          Toute reproduction ou représentation non autorisée est interdite.
        </p>
      </section>
      <section>
        <h3>Liens externes et responsabilités</h3>
        <p>
          Le site peut proposer des liens vers des services ou sites tiers. La Carrosserie Nico
          &amp; Lopes n’en maîtrise ni le contenu ni les politiques et invite les visiteurs à
          consulter leurs propres informations légales et de confidentialité.
        </p>
        <p>
          Les informations publiées sur ce site sont fournies à titre informatif. Malgré le soin
          apporté à leur mise à jour, l’éditeur ne peut garantir l’absence d’erreurs ou
          d’omissions.
        </p>
      </section>
    </div>
  </dialog>

  <dialog
    ref="privacyDialog"
    class="info-dialog"
    aria-labelledby="privacy-dialog-title"
    @cancel.prevent="closeLegalDialog('privacy')"
    @keydown.esc.prevent="closeLegalDialog('privacy')"
    @click.self="closeLegalDialog('privacy')"
  >
    <header class="info-dialog-header">
      <h2 id="privacy-dialog-title">CONFIDENTIALITÉ</h2>
      <button class="contact-dialog-close" type="button" aria-label="Fermer la politique de confidentialité" @click="closeLegalDialog('privacy')">
        <svg class="icon" aria-hidden="true"><use href="#icon-close" /></svg>
      </button>
    </header>
    <div class="info-dialog-content">
      <section>
        <h3>Responsable du traitement</h3>
        <p>
          Le responsable du traitement est [RAISON SOCIALE ET RESPONSABLE DU TRAITEMENT À
          RENSEIGNER]. Vous pouvez le contacter à l’adresse
          <a :href="emailHref">{{ businessInfo.email }}</a> ou par téléphone au
          <a :href="phoneHref">{{ businessInfo.phone }}</a>.
        </p>
      </section>
      <section>
        <h3>Prise de contact par téléphone ou e-mail</h3>
        <p>
          Si vous appelez ou écrivez à la carrosserie, les coordonnées et les informations que vous
          communiquez sont utilisées pour recevoir votre demande, vous répondre et en assurer le
          suivi. Veuillez éviter de transmettre des informations qui ne sont pas nécessaires à
          votre demande.
        </p>
        <p>
          La base légale et la durée de conservation des échanges sont à préciser selon la nature
          de la demande : [BASE LÉGALE ET DURÉE DE CONSERVATION À RENSEIGNER].
        </p>
      </section>
      <section>
        <h3>Carte, polices et services tiers</h3>
        <ul>
          <li>
            Une carte Google Maps est intégrée à la page d’accueil. Son affichage peut transmettre
            à Google des données techniques, telles que votre adresse IP, et entraîner l’utilisation
            de traceurs soumis aux règles de Google.
          </li>
          <li>
            Les polices de caractères sont fournies par Google Fonts. Le chargement de ces polices
            peut transmettre à Google des données techniques liées à votre connexion.
          </li>
          <li>
            Les liens vers Google Maps et Motrio ouvrent des services tiers. Lorsque vous les
            suivez, ces services appliquent leurs propres conditions et politiques de confidentialité.
          </li>
        </ul>
        <p>
          Pour en savoir plus, consultez les politiques de confidentialité de Google et des autres
          services concernés. Les modalités de dépôt des traceurs par ces services et, le cas
          échéant, les mesures de consentement applicables doivent être précisées avant publication.
        </p>
      </section>
      <section>
        <h3>Préférence d’affichage et données techniques</h3>
        <ul>
          <li>
            Le choix du thème clair ou sombre est conservé dans le stockage local de votre
            navigateur afin de mémoriser votre préférence. Il n’est pas transmis par le site.
          </li>
          <li>
            L’hébergeur peut traiter des données techniques nécessaires à la diffusion et à la
            sécurité du site, notamment dans ses journaux de connexion. Les catégories de données,
            leur durée de conservation et les coordonnées de l’hébergeur sont à renseigner :
            [INFORMATIONS DE L’HÉBERGEUR ET DURÉES À RENSEIGNER].
          </li>
        </ul>
      </section>
      <section>
        <h3>Destinataires et transferts</h3>
        <p>
          Les informations sont destinées aux personnes habilitées à traiter votre demande et aux
          prestataires techniques intervenant pour le fonctionnement du site. Google et les autres
          services tiers peuvent traiter des données lorsque leurs contenus sont chargés ou que
          vous suivez leurs liens. Les lieux de traitement et les éventuels transferts hors de
          l’Espace économique européen sont à préciser selon les services retenus :
          [DESTINATAIRES ET GARANTIES DE TRANSFERT À RENSEIGNER].
        </p>
      </section>
      <section>
        <h3>Vos droits</h3>
        <p>
          Dans les conditions prévues par la réglementation, vous pouvez demander l’accès à vos
          données, leur rectification ou leur effacement, la limitation de leur traitement et vous
          opposer à celui-ci. Vous pouvez également demander la portabilité des données lorsque ce
          droit s’applique et introduire une réclamation auprès de la Commission nationale de
          l’informatique et des libertés (CNIL).
        </p>
        <p>Pour exercer vos droits, contactez : [CONTACT DU RESPONSABLE DU TRAITEMENT À RENSEIGNER].</p>
      </section>
    </div>
  </dialog>
</template>
