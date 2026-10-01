import { LayerData } from '../types'

const MENU_HISTORY_KEY = 'menuHistory'
const MENU_COLLAPSE_KEY = 'menuCollapseHistory'

const readJsonObject = (storageKey: string): Record<string, boolean> => {
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }

    return parsed as Record<string, boolean>
  } catch {
    return {}
  }
}

const writeJsonObject = (storageKey: string, value: Record<string, boolean>): void => {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // sessionStorage indisponível — ignora persistência
  }
}

/**
 * Persiste apenas visibilidade da camada (toggle).
 * Não persiste estado de edição/ações.
 */
export const setHistory = (layer: LayerData): void => {
  const history = readJsonObject(MENU_HISTORY_KEY)
  writeJsonObject(MENU_HISTORY_KEY, { ...history, [layer.key]: layer.active })
}

/** Retorna o estado salvo da camada ou `undefined` se não houver histórico. */
export const getHistory = (layerKey: string): boolean | undefined => {
  const history = readJsonObject(MENU_HISTORY_KEY)
  const isActive = history[layerKey]
  return isActive !== undefined ? isActive : undefined
}

/**
 * Persiste apenas aberto/fechado do grupo (collapse).
 * Não persiste modo de edição.
 */
export const setGroupCollapsedHistory = (groupKey: string, collapsed: boolean): void => {
  const history = readJsonObject(MENU_COLLAPSE_KEY)
  writeJsonObject(MENU_COLLAPSE_KEY, { ...history, [groupKey]: collapsed })
}

export const getGroupCollapsedHistory = (groupKey: string): boolean | undefined => {
  const history = readJsonObject(MENU_COLLAPSE_KEY)
  const collapsed = history[groupKey]
  return collapsed !== undefined ? collapsed : undefined
}

/** Resolve `active`/`activeDefault` sem mutar o objeto original (mesma regra do fluxo legado). */
export const resolveLayerActiveState = (layer: LayerData, persist: boolean): LayerData => {
  const savedActive = persist ? getHistory(layer.key) : undefined

  let active = layer.active ?? false
  let activeDefault = layer.activeDefault

  if (savedActive !== undefined) {
    active = savedActive
    activeDefault = savedActive
  }

  if (activeDefault) {
    active = activeDefault
  }

  return { ...layer, active, activeDefault }
}

/** Resolve `collapsed` do grupo com histórico (aberto/fechado), sem estado de ação. */
export const resolveGroupCollapsedState = (
  groupKey: string,
  collapsedFromConfig: boolean | undefined,
  persist: boolean
): boolean => {
  if (persist) {
    const saved = getGroupCollapsedHistory(groupKey)
    if (saved !== undefined) return saved
  }
  return collapsedFromConfig ?? false
}

/** Indica se a camada deve ser aplicada ao mapa na inicialização. */
export const shouldInitLayerOnMap = (layer: LayerData, persist: boolean): boolean => {
  const resolved = resolveLayerActiveState(layer, persist)

  if (resolved.activeDefault) return true

  return persist && getHistory(layer.key) !== undefined
}
