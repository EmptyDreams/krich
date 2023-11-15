/**
 * 编辑器容器的 query 表达式
 * @type {?string}
 */
let CONTAINER_QUERY
/**
 * 存储按钮状态
 * @type {{[p:string]: boolean|string}}
 */
export const BUTTON_STATUS = {}

/** 标签类型的 KEY */
export const DATA_ID = 'data-id'
/** 多选框的 value 的 KEY */
export const SELECT_VALUE = 'data-value'
/** 标签的 hash */
export const DATA_HASH = 'data-hash'

export const TITLE_LIST = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']
export const TOP_LIST = ['P', 'BLOCKQUOTE', ...TITLE_LIST]

/**
 * 工具栏上的按钮的样式
 * @type {{[p:string]: ButtonBehavior}}
 */
export let behaviors

/**
 * 初始化 behaviors
 * @param value {{[p:string]: ButtonBehavior}}
 */
export function initBehaviors(value) {
    behaviors = value
}

/** 初始化容器 */
export function initContainerQuery(query) {
    CONTAINER_QUERY = query
}

/** 获取编辑器容器 */
export function queryContainer() {
    return document.querySelector(CONTAINER_QUERY)
}