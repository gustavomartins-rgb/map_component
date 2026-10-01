import {
  GroupActionConfig,
  GroupActionsMap,
  GroupLayerData,
  LayerActionConfig,
  LayerActionDefaults,
  LayerData,
  LayerInfoIconConfig,
  LayerInfoIconsMap,
  LayerMetricsConfig,
  LayerMetricsMap,
  LayersConfig,
  SectionConfig
} from '../types'

type GroupLike = GroupLayerData & {
  /** Alias de produto; normalizado para `layers` */
  customLayers?: LayerData[]
}

export const isSectionConfig = (item: unknown): item is SectionConfig => {
  return (
    typeof item === 'object' &&
    item !== null &&
    Array.isArray((item as SectionConfig).groups)
  )
}

export const isGroupConfig = (item: unknown): item is GroupLayerData => {
  if (typeof item !== 'object' || item === null) return false
  if (Array.isArray((item as SectionConfig).groups)) return false

  const group = item as GroupLike
  return Array.isArray(group.layers) || Array.isArray(group.customLayers)
}

const normalizeGroup = (group: GroupLike): GroupLayerData => {
  const layers = group.layers ?? group.customLayers ?? []
  const { customLayers: _alias, ...rest } = group
  return {
    ...rest,
    layers
  }
}

/**
 * Converte `LayersConfig` legado (apenas groups) ou misto no formato canônico de sections.
 * - Todos groups → uma section implícita `default`
 * - Todos sections → retorna as sections
 */
export const normalizeLayersConfig = (config?: LayersConfig | null): SectionConfig[] => {
  if (!config?.length) return []

  const allSections = config.every(isSectionConfig)
  const allGroups = config.every(isGroupConfig)

  if (allSections) {
    return (config as SectionConfig[]).map((section) => ({
      ...section,
      groups: section.groups.map((group) => normalizeGroup(group as GroupLike))
    }))
  }

  if (allGroups) {
    return [
      {
        key: 'default',
        groups: (config as GroupLike[]).map(normalizeGroup)
      }
    ]
  }

  console.warn(
    '[map_component] LayersConfig misto (sections e groups). Usando apenas itens reconhecidos como section ou group.'
  )

  const sections: SectionConfig[] = []
  const orphanGroups: GroupLayerData[] = []
  const mixedItems = config as Array<SectionConfig | GroupLayerData>

  for (const item of mixedItems) {
    if (isSectionConfig(item)) {
      sections.push({
        ...item,
        groups: item.groups.map((group) => normalizeGroup(group as GroupLike))
      })
    } else if (isGroupConfig(item)) {
      orphanGroups.push(normalizeGroup(item as GroupLike))
    }
  }

  if (orphanGroups.length) {
    sections.push({ key: 'default', groups: orphanGroups })
  }

  return sections
}

/** Monta actions a partir de defaults da section quando a layer não define `actions`. */
export const resolveLayerActions = (
  layer: LayerData,
  defaults?: LayerActionDefaults
): LayerActionConfig[] => {
  // Lista enviada com itens vale; array vazio também bloqueia os padrões da section
  // (ex.: layers fora da subetapa ativa). Só cai nos defaults se `actions` for omitido.
  if (Array.isArray(layer.actions)) {
    if (layer.actions.length === 0) return []
    return layer.actions.filter((action) => action.visible !== false)
  }

  if (!defaults) return []

  const actions: LayerActionConfig[] = []

  if (defaults.edit) {
    actions.push({
      key: defaults.edit.key ?? 'edit',
      name: defaults.edit.name,
      icon: defaults.edit.icon ?? 'pencil',
      type: 'edit',
      style: defaults.edit.style,
      disabled: defaults.edit.disabled
    })
  }

  if (defaults.import) {
    actions.push({
      key: defaults.import.key ?? 'import',
      name: defaults.import.name,
      icon: defaults.import.icon ?? 'upload',
      type: 'import',
      style: defaults.import.style,
      disabled: defaults.import.disabled
    })
  }

  if (defaults.delete) {
    actions.push({
      key: defaults.delete.key ?? 'delete',
      name: defaults.delete.name,
      icon: defaults.delete.icon ?? 'trash',
      type: 'delete',
      style: defaults.delete.style,
      disabled: defaults.delete.disabled
    })
  }

  return actions.filter((action) => action.visible !== false)
}

/** Monta action de Cancelar/Concluir a partir de `actionDefaults` da section. */
export const resolveEditControlAction = (
  defaults: LayerActionDefaults | undefined,
  kind: 'cancel' | 'conclude'
): LayerActionConfig => {
  const configured = defaults?.[kind]
  const fallbackName = kind === 'cancel' ? 'Cancelar' : 'Concluir'

  return {
    key: configured?.key ?? kind,
    name: configured?.name ?? fallbackName,
    icon: configured?.icon,
    type: kind,
    style: configured?.style,
    disabled: configured?.disabled,
    visible: configured?.visible
  }
}

/** Indica se o LayerMenu deve aplicar/remover overlay WMS/GeoJSON. */
export const shouldApplyMapOverlay = (layer: LayerData): boolean => {
  if (layer.mapSource === 'none' || layer.mapSource === 'consumer') return false
  if (layer.mapSource === 'wms' || layer.mapSource === 'geojson') return true
  if (layer.geojson) return true
  if (layer.baseUrl) return true
  return false
}

/** Coleta metrics de todas as layers, indexados por `layer.key`. */
export const collectLayerMetricsMap = (config?: LayersConfig | null): LayerMetricsMap => {
  const result: LayerMetricsMap = {}

  normalizeLayersConfig(config).forEach((section) => {
    section.groups.forEach((group) => {
      group.layers?.forEach((layer: LayerData) => {
        if (layer.metrics?.length) {
          result[layer.key] = layer.metrics
        }
      })
    })
  })

  return result
}

/** Retorna a lista de metrics de uma layer (ou array vazio). */
export const resolveLayerMetrics = (layer: LayerData | null | undefined): LayerMetricsConfig[] => {
  return layer?.metrics?.length ? layer.metrics : []
}

/** Coleta infoIcons de todas as layers, indexados por `layer.key`. */
export const collectLayerInfoIconsMap = (config?: LayersConfig | null): LayerInfoIconsMap => {
  const result: LayerInfoIconsMap = {}

  normalizeLayersConfig(config).forEach((section) => {
    section.groups.forEach((group) => {
      group.layers?.forEach((layer: LayerData) => {
        if (layer.infoIcons?.length) {
          result[layer.key] = layer.infoIcons
        }
      })
    })
  })

  return result
}

/** Info icons ativos (exibíveis) de uma layer. */
export const resolveActiveLayerInfoIcons = (
  layer: LayerData | null | undefined
): LayerInfoIconConfig[] => {
  return (layer?.infoIcons ?? []).filter((item) => item.active)
}

/** Coleta actions dos groups, indexados por `group.key`. */
export const collectGroupActionsMap = (config?: LayersConfig | null): GroupActionsMap => {
  const result: GroupActionsMap = {}

  normalizeLayersConfig(config).forEach((section) => {
    section.groups.forEach((group) => {
      if (group.actions?.length) {
        result[group.key] = group.actions
      }
    })
  })

  return result
}

/** Actions do group com `active === true` (e `visible !== false`). */
export const resolveActiveGroupActions = (
  group: GroupLayerData | null | undefined
): GroupActionConfig[] => {
  return (group?.actions ?? []).filter(
    (action) => action.active && action.visible !== false
  )
}

/**
 * Atualiza `active` de um infoIcon identificado por `key` ou, se omitido, por índice numérico em string.
 * Retorna nova lista ou `null` se a layer/ícone não existir.
 */
export const withLayerInfoIconActive = (
  infoIcons: LayerInfoIconConfig[] | undefined,
  iconRef: string,
  active: boolean
): LayerInfoIconConfig[] | null => {
  if (!infoIcons?.length) return null

  let targetIndex = infoIcons.findIndex((item) => item.key === iconRef)
  if (targetIndex < 0) {
    const parsed = Number.parseInt(iconRef, 10)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed >= infoIcons.length) {
      return null
    }
    targetIndex = parsed
  }

  return infoIcons.map((item, idx) =>
    idx === targetIndex ? { ...item, active } : item
  )
}

/**
 * Atualiza `active` de uma action do group por `action.key`.
 * Retorna nova lista ou `null` se a action não existir.
 */
export const withGroupActionActive = (
  actions: GroupActionConfig[] | undefined,
  actionKey: string,
  active: boolean
): GroupActionConfig[] | null => {
  if (!actions?.length) return null

  const exists = actions.some((action) => action.key === actionKey)
  if (!exists) return null

  return actions.map((action) =>
    action.key === actionKey ? { ...action, active } : action
  )
}
