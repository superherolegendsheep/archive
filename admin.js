window.__BLOG_ADMIN_LOADED__ = true;

const config = window.BLOG_CONFIG;
let posts = [];
let avatarData = config.site.avatar || "";
let generatedFileName = "";

const $ = (selector) => document.querySelector(selector);

const fields = {
  siteTitle: $("#site-title-input"),
  tagline: $("#site-tagline-input"),
  identity: $("#profile-identity-input"),
  location: $("#profile-location-input"),
  content: $("#profile-content-input"),
  github: $("#github-input"),
  email: $("#email-input"),
  theme: $("#theme-input"),
  about: $("#about-input"),
  collections: $("#collections-input"),
  avatar: $("#avatar-input"),
  avatarPreview: $("#avatar-preview"),
  configOutput: $("#config-output"),
  postTitle: $("#post-title"),
  postDate: $("#post-date"),
  postTags: $("#post-tags"),
  postCollection: $("#post-collection"),
  postVisibility: $("#post-visibility"),
  postType: $("#post-type"),
  postFile: $("#post-file"),
  postBody: $("#post-body"),
  fileOutput: $("#file-output"),
  manifestOutput: $("#manifest-output"),
  managedOutput: $("#managed-output"),
  postManageList: $("#post-manage-list")
};

init();

async function init() {
  bindTabs();
  fillSiteForm();
  fields.postDate.valueAsDate = new Date();
  await loadPosts();
  fillCollectionSelect();
  renderManageList();
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
  fields.siteTitle.value = config.site.title || "";
  fields.tagline.value = config.site.tagline || "";
  fields.identity.value = config.site.profile["身份"] || "";
  fields.location.value = config.site.profile["坐标"] || "";
  fields.content.value = config.site.profile["内容"] || "";
  fields.github.value = config.site.links.find((link) => link.label === "GitHub")?.url || "";
  fields.email.value = (config.site.links.find((link) => link.label === "Email")?.url || "").replace("mailto:", "");
  fields.theme.value = config.theme || "sage";
  fields.about.value = config.site.about || "";
  fields.collections.value = (config.collections || [])
    .map((collection) => `${collection.id} | ${collection.title} | ${collection.description || ""}`)
    .join("\n");
  renderAvatarPreview();
}

async function loadPosts() {
  const response = await fetchFirst(["./posts/posts.json", "./posts.json"]);
  posts = response.ok ? await response.json() : [];
}

function fillCollectionSelect() {
  fields.postCollection.innerHTML = parseCollections()
    .map((collection) => `<option value="${escapeAttribute(collection.id)}">${escapeHtml(collection.title)}</option>`)
    .join("");
}

function bindEvents() {
  $("#build-config").addEventListener("click", buildConfig);
  $("#download-config").addEventListener("click", () => downloadText("site.config.js", fields.configOutput.value));
  $("#build-post").addEventListener("click", buildPost);
  $("#download-post").addEventListener("click", () => downloadText(generatedFileName, fields.fileOutput.value));
  $("#download-posts-json").addEventListener("click", () => downloadText("posts.json", fields.manifestOutput.value));
  $("#build-managed-posts").addEventListener("click", buildManagedPosts);
  $("#download-managed-posts").addEventListener("click", () => downloadText("posts.json", fields.managedOutput.value));
  fields.avatar.addEventListener("change", readAvatar);
  fields.postFile.addEventListener("change", readPostFile);
  fields.collections.addEventListener("input", fillCollectionSelect);
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

async function readPostFile() {
  const file = fields.postFile.files[0];
  if (!file) return;
  fields.postBody.value = await file.text();
  fields.postTitle.value ||= file.name.replace(/\.[^.]+$/, "");
  fields.postType.value = file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm")
    ? "html"
    : "markdown";
}

function buildConfig() {
  const nextConfig = {
    theme: fields.theme.value,
    postsPerPage: config.postsPerPage || 5,
    site: {
      title: fields.siteTitle.value.trim(),
      tagline: fields.tagline.value.trim(),
      avatar: avatarData,
      aboutTitle: "关于我",
      about: fields.about.value.trim(),
      profile: {
        "身份": fields.identity.value.trim(),
        "坐标": fields.location.value.trim(),
        "内容": fields.content.value.trim()
      },
      links: [
        { label: "GitHub", url: fields.github.value.trim() },
        { label: "Email", url: `mailto:${fields.email.value.trim()}` }
      ]
    },
    collections: parseCollections(),
    comments: config.comments,
    themes: config.themes
  };

  fields.configOutput.value = `window.BLOG_CONFIG = ${JSON.stringify(nextConfig, null, 2)};\n`;
}

async function buildPost() {
  const title = fields.postTitle.value.trim();
  const body = fields.postBody.value.trim();
  if (!title || !body) {
    alert("请至少填写标题和正文。");
    return;
  }

  const date = fields.postDate.value || new Date().toISOString().slice(0, 10);
  const extension = fields.postType.value === "html" ? "html" : "md";
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
    type: fields.postType.value
  };

  const nextPosts = [nextPost, ...posts.filter((post) => post.id !== id)];
  fields.fileOutput.value = body;
  fields.manifestOutput.value = JSON.stringify(nextPosts, null, 2);
}

function renderManageList() {
  fields.postManageList.innerHTML = posts
    .map((post) => {
      return `
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
      `;
    })
    .join("");
}

function buildManagedPosts() {
  const nextPosts = posts
    .filter((post) => !document.querySelector(`[data-manage-delete="${cssEscape(post.id)}"]`)?.checked)
    .map((post) => ({
      ...post,
      visibility: document.querySelector(`[data-manage-visibility="${cssEscape(post.id)}"]`)?.value || "public"
    }));

  fields.managedOutput.value = JSON.stringify(nextPosts, null, 2);
}

function parseCollections() {
  return fields.collections.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, title, description = ""] = line.split("|").map((part) => part.trim());
      return { id: slugify(id), title: title || id, description };
    });
}

function getCollectionTitle(id) {
  return parseCollections().find((collection) => collection.id === id)?.title || "未归档";
}

function splitTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "") || `post-${Date.now()}`;
}

function buildSummary(content) {
  return content
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`[\]()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
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
