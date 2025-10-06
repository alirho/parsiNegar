import { elements } from './utils/dom.js';
import { Editor } from './core/Editor.js';
import { init as initPreview } from './features/Preview.js';
import { init as initToolbar } from './features/Toolbar.js';
import { init as initAutoSave } from './features/AutoSave.js';
import { init as initFileManager } from './features/FileManager.js';
import { init as initSearch } from './features/Search.js';
import { init as initSettings } from './features/Settings.js';
import { init as initSidePanel } from './features/SidePanel.js';
import { init as initStatusBar } from './features/StatusBar.js';
import { EventBus } from './core/EventBus.js';
import { state } from './core/State.js';

/**
 * کلاس اصلی برنامه پارسی‌نگار
 * وظیفه این کلاس، مقداردهی اولیه و اتصال ماژول‌های مختلف به یکدیگر است.
 */
class ParsiNegarApp {
  constructor() {
    this.editor = new Editor(elements.editor);
    this.initComponents();
    this.loadInitialContent();
  }

  /**
   * مقداردهی اولیه تمام کامپوننت‌ها و ماژول‌های برنامه
   */
  initComponents() {
    initSettings(); // تنظیمات باید اول بارگذاری شود تا قالب و فونت‌ها درست اعمال شوند
    initPreview();
    initToolbar(this.editor);
    initAutoSave(this.editor);
    initFileManager(this.editor);
    initSearch(this.editor);
    initSidePanel();
    initStatusBar();

    // رویدادهای متفرقه
    this.initMiscEventListeners();
  }

  /**
   * بارگذاری محتوای اولیه از localStorage یا نمایش فایل راهنما
   */
  async loadInitialContent() {
    try {
      const lastStateJSON = localStorage.getItem('parsiNegarLastState');
      if (lastStateJSON) {
        const lastState = JSON.parse(lastStateJSON);
        state.currentFileId = lastState.filename || 'نام فایل';
        this.editor.setValue(lastState.content, { resetHistory: true });
      } else {
        // اگر محتوای قبلی وجود نداشت، فایل راهنما را بارگذاری کن
        await EventBus.emit('file:loadReadme');
      }
    } catch (e) {
      console.error("خطا در بارگذاری محتوای اولیه، فایل راهنما بارگذاری می‌شود.", e);
      await EventBus.emit('file:loadReadme');
    }
    // اعلام می‌کنیم که محتوای اولیه بارگذاری شده است
    EventBus.emit('app:loaded', this.editor.getValue());
  }

  /**
   * مقداردهی اولیه رویدادهای عمومی که در ماژول خاصی قرار نمی‌گیرند
   */
  initMiscEventListeners() {
    // مدیریت دکمه تمام‌صفحه
    elements.fullscreenBtn.addEventListener('click', () => {
      const isPreviewFullscreen = elements.editorContainer.style.display === 'none';
      if (isPreviewFullscreen) {
        elements.editorContainer.style.display = 'flex';
        elements.previewContainer.classList.remove('fullscreen');
      } else {
        elements.editorContainer.style.display = 'none';
        elements.previewContainer.classList.add('fullscreen');
      }
    });

    // بستن منوهای باز با کلیک در بیرون آن‌ها
    document.addEventListener('click', (e) => {
        // بستن منوی کشویی فایل‌ها
        if (!e.target.closest('.file-actions-menu')) {
            elements.filesList.querySelectorAll('.file-actions-dropdown:not(.hidden)').forEach(dropdown => {
                dropdown.classList.add('hidden');
            });
        }
        // بستن منوی میانبرها
        if (!e.target.closest('#shortcutsMenu') && !e.target.closest('#editor')) {
            elements.shortcutsMenu.style.display = 'none';
            state.isShortcutMenuVisible = false;
        }
    });

    // همگام‌سازی اسکرول بین ادیتور و پیش‌نمایش
    let isSyncingScroll = false;
    const syncScroll = (source, target) => {
        if (isSyncingScroll) return;
        const sourceScrollHeight = source.scrollHeight - source.clientHeight;
        if (sourceScrollHeight <= 0) return;
        isSyncingScroll = true;
        const percentage = source.scrollTop / sourceScrollHeight;
        const targetScrollHeight = target.scrollHeight - target.clientHeight;
        target.scrollTop = percentage * targetScrollHeight;
        setTimeout(() => { isSyncingScroll = false; }, 50);
    };

    elements.editor.addEventListener('scroll', () => {
        syncScroll(elements.editor, elements.preview);
        elements.editorBackdrop.scrollTop = elements.editor.scrollTop;
        elements.editorBackdrop.scrollLeft = elements.editor.scrollLeft;
    });
    elements.preview.addEventListener('scroll', () => syncScroll(elements.preview, elements.editor));
  }
}

// شروع برنامه پس از بارگذاری کامل DOM
document.addEventListener('DOMContentLoaded', () => {
  new ParsiNegarApp();
});
