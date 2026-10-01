import { MapToolsConfig } from '../types'

export const DEFAULT_MAP_TOOLS: MapToolsConfig = {
  show: false,
  position: 'topright',
  zoom: {
    show: true,
    titleIn: 'Zoom in',
    titleOut: 'Zoom out'
  },
  fullscreen: {
    show: true,
    title: 'Fullscreen'
  },
  center: {
    show: true,
    title: 'Center map',
    target: 'drawn',
    padding: [20, 20]
  },
  measureArea: {
    show: true,
    title: 'Measure',
    shapeOptions: {
      color: '#e67e22',
      fillColor: '#e67e22',
      fillOpacity: 0.2,
      weight: 2
    }
  },
  measureLine: {
    show: true,
    title: 'Measure line'
  },
  measurePolygon: {
    show: true,
    title: 'Measure polygon'
  },
  showInteractionPanel: true,
  texts: {
    measureResult: 'Measurement',
    measureLength: 'Distance',
    measureArea: 'Area',
    measurePanelTitle: 'Measure distances and areas',
    measureLineTitle: 'Measure line',
    measurePolygonTitle: 'Measure polygon',
    measureLineHelp: 'Click two points on the map. Double-click to finish the line.',
    measurePolygonHelp:
      'Click to add vertices. Finish on the first point, use Finish, or double-click.',
    measureCancel: 'Cancel',
    measureFinish: 'Finish measurement',
    noGeometry: 'No geometries to center on'
  }
}

export function resolveMapToolsConfig(tools?: MapToolsConfig): MapToolsConfig | null {
  if (!tools?.show) return null

  return {
    ...DEFAULT_MAP_TOOLS,
    ...tools,
    zoom: { ...DEFAULT_MAP_TOOLS.zoom, ...tools.zoom },
    fullscreen: { ...DEFAULT_MAP_TOOLS.fullscreen, ...tools.fullscreen },
    center: { ...DEFAULT_MAP_TOOLS.center, ...tools.center },
    measureArea: { ...DEFAULT_MAP_TOOLS.measureArea, ...tools.measureArea },
    measureLine: { ...DEFAULT_MAP_TOOLS.measureLine, ...tools.measureLine },
    measurePolygon: { ...DEFAULT_MAP_TOOLS.measurePolygon, ...tools.measurePolygon },
    texts: { ...DEFAULT_MAP_TOOLS.texts, ...tools.texts }
  }
}
