/** 转译器，用于将文本转换为指定的样式 */
export default {
    headerSelector: (text, level) => {
        if (level === 0) return text
        else return `<h${level}>${text}</h${level}>`
    }
}