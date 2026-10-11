<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { businessInfo } from './config/business.js'

const menuOpen = ref(false)
const theme = ref(localStorage.getItem('nico-lopes-theme') === 'dark' ? 'dark' : 'light')
const themeTransitioning = ref(false)
const sprayActive = ref(false)
const contactDialog = ref(null)
const serviceDialog = ref(null)
const activeServiceIndex = ref(0)
const themeToggle = ref(null)
let lastServiceTrigger = null
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
