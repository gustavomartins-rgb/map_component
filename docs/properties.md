## MapLayers

| Nome          | Tipo                          | Descrição             |
|---------------|-------------------------------|-----------------------|
| baseMapLayers | [BaseLayer[]](#baselayer)     | Camadas base.         |
| customLayers  | [CustomLayer[]](#customlayer) | Camadas customizadas. |

## BaseLayer

| Nome           | Tipo    | Descrição                                                                                                                                               |
|----------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| name           | string  | Nome da camada base.                                                                                                                                    |
| key            | string  | Identificador único.                                                                                                                                    |
| default        | boolean | Define se essa camada será a padrão.                                                                                                                    |
| url            | string  | URL do serviço de tiles.                                                                                                                                |
| tms            | boolean | Indica que os tiles usam esquema TMS.                                                                                                                   |
| minZoom        | number  | Zoom mínimo suportado pela camada.                                                                                                                      |
| maxZoom        | number  | Zoom máximo suportado pela camada.                                                                                                                      |
| maxNativeZoom  | number  | Maior nível de zoom nativo dos tiles (evita upscaling acima desse nível).                                                                               |
| errorTileUrl   | string  | URL de tile a ser exibido quando ocorrer erro no carregamento de um tile.                                                                               |
| minZoomWarning | number  | Valor de zoom mínimo recomendado. Quando definido, pode ser usado pela aplicação para exibir um aviso caso o mapa esteja com zoom menor que esse valor. |

## CustomLayer

| Nome   | Tipo                      | Descrição                                              |
|--------|---------------------------|--------------------------------------------------------|
| name   | string                    | Nome do grupo de camadas.                              |
| key    | string                    | Chave do grupo.                                        |
| toggle | {active, inactive}        | Textos utilizados nos botões ativar/desativar camadas. |
| layers | [LayerData[]](#layerdata) | Lista de camadas dentro do grupo.                      |
| actions | [GroupActionConfig[]](#groupactionconfig) | Botões ao final da área colapsada do group. |

## LayerData

| Nome          | Tipo               | Descrição                                              |
|---------------|--------------------|--------------------------------------------------------|
| baseUrl       | string             | URL base da camada.                                    |
| layers        | string             | Nome das layers no serviço.                            |
| format        | string             | Formato da imagem (ex: image/png).                     |
| transparent   | boolean            | Se a camada é transparente.                            |
| name          | string             | Nome exibido no menu.                                  |
| tooltip       | string             | Texto opcional ao passar o mouse sobre o nome da camada no ChildMenu. |
| activeDefault | boolean            | Ativa por padrão.                                      |
| active        | boolean            | Estado atual da camada.                                |
| key           | string             | Identificador único.                                   |
| toggle        | {active, inactive} | Textos utilizados nos botões ativar/desativar camadas. |
| visibility    | {labelShow, labelHide, show?} | Textos do tooltip/aria do ícone de olho (`visibilityMode: 'eye'`). Prioridade sobre `toggle`. Se `show: false`, oculta o controle de visibilidade. |
| style         | {color, fillColor, icon?} | Cores da legenda. Se `icon` estiver definido, exibe o ícone Font Awesome na cor da camada. Sem ícone, exibe só o indicador de cor em círculo. |
| options       | any                | Configurações adicionais (opcional).                   |
| metrics       | [LayerMetricsConfig[]](#layermetricsconfig) | Lista de métricas do painel de edição. |
| infoIcons     | [LayerInfoIconConfig[]](#layerinfoiconconfig) | Ícones informativos ao lado do nome no ChildMenu. |
| required      | boolean            | Se `true`, exibe asterisco vermelho (`*`) ao lado do nome. |


## LayerMetricsConfig

| Nome  | Tipo             | Descrição                                              |
|-------|------------------|--------------------------------------------------------|
| title | string           | Título da métrica (ex.: "Área").                       |
| type  | string           | Sufixo/unidade exibido após a label (ex.: "ha").       |
| value | string \| number | Valor principal, exibido como label (pill) reduzida.   |
| style | {backgroundColor, color, borderColor?} | Cores da label (pill). O texto de `value` permanece preto. |


## LayerInfoIconConfig

Ícone informativo ao lado do nome da layer no `ChildMenu` (nome alinhado a `LayerMetricsConfig` / `LayerActionConfig`).

| Nome    | Tipo    | Descrição                                                                 |
|---------|---------|---------------------------------------------------------------------------|
| key     | string  | Identificador opcional para consulta/alteração via MapRef.                |
| icon    | string  | Nome do ícone Font Awesome registrado no pacote.                          |
| active  | boolean | Se `true`, o ícone é exibido.                                             |
| tooltip | string  | Texto opcional exibido ao passar o mouse sobre o ícone.                   |
| style   | {color?, backgroundColor?} | `color` pinta a forma. `backgroundColor` preenche o recorte interno (ex.: a exclamação preta no triângulo amarelo). |

Via MapRef: `infoIcons`, `setLayerInfoIconActive(layerKey, iconRef, active)`, `setLayerInfoIcons(...)`.
O consumidor escuta `onLayerInfoIconsUpdate` e atualiza `layers.customLayers`.


## GroupActionConfig

Botão de ação do group (mesmo formato das actions de edição + `active`).

| Nome     | Tipo    | Descrição                                      |
|----------|---------|------------------------------------------------|
| key      | string  | Identificador da action.                       |
| name     | string  | Rótulo do botão.                               |
| icon     | string  | Ícone opcional.                                |
| type     | string  | Semântica sugerida (`edit`, `custom`, etc.).   |
| style    | object  | Cores do botão (igual ao painel de edição).    |
| disabled | boolean | Desabilita o botão.                            |
| visible  | boolean | Se `false`, oculta (além de `active`).         |
| active   | boolean | Se `true`, o botão é exibido.                  |

Via MapRef: `groupActions`, `setGroupActionActive(groupKey, actionKey, active)`, `setGroupActions(...)`.
O consumidor escuta `onGroupActionsUpdate` e atualiza `layers.customLayers`.


## MapOptionsConfig

| Nome       | Tipo                                  | Descrição                                                 |
|------------|---------------------------------------|-----------------------------------------------------------|
| map        | [MapConfig](#mapconfig)               | Configurações básicas do mapa (centro, zoom, etc).        |
| layersMenu | [LayersMenuConfig](#layersmenuconfig) | Configuração do menu de camadas, se houver.               |
| drawing    | [DrawingConfig](#drawingconfig)       | Opções para ativar e personalizar ferramentas de desenho. |
| tools      | [MapToolsConfig](#maptoolsconfig)     | Ferramentas do mapa (tela cheia, centralizar, medição).   |

## MapConfig

| Campo  | Tipo                                | Descrição             |
|--------|-------------------------------------|-----------------------|
| config | [MapConfigConfig](#mapconfigconfig) | Define opções do mapa |

## MapConfigConfig

| Campo               | Tipo                                        | Descrição                                         |
|---------------------|---------------------------------------------|---------------------------------------------------|
| --                  | [MapOptions](#mapoptions)                   | Define opções do mapa com base na API do Leaflet. |
| id                  | string                                      | Define id do mapa.                                |
| removeControlLayers | boolean                                     | Define exibição dos controles do mapa.            |
| zoomControlPosition | [ZoomControlPosition](#zoomcontrolposition) | Posição dos controles de zoom.                    |

## LayersMenuConfig

| Campo               | Tipo            | Descrição                                                                    |
|---------------------|-----------------|------------------------------------------------------------------------------|
| size                | string          | Tamanho do menu de camadas (small, medium, large).                           |
| persist             | boolean         | Define se o menu de camadas deve persistir o estado de exibição das camadas. |
| removeMenu          | boolean         | Define se o menu de camadas deve ser removido.                               |
| editingLayerKey     | string \| null  | Modo controlado do painel de edição. Se omitido, o estado é interno.         |
| selectedSectionKey  | string \| null  | Section ativa no seletor do topo. Se a prop for passada, o consumidor controla. |
| visibilityMode      | `'switch' \| 'eye'` | Visual do toggle de visibilidade.                                      |
| defaultOpen         | boolean         | Se `true`, o menu lateral inicia aberto.                                     |

## DescriptiveMemorial

| Campo       | Tipo                                          | Descrição                                                 |
|-------------|-----------------------------------------------|-----------------------------------------------------------|
| show        | boolean                                       | Ativa ou desativa o menu de memorial descritivo.          |
| customTexts | [CoordinatePanelTexts](#coordinatepaneltexts) | Textos personalizados para o menu de memorial descritivo. |

## CoordinatePanelTexts

| Campo                                    | Tipo   | Descrição                                                           |
|------------------------------------------|--------|---------------------------------------------------------------------|
| title                                    | string | Título do painel de coordenadas.                                    |
| addPoint                                 | string | Texto para adicionar ponto.                                         |
| editPoint                                | string | Texto para editar ponto.                                            |
| removePoint                              | string | Texto para remover ponto.                                           |
| actions                                  | string | Rótulo para a seção de ações.                                       |
| clearGeometries                          | string | Texto para limpar geometrias.                                       |
| index                                    | string | Rótulo para o índice.                                               |
| x                                        | string | Rótulo para coordenada X.                                           |
| y                                        | string | Rótulo para coordenada Y.                                           |
| azimuth                                  | string | Rótulo para azimute.                                                |
| distance                                 | string | Rótulo para distância.                                              |
| noPoints                                 | string | Mensagem quando não há pontos.                                      |
| addPointTitle                            | string | Título do botão de adicionar ponto.                                 |
| editPointTitle                           | string | Título do botão de editar ponto.                                    |
| removePointTitle                         | string | Título do botão de remover ponto.                                   |
| clearGeometriesTitle                     | string | Título do botão de limpar geometrias.                               |
| addPointDescription                      | string | Descrição do botão de adicionar ponto.                              |
| editPointDescription                     | string | Descrição do botão de editar ponto.                                 |
| removePointDescription                   | string | Descrição do botão de remover ponto.                                |
| clearGeometriesDescription               | string | Descrição do botão de limpar geometrias.                            |
| memorialDescriptive                      | string | Rótulo para memorial descritivo.                                    |
| referenceSystem                          | string | Rótulo para sistema de referência.                                  |
| selectSystem                             | string | Texto para selecionar sistema.                                      |
| sirgas2000                               | string | Rótulo para SIRGAS 2000.                                            |
| coordinateFormat                         | string | Rótulo para formato de coordenada.                                  |
| selectFormat                             | string | Texto para selecionar formato.                                      |
| decimalDegrees                           | string | Rótulo para graus decimais.                                         |
| degreesMinutesSeconds                    | string | Rótulo para graus, minutos e segundos.                              |
| manualInput                              | string | Rótulo para entrada manual.                                         |
| insertCoordinates                        | string | Texto para inserir coordenadas.                                     |
| xLongitude                               | string | Rótulo para longitude (X).                                          |
| yLatitude                                | string | Rótulo para latitude (Y).                                           |
| degrees                                  | string | Rótulo para graus.                                                  |
| minutes                                  | string | Rótulo para minutos.                                                |
| seconds                                  | string | Rótulo para segundos.                                               |
| addedPoints                              | string | Rótulo para pontos adicionados.                                     |
| finalizeGeometry                         | string | Texto para finalizar geometria.                                     |
| csvUpload                                | string | Rótulo para upload de CSV.                                          |
| csvFileUpload                            | string | Texto para upload de arquivo CSV.                                   |
| dragCsvFile                              | string | Texto para arrastar arquivo CSV.                                    |
| csvColumnsInfo                           | string | Informações sobre colunas do CSV.                                   |
| applyCsvCoordinates                      | string | Texto para aplicar coordenadas do CSV.                              |
| placeholderLongitude                     | string | Placeholder para longitude.                                         |
| placeholderLatitude                      | string | Placeholder para latitude.                                          |
| placeholderAzimuth                       | string | Placeholder para azimute.                                           |
| placeholderDistance                      | string | Placeholder para distância.                                         |
| placeholderDegrees                       | string | Placeholder para graus.                                             |
| placeholderMinutes                       | string | Placeholder para minutos.                                           |
| placeholderSeconds                       | string | Placeholder para segundos.                                          |
| errorXYRequired                          | string | Mensagem de erro para X/Y obrigatório.                              |
| errorDegreesRequired                     | string | Mensagem de erro para graus obrigatório.                            |
| errorFirstRowXY                          | string | Mensagem de erro para primeira linha X/Y.                           |
| errorProvideCoordinatesOrAzimuthDistance | string | Mensagem de erro para coordenadas ou azimute/distância necessários. |

## MapToolsConfig

Ferramentas opcionais do mapa. Por padrão `show: false` (compatível com consumidores existentes).

| Campo        | Tipo                                      | Descrição                                              |
|--------------|-------------------------------------------|--------------------------------------------------------|
| show         | boolean                                   | Ativa o bloco de ferramentas do mapa.                  |
| position     | [ZoomControlPosition](#zoomcontrolposition) | Posição dos controles (default: `topright`).         |
| fullscreen   | `{ show?: boolean; title?: string }`      | Botão de tela cheia (Fullscreen API do navegador).     |
| center       | ver abaixo                                | Botão para centralizar/enquadrar o mapa.               |
| measureArea  | ver abaixo                                | Ferramenta efêmera de medição de área (Geoman + Turf). |
| showInteractionPanel | boolean                             | Painel flutuante ao medir (default `true`). Com `false`, só o tooltip do botão. |
| texts        | `{ measureResult?: string; noGeometry?: string }` | Textos auxiliares.                         |

### center

| Campo   | Tipo                         | Descrição                                                         |
|---------|------------------------------|-------------------------------------------------------------------|
| show    | boolean                      | Exibe o botão de centralizar.                                     |
| title   | string                       | Tooltip do botão.                                                 |
| target  | `'drawn' \| 'initial'`       | `drawn`: enquadra `drawItemsGroup`; `initial`: centro/zoom inicial. |
| padding | `[number, number]`           | Padding do `fitBounds`.                                           |

### measureArea

| Campo         | Tipo                              | Descrição                                           |
|---------------|-----------------------------------|-----------------------------------------------------|
| show          | boolean                           | Exibe o botão de medição.                           |
| title         | string                            | Tooltip do botão.                                   |
| units         | `('ha' \| 'm2' \| 'km2')[]`       | Unidades exibidas no popup após medir.              |
| shapeOptions  | [PathOptions](https://leafletjs.com/reference.html#path) | Estilo do polígono de medição. |

## DrawingConfig

| Campo       | Tipo                                    | Descrição                                        |
|-------------|-----------------------------------------|--------------------------------------------------|
| show        | boolean                                 | Ativa ou desativa as ferramentas de desenho.     |
| options     | [ToolbarOptions](#toolbaroptions)       | Opções para personalizar ferramentas de desenho. |
| translation | [TranslationConfig](#translationconfig) | Traduções para ferramentas de desenho.           |

## ToolbarOptions

Esse campo define opções de cada ferramenta de desenho. É um tipo composto que pode ser:

- [ControlOptions](https://geoman.io/docs/leaflet/toolbar)
- [BlockPositions](https://geoman.io/docs/leaflet/toolbar#toolbar-block-position)
- Boolean
- [PathOptions](https://leafletjs.com/reference.html#path)

## Links externos

#### [MapOptions](https://leafletjs.com/reference.html#map-option)

#### [TranslationConfig](https://github.com/geoman-io/leaflet-geoman/tree/master/src/assets/translations)

#### [ZoomControlPosition](https://leafletjs.com/reference.html#control-zoom-position)