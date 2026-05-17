window.__BLOG_ADMIN_LOADED__ = true;

const config = window.BLOG_CONFIG;
let posts = [];
let avatarData = config.site.avatar || "";
let collections = (config.collections || []).map((collection) => ({ cover: "", ...collection }));
let generatedFileName = "";
let generatedPostsJson = "";

const $ = (selector) => document.querySelector(selector);

const fields = {
  siteTitle: $("#site-title-input"),
  tagline: $("#site-tagline-input"),
  identity: $("#profile-identity-input"),
  location: $("#profile-location-input"),
  content: $("#profile-content-input"),
  theme: $("#theme-input"),
  commentEmail: $("#comment-email-input"),
  commentGithub: $("#comment-github-input"),
  about: $("#about-input"),
  avatar: $("#avatar-input"),
  avatarPreview: $("#avatar-preview"),
  configOutput: $("#config-output"),
  collectionManageList: $("#collection-manage-list"),
  collectionsOutput: $("#collections-output"),
  postTitle: $("#post-title"),
  postDate: $("#post-date"),
  postTags: $("#post-tags"),
  postCollection: $("#post-collection"),
  postVisibility: $("#post-visibility"),
  postFile: $("#post-file"),
  postBody: $("#post-body"),
  postPreview: $("#post-preview"),
  fileOutput: $("#file-output"),
  manifestOutput: $("#manifest-output"),
  managedOutput: $("#managed-output"),
  tagOutput: $("#tag-output"),
  postManageList: $("#post-manage-list"),
  tagManageList: $("#tag-manage-list")
};

init();

async function init() {
  bindTabs();
  fillSiteForm();
  fields.postDate.valueAsDate = new Date();
  await loadPosts();
  renderCollectionManager();
  fillCollectionSelect();
  renderManageList();
  renderTagManageList();
  bindEvents();
}

function bindTabs() {
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-admin-tab]").forEach((tab) => tab.classList.remove("is-active"));
      document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.adminPanel !== button.dataset.adminTab;
      });
      button.classList.add("is-active");
    });
  });
}

function fillSiteForm() {
  const profileValues = Object.values(config.site.profile || {});
  fields.siteTitle.value = config.site.title || "";
  fields.tagline.value = config.site.tagline || "";
  fields.identity.value = config.site.profile?.["身份"] || profileValues[0] || "";
  fields.location.value = config.site.profile?.["坐标"] || profileValues[1] || "";
  fields.content.value = config.site.profile?.["内容"] || profileValues[2] || "";
  fields.theme.value = config.theme || "sage";
  fields.commentEmail.value = config.customComments?.email || "";
  fields.commentGithub.value = config.customComments?.githubIssueUrl || "https://github.com/superherolegendsheep/archive/issues/new";
  fields.about.value = cleanEditableAbout(config.site.about || "");
  renderAvatarPreview();
}

async function loadPosts() {
  const response = await fetchFirst(["./posts.json", "./posts/posts.json"]);
  posts = response.ok ? await response.json() : [];
}

function bindEvents() {
  $("#build-config").addEventListener("click", () => writeConfigOutput(fields.configOutput));
  $("#download-config").addEventListener("click", () => downloadText("site.config.js", fields.configOutput.value));
  $("#add-collection").addEventListener("click", addCollection);
  $("#build-collections-config").addEventListener("click", () => writeConfigOutput(fields.collectionsOutput));
  $("#download-collections-config").addEventListener("click", () => downloadText("site.config.js", fields.collectionsOutput.value));
  $("#preview-post").addEventListener("click", renderPostPreview);
  $("#build-post").addEventListener("click", buildPost);
  $("#download-post").addEventListener("click", () => downloadText(generatedFileName, fields.fileOutput.value));
  $("#download-posts-json").addEventListener("click", () => downloadText("posts.json", fields.manifestOutput.value));
  $("#build-managed-posts").addEventListener("click", buildManagedPosts);
  $("#download-managed-posts").addEventListener("click", () => downloadText("posts.json", fields.managedOutput.value));
  $("#build-managed-tags").addEventListener("click", buildManagedTags);
  $("#download-tag-posts").addEventListener("click", () => downloadText("posts.json", fields.tagOutput.value));
  fields.avatar.addEventListener("change", readAvatar);
  fields.postFile.addEventListener("change", readPostFile);
}

async function readAvatar() {
  const file = fields.avatar.files[0];
  if (!file) return;
  avatarData = await readAsDataUrl(file);
  renderAvatarPreview();
}

function renderAvatarPreview() {
  fields.avatarPreview.innerHTML = avatarData
    ? `<img src="${escapeAttribute(avatarData)}" alt="头像预览" />`
    : `<span>还没有头像</span>`;
}

function renderCollectionManager() {
  fields.collectionManageList.innerHTML = collections
    .map((collection, index) => `
      <article class="manage-row collection-manage-row">
        <div>
          <strong>${escapeHtml(collection.title || "未命名作品集")}</strong>
          <span>${escapeHtml(collection.id || "no-id")}</span>
        </div>
        <label>id<input data-collection-id="${index}" type="text" value="${escapeAttribute(collection.id || "")}" /></label>
        <label>标题<input data-collection-title="${index}" type="text" value="${escapeAttribute(collection.title || "")}" /></label>
        <label class="wide-label">简介<textarea data-collection-description="${index}">${escapeHtml(collection.description || "")}</textarea></label>
        <label class="wide-label">封面<input data-collection-cover="${index}" type="file" accept="image/*" /></label>
        <div class="collection-cover-preview">${collection.cover ? `<img src="${escapeAttribute(collection.cover)}" alt="" />` : "无封面"}</div>
        <label class="delete-check">
          <input type="checkbox" data-collection-delete="${index}" />
          删除
        </label>
      </article>
    `)
    .join("");

  fields.collectionManageList.querySelectorAll("[data-collection-cover]").forEach((input) => {
    input.addEventListener("change", async () => {
      const index = Number(input.dataset.collectionCover);
      const file = input.files[0];
      if (!file) return;
      collections[index].cover = await readAsDataUrl(file);
      renderCollectionManager();
    });
  });
}

function addCollection() {
  collections.push({
    id: `collection-${collections.length + 1}`,
    title: "新作品集",
    description: "",
    cover: ""
  });
  renderCollectionManager();
  fillCollectionSelect();
}

function collectCollectionsFromForm() {
  collections = collections
    .map((collection, index) => ({
      id: slugify(document.querySelector(`[data-collection-id="${index}"]`)?.value || collection.id),
      title: document.querySelector(`[data-collection-title="${index}"]`)?.value.trim() || collection.title,
      description: document.querySelector(`[data-collection-description="${index}"]`)?.value.trim() || "",
      cover: collection.cover || ""
    }))
    .filter((_, index) => !document.querySelector(`[data-collection-delete="${index}"]`)?.checked);
  fillCollectionSelect();
}

function fillCollectionSelect() {
  fields.postCollection.innerHTML = collections
    .map((collection) => `<option value="${escapeAttribute(collection.id)}">${escapeHtml(collection.title)}</option>`)
    .join("");
}

async function readPostFile() {
  const file = fields.postFile.files[0];
  if (!file) return;
  fields.postTitle.value ||= file.name.replace(/\.[^.]+$/, "");
  fields.postBody.value = await readArticleFile(file);
  renderPostPreview();
}

async function readArticleFile(file) {
  if (file.name.toLowerCase().endsWith(".docx")) {
    return extractDocxText(await file.arrayBuffer());
  }
  return file.text();
}

function buildConfigObject() {
  collectCollectionsFromForm();
  return {
    theme: fields.theme.value,
    postsPerPage: config.postsPerPage || 5,
    site: {
      title: fields.siteTitle.value.trim(),
      tagline: fields.tagline.value.trim(),
      avatar: avatarData,
      aboutTitle: "关于我",
      about: cleanEditableAbout(fields.about.value),
      profile: {
        "身份": fields.identity.value.trim(),
        "坐标": fields.location.value.trim(),
        "内容": fields.content.value.trim()
      },
      links: []
    },
    collections,
    comments: config.comments,
    customComments: {
      enabled: true,
      email: fields.commentEmail.value.trim(),
      githubIssueUrl: fields.commentGithub.value.trim()
    },
    themes: config.themes
  };
}

function writeConfigOutput(target) {
  target.value = `window.BLOG_CONFIG = ${JSON.stringify(buildConfigObject(), null, 2)};\n`;
}

function renderPostPreview() {
  const body = fields.postBody.value.trim();
  if (!body) {
    fields.postPreview.innerHTML = `<p class="muted">正文为空。</p>`;
    return;
  }
  fields.postPreview.innerHTML = looksLikeHtml(body) ? body : markdownToHtml(body);
}

function buildPost() {
  const title = fields.postTitle.value.trim();
  const body = fields.postBody.value.trim();
  if (!title || !body) {
    alert("请至少填写标题和正文。");
    return;
  }

  const date = fields.postDate.value || new Date().toISOString().slice(0, 10);
  const sourceName = fields.postFile.files[0]?.name.toLowerCase() || "";
  const isHtml = sourceName.endsWith(".html") || sourceName.endsWith(".htm") || looksLikeHtml(body);
  const extension = isHtml ? "html" : "md";
  const id = slugify(`${date}-${title}`);
  generatedFileName = `${id}.${extension}`;

  const nextPost = {
    id,
    title,
    date,
    tags: splitTags(fields.postTags.value),
    collection: fields.postCollection.value,
    visibility: fields.postVisibility.value,
    summary: buildSummary(body),
    file: generatedFileName,
    type: isHtml ? "html" : "markdown"
  };

  const nextPosts = [nextPost, ...posts.filter((post) => post.id !== id)];
  generatedPostsJson = JSON.stringify(nextPosts, null, 2);
  fields.fileOutput.value = body;
  fields.manifestOutput.value = generatedPostsJson;
}

function renderManageList() {
  fields.postManageList.innerHTML = posts
    .map((post) => `
      <article class="manage-row">
        <div>
          <strong>${escapeHtml(post.title)}</strong>
          <span>${escapeHtml(post.date)} · ${escapeHtml(getCollectionTitle(post.collection))}</span>
        </div>
        <label>
          可见性
          <select data-manage-visibility="${escapeAttribute(post.id)}">
            <option value="public" ${post.visibility !== "private" ? "selected" : ""}>公开显示</option>
            <option value="private" ${post.visibility === "private" ? "selected" : ""}>仅自己可见草稿</option>
          </select>
        </label>
        <label class="delete-check">
          <input type="checkbox" data-manage-delete="${escapeAttribute(post.id)}" />
          删除
        </label>
      </article>
    `)
    .join("");
}

function buildManagedPosts() {
  const nextPosts = posts
    .filter((post) => !document.querySelector(`[data-manage-delete="${cssEscape(post.id)}"]`)?.checked)
    .map((post) => ({
      ...post,
      visibility: document.querySelector(`[data-manage-visibility="${cssEscape(post.id)}"]`)?.value || "public"
    }));

  generatedPostsJson = JSON.stringify(nextPosts, null, 2);
  fields.managedOutput.value = generatedPostsJson;
}

function renderTagManageList() {
  const tags = [...new Set(posts.flatMap((post) => post.tags || []))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  fields.tagManageList.innerHTML = tags
    .map((tag) => `
      <article class="manage-row">
        <div>
          <strong>${escapeHtml(tag)}</strong>
          <span>${posts.filter((post) => (post.tags || []).includes(tag)).length} 篇文章</span>
        </div>
        <label>
          新名称
          <input data-tag-rename="${escapeAttribute(tag)}" type="text" value="${escapeAttribute(tag)}" />
        </label>
        <label class="delete-check">
          <input type="checkbox" data-tag-delete="${escapeAttribute(tag)}" />
          删除
        </label>
      </article>
    `)
    .join("");
}

function buildManagedTags() {
  const tags = [...new Set(posts.flatMap((post) => post.tags || []))];
  const renameMap = new Map();
  const deleteSet = new Set();

  tags.forEach((tag) => {
    const renameValue = document.querySelector(`[data-tag-rename="${cssEscape(tag)}"]`)?.value.trim() || tag;
    const shouldDelete = document.querySelector(`[data-tag-delete="${cssEscape(tag)}"]`)?.checked;
    if (shouldDelete) {
      deleteSet.add(tag);
    } else {
      renameMap.set(tag, renameValue);
    }
  });

  const nextPosts = posts.map((post) => ({
    ...post,
    tags: [...new Set((post.tags || []).filter((tag) => !deleteSet.has(tag)).map((tag) => renameMap.get(tag) || tag))]
  }));

  generatedPostsJson = JSON.stringify(nextPosts, null, 2);
  fields.tagOutput.value = generatedPostsJson;
}

function getCollectionTitle(id) {
  return collections.find((collection) => collection.id === id)?.title || "未归档";
}

function splitTags(value) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "") || `post-${Date.now()}`;
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function markdownToHtml(markdown) {
  return cleanEditableAbout(markdown)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${inlineMarkdown(line)}</p>`)
    .join("");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function cleanEditableAbout(value) {
  return String(value)
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/^<p>/i, "")
    .replace(/<\/p>$/i, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^markdown\s*$/gim, "")
    .replace(/<[^>]+>/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function buildSummary(content) {
  return content
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`[\]()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

async function extractDocxText(arrayBuffer) {
  const files = await unzip(arrayBuffer);
  const documentXml = files.get("word/document.xml");
  if (!documentXml) {
    throw new Error("没有在 Word 文件中找到正文。");
  }
  return documentXml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function unzip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder();
  const files = new Map();
  let offset = 0;

  while (offset < bytes.length - 30) {
    if (readUint32(bytes, offset) !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const method = readUint16(bytes, offset + 8);
    const compressedSize = readUint32(bytes, offset + 18);
    const nameLength = readUint16(bytes, offset + 26);
    const extraLength = readUint16(bytes, offset + 28);
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = bytes.slice(dataStart, dataStart + compressedSize);

    if (name && !name.endsWith("/")) {
      if (method === 0) {
        files.set(name, decoder.decode(data));
      } else if (method === 8 && "DecompressionStream" in window) {
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        files.set(name, decoder.decode(await new Response(stream).arrayBuffer()));
      }
    }
    offset = dataStart + compressedSize;
  }
  return files;
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function downloadText(filename, content) {
  if (!content || !filename) {
    alert("请先生成内容。");
    return;
  }
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fetchFirst(paths) {
  for (const path of paths) {
    const response = await fetch(path);
    if (response.ok) return response;
  }
  return new Response("", { status: 404 });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function cssEscape(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
