import { businessInfo } from './config/business.js'

const pages = {
  '/': {
    title: 'Carrosserie à Castets (Landes) | Nico & Lopes',
    description: 'Nico & Lopes, carrosserie à Castets dans les Landes : réparation de carrosserie, peinture automobile, vitrages, optiques et véhicule de courtoisie.',
    image: '/ressources/04-atelier/photo-garage-1280.webp',
  },
  '/realisations': {
    title: 'Réalisations carrosserie à Castets | Nico & Lopes',
    description: 'Découvrez les réalisations avant/après de la Carrosserie Nico & Lopes à Castets, dans les Landes : réparations, peinture et rénovation automobile.',
    image: '/ressources/03-video/realisations-poster-640.webp',
  },
}

const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '') || ''

function setMeta(selector, attributes, content) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
    document.head.append(element)
  }
  element.setAttribute('content', content)
}

function setCanonical(url) {
  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.append(canonical)
  }
  canonical.href = url
}

function updateStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AutoBodyShop',
    name: 'Carrosserie Nico & Lopes',
    description: 'Carrosserie et peinture automobile à Castets dans les Landes.',
    telephone: '+33558894281',
    email: businessInfo.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '83 Rue Friques O',
      postalCode: '40260',
      addressLocality: 'Castets',
      addressRegion: 'Landes',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 43.8747615,
      longitude: -1.1543348,
    },
    hasMap: businessInfo.googleReviewsUrl,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '08:00',
        closes: '12:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '14:00',
        closes: '17:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Friday',
        opens: '08:00',
        closes: '12:00',
      },
    ],
  }

  if (configuredSiteUrl) {
    structuredData.url = `${configuredSiteUrl}/`
    structuredData.image = `${configuredSiteUrl}/ressources/04-atelier/photo-garage-1280.webp`
  }

  let script = document.head.querySelector('#local-business-structured-data')
  if (!script) {
    script = document.createElement('script')
    script.id = 'local-business-structured-data'
    script.type = 'application/ld+json'
    document.head.append(script)
  }
  script.textContent = JSON.stringify(structuredData)
}

export function updateRouteMetadata(path) {
  const route = path === '/realisations' ? '/realisations' : '/'
  const page = pages[route]

  document.title = page.title
  setMeta('meta[name="description"]', { name: 'description' }, page.description)
  setMeta('meta[property="og:title"]', { property: 'og:title' }, page.title)
  setMeta('meta[property="og:description"]', { property: 'og:description' }, page.description)
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, page.title)
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, page.description)

  if (configuredSiteUrl) {
    const pageUrl = `${configuredSiteUrl}${route === '/' ? '/' : route}`
    const imageUrl = `${configuredSiteUrl}${page.image}`
    setCanonical(pageUrl)
    setMeta('meta[property="og:url"]', { property: 'og:url' }, pageUrl)
    setMeta('meta[property="og:image"]', { property: 'og:image' }, imageUrl)
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, imageUrl)
  }

  updateStructuredData()
}
