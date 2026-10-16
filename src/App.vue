<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { businessInfo } from './config/business.js'
import BeforeAfter from './components/BeforeAfter.vue'

const menuOpen = ref(false)
const theme = ref(localStorage.getItem('nico-lopes-theme') === 'dark' ? 'dark' : 'light')
const themeTransitioning = ref(false)
const sprayActive = ref(false)
const contactDialog = ref(null)
const serviceDialog = ref(null)
const galleryDialog = ref(null)
const galleryVideo = ref(null)
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
    ? '/ressources/01-logo/Nico-Lopes-navbar.png'
    : '/ressources/01-logo/Nico-Lopes-navbar-light.png'
))
const phoneHref = computed(() => `tel:${businessInfo.phone.replace(/\s/g, '')}`)
const directionsHref = 'https://www.google.com/maps/dir/?api=1&destination=43.8747615%2C-1.1543348'
let sprayTimeout

function openContactDialog() {
  menuOpen.value = false
  contactDialog.value?.showModal()
}

function closeContactDialog() {
  contactDialog.value?.close()
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

onBeforeUnmount(() => {
  window.clearTimeout(sprayTimeout)
  window.removeEventListener('popstate', syncPathFromLocation)
  reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
  pauseRealisationsVideos()
})

onMounted(() => {
  window.addEventListener('popstate', syncPathFromLocation)
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  if (isRealisationsPage.value && !realisationsVideoPaused.value) {
    afterPageRender(playActiveRealisationsVideo)
  }
})

const services = [
  {
    image: '/ressources/05-services-icons/carrosserie.png',
    title: 'Carrosserie',
    description: 'La Carrosserie Nico & Lopes, située à Castets dans les Landes, vous accompagne pour la réparation automobile et la remise en état de votre carrosserie. Notre atelier intervient pour redonner à votre véhicule son aspect et ses finitions après un choc ou d’autres dommages de carrosserie.',
  },
  {
    image: '/ressources/05-services-icons/peinture-automobile.png',
    title: 'Peinture automobile',
    description: 'Notre atelier de carrosserie à Castets réalise vos travaux de peinture automobile pour retrouver une finition soignée et harmonieuse. Qu’il s’agisse d’une remise en peinture ou de travaux associés à une réparation de carrosserie, nous accordons une attention particulière à l’aspect final de votre véhicule.',
  },
  {
    image: '/ressources/05-services-icons/remplacement-vitrages.png',
    title: 'Remplacement de vitrages',
    description: 'La Carrosserie Nico & Lopes vous accompagne pour le remplacement de vos vitrages automobiles à Castets. Pare-brise et autres éléments vitrés de votre véhicule peuvent nécessiter une intervention adaptée pour retrouver une bonne visibilité et un vitrage en bon état.',
  },
  {
    image: '/ressources/05-services-icons/renovation-optiques.png',
    preserveColor: true,
    title: 'Rénovation d’optiques',
    description: 'Avec le temps, les optiques de phares peuvent devenir ternes ou perdre de leur transparence. Notre service de rénovation d’optiques automobiles à Castets vise à améliorer leur clarté et leur aspect, afin de redonner à vos phares une meilleure présentation.',
  },
  {
    image: '/ressources/05-services-icons/vehicule-courtoisie.png',
    courtesy: true,
    title: 'Véhicule de courtoisie',
    description: 'Pour faciliter votre mobilité pendant l’immobilisation de votre voiture, la Carrosserie Nico & Lopes propose des véhicules de courtoisie, selon les disponibilités. Une solution pratique pour vous accompagner durant les travaux de carrosserie ou de peinture automobile.',
  },
  {
    image: '/ressources/05-services-icons/toutes-assurances.png',
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
    image: '/ressources/05-services-icons/vehicule-courtoisie.png',
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
const realisationsVideoPoster = '/ressources/03-video/realisations-poster.jpg'
const realisationsVideos = [
  '/ressources/03-video/WhatsApp Video 2026-10-08 at 07.47.39.mp4',
  '/ressources/03-video/WhatsApp Video 2026-10-08 at 07.47.40.mp4',
  '/ressources/03-video/WhatsApp Video 2026-10-08 at 07.47.41.mp4',
]
const realisationProjects = [
  {
    id: 'V1',
    title: 'Remise en état de carrosserie',
    images: ['V1-01.jpeg', 'V1-02.jpeg', 'V1-03.jpeg', 'V1-04.jpeg'],
    video: {
      src: `${videosPath}WhatsApp Video 2026-10-08 at 07.47.39.mp4`,
      poster: `${videosPath}video-v1.jpg`,
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
      src: `${videosPath}WhatsApp Video 2026-10-08 at 07.47.41.mp4`,
      poster: `${videosPath}video-v3.jpg`,
    },
  },
  {
    id: 'V4',
    title: 'Rénovation de carrosserie',
    images: ['V4-00.jpeg', 'V4-01.jpeg', 'V4-02.jpeg', 'V4-03.jpeg', 'V4-04.jpeg', 'V4-05.jpeg'],
    video: {
      src: `${videosPath}WhatsApp Video 2026-10-08 at 07.47.40.mp4`,
      poster: `${videosPath}video-v4.jpg`,
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

function imagePath(filename) {
  return `${demonstrationsPath}${filename}`
}

function projectMedia(project) {
  const media = project.images.map((filename, imageIndex) => ({
    id: `${project.id}-image-${filename}`,
    mediaIndex: imageIndex,
    type: 'image',
    src: imagePath(filename),
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

async function playActiveRealisationsVideo() {
  if (!isRealisationsPage.value || realisationsVideoPaused.value) return

  realisationsVideoRefs.value.forEach((video, index) => {
    if (index !== activeRealisationsVideoIndex.value) video?.pause()
  })

  const activeVideo = realisationsVideoRefs.value[activeRealisationsVideoIndex.value]
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
    pauseRealisationsVideos()
  } else if (isRealisationsPage.value) {
    playActiveRealisationsVideo()
  }
}

function afterPageRender(callback) {
  nextTick(() => window.requestAnimationFrame(callback))
}

function syncPathFromLocation() {
  currentPath.value = normalisePath(window.location.pathname)
  menuOpen.value = false
  afterPageRender(() => {
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
    window.history.pushState({}, '', '/realisations')
    currentPath.value = '/realisations'
  }
  menuOpen.value = false
  window.scrollTo({ top: 0 })
  afterPageRender(() => {
    window.scrollTo({ top: 0 })
    playActiveRealisationsVideo()
  })
}

function openHomeSection(event, sectionId = 'accueil') {
  menuOpen.value = false
  if (!isRealisationsPage.value) return
  event.preventDefault()
  pauseRealisationsVideos()
  window.history.pushState({}, '', `/#${sectionId}`)
  currentPath.value = '/'
  afterPageRender(() => document.getElementById(sectionId)?.scrollIntoView())
}

function stopGalleryVideo() {
  if (!galleryVideo.value) return
  galleryVideo.value.pause()
  galleryVideo.value.currentTime = 0
}

function openGallery(projectIndex, mediaIndex, event) {
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
      @click="openHomeSection($event, 'accueil')"
    >
      <img
        class="brand-logo"
        :src="logoSource"
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
      <a :href="isRealisationsPage ? '/#services' : '#services'" @click="openHomeSection($event, 'services')">Nos services</a>
      <a href="/realisations" @click="openRealisationsPage">Réalisations</a>
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
        :disabled="themeTransitioning"
        @click="toggleTheme"
      >
        <img
          class="theme-toggle-pictogram"
          src="/ressources/05-services-icons/peinture-automobile.png"
          alt=""
          aria-hidden="true"
        />
        <span class="action-tooltip" role="tooltip" aria-hidden="true">
          {{ theme === 'dark' ? 'Peindre en clair' : 'Peindre en sombre' }}
        </span>
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
    @click.self="closeContactDialog"
  >
    <div class="contact-dialog-header">
      <div>
        <p class="eyebrow">Nico &amp; Lopes</p>
        <h2 id="contact-dialog-title">Contactez-nous</h2>
      </div>
      <button class="contact-dialog-close" type="button" aria-label="Fermer la fenêtre de contact" @click="closeContactDialog">
        <svg class="icon" aria-hidden="true"><use href="#icon-close" /></svg>
      </button>
    </div>
    <p>Notre équipe est à votre écoute pour répondre à vos questions.</p>
    <a class="contact-dialog-phone" :href="phoneHref">
      <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
      {{ businessInfo.phone }}
    </a>
    <a class="contact-dialog-email" :href="`mailto:${businessInfo.email}`">
      {{ businessInfo.email }}
    </a>
    <a class="button button-primary contact-dialog-form-link" href="#contact" @click="closeContactDialog">
      Accéder au formulaire de contact
      <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
    </a>
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
          preload="metadata"
        ></video>
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
        <span><i class="hero-point-pictogram-wrap" aria-hidden="true"><img src="/ressources/05-services-icons/carrosserie.png" alt="" /></i> Carrosserie &amp; peinture</span>
        <span><i class="hero-point-pictogram-wrap" aria-hidden="true"><img src="/ressources/05-services-icons/remplacement-vitrages.png" alt="" /></i> Remplacement de vitrages</span>
        <span><i class="hero-point-pictogram-wrap courtesy-marker" aria-hidden="true"><img src="/ressources/05-services-icons/vehicule-courtoisie.png" alt="" /></i> Véhicule de courtoisie</span>
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
        <a class="text-link" href="/realisations" @click="openRealisationsPage">
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
          :after-label="project.comparison.afterLabel"
          :before-frame="project.comparison.homeFraming.before"
          :after-frame="project.comparison.homeFraming.after"
          :show-caption="false"
          loading="lazy"
        />
      </div>
    </section>

    <section id="atelier" class="section about-section" aria-labelledby="about-title">
      <div class="about-copy">
        <p class="eyebrow">À votre service à Castets</p>
        <h2 id="about-title">La carrosserie Nico &amp; Lopes</h2>
        <div class="about-copy-body">
          <img
            class="about-photo"
            :class="{ 'about-photo--dark': theme === 'dark' }"
            :src="theme === 'dark'
              ? '/ressources/04-atelier/c-v02.jpg'
              : '/ressources/04-atelier/c-v01.jpg'"
            alt="La carrosserie Nico &amp; Lopes, sa façade et une voiture devant l’atelier"
            loading="lazy"
          />
          <div class="about-copy-description">
            <p>
              Située à Castets, la carrosserie Nico &amp; Lopes vous accompagne dans vos travaux de
              carrosserie et peinture automobile, le remplacement de vitrages et la rénovation
              d’optiques.
            </p>
            <p>Un savoir-faire au service de votre véhicule.</p>
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
              class="location-action"
              :href="directionsHref"
              target="_blank"
              rel="noopener noreferrer"
            >Itinéraire</a>
          </div>
        </div>
      </div>
    </section>

    <section id="pourquoi-nous" class="trust-section" aria-labelledby="trust-title">
      <div class="trust-section-inner">
        <header class="trust-heading">
          <h2 id="trust-title">Pourquoi nous faire confiance&nbsp;?</h2>
        </header>
        <ul class="trust-grid">
          <li v-for="reason in trustReasons" :key="reason.label" class="trust-item">
            <span class="trust-icon-wrap" aria-hidden="true">
              <img v-if="reason.image" :src="reason.image" alt="" />
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
          :src="video"
          :poster="realisationsVideoPoster"
          :autoplay="videoIndex === activeRealisationsVideoIndex && !realisationsVideoPaused"
          muted
          playsinline
          preload="metadata"
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
                  :src="media.type === 'video' ? media.poster : media.src"
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
    <div class="footer-top">
      <a
        class="brand footer-brand"
        :href="isRealisationsPage ? '/#accueil' : '#accueil'"
        aria-label="Nico & Lopes Carrosserie, accueil"
        @click="openHomeSection($event, 'accueil')"
      >
        <img
          class="brand-logo"
          :src="logoSource"
          alt="Carrosserie Nico & Lopes"
          width="366"
          height="263"
        />
      </a>
      <div v-if="businessInfo.phone" class="footer-column">
        <h2>Téléphone</h2>
        <a :href="phoneHref">{{ businessInfo.phone }}</a>
      </div>
      <div v-if="businessInfo.address" class="footer-column">
        <h2>Adresse</h2>
        <p>{{ businessInfo.address }}</p>
      </div>
      <div v-if="businessInfo.hours" class="footer-column">
        <h2>Horaires</h2>
        <p>{{ businessInfo.hours }}</p>
      </div>
      <div class="footer-column footer-email">
        <h2>Nous contacter</h2>
        <span>{{ businessInfo.email }}</span>
      </div>
    </div>

    <div class="contact-area">
      <div class="contact-intro">
        <p class="eyebrow">Une question, un renseignement ?</p>
        <h2>Contactez-nous</h2>
        <p>Écrivez-nous et nous vous répondrons par e-mail.</p>
        <span class="email-link">{{ businessInfo.email }}</span>
        <a v-if="isRealisationsPage" class="button button-primary realisations-call" href="tel:0558894281">
          <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
          Nous appeler
        </a>
      </div>

      <form
        class="contact-form"
        name="contact"
        method="POST"
        data-netlify="true"
        netlify-honeypot="bot-field"
      >
        <input type="hidden" name="form-name" value="contact" />
        <p class="honeypot">
          <label>Ne pas remplir : <input name="bot-field" /></label>
        </p>
        <label>
          Nom *
          <input name="name" type="text" autocomplete="name" placeholder="Votre nom" required />
        </label>
        <label>
          E-mail *
          <input name="email" type="email" autocomplete="email" placeholder="vous@exemple.fr" required />
        </label>
        <label>
          Téléphone <span>(facultatif)</span>
          <input name="phone" type="tel" autocomplete="tel" placeholder="Votre numéro de téléphone" />
        </label>
        <label>
          Message *
          <textarea name="message" rows="5" placeholder="Comment pouvons-nous vous aider ?" required></textarea>
        </label>
        <button class="button button-primary" type="submit">
          Envoyer le message
          <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
        </button>
      </form>
    </div>

    <div class="footer-bottom">
      <span>© Nico &amp; Lopes Carrosserie</span>
      <span>Castets</span>
    </div>
  </footer>
</template>
