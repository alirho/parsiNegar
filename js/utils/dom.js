// ماژول ابزارهای کمکی برای کار با DOM

/**
 * یک انتخاب‌گر ساده مانند جی‌کوئری
 * @param {string} selector - انتخاب‌گر CSS
 * @param {Element} [scope=document] - المانی که جستجو در آن انجام می‌شود
 * @returns {Element|null}
 */
export const qs = (selector, scope = document) => scope.querySelector(selector);

/**
 * یک انتخاب‌گر ساده برای یافتن تمام المان‌ها
 * @param {string} selector - انتخاب‌گر CSS
 * @param {Element} [scope=document] - المانی که جستجو در آن انجام می‌شود
 * @returns {NodeListOf<Element>}
 */
export const qsa = (selector, scope = document) => scope.querySelectorAll(selector);

// آبجکتی برای نگهداری تمام المان‌های DOM که به طور مکرر استفاده می‌شوند
export const elements = {
  // المان‌های اصلی
  editor: qs('#editor'),
  preview: qs('#preview'),
  editorBackdrop: qs('#editorBackdrop'),
  editorContainer: qs('#editorContainer'),
  previewContainer: qs('#previewContainer'),
  content: qs('#content'),

  // نوار ابزار
  toolbar: qs('#toolbar'),
  uploadBtn: qs('#uploadBtn'),
  downloadMdBtn: qs('#downloadMdBtn'),
  downloadHtmlBtn: qs('#downloadHtmlBtn'),
  downloadPdfBtn: qs('#downloadPdfBtn'),
  undoBtn: qs('#undoBtn'),
  redoBtn: qs('#redoBtn'),
  
  // نوار وضعیت
  statusBar: qs('#statusBar'),
  charsCount: qs('#charsCount'),
  lettersCount: qs('#lettersCount'),
  wordsCount: qs('#wordsCount'),
  linesCount: qs('#linesCount'),
  fileSize: qs('#fileSize'),
  filename: qs('#filename'),

  // پنل کناری
  sidePanel: qs('#sidePanel'),
  tocPanel: qs('#tocPanel'),
  filesPanel: qs('#filesPanel'),
  tocList: qs('.toc-list'),
  filesList: qs('.files-list'),
  filesTabBtn: qs('.side-panel-tab[data-tab="files"]'),
  tocTabBtn: qs('.side-panel-tab[data-tab="toc"]'),

  // منو
  addMenu: (() => {
    const menuLinks = qsa('#menuBar .menu > li > a');
    const addLink = Array.from(menuLinks).find(a => a.textContent.trim() === 'افزودن');
    return addLink ? addLink.closest('li').querySelector('.submenu') : null;
  })(),
  copyAllBtn: qs('#copyAllBtn'),
  fullscreenBtn: qs('#fullscreenBtn'),
  newFileBtn: qs('#newFileBtn'),
  loadFileBtn: qs('#loadFileBtn'),
  exportMdBtn: qs('#exportMdBtn'),
  exportHtmlBtn: qs('#exportHtmlBtn'),
  exportPdfBtn: qs('#exportPdfBtn'),
  exportAllZipBtn: qs('#exportAllZipBtn'),
  userGuideBtn: qs('#userGuideBtn'),
  markdownGuideBtn: qs('#markdownGuideBtn'),
  technicalDocBtn: qs('#technicalDocBtn'),
  keyboardShortcutsBtn: qs('#keyboardShortcutsBtn'),
  undoMenuBtn: qs('#undoMenuBtn'),
  redoMenuBtn: qs('#redoMenuBtn'),
  cutMenuBtn: qs('#cutMenuBtn'),
  copyMenuBtn: qs('#copyMenuBtn'),
  pasteMenuBtn: qs('#pasteMenuBtn'),
  selectAllMenuBtn: qs('#selectAllMenuBtn'),
  findMenuBtn: qs('#findMenuBtn'),
  replaceMenuBtn: qs('#replaceMenuBtn'),
  fileInput: qs('#fileInput'),

  // تنظیمات
  settingsPanel: qs('#settingsPanel'),
  settingsBtn: qs('#settingsBtn'),
  closeSettingsBtn: qs('#closeSettingsBtn'),
  clearDBBtn: qs('#clearDBBtn'),
  themeRadios: Array.from(qsa('input[name="theme"]')),
  markdownParserSelect: qs('#markdownParser'),
  fontSizeSelect: qs('#fontSize'),
  fontFamilySelect: qs('#fontFamily'),
  showToolbarCheckbox: qs('#showToolbar'),
  showStatusBarCheckbox: qs('#showStatusBar'),
  showTocCheckbox: qs('#showToc'),
  showFilesCheckbox: qs('#showFiles'),
  showFilenameCheckbox: qs('#showFilename'),
  directionRadios: Array.from(qsa('input[name="direction"]')),
  
  // جستجو
  searchBtn: qs('#searchBtn'),
  searchBar: qs('#searchBar'),
  searchInput: qs('#searchInput'),
  replaceInput: qs('#replaceInput'),
  replaceBtn: qs('#replaceBtn'),
  replaceAllBtn: qs('#replaceAllBtn'),
  searchScope: qs('#searchScope'),
  searchCount: qs('#searchCount'),
  prevMatchBtn: qs('#prevMatchBtn'),
  nextMatchBtn: qs('#nextMatchBtn'),
  closeSearchBtn: qs('#closeSearchBtn'),

  // میانبرهای نوشتاری
  shortcutsMenu: qs('#shortcutsMenu'),

  // مودال‌ها
  customDialog: qs('#customDialog'),
  dialogTitle: qs('#dialogTitle'),
  dialogMessage: qs('#dialogMessage'),
  dialogInput: qs('#dialogInput'),
  dialogButtons: qs('#dialogButtons'),
  dialogCloseBtn: qs('#dialogCloseBtn'),
  filePropertiesModal: qs('#filePropertiesModal'),
  closePropertiesBtn: qs('#closePropertiesBtn'),
  propFileName: qs('#propFileName'),
  propFileSize: qs('#propFileSize'),
  propCreationDate: qs('#propCreationDate'),
  propLastModified: qs('#propLastModified'),
  propCharsCount: qs('#propCharsCount'),
  propWordsCount: qs('#propWordsCount'),
  propLinesCount: qs('#propLinesCount'),
  shortcutsHelpModal: qs('#shortcutsHelpModal'),
  closeShortcutsHelpBtn: qs('#closeShortcutsHelpBtn'),

  // هایلایتر
  hljsLightTheme: qs('#hljs-light-theme'),
  hljsDarkTheme: qs('#hljs-dark-theme'),
};