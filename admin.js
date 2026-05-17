const titleInput = document.querySelector("#post-title");
const dateInput = document.querySelector("#post-date");
const tagsInput = document.querySelector("#post-tags");
const fileInput = document.querySelector("#post-file");
const buildButton = document.querySelector("#build-post");
const fileOutput = document.querySelector("#file-output");
const manifestOutput = document.querySelector("#manifest-output");
const downloadButton = document.querySelector("#download-post");

let generatedFileName = "";

dateInput.valueAsDate = new Date();

function slugify(value) {
  const ascii = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || `post-${Date.now()}`;
}

function buildSummary(content) {
  return content
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`[\]()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

async function buildPost() {
  const file = fileInput.files[0];
  if (!file) {
    alert("请先选择 Markdown 或 HTML 文件。");
    return;
  }

  const title = titleInput.value.trim() || file.name.replace(/\.[^.]+$/, "");
  const date = dateInput.value || new Date().toISOString().slice(0, 10);
  const tags = tagsInput.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const extension = file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm") ? "html" : "md";
  const type = extension === "html" ? "html" : "markdown";
  const id = slugify(`${date}-${title}`);
  generatedFileName = `${id}.${extension}`;
  const content = await file.text();

  fileOutput.value = content;
  manifestOutput.value = JSON.stringify(
    {
      id,
      title,
      date,
      tags,
      summary: buildSummary(content),
      file: `posts/${generatedFileName}`,
      type
    },
    null,
    2
  );
}

function downloadPost() {
  if (!fileOutput.value || !generatedFileName) {
    alert("请先生成仓库内容。");
    return;
  }

  const blob = new Blob([fileOutput.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = generatedFileName;
  link.click();
  URL.revokeObjectURL(url);
}

buildButton.addEventListener("click", buildPost);
downloadButton.addEventListener("click", downloadPost);
