const config = window.BLOG_CONFIG;
window.__BLOG_APP_LOADED__ = true;

const state = {
  posts: [],
  filtered: [],
  page: 1,
  activePost: null,
  activeTag: "all",
  activeCollection: "all"
};

const els = {
  homeView: document.querySelector("#home-view"),
  siteTitle: document.querySelector("#site-title"),
  siteTagline: document.querySelector("#site-tagline"),
  avatar: document.querySelector("#avatar"),
  profileList: document.querySelector("#profile-list"),
  profileLinks: document.querySelector("#profile-links"),
  openAbout: document.querySelector("#open-about"),
  aboutView: document.querySelector("#about-view"),
  aboutTitle: document.querySelector("#about-title"),
  aboutBody: document.querySelector("#about-body"),
  collectionList: document.querySelector("#collection-list"),
  aboutCollectionList: document.querySelector("#about-collection-list"),
  search: document.querySelector("#search-input"),
  tagFilterList: document.querySelector("#tag-filter-list"),
  postList: document.querySelector("#post-list"),
  reader: document.querySelector("#reader"),
  readerDate: document.querySelector("#reader-date"),
  readerTitle: document.querySelector("#reader-title"),
  readerCollection: document.querySelector("#reader-collection"),
  readerTags: document.querySelector("#reader-tags"),
  readerBody: document.querySelector("#reader-body"),
  closeReader: document.querySelector("#close-reader"),
  likeButton: document.querySelector("#like-button"),
  commentsBox: document.querySelector("#comments-box"),
  commentForm: document.querySelector("#custom-comment-form"),
  commentName: document.querySelector("#comment-name"),
  commentQuote: document.querySelector("#comment-quote"),
  commentBody: document.querySelector("#comment-body"),
  commentHelp: document.querySelector("#comment-help"),
  sendCommentEmail: document.querySelector("#send-comment-email"),
  sendCommentGithub: document.querySelector("#send-comment-github"),
  firstPage: document.querySelector("#first-page"),
  prevPage: document.querySelector("#prev-page"),
  nextPage: document.querySelector("#next-page"),
  lastPage: document.querySelector("#last-page"),
  pageInfo: document.querySelector("#page-info"),
  pageJump: document.querySelector("#page-jump"),
  jumpButton: document.querySelector("#jump-button")
};

function applyTheme() {
  const theme = config.themes[config.theme] || config.themes.sage;
  const root = document.documentElement;
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--ink", theme.ink);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--line", theme.line);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-soft", theme.accentSoft);
}

function renderProfile() {
  document.title = config.site.title;
  els.siteTitle.textContent = config.site.title;
  els.siteTagline.textContent = config.site.tagline;
  els.aboutTitle.textContent = config.site.aboutTitle || "关于我";
  els.aboutBody.innerHTML = linesToParagraphs(cleanDisplayText(config.site.about || ""));

  if (config.site.avatar) {
    els.avatar.innerHTML = `<img src="${escapeAttribute(config.site.avatar)}" alt="" />`;
  } else {
    els.avatar.textContent = (config.site.title || "文").slice(0, 1);
  }

  els.profileList.innerHTML = Object.entries(config.site.profile || {})
    .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");

  els.profileLinks.innerHTML = (config.site.links || [])
    .map((link) => `<a href="${escapeAttribute(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`)
    .join("");
}

async function loadPosts() {
  const response = await fetchFirst(["./posts.json", "./posts/posts.json"]);
  if (!response.ok) throw new Error("posts.json not found");
  const posts = await response.json();
  state.posts = posts
    .filter((post) => post.visibility !== "private")
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  renderCollections();
  renderTagFilters();
  filterPosts();
}

function renderCollections() {
  const html = getCollectionsWithCounts().map(renderCollectionCard).join("");
  els.collectionList.innerHTML = html;
  els.aboutCollectionList.innerHTML = html;

  document.querySelectorAll("[data-collection-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCollection = button.dataset.collectionFilter;
      state.page = 1;
      filterPosts();
    });
  });
}

function renderCollectionCard(collection) {
  const cover = collection.cover
    ? `<span class="collection-cover"><img src="${escapeAttribute(collection.cover)}" alt="" /></span>`
    : `<span class="collection-cover collection-cover-empty">${escapeHtml(collection.title.slice(0, 1))}</span>`;
  return `
    <button class="collection-card" type="button" data-collection-filter="${escapeAttribute(collection.id)}">
      ${cover}
      <span class="collection-count">${collection.count}</span>
      <strong>${escapeHtml(collection.title)}</strong>
      <span>${escapeHtml(collection.description || "")}</span>
    </button>
  `;
}

function renderTagFilters() {
  const tags = [...new Set(state.posts.flatMap((post) => post.tags || []))].sort((a, b) =>
    a.localeCompare(b, "zh-CN")
  );

  els.tagFilterList.innerHTML = tags
    .map((tag) => {
      const count = state.posts.filter((post) => (post.tags || []).includes(tag)).length;
      return `<button class="tag-filter-button" type="button" data-tag-filter="${escapeAttribute(tag)}">${escapeHtml(tag)} ${count}</button>`;
    })
    .join("");

  document.querySelectorAll("[data-tag-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTag = button.dataset.tagFilter;
      state.page = 1;
      filterPosts();
    });
  });
}

function updateFilterState() {
  document.querySelectorAll("[data-tag-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tagFilter === state.activeTag);
  });
  document.querySelectorAll("[data-collection-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.collectionFilter === state.activeCollection);
  });
}

function getCollectionsWithCounts() {
  return (config.collections || []).map((collection) => ({
    ...collection,
    count: state.posts.filter((post) => post.collection === collection.id).length
  }));
}

function getCollection(id) {
  return (config.collections || []).find((collection) => collection.id === id) || {
    id: "uncategorized",
    title: "未归档",
    description: "",
    cover: ""
  };
}

function getPageCount() {
  return Math.max(1, Math.ceil(state.filtered.length / config.postsPerPage));
}

function renderList() {
  const pageCount = getPageCount();
  state.page = Math.min(Math.max(state.page, 1), pageCount);
  const start = (state.page - 1) * config.postsPerPage;
  const visiblePosts = state.filtered.slice(start, start + config.postsPerPage);

  showHome();
  els.postList.innerHTML = visiblePosts.length
    ? visiblePosts.map(renderPostCard).join("")
    : `<p class="muted">没有找到文章。可以换一个关键词、标签或作品集试试。</p>`;

  els.pageInfo.textContent = `第 ${state.page} / ${pageCount} 页`;
  els.pageJump.max = pageCount;
  els.pageJump.value = state.page;
  els.firstPage.disabled = state.page === 1;
  els.prevPage.disabled = state.page === 1;
  els.nextPage.disabled = state.page === pageCount;
  els.lastPage.disabled = state.page === pageCount;

  document.querySelectorAll("[data-open-post]").forEach((button) => {
    button.addEventListener("click", () => openPost(button.dataset.openPost));
  });
}

function renderPostCard(post) {
  const tags = (post.tags || [])
    .map((tag) => `<button class="tag" type="button" data-tag-card="${escapeAttribute(tag)}">${escapeHtml(tag)}</button>`)
    .join("");
  const collection = getCollection(post.collection);

  return `
    <article class="post-card">
      <div class="post-meta">
        <span class="eyebrow">${formatDate(post.date)}</span>
        <button class="collection-chip" type="button" data-collection-card="${escapeAttribute(collection.id)}">${escapeHtml(collection.title)}</button>
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p class="muted">${escapeHtml(post.summary || "")}</p>
      <div class="tag-row">${tags}</div>
      <div>
        <button type="button" data-open-post="${escapeAttribute(post.id)}">阅读</button>
      </div>
    </article>
  `;
}

async function openPost(id) {
  const post = state.posts.find((item) => item.id === id);
  if (!post) return;

  const response = await fetchFirst([`./${post.file}`, `./${post.file.replace(/^posts\//, "")}`]);
  if (!response.ok) {
    els.postList.innerHTML = `<p class="muted">这篇文章文件没有找到：${escapeHtml(post.file)}</p>`;
    return;
  }

  const source = await response.text();
  const collection = getCollection(post.collection);
  state.activePost = post;

  els.homeView.hidden = true;
  els.aboutView.hidden = true;
  els.reader.hidden = false;
  els.openAbout.textContent = "完整身份页";
  els.readerDate.textContent = formatDate(post.date);
  els.readerTitle.textContent = post.title;
  els.readerBody.innerHTML = post.type === "html" ? renderHtmlPostFrame(post) : markdownToHtml(source);
  els.readerCollection.innerHTML = `<button class="collection-chip" type="button" data-reader-collection="${escapeAttribute(collection.id)}">${escapeHtml(collection.title)}</button>`;
  els.readerTags.innerHTML = (post.tags || [])
    .map((tag) => `<button class="tag" type="button" data-tag-card="${escapeAttribute(tag)}">${escapeHtml(tag)}</button>`)
    .join("");
  renderLike(post.id);
  renderComments(post);
  renderCustomCommentForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleAbout() {
  if (!els.aboutView.hidden) {
    renderList();
    return;
  }
  els.homeView.hidden = true;
  els.reader.hidden = true;
  els.aboutView.hidden = false;
  els.openAbout.textContent = "返回主页";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHome() {
  els.homeView.hidden = false;
  els.reader.hidden = true;
  els.aboutView.hidden = true;
  els.openAbout.textContent = "完整身份页";
}

function renderLike(id) {
  const key = `blog-like-${id}`;
  const liked = localStorage.getItem(key) === "1";
  els.likeButton.classList.toggle("is-liked", liked);
  els.likeButton.textContent = liked ? "已喜欢 1" : "喜欢 0";
}

function toggleLike() {
  if (!state.activePost) return;
  const key = `blog-like-${state.activePost.id}`;
  if (localStorage.getItem(key) === "1") {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, "1");
  }
  renderLike(state.activePost.id);
}

function renderComments(post) {
  els.commentsBox.innerHTML = "";
  if (!config.comments.enabled) return;

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-repo", config.comments.repo);
  script.setAttribute("data-repo-id", config.comments.repoId);
  script.setAttribute("data-category", config.comments.category);
  script.setAttribute("data-category-id", config.comments.categoryId);
  script.setAttribute("data-mapping", "specific");
  script.setAttribute("data-term", post.id);
  script.setAttribute("data-reactions-enabled", "1");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-theme", "light");
  script.setAttribute("data-lang", "zh-CN");
  els.commentsBox.appendChild(script);
}

function renderHtmlPostFrame(post) {
  const src = `./${post.file}`;
  return `
    <div class="html-post-tools">
      <a href="${escapeAttribute(src)}" target="_blank" rel="noreferrer">新窗口打开原页面</a>
    </div>
    <iframe
      class="html-post-frame"
      src="${escapeAttribute(src)}"
      title="${escapeAttribute(post.title)}"
      loading="lazy"
    ></iframe>
  `;
}

function renderCustomCommentForm() {
  const custom = config.customComments || {};
  if (!custom.enabled) {
    els.commentForm.hidden = true;
    return;
  }

  els.commentForm.hidden = false;
  els.commentName.value = "";
  els.commentQuote.value = "";
  els.commentBody.value = "";

  const hasEmail = Boolean(custom.email);
  const hasGithub = Boolean(custom.githubIssueUrl);
  els.sendCommentEmail.hidden = !hasEmail;
  els.sendCommentGithub.hidden = !hasGithub;
  els.commentHelp.textContent = hasEmail || hasGithub
    ? "引用范围可以不填。提交后会打开邮件或 GitHub 页面，由读者确认发送。"
    : "评论接收方式还没有配置。请在 site.config.js 里填写 customComments.email 或 customComments.githubIssueUrl。";
}

function buildCommentText() {
  const name = els.commentName.value.trim() || "匿名读者";
  const quote = els.commentQuote.value.trim() || "未引用具体范围";
  const body = els.commentBody.value.trim();
  if (!body) {
    alert("请先填写评论内容。");
    return "";
  }

  return [
    `文章：${state.activePost?.title || ""}`,
    `文章文件：${state.activePost?.file || ""}`,
    `读者名称：${name}`,
    `引用范围：${quote}`,
    "",
    "评论内容：",
    body
  ].join("\n");
}

function sendCommentByEmail() {
  const custom = config.customComments || {};
  const text = buildCommentText();
  if (!text || !custom.email) return;
  const subject = `博客评论：${state.activePost?.title || ""}`;
  window.location.href = `mailto:${encodeURIComponent(custom.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

function sendCommentToGithub() {
  const custom = config.customComments || {};
  const text = buildCommentText();
  if (!text || !custom.githubIssueUrl) return;
  const url = new URL(custom.githubIssueUrl);
  url.searchParams.set("title", `博客评论：${state.activePost?.title || ""}`);
  url.searchParams.set("body", text);
  window.open(url.toString(), "_blank", "noreferrer");
}

function filterPosts() {
  const keyword = els.search.value.trim().toLowerCase();
  state.filtered = state.posts.filter((post) => {
    const collection = getCollection(post.collection);
    const collectionMatched = state.activeCollection === "all" || post.collection === state.activeCollection;
    const tagMatched = state.activeTag === "all" || (post.tags || []).includes(state.activeTag);
    const haystack = [post.title, post.summary, post.date, collection.title, ...(post.tags || [])].join(" ").toLowerCase();
    return collectionMatched && tagMatched && haystack.includes(keyword);
  });
  updateFilterState();
  renderList();
}

function goToPage(page) {
  state.page = Number.isFinite(page) ? page : 1;
  renderList();
}

function markdownToHtml(markdown) {
  const lines = cleanDisplayText(markdown).replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listOpen = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listOpen) return;
    html.push("</ul>");
    listOpen = false;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      return;
    }
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      closeList();
      html.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`);
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      closeList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      return;
    }
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      closeList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      return;
    }
    if (trimmed.startsWith("> ")) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      return;
    }
    if (/^- /.test(trimmed)) {
      flushParagraph();
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
      return;
    }
    paragraph.push(trimmed);
  });

  flushParagraph();
  closeList();
  return html.join("\n");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function linesToParagraphs(value) {
  return cleanDisplayText(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${inlineMarkdown(line)}</p>`)
    .join("");
}

function cleanDisplayText(value) {
  return String(value || "")
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/^<p>/i, "")
    .replace(/<\/p>$/i, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^markdown\s*$/gim, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(date));
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

async function fetchFirst(paths) {
  for (const path of paths) {
    const response = await fetch(path);
    if (response.ok) return response;
  }
  return new Response("", { status: 404 });
}

els.search.addEventListener("input", () => {
  state.page = 1;
  filterPosts();
});
els.firstPage.addEventListener("click", () => goToPage(1));
els.prevPage.addEventListener("click", () => goToPage(state.page - 1));
els.nextPage.addEventListener("click", () => goToPage(state.page + 1));
els.lastPage.addEventListener("click", () => goToPage(getPageCount()));
els.jumpButton.addEventListener("click", () => goToPage(Number(els.pageJump.value)));
els.closeReader.addEventListener("click", renderList);
els.likeButton.addEventListener("click", toggleLike);
els.openAbout.addEventListener("click", toggleAbout);
els.sendCommentEmail.addEventListener("click", sendCommentByEmail);
els.sendCommentGithub.addEventListener("click", sendCommentToGithub);

document.addEventListener("click", (event) => {
  const tagButton = event.target.closest("[data-tag-card]");
  if (tagButton) {
    state.activeTag = tagButton.dataset.tagCard;
    state.page = 1;
    filterPosts();
  }

  const collectionButton = event.target.closest("[data-collection-card], [data-reader-collection]");
  if (collectionButton) {
    state.activeCollection = collectionButton.dataset.collectionCard || collectionButton.dataset.readerCollection;
    state.page = 1;
    filterPosts();
  }
});

applyTheme();
renderProfile();
loadPosts().catch(() => {
  els.postList.innerHTML = `
    <p class="muted">
      文章加载失败。请确认 GitHub 仓库里有 posts.json，或有 posts/posts.json。
    </p>
  `;
});
