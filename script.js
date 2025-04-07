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

  // بارگذاری تنظیمات از localStorage
  loadSettings()

  // بارگذاری محتوای ذخیره شده از localStorage
  const savedContent = localStorage.getItem("markdown-content")
  if (savedContent) {
    editor.value = savedContent
    renderMarkdown()
    updateStats()
    updateLineNumbers()
  }

  // رویداد تغییر متن در ویرایشگر
  editor.addEventListener("input", () => {
    localStorage.setItem("markdown-content", editor.value)
    renderMarkdown()
    updateStats()
    updateLineNumbers()
  })

  // متغیرهای کنترل اسکرول
  let isManualScrolling = false
  let scrollTimeout
  let lastEditorScrollTop = 0
  let lastPreviewScrollTop = 0

  // رویداد اسکرول ویرایشگر - اصلاح شده برای فایرفاکس
  editor.addEventListener("scroll", () => {
    // همگام‌سازی شماره خطوط همیشه انجام شود
    if (lineNumbers.style.display !== "none") {
      lineNumbers.scrollTop = editor.scrollTop
    }

    // اگر اسکرول به صورت دستی نیست یا تغییری نکرده، خارج شو
    if (!isManualScrolling || lastEditorScrollTop === editor.scrollTop) return

    lastEditorScrollTop = editor.scrollTop
    clearTimeout(scrollTimeout)

    // همگام‌سازی پیش‌نمایش
    const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight)
    const targetScrollTop = percentage * (preview.scrollHeight - preview.clientHeight)

    // جلوگیری از حلقه بازخورد
    if (Math.abs(preview.scrollTop - targetScrollTop) > 5) {
      preview.scrollTop = targetScrollTop
    }

    scrollTimeout = setTimeout(() => {
      isManualScrolling = false
    }, 150)
  })

  // رویداد اسکرول پیش‌نمایش - اصلاح شده برای فایرفاکس
  preview.addEventListener("scroll", () => {
    // اگر اسکرول به صورت دستی نیست یا تغییری نکرده، خارج شو
    if (!isManualScrolling || lastPreviewScrollTop === preview.scrollTop) return

    lastPreviewScrollTop = preview.scrollTop
    clearTimeout(scrollTimeout)

    // همگام‌سازی ویرایشگر
    const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight)
    const targetScrollTop = percentage * (editor.scrollHeight - editor.clientHeight)

    // جلوگیری از حلقه بازخورد
    if (Math.abs(editor.scrollTop - targetScrollTop) > 5) {
      editor.scrollTop = targetScrollTop

      // همگام‌سازی شماره خطوط
      if (lineNumbers.style.display !== "none") {
        lineNumbers.scrollTop = editor.scrollTop
      }
    }

    scrollTimeout = setTimeout(() => {
      isManualScrolling = false
    }, 150)
  })

  // تشخیص اسکرول دستی - بهبود یافته
  editor.addEventListener("mousedown", () => (isManualScrolling = true))
  preview.addEventListener("mousedown", () => (isManualScrolling = true))

  editor.addEventListener("wheel", () => {
    isManualScrolling = true
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => (isManualScrolling = false), 150)
  })

  preview.addEventListener("wheel", () => {
    isManualScrolling = true
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => (isManualScrolling = false), 150)
  })

  // اضافه کردن پشتیبانی از کلیدهای جهت‌دار برای اسکرول
  editor.addEventListener("keydown", (e) => {
    if (
      e.key.startsWith("Arrow") ||
      e.key === "PageUp" ||
      e.key === "PageDown" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      isManualScrolling = true
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => (isManualScrolling = false), 150)
    }
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
    } else {
      applyFont("Vazirmatn") // فونت پیش‌فرض
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

  // تابع اعمال فونت - اصلاح شده
  function applyFont(fontName) {
    // نام‌های دقیق فونت‌ها
    const fontMap = {
      Vazirmatn: "Vazirmatn",
      IranianSans: "Iranian Sans",
    }

    const actualFontName = fontMap[fontName] || fontName

    // تنظیم متغیر CSS
    document.documentElement.style.setProperty("--font-family", actualFontName)

    // اعمال مستقیم به المان‌ها
    document.body.style.fontFamily = `${actualFontName}, system-ui, sans-serif`
    editor.style.fontFamily = `${actualFontName}, monospace`
    preview.style.fontFamily = `${actualFontName}, sans-serif`

    // اعمال به المان‌های دیگر
    document
      .querySelectorAll(
        ".settings-select, .modal-content, .preview-content h1, .preview-content h2, .preview-content h3, .preview-content h4, .preview-content h5, .preview-content h6",
      )
      .forEach((el) => {
        el.style.fontFamily = `${actualFontName}, sans-serif`
      })

    console.log(`Font applied: ${actualFontName}`)
  }

  // تابع اعمال تم
  function applyTheme(themeName) {
    document.documentElement.setAttribute("data-theme", themeName)
  }

  // اصلاح تابع به‌روزرسانی شماره خطوط برای هم‌راستا شدن با متن
  function updateLineNumbers() {
    if (!lineNumbersToggle.checked) {
      lineNumbers.style.display = "none"
      return
    }

    lineNumbers.style.display = "block"
    const lines = editor.value.split("\n")
    let lineNumbersHTML = ""

    for (let i = 0; i < lines.length; i++) {
      lineNumbersHTML += `<div class="line-number">${i + 1}</div>`
    }

    lineNumbers.innerHTML = lineNumbersHTML

    // تنظیم ارتفاع خط برای هم‌راستا شدن با متن
    const editorStyles = window.getComputedStyle(editor)
    const lineHeight = Number.parseFloat(editorStyles.lineHeight)
    const fontSize = Number.parseFloat(editorStyles.fontSize)
    const padding = Number.parseFloat(editorStyles.paddingTop)

    // تنظیم padding برای هم‌راستا شدن با متن
    lineNumbers.style.paddingTop = `${padding}px`

    const lineNumberElements = lineNumbers.querySelectorAll(".line-number")
    lineNumberElements.forEach((element) => {
      element.style.height = `${lineHeight}px`
      element.style.lineHeight = `${lineHeight}px`
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

    try {
      if (parser === "marked") {
        preview.innerHTML = marked.parse(markdownText)
      } else if (parser === "shahneshan") {
        // بررسی وجود ShahNeshan
        if (typeof window.ShahNeshan !== "undefined") {
          preview.innerHTML = window.ShahNeshan.render(markdownText)
        } else {
          // تلاش مجدد برای بارگذاری ShahNeshan
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/gh/barnevis/ShahNeshan/dist/shahneshan.min.js"
          script.onload = () => {
            if (typeof window.ShahNeshan !== "undefined") {
              preview.innerHTML = window.ShahNeshan.render(markdownText)
            } else {
              preview.innerHTML = "<p>مفسر ShahNeshan در دسترس نیست.</p>"
            }
          }
          script.onerror = () => {
            preview.innerHTML = "<p>خطا در بارگذاری مفسر ShahNeshan.</p>"
          }
          document.head.appendChild(script)
        }
      } else {
        // در اینجا می‌توانید مفسرهای دیگر را اضافه کنید
        preview.innerHTML = marked.parse(markdownText)
      }
    } catch (error) {
      console.error("Error rendering markdown:", error)
      preview.innerHTML = "<p>خطا در پردازش متن مارک‌داون.</p>"
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
    renderMarkdown()
    updateStats()
    updateLineNumbers()
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
})

