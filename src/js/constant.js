export const DATA_ID = 'data-id'

/**
 * 工具栏上的按钮的样式
 * @type {{[p:string]: {
 *     render: function(): string,
 *     onclick: function(Event, HTMLElement),
 *     hash?: function(HTMLElement): string
 * }}}
 */
export let behaviors

export function initBehaviors(value) {
    behaviors = value
}