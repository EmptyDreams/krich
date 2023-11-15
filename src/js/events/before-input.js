/**
 * 注册 before input 事件。
 *
 * 该事件会在用户输入内容前触发，中文输入过程中不会触发该事件。
 *
 * @param target {HTMLElement}
 * @param consumer {function(Event)}
 */
export function registryBeforeInputEventListener(target, consumer) {
    target.addEventListener('beforeinput', event => {
        if (!event.isComposing) consumer(event)
    })
    target.addEventListener('compositionend', consumer)
}