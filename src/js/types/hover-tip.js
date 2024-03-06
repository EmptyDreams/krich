/**
 * @typedef {'code'|'img'|'link'} HoverTipNames
 */

class HoverTipValue {
    /**
     * 获取初始状态的悬浮窗
     * @type {function(Node|Element, ...any)}
     */
    init
    /**
     * 当悬浮窗内有下拉菜单的值被修改时触发
     * @type {undefined|function(select: Element): Promise<void>} 参数是下拉菜单的对象
     */
    onchange
}