<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { loadDeferredImage, observeNearViewport } from '../deferredMedia.js'

const props = defineProps({
  project: { type: String, required: true },
  before: { type: String, required: true },
  after: { type: String, required: true },
  beforeSrcset: { type: String, default: '' },
  afterSrcset: { type: String, default: '' },
  sizes: { type: String, default: '100vw' },
  afterLabel: { type: String, default: 'APRÈS' },
  loading: { type: String, default: 'lazy' },
  beforeFrame: { type: Object, default: () => ({}) },
  afterFrame: { type: Object, default: () => ({}) },
  showCaption: { type: Boolean, default: true },
})

const position = ref(50)
const dragging = ref(false)
const comparison = ref(null)
const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
let stopDeferredObservation = () => {}

onMounted(() => {
  if (props.loading === 'eager') return
  stopDeferredObservation = observeNearViewport(comparison.value, () => {
    comparison.value?.querySelectorAll('img[data-src]').forEach(loadDeferredImage)
  })
})

onBeforeUnmount(() => stopDeferredObservation())

function imageStyle(frame) {
  const numberOr = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback)
  const scale = Math.max(1, numberOr(frame.scale, 1))
  const positionX = Math.min(100, Math.max(0, numberOr(frame.positionX, 50)))
  const positionY = Math.min(100, Math.max(0, numberOr(frame.positionY, 50)))

  return {
    objectPosition: `${positionX}% ${positionY}%`,
    transform: `scale(${scale})`,
    transformOrigin: `${positionX}% ${positionY}%`,
  }
}

function setPosition(value) {
  position.value = Math.min(100, Math.max(0, Math.round(value)))
}

function updateFromPointer(event) {
  const bounds = event.currentTarget.getBoundingClientRect()
  setPosition(((event.clientX - bounds.left) / bounds.width) * 100)
}

function startDragging(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  dragging.value = true
  event.currentTarget.setPointerCapture(event.pointerId)
  updateFromPointer(event)
}

function moveDivider(event) {
  if (dragging.value) updateFromPointer(event)
}

function stopDragging(event) {
  if (!dragging.value) return
  dragging.value = false
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
}

function moveWithKeyboard(event) {
  const actions = {
    ArrowLeft: () => setPosition(position.value - 5),
    ArrowDown: () => setPosition(position.value - 5),
    ArrowRight: () => setPosition(position.value + 5),
    ArrowUp: () => setPosition(position.value + 5),
    Home: () => setPosition(0),
    End: () => setPosition(100),
  }

  if (!actions[event.key]) return
  event.preventDefault()
  actions[event.key]()
}
</script>

<template>
  <figure class="comparison-card">
    <div
      ref="comparison"
      class="before-after"
      :class="{ 'is-dragging': dragging }"
      role="slider"
      tabindex="0"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="position"
      :aria-valuetext="`${position} % de la photo avant visible`"
      :aria-label="`Comparateur ${project} : Avant et ${afterLabel.toLowerCase()}`"
      @pointerdown="startDragging"
      @pointermove="moveDivider"
      @pointerup="stopDragging"
      @pointercancel="stopDragging"
      @keydown="moveWithKeyboard"
    >
      <img
        class="before-after-image"
        :src="loading === 'eager' ? after : transparentPixel"
        :srcset="loading === 'eager' ? afterSrcset : undefined"
        :sizes="sizes"
        :data-src="loading === 'eager' ? undefined : after"
        :data-srcset="loading === 'eager' ? undefined : afterSrcset"
        :data-sizes="loading === 'eager' ? undefined : sizes"
        :alt="`${project} — ${afterLabel.toLowerCase()}`"
        :loading="loading"
        :style="imageStyle(afterFrame)"
        decoding="async"
        draggable="false"
      />
      <div
        class="before-after-layer"
        :style="{ clipPath: `inset(0 ${100 - position}% 0 0)` }"
        aria-hidden="true"
      >
        <img
          class="before-after-image"
          :src="loading === 'eager' ? before : transparentPixel"
          :srcset="loading === 'eager' ? beforeSrcset : undefined"
          :sizes="sizes"
          :data-src="loading === 'eager' ? undefined : before"
          :data-srcset="loading === 'eager' ? undefined : beforeSrcset"
          :data-sizes="loading === 'eager' ? undefined : sizes"
          alt=""
          :loading="loading"
          :style="imageStyle(beforeFrame)"
          decoding="async"
          draggable="false"
        />
      </div>
      <span class="comparison-label comparison-label-before">AVANT</span>
      <span class="comparison-label comparison-label-after">{{ afterLabel }}</span>
      <span class="comparison-divider" :style="{ left: `${position}%` }" aria-hidden="true">
        <span class="comparison-handle">
          <svg viewBox="0 0 24 24"><path d="m9 7-5 5 5 5M15 7l5 5-5 5" /></svg>
        </span>
      </span>
    </div>
    <figcaption v-if="showCaption">{{ project }}</figcaption>
  </figure>
</template>
