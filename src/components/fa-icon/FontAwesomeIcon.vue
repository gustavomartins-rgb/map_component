<template>
  <FontAwesomeIcon :icon="['fas', resolvedIconName]" />
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { library } from '@fortawesome/fontawesome-svg-core'
  import {
    faCheck,
    faChevronLeft,
    faChevronRight,
    faXmark,
    faTerminal,
    faFileLines,
    faUpload,
    faPencil,
    faTrash,
    faChevronDown,
    faEye,
    faEyeSlash,
    faCircleInfo,
    faCircleExclamation,
    faTriangleExclamation,
    faCircleCheck,
    faCircleXmark,
    faBan,
    faLock,
    faUnlock,
    faThumbtack,
    faMapPin
  } from '@fortawesome/free-solid-svg-icons'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { FaIconName } from '../../types'

  type IconProps = {
    iconName: FaIconName | string
  }

  const props = defineProps<IconProps>()

  /** Aceita `check`, `fa-check` ou `fas fa-check`. */
  const resolvedIconName = computed(() => {
    const raw = props.iconName?.trim() ?? ''
    return raw.replace(/^(fas|far|fal|fab)\s+/i, '').replace(/^fa-/i, '')
  })

  library.add(
    faCheck,
    faXmark,
    faChevronRight,
    faChevronLeft,
    faTerminal,
    faFileLines,
    faUpload,
    faPencil,
    faTrash,
    faChevronDown,
    faEye,
    faEyeSlash,
    faCircleInfo,
    faCircleExclamation,
    faTriangleExclamation,
    faCircleCheck,
    faCircleXmark,
    faBan,
    faLock,
    faUnlock,
    faThumbtack,
    faMapPin
  )
</script>

<style>
  @import '@fortawesome/fontawesome-svg-core/styles.css';
</style>
