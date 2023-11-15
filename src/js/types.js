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
     * @type {function(Range, HTMLElement, ?Event): boolean|undefined}
     */
    onclick
    /**
     * 哈希函数，将按钮当前的状态转化为一个哈希值
     *
     * 函数的返回值必须保证状态不同时哈希值不同，函数传入的对象是按钮的对象
     *
     * @type {undefined|function(HTMLElement): string}
     */
    hash
    /**
     * 额外需要添加的 attributes
     * @type {undefined|function(HTMLElement): {[p: string]: string}}
     */
    extra
    /**
     * 验证指定标签和按钮的状态是否一致
     *
     * 函数的两个参数依次为：按钮对象，指定标签的对象
     *
     * @type {undefined|function(HTMLElement, HTMLElement): boolean}
     */
    verify
}