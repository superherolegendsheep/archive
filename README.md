# 个人文字站

这是一个适合 GitHub Pages 的静态个人博客，适合放原创文字、Markdown 文章和 HTML 排版作品。

## 现在有的功能

- 个人简介侧栏
- 点击进入完整身份页
- 头像显示
- 作品集分类
- 标签筛选
- 文章分页和跳转
- 点击进入文章阅读页
- 阅读页底部显示所属作品集和标签
- 点赞按钮
- Giscus 评论接入口
- 本地博客管理工具 `admin.html`
- 文章公开 / 草稿隐藏
- 从目录中删除文章记录

## 重要说明：私密文章

GitHub Pages 是公开静态网站。  
如果你的仓库是公开的，“仅自己可见草稿”只能做到不在首页显示，不能做到真正加密。

如果你把文章文件上传到公开仓库，知道文件地址的人仍然可能访问。真正私密需要：

- 使用私有仓库；
- 或者使用带登录权限的后端；
- 或者不要把私密文章文件上传到公开仓库。

## 推荐仓库结构

长期建议使用这个结构：

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

不过当前代码也兼容你把这些文件放在仓库根目录：

```text
app.js
admin.js
styles.css
posts.json
welcome.md
html-layout-demo.html
```

## 使用管理工具

打开：

```text
https://你的用户名.github.io/仓库名/admin.html
```

例如：

```text
https://superherolegendsheep.github.io/archive/admin.html
```

### 本次更新后要上传的文件

如果你的仓库继续使用根目录结构，请上传并覆盖：

```text
index.html
admin.html
app.js
admin.js
styles.css
site.config.js
README.md
```

如果你也保留 `assets/` 文件夹，请同时上传：

```text
assets/app.js
assets/admin.js
assets/styles.css
```

管理工具生成的文件可以先放到本地工作区的 `exports/` 文件夹，再上传到 GitHub。浏览器不能强制指定下载目录，所以下载后需要你手动移动到 `exports/` 或直接上传到仓库。

### 改个人信息、头像、颜色

1. 打开 `admin.html`。
2. 进入“站点信息”。
3. 填写昵称、简介、身份、完整身份页正文。
4. 上传头像。
5. 选择主题颜色。
6. 点击“生成 site.config.js”。
7. 下载 `site.config.js`。
8. 上传到 GitHub 仓库并覆盖旧文件。

### 新增文章

1. 打开 `admin.html`。
2. 进入“新增文章”。
3. 填标题、日期、标签、作品集、可见性。
4. 直接粘贴正文，或选择 `.html` / `.md` / `.txt` / `.docx` 文件。
5. 点击“生成文章文件和 posts.json”。
6. 下载文章文件。
7. 下载新的 `posts.json`。
8. 把这两个文件上传到 GitHub 仓库。

HTML 文章文件上传后也可以被读者直接打开，例如：

```text
https://superherolegendsheep.github.io/archive/文章文件名.html
```

如果想让管理工具直接上传到 GitHub，进入“上传 GitHub”，临时填写 fine-grained token。token 需要给 `superherolegendsheep/archive` 仓库 `Contents: Read and write` 权限。

### 管理标签

1. 打开 `admin.html`。
2. 进入“管理标签”。
3. 修改标签名称，或勾选删除。
4. 点击“生成更新后的 posts.json”。
5. 下载并上传覆盖 GitHub 里的 `posts.json`。

### 删除或隐藏文章

1. 打开 `admin.html`。
2. 进入“管理文章”。
3. 想隐藏就把可见性改成“仅自己可见草稿”。
4. 想删除就勾选“删除”。
5. 点击“生成更新后的 posts.json”。
6. 下载并上传覆盖 GitHub 里的 `posts.json`。

删除文章记录后，首页不会再显示它。  
如果你也想彻底删除文件，需要在 GitHub 仓库里手动删除对应的 `.md` 或 `.html` 文件。

## GitHub Pages 设置

1. 打开仓库 `Settings`。
2. 找到 `Pages`。
3. `Build and deployment` 选择 `Deploy from a branch`。
4. Branch 选择 `main`。
5. 文件夹选择 `/ (root)`。
6. 保存。

网站地址通常是：

```text
https://你的用户名.github.io/仓库名/
```
