import colorSelect from '../../resources/html/tools/libs/colorSelect.html'

// noinspection JSValidateTypes
/** @type {{[p:string]: string}} */
const templates = {colorSelect}

/**
 * 处理模板
 * @param html {string} 模板文本
 * @return {string} 处理后的结果
 */
export function handleTemplate(html) {
    const refs = html.matchAll(/{{(.*?)}}/g)
    for (let matched of refs) {
        const name = matched[1].trim()
        html = html.replace(new RegExp(`{{\\s*${name}\\s*}}`), templates[name])
    }
    return html
}