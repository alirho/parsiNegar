document.addEventListener("DOMContentLoaded", () => {
  // Declare marked variable
  const marked = window.marked

  // عناصر DOM
  const editor = document.getElementById("editor")
  const preview = document.getElementById("preview")
  const lineNumbers = document.getElementById("line-numbers")
  const settingsButton = document.getElementById("settings-button")
  const settingsModal = document.getElementById("settings-modal")
  const closeSettings = document.getElementById("close-settings")
  const parserSelect = document.getElementById("parser-select")
  const fontSelect = document.getElementById("font-select")
  const themeSelect = document.getElementById("theme-select")
  const lineNumbersToggle = document.getElementById("line-numbers-toggle")
  const exportMdButton = document.getElementById("export-md")
  const exportHtmlButton = document.getElementById("export-html")
  const toolbarButtons = document.querySelectorAll(".toolbar button[data-action]")
  const undoButton = document.getElementById("undo-button")
  const redoButton = document.getElementById("redo-button")

  // عناصر آمار
  const charCount = document.getElementById("char-count")
  const letterCount = document.getElementById("letter-count")
  const wordCount = document.getElementById("word-count")
  const lineCount = document.getElementById("line-count")
  const fileSize = document.getElementById("file-size")

  // تنظیم marked برای پشتیبانی از RTL
  marked.setOptions({
    breaks: true,
    gfm: true,
  })

  // متغیرهای تاریخچه تغییرات
  let history = []
  let historyIndex = -1
  let isUndoRedo = false

  // بارگذاری تنظیمات از localStorage
  loadSettings()

  // بارگذاری محتوای ذخیره شده از localStorage
  const savedContent = localStorage.getItem("markdown-content") || ""
  editor.value = savedContent
  renderMarkdown()
  updateStats()
  updateLineNumbers()
  highlightCurrentLine()

  // اضافه کردن محتوای اولیه به تاریخچه
  history.push(savedContent)
  historyIndex = 0

  // متغیرهای کنترل اسکرول
  let isManualScrolling = false
  let editorScrolling = false
  let previewScrolling = false

  // رویداد تغییر متن در ویرایشگر
  editor.addEventListener("input", () => {
    const content = editor.value
    localStorage.setItem("markdown-content", content)
    saveToHistory(content)
    renderMarkdown()
    updateStats()
    updateLineNumbers()
    highlightCurrentLine()
  })

  // رویداد کلیدهای میانبر
  editor.addEventListener("keydown", (e) => {
    // Ctrl+Z برای undo
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault()
      undo()
    }

    // Ctrl+Y برای redo
    if (e.ctrlKey && e.key === "y") {
      e.preventDefault()
      redo()
    }
  })

  // به‌روزرسانی هایلایت با کلیک یا حرکت مکان‌نما
  editor.addEventListener("click", highlightCurrentLine)
  editor.addEventListener("keyup", highlightCurrentLine)
  editor.addEventListener("mouseup", highlightCurrentLine)

  // رویداد اسکرول ویرایشگر - اصلاح شده
  editor.addEventListener("scroll", () => {
    if (editorScrolling) return

    // همگام‌سازی شماره خطوط
    if (lineNumbers.style.display !== "none") {
      lineNumbers.scrollTop = editor.scrollTop
    }

    // همگام‌سازی پیش‌نمایش فقط اگر کاربر اسکرول کرده باشد
    if (!isManualScrolling) return

    previewScrolling = true
    const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight)
    preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight)

    setTimeout(() => {
      previewScrolling = false
    }, 50)

    // به‌روزرسانی هایلایت خط فعلی هنگام اسکرول
    highlightCurrentLine()
  })

  // رویداد اسکرول پیش‌نمایش - اصلاح شده
  preview.addEventListener("scroll", () => {
    if (previewScrolling) return

    // همگام‌سازی ویرایشگر فقط اگر کاربر اسکرول کرده باشد
    if (!isManualScrolling) return

    editorScrolling = true
    const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight)
    editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight)

    setTimeout(() => {
      editorScrolling = false
    }, 50)
  })

  // تشخیص اسکرول دستی
  editor.addEventListener("mousedown", () => (isManualScrolling = true))
  preview.addEventListener("mousedown", () => (isManualScrolling = true))

  editor.addEventListener("wheel", () => (isManualScrolling = true))
  preview.addEventListener("wheel", () => (isManualScrolling = true))

  // غیرفعال کردن اسکرول دستی بعد از مدتی عدم فعالیت
  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      isManualScrolling = false
    }, 1000)
  })

  // رویداد باز کردن مدال تنظیمات
  settingsButton.addEventListener("click", () => {
    settingsModal.style.display = "flex"
  })

  // رویداد بستن مدال تنظیمات
  closeSettings.addEventListener("click", () => {
    settingsModal.style.display = "none"
  })

  // بستن مدال با کلیک خارج از آن
  window.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      settingsModal.style.display = "none"
    }
  })

  // رویداد تغییر مفسر
  parserSelect.addEventListener("change", function () {
    localStorage.setItem("parser", this.value)
    renderMarkdown()
  })

  // رویداد تغییر فونت
  fontSelect.addEventListener("change", function () {
    localStorage.setItem("font", this.value)
    applyFont(this.value)
  })

  // رویداد تغییر تم
  themeSelect.addEventListener("change", function () {
    localStorage.setItem("theme", this.value)
    applyTheme(this.value)
  })

  // رویداد تغییر نمایش شماره خطوط
  lineNumbersToggle.addEventListener("change", function () {
    const isChecked = this.checked
    localStorage.setItem("showLineNumbers", isChecked)
    document.body.classList.toggle("show-line-numbers", isChecked)
    updateLineNumbers()
  })

  // رویداد دکمه‌های خروجی
  exportMdButton.addEventListener("click", exportMarkdown)
  exportHtmlButton.addEventListener("click", exportHtml)

  // رویداد دکمه‌های نوار ابزار
  toolbarButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const action = this.getAttribute("data-action")
      applyFormatting(action)
    })
  })

  // رویداد دکمه‌های undo و redo
  if (undoButton) {
    undoButton.addEventListener("click", () => {
      undo()
    })
  }

  if (redoButton) {
    redoButton.addEventListener("click", () => {
      redo()
    })
  }

  // تابع ذخیره وضعیت در تاریخچه
  function saveToHistory(content) {
    if (isUndoRedo) {
      isUndoRedo = false
      return
    }

    // حذف تاریخچه‌های بعد از موقعیت فعلی
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1)
    }

    // اضافه کردن وضعیت جدید به تاریخچه
    history.push(content)
    historyIndex = history.length - 1

    // محدود کردن تعداد تاریخچه‌ها
    if (history.length > 100) {
      history.shift()
      historyIndex--
    }
  }

  // تابع undo
  function undo() {
    if (historyIndex > 0) {
      historyIndex--
      isUndoRedo = true
      editor.value = history[historyIndex]
      renderMarkdown()
      updateStats()
      updateLineNumbers()
      highlightCurrentLine()
    }
  }

  // تابع redo
  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++
      isUndoRedo = true
      editor.value = history[historyIndex]
      renderMarkdown()
      updateStats()
      updateLineNumbers()
      highlightCurrentLine()
    }
  }

  // تابع هایلایت کردن خط فعلی - روش جدید با استفاده از یک textarea موقت
  function highlightCurrentLine() {
    // حذف هایلایت قبلی
    const oldHighlight = document.querySelector(".line-highlight")
    if (oldHighlight) {
      oldHighlight.remove()
    }

    // ایجاد یک textarea موقت برای محاسبه دقیق موقعیت خط
    const tempTextarea = document.createElement("textarea")
    tempTextarea.style.position = "absolute"
    tempTextarea.style.visibility = "hidden"
    tempTextarea.style.height = "auto"
    tempTextarea.style.width = editor.clientWidth + "px"
    tempTextarea.style.font = window.getComputedStyle(editor).font
    tempTextarea.style.lineHeight = window.getComputedStyle(editor).lineHeight
    tempTextarea.style.padding = window.getComputedStyle(editor).padding
    document.body.appendChild(tempTextarea)

    // کپی متن تا موقعیت مکان‌نما به textarea موقت
    const cursorPosition = editor.selectionStart
    const textBeforeCursor = editor.value.substring(0, cursorPosition)
    tempTextarea.value = textBeforeCursor

    // محاسبه ارتفاع متن تا موقعیت مکان‌نما
    const textHeight = tempTextarea.scrollHeight

    // حذف textarea موقت
    document.body.removeChild(tempTextarea)

    // محاسبه ارتفاع خط
    const lineHeight = Number.parseFloat(window.getComputedStyle(editor).lineHeight)

    // محاسبه شماره خط فعلی (با شروع از 0) - اصلاح شده
    const currentLine = Math.floor(textHeight / lineHeight) - 3 // تغییر از -1 به -3 برای اصلاح مشکل

    // محاسبه موقعیت عمودی خط فعلی با در نظر گرفتن اسکرول
    const editorPadding = 16 // پدینگ بالای ویرایشگر
    const topPosition = (currentLine + 1) * lineHeight - editor.scrollTop + editorPadding

    // ایجاد المان هایلایت
    const highlight = document.createElement("div")
    highlight.className = "line-highlight"
    highlight.style.top = `${topPosition}px`
    highlight.style.height = `${lineHeight}px`

    // اضافه کردن به DOM
    document.querySelector(".editor-wrapper").appendChild(highlight)
  }

  // تابع بارگذاری تنظیمات
  function loadSettings() {
    // بارگذاری مفسر
    const savedParser = localStorage.getItem("parser")
    if (savedParser) {
      parserSelect.value = savedParser
    }

    // بارگذاری فونت
    const savedFont = localStorage.getItem("font")
    if (savedFont) {
      fontSelect.value = savedFont
      applyFont(savedFont)
    }

    // بارگذاری تم
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme) {
      themeSelect.value = savedTheme
      applyTheme(savedTheme)
    }

    // بارگذاری نمایش شماره خطوط
    const showLineNumbers = localStorage.getItem("showLineNumbers") === "true"
    lineNumbersToggle.checked = showLineNumbers
    document.body.classList.toggle("show-line-numbers", showLineNumbers)
  }

  // تابع اعمال فونت
  function applyFont(fontName) {
    document.documentElement.style.setProperty("--font-family", fontName)
  }

  // تابع اعمال تم
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme)
  }

  // اصلاح تابع به‌روزرسانی شماره خطوط برای هم‌راستا شدن با متن
  function updateLineNumbers() {
    if (!lineNumbersToggle.checked) {
      return
    }

    const lines = editor.value.split("\n")
    let lineNumbersHTML = ""

    for (let i = 0; i < lines.length; i++) {
      lineNumbersHTML += `<div class="line-number">${i + 1}</div>`
    }

    lineNumbers.innerHTML = lineNumbersHTML

    // تنظیم ارتفاع خط برای هم‌راستا شدن با متن
    const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight)
    const lineNumberElements = lineNumbers.querySelectorAll(".line-number")

    lineNumberElements.forEach((element) => {
      element.style.height = `${lineHeight}px`
    })
  }

  // تابع به‌روزرسانی آمار
  function updateStats() {
    const text = editor.value

    // تعداد نویسه (کاراکتر)
    const chars = text.length
    charCount.textContent = `نویسه: ${chars}`

    // تعداد حروف (بدون فاصله و علائم)
    const letters = text.replace(/[^a-zA-Zا-یآ-ی]/g, "").length
    letterCount.textContent = `حروف: ${letters}`

    // تعداد واژه‌ها
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    wordCount.textContent = `واژه‌ها: ${words}`

    // تعداد خط‌ها
    const lines = text.split("\n").length
    lineCount.textContent = `خط: ${lines}`

    // حجم فایل
    const size = new Blob([text]).size
    const formattedSize = formatFileSize(size)
    fileSize.textContent = `حجم: ${formattedSize}`
  }

  // تابع فرمت‌بندی حجم فایل
  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return bytes + " بایت"
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " کیلوبایت"
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + " مگابایت"
    }
  }

  // تابع رندر مارک‌داون
  function renderMarkdown() {
    const markdownText = editor.value
    const parser = parserSelect.value

    if (parser === "marked") {
      preview.innerHTML = marked.parse(markdownText)
    } else {
      // در اینجا می‌توانید مفسرهای دیگر را اضافه کنید
      preview.innerHTML = marked.parse(markdownText)
    }
  }

  // تابع اعمال فرمت‌بندی
  function applyFormatting(action) {
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const selectedText = editor.value.substring(start, end)
    let replacement = ""

    switch (action) {
      case "bold":
        replacement = `**${selectedText || "متن پررنگ"}**`
        break
      case "italic":
        replacement = `*${selectedText || "متن کج"}*`
        break
      case "heading":
        replacement = `# ${selectedText || "عنوان"}`
        break
      case "strikethrough":
        replacement = `~~${selectedText || "متن خط خورده"}~~`
        break
      case "unordered-list":
        replacement = selectedText
          ? selectedText
              .split("\n")
              .map((line) => `- ${line}`)
              .join("\n")
          : "- آیتم لیست"
        break
      case "ordered-list":
        replacement = selectedText
          ? selectedText
              .split("\n")
              .map((line, i) => `${i + 1}. ${line}`)
              .join("\n")
          : "1. آیتم لیست"
        break
      case "checklist":
        replacement = selectedText
          ? selectedText
              .split("\n")
              .map((line) => `- [ ] ${line}`)
              .join("\n")
          : "- [ ] کار برای انجام"
        break
      case "blockquote":
        replacement = selectedText
          ? selectedText
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n")
          : "> نقل قول"
        break
      case "code":
        replacement = selectedText ? "```\n" + selectedText + "\n```" : "```\nکد شما اینجا\n```"
        break
      case "table":
        replacement = `| عنوان ۱ | عنوان ۲ |\n| --- | --- |\n| محتوا | محتوا |`
        break
      case "image":
        replacement = `![${selectedText || "توضیح تصویر"}](آدرس تصویر)`
        break
      case "link":
        replacement = `[${selectedText || "متن پیوند"}](آدرس پیوند)`
        break
    }

    // جایگزینی متن انتخاب شده با متن فرمت‌بندی شده
    editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end)

    // تنظیم موقعیت مکان‌نما بعد از فرمت‌بندی
    const newCursorPos = start + replacement.length
    editor.focus()
    editor.setSelectionRange(newCursorPos, newCursorPos)

    // به‌روزرسانی پیش‌نمایش و آمار
    localStorage.setItem("markdown-content", editor.value)
    saveToHistory(editor.value)
    renderMarkdown()
    updateStats()
    updateLineNumbers()
    highlightCurrentLine()
  }

  // تابع خروجی مارک‌داون
  function exportMarkdown() {
    downloadFile(editor.value, "document.md", "text/markdown")
  }

  // تابع خروجی HTML
  function exportHtml() {
    const currentFont = fontSelect.value
    const htmlContent = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>سند مارک‌داون</title>
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
  <link href="https://cdn.jsdelivr.net/gh/font-store/font-iranian-sans@master/WebFonts/css/style.css" rel="stylesheet" type="text/css" />
  <link href="https://cdn.jsdelivr.net/gh/MDarvishi5124/Arad@main/dist/font-face.css" rel="stylesheet" type="text/css" />
  <link href="https://cdn.jsdelivr.net/gh/font-store/BehdadFont@master/WebFonts/css/style.css" rel="stylesheet" type="text/css" />
  <style>
    body { 
      font-family: '${currentFont}', system-ui, sans-serif; 
      line-height: 1.6; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    img { max-width: 100%; }
    pre { background: #f5f5f5; padding: 1rem; overflow: auto; border-radius: 4px; }
    blockquote { border-right: 4px solid #ddd; margin-right: 0; padding-right: 1rem; color: #666; }
    code { background: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
    table { border-collapse: collapse; width: 100%; }
    table th, table td { border: 1px solid #ddd; padding: 8px; }
    table tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  ${preview.innerHTML}
</body>
</html>`

    downloadFile(htmlContent, "document.html", "text/html")
  }

  // تابع دانلود فایل
  function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()

    URL.revokeObjectURL(url)
  }

  // رندر اولیه
  renderMarkdown()
  updateStats()
  updateLineNumbers()
  highlightCurrentLine()
})
