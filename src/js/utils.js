/**
 * 获取指定节点的第一个文本子节点
 * @param node {Node}
 * @return {Text}
 */
export function getFirstTextNode(node) {
    while (node.nodeType !== Node.TEXT_NODE) {
        node = node.firstChild
    }
    return node
}

/**
 * 获取指定节点的最后一个文本子结点
 * @param node {Node}
 * @return {Text}
 */
export function getLastTextNode(node) {
    while (node.nodeType !== Node.TEXT_NODE)
        node = node.lastChild
    return node
}