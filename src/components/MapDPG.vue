<template>
  <div
    ref="mapContainerRef"
    class="map-container"
  >
    <Loading :isLoading="(isLoading || showLoading) && !disableLoading" />
    <Map
      ref="mapRef"
      :drawingOptions="options.drawing"
      :fullscreenContainer="mapContainerRef"
      :layers="layers"
      :mapOptions="options.map"
      :toolsOptions="options.tools"
      @onDrawing="emit('onDrawing', $event)"
      @onFullscreenChange="emit('onFullscreenChange', $event)"
      @onMeasureComplete="emit('onMeasureComplete', $event)"
      @startLoading="isLoading = true"
      @stopLoading="isLoading = false"
    />
    <LayerMenu
      v-if="mapRef?.map && layers?.customLayers"
      :layerControl="mapRef.layerControl"
      :layersConfig="layers.customLayers"
      :map="mapRef.map"
      :options="options.layersMenu"
      @onChildLayerToggle="emit('onChildLayerToggle', $event)"
      @onGroupLayerToggle="emit('onGroupLayerToggle', $event)"
      @onLayerAction="emit('onLayerAction', $event)"
      @onSectionEditStateChange="emit('onSectionEditStateChange', $event)"
      @onSelectedSectionChange="emit('onSelectedSectionChange', $event)"
      @startLoading="isLoading = true"
      @stopLoading="isLoading = false"
    />
    <CoordinatePanel
      v-if="mapRef && descriptiveMemorial?.show"
      ref="coordinatePanelRef"
      :descriptiveMemorial="descriptiveMemorial"
      :map="mapRef.map"
      @geometryChange="handleGeometryChange"
      @geometryGeoJsonChange="handleGeometryGeoJsonChange"
      @geometryRemoved="handleGeometryRemoved"
      @systemChange="handleCoordinateSystemChange"
    />
  </div>
</template>

<script lang="ts" setup>
  import L from 'leaflet'
  import { computed, ref } from 'vue'
  import {
    DrawingEvent,
    GroupActionConfig,
    GroupActionsMap,
    GroupLayerData,
    IncrementedLayer,
    LayerActionPayload,
    LayerData,
    LayerInfoIconConfig,
    LayerInfoIconsMap,
    LayerMetricsConfig,
    LayerMetricsMap,
    MapLayers,
    MapOptionsConfig,
    DescriptiveMemorial,
    MeasureCompleteEvent,
    SectionEditStatePayload,
    SectionSelectPayload
  } from '../types'
  import Loading from './loading/Loading.vue'
  import Map from './map/LeafletMap.vue'
  import LayerMenu from './menu/LayerMenu.vue'
  import CoordinatePanel from './coordinate/CoordinatePanel.vue'
  import { isMemorialLayer, MEMORIAL_KEY } from '../utils/memorialLayer'
  import { calculateLayerArea } from '../utils/geometryCalculator'
  import { resolveDrawingPathOptions } from '../utils/drawingPathOptions'
  import {
    collectGroupActionsMap,
    collectLayerInfoIconsMap,
    collectLayerMetricsMap,
    normalizeLayersConfig,
    withGroupActionActive,
    withLayerInfoIconActive
  } from '../utils/layersConfigNormalizer'
  import type { MemorialDrawShape } from '../utils/drawingPathOptions'
  import type { Feature, MultiPolygon, Polygon } from 'geojson'

  type MapaDPGProps = {
    layers: MapLayers
    options: MapOptionsConfig
    showLoading: boolean
    disableLoading: boolean
    descriptiveMemorial: DescriptiveMemorial
  }

  const props = withDefaults(defineProps<MapaDPGProps>(), {
    options: () => ({
      map: {},
      layersMenu: {
        size: 'medium',
        persist: false
      }
    }),
    descriptiveMemorial: () => ({
      show: false
    })
  })

  const emit = defineEmits<{
    (e: 'onGroupLayerToggle', data: GroupLayerData): void
    (e: 'onChildLayerToggle', data: LayerData): void
    (e: 'onLayerAction', payload: LayerActionPayload): void
    (e: 'onSectionEditStateChange', payload: SectionEditStatePayload): void
    (e: 'onSelectedSectionChange', payload: SectionSelectPayload): void
    (e: 'onLayerMetricsUpdate', payload: { layerKey: string; metrics: LayerMetricsConfig[] }): void
    (e: 'onLayerInfoIconsUpdate', payload: { layerKey: string; infoIcons: LayerInfoIconConfig[] }): void
    (e: 'onGroupActionsUpdate', payload: { groupKey: string; actions: GroupActionConfig[] }): void
    (e: 'onDrawing', data: DrawingEvent): void
    (e: 'onCoordinateSystemChange', system: string): void
    (e: 'onFullscreenChange', active: boolean): void
    (e: 'onMeasureComplete', data: MeasureCompleteEvent): void
  }>()

  type MapRef = {
    map: L.Map
    layerControl: L.Control.Layers
    drawItemsGroup: L.FeatureGroup
    leaflet: typeof L
    getDrawingPathOptions: (shape: MemorialDrawShape) => L.PathOptions
    centerMap: () => void
    enterFullscreen: () => void
    exitFullscreen: () => void
    toggleFullscreen: () => void
    toggleMeasureArea: () => void
  }

  const mapRef = ref<MapRef>()
  const mapContainerRef = ref<HTMLElement | null>(null)
  const coordinatePanelRef = ref()
  const isLoading = ref<boolean>(false)

  const metrics = computed((): LayerMetricsMap =>
    collectLayerMetricsMap(props.layers?.customLayers)
  )

  const infoIcons = computed((): LayerInfoIconsMap =>
    collectLayerInfoIconsMap(props.layers?.customLayers)
  )

  const groupActions = computed((): GroupActionsMap =>
    collectGroupActionsMap(props.layers?.customLayers)
  )

  const setLayerMetrics = (layerKey: string, nextMetrics: LayerMetricsConfig[]): void => {
    emit('onLayerMetricsUpdate', { layerKey, metrics: nextMetrics })
  }

  const findLayerInfoIcons = (layerKey: string): LayerInfoIconConfig[] | undefined => {
    for (const section of normalizeLayersConfig(props.layers?.customLayers)) {
      for (const group of section.groups) {
        const layer = group.layers?.find((item) => item.key === layerKey)
        if (layer) return layer.infoIcons
      }
    }
    return undefined
  }

  const findGroupActions = (groupKey: string): GroupActionConfig[] | undefined => {
    for (const section of normalizeLayersConfig(props.layers?.customLayers)) {
      const group = section.groups.find((item) => item.key === groupKey)
      if (group) return group.actions
    }
    return undefined
  }

  /**
   * Altera `active` de um infoIcon e emite para o consumidor atualizar `layers.customLayers`.
   * `iconRef` = `key` do ícone ou índice numérico em string (`"0"`, `"1"`, ...).
   */
  const setLayerInfoIconActive = (layerKey: string, iconRef: string, active: boolean): void => {
    const next = withLayerInfoIconActive(findLayerInfoIcons(layerKey), iconRef, active)
    if (!next) return
    emit('onLayerInfoIconsUpdate', { layerKey, infoIcons: next })
  }

  const setLayerInfoIcons = (layerKey: string, nextInfoIcons: LayerInfoIconConfig[]): void => {
    emit('onLayerInfoIconsUpdate', { layerKey, infoIcons: nextInfoIcons })
  }

  /** Altera `active` de uma action do group e emite para o consumidor atualizar a config. */
  const setGroupActionActive = (groupKey: string, actionKey: string, active: boolean): void => {
    const next = withGroupActionActive(findGroupActions(groupKey), actionKey, active)
    if (!next) return
    emit('onGroupActionsUpdate', { groupKey, actions: next })
  }

  const setGroupActions = (groupKey: string, nextActions: GroupActionConfig[]): void => {
    emit('onGroupActionsUpdate', { groupKey, actions: nextActions })
  }

  const getMemorialPathOptions = (shape: MemorialDrawShape): L.PathOptions =>
    mapRef.value?.getDrawingPathOptions(shape) ??
    resolveDrawingPathOptions(mapRef.value?.map, props.options.drawing, shape)

  const handleCoordinateSystemChange = (system: string) => {
    emit('onCoordinateSystemChange', system)
  }

  const incrementLayerWithDrawnArea = (layer: L.Layer): IncrementedLayer => {
    if (layer instanceof L.GeoJSON) {
      const innerLayer = layer.getLayers()[0]
      const drawnArea = innerLayer ? calculateLayerArea(innerLayer) : { m2: 0, km2: 0, ha: 0 }
      return Object.assign(layer, { drawnArea }) as IncrementedLayer
    }

    const incrementedLayer = layer as IncrementedLayer
    incrementedLayer.drawnArea = calculateLayerArea(layer)
    return incrementedLayer
  }

  const handleGeometryChange = (geometry: string) => {
    if (!mapRef.value?.map || !mapRef.value?.drawItemsGroup) return

    const coordinates = geometry
      .replace(/[A-Z()]/g, '')
      .trim()
      .split(',')
      .map(coord => {
        const [x, y] = coord.trim().split(' ')
        return [parseFloat(y), parseFloat(x)] as [number, number]
      })

    const polylineStyle = getMemorialPathOptions('polyline')
    const polygonStyle = getMemorialPathOptions('polygon')

    let leafletGeometry: L.Layer & { options: { memorialKey?: string } }

    if (geometry.startsWith('POINT')) {
      leafletGeometry = L.marker(coordinates[0])
    } else if (geometry.startsWith('LINESTRING')) {
      leafletGeometry = L.polyline(coordinates as [number, number][], polylineStyle)
    } else if (geometry.startsWith('POLYGON')) {
      leafletGeometry = L.polygon(coordinates as [number, number][], polygonStyle)
    } else {
      console.error('Tipo de geometria não suportado:', geometry)
      return
    }

    leafletGeometry.options.memorialKey = MEMORIAL_KEY

    mapRef.value.drawItemsGroup.addLayer(leafletGeometry)

    emit('onDrawing', {
      type: 'created',
      layer: incrementLayerWithDrawnArea(leafletGeometry)
    })

    if (leafletGeometry instanceof L.Marker) {
      mapRef.value.map.setView(coordinates[0], 15)
    } else if (leafletGeometry instanceof L.Polyline || leafletGeometry instanceof L.Polygon) {
      mapRef.value.map.fitBounds(leafletGeometry.getBounds())
    }
  }

  const removeMemorialLayers = (): L.Layer[] => {
    if (!mapRef.value?.drawItemsGroup) return []

    const layersToRemove: L.Layer[] = []

    mapRef.value.drawItemsGroup.eachLayer(layer => {
      if (isMemorialLayer(layer)) {
        layersToRemove.push(layer)
      }
    })

    layersToRemove.forEach(layer => {
      mapRef.value?.drawItemsGroup.removeLayer(layer)
    })

    return layersToRemove
  }

  const handleGeometryGeoJsonChange = (feature: Feature<Polygon | MultiPolygon>) => {
    if (!mapRef.value?.map || !mapRef.value?.drawItemsGroup) return

    removeMemorialLayers()

    const polygonStyle = getMemorialPathOptions('polygon')

    const leafletGeometry = L.geoJSON(feature, {
      style: polygonStyle,
      onEachFeature: (_geoJsonFeature, layer) => {
        ;(layer as L.Layer & { options: { memorialKey?: string } }).options.memorialKey = MEMORIAL_KEY
      }
    }) as L.Layer & { options: { memorialKey?: string } }

    leafletGeometry.options.memorialKey = MEMORIAL_KEY

    mapRef.value.drawItemsGroup.addLayer(leafletGeometry)
    mapRef.value.map.fitBounds(leafletGeometry.getBounds())

    emit('onDrawing', {
      type: 'created',
      layer: incrementLayerWithDrawnArea(leafletGeometry)
    })
  }

  const handleGeometryRemoved = () => {
    if (!mapRef.value?.map || !mapRef.value?.drawItemsGroup) return

    const layersToRemove = removeMemorialLayers()

    if (layersToRemove.length > 0) {
      emit('onDrawing', {
        type: 'deleted',
        layers: layersToRemove
      })
    }
  }

  const toggleCoordinatePanel = () => {
    if (coordinatePanelRef.value) {
      coordinatePanelRef.value.togglePanel()
    }
  }

  const closeCoordinatePanel = () => {
    if (coordinatePanelRef.value) {
      coordinatePanelRef.value.closePanel()
    }
  }

  const centerMap = () => {
    mapRef.value?.centerMap()
  }

  const enterFullscreen = () => {
    mapRef.value?.enterFullscreen()
  }

  const exitFullscreen = () => {
    mapRef.value?.exitFullscreen()
  }

  const toggleFullscreen = () => {
    mapRef.value?.toggleFullscreen()
  }

  const toggleMeasureArea = () => {
    mapRef.value?.toggleMeasureArea()
  }

  defineExpose({
    map: computed(() => mapRef.value?.map),
    layerControl: computed(() => mapRef.value?.layerControl),
    drawItemsGroup: computed(() => mapRef.value?.drawItemsGroup),
    leaflet: computed(() => mapRef.value?.leaflet),
    getDrawingPathOptions: getMemorialPathOptions,
    toggleCoordinatePanel,
    closeCoordinatePanel,
    centerMap,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    toggleMeasureArea,
    metrics,
    setLayerMetrics,
    infoIcons,
    setLayerInfoIcons,
    setLayerInfoIconActive,
    groupActions,
    setGroupActions,
    setGroupActionActive
  })
</script>

<style>
  @import '/src/assets/main.css';

  .map-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--mapa-base-radius-5);
  }

  .map-container--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
</style>
