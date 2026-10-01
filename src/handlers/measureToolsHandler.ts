import L, { FeatureGroup, Layer, Map, Path } from 'leaflet'
import '@geoman-io/leaflet-geoman-free'

import { MapToolsConfig, MeasureCompleteEvent, GeomanDrawingEvent } from '../types'
import {
  calculateLayerArea,
  calculateLayerLength,
  formatAreaHa,
  formatLengthKm
} from '../utils/geometryCalculator'

type MeasureToolsCallbacks = {
  onMeasureComplete?: (data: MeasureCompleteEvent) => void
}

type MeasureMode = 'line' | 'polygon'

const LINE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>'

const POLYGON_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 5v10l-8 5-8-5V7z"/></svg>'

export default class MeasureToolsHandler {
  private readonly _map: Map
  private readonly _mapContainer: HTMLElement
  private readonly _outerContainer: HTMLElement | null
  private readonly _config: MapToolsConfig
  private readonly _callbacks: MeasureToolsCallbacks
  private readonly _measureGroup: FeatureGroup
  private readonly _measureSvgRenderer: L.SVG
  private readonly _boundMeasureCreate: (evt: GeomanDrawingEvent) => void
  private readonly _boundMeasureCancel: () => void
  private readonly _boundEscapeKey: (event: KeyboardEvent) => void
  private _control: L.Control | null = null
  private _lineBtn: HTMLButtonElement | null = null
  private _polygonBtn: HTMLButtonElement | null = null
  private _interactionPanel: HTMLElement | null = null
  private _resultsEl: HTMLElement | null = null
  private _helpEl: HTMLElement | null = null
  private _activeMode: MeasureMode | null = null
  private _suppressMeasureCancel = false
  private _restoreZoomAnimation = true
  private _measureCreateTimeoutId: number | null = null

  constructor(map: Map, config: MapToolsConfig, callbacks: MeasureToolsCallbacks = {}) {
    this._map = map
    this._config = config
    this._callbacks = callbacks
    this._mapContainer = map.getContainer()
    this._outerContainer = this._mapContainer.closest('.map-container')
    this._measureGroup = new FeatureGroup()
    this._measureGroup.addTo(map)
    this._measureSvgRenderer = L.svg({ pane: 'overlayPane' })

    this._boundMeasureCreate = (evt) => this.handleMeasureCreate(evt)
    this._boundMeasureCancel = () => this.handleMeasureCancel()
    this._boundEscapeKey = (event) => {
      if (event.key === 'Escape' && this.isActive()) {
        this.cancel()
      }
    }

    this.addControl()
    this._map.on('pm:create', this._boundMeasureCreate)
    this._map.on('pm:drawcancel', this._boundMeasureCancel)
  }

  public destroy(): void {
    this.clearMeasureCreateTimeout()
    this.stopMode()
    document.removeEventListener('keydown', this._boundEscapeKey)
    this._map.off('pm:create', this._boundMeasureCreate)
    this._map.off('pm:drawcancel', this._boundMeasureCancel)
    this._measureGroup.clearLayers()
    this._map.removeLayer(this._measureGroup)

    if (this._control) {
      this._map.removeControl(this._control)
      this._control = null
    }
  }

  public cancel(): void {
    if (!this.isActive()) return

    this._suppressMeasureCancel = true
    this._map.pm.disableDraw()
    this._suppressMeasureCancel = false
    this.stopMode()
    this._measureGroup.clearLayers()
  }

  public isActive(): boolean {
    return this._activeMode !== null
  }

  public startLine(): void {
    this.startMode('line')
  }

  public startPolygon(): void {
    this.startMode('polygon')
  }

  private addControl(): void {
    const position = this._config.position ?? 'topright'
    const config = this._config
    const handler = this

    const MeasureToolsControl = L.Control.extend({
      options: { position },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-control leaflet-control-measure-tools')

        const buttons = L.DomUtil.create('div', 'measure-tools-buttons', container)

        if (config.measureLine?.show !== false) {
          handler._lineBtn = handler.createToolButton(
            buttons,
            'measure-tools-btn measure-tools-btn--line',
            config.measureLine?.title ?? config.texts?.measureLineTitle ?? 'Measure line',
            LINE_ICON,
            () => handler.toggleMode('line')
          )
        }

        if (config.measurePolygon?.show !== false) {
          handler._polygonBtn = handler.createToolButton(
            buttons,
            'measure-tools-btn measure-tools-btn--polygon',
            config.measurePolygon?.title ?? config.texts?.measurePolygonTitle ?? 'Measure polygon',
            POLYGON_ICON,
            () => handler.toggleMode('polygon')
          )
        }

        if (handler.isInteractionPanelEnabled()) {
          handler._interactionPanel = L.DomUtil.create(
            'div',
            'measure-tools-interaction js-measure-interaction',
            container
          )
          handler._interactionPanel.style.display = 'none'
          handler._interactionPanel.innerHTML = handler.buildInteractionHtml(config)

          handler._resultsEl = handler._interactionPanel.querySelector('.js-results')
          handler._helpEl = handler._interactionPanel.querySelector('.js-measure-help')

          const cancelBtn = handler._interactionPanel.querySelector('.js-cancel')
          const finishBtn = handler._interactionPanel.querySelector('.js-finish')

          if (cancelBtn instanceof HTMLElement) {
            L.DomEvent.on(cancelBtn, 'click', (e) => {
              L.DomEvent.stop(e)
              handler.cancel()
            })
          }

          if (finishBtn instanceof HTMLElement) {
            L.DomEvent.on(finishBtn, 'click', (e) => {
              L.DomEvent.stop(e)
              handler.finishDrawing()
            })
          }
        }

        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.disableScrollPropagation(container)

        return container
      }
    })

    this._control = new MeasureToolsControl()
    this._control.addTo(this._map)
  }

  private isInteractionPanelEnabled(): boolean {
    return this._config.showInteractionPanel !== false
  }

  private buildInteractionHtml(config: MapToolsConfig): string {
    const title = config.texts?.measurePanelTitle ?? 'Measure distances and areas'
    const cancel = config.texts?.measureCancel ?? 'Cancel'
    const finish = config.texts?.measureFinish ?? 'Finish measurement'

    return `
      <div class="js-measuringprompt">
        <h3>${title}</h3>
        <p class="js-measure-help"></p>
        <div class="js-results results"></div>
        <ul class="js-measuretasks tasks">
          <li><a href="#" class="js-cancel cancel">${cancel}</a></li>
          <li><a href="#" class="js-finish finish">${finish}</a></li>
        </ul>
      </div>
    `
  }

  private createToolButton(
    container: HTMLElement,
    className: string,
    title: string,
    iconHtml: string,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = L.DomUtil.create('button', className, container) as HTMLButtonElement
    btn.type = 'button'
    btn.title = title
    btn.setAttribute('aria-label', title)
    btn.innerHTML = iconHtml
    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.stop(e)
      onClick()
    })
    return btn
  }

  private toggleMode(mode: MeasureMode): void {
    if (this._activeMode === mode) {
      this.cancel()
      return
    }

    this.startMode(mode)
  }

  private startMode(mode: MeasureMode): void {
    if (this.isActive()) {
      this._suppressMeasureCancel = true
      this._map.pm.disableDraw()
      this._suppressMeasureCancel = false
    }

    this._measureGroup.clearLayers()
    this._activeMode = mode
    this.setMeasureActive(true)
    this.updateButtons()
    this.showInteractionPanel(mode)
    document.addEventListener('keydown', this._boundEscapeKey)

    if (this._map.doubleClickZoom.enabled()) {
      this._map.doubleClickZoom.disable()
    }

    this._restoreZoomAnimation = this._map.options.zoomAnimation !== false
    this._map.options.zoomAnimation = false

    const shapeOptions = this._config.measureArea?.shapeOptions ?? {
      color: '#e67e22',
      fillColor: '#e67e22',
      fillOpacity: 0.2,
      weight: 2
    }

    const drawOptions = {
      snappable: true,
      templineStyle: shapeOptions,
      hintlineStyle: shapeOptions,
      pathOptions: shapeOptions
    }

    if (mode === 'line') {
      this._map.pm.enableDraw('Line', {
        ...drawOptions,
        finishOn: 'dblclick'
      } as unknown as L.PM.DrawModeOptions)
    } else {
      this._map.pm.enableDraw('Polygon', {
        ...drawOptions,
        finishOn: null,
        allowSelfIntersection: true
      } as unknown as L.PM.DrawModeOptions)
    }
  }

  private stopMode(): void {
    this._activeMode = null
    this.setMeasureActive(false)
    this._map.pm.disableDraw()
    this._map.options.zoomAnimation = this._restoreZoomAnimation
    this.updateButtons()
    this.hideInteractionPanel()
    document.removeEventListener('keydown', this._boundEscapeKey)

    if (!this._map.doubleClickZoom.enabled()) {
      this._map.doubleClickZoom.enable()
    }
  }

  private finishDrawing(): void {
    const draw = (this._map as Map & { pm?: { Draw?: { finishDraw?: () => void } } }).pm?.Draw
    draw?.finishDraw?.()
  }

  private handleMeasureCreate(evt: GeomanDrawingEvent): void {
    if (!this.isActive()) return

    const shape = String(evt.shape).toLowerCase()
    const isLine = shape === 'line' || shape === 'polyline'
    const isPolygon = shape === 'polygon' || shape === 'rectangle'

    if (this._activeMode === 'line' && !isLine) return
    if (this._activeMode === 'polygon' && !isPolygon) return

    const { layer } = evt
    const mode = this._activeMode

    this.stopMode()

    this.clearMeasureCreateTimeout()
    this._measureCreateTimeoutId = window.setTimeout(() => {
      this._measureCreateTimeoutId = null

      if (!this._map?.hasLayer(this._measureGroup)) return

      this.applyMeasureLayerOptions(layer)

      if (this._map.hasLayer(layer)) {
        this._map.removeLayer(layer)
      }

      this._measureGroup.clearLayers()
      this._measureGroup.addLayer(layer)

      const { html, event } = this.buildMeasurePopup(layer, mode!)
      layer.bindPopup(html, { closeOnClick: false, autoClose: false, autoPan: false }).openPopup()

      layer.on('popupclose', () => {
        this._measureGroup.removeLayer(layer)
      })

      this._callbacks.onMeasureComplete?.(event)
    }, 0)
  }

  private clearMeasureCreateTimeout(): void {
    if (this._measureCreateTimeoutId !== null) {
      window.clearTimeout(this._measureCreateTimeoutId)
      this._measureCreateTimeoutId = null
    }
  }

  private handleMeasureCancel(): void {
    if (this._suppressMeasureCancel || !this.isActive()) return
    this.stopMode()
    this._measureGroup.clearLayers()
  }

  private buildMeasurePopup(
    layer: Layer,
    mode: MeasureMode
  ): { html: string; event: MeasureCompleteEvent } {
    const label = this._config.texts?.measureResult ?? 'Measurement'

    if (mode === 'polygon') {
      const areas = calculateLayerArea(layer)
      const areaLine = `${this._config.texts?.measureArea ?? 'Area'}: ${formatAreaHa(areas.ha)}`
      return {
        html: `<div class="leaflet-measure-resultpopup"><h3>${label}</h3><p>${areaLine}</p></div>`,
        event: {
          m2: areas.m2,
          ha: areas.ha,
          geojson: (layer as L.Polygon).toGeoJSON() as MeasureCompleteEvent['geojson']
        }
      }
    }

    const lengths = calculateLayerLength(layer)
    const distanceLine = `${this._config.texts?.measureLength ?? 'Distance'}: ${formatLengthKm(lengths.km)}`
    return {
      html: `<div class="leaflet-measure-resultpopup"><h3>${label}</h3><p>${distanceLine}</p></div>`,
      event: {
        lengthM: lengths.m,
        lengthKm: lengths.km,
        geojson: (layer as L.Polyline).toGeoJSON() as MeasureCompleteEvent['geojson']
      }
    }
  }

  private applyMeasureLayerOptions(layer: Layer): void {
    if (layer instanceof Path) {
      layer.options.renderer = this._measureSvgRenderer
      if (typeof layer.redraw === 'function') {
        layer.redraw()
      }
    }
  }

  private showInteractionPanel(mode: MeasureMode): void {
    if (!this.isInteractionPanelEnabled() || !this._interactionPanel || !this._helpEl) return

    this._interactionPanel.style.removeProperty('display')
    this._interactionPanel.closest('.leaflet-control-measure-tools')?.classList.add('measure-tools-expanded')

    if (mode === 'line') {
      this._helpEl.textContent =
        this._config.texts?.measureLineHelp ??
        'Click two points on the map. Double-click to finish the line.'
    } else {
      this._helpEl.textContent =
        this._config.texts?.measurePolygonHelp ??
        'Click to add vertices. Finish on the first point, use Finish, or double-click.'
    }

    if (this._resultsEl) {
      this._resultsEl.innerHTML = ''
    }
  }

  private hideInteractionPanel(): void {
    if (!this._interactionPanel) return

    this._interactionPanel.style.display = 'none'
    this._interactionPanel.closest('.leaflet-control-measure-tools')?.classList.remove('measure-tools-expanded')
  }

  private updateButtons(): void {
    const active = this._activeMode
    this._lineBtn?.classList.toggle('measure-tools-btn--active', active === 'line')
    this._polygonBtn?.classList.toggle('measure-tools-btn--active', active === 'polygon')
  }

  private setMeasureActive(active: boolean): void {
    ;(this._map as Map & { _leafletMeasureActive?: boolean })._leafletMeasureActive = active
    this._mapContainer.classList.toggle('map-container--measuring', active)

    if (this._outerContainer instanceof HTMLElement) {
      this._outerContainer.classList.toggle('map-container--measuring', active)
    }
  }
}
