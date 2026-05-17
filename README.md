# 个人文字站

这是一个适合 GitHub Pages 的静态个人博客初版，风格偏简洁个人页，适合放原创文字、Markdown 文章和 HTML 排版作品。

## 文件结构

```text
.
├── index.html              # 博客首页
├── admin.html              # 本地文章导入工具
├── site.config.js          # 站点资料、主题颜色、评论配置
├── assets/
│   ├── styles.css          # 页面样式
│   ├── app.js              # 首页功能
│   └── admin.js            # 导入工具功能
└── posts/
    ├── posts.json          # 文章清单
    ├── welcome.md          # Markdown 示例
    └── html-layout-demo.html
```

## 更新文章

### 方法一：手动添加

1. 把 `.md` 或 `.html` 文件放到 `posts/`。
2. 打开 `posts/posts.json`，在数组最前面添加一条文章信息。
3. 提交到 GitHub，GitHub Pages 会自动更新。

### 方法二：使用导入工具

1. 本地打开 `admin.html`。
2. 上传 Markdown 或 HTML 文件，填写标题、日期、标签。
3. 下载生成的文章文件，放进 `posts/`。
4. 把工具生成的清单片段添加到 `posts/posts.json`。

GitHub Pages 是静态网站，网页不能直接把文件写回你的 GitHub 仓库；如果未来想做真正的在线后台，需要接入 GitHub API、Netlify CMS、Decap CMS 或自己部署后端。

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

1. 在 GitHub 新建一个公开仓库，例如 `my-writing-site`。
2. 上传这些文件到仓库根目录。
3. 进入仓库 `Settings`。
4. 找到 `Pages`。
5. `Build and deployment` 选择 `Deploy from a branch`。
6. Branch 选择 `main`，文件夹选择 `/root`。
7. 保存后等待部署完成。

如果你想让网址是 `https://你的用户名.github.io/`，仓库名需要设置为 `你的用户名.github.io`。
