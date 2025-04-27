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
  const fontSizeSelect = document.getElementById('fontSize');
  const fontFamilySelect = document.getElementById('fontFamily');
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  const autoSaveCheckbox = document.getElementById('autoSave');
  
  // Stats elements
  const charsCount = document.getElementById('charsCount');
  const lettersCount = document.getElementById('lettersCount');
  const wordsCount = document.getElementById('wordsCount');
  const linesCount = document.getElementById('linesCount');
  const fileSize = document.getElementById('fileSize');
  
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
    
    // Apply auto save
    if (settings.autoSave !== undefined) {
      autoSaveCheckbox.checked = settings.autoSave;
    }
  }
  
  // Save settings to localStorage
  function saveSettings() {
    const settings = {
      theme: document.querySelector('input[name="theme"]:checked').value,
      fontSize: fontSizeSelect.value,
      fontFamily: fontFamilySelect.value,
      autoSave: autoSaveCheckbox.checked
    };
    
    localStorage.setItem('parsiNegarSettings', JSON.stringify(settings));
  }
  
  // History for undo/redo
  let history = [editor.value];
  let historyIndex = 0;
  
  // Initialize marked
  marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: false
  });
  
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
  
  editor.addEventListener('keydown', (e) => {
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
  
  // Update preview and stats
  function updatePreview() {
    const markdown = editor.value;
    preview.innerHTML = marked.parse(markdown);
    
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
    
    // Auto save if enabled
    if (autoSaveCheckbox.checked) {
      localStorage.setItem('parsiNegarContent', markdown);
    }
  }
  
  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} بایت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
  }
  
  // Handle editor changes
  editor.addEventListener('input', () => {
    updatePreview();
    
    // Add to history if significant change
    if (history[historyIndex] !== editor.value) {
      history = history.slice(0, historyIndex + 1);
      history.push(editor.value);
      historyIndex++;
    }
  });
  
  // Theme handling
  themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
      document.body.classList.add(`theme-${e.target.value}`);
      saveSettings();
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
  
  autoSaveCheckbox.addEventListener('change', saveSettings);
  
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
          newCursorPos = start + 10;
          break;
        case 'link':
          newText = `[${selectedText} || ]()`;
          newCursorPos = selectedText ? end + 12 : start + 13;
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
    reader.onload = (e) => {
      editor.value = e.target.result;
      updatePreview();
      fileInput.value = '';
    };
    reader.readAsText(file);
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
    ${document.querySelector('style').textContent}
  </style>
</head>
<body id="html-output" class="theme-${document.querySelector('input[name="theme"]:checked').value}">
  <div class="markdown-printed">
    ${preview.innerHTML}
  </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadFile(blob, 'document.html');
  });
  
  // Download Markdown
  downloadMdBtn.addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
    downloadFile(blob, 'document.md');
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
      filename: 'document.pdf',
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
  
  const toolbarLeft = document.querySelector('.toolbar-left');
  
  // Fullscreen toggle
  fullscreenBtn.addEventListener('click', () => {
    if (editorContainer.style.display === 'none') {
      // // Exit fullscreen mode
      editorContainer.style.display = 'flex';
      // previewContainer.style.flex = '1';
      previewContainer.classList.remove('fullscreen');
      document.querySelector('#toolbar').classList.remove('fullscreen');
      // toolbarLeft.style.display = 'flex';
      // fullscreenBtn.style.marginLeft = '25rem';
      // fullscreenBtn.style.marginRight = '25rem';
      // document.querySelector('.toolbar-left').appendChild(fullscreenBtn);
    } else {
      // Enter fullscreen mode
      editorContainer.style.display = 'none';
      // previewContainer.style.flex = '2';
      previewContainer.classList.add('fullscreen');
      document.querySelector('#toolbar').classList.add('fullscreen');
      // toolbarLeft.style.display = 'none';
      // fullscreenBtn.style.marginRight = '0';
      // document.querySelector('#toolbar').insertBefore(fullscreenBtn);
    }
  });
  
  // Settings panel
  settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
    saveSettings();
  });
  
  // Load saved content if auto save was enabled
  const savedContent = localStorage.getItem('parsiNegarContent');
  if (savedContent && autoSaveCheckbox.checked) {
    editor.value = savedContent;
    updatePreview();
  }
  
  // Load settings on startup
  loadSettings();
  
  // Initial preview
  updatePreview();
}); // End DOMContentLoaded listener