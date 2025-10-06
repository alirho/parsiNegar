import { elements } from '../utils/dom.js';
import { EventBus } from '../core/EventBus.js';
import * as storage from '../utils/storage.js';
import { customConfirm, customAlert } from './Modal.js';
import { setHljsTheme, configureMermaidTheme } from '../markdown/Highlighter.js';

/**
 * ماژول مدیریت تنظیمات برنامه
 */

// تابع برای ذخیره تنظیمات فعلی در localStorage
function saveSettings() {
    const settings = {
        theme: elements.themeRadios.find(r => r.checked).value,
        fontSize: elements.fontSizeSelect.value,
        fontFamily: elements.fontFamilySelect.value,
        markdownParser: elements.markdownParserSelect.value,
        searchScope: elements.searchScope.value,
        showToolbar: elements.showToolbarCheckbox.checked,
        showStatusBar: elements.showStatusBarCheckbox.checked,
        showToc: elements.showTocCheckbox.checked,
        showFiles: elements.showFilesCheckbox.checked,
        showFilename: elements.showFilenameCheckbox.checked,
        activeTab: elements.filesTabBtn.classList.contains('active') ? 'files' : 'toc',
    };
    localStorage.setItem('parsiNegarSettings', JSON.stringify(settings));
    return settings;
}

// تابع برای بارگذاری و اعمال تنظیمات از localStorage
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('parsiNegarSettings') || '{}');

    // اعمال قالب (Theme)
    if (settings.theme) {
        document.body.className = `theme-${settings.theme}`;
        (elements.themeRadios.find(r => r.value === settings.theme) || {}).checked = true;
        setHljsTheme(settings.theme);
        configureMermaidTheme(settings.theme);
    }

    // اعمال اندازه فونت
    if (settings.fontSize) {
        elements.editor.style.fontSize = `${settings.fontSize}px`;
        elements.editorBackdrop.style.fontSize = `${settings.fontSize}px`;
        elements.fontSizeSelect.value = settings.fontSize;
    }

    // اعمال نوع فونت
    if (settings.fontFamily) {
        elements.editor.style.fontFamily = settings.fontFamily;
        elements.editorBackdrop.style.fontFamily = settings.fontFamily;
        elements.fontFamilySelect.value = settings.fontFamily;
    }

    // اعمال پارسر مارک‌داون
    if (settings.markdownParser) {
        elements.markdownParserSelect.value = settings.markdownParser;
    }

    // اعمال محدوده جستجو
    if (settings.searchScope) {
        elements.searchScope.value = settings.searchScope;
    }

    // اعمال تنظیمات نمایش
    elements.showToolbarCheckbox.checked = settings.showToolbar ?? false;
    elements.toolbar.style.display = elements.showToolbarCheckbox.checked ? 'flex' : 'none';

    elements.showStatusBarCheckbox.checked = settings.showStatusBar ?? true;
    elements.statusBar.style.display = elements.showStatusBarCheckbox.checked ? 'flex' : 'none';

    elements.showTocCheckbox.checked = settings.showToc ?? false;
    elements.showFilesCheckbox.checked = settings.showFiles ?? false;
    
    elements.showFilenameCheckbox.checked = settings.showFilename ?? true;
    elements.filename.style.display = elements.showFilenameCheckbox.checked ? 'block' : 'none';

    EventBus.emit('settings:panelsVisibilityChanged');
    if (settings.activeTab) {
        EventBus.emit('sidePanel:activateTab', settings.activeTab);
    }
}


async function clearAllData() {
    const confirmed = await customConfirm('آیا مطمئن هستید؟ تمام فایل‌های ذخیره شده برای همیشه پاک خواهند شد. این عمل بازگشت‌پذیر نیست.', 'پاک کردن تمام داده‌ها');
    if (confirmed) {
        try {
            await storage.clearFilesDB();
            localStorage.removeItem('parsiNegarLastState');
            await customAlert('تمام داده‌ها پاک شدند.', 'عملیات موفق');
            window.location.reload(); // بارگذاری مجدد صفحه برای شروع تازه
        } catch (error) {
            console.error("خطا در پاک کردن داده‌ها:", error);
            await customAlert('خطایی در پاک کردن داده‌ها رخ داد.', 'خطا');
        }
    }
}


export function init() {
    // بارگذاری تنظیمات در ابتدای کار
    loadSettings();

    // باز و بسته کردن پنل تنظیمات
    elements.settingsBtn.addEventListener('click', () => elements.settingsPanel.classList.remove('hidden'));
    elements.closeSettingsBtn.addEventListener('click', () => {
        elements.settingsPanel.classList.add('hidden');
        saveSettings(); // ذخیره تنظیمات هنگام بستن پنل
    });
    
    // رویدادهای مربوط به تغییر تنظیمات
    elements.themeRadios.forEach(radio => radio.addEventListener('change', (e) => {
        document.body.className = `theme-${e.target.value}`;
        setHljsTheme(e.target.value);
        configureMermaidTheme(e.target.value);
        EventBus.emit('settings:changed', { theme: e.target.value });
        saveSettings();
    }));
    
    elements.fontSizeSelect.addEventListener('change', (e) => {
        elements.editor.style.fontSize = `${e.target.value}px`;
        elements.editorBackdrop.style.fontSize = `${e.target.value}px`;
        saveSettings();
    });

    elements.fontFamilySelect.addEventListener('change', (e) => {
        elements.editor.style.fontFamily = e.target.value;
        elements.editorBackdrop.style.fontFamily = e.target.value;
        saveSettings();
    });

    elements.markdownParserSelect.addEventListener('change', () => {
        EventBus.emit('settings:changed', { markdownParser: elements.markdownParserSelect.value });
        saveSettings();
    });

    // تنظیمات نمایش
    elements.showToolbarCheckbox.addEventListener('change', (e) => {
        elements.toolbar.style.display = e.target.checked ? 'flex' : 'none';
        saveSettings();
    });
    elements.showStatusBarCheckbox.addEventListener('change', (e) => {
        elements.statusBar.style.display = e.target.checked ? 'flex' : 'none';
        saveSettings();
    });
    elements.showFilenameCheckbox.addEventListener('change', (e) => {
        elements.filename.style.display = e.target.checked ? 'block' : 'none';
        saveSettings();
    });
    elements.showTocCheckbox.addEventListener('change', () => {
         EventBus.emit('settings:panelsVisibilityChanged', { tabToActivate: 'toc' });
         saveSettings();
    });
    elements.showFilesCheckbox.addEventListener('change', () => {
        EventBus.emit('settings:panelsVisibilityChanged', { tabToActivate: 'files' });
        saveSettings();
    });


    // دکمه پاک کردن داده‌ها
    elements.clearDBBtn.addEventListener('click', clearAllData);
}
