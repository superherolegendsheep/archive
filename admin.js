window.__BLOG_ADMIN_LOADED__ = true;

const config = window.BLOG_CONFIG;
let posts = [];
let avatarData = config.site.avatar || "";
let generatedFileName = "";
let generatedFileContent = "";
let generatedPostsJson = "";

const $ = (selector) => document.querySelector(selector);

const fields = {
  siteTitle: $("#site-title-input"),
  tagline: $("#site-tagline-input"),
  identity: $("#profile-identity-input"),
  location: $("#profile-location-input"),
  content: $("#profile-content-input"),
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
  postFile: $("#post-file"),
  postBody: $("#post-body"),
  fileOutput: $("#file-output"),
  manifestOutput: $("#manifest-output"),
  managedOutput: $("#managed-output"),
  tagOutput: $("#tag-output"),
  postManageList: $("#post-manage-list"),
  tagManageList: $("#tag-manage-list"),
  githubOwner: $("#github-owner"),
  githubRepo: $("#github-repo"),
  githubBranch: $("#github-branch"),
  githubToken: $("#github-token"),
  githubOutput: $("#github-output")
};

init();

async function init() {
  bindTabs();
  fillSiteForm();
  fields.postDate.valueAsDate = new Date();
  await loadPosts();
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
  fields.identity.value = getProfileValue("身份", 0, profileValues);
  fields.location.value = getProfileValue("坐标", 1, profileValues);
  fields.content.value = getProfileValue("内容", 2, profileValues);
  fields.theme.value = config.theme || "sage";
  fields.about.value = cleanEditableAbout(config.site.about || "");
  fields.collections.value = (config.collections || [])
    .map((collection) => `${collection.id} | ${collection.title} | ${collection.description || ""}`)
    .join("\n");
  renderAvatarPreview();
}

function getProfileValue(key, index, values) {
  return config.site.profile?.[key] || values[index] || "";
}

async function loadPosts() {
  const response = await fetchFirst(["./posts.json", "./posts/posts.json"]);
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
  $("#build-managed-tags").addEventListener("click", buildManagedTags);
  $("#download-tag-posts").addEventListener("click", () => downloadText("posts.json", fields.tagOutput.value));
  $("#upload-github").addEventListener("click", uploadGeneratedToGitHub);
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
  fields.postTitle.value ||= file.name.replace(/\.[^.]+$/, "");
  fields.postBody.value = await readArticleFile(file);
}

async function readArticleFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    return extractDocxText(await file.arrayBuffer());
  }
  return file.text();
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
      about: normalizeAboutInput(fields.about.value),
      profile: {
        "身份": fields.identity.value.trim(),
        "坐标": fields.location.value.trim(),
        "内容": fields.content.value.trim()
      },
      links: []
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
  const sourceName = fields.postFile.files[0]?.name.toLowerCase() || "";
  const isHtml = sourceName.endsWith(".html") || sourceName.endsWith(".htm") || looksLikeHtml(body);
  const extension = isHtml ? "html" : "md";
  const id = slugify(`${date}-${title}`);
  generatedFileName = `${id}.${extension}`;
  generatedFileContent = isHtml ? body : body;

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
  fields.fileOutput.value = generatedFileContent;
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

async function uploadGeneratedToGitHub() {
  const token = fields.githubToken.value.trim();
  const owner = fields.githubOwner.value.trim();
  const repo = fields.githubRepo.value.trim();
  const branch = fields.githubBranch.value.trim() || "main";

  if (!token || !owner || !repo) {
    setGitHubOutput("请先填写 owner、仓库名和 token。");
    return;
  }
  if (!generatedFileName || !generatedFileContent || !generatedPostsJson) {
    setGitHubOutput("请先在“新增文章”里生成文章文件和 posts.json。");
    return;
  }

  try {
    setGitHubOutput("正在上传文章文件...");
    await putGitHubFile({ owner, repo, branch, token, path: generatedFileName, content: generatedFileContent });
    setGitHubOutput("文章文件已上传，正在上传 posts.json...");
    await putGitHubFile({ owner, repo, branch, token, path: "posts.json", content: generatedPostsJson });
    setGitHubOutput(`上传完成。\n文章直读地址：https://${owner}.github.io/${repo}/${generatedFileName}\n博客地址：https://${owner}.github.io/${repo}/`);
  } catch (error) {
    setGitHubOutput(`上传失败：${error.message}`);
  }
}

async function putGitHubFile({ owner, repo, branch, token, path, content }) {
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const current = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`
    }
  });
  const currentJson = current.ok ? await current.json() : null;

  const response = await fetch(api, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Update ${path}`,
      branch,
      content: toBase64(content),
      sha: currentJson?.sha
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail);
  }
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

function normalizeAboutInput(value) {
  return cleanEditableAbout(value).trim();
}

function cleanEditableAbout(value) {
  return String(value)
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^markdown\s*$/gim, "")
    .trim();
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

function toBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function setGitHubOutput(message) {
  fields.githubOutput.textContent = message;
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
