/** 标签类型的 KEY */
export const DATA_ID = 'data-id'
/** 多选框的 value 的 KEY */
export const SELECT_VALUE = 'data-value'

export const TITLE_LIST = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']
export const TOP_LIST = ['P', 'BLOCKQUOTE', ...TITLE_LIST]

/**
 * 工具栏上的按钮的样式
 * @type {{[p:string]: {
 *     render: function(): string,
 *     onclick: function(Event, HTMLElement, string?),
 *     hash?: function(HTMLElement): string
 * }}}
 */
export let behaviors

export function initBehaviors(value) {
    behaviors = value
}