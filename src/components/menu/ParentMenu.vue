<template>
  <ElSubMenu
    :disabled="!childrenLayers.length"
    :index="groupData.key"
    class="parent-menu"
  >
    <template #title>
      <div class="parent-menu-row">
        <div class="parent-layer-title">{{ groupData.name }}</div>
        <span
          v-if="showVisibilityControl"
          class="visibility-control"
        >
          <button
            v-if="visibilityMode === 'eye'"
            type="button"
            class="visibility-eye-button"
            :aria-label="allLayersActive ? hideLabel : showLabel"
            :title="allLayersActive ? hideLabel : showLabel"
            @click.stop="allLayersActive = !allLayersActive"
          >
            <FontAwesomeIcon :iconName="allLayersActive ? 'eye' : 'eye-slash'" />
          </button>
          <template v-else>
            <ElSwitch
              v-model="allLayersActive"
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
              v-if="groupData.toggle"
              class="parent-layer-status"
            >
              {{ allLayersActive ? groupData.toggle.active : groupData.toggle.inactive }}
            </span>
          </template>
          <ElDivider
            class="divider-bar"
            direction="vertical"
          />
        </span>
      </div>
    </template>
    <template
      v-for="(child, idx) in childrenLayers"
      :key="child.key"
    >
      <ChildMenu
        v-if="child.name"
        :actionDefaults="actionDefaults"
        :data="child"
        :groupKey="groupData.key"
        :persist="props.persist"
        :sectionKey="sectionKey"
        :visibilityMode="visibilityMode"
        @onChildLayerToggle="onChildChange($event, idx)"
        @onLayerAction="emit('onLayerAction', $event)"
      />
    </template>

    <ElMenuItem
      v-if="visibleGroupActions.length"
      :index="`${groupData.key}__group-actions`"
      class="parent-menu-group-actions-item"
    >
      <div class="parent-menu-group-actions">
        <button
          v-for="action in visibleGroupActions"
          :key="action.key"
          type="button"
          class="parent-group-action-button"
          :style="actionButtonStyle(action)"
          :disabled="action.disabled"
          @click.stop="onGroupActionClick(action)"
        >
          <FontAwesomeIcon
            v-if="action.icon"
            :iconName="action.icon"
          />
          <span>{{ action.name }}</span>
        </button>
      </div>
    </ElMenuItem>
  </ElSubMenu>
  <ElDivider class="parent-menu-divider-row" />
</template>

<script lang="ts" setup>
  import { ElDivider, ElMenuItem, ElSubMenu, ElSwitch } from 'element-plus'
  import { computed, ref, watch } from 'vue'
  import FontAwesomeIcon from '../fa-icon/FontAwesomeIcon.vue'
  import ChildMenu from './ChildMenu.vue'
  import {
    GroupActionConfig,
    GroupLayerData,
    LayerActionDefaults,
    LayerActionPayload,
    LayerActionStyle,
    LayerData
  } from '../../types'
  import { resolveActiveGroupActions } from '../../utils/layersConfigNormalizer'
  import { resolveLayerActiveState, setHistory } from '../../utils/menuHistory.ts'

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

  const actionButtonStyle = (action: GroupActionConfig): Required<LayerActionStyle> =>
    resolveActionStyle(action.style)

  type ParentMenuProps = {
    groupData: GroupLayerData
    persist: boolean
    sectionKey?: string
    actionDefaults?: LayerActionDefaults
    visibilityMode?: 'switch' | 'eye'
  }

  const props = withDefaults(defineProps<ParentMenuProps>(), {
    visibilityMode: 'switch'
  })

  const emit = defineEmits<{
    onChildLayerToggle: [LayerData]
    onGroupLayerToggle: [GroupLayerData]
    onLayerAction: [LayerActionPayload]
  }>()

  const childrenLayers = ref<LayerData[]>(
    (props.groupData.layers ?? []).map((layer) => resolveLayerActiveState(layer, props.persist))
  )

  watch(
    () => props.groupData.layers,
    (layers) => {
      childrenLayers.value = (layers ?? []).map((layer) =>
        resolveLayerActiveState(layer, props.persist)
      )
    },
    { deep: true }
  )

  const visibleGroupActions = computed(() => resolveActiveGroupActions(props.groupData))

  const showGroupEye = computed(() => props.groupData.visibility?.show !== false)

  const showVisibilityControl = computed(() => {
    if (props.visibilityMode === 'eye') return showGroupEye.value
    return true
  })

  const showLabel = computed(
    () =>
      props.groupData.visibility?.labelShow ??
      props.groupData.toggle?.active ??
      'Exibir'
  )
  const hideLabel = computed(
    () =>
      props.groupData.visibility?.labelHide ??
      props.groupData.toggle?.inactive ??
      'Ocultar'
  )

  const toggleVisibleAllLayers = (): void => {
    if (props.persist) childrenLayers.value.forEach((layer: LayerData) => setHistory(layer))

    emit('onGroupLayerToggle', {
      ...props.groupData,
      layers: childrenLayers.value
    })
  }

  const allLayersActive = computed<boolean>({
    get: () => childrenLayers.value.some((layer: LayerData) => layer.active),
    set: (active: boolean) => {
      childrenLayers.value = (props.groupData.layers ?? []).map((layer: LayerData) => {
        return {
          ...layer,
          active
        }
      })

      toggleVisibleAllLayers()
    }
  })

  const onChildChange = (layer: LayerData, idx: number): void => {
    childrenLayers.value[idx] = layer
    emit('onChildLayerToggle', layer)
  }

  const onGroupActionClick = (action: GroupActionConfig): void => {
    if (action.disabled) return

    emit('onLayerAction', {
      actionKey: action.key,
      actionType: action.type,
      sectionKey: props.sectionKey,
      groupKey: props.groupData.key,
      source: 'group-menu'
    })
  }
</script>

<style>
  .parent-menu .parent-menu-row {
    display: flex;
    justify-content: space-between;
    gap: var(--mapa-size-base-10);
    width: 100%;
    font-size: var(--mapa-fs-12);
  }

  .parent-menu .visibility-control {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--mapa-size-base-5);
  }

  .parent-menu .visibility-eye-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--mapa-base-green);
    cursor: pointer;
    padding: var(--mapa-size-base-2);
  }

  .parent-menu .parent-layer-title {
    word-wrap: break-word;
    white-space: normal;
    line-height: 150%;
    margin-block: auto;
    font-weight: bold;
  }

  .parent-menu .divider-bar {
    height: var(--mapa-size-base-20);
    border-width: var(--mapa-size-base-2);
  }

  .parent-menu-group-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--mapa-size-base-5);
    width: 100%;
    box-sizing: border-box;
    padding: var(--mapa-size-base-10) 0;
  }

  .parent-menu .parent-menu-group-actions-item {
    height: auto !important;
    line-height: normal !important;
    white-space: normal !important;
    padding-left: var(--mapa-size-base-20) !important;
    padding-right: var(--mapa-size-base-20) !important;
    cursor: default !important;
  }

  .parent-menu .parent-menu-group-actions-item:hover {
    background-color: transparent !important;
  }

  .parent-group-action-button {
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
  }

  .parent-group-action-button:not(:disabled):hover {
    background-image: linear-gradient(rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.16));
  }

  .parent-group-action-button:not(:disabled):active {
    background-image: linear-gradient(rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.32));
  }

  .parent-group-action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .parent-menu-divider-row {
    margin: 0 !important;
  }
</style>
