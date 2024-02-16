import {getElementBehavior} from '../utils/tools'

class ButtonBehavior {
    /**
     * 当前结构的各项状态
     *
     * 以下描述从最低位依次向最高位排列
     *
     * 1. 是否需要保存状态
     * 2. 是否是使用换行符的多行文本结构
     * 3. 是否是多元素结构
     *
     * @type {undefined|number}
     */
    state
    /**
     * 判断指定元素是否是当前样式
     * @type {string & keyof HTMLElementTagNameMap | string | undefined}
     */
    exp
    /**
     * 渲染函数，返回按钮的 HTML 内容
     * @type {function(): string}
     */
    render
    /**
     * 点击事件，当按钮被点击时触发
     *
     * 三个参数依次为：
     *
     * 1. 选中的区域
     * 2. 被点击的按钮的对象
     *
     * 返回值用于告知调用者函数是否需要外部还原光标位置
     *
     * @type {function(KRange, HTMLElement): boolean|undefined|void}
     */
    onclick
    /**
     * 用于构建一个空的标签
     * @type {undefined|function(btn: HTMLElement): HTMLElement}
     */
    builder
    /**
     * 用于构建一个新行，仅在 [multi] 为 `true` 时需要填写该项
     * @type {undefined|function(): Element|false}
     */
    newLine
    /**
     * 验证指定标签和按钮的状态是否一致
     *
     * 函数的两个参数依次为：按钮对象，指定标签的对象
     *
     * @type {undefined|function(btn: HTMLElement, item: HTMLElement): boolean}
     */
    verify
    /**
     * 将当前按钮的样式改为和指定节点一致的状态，当传入的 item 为 undefined 时表示恢复默认值
     * @type {undefined|function(btn: HTMLElement, item: HTMLElement|undefined)}
     */
    setter
    /**
     * 当该元素作为 `KRange` 的 {@link KRange#body} 或光标移动到标签内部时触发
     *
     * 注意：当元素是 EmptyBodyElement 或 TextArea 时该函数才有效
     *
     * @type {undefined|function(item: Element)}
     */
    hover
    /**
     * 该样式的按钮对象
     * @type {HTMLElement|undefined}
     */
    button
}

export const BEHAVIOR_STATE_NO_STATUS = 0b1
export const BEHAVIOR_STATE_TEXT_AREA = 0b10
export const BEHAVIOR_STATE_MES = 0b100

/**
 * 判断是否是 NoStatus 的 behavior
 * @param item {ButtonBehavior|Element|undefined}
 */
export function isNoStatus(item) {
    if (!item) return
    const state = item.state ?? getElementBehavior(item)?.state ?? 0
    return state & BEHAVIOR_STATE_NO_STATUS
}

/**
 * 判断是否是 TextArea 的 behavior
 * @param item {ButtonBehavior|Element|undefined}
 */
export function isTextArea(item) {
    if (!item) return
    const state = item.state ?? getElementBehavior(item)?.state ?? 0
    return state & BEHAVIOR_STATE_TEXT_AREA
}

/**
 * 判断是否是多元素结构的 behavior
 * @param item {ButtonBehavior|Element|undefined}
 */
export function isMultiEleStruct(item) {
    if (!item) return
    const state = item.state ?? getElementBehavior(item)?.state ?? 0
    return state & BEHAVIOR_STATE_MES
}