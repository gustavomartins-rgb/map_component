import L, { FeatureGroup, LatLngBounds, Map } from 'leaflet'

import MeasureToolsHandler from './measureToolsHandler'
import { resolveMapToolsConfig } from './toolsConstants'
import { MapToolsConfig, MeasureCompleteEvent } from '../types'

type MapToolsCallbacks = {
  onFullscreenChange?: (active: boolean) => void
  onMeasureComplete?: (data: MeasureCompleteEvent) => void
}

type InitialView = {
  center: L.LatLngExpression
  zoom: number
}

const FULLSCREEN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>'

const EXIT_FULLSCREEN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>'

const CENTER_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>'

export default class MapToolsHandler {
  private readonly _map: Map
  private readonly _config: MapToolsConfig
  private readonly _initialView: InitialView
  private readonly _callbacks: MapToolsCallbacks
  private readonly _fullscreenContainer: HTMLElement
  private _drawItemsGroup: FeatureGroup | null
  private _control: L.Control | null = null
  private _measureTools: MeasureToolsHandler | null = null
  private _fullscreenBtn: HTMLButtonElement | null = null
  private _boundFullscreenChange: () => void

  constructor(
    map: Map,
    toolsConfig: MapToolsConfig | undefined,
    initialView: InitialView,
    drawItemsGroup: FeatureGroup | null,
    fullscreenContainer: HTMLElement,
    callbacks: MapToolsCallbacks = {}
  ) {
    const resolved = resolveMapToolsConfig(toolsConfig)
    if (!resolved) {
      throw new Error('MapToolsHandler requires tools.show to be true')
    }

    this._map = map
    this._config = resolved
    this._initialView = initialView
    this._drawItemsGroup = drawItemsGroup
    this._callbacks = callbacks
    this._fullscreenContainer = fullscreenContainer

    this._boundFullscreenChange = () => this.handleFullscreenChange()

    this.addControl()

    if (this._config.measureArea?.show !== false) {
      this._measureTools = new MeasureToolsHandler(this._map, this._config, {
        onMeasureComplete: (data) => this._callbacks.onMeasureComplete?.(data)
      })
      this.alignTopRightControls()
    }

    this.bindFullscreenEvents()
  }

  public setDrawItemsGroup(group: FeatureGroup | null): void {
    this._drawItemsGroup = group
  }

  public centerMap(): void {
    const padding = this._config.center?.padding ?? [20, 20]
    const target = this._config.center?.target ?? 'drawn'

    if (target === 'drawn' && this._drawItemsGroup && this._drawItemsGroup.getLayers().length > 0) {
      const bounds = this._drawItemsGroup.getBounds()
      if (bounds.isValid()) {
        this._map.fitBounds(bounds, { padding })
        return
      }
    }

    this._map.setView(this._initialView.center, this._initialView.zoom)
  }

  public enterFullscreen(): void {
    if (!document.fullscreenElement) {
      void this._fullscreenContainer.requestFullscreen?.()
    }
  }

  public exitFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.()
    }
  }

  public toggleFullscreen(): void {
    if (document.fullscreenElement) {
      this.exitFullscreen()
    } else {
      this.enterFullscreen()
    }
  }

  public toggleMeasureArea(): void {
    if (this._measureTools?.isActive()) {
      this._measureTools.cancel()
      return
    }

    this._measureTools?.startLine()
  }

  public destroy(): void {
    document.removeEventListener('fullscreenchange', this._boundFullscreenChange)

    this._measureTools?.destroy()
    this._measureTools = null

    if (this._control) {
      this._map.removeControl(this._control)
      this._control = null
    }
  }

  private addControl(): void {
    const position = this._config.position ?? 'topright'
    const config = this._config
    const handler = this

    const MapToolsControl = L.Control.extend({
      options: { position },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-control leaflet-control-map-tools')

        if (config.zoom?.show !== false) {
          handler.createButton(
            container,
            'map-tools-btn map-tools-btn--zoom-in',
            config.zoom?.titleIn ?? 'Zoom in',
            '+',
            (e) => {
              L.DomEvent.stop(e)
              handler._map.zoomIn()
            }
          )

          handler.createButton(
            container,
            'map-tools-btn map-tools-btn--zoom-out',
            config.zoom?.titleOut ?? 'Zoom out',
            '−',
            (e) => {
              L.DomEvent.stop(e)
              handler._map.zoomOut()
            }
          )
        }

        if (config.center?.show !== false) {
          handler.createButton(
            container,
            'map-tools-btn map-tools-btn--center',
            config.center?.title ?? 'Center map',
            CENTER_ICON,
            (e) => {
              L.DomEvent.stop(e)
              handler.centerMap()
            }
          )
        }

        if (config.fullscreen?.show !== false) {
          handler._fullscreenBtn = handler.createButton(
            container,
            'map-tools-btn map-tools-btn--fullscreen',
            config.fullscreen?.title ?? 'Fullscreen',
            FULLSCREEN_ICON,
            (e) => {
              L.DomEvent.stop(e)
              handler.toggleFullscreen()
            }
          )
        }

        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.disableScrollPropagation(container)

        return container
      }
    })

    this._control = new MapToolsControl()
    this._map.addControl(this._control)
    // Remove o zoom nativo só quando o tools traz botões de zoom (evita duplicar)
    if (config.zoom?.show !== false) {
      this.removeNativeZoomControl()
    }
    this.alignTopRightControls()
  }

  private removeNativeZoomControl(): void {
    const zoomControl = this._map.getContainer().querySelector('.leaflet-control-zoom')
    if (!zoomControl) return

    const control = this._map.zoomControl
    if (control) {
      this._map.removeControl(control)
    }
  }

  public alignTopRightControls(): void {
    const corner = this._map.getContainer().querySelector('.leaflet-top.leaflet-right')
    if (!corner) return

    const prioritySelectors = [
      '.leaflet-control-map-tools',
      '.leaflet-control-layers',
      '.leaflet-control-measure-tools',
      '.leaflet-control-measure'
    ]

    const controls = Array.from(corner.querySelectorAll(':scope > .leaflet-control'))
    const sorted = [
      ...prioritySelectors.flatMap((selector) => controls.filter((control) => control.matches(selector))),
      ...controls.filter((control) => !prioritySelectors.some((selector) => control.matches(selector)))
    ]

    sorted.forEach((control) => corner.appendChild(control))
  }

  private createButton(
    container: HTMLElement,
    className: string,
    title: string,
    iconHtml: string,
    onClick: (e: Event) => void
  ): HTMLButtonElement {
    const btn = L.DomUtil.create('button', className, container) as HTMLButtonElement
    btn.type = 'button'
    btn.title = title
    btn.innerHTML = iconHtml

    L.DomEvent.on(btn, 'click', onClick)

    return btn
  }

  private bindFullscreenEvents(): void {
    document.addEventListener('fullscreenchange', this._boundFullscreenChange)
  }

  private handleFullscreenChange(): void {
    const isActive = document.fullscreenElement === this._fullscreenContainer
    this._fullscreenContainer.classList.toggle('map-container--fullscreen', isActive)

    if (this._fullscreenBtn) {
      this._fullscreenBtn.innerHTML = isActive ? EXIT_FULLSCREEN_ICON : FULLSCREEN_ICON
      this._fullscreenBtn.title = isActive ? 'Exit fullscreen' : (this._config.fullscreen?.title ?? 'Fullscreen')
      this._fullscreenBtn.classList.toggle('map-tools-btn--active', isActive)
    }

    setTimeout(() => {
      this._map.invalidateSize()
    }, 100)
    this._callbacks.onFullscreenChange?.(isActive)
  }
}

export function isMeasureModeActive(map: Map): boolean {
  return !!(map as Map & { _leafletMeasureActive?: boolean })._leafletMeasureActive
}

export function getDrawnBounds(drawItemsGroup: FeatureGroup | null): LatLngBounds | null {
  if (!drawItemsGroup || drawItemsGroup.getLayers().length === 0) return null
  const bounds = drawItemsGroup.getBounds()
  return bounds.isValid() ? bounds : null
}
