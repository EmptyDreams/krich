class UndoStackItem {

    /**
     * 节点坐标
     * @type {number[]}
     */
    pos
    /**
     * 操作类型
     *
     * +  0: 修改当前节点
     * +  1: 在当前节点左侧操作
     * +  2: 在当前节点右侧操作
     * +  3: 在当前节点子节点操作
     * + 负数表示删除，正数表示添加
     *
     * @type {-3|-2|-1|0|1|2|3}
     */
    type
    /**
     * 旧的节点对象
     * @type {Node[]|undefined}
     */
    nodes
    /**
     * 旧的属性内容
     * @type {[key: string, value: string]|undefined}
     */
    oldAttr
    /**
     * 旧的文本
     * @type {string|undefined}
     */
    oldText

}