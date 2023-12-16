class ButtonBehavior {
    /**
     * 是否需要保存状态（顶层元素该项一定为 true）
     * @type {true|undefined}
     */
    noStatus
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
     * 3. 点击事件的原始 Event 对象
     *
     * 返回值用于告知调用者函数是否需要外部还原光标位置
     *
     * @type {function(KRange, HTMLElement, Event|undefined): boolean|undefined|void}
     */
    onclick
    /**
     * 用于构建一个空的标签
     * @type {undefined|function(btn: HTMLElement): HTMLElement}
     */
    builder
    /**
     * 判断指定元素是否是当前样式
     * @type {string & keyof HTMLElementTagNameMap | string}
     */
    exp
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
     * 该样式的按钮对象
     * @type {HTMLElement|undefined}
     */
    button
}