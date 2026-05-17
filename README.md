# 个人文字站

这是一个适合 GitHub Pages 的静态个人博客初版，风格偏简洁个人页，适合放原创文字、Markdown 文章和 HTML 排版作品。

## 文件结构

上传到 GitHub 时，请确认这些文件和文件夹都在仓库根目录：

```text
.
├── index.html
├── admin.html
├── site.config.js
├── README.md
├── .nojekyll
├── assets/
│   ├── styles.css
│   ├── app.js
│   └── admin.js
└── posts/
    ├── posts.json
    ├── welcome.md
    └── html-layout-demo.html
```

如果页面变成只有黑白文字、没有排版，通常是 `assets/` 文件夹没有上传成功。  
如果文章列表是空的，通常是 `posts/posts.json` 或 `posts/` 里的文章没有上传成功。

## 给文章打标签

每篇文章的标签写在 `posts/posts.json` 里：

```json
{
  "id": "welcome",
  "title": "欢迎来到我的文字站",
  "date": "2026-05-17",
  "tags": ["随笔", "站点说明"],
  "summary": "这里可以放你的原创文字、排版二创、日记、札记。",
  "file": "posts/welcome.md",
  "type": "markdown"
}
```

首页会自动收集所有文章的 `tags`，生成标签筛选按钮。点击文章卡片上的标签，也会进入对应标签筛选。

## 更新文章

### 方法一：手动添加

1. 把 `.md` 或 `.html` 文件放到 `posts/`。
2. 打开 `posts/posts.json`。
3. 在数组最前面添加一条文章信息。
4. 提交到 GitHub，GitHub Pages 会自动更新。

### 方法二：使用导入工具

1. 本地打开 `admin.html`。
2. 上传 Markdown 或 HTML 文件，填写标题、日期、标签。
3. 下载生成的文章文件，放进 `posts/`。
4. 把工具生成的清单片段添加到 `posts/posts.json`。

GitHub Pages 是静态网站，网页不能直接把文件写回你的 GitHub 仓库；如果未来想做真正的在线后台，需要接入 GitHub API、Decap CMS 或自己部署后端。

## 切换颜色

打开 `site.config.js`，把：

```js
theme: "sage",
```

改成：

```js
theme: "berry",
```

或：

```js
theme: "ink",
```

也可以在 `themes` 里继续添加自己的颜色。

## 评论

推荐使用 Giscus：

1. 在 GitHub 仓库开启 Discussions。
2. 访问 https://giscus.app/ 按提示选择仓库和分类。
3. 把生成的 `repoId`、`categoryId` 等信息填入 `site.config.js`。
4. 把 `comments.enabled` 改成 `true`。

## GitHub Pages 初始设置

1. 在 GitHub 新建一个公开仓库。
2. 如果你想要个人主页网址，仓库名用 `你的用户名.github.io`。
3. 如果你想要项目博客网址，仓库名可以用 `archive`、`writing-blog`、`personal-site`。
4. 把本项目所有文件和文件夹上传到仓库根目录。
5. 进入仓库 `Settings`。
6. 找到 `Pages`。
7. `Build and deployment` 选择 `Deploy from a branch`。
8. Branch 选择 `main`，文件夹选择 `/ (root)`。
9. 保存后等待部署完成。

个人主页网址通常是：

```text
https://你的用户名.github.io/
```

项目博客网址通常是：

```text
https://你的用户名.github.io/仓库名/
```

例如你的截图里是：

```text
https://superherolegendsheep.github.io/archive/
```
