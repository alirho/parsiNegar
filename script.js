// Configure Mermaid.js theme based on the application's current theme.
function configureMermaidTheme() {
  const currentTheme = document.querySelector('input[name="theme"]:checked').value;
  let mermaidTheme = 'default';
  if (currentTheme === 'dark') {
      mermaidTheme = 'dark';
  } else if (currentTheme === 'sepia') {
      mermaidTheme = 'neutral';
  }
  mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme
  });
}

// --- IndexedDB Functions ---
let db;
async function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
        return resolve(db);
    }
    const request = indexedDB.open('parsiNegarDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

async function saveFile(content, filenameValue) {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    const file = {
      id: 'currentFile',
      content,
      filename: filenameValue,
      lastModified: new Date()
    };
    const request = store.put(file);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Error saving file to IndexedDB', event.target.error);
      reject(event.target.error);
    };
  });
}

async function loadFileFromDB() {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const request = store.get('currentFile');

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error loading file from IndexedDB', event.target.error);
      reject(event.target.error);
    };
  });
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}


document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsBtn = document.getElementById('settingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput');
  const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
  const downloadMdBtn = document.getElementById('downloadMdBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const editorContainer = document.getElementById('editorContainer');
  const previewContainer = document.getElementById('previewContainer');
  const content = document.getElementById('content');
  const fontSizeSelect = document.getElementById('fontSize');
  const fontFamilySelect = document.getElementById('fontFamily');
  const markdownParserSelect = document.getElementById('markdownParser');
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  const filename = document.getElementById('filename');
  const shortcutsMenu = document.getElementById('shortcutsMenu');
  const toolbar = document.getElementById('toolbar');
  const statusBar = document.getElementById('statusBar');
  const tocPanel = document.getElementById('tocPanel');
  const tocList = document.querySelector('.toc-list');
  
  // Stats elements
  const charsCount = document.getElementById('charsCount');
  const lettersCount = document.getElementById('lettersCount');
  const wordsCount = document.getElementById('wordsCount');
  const linesCount = document.getElementById('linesCount');
  const fileSize = document.getElementById('fileSize');

  // Menu Elements
  const showToolbarCheckbox = document.getElementById('showToolbar');
  const showStatusBarCheckbox = document.getElementById('showStatusBar');
  const showTocCheckbox = document.getElementById('showToc');
  const showFilenameCheckbox = document.getElementById('showFilename');
  const newFileBtn = document.getElementById('newFileBtn');
  const loadFileBtn = document.getElementById('loadFileBtn');
  const exportMdBtn = document.getElementById('exportMdBtn');
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const helpBtn = document.getElementById('helpBtn');

  const debouncedSave = debounce(async () => {
    try {
        await saveFile(editor.value, filename.value);
    } catch(e) {
        console.error("Failed to auto-save to DB", e);
    }
  }, 500);

  // TOC visibility handler
  showTocCheckbox.addEventListener('change', (e) => {
    tocPanel.style.display = e.target.checked ? 'block' : 'none';
    saveSettings();
    updatePreview(); // Rebuild TOC
  });

  // Extract headings from markdown
  function extractHeadings(markdown) {
    const headings = [];
    const lines = markdown.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06FF\u200C]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        headings.push({ level, text, id });
      }
    }
    
    return headings;
  }

  // Build TOC structure
  function buildTocStructure(headings) {
    const root = { children: [], level: 0 };
    const stack = [root];
    
    headings.forEach(heading => {
      const node = { ...heading, children: [] };
      
      while (stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }
      
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    });
    
    return root.children;
  }

  // Create TOC HTML
  function createTocHtml(structure, level = 0) {
    if (!structure.length) return '';
    
    let html = '<ul class="toc-list">';
    
    structure.forEach(item => {
      const hasChildren = item.children && item.children.length > 0;
      
      html += `
        <li class="toc-item" style="--level: ${level}">
          <div class="toc-link">
            ${hasChildren ? `<span class="toc-toggle"><i class="fas fa-caret-down"></i></span>` : ''}
            <a href="#${item.id}">${item.text}</a>
          </div>
          ${hasChildren ? createTocHtml(item.children, level + 1) : ''}
        </li>
      `;
    });
    
    html += '</ul>';
    return html;
  }

  // Update TOC
  function updateToc() {
    if (!showTocCheckbox.checked) return;
    
    const headings = extractHeadings(editor.value);
    const structure = buildTocStructure(headings);
    tocList.innerHTML = createTocHtml(structure);
    
    // Add click handlers for toggles
    document.querySelectorAll('.toc-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const item = e.target.closest('.toc-item');
        item.classList.toggle('collapsed');
        const icon = toggle.querySelector('i');
        icon.classList.toggle('fa-caret-down');
        icon.classList.toggle('fa-caret-left');
      });
    });
    
    // Add click handlers for links
    document.querySelectorAll('.toc-link a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href').substring(1);
        const element = preview.querySelector(`[id="${id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Menu Event Listeners
  showToolbarCheckbox.addEventListener('change', (e) => {
    toolbar.style.display = e.target.checked ? 'flex' : 'none';
    saveSettings();
  });

  showStatusBarCheckbox.addEventListener('change', (e) => {
    statusBar.style.display = e.target.checked ? 'flex' : 'none';
    saveSettings();
  });

  showFilenameCheckbox.addEventListener('change', (e) => {
    filename.style.display = e.target.checked ? 'block' : 'none';
    saveSettings();
  });

  newFileBtn.addEventListener('click', async () => {
    if (confirm('آیا مطمئن هستید؟ تمام محتوای فعلی پاک خواهد شد.')) {
      editor.value = '';
      filename.value = 'نام فایل';
      updatePreview();
      try {
        await saveFile(editor.value, filename.value);
      } catch (e) {
          console.error("Failed to clear file in DB", e);
      }
    }
  });

  loadFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  exportMdBtn.addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
    downloadFile(blob, filename.value.endsWith('.md') ? filename.value : `${filename.value}.md`);
  });

  exportHtmlBtn.addEventListener('click', () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>پارسی‌نگار | خروجی</title>
  <style>
    ${document.querySelector('styles').textContent}
  </style>
</head>
<body id="html-output" class="theme-${document.querySelector('input[name="theme"]:checked').value}">
  <div class="markdown-printed">
    ${preview.innerHTML}
  </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadFile(blob, filename.value.replace(/\.md$/, '') + '.html');
  });

  exportPdfBtn.addEventListener('click', async () => {
    const element = document.createElement('div');
    element.className = 'markdown-preview';
    element.innerHTML = preview.innerHTML;
    element.style.padding = '2rem';
    element.style.maxWidth = '210mm';
    element.style.margin = '0 auto';
    
    const opt = {
      margin: [10, 10],
      filename: filename.value.replace(/\.md$/, '') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  });

  helpBtn.addEventListener('click', () => {
    // Load help content from README.md
    loadReadme();
  });

  // Format menu items
  document.querySelectorAll('.submenu [data-format]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const format = e.target.closest('[data-format]').dataset.format;
      const button = document.querySelector(`[data-action="${format}"]`);
      if (button) {
        button.click();
      }
    });
  });

  // Markdown shortcuts
  const shortcuts = [
    { name: 'عنوان', icon: 'fa-heading', text: '# ', filter: 'عنوان' },
    { name: 'عنوان دو', icon: 'fa-heading', text: '## ', filter: 'عنوان دو' },
    { name: 'عنوان سه', icon: 'fa-heading', text: '### ', filter: 'عنوان سه' },
    { name: 'پررنگ', icon: 'fa-bold', text: '****', filter: 'پررنگ' },
    { name: 'مورب', icon: 'fa-italic', text: '**', filter: 'مورب' },
    { name: 'نقل‌قول', icon: 'fa-quote-right', text: '> ', filter: 'نقل‌قول' },
    { name: 'کد تک‌خطی', icon: 'fa-code', text: '``', filter: 'کد تک‌خطی' },
    { name: 'کد چندخطی', icon: 'fa-code', text: '```\n\n```', filter: 'کد چندخطی' },
    { name: 'خط زده', icon: 'fa-strikethrough', text: '~~~~', filter: 'خط زده' },
    { name: 'لیست نامرتب', icon: 'fa-list-ul', text: '- ', filter: 'لیست نامرتب' },
    { name: 'لیست مرتب', icon: 'fa-list-ol', text: '1. ', filter: 'لیست مرتب' },
    { name: 'بازبینه', icon: 'fa-tasks', text: '- [ ] ', filter: 'بازبینه' },
    { name: 'جدول', icon: 'fa-table', text: '| ستون ۱ | ستون ۲ | ستون ۳ |\n| ------ | ------ | ------ |\n| محتوا | محتوا | محتوا |', filter: 'جدول' },
    { name: 'تصویر', icon: 'fa-image', text: '![]()', filter: 'تصویر' },
    { name: 'پیوند', icon: 'fa-link', text: '[]()', filter: 'پیوند' },
    { name: 'نمودار', icon: 'fa-sitemap', text: '```mermaid\nflowchart LR\n  A[شروع] --> B{تصمیم}\n  B -->|بله| C[ادامه]\n  B -->|خیر| D[توقف]\n```', filter: 'نمودار' }
  ];

  let selectedShortcutIndex = -1;
  let isShortcutMenuVisible = false;
  let lastEnterTime = 0;

  // Initialize marked with custom renderer
  const markedRenderer = new marked.Renderer();
  
  // Override paragraph rendering to handle text direction for marked
  markedRenderer.paragraph = function(token) {
    const text = this.parser.parseInline(token.tokens);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
    const firstChar = plainText.charAt(0);
    const direction = /[a-zA-Z]/.test(firstChar) ? 'ltr' : 'rtl';
    return `<p style="direction: ${direction}; text-align: ${direction === 'ltr' ? 'left' : 'right'}">${text}</p>`;
  };
  
  // Override list item rendering for marked
  markedRenderer.listitem = function(token) {
    const text = this.parser.parseInline(token.tokens);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
    const firstChar = plainText.charAt(0);
    const direction = /[a-zA-Z]/.test(firstChar) ? 'ltr' : 'rtl';
    const style = `style="direction: ${direction}; text-align: ${direction === 'ltr' ? 'left' : 'right'}"`;

    if (token.task) {
      const checkbox = `<input type="checkbox" disabled ${token.checked ? 'checked' : ''}>`;
      return `<li class="task-list" ${style}>${checkbox} ${text}</li>`;
    }
    
    return `<li ${style}>${text}</li>`;
  };

  // Override heading rendering to add IDs
  markedRenderer.heading = function(token) {
    const text = this.parser.parseInline(token.tokens);
    const { depth, raw } = token;
    const id = String(raw || '').toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\u200C]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  // Override code rendering for Mermaid.js support
  markedRenderer.code = function(token) {
    const { text, lang } = token;
    if (lang === 'mermaid') {
      return `<div class="mermaid">${text}</div>`;
    }
    return `<pre><code class="language-${lang || ''}">${text}</code></pre>`;
  };
  
  marked.setOptions({
    renderer: markedRenderer,
    gfm: true,
    breaks: true,
    headerIds: false
  });

  // Load README.md content
  async function loadReadme() {
    try {
      const response = await fetch('./README.md');
      if (response.ok) {
        const content = await response.text();
        editor.value = content;
        filename.value = 'README.md';
        updatePreview();
        await saveFile(content, 'README.md');
      }
    } catch (error) {
      console.error('Error loading README.md:', error);
    }
  }

  // Parse markdown based on selected parser
  function parseMarkdown(markdown) {
    const parser = markdownParserSelect.value;
    if (parser === 'shahneshan') {
      return window.shahneshan.markdownToOutput(markdown);
    } else {
      return marked.parse(markdown);
    }
  }
  
  // Load settings from localStorage
  function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('parsiNegarSettings') || '{}');
    
    // Apply theme
    if (settings.theme) {
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
      document.body.classList.add(`theme-${settings.theme}`);
      const themeRadio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
      if (themeRadio) themeRadio.checked = true;
    }
    
    // Apply font size
    if (settings.fontSize) {
      editor.style.fontSize = `${settings.fontSize}px`;
      fontSizeSelect.value = settings.fontSize;
    }
    
    // Apply font family
    if (settings.fontFamily) {
      editor.style.fontFamily = settings.fontFamily;
      fontFamilySelect.value = settings.fontFamily;
    }
    
    // Apply markdown parser
    if (settings.markdownParser) {
      markdownParserSelect.value = settings.markdownParser;
    }
    
    // Apply visibility settings
    if (settings.showToolbar !== undefined) {
      showToolbarCheckbox.checked = settings.showToolbar;
      toolbar.style.display = settings.showToolbar ? 'flex' : 'none';
    }

    if (settings.showStatusBar !== undefined) {
      showStatusBarCheckbox.checked = settings.showStatusBar;
      statusBar.style.display = settings.showStatusBar ? 'flex' : 'none';
    }

    if (settings.showToc !== undefined) {
      showTocCheckbox.checked = settings.showToc;
      tocPanel.style.display = settings.showToc ? 'block' : 'none';
    }

    if (settings.showFilename !== undefined) {
      showFilenameCheckbox.checked = settings.showFilename;
      filename.style.display = settings.showFilename ? 'block' : 'none';
    }
  }
  
  // Save settings to localStorage
  function saveSettings() {
    const settings = {
      theme: document.querySelector('input[name="theme"]:checked').value,
      fontSize: fontSizeSelect.value,
      fontFamily: fontFamilySelect.value,
      markdownParser: markdownParserSelect.value,
      showToolbar: showToolbarCheckbox.checked,
      showStatusBar: showStatusBarCheckbox.checked,
      showToc: showTocCheckbox.checked,
      showFilename: showFilenameCheckbox.checked
    };
    
    localStorage.setItem('parsiNegarSettings', JSON.stringify(settings));
  }
  
  // History for undo/redo
  let history = [editor.value];
  let historyIndex = 0;
  
  // Auto-pair characters
  const pairs = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
    '<': '>'
  };

  // Check if current line is a list item
  function getListPrefix(line) {
    const checklistMatch = line.match(/^(\s*[-*+]\s*\[\s?\]\s+)/);
    if (checklistMatch) return checklistMatch[1];

    const unorderedMatch = line.match(/^(\s*[-*+]\s+)/);
    if (unorderedMatch) return unorderedMatch[1];

    const orderedMatch = line.match(/^(\s*([0-9۰-۹]+))(\.\s+)/);
    if (orderedMatch) {
      const fullPrefix = orderedMatch[1] + orderedMatch[3];
      const rawNumber = orderedMatch[2];
  
      const isPersian = /[۰-۹]/.test(rawNumber);
      const westernNumber = rawNumber.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
      const number = parseInt(westernNumber) + 1;
  
      const nextNumber = isPersian
        ? number.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)])
        : number.toString();
  
      return fullPrefix.replace(rawNumber, nextNumber);
    }

    return null;
  }
  
  // Show shortcuts menu
  function showShortcutsMenu(query = '') {
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPos);
    const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const textRect = editor.getBoundingClientRect();
    const lineHeight = parseInt(window.getComputedStyle(editor).lineHeight);
    const lines = textBeforeCursor.split('\n').length;
    
    const filteredShortcuts = shortcuts.filter(s => 
      s.filter.toLowerCase().includes(query.toLowerCase().substring(1))
    );

    if (filteredShortcuts.length === 0) {
      hideShortcutsMenu();
      return;
    }

    shortcutsMenu.innerHTML = filteredShortcuts.map((shortcut, index) => `
      <div class="shortcut-item ${index === selectedShortcutIndex ? 'selected' : ''}" data-index="${index}">
        <i class="fas ${shortcut.icon}"></i>
        <span>${shortcut.name}</span>
      </div>
    `).join('');

    const top = (lines * lineHeight) - editor.scrollTop;
    const left = (cursorPos - lineStart) * 8;

    shortcutsMenu.style.display = 'block';
    shortcutsMenu.style.top = `${top}px`;
    shortcutsMenu.style.right = `${left + 40}px`;

    isShortcutMenuVisible = true;
    selectedShortcutIndex = selectedShortcutIndex === -1 ? 0 : selectedShortcutIndex;
    updateSelectedShortcut();
  }

  // Hide shortcuts menu
  function hideShortcutsMenu() {
    shortcutsMenu.style.display = 'none';
    isShortcutMenuVisible = false;
    selectedShortcutIndex = -1;
  }

  // Update selected shortcut
  function updateSelectedShortcut() {
    const items = shortcutsMenu.querySelectorAll('.shortcut-item');
    items.forEach(item => item.classList.remove('selected'));
    if (selectedShortcutIndex >= 0 && items[selectedShortcutIndex]) {
      items[selectedShortcutIndex].classList.add('selected');
      items[selectedShortcutIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  // Insert shortcut
  function insertShortcut(shortcut) {
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPos);
    const textAfterCursor = editor.value.substring(cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      editor.value = textBeforeCursor.substring(0, lastSlashIndex) + 
        shortcut.text + 
        textAfterCursor;
      
      const newCursorPos = lastSlashIndex + shortcut.text.length;
      editor.setSelectionRange(newCursorPos, newCursorPos);
    }
    
    hideShortcutsMenu();
    updatePreview();
  }

  // Handle keyboard events for shortcuts menu and list continuation
  editor.addEventListener('keydown', (e) => {
    if (isShortcutMenuVisible) {
      const filteredShortcuts = shortcuts.filter(s => {
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
        const query = textBeforeCursor.substring(lastSlashIndex + 1);
        return s.filter.toLowerCase().includes(query.toLowerCase());
      });

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          selectedShortcutIndex = Math.max(0, selectedShortcutIndex - 1);
          updateSelectedShortcut();
          break;
        case 'ArrowDown':
          e.preventDefault();
          selectedShortcutIndex = Math.min(
            filteredShortcuts.length - 1,
            selectedShortcutIndex + 1
          );
          updateSelectedShortcut();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedShortcutIndex >= 0) {
            insertShortcut(filteredShortcuts[selectedShortcutIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          hideShortcutsMenu();
          break;
      }
    } else if (e.key === 'Enter') {
      const cursorPos = editor.selectionStart;
      const text = editor.value;
      const lines = text.split('\n');
      let currentLineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
      const currentLine = text.substring(currentLineStart, cursorPos);
      const prefix = getListPrefix(currentLine);

      if (prefix) {
        const now = Date.now();
        const isprefix = prefix.match(/^(\s*[0-9۰-۹]+\.\s+)|(\s*[-*+]\s+)|(\s*[-*+]\s*\[\s?\]\s+)/);
        if (now - lastEnterTime < 500 && isprefix) {
          // Double Enter - break the list
          e.preventDefault();
          const beforeList = text.substring(0, currentLineStart);
          const afterList = text.substring(cursorPos);
          editor.value = beforeList + '\n' + afterList;
          editor.setSelectionRange(currentLineStart + 1, currentLineStart + 1);
        } else {
          // Continue the list
          e.preventDefault();
          const beforeCursor = text.substring(0, cursorPos);
          const afterCursor = text.substring(cursorPos);
          editor.value = beforeCursor + '\n' + prefix + afterCursor;
          editor.setSelectionRange(cursorPos + 1 + prefix.length, cursorPos + 1 + prefix.length);
        }
        lastEnterTime = now;
        updatePreview();
      }
    }

    if (pairs[e.key]) {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const selectedText = editor.value.substring(start, end);
      
      editor.value = editor.value.substring(0, start) +
        e.key + selectedText + pairs[e.key] +
        editor.value.substring(end);
      
      if (selectedText) {
        editor.setSelectionRange(start, end + 2);
      } else {
        editor.setSelectionRange(start + 1, start + 1);
      }
      updatePreview();
    } else if (e.key === 'Backspace') {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      
      if (start === end && start > 0) {
        const char = editor.value[start - 1];
        const nextChar = editor.value[start];
        if (pairs[char] === nextChar) {
          e.preventDefault();
          editor.value = editor.value.substring(0, start - 1) +
            editor.value.substring(start + 1);
          editor.setSelectionRange(start - 1, start - 1);
          updatePreview();
        }
      }
    }
  });

  // Handle input for shortcuts menu
  editor.addEventListener('input', (e) => {
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1 && lastSlashIndex === cursorPos - 1) {
      showShortcutsMenu(textBeforeCursor.substring(lastSlashIndex));
    } else if (lastSlashIndex !== -1 && lastSlashIndex < cursorPos) {
      const query = textBeforeCursor.substring(lastSlashIndex);
      showShortcutsMenu(query);
    } else {
      hideShortcutsMenu();
    }

    updatePreview();
    debouncedSave();
    
    // Add to history if significant change
    if (history[historyIndex] !== editor.value) {
      history = history.slice(0, historyIndex + 1);
      history.push(editor.value);
      historyIndex++;
    }
  });

  // Handle click on shortcuts menu
  shortcutsMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.shortcut-item');
    if (item) {
      const index = parseInt(item.dataset.index);
      const cursorPos = editor.selectionStart;
      const textBeforeCursor = editor.value.substring(0, cursorPos);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      const query = textBeforeCursor.substring(lastSlashIndex + 1);
      
      const filteredShortcuts = shortcuts.filter(s => 
        s.filter.toLowerCase().includes(query.toLowerCase())
      );
      
      insertShortcut(filteredShortcuts[index]);
    }
  });

  // Close shortcuts menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#shortcutsMenu') && 
        !e.target.closest('#editor')) {
      hideShortcutsMenu();
    }
  });
  
  // Update preview and stats
  async function updatePreview() {
    const markdown = editor.value;
    preview.innerHTML = parseMarkdown(markdown);

    try {
      const mermaidElements = preview.querySelectorAll('.mermaid');
      for (const el of mermaidElements) {
        const code = el.textContent;
        const id = `mermaid-svg-${Date.now()}`;
        el.textContent = 'در حال رندر شدن...';
        try {
          const { svg } = await mermaid.render(id, code);
          el.innerHTML = svg;
        } catch (e) {
          console.error(e);
          el.innerHTML = 'نمودار نامعتبر است';
        }
      }
    } catch (e) {
      console.error('Mermaid rendering error:', e);
    }

    updateToc();
    
    // Update stats
    const chars = markdown.length;
    const letters = markdown.replace(/[^A-Za-z\u0600-\u06FF]/g, '').length;
    const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
    const lines = markdown.split('\n').length;
    const size = new Blob([markdown]).size;
    
    charsCount.textContent = `نویسه: ${chars}`;
    lettersCount.textContent = `حرف: ${letters}`;
    wordsCount.textContent = `واژه: ${words}`;
    linesCount.textContent = `خط: ${lines}`;
    fileSize.textContent = `حجم: ${formatFileSize(size)}`;
  }
  
  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} بایت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
  }
  
  // Theme handling
  themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
      document.body.classList.add(`theme-${e.target.value}`);
      saveSettings();
      configureMermaidTheme();
      updatePreview();
    });
  });
  
  // Settings handlers
  fontSizeSelect.addEventListener('change', (e) => {
    const size = e.target.value;
    editor.style.fontSize = `${size}px`;
    saveSettings();
  });
  
  fontFamilySelect.addEventListener('change', (e) => {
    const font = e.target.value;
    editor.style.fontFamily = font;
    saveSettings();
  });
  
  // Toolbar actions
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const selectedText = editor.value.substring(start, end);
      
      let newText = '';
      let newCursorPos = start;
      
      switch (action) {
        case 'bold':
          newText = `**${selectedText}**`;
          newCursorPos = selectedText ? end + 4 : start + 2;
          break;
        case 'italic':
          newText = `*${selectedText}*`;
          newCursorPos = selectedText ? end + 2 : start + 1;
          break;
        case 'heading':
          const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
          const prefix = editor.value.substring(lineStart, start).trim() === '' ? 
            '## ' : '\n## ';
          newText = editor.value.substring(0, lineStart) + prefix + editor.value.substring(lineStart);
          editor.value = newText;
          editor.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
          updatePreview();
          return;
        case 'strike':
          newText = `~~${selectedText}~~`;
          newCursorPos = selectedText ? end + 4 : start + 2;
          break;
        case 'unorderedList':
          newText = `- ${selectedText}`;
          newCursorPos = start + 2;
          break;
        case 'orderedList':
          newText = `1. ${selectedText}`;
          newCursorPos = start + 3;
          break;
        case 'checklist':
          newText = `- [ ] ${selectedText}`;
          newCursorPos = start + 6;
          break;
        case 'quote':
          newText = `> ${selectedText}`;
          newCursorPos = start + 2;
          break;
        case 'code':
          if (selectedText.includes('\n')) {
            newText = `\`\`\`\n${selectedText}\n\`\`\``;
            newCursorPos = end + 8;
          } else {
            newText = `\`${selectedText}\``;
            newCursorPos = end + 2;
          }
          break;
        case 'table':
          newText = '| ستون ۱ | ستون ۲ | ستون ۳ |\n| ------ | ------ | ------ |\n| محتوا | محتوا | محتوا |';
          newCursorPos = start + newText.length;
          break;
        case 'image':
          newText = `![]()`;
          newCursorPos = start + 4;
          break;
        case 'link':
          newText = `[${selectedText}]()`;
          newCursorPos = selectedText ? end + 3 : start + 1;
          break;
        case 'chart':
          newText = '```mermaid\nflowchart LR\n  A[شروع] --> B{تصمیم}\n  B -->|بله| C[ادامه]\n  B -->|خیر| D[توقف]\n```';
          newCursorPos = start + newText.length;
          break;
      }
      
      if (action !== 'heading') {
        editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
        editor.setSelectionRange(newCursorPos, newCursorPos);
        updatePreview();
      }
    });
  });
  
  // Undo/Redo
  document.getElementById('undoBtn').addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      editor.value = history[historyIndex];
      updatePreview();
    }
  });
  
  document.getElementById('redoBtn').addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      editor.value = history[historyIndex];
      updatePreview();
    }
  });
  
  // File upload
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      editor.value = e.target.result;
      filename.value = file.name;
      updatePreview();
      fileInput.value = '';
      await saveFile(editor.value, filename.value);
    };
    reader.readAsText(file);
  });

  // Update filename when editing
  filename.addEventListener('change', () => {
    saveSettings();
    debouncedSave();
  });
  
  // Download HTML
  downloadHtmlBtn.addEventListener('click', () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>پارسی‌نگار | خروجی</title>
  <style>
    ${document.querySelector('styles').textContent}
  </style>
</head>
<body id="html-output" class="theme-${document.querySelector('input[name="theme"]:checked').value}">
  <div class="markdown-printed">
    ${preview.innerHTML}
  </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadFile(blob, filename.value.replace(/\.md$/, '') + '.html');
  });
  
  // Download Markdown
  downloadMdBtn.addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
    downloadFile(blob, filename.value.endsWith('.md') ? filename.value : `${filename.value}.md`);
  });
  
  // Download PDF
  downloadPdfBtn.addEventListener('click', async () => {
    const element = document.createElement('div');
    element.className = 'markdown-preview';
    element.innerHTML = preview.innerHTML;
    element.style.padding = '2rem';
    element.style.maxWidth = '210mm';
    element.style.margin = '0 auto';
    
    const opt = {
      margin: [10, 10],
      filename: filename.value.replace(/\.md$/, '') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  });
  
  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // Fullscreen toggle
  fullscreenBtn.addEventListener('click', () => {
    if (editorContainer.style.display === 'none') {
      // Exit fullscreen mode
      editorContainer.style.display = 'flex';
      previewContainer.classList.remove('fullscreen');
      document.querySelector('#toolbar').classList.remove('fullscreen');
    } else {
      // Enter fullscreen mode
      editorContainer.style.display = 'none';
      previewContainer.classList.add('fullscreen');
      document.querySelector('#toolbar').classList.add('fullscreen');
    }
  });
  
  // Settings panel
  settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
    saveSettings();
  });
  
  // Add event listener for markdown parser change
  markdownParserSelect.addEventListener('change', () => {
    saveSettings();
    updatePreview();
  });
  
  // Load settings on startup
  loadSettings();

  // Load content from IndexedDB or default to README
  try {
    const savedFile = await loadFileFromDB();
    if (savedFile) {
        editor.value = savedFile.content;
        if (savedFile.filename) {
            filename.value = savedFile.filename;
        }
        history = [editor.value];
        historyIndex = 0;
    } else {
        await loadReadme();
    }
  } catch (e) {
      console.error("Could not load from DB, loading README.", e);
      await loadReadme();
  }

  configureMermaidTheme();
  
  // Initial preview
  updatePreview();
});