# 说明

这是一个正在开发的简易的富文本编辑器，适用于浏览器平台。

仓库中附带的 CSS 样式仅用于预览，不追求美观，不会发布到 npm 仓库，若非样式存在影响使用的问题，请勿提交与 CSS 样式有关的 issue 和 pr。

## 功能

目前实现了如下功能：

+ 正文、各级标题的切换
+ 引用块、有序列表、无序列表、代办列表
+ 超链接、加粗、下划线、斜体、删除线、内敛代码块、上标、下标、前景色、背景色
+ 分割线、图像
+ 橡皮擦按钮
+ 代码块
+ 快捷键
+ 粘贴、节点拖动
+ 历史记录（撤回和重做）

等待实现的功能：

+ 表情
+ 表格

### 已实现的快捷键

1. `shift enter`: 在当前行下方创建一个新行并将光标移动到新行中，不会将原始光标后方的内容移动到下一行
2. `ctrl enter`: 在距离最近的顶层元素的下方添加一个新行，在非代码块中动作与 `shift` 一致
3. `ctrl shift enter`: 在距离最近的顶层元素的上方添加一个新行并将光标移动到新行中
4. `ctrl Z`: 撤回
5. `ctrl shift Z`: 重做
6. `列表结尾空行中按 enter`: 删除列表最后一行，在列表下方创建新行并将光标移动到新行
7. `other`: 具体见按钮悬浮时显示的内容

## 预览

### 环境要求：

1. NodeJs >= 18.0.0
2. npm >= 8.0.0

### 初始化

1. 使用 git 指令克隆仓库：`git clone git@github.com:EmptyDreams/krich.git`
    一般使用 ssh 连接会更加稳定，不会被墙，如果 git 没有登录的话只能使用 https 连接克隆：`git clone https://github.com/EmptyDreams/krich.git`
2. 在仓库根目录下启动命令提示符
3. 执行 `npm install`
4. 执行 `npm install rollup -g`

### 运行

1. 执行 `rollup -c`
2. 在浏览器中打开 `http://localhost:3000`

如果 `3000` 与您的其它应用的端口号冲突，可以在 rollup 配置文件中修改这个端口号。

### 更新

在项目根目录执行 `git pull` 即可更新项目，如果您不是通过 git 克隆的仓库，那么该指令很可能将无法工作。

更新后推荐使用 `npm install` 指令更新依赖，避免由于依赖更新导致运行失败。

# 在前端项目中使用 KRich

## 引入 JS

项目已经发布到 [npm 仓库](https://www.npmjs.com/package/krich/v/alpha)，您可以使用 `jsdelivr` 等 CDN 将 JS 文件引入到网站中。

下面为引用示例，从中选区一个方法即可（尖括号表示需要用户替换填写内容，圆括号为可选项）：

1. 传统脚本：
    ```html
    <script (defer/async) src="https://<YourCdnDomain>/npm/krich@<version>/dist/krich(.min).js"></script>
    ```
2. ESMAScript：
    ```html
    <script type="module" (defer/async) src="https://<YourCdnDomain>/npm/krich@<version>/dist/krich-es(.min).js"></script>
    ```
   
## 获取对象

导入脚本并执行后，krich 将会声明一个名为 `KRich` 的全局函数，使用 `window.KRich` 或 `KRich` 即可获取到对象。

对于 ESMAScript，krich 会使用 `export default` 导出 KRich 对象，可以使用如下代码接收：

```javascript
import KRich from './krich-es.js'
```

## 文档

### 构造函数

构造函数接收一个 `string` 类型或 `Element` 类型的参数。

1. `string`：一个 CSS 选择表达式，用于从 `document` 中选择容器对象
2. `Element`：手动指定容器对象

容器对象内容必须为空，在调用构造函数的同时，`krich` 会自动向容器对象中写入 html 并完成 `krich` 的初始化。

### disconnect

用于注销 `krich`，`krich` 会在 `document` 对象上注册事件，如果您的网站为单页应用且转移页面后需要重新初始化或移除 `krich`，则必须调用该函数以移除 `krich` 注册的事件监听器。

### setHistorySize

用于设置历史记录功能最多存储的步数，默认为 25。 注意该值不要设置的过大，否则可能会导致极大的内存占用。

参数类型：`number`

调用示例：

```javascript
krich.setHistorySize(25)
```

### setImgStatusChecker

用于检查拉取到的图片是否可用。

当用户通过 URL 插入图片时，`krich` 会检查插入的图片是否可以访问，内置的检查算法仅检查状态码，但是部分图床在遇到错误时（404、403 等）也会返回 200，同时通过其它方法传递错误信息，该函数允许用户添加自定义的检查算法。

参数类型：`function(response: Response): boolean`

调用示例：

```javascript
krich.setImgStatusChecker(response => !response.url.includes('403'))
```

### setImgMapper

用于设置图片映射器。

当用户通过本地上传的方法插入图片时，`krich` 会直接将 base64 存储到 html 中，当使用代码导出 html 数据时，`krich` 会尝试将使用 base64 编码的图片转换为 `url`。

该函数就是用于将 base64 转换为 `url`，注意该函数应当返回一个完整的、可访问的 URL，同时应当满足以下特征：

1. 唯一性：对于不同的 base64 数据，应当返回不同的结果
2. 不变性：对于相同的 base64 数据，多次调用应当返回相同的结果
3. 可控性：返回的 URL 长度应当可控，在大部分浏览器允许的长度范围内

注意：不应当在该函数内处理图片的上传操作！

参数类型：`function(data: string): string|Promise<string>`

调用示例：

```javascript
krich.setImgMapper(data => `https://example.com/img/${md5(data)}`)
```

### setHighlight

用于设置实现代码高亮的函数。

krich 内置了代码块的支持，但并没有实现代码高亮的功能，需要自行通过该函数设置相应的支持。

规定：`pre` 使用 `class` 记录当前代码块的高亮类型，格式为：`language-[value]`，`value` 的含义见下文。

参数类型：

+ `highlighter`: `function(pre: Element): Promise<void>`
    该参数用于实现代码高亮，其接收的 `pre` 对象为准备进行高亮的代码块的对象，该函数应当直接修改 `pre` 中的值（不要将 `pre` 从 DOM 中移除或修改其在 DOM 中的位置）。
    注意：
    - `pre` 中一定有且只有一个 `code` 标签，请勿将该标签移除。
    - 函数应当在完成高亮后再返回
+ `languages`: `function(): Array<[name: string, value: string]>`
    该参数用于获取代码高亮支持的语言列表，返回的每个一维数组中下标为 0 的值表示显示在浏览器页面中的语言名称，下表为 1 的值表示代码层面表示语言名称的值。
    注意：
    - 为了方便更新语言支持列表，`krich` 不会缓存该函数的返回值
    - `krich` 不会对返回的列表进行去重，注意不要返回重复的数据
    - 返回的 `value` 值 `krich` 会统一添加 `language-` 前缀

调用示例：

```javascript
krich.setHighlight(
    async pre => {
        const code = pre.firstChild
        const content = code.textContent
        const result = await doSomething(content)
        code.innerHTML = result
    },
    () => [
        ['普通文本', 'txt'],
        ['JavaScript', 'js'],
        ['Kotlin', 'kt']
    ]
)
```

### exportData

用于导出编辑器数据（无参）。

返回值类型：

```typescript
Promise<{
    html: Element,
    image?: {
        upload: Map<string, string>,
        remove: Set<string>
    }
}>
```

其中 `html` 的是编辑区 HTML 的拷贝，可以使用 `innerHTML` 读取字符串格式的 HTML。

`image` 用于标记需要上传和需要删除的图片信息，对于 `upload`，使用 `key` 表示 URL，`value` 表示 base64 数据；对于 `remove`，存储的是需要删除的图片的 URL 列表。

`remove` 信息是通过导入的数据计算出来的，若一个 URL 在导入的数据中存在而在导出的数据中不存在，则会将其放置到 `remove` 中。

### importData

用于导入已有的数据。

参数类型：`string`

注意：该函数仅允许在编辑区域为空时使用！

调用示例：

```javascript
krich.importData('<p>hello world</p>')
```