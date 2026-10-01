<template>
  <div :class="customClasses.layerMenu">
    <ElButton
      v-if="!props.options?.removeMenu"
      :class="customClasses.menuButton"
      @click="isMenuOpen = !isMenuOpen"
    >
      <FontAwesomeIcon :iconName="iconButton" />
    </ElButton>
    <ElMenu
      :key="menuOpenedsKey"
      :class="customClasses.customMenu"
      :default-openeds="defaultOpeneds"
      mode="vertical"
      @close="onGroupMenuClose"
      @open="onGroupMenuOpen"
    >
      <div id="external-id-top-menu"></div>
      <SectionMenu
        v-if="normalizedSections.length"
        :editingLayerKey="activeEditingLayerKey"
        :persist="!!props.options?.persist"
        :sections="normalizedSections"
        :selectedSectionKey="resolvedSelectedSectionKey"
        :visibilityMode="visibilityMode"
        @onChildLayerToggle="onChildLayerChange"
        @onGroupLayerToggle="onGroupLayerToggle"
        @onLayerAction="onLayerAction"
        @onSelectedSectionChange="onSelectedSectionChange"
      />
      <div id="external-id-bottom-menu"></div>
    </ElMenu>
  </div>
</template>

<script lang="ts" setup>
  import { ElButton, ElMenu } from 'element-plus'
  import L from 'leaflet'
  import { computed, nextTick, ref, watch } from 'vue'
  import FontAwesomeIcon from '../fa-icon/FontAwesomeIcon.vue'
  import SectionMenu from './SectionMenu.vue'
  import {
    GroupLayerData,
    LayerActionPayload,
    LayerData,
    LayersConfig,
    LayersMenuConfig,
    SectionEditStatePayload,
    SectionSelectPayload
  } from '../../types'
  import {
    normalizeLayersConfig,
    shouldApplyMapOverlay
  } from '../../utils/layersConfigNormalizer'
  import {
    resolveGroupCollapsedState,
    resolveLayerActiveState,
    setGroupCollapsedHistory,
    shouldInitLayerOnMap
  } from '../../utils/menuHistory.ts'

  type MenuProps = {
    layersConfig: LayersConfig
    options?: LayersMenuConfig
    map: L.Map
    layerControl?: L.Control.Layers
  }

  type ConvertedLayers = {
    [key: string]: L.TileLayer
  }

  type ConvertedGeoJsonLayers = {
    [key: string]: L.GeoJSON
  }

  const emit = defineEmits<{
    (e: 'startLoading'): void
    (e: 'stopLoading'): void
    (e: 'onChildLayerToggle', data: LayerData): void
    (e: 'onGroupLayerToggle', data: GroupLayerData): void
    (e: 'onLayerAction', payload: LayerActionPayload): void
    (e: 'onSectionEditStateChange', payload: SectionEditStatePayload): void
    (e: 'onSelectedSectionChange', payload: SectionSelectPayload): void
  }>()

  const props = defineProps<MenuProps>()

  const isMenuOpen = ref<boolean>(!!props.options?.defaultOpen)
  const convertedLayers = ref<ConvertedLayers>({})
  const convertedGeoJsonLayers = ref<ConvertedGeoJsonLayers>({})
  const internalEditingLayerKey = ref<string | null>(null)
  const internalSelectedSectionKey = ref<string | null>(null)

  const normalizedSections = computed(() => normalizeLayersConfig(props.layersConfig))

  const visibilityMode = computed(() => props.options?.visibilityMode ?? 'switch')

  const isEditingControlled = computed(() => props.options?.editingLayerKey !== undefined)

  const activeEditingLayerKey = computed(() => {
    if (isEditingControlled.value) {
      return props.options?.editingLayerKey ?? null
    }
    return internalEditingLayerKey.value
  })

  const isSectionSelectionControlled = computed(
    () => props.options?.selectedSectionKey !== undefined
  )

  const activeSelectedSectionKey = computed(() => {
    if (isSectionSelectionControlled.value) {
      return props.options?.selectedSectionKey ?? null
    }
    return internalSelectedSectionKey.value
  })

  /** Garante uma section válida mesmo com key ausente/inválida. */
  const resolvedSelectedSectionKey = computed((): string | null => {
    const sections = normalizedSections.value
    if (!sections.length) return null

    const current = activeSelectedSectionKey.value
    if (current && sections.some((section) => section.key === current)) {
      return current
    }

    return sections[0].key
  })

  watch(
    normalizedSections,
    (sections) => {
      if (isSectionSelectionControlled.value) return

      const current = internalSelectedSectionKey.value
      if (current && sections.some((section) => section.key === current)) return

      internalSelectedSectionKey.value = sections[0]?.key ?? null
    },
    { immediate: true }
  )

  /**
   * Groups abertos conforme `collapsed` da config.
   * Valor explícito tem prioridade sobre o histórico (ex.: expandir a subetapa atual).
   * Sem `collapsed` na config, mantém o comportamento com persistência.
   */
  const defaultOpeneds = computed(() => {
    const persist = !!props.options?.persist
    const openeds: string[] = []

    normalizedSections.value.forEach((section) => {
      section.groups.forEach((group) => {
        const collapsed =
          group.collapsed !== undefined
            ? group.collapsed
            : resolveGroupCollapsedState(group.key, undefined, persist)
        if (!collapsed) openeds.push(group.key)
      })
    })

    return openeds
  })

  /**
   * Remonta o ElMenu só quando muda o group da subetapa ativa.
   * (default-openeds do Element Plus só vale na montagem; remount amplo
   * recriava o SectionMenu e atrapalhava as actions.)
   */
  const menuOpenedsKey = computed(() => {
    const stepOpenKeys: string[] = []
    normalizedSections.value.forEach((section) => {
      section.groups.forEach((group) => {
        if (group.collapsed === false && group.meta?.isCurrentStep) {
          stepOpenKeys.push(group.key)
        }
      })
    })
    return stepOpenKeys.slice().sort().join('|') || 'none'
  })

  /** Alinha o histórico de collapse com a config ao trocar a subetapa. */
  watch(
    () => menuOpenedsKey.value,
    () => {
      if (!props.options?.persist) return

      const openSet = new Set(defaultOpeneds.value)
      normalizedSections.value.forEach((section) => {
        section.groups.forEach((group) => {
          if (group.collapsed === undefined) return
          setGroupCollapsedHistory(group.key, !openSet.has(group.key))
        })
      })
    },
    { flush: 'post' }
  )

  type CustomClasses = {
    layerMenu: string
    menuButton: string
    customMenu: string
  }

  const customClasses = computed((): CustomClasses => {
    const status = isMenuOpen.value ? 'open' : 'close'
    return {
      layerMenu: `layer-menu layer-menu-${props.options?.size || 'medium'}`,
      menuButton: `map-menu-button map-menu-button-${status}`,
      customMenu: `map-custom-menu map-custom-menu-${status}`
    }
  })

  type IconButton = 'chevron-left' | 'chevron-right'

  const iconButton = computed((): IconButton => {
    return isMenuOpen.value ? 'chevron-left' : 'chevron-right'
  })

  const findLayerContext = (
    layerKey: string
  ): { sectionKey: string; layer: LayerData } | null => {
    for (const section of normalizedSections.value) {
      for (const group of section.groups) {
        const layer = group.layers?.find((item) => item.key === layerKey)
        if (layer) return { sectionKey: section.key, layer }
      }
    }
    return null
  }

  const setEditingState = (sectionKey: string | null, layerKey: string | null): void => {
    if (!isEditingControlled.value) {
      internalEditingLayerKey.value = layerKey
    }

    const context = layerKey ? findLayerContext(layerKey) : null

    emit('onSectionEditStateChange', {
      sectionKey,
      layerKey,
      layer: context?.layer ?? null
    })
  }

  const setSelectedSection = (sectionKey: string): void => {
    if (!isSectionSelectionControlled.value) {
      internalSelectedSectionKey.value = sectionKey
    }

    emit('onSelectedSectionChange', { sectionKey })
  }

  const onSelectedSectionChange = (sectionKey: string): void => {
    setSelectedSection(sectionKey)
  }

  const onGroupMenuOpen = (index: string): void => {
    if (!props.options?.persist) return
    setGroupCollapsedHistory(index, false)
  }

  const onGroupMenuClose = (index: string): void => {
    if (!props.options?.persist) return
    setGroupCollapsedHistory(index, true)
  }

  const applyLayerOverlay = (layer: LayerData): void => {
    if (!shouldApplyMapOverlay(layer)) return

    if (layer.geojson || layer.mapSource === 'geojson') {
      handleGeoJsonLayer(layer)
      return
    }

    handleWmsLayer(layer)
  }

  const onInitDefaultLayer = (layer: LayerData): void => {
    applyLayerOverlay(layer)
  }

  const initializedLayerKeys = new Set<string>()

  const initDefaultLayers = (): void => {
    if (!props.map) return

    const persist = !!props.options?.persist

    normalizedSections.value.forEach((section) => {
      section.groups.forEach((group) => {
        group.layers?.forEach((layer) => {
          if (initializedLayerKeys.has(layer.key)) return
          if (!shouldApplyMapOverlay(layer)) return
          if (!shouldInitLayerOnMap(layer, persist)) return

          const resolved = resolveLayerActiveState(layer, persist)
          onInitDefaultLayer(resolved)
          initializedLayerKeys.add(layer.key)
        })
      })
    })
  }

  watch(
    [() => props.layersConfig, () => props.map],
    (newValues, oldValues) => {
      const [, newMap] = newValues
      const [, oldMap] = oldValues ?? []
      if (newMap !== oldMap) {
        initializedLayerKeys.clear()
      }
      void nextTick(() => {
        initDefaultLayers()
      })
    },
    { immediate: true, deep: true }
  )

  const onChildLayerChange = (layer: LayerData): void => {
    applyLayerOverlay(layer)
    emit('onChildLayerToggle', layer)
  }

  const onGroupLayerToggle = (parent: GroupLayerData): void => {
    parent.layers.forEach((childLayer: LayerData) => {
      applyLayerOverlay(childLayer)
    })

    emit('onGroupLayerToggle', parent)
  }

  const onLayerAction = (payload: LayerActionPayload): void => {
    const isEditAction = payload.actionType === 'edit' || payload.actionKey === 'edit'
    const isEditControlAction =
      payload.source === 'edit-panel' &&
      (payload.actionType === 'cancel' ||
        payload.actionType === 'conclude' ||
        payload.actionKey === 'cancel' ||
        payload.actionKey === 'conclude')

    if (isEditAction && payload.source === 'child-menu' && payload.layerKey) {
      setEditingState(payload.sectionKey ?? null, payload.layerKey)
      if (payload.sectionKey) {
        setSelectedSection(payload.sectionKey)
      }
    }

    if (isEditControlAction) {
      setEditingState(null, null)
    }

    emit('onLayerAction', payload)
  }

  const convertToWmsLayer = (layer: LayerData): L.TileLayer => {
    const wmsLayer = L.tileLayer.wms(layer.baseUrl ?? '', {
      layers: layer.layers,
      format: layer.format || 'image/png',
      transparent: layer.transparent
    })

    if (layer?.cqlFilter && layer.cqlFilter.length > 0) {
      wmsLayer.setParams({
        cql_filter: layer.cqlFilter
      } as any)
    }

    watchLayerStatus(wmsLayer)

    return wmsLayer
  }

  const handleWmsLayer = (layer: LayerData): void => {
    if (convertedLayers.value[layer.key]) {
      if (!layer.active) return removeWmsLayer(layer)
    }

    if (!layer.active) return

    const wmsLayer = convertToWmsLayer(layer)
    convertedLayers.value[layer.key] = wmsLayer

    wmsLayer.addTo(props.map)

    if (props.layerControl) {
      props.layerControl.addOverlay(wmsLayer, `${wmsLayer.options.attribution}`)
    }
  }

  const removeWmsLayer = (layer: LayerData): void => {
    const wmsLayer = convertedLayers.value[layer.key]
    if (!wmsLayer) return

    props.map.removeLayer(wmsLayer)
    props.layerControl?.removeLayer(wmsLayer)

    delete convertedLayers.value[layer.key]
  }

  const watchLayerStatus = (tileLayer: L.TileLayer): void => {
    tileLayer.on('loading', () => {
      emit('startLoading')
    })

    tileLayer.on('load', () => {
      emit('stopLoading')
    })

    tileLayer.on('error', () => {
      emit('stopLoading')
    })
  }

  const convertToGeojsonLayer = (layer: LayerData): L.GeoJSON => {
    const geojsonLayer = L.geoJSON(layer.geojson, {
      ...layer,
      style: layer.style
    })

    watchGeoJsonLayerStatus(geojsonLayer)

    return geojsonLayer
  }

  const handleGeoJsonLayer = (layer: LayerData): void => {
    if (convertedGeoJsonLayers.value[layer.key]) {
      if (!layer.active) return removeGeoJsonLayer(layer)
    }

    if (!layer.active) return

    const geoJsonLayer = convertToGeojsonLayer(layer)
    convertedGeoJsonLayers.value[layer.key] = geoJsonLayer

    geoJsonLayer.addTo(props.map)

    if (props.layerControl) {
      props.layerControl.addOverlay(geoJsonLayer, `${geoJsonLayer.options.attribution}`)
    }
  }

  const removeGeoJsonLayer = (layer: LayerData): void => {
    const geoJsonLayer = convertedGeoJsonLayers.value[layer.key]
    if (!geoJsonLayer) return

    props.map.removeLayer(geoJsonLayer)
    props.layerControl?.removeLayer(geoJsonLayer)

    delete convertedGeoJsonLayers.value[layer.key]
  }

  const watchGeoJsonLayerStatus = (geoJsonLayer: L.GeoJSON): void => {
    geoJsonLayer.on('loading', () => {
      emit('startLoading')
    })

    geoJsonLayer.on('load', () => {
      emit('stopLoading')
    })

    geoJsonLayer.on('error', () => {
      emit('stopLoading')
    })
  }
</script>

<style>
  .layer-menu > .map-custom-menu,
  .layer-menu > .map-menu-button {
    position: absolute;
    top: 50%;
    left: -50px;
    transform: translateY(-50%);
    z-index: 1001;
    transition: var(--mapa-base-transition);
  }

  .layer-menu > .map-custom-menu {
    box-shadow: var(--mapa-base-box-shadow);
    padding: var(--mapa-size-base-10);
    overflow-y: scroll;
    scrollbar-width: none;
    height: 100%;
  }

  .layer-menu > .map-menu-button {
    height: var(--mapa-size-base-40);
    width: var(--mapa-size-base-40);
    border-radius: 0 var(--mapa-size-base-20) var(--mapa-size-base-20) 0;
    color: var(--mapa-base-green);

    &:hover {
      background-color: var(--mapa-base-white);
      color: var(--mapa-base-green);
      border-color: var(--mapa-base-white);
    }
  }
</style>
