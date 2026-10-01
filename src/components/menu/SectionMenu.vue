<template>
  <div
    class="section-menu"
    :class="{ 'section-menu--editing': isEditing }"
  >
    <div
      v-if="sections.length"
      class="section-menu-selector"
      role="tablist"
      aria-label="Seções do menu de camadas"
    >
      <button
        v-for="item in sections"
        :key="item.key"
        type="button"
        role="tab"
        class="section-menu-selector-item"
        :class="{ 'section-menu-selector-item--active': item.key === activeSectionKey }"
        :aria-selected="item.key === activeSectionKey"
        @click.stop="onSelectSection(item.key)"
      >
        {{ item.name || item.key }}
      </button>
    </div>

    <template v-if="section">
      <template v-if="isEditing && editingLayer && editingGroup">
        <div class="section-edit-panel">
          <ChildMenu
            :actionDefaults="section.actionDefaults"
            :data="editingLayer"
            :groupKey="editingGroup.key"
            :hideControls="true"
            :persist="persist"
            :sectionKey="section.key"
            :visibilityMode="visibilityMode"
            @onChildLayerToggle="emit('onChildLayerToggle', $event)"
            @onLayerAction="emit('onLayerAction', $event)"
          />

          <div
            v-if="editPanelActions.length"
            class="section-edit-panel-actions"
          >
            <button
              v-for="action in editPanelActions"
              :key="action.key"
              type="button"
              class="section-edit-action-button"
              :style="actionButtonStyle(action)"
              :disabled="action.disabled"
              @click.stop="onEditPanelAction(action)"
            >
              <FontAwesomeIcon
                v-if="action.icon"
                :iconName="action.icon"
              />
              <span>{{ action.name }}</span>
            </button>
          </div>

          <div
            v-if="editingMetrics.length"
            class="section-edit-metrics"
          >
            <div
              v-for="(metric, index) in editingMetrics"
              :key="`${metric.title}-${metric.type}-${index}`"
              class="section-metric-row"
            >
              <span class="section-metric-title">{{ metric.title }} :</span>
              <span
                class="section-metric-value-label"
                :style="metricValueLabelStyle(metric)"
              >
                {{ metric.value }}
              </span>
              <span class="section-metric-type">{{ metric.type }}</span>
            </div>
          </div>

          <div class="section-edit-footer">
            <button
              v-if="cancelAction.visible !== false"
              type="button"
              class="section-edit-footer-button"
              :style="actionButtonStyle(cancelAction)"
              :disabled="cancelAction.disabled"
              @click.stop="onEditControlAction(cancelAction)"
            >
              <FontAwesomeIcon
                v-if="cancelAction.icon"
                :iconName="cancelAction.icon"
              />
              <span>{{ cancelAction.name }}</span>
            </button>

            <button
              v-if="concludeAction.visible !== false"
              type="button"
              class="section-edit-footer-button section-edit-footer-button--end"
              :style="actionButtonStyle(concludeAction)"
              :disabled="concludeAction.disabled"
              @click.stop="onEditControlAction(concludeAction)"
            >
              <FontAwesomeIcon
                v-if="concludeAction.icon"
                :iconName="concludeAction.icon"
              />
              <span>{{ concludeAction.name }}</span>
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <ParentMenu
          v-for="group in section.groups"
          :key="group.key"
          :actionDefaults="section.actionDefaults"
          :groupData="group"
          :persist="persist"
          :sectionKey="section.key"
          :visibilityMode="visibilityMode"
          @onChildLayerToggle="emit('onChildLayerToggle', $event)"
          @onGroupLayerToggle="emit('onGroupLayerToggle', $event)"
          @onLayerAction="emit('onLayerAction', $event)"
        />
      </template>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import FontAwesomeIcon from '../fa-icon/FontAwesomeIcon.vue'
  import ParentMenu from './ParentMenu.vue'
  import ChildMenu from './ChildMenu.vue'
  import {
    GroupLayerData,
    LayerActionConfig,
    LayerActionPayload,
    LayerActionStyle,
    LayerData,
    LayerMetricsConfig,
    SectionConfig
  } from '../../types'
  import {
    resolveEditControlAction,
    resolveLayerActions,
    resolveLayerMetrics
  } from '../../utils/layersConfigNormalizer'

  const DEFAULT_ACTION_STYLE: Required<LayerActionStyle> = {
    backgroundColor: 'var(--mapa-base-green)',
    color: 'var(--mapa-base-white)',
    borderColor: 'var(--mapa-base-white)'
  }

  const resolveActionStyle = (style?: LayerActionStyle): Required<LayerActionStyle> => {
    const color = style?.color ?? DEFAULT_ACTION_STYLE.color
    return {
      backgroundColor: style?.backgroundColor ?? DEFAULT_ACTION_STYLE.backgroundColor,
      color,
      borderColor: style?.borderColor ?? color
    }
  }

  const actionButtonStyle = (action: LayerActionConfig): Required<LayerActionStyle> =>
    resolveActionStyle(action.style)

  const firstColor = (...values: Array<string | null | undefined>): string | undefined =>
    values.find((value) => typeof value === 'string' && value.trim() !== '')

  /** Estilo só da pill; o texto de `value` fica sempre preto. */
  const metricValueLabelStyle = (
    metric: LayerMetricsConfig
  ): Pick<Required<LayerActionStyle>, 'backgroundColor' | 'borderColor'> => {
    const style = metric.style
    return {
      backgroundColor: firstColor(style?.backgroundColor) ?? '#ffffff',
      borderColor: firstColor(style?.borderColor, style?.color) ?? 'transparent'
    }
  }

  type SectionMenuProps = {
    sections: SectionConfig[]
    /** Section ativa (controlada pelo LayerMenu / LayersMenuConfig). */
    selectedSectionKey?: string | null
    persist: boolean
    editingLayerKey?: string | null
    visibilityMode?: 'switch' | 'eye'
  }

  const props = withDefaults(defineProps<SectionMenuProps>(), {
    visibilityMode: 'switch',
    editingLayerKey: null,
    selectedSectionKey: null
  })

  const emit = defineEmits<{
    onChildLayerToggle: [LayerData]
    onGroupLayerToggle: [GroupLayerData]
    onLayerAction: [LayerActionPayload]
    onSelectedSectionChange: [string]
  }>()

  const activeSectionKey = computed((): string | null => {
    const sections = props.sections
    if (!sections.length) return null

    const selected = props.selectedSectionKey
    if (selected && sections.some((item) => item.key === selected)) {
      return selected
    }

    return sections[0].key
  })

  const section = computed((): SectionConfig | null => {
    const key = activeSectionKey.value
    if (!key) return null
    return props.sections.find((item) => item.key === key) ?? null
  })

  const findLayerContext = (
    layerKey: string | null | undefined
  ): { layer: LayerData; group: GroupLayerData } | null => {
    if (!layerKey || !section.value) return null
    for (const group of section.value.groups) {
      const layer = group.layers?.find((item) => item.key === layerKey)
      if (layer) return { layer, group }
    }
    return null
  }

  const editingContext = computed(() => findLayerContext(props.editingLayerKey))
  const editingLayer = computed(() => editingContext.value?.layer ?? null)
  const editingGroup = computed(() => editingContext.value?.group ?? null)
  const isEditing = computed(() => !!editingLayer.value)

  const editingMetrics = computed((): LayerMetricsConfig[] =>
    resolveLayerMetrics(editingLayer.value)
  )

  const editPanelActions = computed((): LayerActionConfig[] => {
    const layer = editingLayer.value
    const currentSection = section.value
    if (!layer || !currentSection) return []

    const sourceActions =
      Array.isArray(layer.editActions) && layer.editActions.length > 0
        ? layer.editActions
        : resolveLayerActions(layer, currentSection.actionDefaults)

    return sourceActions.filter((action) => action.visible !== false)
  })

  const cancelAction = computed(() =>
    resolveEditControlAction(section.value?.actionDefaults, 'cancel')
  )

  const concludeAction = computed(() =>
    resolveEditControlAction(section.value?.actionDefaults, 'conclude')
  )

  const onSelectSection = (sectionKey: string): void => {
    if (sectionKey === activeSectionKey.value) return
    emit('onSelectedSectionChange', sectionKey)
  }

  const emitEditPanelAction = (action: LayerActionConfig): void => {
    const layer = editingLayer.value
    const currentSection = section.value
    if (!layer || !currentSection || action.disabled) return

    emit('onLayerAction', {
      actionKey: action.key,
      actionType: action.type,
      sectionKey: currentSection.key,
      groupKey: editingGroup.value?.key,
      layerKey: layer.key,
      layer,
      source: 'edit-panel'
    })
  }

  const onEditPanelAction = (action: LayerActionConfig): void => {
    emitEditPanelAction(action)
  }

  const onEditControlAction = (action: LayerActionConfig): void => {
    emitEditPanelAction(action)
  }
</script>

<style>
  .section-menu {
    display: flex;
    flex-direction: column;
    gap: var(--mapa-size-base-5);
  }

  .section-menu--editing {
    flex: 1 1 auto;
    min-height: 100%;
  }

  .section-menu-selector {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: var(--mapa-size-base-5);
    width: 100%;
    box-sizing: border-box;
    padding: var(--mapa-size-base-5) var(--mapa-size-base-10);
    border-bottom: var(--mapa-size-base-1) solid rgba(0, 0, 0, 0.08);
  }

  .section-menu-selector-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 0;
    min-width: 0;
    min-height: var(--mapa-size-base-30);
    height: auto;
    padding: var(--mapa-size-base-5) var(--mapa-size-base-10);
    border: none;
    border-bottom: var(--mapa-size-base-2) solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--mapa-base-gray);
    font-size: var(--mapa-fs-12);
    font-weight: 600;
    text-align: center;
    white-space: normal;
    overflow-wrap: break-word;
    word-break: normal;
    line-height: 1.3;
    cursor: pointer;
  }

  .section-menu-selector-item:hover {
    color: var(--mapa-base-green);
  }

  .section-menu-selector-item--active {
    color: var(--mapa-base-green);
    border-bottom-color: var(--mapa-base-green);
  }

  .section-edit-panel {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
  }

  /* Oculta seta/collapse do submenu — ChildMenu fica solto na section */
  .section-edit-panel .child-menu {
    padding-left: var(--mapa-size-base-20) !important;
    padding-right: var(--mapa-size-base-20) !important;
  }

  .section-edit-metrics {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--mapa-size-base-5);
    width: 100%;
    box-sizing: border-box;
    /* Espaço extra entre botões de edição e métricas */
    margin-top: var(--mapa-size-base-15);
    padding: var(--mapa-size-base-10) var(--mapa-size-base-20);
  }

  .section-metric-row {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-start;
    gap: var(--mapa-size-base-5);
    width: 100%;
    height: var(--mapa-size-base-40);
    padding: 0 var(--mapa-size-base-10);
    box-sizing: border-box;
    font-size: var(--mapa-fs-12);
    color: #000000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: bold;
  }

  .section-metric-title {
    flex-shrink: 0;
    color: #000000;
  }

  .section-metric-value-label {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    height: var(--mapa-size-base-20);
    padding: 0 var(--mapa-size-base-8);
    border: 1px solid;
    border-radius: 100em;
    font-size: var(--mapa-fs-12);
    font-weight: 600;
    line-height: 1;
    color: #000000;
  }

  .section-metric-type {
    flex-shrink: 0;
    color: #000000;
  }

  .section-edit-panel-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--mapa-size-base-5);
  width: 100%;
  box-sizing: border-box;
  padding: var(--mapa-size-base-10) var(--mapa-size-base-20);
}
  .section-edit-action-button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: var(--mapa-size-base-5);
    width: 100%;
    height: var(--mapa-size-base-40);
    padding: 0 var(--mapa-size-base-10);
    border: 1px solid;
    border-radius: 100em;
    font-size: var(--mapa-fs-15);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;
    text-align: center;
    vertical-align: middle;
    cursor: pointer;
    margin-top: var(--mapa-size-base-20);
  }

  .section-edit-action-button:not(:disabled):hover {
    background-image: linear-gradient(rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.16));
  }

  .section-edit-action-button:not(:disabled):active {
    background-image: linear-gradient(rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.32));
  }

  .section-edit-action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .section-edit-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--mapa-size-base-5);
    width: 100%;
    box-sizing: border-box;
    margin-top: auto;
    padding: var(--mapa-size-base-10) var(--mapa-size-base-20);
  }

  .section-edit-footer-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--mapa-size-base-5);
    height: var(--mapa-size-base-40);
    padding: 0 var(--mapa-size-base-20);
    border: 1px solid;
    border-radius: 100em;
    font-size: var(--mapa-fs-15);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;
    text-align: center;
    vertical-align: middle;
    cursor: pointer;
  }

  .section-edit-footer-button--end {
    margin-left: auto;
  }

  .section-edit-footer-button:not(:disabled):hover {
    background-image: linear-gradient(rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.16));
  }

  .section-edit-footer-button:not(:disabled):active {
    background-image: linear-gradient(rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.32));
  }

  .section-edit-footer-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
