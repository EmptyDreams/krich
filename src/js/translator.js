/**
 * @type {{
 *     types: string[],
 *     start: Number,
 *     end: Number,
 *     element: *[]
 * }[]}
 */
const list = []

/**
 * 转译器，用于将文本转换为指定的样式
 * @type {{[p:string]: {
 *  mode: [string, number],
 *  convert: (function(string, ?string): *),
 *  append: (function(*, string, number): *),
 *  clash?: string[]
 * }}}
 */
const registry = {
    'headerSelector': {
        mode: ['header', 99],
        convert: (text, level) => {
            return {
                level: parseInt(level),
                text,
                toString: () => {
                    const symbol = this.level === 0 ? 'p' : `h$${this.level}`
                    return `<${symbol}>${text}</${symbol}>`
                }
            }
        },
        append: (prev, text, index) => {
            const oldText = prev.text
            prev.text = oldText.substring(0, index + 1) + text + oldText.substring(index + 1)
            return prev
        }
    }
}

/**
 * 向指定位置插入一个新的元素
 * @param index {number} 插入的坐标
 * @param text {string} 要插入的文本
 * @param optionals {[string, selected?:*]} 文本附带的选项，每个数组第一个元素是类型名称，第二个元素为下拉菜单选中的值
 */
export function insertElement(index, text, ...optionals) {
    const translators = optionals.map(it => registry[it[0]])
        .sort((a, b) => a.mode[1] - b.mode[1])
    const record = new Set()
    const node = []
    for (let i = 0; i < translators.length; i++) {
        const translator = translators[i]
        const {convert, clash} = translator
        if (clash?.find(it => record.has(it))) continue
        node.push(convert(text, optionals[i][1]))
    }
    // noinspection JSCheckFunctionSignatures
    list.splice(index, 0, node)
}