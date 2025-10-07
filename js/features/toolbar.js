import { elements } from '../utils/dom.js';

/**
 * ماژول مدیریت نوار ابزار
 */
let editorInstance;

/**
 * رسیدگی به کلیک روی دکمه‌های فرمت‌بندی
 * @param {string} action - نام دستوری که باید اجرا شود
 */
function handleFormatAction(action) {
    if (editorInstance) {
        editorInstance.applyFormat(action);
    }
}

/**
 * مقداردهی اولیه رویدادهای نوار ابزار
 * @param {Editor} editor - نمونه‌ای از کلاس Editor
 */
export function init(editor) {
    editorInstance = editor;

    // رویدادهای دکمه‌های نوار ابزار اصلی
    elements.toolbar.querySelectorAll('button[data-action]').forEach(button => {
        button.addEventListener('click', () => {
            handleFormatAction(button.dataset.action);
        });
    });
    
    // رویدادهای آیتم‌های منوی "افزودن"
    elements.addMenu.querySelectorAll('a[data-format]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            handleFormatAction(item.dataset.format);
        });
    });

    // منطق جدید برای منوهای کشویی نوار ابزار
    elements.toolbar.querySelectorAll('.toolbar-dropdown-container').forEach(container => {
        const toggle = container.querySelector('.toolbar-dropdown-toggle');
        const menu = container.querySelector('.toolbar-dropdown-menu');

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            // بستن سایر منوهای کشویی
            document.querySelectorAll('.toolbar-dropdown-menu').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        });

        menu.querySelectorAll('a[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                handleFormatAction(item.dataset.action);
                menu.classList.add('hidden'); // بستن منو پس از انتخاب
            });
        });
    });

    // رویداد دکمه‌های واگرد و ازنو
    elements.undoBtn.addEventListener('click', () => editorInstance.undo());
    elements.redoBtn.addEventListener('click', () => editorInstance.redo());

    // رویداد دکمه کپی کل محتوا
    elements.copyAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const content = editorInstance.getValue();
        if(!content) return;

        navigator.clipboard.writeText(content).then(() => {
            const icon = elements.copyAllBtn.querySelector('i');
            icon.classList.replace('fa-copy', 'fa-check');
            setTimeout(() => icon.classList.replace('fa-check', 'fa-copy'), 2000);
        }).catch(err => console.error('خطا در کپی کردن:', err));
    });
}