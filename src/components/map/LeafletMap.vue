<template>
  <div
    :id="mapOptions.config.id || 'map'"
    style="height: inherit; width: inherit"
  />
</template>

<script setup lang="ts">
  import L from 'leaflet'
  import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
  import DrawingControlHandler from '../../handlers/drawingControl'
  import MapHandler from '../../handlers/mapHandler'
  import { DEFAULT_MAP_OPTIONS } from '../../handlers/constants'
  import MapToolsHandler from '../../handlers/mapToolsHandler'
  import { resolveMapToolsConfig } from '../../handlers/toolsConstants'
  import { resolveDrawingPathOptions, type MemorialDrawShape } from '../../utils/drawingPathOptions'
  import { bindMarkerZoomStability } from '../../utils/stableMarker'
  import {
    DrawingConfig,
    DrawingEvent,
    MapConfig,
    MapConfigConfig,
    MapLayers,
    MapToolsConfig,
    MeasureCompleteEvent,
    MemorialConfig
  } from '../../types'

  const emit = defineEmits<{
    (e: 'startLoading'): void
    (e: 'stopLoading'): void
    (e: 'onDrawing', data: DrawingEvent): void
    (e: 'onFullscreenChange', active: boolean): void
    (e: 'onMeasureComplete', data: MeasureCompleteEvent): void
  }>()

  type MapProps = {
    mapOptions: MapConfig
    layers: MapLayers
    drawingOptions?: DrawingConfig
    memorialOptions?: MemorialConfig
    toolsOptions?: MapToolsConfig
    fullscreenContainer?: HTMLElement | null
  }

  const props = defineProps<MapProps>()

  const map = ref<L.Map>()
  const layerControl = ref<L.Control.Layers>()
  const drawItemsGroup = ref<L.FeatureGroup>()

  let mapHandlerInstance: MapHandler | null = null
  let mapToolsHandler: MapToolsHandler | null = null
  let unbindMarkerZoomStability: (() => void) | null = null

  const setupMarkerZoomStability = (): void => {
    unbindMarkerZoomStability?.()
    unbindMarkerZoomStability = null

    if (props.mapOptions?.config?.stabilizeMarkersOnZoom === false) return
    if (!map.value || !drawItemsGroup.value) return

    unbindMarkerZoomStability = bindMarkerZoomStability(map.value, drawItemsGroup.value)
  }

  onMounted(async () => {
    initMap()
    if (props.drawingOptions?.show) handleDrawingControls()
    await nextTick()
    handleMapTools()
    await nextTick()
    mapToolsHandler?.alignTopRightControls()
  })

  onBeforeUnmount(() => {
    unbindMarkerZoomStability?.()
    unbindMarkerZoomStability = null
    mapToolsHandler?.destroy()
    mapToolsHandler = null
  })

  const initMap = (): void => {
    const { config } = props.mapOptions
    const toolsConfig = resolveMapToolsConfig(props.toolsOptions)
    // Só desliga o zoom nativo quando o bloco tools também exibe zoom próprio
    const useToolsZoom = !!toolsConfig && toolsConfig.zoom?.show !== false
    const mapConfig: MapConfigConfig = {
      ...DEFAULT_MAP_OPTIONS,
      ...config,
      ...(useToolsZoom ? { zoomControl: false } : {})
    }

    mapHandlerInstance = new MapHandler(mapConfig)

    const emitterCallback = (eventName: string) => {
      if (eventName === 'startLoading') emit('startLoading')
      if (eventName === 'stopLoading') emit('stopLoading')
    }

    mapHandlerInstance.init(props.layers, emitterCallback)

    map.value = mapHandlerInstance.map
    layerControl.value = mapHandlerInstance.layerControl
  }

  const resolveFullscreenContainer = (): HTMLElement | null => {
    if (props.fullscreenContainer) return props.fullscreenContainer
    const fromMap = map.value?.getContainer()?.closest('.map-container')
    return fromMap instanceof HTMLElement ? fromMap : null
  }

  const handleMapTools = (): void => {
    const fullscreenContainer = resolveFullscreenContainer()
    if (!resolveMapToolsConfig(props.toolsOptions) || !map.value || !fullscreenContainer) return

    mapToolsHandler = new MapToolsHandler(
      map.value,
      props.toolsOptions,
      mapHandlerInstance!.initialView,
      drawItemsGroup.value ?? null,
      fullscreenContainer,
      {
        onFullscreenChange: (active) => emit('onFullscreenChange', active),
        onMeasureComplete: (data) => emit('onMeasureComplete', data)
      }
    )

    ;(map.value as L.Map & { alignTopRightControls?: () => void }).alignTopRightControls = () =>
      mapToolsHandler?.alignTopRightControls()
  }

  const handleDrawingControls = (): void => {
    drawItemsGroup.value = new L.FeatureGroup()
    drawItemsGroup.value.addTo(map.value!)

    const drawingControlHandler = new DrawingControlHandler(map.value!, drawItemsGroup.value, props.drawingOptions)

    map.value!.pm.addControls(drawingControlHandler.options)

    drawingControlHandler.handleDrawingEvents((data: DrawingEvent) => {
      emit('onDrawing', data)
    })

    drawItemsGroup.value = drawingControlHandler.drawItemsGroup
    map.value = drawingControlHandler.map

    mapToolsHandler?.setDrawItemsGroup(drawItemsGroup.value)
    setupMarkerZoomStability()
  }

  const centerMap = (): void => {
    mapToolsHandler?.centerMap()
  }

  const enterFullscreen = (): void => {
    mapToolsHandler?.enterFullscreen()
  }

  const exitFullscreen = (): void => {
    mapToolsHandler?.exitFullscreen()
  }

  const toggleFullscreen = (): void => {
    mapToolsHandler?.toggleFullscreen()
  }

  const toggleMeasureArea = (): void => {
    mapToolsHandler?.toggleMeasureArea()
  }

  const getDrawingPathOptions = (shape: MemorialDrawShape) =>
    resolveDrawingPathOptions(map.value, props.drawingOptions, shape)

  defineExpose({
    map,
    layerControl,
    drawItemsGroup,
    leaflet: L,
    getDrawingPathOptions,
    centerMap,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    toggleMeasureArea
  })
</script>
