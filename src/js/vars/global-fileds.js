import {updateEditorRange} from '../events/range-monitor'

/**
 * 编辑器容器
 * @type {HTMLElement}
 */
export let KRICH_CONTAINER
/**
 * 编辑区域
 * @type {HTMLElement}
 */
export let KRICH_EDITOR
/**
 * 编辑器工具栏
 * @type {HTMLElement}
 */
export let KRICH_TOOL_BAR
/**
 * 悬浮窗对象
 * @type {HTMLElement}
 */
export let KRICH_HOVER_TIP
/** 编辑区容器 */
export let KRICH_EC

export const KRICH_CLASS = 'krich'
export const KRICH_EDITOR_CLASS = KRICH_CLASS + '-editor'
export const KRICH_TOOL_BAR_CLASS = KRICH_CLASS + '-tools'
export const KRICH_EC_CLASS = KRICH_CLASS + '-ec'
export const KRICH_HOVER_TIP_CLASS = KRICH_CLASS + '-tip'

/** 标签类型的 KEY */
export const DATA_ID = 'data-id'
/** 多选框的 value 的 KEY */
export const SELECT_VALUE = 'data-value'
/** 悬浮窗记录名称的 KEY */
export const HOVER_TIP_NAME = 'data-name'
/**
 * 标签 hash 的 KEY
 * @type {string}
 */
export const HASH_NAME = 'data-hash'
/**
 * EmptyBodyElement 激活标记
 * @type {string}
 */
export const EMPTY_BODY_ACTIVE_FLAG = 'eb-active'
/** 激活标记 */
export const ACTIVE_FLAG = 'active'

export const TITLE_LIST = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']
export const TOP_LIST = ['P', 'BLOCKQUOTE', 'UL', 'OL', 'HR', 'DIV', 'PRE', 'IMG', ...TITLE_LIST]
/**
 * 注册在全局的事件的函数
 * @type {{[key: string]: function}}
 */
export const GLOBAL_EVENT_FUN_LIST = {
    selectionchange: updateEditorRange
}

/**
 * 工具栏上的按钮的样式
 * @type {{[p:string]: ButtonBehavior}}
 */
export let behaviors

/**
 * 标记是否已经对比过按钮状态和文本状态
 * @type {boolean}
 */
export let statusCheckCache = true
/**
 * 标记是否正在输入
 * @type {boolean|undefined}
 */

/**
 * 初始化 behaviors
 * @param value {{[p:string]: ButtonBehavior}}
 */
export function initBehaviors(value) {
    behaviors = value
}

/** 初始化容器 */
export function initContainerQuery(container) {
    KRICH_CONTAINER = container;
    [KRICH_EC, KRICH_EDITOR, KRICH_TOOL_BAR, KRICH_HOVER_TIP] = [
        KRICH_EC_CLASS, KRICH_EDITOR_CLASS, KRICH_TOOL_BAR_CLASS, KRICH_HOVER_TIP_CLASS
    ].map(it => container.getElementsByClassName(it)[0])
}

/** 标记状态检查缓存过时 */
export function markStatusCacheInvalid() {
    statusCheckCache = false
}

/** 标记缓存生效 */
export function markStatusCacheEffect() {
    statusCheckCache = true
}