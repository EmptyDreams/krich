let _init = false

/** 初始化全局事件 */
function initGlobalEvent() {
    if (_init) return
    _init = true
    document.addEventListener('compositionend', onCompositionEnd)
}

function onCompositionEnd(event) {
    const target = event.target
    console.log(event)
    if (target.classList.contains('krich-editor')) {
        target.dispatchEvent(new InputEvent('beforeinput', {
            cancelable: true,
            inputType: 'insertText',
            data: event.data
        }))
    }
}

/**
 * 为元素添加一个 BeforeInput 事件，自动处理中文输入法
 * @param element {HTMLElement}
 * @param consumer {function(InputEvent)}
 */
export function addBeforeInputEvent(element, consumer) {
    initGlobalEvent()
    element.addEventListener('beforeinput', event => {
        if (event.isComposing) event.preventDefault()
        else consumer(event)
    })
}