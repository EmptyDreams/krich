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

/**
 * 代码高亮器，留空表示不支持高亮
 *
 * 传入的参数为 pre 对象，直接修改传入的对象即可，无返回值
 *
 * @type {undefined|function(Element)}
 */
export let highlight
/**
 * 代码高亮支持的语言列表
 *
 * 数组第一个为默认选项
 *
 * 每个数组中的元素的第一个值是外部显示的值，第二个值是要赋值给 pre 的值
 *
 * @type {undefined|function(): ([string, string])[]}
 */
export let highlightLanguagesGetter

export const KRICH_CLASS = 'krich'
export const KRICH_EDITOR_CLASS = KRICH_CLASS + '-editor'
export const KRICH_TOOL_BAR_CLASS = KRICH_CLASS + '-tools'
export const KRICH_EC_CLASS = KRICH_CLASS + '-ec'
export const KRICH_HOVER_TIP_CLASS = KRICH_CLASS + '-tip'

/** 标签类型的 KEY */
export const DATA_ID = 'data-id'
/** 多选框的 value 的 KEY */
export const SELECT_VALUE = 'data-value'

/**
 * EmptyBodyElement 激活标记
 * @type {string}
 */
export const EMPTY_BODY_ACTIVE_FLAG = 'eb-active'

export const TITLE_LIST = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']
export const TOP_LIST = ['P', 'BLOCKQUOTE', 'UL', 'OL', 'HR', 'DIV', 'PRE', ...TITLE_LIST]

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
export let isComposing

/**
 * 设置代码高亮
 * @param highlighter {function(Element)} 代码高亮函数
 * @param languages {function(): ([string, string])[]} 获取支持的语言列表，该函数的返回值内部不会缓存
 */
export function setHighlight(highlighter, languages) {
    highlight = highlighter
    highlightLanguagesGetter = languages
}

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

/** 标记输入结束 */
export function markComposingStop() {
    isComposing = false
}

/** 标记输入开始 */
export function markComposingStart() {
    isComposing = true
}

/** 标记状态检查缓存过时 */
export function markStatusCacheInvalid() {
    statusCheckCache = false
}

/** 标记缓存生效 */
export function markStatusCacheEffect() {
    statusCheckCache = true
}