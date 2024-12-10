const API_BASE_URL = "/contents"; const IMAGES_API_URL = "/images"; const FILES_API_URL = "/files"; const FILES_UPLOAD_URL = "/files/upload"; const DOWNLOAD_API_URL = "/download"; const _k = "_v"; const _e = "_e"; const _d = 15; const _c = "_c"; const CONTENT_CACHE_KEY = "content_cache"; const CONTENT_CACHE_EXPIRY_KEY = "content_cache_expiry"; const CACHE_EXPIRY_DAYS = 15; async function checkPasswordProtection() { try { const v = localStorage.getItem(_k); const e = localStorage.getItem(_e); const now = (new Date).getTime(); if (v && e && now < parseInt(e)) { return true } const response = await fetch("/_vars/ACCESS_PASSWORD"); const needPassword = response.status !== 204; localStorage.setItem(_c, JSON.stringify({ needPassword: needPassword, time: now })); if (!needPassword) { return true } if (!response.ok) { console.error("Error:", response.status); return true } document.getElementById("passwordOverlay").style.display = "flex"; document.getElementById("mainContent").classList.add("content-blur"); document.body.classList.add("password-active"); return false } catch (error) { console.error("Error:", error); return true } } async function verifyPassword(event) { if (event) { event.preventDefault() } const input = document.getElementById("accessPassword"); const pwd = input.value; try { const response = await fetch("/_vars/ACCESS_PASSWORD"); if (!response.ok) { throw new Error("Error") } const correct = await response.text(); const t = (new Date).getTime().toString(); if (pwd === correct) { const exp = new Date; exp.setDate(exp.getDate() + _d); localStorage.setItem(_k, t); localStorage.setItem(_e, exp.getTime().toString()); document.getElementById("passwordOverlay").style.display = "none"; document.getElementById("mainContent").classList.remove("content-blur"); document.body.classList.remove("password-active"); showToast("验证成功！") } else { showToast("Error！", "error"); input.value = "" } } catch (error) { console.error("Error:", error); showToast("Error: " + error.message, "error") } } document.addEventListener("keypress", function (e) { if (e.key === "Enter" && document.getElementById("passwordOverlay").style.display !== "none") { verifyPassword() } }); let currentEditId = null; let lastUpdateTime = Date.now(); let updateCheckInterval = null; let contentCache = []; let contentContainer; let syncInterval = 3e4; let zoomInstance = null; const SYNC_INTERVAL_KEY = "sync_interval"; const SYNC_INTERVAL_EXPIRY_KEY = "sync_interval_expiry"; async function getSyncInterval() { try { const savedInterval = localStorage.getItem(SYNC_INTERVAL_KEY); const expiry = localStorage.getItem(SYNC_INTERVAL_EXPIRY_KEY); if (savedInterval && expiry && (new Date).getTime() < parseInt(expiry)) { const parsedInterval = parseInt(savedInterval); if (!isNaN(parsedInterval) && parsedInterval >= 5e3) { syncInterval = parsedInterval; console.log("从本地存储加载同步间隔:", syncInterval, "ms"); return } } const response = await fetch("/_vars/SYNC_INTERVAL"); if (response.ok) { const interval = await response.text(); const parsedInterval = parseInt(interval); if (!isNaN(parsedInterval) && parsedInterval >= 5e3) { syncInterval = parsedInterval; const expiryDate = new Date; expiryDate.setDate(expiryDate.getDate() + 7); localStorage.setItem(SYNC_INTERVAL_KEY, syncInterval.toString()); localStorage.setItem(SYNC_INTERVAL_EXPIRY_KEY, expiryDate.getTime().toString()); console.log("从服务器加载同步间隔:", syncInterval, "ms") } } } catch (error) { console.warn("无法获取同步间隔配置,使用默认值:", syncInterval, "ms") } } function getFileIcon(filename) { const ext = filename.toLowerCase().split(".").pop(); if (["md", "markdown", "mdown", "mkd"].includes(ext)) return "markdown"; if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "heic"].includes(ext)) return "image"; if (ext === "pdf") return "pdf"; if (["doc", "docx", "rtf", "odt", "pages"].includes(ext)) return "word"; if (["xls", "xlsx", "csv", "ods", "numbers"].includes(ext)) return "excel"; if (["ppt", "pptx", "odp", "key"].includes(ext)) return "powerpoint"; if (["txt", "log", "ini", "conf", "cfg"].includes(ext)) return "text"; if (ext === "exe") return "windows"; if (ext === "msi") return "windows-installer"; if (ext === "apk") return "android"; if (ext === "app" || ext === "dmg") return "macos"; if (ext === "deb" || ext === "rpm") return "linux"; if (["appx", "msix"].includes(ext)) return "windows-store"; if (["ipa", "pkg"].includes(ext)) return "ios"; if (["js", "ts", "jsx", "tsx", "json", "html", "css", "scss", "less", "sass", "php", "py", "java", "c", "cpp", "cs", "go", "rb", "swift", "kt", "rs", "dart", "vue", "sql", "sh", "bash", "yml", "yaml", "xml"].includes(ext)) return "code"; if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz"].includes(ext)) return "archive"; if (["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm", "m4v", "3gp", "mpg", "mpeg", "ogv"].includes(ext)) return "video"; if (["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma", "opus", "mid", "midi"].includes(ext)) return "audio"; return "generic" } function getFileTypeDescription(filename) { const ext = filename.toLowerCase().split(".").pop(); if (["md", "markdown", "mdown", "mkd"].includes(ext)) return "Markdown文档"; if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "heic"].includes(ext)) return "图片文件"; if (ext === "pdf") return "PDF文档"; if (["doc", "docx", "rtf", "odt", "pages"].includes(ext)) return "Word文档"; if (["xls", "xlsx", "csv", "ods", "numbers"].includes(ext)) return "Excel表格"; if (["ppt", "pptx", "odp", "key"].includes(ext)) return "PowerPoint演示文稿"; if (["txt", "log"].includes(ext)) return "文本文件"; if (["ini", "conf", "cfg"].includes(ext)) return "配置文件"; if (ext === "exe") return "Windows可执行程序"; if (ext === "msi") return "Windows安装程序"; if (ext === "apk") return "Android应用程序"; if (ext === "app") return "macOS应用程序"; if (ext === "dmg") return "macOS安装镜像"; if (ext === "deb") return "Debian/Ubuntu安装包"; if (ext === "rpm") return "RedHat/Fedora安装包"; if (["appx", "msix"].includes(ext)) return "Windows商店应用"; if (ext === "ipa") return "iOS应用程序"; if (ext === "pkg") return "macOS安装包"; if (["js", "ts"].includes(ext)) return "JavaScript/TypeScript文件"; if (["jsx", "tsx"].includes(ext)) return "React组件"; if (ext === "vue") return "Vue组件"; if (ext === "html") return "HTML文件"; if (["css", "scss", "less", "sass"].includes(ext)) return "样式表"; if (ext === "php") return "PHP文件"; if (ext === "py") return "Python文件"; if (ext === "java") return "Java文件"; if (["c", "cpp"].includes(ext)) return "C/C++文件"; if (ext === "cs") return "C#文件"; if (ext === "go") return "Go文件"; if (ext === "rb") return "Ruby文件"; if (ext === "swift") return "Swift文件"; if (ext === "kt") return "Kotlin文件"; if (ext === "rs") return "Rust文件"; if (ext === "dart") return "Dart文件"; if (ext === "sql") return "SQL文件"; if (["sh", "bash"].includes(ext)) return "Shell文本"; if (["yml", "yaml"].includes(ext)) return "YAML配置"; if (ext === "xml") return "XML文件"; if (["zip", "rar", "7z"].includes(ext)) return "压缩文件"; if (["tar", "gz", "bz2", "xz", "tgz"].includes(ext)) return "归档文件"; if (["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm", "m4v", "3gp", "mpg", "mpeg", "ogv"].includes(ext)) return "视频文件"; if (["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma", "opus"].includes(ext)) return "音频文件"; if (["mid", "midi"].includes(ext)) return "MIDI音乐"; return `${ext.toUpperCase()}文件` } function formatFileSize(bytes) { if (!bytes || bytes === 0) return "未知大小"; const k = 1024; const sizes = ["B", "KB", "MB", "GB", "TB"]; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i] } function encodeContent(text) { return btoa(unescape(encodeURIComponent(text))) } function decodeContent(encoded) { return decodeURIComponent(escape(atob(encoded))) } function showToast(message, type = "success") { const existingToast = document.querySelector(".toast"); if (existingToast) { existingToast.remove() } const toast = document.createElement("div"); toast.className = `toast ${type}`; toast.textContent = message; document.body.appendChild(toast); requestAnimationFrame(() => { toast.classList.add("show") }); setTimeout(() => { toast.classList.add("fade-out"); setTimeout(() => toast.remove(), 300) }, 2e3) } function previewImage(input) { const preview = document.getElementById("imagePreview"); preview.innerHTML = ""; if (input.files && input.files[0]) { const file = input.files[0]; const img = document.createElement("img"); img.alt = "预览"; img.onload = function () { window.URL.revokeObjectURL(this.src) }; img.src = window.URL.createObjectURL(file); preview.appendChild(img) } } function copyText(encodedText, type) { const text = decodeContent(encodedText); let copyContent = text; if (type === "poetry") { copyContent = text.split("\n").join("\r\n") } else if (type === "image") { copyContent = text } navigator.clipboard.writeText(copyContent).then(() => { showToast("复制成功！") })["catch"](() => { const textarea = document.createElement("textarea"); textarea.value = copyContent; document.body.appendChild(textarea); textarea.select(); try { document.execCommand("copy"); showToast("复制成功！") } catch (e) { showToast("复制失败，请手动复制", "error") } document.body.removeChild(textarea) }) } function showConfirmDialog(title, message) {
    return new Promise(resolve => {
        const wrapper = document.createElement("div"); wrapper.innerHTML = `
            <div class="confirm-dialog-overlay"></div>
            <div class="confirm-dialog">
                <div class="confirm-dialog-content">
                    <div class="confirm-dialog-title">${title}</div>
                    <div class="confirm-dialog-message">${message}</div>
                    <div class="confirm-dialog-buttons">
                        <button class="btn btn-cancel">取消</button>
                        <button class="btn btn-primary">确定</button>
                    </div>
                </div>
            </div>
        `; document.body.appendChild(wrapper); const buttons = wrapper.querySelectorAll(".btn"); buttons.forEach(button => { button.addEventListener("click", () => { wrapper.remove(); resolve(button.classList.contains("btn-primary")) }) })
    })
} function getFileIconUrl(filename) { const ext = filename.toLowerCase().split(".").pop(); return `https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@main/icons/${ext}.svg` } async function downloadFile(url, filename) { try { showToast("准备下载文件..."); const response = await fetch(url, { method: "GET", headers: { Accept: "*/*" } }); if (!response.ok) { throw new Error(`下载失败: ${response.status} ${response.statusText}`) } const contentDisposition = response.headers.get("content-disposition"); const match = contentDisposition?.match(/filename="(.+)"/); const actualFilename = match ? decodeURIComponent(match[1]) : filename; const reader = response.body.getReader(); const contentLength = response.headers.get("content-length"); let receivedLength = 0; const chunks = []; while (true) { const { done, value } = await reader.read(); if (done) { break } chunks.push(value); receivedLength += value.length; if (contentLength) { const progress = (receivedLength / contentLength * 100).toFixed(2); showToast(`下载进度: ${progress}%`) } } const blob = new Blob(chunks); const blobUrl = window.URL.createObjectURL(blob); const link = document.createElement("a"); link.href = blobUrl; link.download = actualFilename; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(blobUrl); showToast("文件下载完成") } catch (error) { console.error("下载失败:", error); showToast("下载失败: " + error.message, "error") } } function formatDate(timestamp) { const date = new Date(timestamp); const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1e3); const year = beijingDate.getFullYear(); const month = String(beijingDate.getMonth() + 1).padStart(2, "0"); const day = String(beijingDate.getDate()).padStart(2, "0"); const hours = String(beijingDate.getHours()).padStart(2, "0"); const minutes = String(beijingDate.getMinutes()).padStart(2, "0"); return `${year}-${month}-${day} ${hours}:${minutes}` } const md = window.markdownit({ html: true, breaks: true, linkify: true, typographer: true, quotes: ['""', "''"] }).use(window.markdownitEmoji).use(window.markdownitSub).use(window.markdownitSup).use(window.markdownitFootnote).use(window.markdownitTaskLists, { enabled: true, label: true, labelAfter: true }); const zoom = mediumZoom("[data-zoomable]", { margin: 48, background: "rgba(0, 0, 0, 0.9)", scrollOffset: 0, container: document.body, template: null, transition: { duration: 400, timing: "cubic-bezier(0.4, 0, 0.2, 1)" } }); md.renderer.rules.image = function (tokens, idx, options, env, slf) { const token = tokens[idx]; const src = token.attrGet("src"); const alt = token.content || ""; const title = token.attrGet("title") || ""; return `<img src="${src}" alt="${alt}" title="${title}" loading="lazy" data-zoomable class="zoomable-image">` }; function parseVideoUrl(url) { const videoExtensions = /\.(mp4|mkv|webm|avi|mov|wmv|flv)$/i; if (videoExtensions.test(url)) { return { type: "video", url: url } } const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^?&\s]+)/); if (youtubeMatch) { return { type: "youtube", id: youtubeMatch[1], embed: `https://www.youtube.com/embed/${youtubeMatch[1]}` } } const bilibiliMatch = url.match(/(?:bilibili\.com\/video\/)([^?&\s/]+)/); if (bilibiliMatch) { return { type: "bilibili", id: bilibiliMatch[1], embed: `//player.bilibili.com/player.html?bvid=${bilibiliMatch[1]}&page=1` } } return null } md.renderer.rules.link_open = function (tokens, idx, options, env, self) { const token = tokens[idx]; const href = token.attrGet("href"); if (href) { const video = parseVideoUrl(href); if (video) { token.video = video; return "" } token.attrPush(["target", "_blank"]); token.attrPush(["rel", "noopener noreferrer"]) } return self.renderToken(tokens, idx, options) }; md.renderer.rules.link_close = function (tokens, idx, options, env, self) {
    if (idx >= 2 && tokens[idx - 2]) {
        const openToken = tokens[idx - 2]; if (openToken && openToken.video) {
            const video = openToken.video; if (video.type === "youtube") {
                return `<div class="video-container youtube">
                    <iframe src="${video.embed}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>`} else if (video.type === "bilibili") {
                return `<div class="video-container bilibili">
                    <iframe src="${video.embed}"
                        frameborder="0"
                        allowfullscreen>
                    </iframe>
                </div>`} else if (video.type === "video") {
                return `<div class="video-container">
                    <video controls preload="metadata" class="native-video">
                        <source src="${video.url}" type="video/mp4">
                        您的浏览器不支持视频播放。
                    </video>
                </div>`}
        }
    } return self.renderToken(tokens, idx, options)
}; md.renderer.rules.fence = function (tokens, idx, options, env, slf) {
    const token = tokens[idx]; const code = token.content; const lang = token.info || ""; const highlighted = Prism.highlight(code, Prism.languages[lang] || Prism.languages.plain, lang); return `<div class="code-wrapper">
        <pre><code class="language-${lang}">${highlighted}</code></pre>
        <button class="copy-button" onclick="copyCode(this)">复制代码</button>
    </div>`}; window.copyCode = function (button) { const pre = button.parentElement.querySelector("pre"); const code = pre.textContent; navigator.clipboard.writeText(code).then(() => { const originalText = button.textContent; button.textContent = "已复制！"; button.style.background = "#4CAF50"; button.style.color = "white"; setTimeout(() => { button.textContent = originalText; button.style.background = ""; button.style.color = "" }, 2e3) })["catch"](err => { console.error("复制失败:", err); showToast("复制失败，请手动复制", "error") }) }; function renderContents(contents) {
    if (!contentContainer) { contentContainer = document.getElementById("content-container") } if (!contents || contents.length === 0) {
        contentContainer.innerHTML = `
            <div class="empty">
                <div class="empty-icon">📝</div>
                <div class="empty-text">还没有任何内容</div>
                <div class="empty-hint">点击"添加内容"开始创建</div>
            </div>
        `; return
    } const fragment = document.createDocumentFragment(); contents.forEach(content => {
        const section = document.createElement("section"); section.className = "text-block"; let contentHtml = ""; let downloadButton = ""; try {
            if (content.type === "image" || content.type === "file") {
                if (content.type === "image") { contentHtml = `<div class="image"><img src="${content.content}" alt="${content.title}" loading="lazy" data-zoomable class="zoomable-image"></div>` } else {
                    const fileIcon = getFileIcon(content.title); const fileType = getFileTypeDescription(content.title); contentHtml = `
                        <div class="file">
                            <i class="file-icon ${fileIcon}"></i>
                            <div class="file-details">
                                <div class="file-name">${content.title}</div>
                                <div class="file-type">${fileType}</div>
                            </div>
                        </div>`} downloadButton = `<button class="btn btn-download" onclick="downloadFile('${content.content}', '${content.title}')">下载</button>`
            } else if (content.type === "code") { const escapedContent = content.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); contentHtml = `<pre><code class="language-javascript">${escapedContent}</code></pre>` } else if (content.type === "poetry") { contentHtml = content.content.split("\n").map(line => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")}</p>`).join("") } else { contentHtml = md.render(content.content) }
        } catch (error) { console.error("Card rendering error:", content.id, error); contentHtml = `<div class="error-message">内容渲染失败</div>` } const encodedContent = encodeContent(content.content); const modifiedDate = formatDate(content.updatedAt || content.createdAt || Date.now()); section.innerHTML = `
            <div class="text-block-header">
                <h2>${content.title}</h2>
                <div class="text-block-meta">
                    <span class="modified-date">修改于 ${modifiedDate}</span>
                </div>
            </div>
            <div class="${content.type}">
                ${contentHtml}
            </div>
            <div class="text-block-actions">
                <button class="btn btn-copy" onclick="copyText('${encodedContent}', '${content.type}')">复制</button>
                ${downloadButton}
                <button class="btn btn-edit" onclick="editContent(${content.id})">编辑</button>
                <button class="btn btn-delete" onclick="deleteContent(${content.id})">删除</button>
            </div>
        `; fragment.appendChild(section)
    }); contentContainer.innerHTML = ""; contentContainer.appendChild(fragment); requestAnimationFrame(() => { Prism.highlightAll(); zoom.detach(); zoom.attach("[data-zoomable]") })
} async function loadContents(showLoading = true) { if (!contentContainer) { contentContainer = document.getElementById("content-container") } try { const cachedContent = localStorage.getItem(CONTENT_CACHE_KEY); const cacheExpiry = localStorage.getItem(CONTENT_CACHE_EXPIRY_KEY); if (cachedContent && cacheExpiry && (new Date).getTime() < parseInt(cacheExpiry)) { const newContent = JSON.parse(cachedContent); if (!contentCache || contentCache.length === 0) { contentCache = newContent; await renderContents(contentCache); console.log("从本地缓存加载内容") } fetchAndUpdateContent(false); return } await fetchAndUpdateContent(showLoading) } catch (error) { console.error("加载内容失败:", error); if (showLoading) { showError(`加载内容失败: ${error.message}`) } } } async function fetchAndUpdateContent(showLoading = true) { const response = await fetch(API_BASE_URL, { headers: { Accept: "application/json" } }); if (!response.ok) { const data = await response.json(); throw new Error(data.details || data.error || "加载失败") } const data = await response.json(); const hasContentChanged = JSON.stringify(contentCache) !== JSON.stringify(data); if (hasContentChanged) { console.log("检测到内容变化，更新界面"); contentCache = data || []; await renderContents(contentCache); const expiryDate = new Date; expiryDate.setDate(expiryDate.getDate() + CACHE_EXPIRY_DAYS); localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(contentCache)); localStorage.setItem(CONTENT_CACHE_EXPIRY_KEY, expiryDate.getTime().toString()); console.log("内容已更新并缓存") } else { console.log("内容未发生变化，保持当前显示") } lastUpdateTime = Date.now() } window.deleteContent = async function (id) { const confirmed = await showConfirmDialog("确认删除", "确定要删除这条内容吗？此操作无法撤销。"); if (confirmed) { try { const response = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE", headers: { Accept: "application/json" } }); if (!response.ok) { const data = await response.json(); throw new Error(data.error || "删除失败") } contentCache = contentCache.filter(item => item.id !== id); renderContents(contentCache); localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(contentCache)); showToast("删除成功！") } catch (error) { console.error("删除失败:", error); showToast(error.message, "error") } } }; window.handleTypeChange = function (type) {
    const contentGroup = document.getElementById("contentGroup"); const imageGroup = document.getElementById("imageGroup"); const fileGroup = document.getElementById("fileGroup"); const editContent = document.getElementById("editContent"); const editImage = document.getElementById("editImage"); const editFile = document.getElementById("editFile"); const titleInput = document.getElementById("editTitle"); const titleGroup = document.getElementById("titleGroup"); const fileInfo = document.querySelector(".file-info"); contentGroup.style.display = "none"; imageGroup.style.display = "none"; fileGroup.style.display = "none"; titleGroup.style.display = "block"; editContent.required = false; editImage.required = false; editFile.required = false; titleInput.required = false; if (type === "image") { imageGroup.style.display = "block"; editImage.required = true; titleGroup.style.display = "none" } else if (type === "file") {
        fileGroup.style.display = "block"; editFile.required = true; if (!editFile.files || !editFile.files[0]) {
            fileInfo.innerHTML = `
                <div class="file-preview">
                    <i class="file-icon generic"></i>
                    <div class="file-details">
                        <div class="file-type">支持所有类型的文件</div>
                    </div>
                </div>
            `}
    } else { contentGroup.style.display = "block"; editContent.required = true }
}; window.editContent = function (id) {
    const content = contentCache.find(item => item.id === id); if (!content) return; const form = document.createElement("form"); form.className = "edit-form"; form.innerHTML = `
        <div class="form-group">
            <label for="edit-title">标题</label>
            <input type="text" id="edit-title" value="${content.title}" required>
        </div>
        <div class="form-group">
            <label for="edit-type">文本类型</label>
            <select id="edit-type">
                <option value="text" ${content.type === "text" ? "selected" : ""}>普通文本</option>
                <option value="code" ${content.type === "code" ? "selected" : ""}>代码</option>
                <option value="poetry" ${content.type === "poetry" ? "selected" : ""}>诗歌</option>
            </select>
        </div>
        <div class="form-group">
            <label for="edit-content">内容</label>
            <textarea id="edit-content" required>${content.content}</textarea>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-cancel" onclick="cancelEdit()">取消</button>
            <button type="submit" class="btn btn-save">保存</button>
        </div>
    `; currentEditId = content.id; document.getElementById("editType").value = content.type; document.getElementById("editTitle").value = content.title; document.getElementById("editContent").value = content.content; if (content.type === "image") { const preview = document.getElementById("imagePreview"); preview.innerHTML = `<img src="${content.content}" alt="预览">` } handleTypeChange(content.type); document.getElementById("editModal").style.display = "block"
}; function initBackToTop() { const backToTop = document.querySelector(".back-to-top"); const scrollThreshold = 400; window.addEventListener("scroll", () => { if (window.scrollY > scrollThreshold) { backToTop.classList.add("visible") } else { backToTop.classList.remove("visible") } }); backToTop.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }) }) } window.clearAllContent = async function () {
    const confirmDialog = document.createElement("div"); confirmDialog.innerHTML = `
        <div class="confirm-dialog-overlay"></div>
        <div class="confirm-dialog">
            <h3>确认清空</h3>
            <p>此操作将清空所有内容，包括：</p>
            <ul>
                <li>所有文本、代码和诗歌</li>
                <li>所有上传的图片</li>
                <li>所有上传的文件</li>
            </ul>
            <p style="color: #dc3545;">此操作不可恢复，请确认！</p>
            <div class="confirm-dialog-buttons">
                <button class="btn" onclick="this.closest('.confirm-dialog').parentElement.remove()">取消</button>
                <button class="btn btn-danger" onclick="executeContentClear(this)">确认清空</button>
            </div>
        </div>
    `; document.body.appendChild(confirmDialog)
}; async function executeContentClear(button) { try { button.disabled = true; button.innerHTML = '清空中... <span class="loading-spinner"></span>'; const response = await fetch("/clear-all", { method: "POST", headers: { "Content-Type": "application/json" } }); if (!response.ok) { throw new Error("清空失败") } contentCache = []; renderContents([]); button.closest(".confirm-dialog").parentElement.remove(); showToast("已清空所有内容") } catch (error) { console.error("清空失败:", error); showToast("清空失败: " + error.message, "error"); button.disabled = false; button.textContent = "确认清空" } } function startUpdateCheck() { if (updateCheckInterval) { clearInterval(updateCheckInterval) } updateCheckInterval = setInterval(() => loadContents(false), syncInterval) } function stopUpdateCheck() { if (updateCheckInterval) { clearInterval(updateCheckInterval); updateCheckInterval = null } } window.addEventListener("beforeunload", () => { stopUpdateCheck() }); document.addEventListener("visibilitychange", () => { if (document.hidden) { stopUpdateCheck() } else { startUpdateCheck(); loadContents(false) } }); document.addEventListener("DOMContentLoaded", async () => {
    await checkPasswordProtection(); await getSyncInterval(); contentContainer = document.getElementById("content-container"); const editModal = document.getElementById("editModal"); const editForm = document.getElementById("editForm"); const addNewBtn = document.getElementById("addNewBtn"); const editImage = document.getElementById("editImage"); await loadContents(true); setupEventListeners(); startUpdateCheck(); initBackToTop(); function setupEventListeners() { if (addNewBtn) { addNewBtn.addEventListener("click", () => openModal()) } editForm.addEventListener("submit", handleFormSubmit); editImage.addEventListener("change", handleImagePreview); document.addEventListener("paste", handlePaste) } async function handlePaste(event) { const target = event.target; if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable) { return } const items = event.clipboardData?.items; if (!items) return; for (const item of items) { console.log("粘贴类型:", item.type); if (item.type.indexOf("image") !== -1) { const file = item.getAsFile(); if (file) { const dataTransfer = new DataTransfer; dataTransfer.items.add(file); currentEditId = null; const editType = document.getElementById("editType"); const editTitle = document.getElementById("editTitle"); const editImage = document.getElementById("editImage"); const imagePreview = document.getElementById("imagePreview"); editType.value = "image"; editTitle.value = `粘贴的图片_${(new Date).getTime()}.png`; editImage.files = dataTransfer.files; const reader = new FileReader; reader.onload = function (e) { imagePreview.innerHTML = `<img src="${e.target.result}" alt="预览">` }; reader.readAsDataURL(file); handleTypeChange("image"); document.getElementById("editModal").style.display = "block"; return } } else if (item.kind === "file" && !item.type.startsWith("image/")) { const file = item.getAsFile(); if (file) { const dataTransfer = new DataTransfer; dataTransfer.items.add(file); currentEditId = null; const editType = document.getElementById("editType"); const editTitle = document.getElementById("editTitle"); const editFile = document.getElementById("editFile"); editType.value = "file"; editTitle.value = file.name; editFile.files = dataTransfer.files; handleTypeChange("file"); updateFileInfo(file); document.getElementById("editModal").style.display = "block"; return } } else if (item.type === "text/plain") { item.getAsString(async text => { const isCode = detectCodeContent(text); currentEditId = null; document.getElementById("editType").value = isCode ? "code" : "text"; document.getElementById("editTitle").value = ""; document.getElementById("editContent").value = text; handleTypeChange(isCode ? "code" : "text"); document.getElementById("editModal").style.display = "block" }); return } } } function detectCodeContent(text) { const codePatterns = [/^(const|let|var|function|class|import|export|if|for|while)\s/m, /{[\s\S]*}/m, /\(\s*\)\s*=>/m, /\b(function|class)\s+\w+\s*\(/m, /\b(if|for|while)\s*\([^)]*\)/m, /\b(return|break|continue)\s/m, /[{};]\s*$/m, /^\s*(public|private|protected)\s/m, /\b(try|catch|finally)\s*{/m, /\b(async|await|Promise)\b/m, /\b(import|export)\s+.*\bfrom\s+['"][^'"]+['"]/m, /\b(const|let|var)\s+\w+\s*=\s*require\s*\(/m]; return codePatterns.some(pattern => pattern.test(text)) } function handleImagePreview(event) { const file = event.target.files[0]; if (file) { const titleInput = document.getElementById("editTitle"); titleInput.value = file.name; const reader = new FileReader; reader.onload = function (e) { const preview = document.getElementById("imagePreview"); preview.innerHTML = `<img src="${e.target.result}" alt="预览">` }; reader.readAsDataURL(file) } } window.handleFileSelect = function (event) { const file = event.target.files[0]; if (file) { const titleInput = document.getElementById("editTitle"); titleInput.value = file.name; updateFileInfo(file) } }; function updateFileInfo(file) {
        const fileInfo = document.querySelector(".file-info"); const fileIcon = getFileIcon(file.name); fileInfo.innerHTML = `
            <div class="file-preview">
                <i class="file-icon ${fileIcon}"></i>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-type">${getFileTypeDescription(file.name)}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `} window.openModal = function () {
        currentEditId = null; const editForm = document.getElementById("editForm"); const editType = document.getElementById("editType"); const editTitle = document.getElementById("editTitle"); const editContent = document.getElementById("editContent"); const imagePreview = document.getElementById("imagePreview"); const editImage = document.getElementById("editImage"); const editFile = document.getElementById("editFile"); const fileInfo = document.querySelector(".file-info"); editForm.reset(); editType.value = "text"; editTitle.value = " "; editTitle.required = true; editTitle.onblur = function () { if (!this.value.trim()) { this.value = " " } }; editContent.value = ""; imagePreview.innerHTML = ""; if (fileInfo) {
            fileInfo.innerHTML = `
                <div class="file-preview">
                    <i class="file-icon generic"></i>
                    <div class="file-details">
                        <div class="file-type">支持所有类型的文件</div>
                    </div>
                </div>
            `} if (editImage) { editImage.value = "" } if (editFile) { editFile.value = "" } handleTypeChange("text"); document.getElementById("editModal").style.display = "block"
    }; window.closeModal = function () { document.getElementById("editModal").style.display = "none"; document.getElementById("editForm").reset(); document.getElementById("imagePreview").innerHTML = ""; currentEditId = null }; async function handleFormSubmit(event) { event.preventDefault(); const submitButton = event.submitter; submitButton.disabled = true; const originalText = submitButton.textContent; submitButton.innerHTML = '保存中... <span class="loading-spinner"></span>'; try { const type = document.getElementById("editType").value; const titleInput = document.getElementById("editTitle"); let title = titleInput.value.trim(); if (!title) { title = " "; titleInput.value = " " } let content = ""; if (type === "image") { const imageFile = document.getElementById("editImage").files[0]; const existingContent = document.getElementById("editContent").value; if (!imageFile && existingContent) { content = existingContent } else if (imageFile) { if (!title) { document.getElementById("editTitle").value = imageFile.name } const formData = new FormData; formData.append("image", imageFile); const uploadResponse = await fetch(IMAGES_API_URL, { method: "POST", body: formData }); if (!uploadResponse.ok) { const errorData = await uploadResponse.json(); throw new Error(errorData.error || "图片上传失败") } const { url } = await uploadResponse.json(); content = url } else { throw new Error("请选择图片文件") } } else if (type === "file") { const file = document.getElementById("editFile").files[0]; const existingContent = document.getElementById("editContent").value; if (!file && existingContent) { content = existingContent } else if (file) { if (!title) { document.getElementById("editTitle").value = file.name } const formData = new FormData; formData.append("file", file); console.log("开始上传文件:", file.name); const uploadResponse = await fetch(FILES_UPLOAD_URL, { method: "POST", body: formData }); console.log("上传响应状态:", uploadResponse.status); const responseText = await uploadResponse.text(); console.log("上传响应内容:", responseText); let responseData; try { responseData = JSON.parse(responseText) } catch (e) { console.error("解析响应失败:", e); throw new Error("服务器响应格式错误") } if (!uploadResponse.ok) { throw new Error(responseData.error || "文件上传失败") } if (!responseData.url) { console.error("响应数据:", responseData); throw new Error("上传成功但未返回文件URL") } content = responseData.url; console.log("文件上传成功:", content) } else { throw new Error("请选择文件") } } else { content = document.getElementById("editContent").value } const finalTitle = document.getElementById("editTitle").value; if (!type || !finalTitle || !content) { throw new Error("请填写所有必要字段") } const formData = { type: type, title: finalTitle, content: content }; if (currentEditId) { await updateContent(currentEditId, formData) } else { await createContent(formData) } closeModal(); await loadContents(false); showToast("保存成功！") } catch (error) { console.error("保存失败:", error); showToast(error.message, "error") } finally { submitButton.disabled = false; submitButton.textContent = originalText } } async function createContent(data) { const response = await fetch(API_BASE_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "创建内容失败") } return await response.json() } async function updateContent(id, data) { const response = await fetch(`${API_BASE_URL}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "更新内容败") } return await response.json() }
});