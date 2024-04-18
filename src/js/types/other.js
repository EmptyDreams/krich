/* 本文件中放置比较简单的类型声明 */

/**
 * @typedef {[Node|Element?, number, number, number]|[Node|Element?, number, number, number, number, number, 0]} KRangeData
 * @typedef {{
 *     upload: Map<string, string>,
 *     remove: Set<string>
 * }} ExportImageData
 * @typedef {{
 *     data: UndoStackItem[],
 *     oldRange: KRangeData,
 *     newRange: KRangeData
 * }} UndoStackFrame
 */