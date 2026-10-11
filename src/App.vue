<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { businessInfo } from './config/business.js'

const menuOpen = ref(false)
const theme = ref(localStorage.getItem('nico-lopes-theme') === 'dark' ? 'dark' : 'light')
const themeTransitioning = ref(false)
const sprayActive = ref(false)
const contactDialog = ref(null)
const themeToggle = ref(null)
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
})

const services = [
  { icon: 'bodywork', title: 'Carrosserie' },
  { icon: 'paint', title: 'Peinture automobile' },
  { icon: 'glass', title: 'Remplacement de vitrages' },
  { icon: 'headlight', title: 'Rénovation d’optiques' },
  { icon: 'courtesy-car', title: 'Véhicule de courtoisie' },
  { icon: 'insurance', title: 'Prise en charge toutes assurances' },
]

const projects = [
  { image: 'V1-02.jpeg', title: 'Réparation de carrosserie', category: 'Carrosserie' },
  { image: 'V2-03.jpeg', title: 'Peinture automobile', category: 'Peinture' },
  { image: 'V3-02.jpeg', title: 'Rénovation de véhicule', category: 'Carrosserie' },
  { image: 'V4-03.jpeg', title: 'Travail de finition', category: 'Carrosserie' },
]
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
    <symbol id="icon-spray-gun" viewBox="0 0 48 48">
      <path d="M7 16h19a5 5 0 0 1 0 10H13l-3 5H6l2-8a5 5 0 0 1-1-7Z" />
      <path d="M26 18h8l4-3h4v8h-4l-4-3h-8m-8 6 4 5-2 8h-7l3-12" />
      <path d="M10 12h12m-2 4v-5h7v5m14 5h5m-5-4 5-2m-5 8 5 2" />
    </symbol>
    <symbol id="icon-close" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" />
    </symbol>
    <symbol id="icon-hero-bodywork" viewBox="0 0 64 48">
      <path d="M3.5 31.5 7 24.8c1.4-2.6 4.2-4.1 9.2-5.1l8.2-7.9c3.6-3.4 9-4.6 13.7-2.9 4.2 1.5 7.9 4 11.2 7.1l7.5 2.5c3 1 4.7 3.5 4.7 6.5v6.5h-7.8a7.3 7.3 0 0 0-14.1 0H25.2a7.3 7.3 0 0 0-14.1 0H3.5Z" />
      <path d="m18.1 19.3 8.7-6.1c2.8-2 6.5-2.5 9.7-1.3 2.9 1.1 5.7 2.8 8.2 5.1l2.3 2.2H18.1Zm10.7-6.5-2.2 6.4m10.9-7 4.1 7M8 27.4h5.4m40.8-6.1-5.6-.6" />
      <circle cx="18.2" cy="32.2" r="5.2" />
      <circle cx="46.7" cy="32.2" r="5.2" />
      <path d="M25.1 34h14.7M4 31.5h7.1m42.6 0h7.7" />
    </symbol>
    <symbol id="icon-hero-glass" viewBox="0 0 56 48">
      <path d="M8 37 13.5 13c.6-2.7 3-4.5 5.7-4.5h17.6c2.7 0 5.1 1.8 5.7 4.5L48 37H8Z" />
      <path d="M13.8 32.5 18 14h20l4.2 18.5H13.8ZM19 41h18" />
      <path d="m23 24 8-5m-5 10 8-5" />
    </symbol>
    <symbol id="icon-hero-courtesy" viewBox="0 0 64 48">
      <path d="M3.5 31.5 7 24.8c1.3-2.5 4-4.1 8.5-5l7.6-7.2c3.4-3.2 8.4-4.4 12.9-3 4.5 1.4 8.5 3.8 12 7.3l8.8 2.7c3 1 4.7 3.4 4.7 6.4v5.5h-7.8a7.3 7.3 0 0 0-14.1 0H25.2a7.3 7.3 0 0 0-14.1 0H3.5Z" />
      <path d="m17.3 19.5 8.2-5.8c2.7-1.9 6.2-2.4 9.3-1.4 3.3 1.1 6.4 3 9.1 5.5l1.8 1.7H17.3Zm10.5-6.4-2.1 6.4m10.4-6.7 4 6.7m-7.2-6.9v6.9M8 27.4h5.4m40.9-6.2-5.8-.5" />
      <circle cx="18.2" cy="32.2" r="5.2" />
      <circle cx="46.7" cy="32.2" r="5.2" />
      <path d="M25.1 34h14.7M4 31.5h7.1m42.6 0h7.7" />
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
  </svg>

  <header class="site-header">
    <a class="brand" href="#accueil" aria-label="Nico & Lopes Carrosserie, accueil">
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
      <a href="#services" @click="menuOpen = false">Nos services</a>
      <a href="#realisations" @click="menuOpen = false">Réalisations</a>
      <a href="#atelier" @click="menuOpen = false">La carrosserie</a>
      <a href="#pourquoi-nous" @click="menuOpen = false">Pourquoi nous ?</a>
      <a href="#contact" aria-haspopup="dialog" @click.prevent="openContactDialog">Contact</a>
    </nav>

    <div class="header-actions" role="group" aria-label="Actions de contact">
      <a
        class="header-action header-action-phone"
        :href="phoneHref"
        aria-label="Nous appeler"
      >
        <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
        <span class="action-tooltip" role="tooltip" aria-hidden="true">Nous appeler</span>
      </a>
      <button
        ref="themeToggle"
        class="header-action theme-toggle"
        :class="{ 'is-spraying': sprayActive }"
        type="button"
        :disabled="themeTransitioning"
        @click="toggleTheme"
      >
        <svg class="icon" aria-hidden="true"><use href="#icon-spray-gun" /></svg>
        <span class="action-tooltip" role="tooltip" aria-hidden="true">
          {{ theme === 'dark' ? 'Peindre en clair' : 'Peindre en sombre' }}
        </span>
      </button>
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

  <main>
    <section id="accueil" class="hero">
      <div class="hero-shade"></div>
      <div class="hero-content">
        <p class="eyebrow">Carrosserie automobile à Castets</p>
        <h1>Nico <span>&amp;</span> Lopes</h1>
        <p class="hero-subtitle">Votre véhicule, notre savoir-faire.</p>
        <p class="hero-copy">
          Carrosserie et peinture automobile, remplacement de vitrages et rénovation d’optiques.
        </p>
        <a class="button button-primary hero-call" :href="phoneHref">
          <svg class="icon" aria-hidden="true"><use href="#icon-phone" /></svg>
          Nous appeler
        </a>
      </div>
      <div class="hero-points" aria-label="Nos services">
        <span><svg class="icon" aria-hidden="true"><use href="#icon-hero-bodywork" /></svg> Carrosserie &amp; peinture</span>
        <span><svg class="icon" aria-hidden="true"><use href="#icon-hero-glass" /></svg> Remplacement de vitrages</span>
        <span><svg class="icon" aria-hidden="true"><use href="#icon-hero-courtesy" /></svg> Véhicule de courtoisie</span>
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
        <article v-for="service in services" :key="service.title" class="service-card">
          <span class="service-icon" aria-hidden="true">
            <svg class="icon"><use :href="`#icon-${service.icon}`" /></svg>
          </span>
          <h3>{{ service.title }}</h3>
        </article>
      </div>
    </section>

    <section id="realisations" class="section work-section">
      <div class="section-heading section-heading-light">
        <div>
          <p class="eyebrow">Le savoir-faire en images</p>
          <h2>Nos réalisations</h2>
        </div>
        <a class="text-link" href="#contact">
          Une question ?
          <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
        </a>
      </div>
      <div class="project-grid">
        <article v-for="project in projects" :key="project.image" class="project-card">
          <img
            :src="`/ressources/02-demonstration/${project.image}`"
            :alt="project.title"
            loading="lazy"
          />
          <div class="project-caption">
            <span>{{ project.category }}</span>
            <h3>{{ project.title }}</h3>
          </div>
        </article>
      </div>
    </section>

    <section id="atelier" class="section about-section">
      <div class="about-copy">
        <p class="eyebrow">À votre service à Castets</p>
        <h2>La carrosserie Nico &amp; Lopes</h2>
        <p>
          Votre carrosserie prend en charge les réparations et travaux de peinture automobile,
          le remplacement de vitrages et la rénovation d’optiques.
        </p>
        <p class="free-choice">
          Vous restez libre de choisir votre réparateur après un sinistre.
        </p>
      </div>
      <div class="atelier-panel">
        <svg class="atelier-icon" aria-hidden="true"><use href="#icon-insurance" /></svg>
        <p class="eyebrow">Sinistre automobile</p>
        <h3>Le libre choix du réparateur</h3>
        <p>Vous pouvez choisir la carrosserie qui répare votre véhicule.</p>
        <a class="text-link" href="#contact">
          Contactez-nous
          <svg class="icon" aria-hidden="true"><use href="#icon-arrow" /></svg>
        </a>
      </div>
    </section>
  </main>

  <footer id="contact" class="site-footer">
    <div class="footer-top">
      <a class="brand footer-brand" href="#accueil" aria-label="Nico & Lopes Carrosserie, accueil">
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
