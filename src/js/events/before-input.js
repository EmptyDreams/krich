/**
 * 标记是否正在输入
 * @type {boolean|undefined}
 */
export let IS_COMPOSING

/**
 * 注册 before input 事件。
 *
 * 该事件会在用户输入内容前触发，中文输入过程中不会触发该事件。
 *
 * @param target {HTMLElement}
 * @param consumer {function(InputEvent|CompositionEvent):Promise<void>}
 */
export function registryBeforeInputEventListener(target, consumer) {
    target.addEventListener('beforeinput', event => {
        if (!(IS_COMPOSING = event.isComposing) && event.inputType.startsWith('insert')) {
            // noinspection JSIgnoredPromiseFromCall
            consumer(event)
        }
    })
    target.addEventListener('compositionend', event => {
        consumer(event).then(() => IS_COMPOSING = false)
    })
}