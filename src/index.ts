import MapaDPG from './components/MapDPG.vue'

export { createStableMarker, bindMarkerZoomStability, STABLE_MARKER_DEFAULTS } from './utils/stableMarker'
export type { StableMarkerOptions } from './utils/stableMarker'

export type {
  FaIconName,
  SectionConfig,
  SectionData,
  SectionEditStatePayload,
  SectionSelectPayload,
  LayerActionConfig,
  LayerActionStyle,
  LayerActionDefaultItem,
  LayerActionDefaults,
  LayerActionPayload,
  LayerMetricsConfig,
  LayerMetrics,
  LayerMetricsMap,
  LayerInfoIconConfig,
  LayerInfoIconsMap,
  GroupActionConfig,
  GroupActionsMap,
  LayerData,
  GroupLayerData,
  LayersConfig,
  LayersMenuConfig,
  MapLayers,
  MapOptionsConfig,
  DrawingEvent,
  MeasureCompleteEvent,
  DescriptiveMemorial
} from './types'

export {
  normalizeLayersConfig,
  isSectionConfig,
  isGroupConfig,
  resolveLayerActions,
  resolveEditControlAction,
  shouldApplyMapOverlay,
  collectLayerMetricsMap,
  resolveLayerMetrics,
  collectLayerInfoIconsMap,
  resolveActiveLayerInfoIcons,
  collectGroupActionsMap,
  resolveActiveGroupActions,
  withLayerInfoIconActive,
  withGroupActionActive
} from './utils/layersConfigNormalizer'

export default MapaDPG
