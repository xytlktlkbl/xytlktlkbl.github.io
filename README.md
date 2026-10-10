# cici · Academic homepage

A static academic homepage with Markdown-powered **Writing**: **Reading Notes** and **Blog**. No database or upload dashboard is needed. GitHub Actions builds and deploys the site whenever you push to `main`.

## 首次部署到 GitHub Pages

1. 创建公开仓库。若想使用 `https://你的用户名.github.io/`，仓库名必须是 `你的用户名.github.io`；普通仓库会使用 `https://你的用户名.github.io/仓库名/`。
2. 将本项目的**内容**放在仓库根目录（不要再套一层项目文件夹），包括 `.github/workflows/pages.yml`、`package.json`、`package-lock.json`、`site/`、`scripts/`、`tests/` 和 `content/`。默认分支使用 `main`；若用其他分支，请修改工作流中的 `branches`。
3. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 推送一次提交，或在 **Actions → Deploy academic homepage → Run workflow** 手动运行。
5. 工作流成功后，打开部署记录中的网址。部署失败时，之前成功发布的网站不会被替换；可在 Actions 查看带文件名的错误信息。

工作流自动识别根域名和仓库子路径，无需手动修改文章、样式或图片链接。发布目录是 `dist/`，不要选择 Deploy from a branch，也不需要提交构建产物。

参考：[GitHub Pages 官方自定义工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 日常写作：只需要上传 Markdown

把 `.md` 文件放入 `content/writing/`，提交到 `main`。也可以直接在 GitHub 的这个目录使用 **Add file → Upload files** 或 **Create new file**。之后 Actions 会自动构建、发布，浏览器刷新即可看到新文章，无需编辑列表或页面代码。

最简单的文件：

```md
# My paper reading notes

Here are my notes...
```

标题解析顺序：文件头 `title` → 第一个一级标题 `# ...` → 文件名。文件名开头的 `YYYY-MM-DD-` 会作为日期，缺少日期则显示 Undated 并排在有日期的文章之后。没有 `type` 时默认 Reading Notes；没有 `summary` 时自动提取正文第一段。

推荐格式（文件名如 `2026-10-10-my-first-note.md`）：

```md
---
date: 2026-10-10
type: reading-notes
tags: [VLM, Infrastructure]
summary: One sentence describing this note.
draft: false
---

# My first reading note

## Main idea
Your notes...

## My take
Your own interpretation...
```

- `type`：`reading-notes` 或 `blog`。
- `tags`：任意主题标签，例如 VLM、Infrastructure、Robotics。
- `title`：可选，优先于 Markdown 一级标题。
- `date`：可选，严格使用 `YYYY-MM-DD`。
- `draft: true`：不生成文章、不进入首页列表；改成 `false` 后提交即可发布。
- `example: true`：显示示例标记，真实文章不要加这个字段。
- **公开仓库中的草稿文件本身仍是公开的**；`draft` 只控制网站展示，未公开资料请勿上传。

文章按日期倒序排列，自动生成阅读时长和二、三级标题目录。修改内容后直接提交同一文件；删除文件后提交，下一次部署会移除对应页面。改文件名会改变文章网址。

## Markdown 支持

- 标题、列表、引用、链接、表格、图片。
- 带语言名称的代码块自动高亮。
- 行内公式 `$x^2$` 和独立公式 `$$ ... $$`（KaTeX）；美元金额需要转义，如 `\$10`。
- Markdown 原始 HTML 会显示为文本，不会作为脚本或页面元素执行。
- 本地字体、公式样式和代码样式随网站一起打包，不依赖外部 CDN。

### 图片与文章链接

图片放在 `content/assets/`。例如文章在 `content/writing/my-note.md`，插图在 `content/assets/figure.png`：

```md
![Figure description](../assets/figure.png)
[Another note](another-note.md)
[Paper PDF](../assets/paper.pdf)
```

支持子文件夹；相对路径以当前 Markdown 文件所在目录为基准。本地文章链接会自动转换成最终网页地址。不存在的附件或指向草稿的链接会让构建失败，避免发布坏链接。外部链接使用完整的 `https://...` 地址。

## 示例与模板

仓库带两篇明确标记的示例文章，展示两种类型、公式、代码、表格和内部链接。正式使用时可以删除两篇示例，再上传自己的文章；删除其中一篇时，请一并移除另一篇对它的链接。`draft-template.md` 是不会发布的笔记模板。

## 本地预览（可选）

安装 Node.js 22 或更新版本，在项目目录运行：

```sh
npm ci
npm run build
npm run preview
```

浏览器打开终端显示的 `http://127.0.0.1:4173`。每次改 Markdown 后重新运行 `npm run build`，再刷新。请通过这个 HTTP 地址预览；不要直接双击 `dist/index.html`，因为生成后的网页使用网站路径来兼容 GitHub Pages。

`npm test` 检查标题解析、元数据、草稿排除、Markdown 渲染以及根路径和仓库子路径。主页个人资料在 `site/index.html`，样式在 `site/styles.css`，Writing 文章不需要改这些文件。
