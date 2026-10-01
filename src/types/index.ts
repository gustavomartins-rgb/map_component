import { MapOptions, Layer, PathOptions, ControlOptions, ControlPosition } from 'leaflet'
import { GeoJsonObject } from 'geojson'

// @ts-ignore
import { PM } from '@geoman-io/leaflet-geoman-free'

export type FaIconName =
  | 'check'
  | 'xmark'
  | 'chevron-right'
  | 'chevron-left'
  | 'terminal'
  | 'file-lines'
  | 'upload'
  | 'pencil'
  | 'trash'
  | 'chevron-down'
  | 'eye'
  | 'eye-slash'
  | 'circle-info'
  | 'circle-exclamation'
  | 'triangle-exclamation'
  | 'circle-check'
  | 'circle-xmark'
  | 'ban'
  | 'lock'
  | 'unlock'
  | 'thumbtack'
  | 'thumb-tack'
  | 'map-pin'

export type DrawnArea = {
  m2: number
  km2: number
  ha: number
}

export type IncrementedLayer = Layer & { drawnArea: DrawnArea }

/** Cores do botão de ação (painel de edição). */
export type LayerActionStyle = {
  /** Equivale a CSS `background-color` */
  backgroundColor: string
  /** Equivale a CSS `color` */
  color: string
  /** Equivale a CSS `border-color`. Se omitido, usa o mesmo valor de `color` */
  borderColor?: string
}

export type LayerActionDefaultItem = {
  key?: string
  name: string
  icon?: FaIconName
  style?: LayerActionStyle
  disabled?: boolean
  visible?: boolean
}

export type LayerActionDefaults = {
  edit?: LayerActionDefaultItem
  import?: LayerActionDefaultItem
  delete?: LayerActionDefaultItem
  /** Botão Cancelar do rodapé do painel de edição da section */
  cancel?: LayerActionDefaultItem
  /** Botão Concluir do rodapé do painel de edição da section */
  conclude?: LayerActionDefaultItem
}

export type LayerActionConfig = {
  key: string
  name: string
  icon?: FaIconName
  /** Semântica sugerida — o pacote não executa regra de negócio */
  type?: 'edit' | 'import' | 'delete' | 'visibility' | 'custom' | 'cancel' | 'conclude'
  disabled?: boolean
  visible?: boolean
  /** Cores do botão no painel de edição (`background-color`, `color` e `border-color`) */
  style?: LayerActionStyle
}

/** Item de métrica exibido no painel de edição da layer. */
export type LayerMetricsConfig = {
  title: string
  /** Sufixo/unidade exibido após a label do value (ex.: "ha"). */
  type: string
  /** Valor principal, exibido como label (pill) reduzida. */
  value: string | number
  /** Cores da label (`background-color` e `border-color`). O texto de `value` permanece preto. */
  style?: LayerActionStyle
}

/** @deprecated Use LayerMetricsConfig */
export type LayerMetrics = LayerMetricsConfig

/** Métricas por `layer.key`, expostas via MapRef. */
export type LayerMetricsMap = Record<string, LayerMetricsConfig[]>

/**
 * Ícone informativo ao lado do nome da layer no ChildMenu.
 * Nome alinhado a `LayerMetricsConfig` / `LayerActionConfig` (em vez de só `InfoIcon`).
 */
export type LayerInfoIconConfig = {
  /** Identificador para consulta/alteração via MapRef. Se omitido, usa o índice na lista. */
  key?: string
  /** Nome do ícone Font Awesome registrado no pacote. */
  icon: FaIconName
  /** Se true, o ícone é exibido. */
  active: boolean
  /** Texto exibido ao passar o mouse sobre o ícone. */
  tooltip?: string
  /**
   * Cores do ícone.
   * `color` pinta a forma; `backgroundColor` preenche o recorte interno (ex.: a exclamação).
   */
  style?: Partial<Pick<LayerActionStyle, 'color' | 'backgroundColor'>>
}

/** Info icons por `layer.key`, expostos via MapRef. */
export type LayerInfoIconsMap = Record<string, LayerInfoIconConfig[]>

/**
 * Botão de ação do group (área colapsada), no mesmo formato das actions de edição
 * com `active` controlando a exibição.
 */
export type GroupActionConfig = LayerActionConfig & {
  /** Se true, o botão é exibido. */
  active: boolean
}

/** Actions do group por `group.key`, expostas via MapRef. */
export type GroupActionsMap = Record<string, GroupActionConfig[]>

/*
export type SectionEditPanelConfig = {
  title?: string
  /** keys das actions exibidas no painel; se omitido, usa editActions da layer
  actionKeys?: string[]
}
 */

export type SectionConfig = {
  name?: string
  key: string
  groups: GroupLayerData[]
  /** Labels padrão das actions da section (sobrescritíveis por layer) */
  actionDefaults?: LayerActionDefaults
}

/** @deprecated Use SectionConfig */
export type SectionData = SectionConfig

export type LayerData = {
  key: string
  name: string
  active: boolean
  activeDefault: boolean
  /**
   * Texto exibido ao passar o mouse sobre o nome da camada no ChildMenu.
   * Use para explicar o significado da feição (ex.: limite do imóvel).
   */
  tooltip?: string
  toggle?: {
    active: string
    inactive: string
  }
  /** Textos do tooltip/aria do ícone de olho (`visibilityMode: 'eye'`). */
  visibility?: {
    labelShow?: string
    labelHide?: string
    /** Se false, oculta o controle de visibilidade (olho/switch). */
    show?: boolean
  }
  style?: {
    color: string
    fillColor: string
    /** Ícone Font Awesome da legenda. Sem valor, exibe só o indicador de cor. */
    icon?: string
  }
  baseUrl?: string
  layers?: string
  format?: string
  transparent?: boolean
  geojson?: GeoJsonObject | GeoJsonObject[]
  cqlFilter?: string
  options?: Record<string, unknown>

  /** Se false/`none`/`consumer`, toggle não tenta WMS/GeoJSON no LayerMenu */
  mapSource?: 'wms' | 'geojson' | 'none' | 'consumer'
  actions?: LayerActionConfig[]
  /** Lista de métricas exibidas no painel de edição da section. */
  metrics?: LayerMetricsConfig[]
  /** Ícones informativos ao lado do nome no ChildMenu. */
  infoIcons?: LayerInfoIconConfig[]
  /** Se true, exibe asterisco vermelho (*) ao lado do nome (camada obrigatória). */
  required?: boolean
  editActions?: LayerActionConfig[]
  /** ids de negócio sem o pacote interpretar */
  meta?: Record<string, unknown>
}

export type GroupLayerData = {
  name: string
  key: string
  toggle?: {
    active: string
    inactive: string
  }
  /** Visibilidade agregada do grupo (olho) */
  visibility?: {
    show?: boolean
    labelShow?: string
    labelHide?: string
  }
  collapsed?: boolean
  /**
   * Botões de ação exibidos ao final da área colapsada do group
   * (após os ChildMenus). Filtrados por `active === true`.
   */
  actions?: GroupActionConfig[]
  layers: LayerData[]
  /** Metadados de negócio sem o pacote interpretar (ex.: isCurrentStep). */
  meta?: Record<string, unknown>
}

/** Aceita legado (groups) ou novo (sections) */
export type LayersConfig = GroupLayerData[] | SectionConfig[]

export type LayerActionPayload = {
  actionKey: string
  actionType?: LayerActionConfig['type']
  sectionKey?: string
  groupKey?: string
  /** Ausente quando `source` é `group-menu`. */
  layerKey?: string
  /** Ausente quando `source` é `group-menu`. */
  layer?: LayerData
  source: 'child-menu' | 'edit-panel' | 'group-menu'
}

export type SectionEditStatePayload = {
  sectionKey: string | null
  layerKey: string | null
  layer: LayerData | null
}

/** Section ativa no menu de camadas (seletor no topo do SectionMenu). */
export type SectionSelectPayload = {
  sectionKey: string
}

export type DrawingEvent = {
  type: 'created' | 'edited' | 'deleted'
  layer: IncrementedLayer
}

export type BaseMapLayer = {
  name: string
  key: string
  default: boolean
  url: string
  tms?: boolean
  minZoom?: number
  maxZoom?: number
  maxNativeZoom?: number
  errorTileUrl?: string
  minZoomWarning?: number | null
}

export type BaseMapLayers = BaseMapLayer[]

export type MapLayers = {
  mapLayers: BaseMapLayers
  customLayers?: LayersConfig
}

export type MapConfigConfig = MapOptions & {
  id: string
  removeControlLayers?: boolean
  zoomControlPosition?: ControlPosition
  /** Reposiciona marcadores após zoom (evita drift de divIcon). Padrão: true. */
  stabilizeMarkersOnZoom?: boolean
}

export type MapConfig = {
  config?: MapConfigConfig
}

export type LayersMenuConfig = {
  size: 'small' | 'medium' | 'large'
  removeMenu?: boolean
  persist: boolean
  /** Modo controlado de edição (painel na section). */
  editingLayerKey?: string | null
  /**
   * Section exibida no menu. Se a prop for passada (`!== undefined`), o consumidor controla;
   * caso contrário o LayerMenu mantém estado interno.
   */
  selectedSectionKey?: string | null
  /** Visual do toggle de visibilidade: switch legado ou ícone de olho. */
  visibilityMode?: 'switch' | 'eye'
  /** Se true, o menu lateral inicia aberto. */
  defaultOpen?: boolean
}

export type MemorialConfig = {
  show: boolean
  config?: any
  controlTexts?: any
}

export type MapToolsConfig = {
  show?: boolean
  position?: ControlPosition
  zoom?: { show?: boolean; titleIn?: string; titleOut?: string }
  fullscreen?: { show?: boolean; title?: string }
  center?: {
    show?: boolean
    title?: string
    target?: 'drawn' | 'initial'
    padding?: [number, number]
  }
  measureArea?: {
    show?: boolean
    title?: string
    shapeOptions?: PathOptions
  }
  measureLine?: {
    show?: boolean
    title?: string
  }
  measurePolygon?: {
    show?: boolean
    title?: string
  }
  /**
   * Exibe o painel flutuante (ajuda + Cancelar/Finalizar) ao medir.
   * Quando `false`, a instrução fica só no tooltip (`title`) do botão.
   * Default: `true`.
   */
  showInteractionPanel?: boolean
  texts?: {
    measureResult?: string
    measureLength?: string
    measureArea?: string
    measureCancel?: string
    measureFinish?: string
    measurePanelTitle?: string
    measureLineTitle?: string
    measurePolygonTitle?: string
    measureLineHelp?: string
    measurePolygonHelp?: string
    noGeometry?: string
  }
}

export type MeasureCompleteEvent = {
  m2?: number
  km2?: number
  ha?: number
  lengthM?: number
  lengthKm?: number
  geojson: GeoJsonObject
}

export type MapOptionsConfig = {
  layersMenu?: LayersMenuConfig
  map: MapConfig
  drawing?: DrawingConfig
  tools?: MapToolsConfig
}

export type DrawingConfig = DrawingControlOptions & DisplayDrawingControl

export type TranslationConfig = {
  lang?: PM.SupportLocales
  customTexts?: PM.Translations
}

export type GeomanDrawingEvent = {
  shape: PM.SUPPORTED_SHAPES
  layer: Layer
  [key: string]: any
}

export type ToolbarOptions = {
  [K in PM.ToolbarOptions]: ControlOptions | PM.BlockPositions | boolean | PathOptions | undefined
}

export type PMToolbarOptions = PM.ToolbarOptions

export type DrawingControlOptions = {
  options: ToolbarOptions
  translation: TranslationConfig
}

type DisplayDrawingControl = {
  show: boolean
}

export type PMSupportedShapes = PM.SUPPORTED_SHAPES

export type CoordinatePanelTexts = {
  title?: string
  addPoint?: string
  editPoint?: string
  removePoint?: string
  actions?: string
  clearGeometries?: string
  index?: string
  x?: string
  y?: string
  azimuth?: string
  distance?: string
  noPoints?: string
  addPointTitle?: string
  editPointTitle?: string
  removePointTitle?: string
  clearGeometriesTitle?: string
  addPointDescription?: string
  editPointDescription?: string
  removePointDescription?: string
  clearGeometriesDescription?: string
  memorialDescriptive?: string
  referenceSystem?: string
  selectSystem?: string
  sirgas2000?: string
  coordinateFormat?: string
  selectFormat?: string
  decimalDegrees?: string
  degreesMinutesSeconds?: string
  manualInput?: string
  insertCoordinates?: string
  xLongitude?: string
  yLatitude?: string
  degrees?: string
  minutes?: string
  seconds?: string
  addedPoints?: string
  finalizeGeometry?: string
  csvUpload?: string
  csvFileUpload?: string
  dragCsvFile?: string
  csvColumnsInfo?: string
  applyCsvCoordinates?: string
  shapefileUpload?: string
  shapefileFileUpload?: string
  dragShapefileZip?: string
  shapefileZipInfo?: string
  shapefileAppliedSuccess?: string
  geometryImportUnsupportedFormat?: string
  placeholderLongitude?: string
  placeholderLatitude?: string
  placeholderAzimuth?: string
  placeholderDistance?: string
  placeholderDegrees?: string
  placeholderMinutes?: string
  placeholderSeconds?: string
  errorXYRequired?: string
  errorDegreesRequired?: string
  errorFirstRowXY?: string
  errorProvideCoordinatesOrAzimuthDistance?: string
}

export type DescriptiveMemorial = {
  show: boolean
  customTexts?: CoordinatePanelTexts
}
