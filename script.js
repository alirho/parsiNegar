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

async function saveFileToDB(id, content) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const file = { id, content, lastModified: new Date() };
      const request = store.put(file);
  
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error('Error saving file to IndexedDB', event.target.error);
        reject(event.target.error);
      };
    });
}

async function getFileFromDB(id) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(id);
  
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error('Error loading file from IndexedDB', event.target.error);
        reject(event.target.error);
      };
    });
}
  
async function getAllFilesFromDB() {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();
  
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error('Error loading all files from IndexedDB', event.target.error);
        reject(event.target.error);
      };
    });
}

async function deleteFileFromDB(id) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.delete(id);
  
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error('Error deleting file from IndexedDB', event.target.error);
        reject(event.target.error);
      };
    });
}

async function clearFilesDB() {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.clear();
  
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error('Error clearing IndexedDB', event.target.error);
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
  const editorBackdrop = document.getElementById('editorBackdrop');
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
  const sidePanel = document.getElementById('sidePanel');
  const tocPanel = document.getElementById('tocPanel');
  const filesPanel = document.getElementById('filesPanel');
  const tocList = document.querySelector('.toc-list');
  const filesList = document.querySelector('.files-list');
  const [filesTabBtn, tocTabBtn] = document.querySelectorAll('.side-panel-tab');
  const clearDBBtn = document.getElementById('clearDBBtn');
  
  // Search Elements
  const searchBtn = document.getElementById('searchBtn');
  const searchBar = document.getElementById('searchBar');
  const searchInput = document.getElementById('searchInput');
  const replaceInput = document.getElementById('replaceInput');
  const replaceBtn = document.getElementById('replaceBtn');
  const replaceAllBtn = document.getElementById('replaceAllBtn');
  const searchScopeSelect = document.getElementById('searchScope');
  const searchCount = document.getElementById('searchCount');
  const prevMatchBtn = document.getElementById('prevMatchBtn');
  const nextMatchBtn = document.getElementById('nextMatchBtn');
  const closeSearchBtn = document.getElementById('closeSearchBtn');

  // Search State
  let isSearchActive = false;
  let matches = [];
  let currentMatchIndex = -1;

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
  const showFilesCheckbox = document.getElementById('showFiles');
  const showFilenameCheckbox = document.getElementById('showFilename');
  const newFileBtn = document.getElementById('newFileBtn');
  const loadFileBtn = document.getElementById('loadFileBtn');
  const exportMdBtn = document.getElementById('exportMdBtn');
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const exportAllZipBtn = document.getElementById('exportAllZipBtn');
  const helpBtn = document.getElementById('helpBtn');

  // --- Synchronized Scrolling for Editor and Preview ---
  let isSyncingScroll = false;
  const syncScroll = (source, target) => {
    if (isSyncingScroll) return;

    const sourceScrollHeight = source.scrollHeight - source.clientHeight;
    if (sourceScrollHeight <= 0) return; // Don't sync if source has no scrollbar

    isSyncingScroll = true;

    const percentage = source.scrollTop / sourceScrollHeight;
    const targetScrollHeight = target.scrollHeight - target.clientHeight;
    
    target.scrollTop = percentage * targetScrollHeight;

    // Reset lock after a short delay to allow the other pane's scroll event to fire without causing a loop
    setTimeout(() => { isSyncingScroll = false; }, 50);
  };

  editor.addEventListener('scroll', () => {
      syncScroll(editor, preview);
      editorBackdrop.scrollTop = editor.scrollTop;
      editorBackdrop.scrollLeft = editor.scrollLeft;
  });
  preview.addEventListener('scroll', () => syncScroll(preview, editor));
  
  const debouncedSave = debounce(async () => {
    try {
        const currentContent = editor.value;
        const currentFilename = filename.value;

        localStorage.setItem('parsiNegarLastState', JSON.stringify({
            content: currentContent,
            filename: currentFilename,
        }));

        if (currentFilename && currentFilename.trim() !== '' && currentFilename !== 'نام فایل') {
            await saveFileToDB(currentFilename, currentContent);
        }
    } catch(e) {
        console.error("Failed to auto-save", e);
    }
  }, 500);

  // --- Side Panel Logic ---
  const activateTab = (tabName) => {
    const isFiles = tabName === 'files';
    filesTabBtn.classList.toggle('active', isFiles);
    tocTabBtn.classList.toggle('active', !isFiles);
    filesPanel.classList.toggle('active', isFiles);
    tocPanel.classList.toggle('active', !isFiles);

    if (isFiles) {
        populateFilesList();
    } else {
        updateToc();
    }
    const settings = JSON.parse(localStorage.getItem('parsiNegarSettings') || '{}');
    settings.activeTab = tabName;
    localStorage.setItem('parsiNegarSettings', JSON.stringify(settings));
  };
  
  const updateSidePanelVisibility = () => {
      const show = showFilesCheckbox.checked || showTocCheckbox.checked;
      sidePanel.style.display = show ? 'flex' : 'none';
  };
  
  showTocCheckbox.addEventListener('change', (e) => {
    updateSidePanelVisibility();
    if (e.target.checked) {
        activateTab('toc');
    }
    saveSettings();
  });
  
  showFilesCheckbox.addEventListener('change', (e) => {
    updateSidePanelVisibility();
    if (e.target.checked) {
        activateTab('files');
    }
    saveSettings();
  });

  filesTabBtn.addEventListener('click', () => activateTab('files'));
  tocTabBtn.addEventListener('click', () => activateTab('toc'));

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
    
    let html = '<ul class="toc-list-inner">';
    
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
    if (!showTocCheckbox.checked && !tocTabBtn.classList.contains('active')) return;
    
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
  
  const toggleFileActionsMenu = (e) => {
    e.stopPropagation();
    const currentDropdown = e.target.closest('.file-actions-menu').querySelector('.file-actions-dropdown');
    
    document.querySelectorAll('.file-actions-dropdown').forEach(dropdown => {
      if (dropdown !== currentDropdown) {
        dropdown.classList.add('hidden');
      }
    });
    
    currentDropdown.classList.toggle('hidden');
  };

  async function populateFilesList() {
    const currentFilename = filename.value;
    const files = await getAllFilesFromDB();
    files.sort((a, b) => b.lastModified - a.lastModified);
    
    if (files.length === 0) {
        filesList.innerHTML = '<p style="text-align: center; font-size: 0.8rem; opacity: 0.7;">فایلی یافت نشد.</p>';
        return;
    }
  
    filesList.innerHTML = files.map(file => `
      <div class="file-item ${file.id === currentFilename ? 'active' : ''}" data-id="${file.id}">
        <span class="file-name" title="آخرین تغییر: ${new Date(file.lastModified).toLocaleString('fa-IR')}">${file.id}</span>
        <div class="file-actions-menu">
            <button class="file-actions-toggle" title="گزینه‌ها"><i class="fas fa-ellipsis-v"></i></button>
            <div class="file-actions-dropdown hidden">
                <a href="#" class="download-file-btn"><i class="fas fa-download"></i> دانلود</a>
                <a href="#" class="rename-file-btn"><i class="fas fa-edit"></i> تغییر نام</a>
                <a href="#" class="delete-file-btn danger-action"><i class="fas fa-trash"></i> حذف</a>
            </div>
        </div>
      </div>
    `).join('');
  
    filesList.querySelectorAll('.file-name').forEach(el => el.addEventListener('click', handleLoadFile));
    filesList.querySelectorAll('.file-actions-toggle').forEach(el => el.addEventListener('click', toggleFileActionsMenu));
    filesList.querySelectorAll('.download-file-btn').forEach(el => el.addEventListener('click', handleDownloadFile));
    filesList.querySelectorAll('.rename-file-btn').forEach(el => el.addEventListener('click', handleRenameFile));
    filesList.querySelectorAll('.delete-file-btn').forEach(el => el.addEventListener('click', handleDeleteFile));
  }
  
  async function handleLoadFile(e) {
    const id = e.target.closest('.file-item').dataset.id;
    const file = await getFileFromDB(id);
    if (file) {
      editor.value = file.content;
      filename.value = file.id;
      await updatePreview();
      debouncedSave();
    }
  }
  
  async function handleDownloadFile(e) {
    e.preventDefault();
    const id = e.target.closest('.file-item').dataset.id;
    const file = await getFileFromDB(id);
    if (file) {
      const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' });
      downloadFile(blob, id.endsWith('.md') ? id : `${id}.md`);
    }
  }

  async function handleRenameFile(e) {
    e.preventDefault();
    const oldId = e.target.closest('.file-item').dataset.id;
    const newId = prompt('نام جدید فایل را وارد کنید:', oldId);

    if (newId && newId.trim() !== '' && newId !== oldId) {
        const existingFile = await getFileFromDB(newId);
        if (existingFile) {
            alert('خطا: فایلی با این نام از قبل وجود دارد.');
            return;
        }
        const fileToRename = await getFileFromDB(oldId);
        await saveFileToDB(newId, fileToRename.content);
        await deleteFileFromDB(oldId);
        if (filename.value === oldId) {
            filename.value = newId;
            debouncedSave();
        }
        await populateFilesList();
    }
  }
  
  async function handleDeleteFile(e) {
    e.preventDefault();
    const id = e.target.closest('.file-item').dataset.id;
    if (confirm(`آیا از حذف فایل «${id}» مطمئن هستید؟ این عمل بازگشت‌پذیر نیست.`)) {
        await deleteFileFromDB(id);
        if (filename.value === id) {
            editor.value = '';
            filename.value = 'نام فایل';
            await updatePreview();
            localStorage.removeItem('parsiNegarLastState');
        }
        await populateFilesList();
    }
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
      await updatePreview();
      localStorage.removeItem('parsiNegarLastState');
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

  exportAllZipBtn.addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') {
        alert('کتابخانه مورد نیاز برای ساخت فایل فشرده بارگذاری نشده است.');
        return;
    }

    if (!confirm('آیا می‌خواهید از تمام فایل‌های ذخیره شده خروجی زیپ بگیرید؟')) {
        return;
    }

    try {
        const files = await getAllFilesFromDB();
        if (files.length === 0) {
            alert('هیچ فایلی برای خروجی گرفتن وجود ندارد.');
            return;
        }

        const zip = new JSZip();
        files.forEach(file => {
            const filename = file.id.endsWith('.md') ? file.id : `${file.id}.md`;
            zip.file(filename, file.content);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, 'parsiNegar-backup.zip');

    } catch (error) {
        console.error('Error creating zip file:', error);
        alert('خطایی در هنگام ایجاد فایل زیپ رخ داد.');
    }
  });

  helpBtn.addEventListener('click', () => {
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
    { name: 'نمودار', icon: 'fa-sitemap', text: '```mermaid\nflowchart LR\n  A[شروع] --> B{تصمیم}\n  B -->|بله| C[ادامه]\n  B -->|خیر| D[توقف]\n```', filter: 'نمودار' },
    { name: 'نقشه‌ذهنی', icon: 'fa-brain', text: '...نقشه‌ذهنی\n- گره مرکزی\n  - گره یک\n  - گره دو\n  - گره سه\n  - گره چهار\n  - گره پنج\n  - گره شش\n...', filter: 'نقشه‌ذهنی' }
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
    let text;
    // Task lists contain only inline content, while regular lists can contain block content (like other lists).
    // We must use the correct parser for each case to avoid errors with nested lists.
    if (token.task) {
        text = this.parser.parseInline(token.tokens);
    } else {
        text = this.parser.parse(token.tokens);
    }
    
    // The rest of the logic determines text direction based on content.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
    const firstChar = plainText.charAt(0);
    const direction = /[a-zA-Z]/.test(firstChar) ? 'ltr' : 'rtl';
    const style = `style="direction: ${direction}; text-align: ${direction === 'ltr' ? 'left' : 'right'}"`;

    if (token.task) {
      const checkbox = `<input type="checkbox" disabled ${token.checked ? 'checked' : ''}>`;
      // The `text` from parseInline will not be wrapped in `<p>` tags.
      return `<li class="task-list" ${style}>${checkbox} ${text}</li>`;
    }
    
    // For regular list items, `parse()` might wrap content in `<p>` tags if the list is "loose".
    // This is the correct behavior. The style is applied to the `<li>` element.
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

  // Override code rendering for Mermaid.js and syntax highlighting
  markedRenderer.code = function(token) {
    const { text, lang } = token;
    if (lang === 'mermaid') {
      return `<div class="mermaid">${text}</div>`;
    }

    if (typeof hljs !== 'undefined') {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        try {
            const highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
            return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
        } catch (e) {
            console.error('Highlighting error', e);
        }
    }

    // Fallback for when hljs is not available or fails
    function escapeHtml(unsafe) {
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    return `<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(text)}</code></pre>`;
  };
  
  marked.setOptions({
    renderer: markedRenderer,
    gfm: true,
    breaks: true,
    headerIds: false,
    // Use `parseInline` for simpler token sets without block-level elements like paragraphs.
    // This is especially useful for things like table cells or, in our case, mind map nodes.
    // However, we are calling `marked.parseInline` directly where needed.
  });

  // Load README.md content
  async function loadReadme() {
    try {
      const response = await fetch('./README.md');
      if (response.ok) {
        const content = await response.text();
        editor.value = content;
        filename.value = 'README.md';
        await updatePreview();
        await saveFileToDB('README.md', content);
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

  // --- Theme and Syntax Highlighting ---
  function setHljsTheme(theme) {
    const lightTheme = document.getElementById('hljs-light-theme');
    const darkTheme = document.getElementById('hljs-dark-theme');

    if (!lightTheme || !darkTheme) return;

    if (theme === 'dark') {
        lightTheme.disabled = true;
        darkTheme.disabled = false;
    } else { // light and sepia use the light theme
        lightTheme.disabled = false;
        darkTheme.disabled = true;
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
      setHljsTheme(settings.theme);
    }
    
    // Apply font size
    if (settings.fontSize) {
      editor.style.fontSize = `${settings.fontSize}px`;
      editorBackdrop.style.fontSize = `${settings.fontSize}px`;
      fontSizeSelect.value = settings.fontSize;
    }
    
    // Apply font family
    if (settings.fontFamily) {
      editor.style.fontFamily = settings.fontFamily;
      editorBackdrop.style.fontFamily = settings.fontFamily;
      fontFamilySelect.value = settings.fontFamily;
    }
    
    // Apply markdown parser
    if (settings.markdownParser) {
      markdownParserSelect.value = settings.markdownParser;
    }

    // Apply search scope
    if (settings.searchScope) {
      searchScopeSelect.value = settings.searchScope;
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
    }

    if (settings.showFiles !== undefined) {
      showFilesCheckbox.checked = settings.showFiles;
    }

    if (settings.showFilename !== undefined) {
      showFilenameCheckbox.checked = settings.showFilename;
      filename.style.display = settings.showFilename ? 'block' : 'none';
    }

    updateSidePanelVisibility();
    if (showFilesCheckbox.checked || showTocCheckbox.checked) {
        activateTab(settings.activeTab || 'files');
    }
  }
  
  // Save settings to localStorage
  function saveSettings() {
    const activeTab = filesTabBtn.classList.contains('active') ? 'files' : 'toc';
    const settings = {
      theme: document.querySelector('input[name="theme"]:checked').value,
      fontSize: fontSizeSelect.value,
      fontFamily: fontFamilySelect.value,
      markdownParser: markdownParserSelect.value,
      searchScope: searchScopeSelect.value,
      showToolbar: showToolbarCheckbox.checked,
      showStatusBar: showStatusBarCheckbox.checked,
      showToc: showTocCheckbox.checked,
      showFiles: showFilesCheckbox.checked,
      showFilename: showFilenameCheckbox.checked,
      activeTab: activeTab,
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
  async function insertShortcut(shortcut) {
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
    await updatePreview();
  }

  // Handle keyboard events for shortcuts menu and list continuation
  editor.addEventListener('keydown', async (e) => {
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
            await insertShortcut(filteredShortcuts[selectedShortcutIndex]);
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
        await updatePreview();
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
      await updatePreview();
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
          await updatePreview();
        }
      }
    }
  });

  const debouncedSearch = debounce(() => performSearch(), 300);

  // Handle input for shortcuts menu
  editor.addEventListener('input', async (e) => {
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

    await updatePreview();
    debouncedSave();
    if(isSearchActive) {
      debouncedSearch();
    }
    
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
    // Close file actions dropdown
    document.querySelectorAll('.file-actions-dropdown:not(.hidden)').forEach(dropdown => {
        if (!e.target.closest('.file-actions-menu')) {
             dropdown.classList.add('hidden');
        }
    });
  });
  
  // Update preview and stats
  async function updatePreview() {
    const markdown = editor.value;

    // Handle Mind Map blocks
    const mindmapBlocks = [];
    const placeholderMarkdown = markdown.replace(/^\.\.\.نقشه‌ذهنی\n([\s\S]*?)\n\.\.\.$/gm, (match, content) => {
      const id = `mindmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      mindmapBlocks.push({ id, content });
      return `<div id="${id}" class="mindmap-placeholder"></div>`;
    });

    preview.innerHTML = parseMarkdown(placeholderMarkdown);
    
    // Render Mind Maps
    for (const block of mindmapBlocks) {
      const container = preview.querySelector(`#${block.id}`);
      if (container) {
        container.classList.add('mindmap-container');
        container.classList.remove('mindmap-placeholder');
        try {
          createInteractiveMindMap(container, block.content);
        } catch (e) {
          console.error("Failed to render mindmap:", e);
          container.innerHTML = '<p style="padding: 1rem; text-align: center;">خطا در رسم مایندمپ.</p>';
        }
      }
    }

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

    // Add copy buttons to code blocks
    preview.querySelectorAll('pre').forEach(pre => {
      if (!pre.parentElement.classList.contains('code-block-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
  
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.title = 'رونوشت';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
  
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        wrapper.appendChild(copyBtn);
  
        copyBtn.addEventListener('click', () => {
          const codeToCopy = pre.querySelector('code')?.innerText || pre.innerText;

          const copyAction = new Promise((resolve, reject) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(codeToCopy).then(resolve).catch(reject);
            } else {
              // Fallback for non-secure contexts (e.g., file://)
              try {
                const textArea = document.createElement("textarea");
                textArea.value = codeToCopy;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                  resolve();
                } else {
                  reject(new Error('Copy command was unsuccessful'));
                }
              } catch (err) {
                reject(err);
              }
            }
          });

          copyAction.then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            copyBtn.title = 'کپی شد';
            setTimeout(() => {
              copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
              copyBtn.title = 'رونوشت';
            }, 2000);
          }).catch(err => {
            console.error('Failed to copy code: ', err);
            copyBtn.title = 'خطا در کپی';
          });
        });
      }
    });

    if (isSearchActive && searchInput.value) {
        performSearch(false);
    }
    
    // Update active side panel content
    if (sidePanel.style.display !== 'none') {
        if (filesTabBtn.classList.contains('active')) {
            populateFilesList();
        } else {
            updateToc();
        }
    }
    
    // Update stats
    const chars = editor.value.length;
    const letters = editor.value.replace(/[^A-Za-z\u0600-\u06FF]/g, '').length;
    const words = editor.value.trim() ? editor.value.trim().split(/\s+/).length : 0;
    const lines = editor.value.split('\n').length;
    const size = new Blob([editor.value]).size;
    
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
    radio.addEventListener('change', async (e) => {
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
      document.body.classList.add(`theme-${e.target.value}`);
      saveSettings();
      configureMermaidTheme();
      setHljsTheme(e.target.value);
      await updatePreview();
    });
  });
  
  // Settings handlers
  fontSizeSelect.addEventListener('change', (e) => {
    const size = e.target.value;
    editor.style.fontSize = `${size}px`;
    editorBackdrop.style.fontSize = `${size}px`;
    saveSettings();
  });
  
  fontFamilySelect.addEventListener('change', (e) => {
    const font = e.target.value;
    editor.style.fontFamily = font;
    editorBackdrop.style.fontFamily = font;
    saveSettings();
  });
  
  // Toolbar actions
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', async () => {
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
          await updatePreview();
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
        case 'mindmap':
          newText = '...نقشه‌ذهنی\n- گره مرکزی\n  - گره یک\n  - گره دو\n  - گره سه\n  - گره چهار\n  - گره پنج\n  - گره شش\n...';
          newCursorPos = start + newText.length;
          break;
      }
      
      if (action !== 'heading') {
        editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
        editor.setSelectionRange(newCursorPos, newCursorPos);
        await updatePreview();
      }
    });
  });
  
  // Undo/Redo
  document.getElementById('undoBtn').addEventListener('click', async () => {
    if (historyIndex > 0) {
      historyIndex--;
      editor.value = history[historyIndex];
      await updatePreview();
    }
  });
  
  document.getElementById('redoBtn').addEventListener('click', async () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      editor.value = history[historyIndex];
      await updatePreview();
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
      await updatePreview();
      fileInput.value = '';
      await saveFileToDB(file.name, e.target.result);
      await populateFilesList();
    };
    reader.readAsText(file);
  });

  // Update filename when editing
  let oldFilenameOnFocus = '';
  filename.addEventListener('focus', () => {
    oldFilenameOnFocus = filename.value;
  });
  filename.addEventListener('change', async () => {
    const newFilename = filename.value.trim();
    if (!newFilename || newFilename === 'نام فایل') {
      filename.value = oldFilenameOnFocus;
      return;
    }
    if (oldFilenameOnFocus && newFilename !== oldFilenameOnFocus && oldFilenameOnFocus !== 'نام فایل') {
        await deleteFileFromDB(oldFilenameOnFocus);
    }
    await saveFileToDB(newFilename, editor.value);
    await populateFilesList();
    saveSettings();
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
  
  clearDBBtn.addEventListener('click', async () => {
    if (confirm('آیا مطمئن هستید؟ تمام فایل‌های ذخیره شده برای همیشه پاک خواهند شد. این عمل بازگشت‌پذیر نیست.')) {
      await clearFilesDB();
      await populateFilesList();
      editor.value = '';
      filename.value = 'نام فایل';
      await updatePreview();
      localStorage.removeItem('parsiNegarLastState');
      alert('تمام داده‌ها پاک شدند.');
    }
  });

  // Add event listener for markdown parser change
  markdownParserSelect.addEventListener('change', async () => {
    saveSettings();
    await updatePreview();
  });
  
  // --- Search Functionality ---
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function updateReplaceButtonsState() {
    const hasSearchTerm = searchInput.value !== '';
    const hasReplaceTerm = replaceInput.value !== '';
    const activeMatch = (currentMatchIndex > -1 && matches.length > 0) ? matches[currentMatchIndex] : null;

    const canReplaceOne = activeMatch && activeMatch.dataset.start && hasSearchTerm && hasReplaceTerm;
    replaceBtn.disabled = !canReplaceOne;

    const canReplaceAll = matches.some(m => m.dataset.start) && hasSearchTerm && hasReplaceTerm;
    replaceAllBtn.disabled = !canReplaceAll;
  }

  function openSearchBar() {
    isSearchActive = true;
    searchBar.classList.remove('hidden');
    searchInput.focus();
    searchInput.select();
    performSearch();
    updateReplaceButtonsState();
  }

  async function closeSearchBar() {
    isSearchActive = false;
    searchBar.classList.add('hidden');
    searchInput.value = '';
    replaceInput.value = '';
    matches = [];
    currentMatchIndex = -1;
    editorBackdrop.innerHTML = '';
    editor.classList.remove('searching');
    updateReplaceButtonsState();
    await updatePreview(); // Re-render preview to remove highlights
  }

  function performSearch(resetIndex = true) {
    const term = searchInput.value;
    const scope = searchScopeSelect.value;

    // 1. Clear all previous highlights
    editorBackdrop.innerHTML = '';
    preview.querySelectorAll('mark.highlight').forEach(m => {
        const parent = m.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(m.textContent), m);
            parent.normalize();
        }
    });

    if (!term) {
        matches = [];
        currentMatchIndex = -1;
        updateSearchCount();
        editor.classList.remove('searching');
        updateActiveHighlight(); // This will update button states
        return;
    }

    // 2. Decide whether to make editor text transparent based on scope
    editor.classList.toggle('searching', scope === 'editor' || scope === 'all');

    const regex = new RegExp(escapeRegExp(term), 'gi');
    let editorMatches = [];
    let previewMatches = [];

    // 3. Highlight in editor based on scope
    if (scope === 'editor' || scope === 'all') {
        const editorContent = editor.value;
        let match;
        const localEditorMatches = [];
        const findRegex = new RegExp(escapeRegExp(term), 'gi');
        while ((match = findRegex.exec(editorContent)) !== null) {
            localEditorMatches.push({
                start: match.index,
                end: match.index + match[0].length,
                text: match[0]
            });
        }

        let backdropHTML = '';
        let lastIndex = 0;
        const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

        localEditorMatches.forEach(m => {
            backdropHTML += escapeHtml(editorContent.substring(lastIndex, m.start));
            backdropHTML += `<mark class="highlight">${escapeHtml(m.text)}</mark>`;
            lastIndex = m.end;
        });
        backdropHTML += escapeHtml(editorContent.substring(lastIndex));
        editorBackdrop.innerHTML = backdropHTML;
        
        editorMatches = Array.from(editorBackdrop.querySelectorAll('.highlight'));
        editorMatches.forEach((el, i) => {
            el.dataset.start = localEditorMatches[i].start;
            el.dataset.end = localEditorMatches[i].end;
        });
    }

    // 4. Highlight in preview based on scope
    if (scope === 'preview' || scope === 'all') {
        const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let currentNode;
        while(currentNode = walker.nextNode()) {
            if (!currentNode.parentElement.closest('script, style, pre, code')) {
                textNodes.push(currentNode);
            }
        }

        textNodes.forEach(node => {
            if (node.nodeValue.match(regex)) {
                const newNode = document.createElement('span');
                newNode.innerHTML = node.nodeValue.replace(regex, `<mark class="highlight">$&</mark>`);
                if (node.parentNode) {
                   node.parentNode.replaceChild(newNode, node);
                   newNode.replaceWith(...newNode.childNodes);
                }
            }
        });
        previewMatches = Array.from(preview.querySelectorAll('.highlight'));
    }

    // 5. Combine matches and update UI
    matches = [...editorMatches, ...previewMatches];
    if (resetIndex) {
        currentMatchIndex = matches.length > 0 ? 0 : -1;
    } else {
         if (currentMatchIndex >= matches.length) {
            currentMatchIndex = matches.length > 0 ? matches.length - 1 : -1;
        }
    }
    updateActiveHighlight();
  }

  function updateActiveHighlight() {
    matches.forEach(m => m.classList.remove('active'));
    if (currentMatchIndex > -1 && matches[currentMatchIndex]) {
        const activeMatch = matches[currentMatchIndex];
        activeMatch.classList.add('active');
        activeMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateSearchCount();
    updateReplaceButtonsState();
  }

  function navigateMatches(direction) {
    if (matches.length === 0) return;
    currentMatchIndex += direction;
    if (currentMatchIndex < 0) {
        currentMatchIndex = matches.length - 1;
    } else if (currentMatchIndex >= matches.length) {
        currentMatchIndex = 0;
    }
    updateActiveHighlight();
  }

  function updateSearchCount() {
    if (matches.length > 0) {
        searchCount.textContent = `${currentMatchIndex + 1}/${matches.length}`;
    } else {
        searchCount.textContent = searchInput.value ? '0/0' : '';
    }
  }

  searchBtn.addEventListener('click', () => {
    if (isSearchActive) {
      closeSearchBar();
    } else {
      openSearchBar();
    }
  });
  closeSearchBtn.addEventListener('click', closeSearchBar);
  searchInput.addEventListener('input', () => {
    debouncedSearch();
    updateReplaceButtonsState();
  });
  replaceInput.addEventListener('input', updateReplaceButtonsState);
  searchScopeSelect.addEventListener('change', () => performSearch());
  nextMatchBtn.addEventListener('click', () => navigateMatches(1));
  prevMatchBtn.addEventListener('click', () => navigateMatches(-1));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        navigateMatches(e.shiftKey ? -1 : 1);
    }
  });

  replaceBtn.addEventListener('click', async () => {
    const replaceText = replaceInput.value;
    const activeMatch = matches[currentMatchIndex];
    if (!activeMatch || !activeMatch.dataset.start || replaceBtn.disabled) return;

    const start = parseInt(activeMatch.dataset.start);
    const end = parseInt(activeMatch.dataset.end);
    const scrollTop = editor.scrollTop;
    const positionToFind = start + replaceText.length;

    // Temporarily disable search to prevent updatePreview from re-running it
    const wasSearchActive = isSearchActive;
    isSearchActive = false;

    // Modify editor content
    editor.value = editor.value.substring(0, start) + replaceText + editor.value.substring(end);
    
    debouncedSave();
    await updatePreview();

    // Re-enable search and re-run it
    isSearchActive = wasSearchActive;
    performSearch(false);
    
    const newIndex = matches.findIndex(m => m.dataset.start && parseInt(m.dataset.start) >= positionToFind);
    currentMatchIndex = newIndex !== -1 ? newIndex : (matches.length > 0 ? 0 : -1);
    
    updateActiveHighlight();
    
    editor.focus();
    editor.setSelectionRange(positionToFind, positionToFind);
    editor.scrollTop = scrollTop;
  });

  replaceAllBtn.addEventListener('click', async () => {
      const searchText = searchInput.value;
      const replaceText = replaceInput.value;
      if (replaceAllBtn.disabled || !searchText) return;
      
      const regex = new RegExp(escapeRegExp(searchText), 'gi');
      const scrollTop = editor.scrollTop;

      // Temporarily disable search to prevent updatePreview from re-running it
      const wasSearchActive = isSearchActive;
      isSearchActive = false;

      editor.value = editor.value.replace(regex, replaceText);
      
      debouncedSave();
      await updatePreview();

      // Re-enable search and re-run to clear/update highlights
      isSearchActive = wasSearchActive;
      performSearch();
      
      editor.focus();
      editor.scrollTop = scrollTop;
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        openSearchBar();
    }
    if (e.key === 'Escape') {
      if (isSearchActive) {
        e.preventDefault();
        closeSearchBar();
      } else if (isShortcutMenuVisible) {
        e.preventDefault();
        hideShortcutsMenu();
      }
    }
  });

  // --- Mind Map Functionality ---
  const mindmapMeasurementDiv = document.createElement('div');
  mindmapMeasurementDiv.style.position = 'absolute';
  mindmapMeasurementDiv.style.visibility = 'hidden';
  mindmapMeasurementDiv.style.height = 'auto';
  mindmapMeasurementDiv.style.width = 'auto';
  mindmapMeasurementDiv.style.whiteSpace = 'nowrap';
  mindmapMeasurementDiv.style.fontFamily = 'Vazirmatn, sans-serif';
  mindmapMeasurementDiv.style.fontSize = '14px';
  mindmapMeasurementDiv.style.padding = '10px 20px'; // Corresponds to NODE_PADDING_Y and NODE_PADDING_X
  mindmapMeasurementDiv.style.zIndex = '-1';
  document.getElementById('app').appendChild(mindmapMeasurementDiv);

  function parseMindmapConfigAndData(rawContent) {
    const config = {
      layout: 'rtl', // 'rtl' (one-sided) or 'two-sided'
      border: 'none', // 'none', 'rectangle', 'ellipse'
    };
    const lines = rawContent.trim().split('\n');
    let dataLines = lines;

    if (lines.length > 0 && lines[0].trim().startsWith('تنظیمات:')) {
      const configLine = lines[0].replace('تنظیمات:', '').trim();
      dataLines = lines.slice(1);
      
      if (configLine.includes('دو طرف')) config.layout = 'two-sided';
      if (configLine.includes('مستطیل')) config.border = 'rectangle';
      else if (configLine.includes('بیضی')) config.border = 'ellipse';
    }
    
    return { config, dataText: dataLines.join('\n') };
  }

  function parseMindmapData(text) {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return null;
  
    const getIndent = (line) => line.search(/\S|$/);
    
    const firstLineIndent = getIndent(lines[0]);
    const rootNodes = [];
    const path = []; // a stack of nodes
  
    for (const line of lines) {
      const indent = getIndent(line);
      const node = { 
        text: line.trim().replace(/^- /, ''), 
        children: [], 
        isCollapsed: false,
        id: `mindmap-node-${Math.random().toString(36).substr(2, 9)}`
      };
      
      const level = indent < firstLineIndent ? 0 : Math.floor((indent - firstLineIndent) / 2);
  
      while (level < path.length) {
        path.pop();
      }
  
      if (path.length === 0) {
        rootNodes.push(node);
      } else {
        path[path.length - 1].children.push(node);
      }
      path.push(node);
    }
    
    if (rootNodes.length === 1) return rootNodes[0];
    
    const rootText = config.layout === 'two-sided' ? 'نقشه‌ذهنی' : (rootNodes[0]?.text || 'نقشه‌ذهنی');
    const rootChildren = rootNodes.length === 1 ? rootNodes[0].children : rootNodes;
    
    return { text: rootText, children: rootChildren, isCollapsed: false, id: 'mindmap-root' };
  }
  
  function createInteractiveMindMap(container, rawContent) {
    const { config, dataText } = parseMindmapConfigAndData(rawContent);
    const rootData = parseMindmapData(dataText, config);

    if (!rootData) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center;">ساختار مایندمپ نامعتبر است.</p>';
        return;
    }
  
    const NODE_PADDING_X = 20;
    const NODE_PADDING_Y = 10;
    const LEVEL_WIDTH = 200;
    const VERTICAL_GAP = 25;
  
    container.innerHTML = '';
  
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);
    container.appendChild(svg);
    svg.classList.add('mindmap-svg');
  
    let transform = { x: 0, y: 0, k: 1 };
  
    function applyTransform() {
      g.setAttribute('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
    }
  
    function redrawMindmap() {
      g.innerHTML = '';
  
      function measureNodes(node) {
        mindmapMeasurementDiv.innerHTML = marked.parseInline(node.text || ' ');
        node.width = mindmapMeasurementDiv.offsetWidth;
        node.height = mindmapMeasurementDiv.offsetHeight;
        if (!node.isCollapsed) node.children.forEach(measureNodes);
      }
      measureNodes(rootData);
  
      if (config.layout === 'two-sided') {
        const rightChildren = rootData.children.filter((_, i) => i % 2 === 0);
        const leftChildren = rootData.children.filter((_, i) => i % 2 !== 0);
        let rightY = 0, leftY = 0;
  
        function doLayoutBranch(node, depth, isRight) {
          const direction = isRight ? 1 : -1;
          const rootWidthOffset = (rootData.width / 2) + 40;
          node.x = direction * (depth * LEVEL_WIDTH * 0.75 + rootWidthOffset);
  
          if (node.isCollapsed || node.children.length === 0) {
            if (isRight) {
              node.y = rightY;
              rightY += node.height + VERTICAL_GAP;
            } else {
              node.y = leftY;
              leftY += node.height + VERTICAL_GAP;
            }
          } else {
            node.children.forEach(child => doLayoutBranch(child, depth + 1, isRight));
            const firstChild = node.children[0];
            const lastChild = node.children[node.children.length - 1];
            node.y = (firstChild.y + lastChild.y) / 2;
          }
        }
        
        rightChildren.forEach(child => doLayoutBranch(child, 1, true));
        leftChildren.forEach(child => doLayoutBranch(child, 1, false));
  
        const totalHeight = Math.max(rightY, leftY);
        const rightShift = (totalHeight - rightY) / 2;
        const leftShift = (totalHeight - leftY) / 2;
  
        function shiftYs(node, shift) {
          node.y += shift;
          if (!node.isCollapsed) node.children.forEach(child => shiftYs(child, shift));
        }
        
        rightChildren.forEach(node => shiftYs(node, rightShift));
        leftChildren.forEach(node => shiftYs(node, leftShift));
        
        rootData.x = 0;
        rootData.y = totalHeight / 2;
  
      } else { // RTL layout
        let y = 0;
        function doLayoutRTL(node, depth) {
          node.x = -depth * LEVEL_WIDTH;
          if (node.isCollapsed || node.children.length === 0) {
            node.y = y;
            y += node.height + VERTICAL_GAP;
          } else {
            node.children.forEach(child => doLayoutRTL(child, depth + 1));
            const firstChild = node.children[0];
            const lastChild = node.children[node.children.length - 1];
            node.y = (firstChild.y + lastChild.y) / 2;
          }
        }
        doLayoutRTL(rootData, 0);
      }
      
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
      function draw(node, parent = null) {
        if (parent) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.classList.add('mindmap-connector');
          
          const startX = parent.x + (node.x > parent.x ? parent.width / 2 : -parent.width / 2);
          const startY = parent.y + parent.height / 2;
          const endX = node.x + (node.x > parent.x ? -node.width / 2 : node.width / 2);
          const endY = node.y + node.height / 2;
          
          const c1X = startX + (endX - startX) / 2;
          const c1Y = startY;
          const c2X = startX + (endX - startX) / 2;
          const c2Y = endY;
              
          path.setAttribute('d', `M ${startX},${startY} C ${c1X},${c1Y} ${c2X},${c2Y} ${endX},${endY}`);
          g.insertBefore(path, g.firstChild);
        }
  
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.classList.add('mindmap-node', `border-${config.border}`);
        nodeGroup.setAttribute('transform', `translate(${node.x - node.width / 2}, ${node.y})`);
          
        let shape;
        if (config.border === 'ellipse') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            shape.setAttribute('rx', node.width / 2);
            shape.setAttribute('ry', node.height / 2);
            shape.setAttribute('cx', node.width / 2);
            shape.setAttribute('cy', node.height / 2);
        } else {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shape.setAttribute('width', node.width);
            shape.setAttribute('height', node.height);
            if(config.border === 'rectangle') shape.setAttribute('rx', 8);
        }
        shape.classList.add('mindmap-node-shape');
        if(config.border === 'none') shape.classList.add('shape-none');
        
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('x', 0);
        fo.setAttribute('y', 0);
        fo.setAttribute('width', node.width);
        fo.setAttribute('height', node.height);

        const div = document.createElement('div');
        div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        div.className = 'mindmap-node-content';
        div.innerHTML = marked.parseInline(node.text || ' ');
        fo.appendChild(div);
    
        nodeGroup.appendChild(shape);
        nodeGroup.appendChild(fo);
        g.appendChild(nodeGroup);

        if (node.children.length > 0) {
          const btn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          btn.classList.add('mindmap-collapse-btn');

          let btnX;
          if (config.layout === 'two-sided') {
            // For two-sided layout: if the node is on the right branch (or is the root),
            // the button is on the right. Otherwise, it's on the left.
            btnX = (node.x >= 0) ? node.width : 0;
          } else {
            // For one-sided 'rtl' layout, the button is always on the left.
            btnX = 0;
          }
          
          btn.setAttribute('transform', `translate(${btnX}, ${node.height / 2})`);
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('r', 8);
          
          const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textEl.textContent = node.isCollapsed ? '+' : '−';
          
          btn.appendChild(circle);
          btn.appendChild(textEl);
          nodeGroup.appendChild(btn);

          btn.addEventListener('click', (e) => {
              e.stopPropagation();
              node.isCollapsed = !node.isCollapsed;
              redrawMindmap();
          });
        }
        
        const currentX = node.x - node.width / 2;
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX + node.width);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y + node.height);
          
        if (!node.isCollapsed) {
          node.children.forEach(child => draw(child, node));
        }
      }
      draw(rootData);
      
      recenterAndScale(minX, maxX, minY, maxY, config);
    }
  
    function recenterAndScale(minX, maxX, minY, maxY, config) {
      const graphWidth = maxX - minX;
      const graphHeight = maxY - minY;
      const viewWidth = container.clientWidth;
      const viewHeight = container.clientHeight;
      if (viewWidth <= 0 || viewHeight <= 0 || graphWidth <= 0 || graphHeight <= 0) return;
  
      const scaleX = viewWidth / (graphWidth + NODE_PADDING_X * 4);
      const scaleY = viewHeight / (graphHeight + NODE_PADDING_Y * 4);
      const scale = Math.min(scaleX, scaleY, 1);
      
      const centerX = minX + graphWidth / 2;
      const centerY = minY + graphHeight / 2;
      
      let tx = (viewWidth / 2) - (centerX * scale);
      const ty = (viewHeight / 2) - (centerY * scale);

      if (config.layout === 'rtl') {
        const rightPadding = NODE_PADDING_X * 2;
        tx = viewWidth - (maxX * scale) - rightPadding;
      }
  
      transform = { x: tx, y: ty, k: scale };
      applyTransform();
    }
    
    redrawMindmap();
    
    let isPanning = false;
    let startPoint = { x: 0, y: 0 };
    
    svg.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isPanning = true;
      svg.classList.add('grabbing');
      startPoint = { x: e.clientX, y: e.clientY };
    });
    
    svg.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      e.preventDefault();
      const endPoint = { x: e.clientX, y: e.clientY };
      transform.x += endPoint.x - startPoint.x;
      transform.y += endPoint.y - startPoint.y;
      startPoint = endPoint;
      applyTransform();
    });
    
    const stopPanning = () => {
      isPanning = false;
      svg.classList.remove('grabbing');
    };
    svg.addEventListener('mouseup', stopPanning);
    svg.addEventListener('mouseleave', stopPanning);
  
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.1, Math.min(3, transform.k * (1 + delta)));
      
      const svgRect = svg.getBoundingClientRect();
      const mouseInSvg = { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top };
  
      transform.x = mouseInSvg.x - (mouseInSvg.x - transform.x) * (newScale / transform.k);
      transform.y = mouseInSvg.y - (mouseInSvg.y - transform.y) * (newScale / transform.k);
      transform.k = newScale;
      
      applyTransform();
    });

    // --- Resizing Logic ---
    const resizeHandle = document.createElement('div');
    resizeHandle.classList.add('mindmap-resize-handle');
    container.appendChild(resizeHandle);
  
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const newHeight = e.clientY - rect.top;
      container.style.height = `${Math.max(200, newHeight)}px`;
    };
  
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      redrawMindmap();
    };
  
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Load settings on startup
  loadSettings();

  // Load content from localStorage or default to README
  try {
    const lastStateJSON = localStorage.getItem('parsiNegarLastState');
    if (lastStateJSON) {
        const lastState = JSON.parse(lastStateJSON);
        editor.value = lastState.content;
        filename.value = lastState.filename;
    } else {
        await loadReadme();
    }
  } catch (e) {
      console.error("Could not load last state, loading README.", e);
      await loadReadme();
  }

  history = [editor.value];
  historyIndex = 0;

  configureMermaidTheme();
  
  // Initial preview and panels
  await updatePreview();
});