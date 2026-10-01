<template>
  <ElMenuItem
    :index="data.key"
    class="child-menu"
  >
    <div class="child-menu-content">
      <div class="child-menu-row">
        <div class="child-layer-title">
          <span
            v-if="legendIconName"
            class="child-layer-legend child-layer-legend--icon"
            :style="{ color: legendColor }"
          ><FontAwesomeIcon :iconName="legendIconName" /></span>
          <span
            v-else-if="data.style"
            :style="{
              borderColor: data.style.fillColor,
              backgroundColor: data.style.color
            }"
            class="child-layer-legend"
          />

          <ElTooltip
            :content="data.tooltip"
            :disabled="!data.tooltip"
            placement="top"
            popper-class="child-layer-name-tooltip"
          >
            <span
              class="child-layer-name"
              :aria-label="data.tooltip || data.name"
            >{{ data.name }}</span>
          </ElTooltip>

          <span
            v-if="data.required"
            class="child-layer-required"
            aria-hidden="true"
          >*</span>

          <span
            v-if="activeInfoIcons.length"
            class="child-info-icons"
          >
            <ElTooltip
              v-for="(infoIcon, index) in activeInfoIcons"
              :key="infoIcon.key ?? `${infoIcon.icon}-${index}`"
              :content="infoIcon.tooltip"
              :disabled="!infoIcon.tooltip"
              placement="top"
            >
              <span
                class="child-info-icon"
                :style="infoIconStyle(infoIcon)"
                :aria-label="infoIcon.tooltip"
                :aria-hidden="infoIcon.tooltip ? undefined : true"
              >
                <span
                  v-if="infoIcon.style?.backgroundColor"
                  class="child-info-icon-inner"
                  :style="{ backgroundColor: infoIcon.style.backgroundColor }"
                  aria-hidden="true"
                />
                <FontAwesomeIcon :iconName="infoIcon.icon" />
              </span>
            </ElTooltip>
          </span>
        </div>
        <span
          v-if="showVisibilityControl"
          class="visibility-control"
        >
          <button
            v-if="visibilityMode === 'eye' && showEyeControl"
            type="button"
            class="visibility-eye-button"
            :aria-label="active ? hideLabel : showLabel"
            :title="active ? hideLabel : showLabel"
            @click.stop="active = !active"
          >
            <FontAwesomeIcon :iconName="active ? 'eye' : 'eye-slash'" />
          </button>
          <div
            v-if="!hideControls && visibleActions.length"
            class="child-menu-actions"
          >
            <button
              v-for="action in visibleActions"
              :key="action.key"
              type="button"
              class="child-action-button"
              :disabled="action.disabled"
              @click.stop="onActionClick(action)"
            >
              <FontAwesomeIcon
                v-if="action.icon"
                :iconName="action.icon"
              />
            </button>
          </div>
          <template v-else-if="!hideControls && visibilityMode !== 'eye'">
            <ElSwitch
              v-model="active"
              @click.stop
            >
              <template #active-action>
                <FontAwesomeIcon iconName="check" />
              </template>
              <template #inactive-action>
                <FontAwesomeIcon iconName="xmark" />
              </template>
            </ElSwitch>
            <span
              v-if="data.toggle"
              class="child-layer-status"
            >
              {{ active ? data.toggle.active : data.toggle.inactive }}
            </span>
          </template>
        </span>
      </div>
    </div>
  </ElMenuItem>
  <ElDivider class="child-menu-divider-row" />
</template>

<script lang="ts" setup>
  import { ElDivider, ElMenuItem, ElSwitch, ElTooltip } from 'element-plus'
  import { computed } from 'vue'
  import FontAwesomeIcon from '../fa-icon/FontAwesomeIcon.vue'
  import {
    LayerActionConfig,
    LayerActionDefaults,
    LayerActionPayload,
    LayerData,
    LayerInfoIconConfig
  } from '../../types'
  import {
    resolveActiveLayerInfoIcons,
    resolveLayerActions
  } from '../../utils/layersConfigNormalizer'
  import { setHistory } from '../../utils/menuHistory.ts'

  type ChildMenuProps = {
    data: LayerData
    persist: boolean
    sectionKey?: string
    groupKey?: string
    actionDefaults?: LayerActionDefaults
    visibilityMode?: 'switch' | 'eye'
    /**
     * Oculta botões de ação e switch (modo edição da section).
     * O ícone `eye` permanece quando `visibilityMode === 'eye'`.
     */
    hideControls?: boolean
  }

  const props = withDefaults(defineProps<ChildMenuProps>(), {
    visibilityMode: 'switch',
    hideControls: false
  })

  const emit = defineEmits<{
    onChildLayerToggle: [LayerData]
    onLayerAction: [LayerActionPayload]
  }>()

  const visibleActions = computed(() =>
    resolveLayerActions(props.data, props.actionDefaults).filter((action) => action.icon)
  )
  const activeInfoIcons = computed(() => resolveActiveLayerInfoIcons(props.data))

  const infoIconStyle = (infoIcon: LayerInfoIconConfig) => {
    if (!infoIcon.style?.color) return undefined
    return { color: infoIcon.style.color }
  }

  const legendIconName = computed(() => {
    const icon = props.data.style?.icon?.trim()
    return icon || undefined
  })

  const legendColor = computed(
    () => props.data.style?.color || props.data.style?.fillColor
  )

  /** Mostra a área de controles só quando há olho, ações ou switch. */
  const showVisibilityControl = computed(() => {
    const hasEye = props.visibilityMode === 'eye' && showEyeControl.value
    const hasActions = !props.hideControls && visibleActions.value.length > 0
    if (props.hideControls) return hasEye
    if (props.visibilityMode === 'eye') return hasEye || hasActions
    return true
  })

  /** Exibe o olho apenas quando a config não desabilita (`visibility.show !== false`). */
  const showEyeControl = computed(() => props.data.visibility?.show !== false)

  const showLabel = computed(
    () =>
      props.data.visibility?.labelShow ??
      props.data.toggle?.active ??
      'Exibir'
  )
  const hideLabel = computed(
    () =>
      props.data.visibility?.labelHide ??
      props.data.toggle?.inactive ??
      'Ocultar'
  )

  const active = computed<boolean>({
    get: () => props.data.active,
    set: (value: boolean) => {
      toggleLayerVisible(value)
    }
  })

  const toggleLayerVisible = (activeValue: boolean): void => {
    const layer = { ...props.data, active: activeValue }
    if (props.persist) setHistory(layer)
    emit('onChildLayerToggle', layer)
  }

  const onActionClick = (action: LayerActionConfig): void => {
    if (action.disabled) return

    emit('onLayerAction', {
      actionKey: action.key,
      actionType: action.type,
      sectionKey: props.sectionKey,
      groupKey: props.groupKey,
      layerKey: props.data.key,
      layer: props.data,
      source: 'child-menu'
    })
  }
</script>

<style>
  .child-menu {
    padding-left: var(--mapa-size-base-20) !important;
    height: auto !important;
    line-height: normal !important;
    white-space: normal !important;
  }

  .child-menu .child-menu-content {
    display: flex;
    flex-direction: column;
    gap: var(--mapa-size-base-5);
    width: 100%;
    padding-block: var(--mapa-size-base-5);
  }

  .child-menu .child-menu-row {
    display: flex;
    justify-content: space-between;
    gap: var(--mapa-size-base-10);
    width: 100%;
    font-size: var(--mapa-fs-12);
  }

  .child-menu .visibility-control {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--mapa-size-base-5);
    flex-shrink: 0;
  }

  .child-menu .visibility-eye-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--mapa-base-green);
    cursor: pointer;
    padding: var(--mapa-size-base-2);
  }

  .child-menu .child-layer-title {
    display: flex;
    align-items: center;
    gap: var(--mapa-size-base-5);
    word-wrap: break-word;
    white-space: normal;
    line-height: 150%;
    margin-block: auto;
  }

  .child-menu .child-layer-name {
    cursor: default;
  }

  .child-menu .child-layer-legend {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-sizing: border-box;
    width: var(--mapa-size-base-8);
    height: var(--mapa-size-base-8);
    min-width: var(--mapa-size-base-8);
    min-height: var(--mapa-size-base-8);
    border-radius: 50%;
    line-height: 0;
  }

  .child-menu .child-layer-legend--icon {
    background: transparent;
    overflow: hidden;
    font-size: var(--mapa-size-base-8);
  }

  .child-menu .child-layer-legend--icon svg {
    display: block;
    width: auto;
    height: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
    vertical-align: 0;
    overflow: hidden;
  }

  .child-menu .child-layer-required {
    color: #e52207;
    font-weight: 700;
    line-height: 1;
  }

  .child-menu .child-info-icons {
    display: inline-flex;
    align-items: center;
    gap: var(--mapa-size-base-5);
    flex-shrink: 0;
    color: var(--mapa-base-green);
  }

  .child-menu .child-info-icon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .child-menu .child-info-icon-inner {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0.28em;
    height: 0.7em;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 0;
  }

  .child-menu .child-info-icon svg {
    position: relative;
    z-index: 1;
  }

  .child-menu .child-menu-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--mapa-size-base-5);
  }

  .child-menu .child-action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none !important;
    background: transparent !important;;
    color: var(--mapa-base-green);
    cursor: pointer;
    padding: var(--mapa-size-base-2);
  }

  .child-menu .child-action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border: none;
  }

  .child-menu-divider-row {
    margin: 0 !important;
  }
</style>

<!-- Popper do ElTooltip é teletransportado para o body -->
<style>
  .child-layer-name-tooltip {
    max-width: 22rem;
    line-height: 1.4;
  }
</style>
