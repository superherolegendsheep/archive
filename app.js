const config = window.BLOG_CONFIG;
window.__BLOG_APP_LOADED__ = true;
const state = {
  posts: [],
  filtered: [],
  page: 1,
  activePost: null,
  activeTag: "all"
};

const els = {
  siteTitle: document.querySelector("#site-title"),
  siteTagline: document.querySelector("#site-tagline"),
  profileList: document.querySelector("#profile-list"),
  profileLinks: document.querySelector("#profile-links"),
  search: document.querySelector("#search-input"),
  tagFilterList: document.querySelector("#tag-filter-list"),
  postList: document.querySelector("#post-list"),
  reader: document.querySelector("#reader"),
  readerDate: document.querySelector("#reader-date"),
  readerTitle: document.querySelector("#reader-title"),
  readerTags: document.querySelector("#reader-tags"),
  readerBody: document.querySelector("#reader-body"),
  closeReader: document.querySelector("#close-reader"),
  likeButton: document.querySelector("#like-button"),
  commentsBox: document.querySelector("#comments-box"),
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

  els.profileList.innerHTML = Object.entries(config.site.profile)
    .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");

  els.profileLinks.innerHTML = config.site.links
    .map((link) => `<a href="${escapeAttribute(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`)
    .join("");
}

async function loadPosts() {
  const response = await fetchFirst(["./posts/posts.json", "./posts.json"]);
  if (!response.ok) {
    throw new Error("posts.json not found");
  }
  const posts = await response.json();
  state.posts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  renderTagFilters();
  filterPosts();
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

function updateTagFilterState() {
  document.querySelectorAll("[data-tag-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tagFilter === state.activeTag);
  });
}

function getPageCount() {
  return Math.max(1, Math.ceil(state.filtered.length / config.postsPerPage));
}

function renderList() {
  const pageCount = getPageCount();
  state.page = Math.min(Math.max(state.page, 1), pageCount);
  const start = (state.page - 1) * config.postsPerPage;
  const visiblePosts = state.filtered.slice(start, start + config.postsPerPage);

  els.reader.hidden = true;
  els.postList.hidden = false;
  document.querySelector(".pagination").hidden = false;

  els.postList.innerHTML = visiblePosts.length
    ? visiblePosts.map(renderPostCard).join("")
    : `<p class="muted">没有找到文章。可以换一个关键词或标签试试。</p>`;

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

  return `
    <article class="post-card">
      <div class="post-meta">
        <span class="eyebrow">${formatDate(post.date)}</span>
        <div class="tag-row">${tags}</div>
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p class="muted">${escapeHtml(post.summary || "")}</p>
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
  state.activePost = post;

  els.postList.hidden = true;
  document.querySelector(".pagination").hidden = true;
  els.reader.hidden = false;
  els.readerDate.textContent = formatDate(post.date);
  els.readerTitle.textContent = post.title;
  els.readerTags.innerHTML = (post.tags || [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");
  els.readerBody.innerHTML = post.type === "html" ? source : markdownToHtml(source);
  renderLike(post.id);
  renderComments(post);
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (!config.comments.enabled) {
    els.commentsBox.innerHTML = `<p class="muted">评论区已预留。配置 Giscus 后，这里会显示 GitHub Discussions 评论。</p>`;
    return;
  }

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

function filterPosts() {
  const keyword = els.search.value.trim().toLowerCase();
  state.filtered = state.posts.filter((post) => {
    const tagMatched = state.activeTag === "all" || (post.tags || []).includes(state.activeTag);
    const haystack = [post.title, post.summary, post.date, ...(post.tags || [])].join(" ").toLowerCase();
    return tagMatched && haystack.includes(keyword);
  });
  updateTagFilterState();
  renderList();
}

function goToPage(page) {
  state.page = Number.isFinite(page) ? page : 1;
  renderList();
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
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
document.addEventListener("click", (event) => {
  const tagButton = event.target.closest("[data-tag-card]");
  if (!tagButton) return;
  state.activeTag = tagButton.dataset.tagCard;
  state.page = 1;
  filterPosts();
});

applyTheme();
renderProfile();
loadPosts().catch(() => {
  els.postList.innerHTML = `
    <p class="muted">
      文章加载失败。请确认 GitHub 仓库里已经上传了 posts/posts.json、posts 文件夹里的文章，以及 assets 文件夹。
    </p>
  `;
});
