import {readSelectedColor} from './utils/tools'
import {editorRange} from './events/range-monitor'

/**
 * 编辑器容器
 * @type {HTMLElement}
 */
export let KRICH_CONTAINER
/**
 * 编辑区域容器
 * @type {HTMLElement}
 */
export let KRICH_EDITOR
/**
 * 编辑器工具栏
 * @type {HTMLElement}
 */
export let KRICH_TOOL_BAR

/** 标签类型的 KEY */
export const DATA_ID = 'data-id'
/** 多选框的 value 的 KEY */
export const SELECT_VALUE = 'data-value'

export const TITLE_LIST = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']
export const TOP_LIST = ['P', 'BLOCKQUOTE', ...TITLE_LIST]

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
 * 初始化 behaviors
 * @param value {{[p:string]: ButtonBehavior}}
 */
export function initBehaviors(value) {
    behaviors = value
}

/** 初始化容器 */
export function initContainerQuery(container) {
    KRICH_CONTAINER = container
    KRICH_EDITOR = container.getElementsByClassName('krich-editor')[0]
    KRICH_TOOL_BAR = container.getElementsByClassName('krich-tools')[0]
    for (let child of KRICH_TOOL_BAR.children) {
        const dataId = child.getAttribute(DATA_ID)
        behaviors[dataId].button = child
        if (child.classList.contains('color')) {
            child.setAttribute(SELECT_VALUE, readSelectedColor(child))
            child.getElementsByTagName('input')[0].onblur = () => editorRange?.active?.()
        }
    }
}

/** 标记状态检查缓存过时 */
export function markStatusCacheInvalid() {
    statusCheckCache = false
}