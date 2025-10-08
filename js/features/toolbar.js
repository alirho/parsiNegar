import { elements } from '../utils/dom.js';
import { EventBus } from '../core/eventBus.js';
import { getCursorCoordinates } from '../utils/helpers.js';

/**
 * ماژول مدیریت نوار ابزار و انتخابگر شکلک
 */
let editorInstance;
let emojiPicker;

/**
 * نمایش انتخابگر شکلک در موقعیت مکان‌نما
 */
function showEmojiPicker() {
    const coords = getCursorCoordinates(editorInstance.el);
    const menu = emojiPicker;
    const container = elements.editorContainer;

    // Set initial position
    menu.style.top = `${coords.top + coords.lineHeight}px`;
    menu.style.left = `${coords.left}px`;
    menu.style.right = 'auto'; // Reset right positioning
    menu.classList.remove('hidden');

    // Use a timeout to allow the browser to render the picker and calculate its dimensions correctly.
    setTimeout(() => {
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Adjust horizontal position
        // Check if it overflows on the right
        if (menu.offsetLeft + menuWidth > containerWidth) {
            menu.style.left = 'auto';
            menu.style.right = '5px'; // Pin to the right edge
        }
        // Check if it overflows on the left (less likely but possible)
        if (menu.offsetLeft < 0) {
            menu.style.left = '5px'; // Pin to the left edge
            menu.style.right = 'auto';
        }

        // Adjust vertical position
        // Check if it overflows at the bottom
        if (menu.offsetTop + menuHeight > containerHeight) {
            // Position it above the cursor line instead
            const newTop = coords.top - menuHeight;
            menu.style.top = `${Math.max(0, newTop)}px`; // Ensure it doesn't go above the container
        }
    }, 0);
}

/**
 * پنهان کردن انتخابگر شکلک
 */
function hideEmojiPicker() {
    emojiPicker.classList.add('hidden');
}

/**
 * درج شکلک انتخاب شده در ویرایشگر
 * @param {object} emoji - آبجکت شکلک از رویداد
 */
function insertEmoji(emoji) {
    const { unicode } = emoji;
    const el = editorInstance.el;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.substring(0, start) + unicode + el.value.substring(end);
    el.selectionStart = el.selectionEnd = start + unicode.length;
    el.focus();
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * رسیدگی به کلیک در بیرون از انتخابگر برای بستن آن
 */
function handleOutsideClick(event) {
    if (!emojiPicker.classList.contains('hidden') && !emojiPicker.contains(event.target) && !event.target.closest('[data-action="emoji"], [data-format="emoji"]')) {
        hideEmojiPicker();
    }
}

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

    // --- مقداردهی اولیه انتخابگر شکلک ---
    emojiPicker = document.querySelector('#emojiPicker');
    if (!emojiPicker) {
        console.error('عنصر انتخابگر شکلک یافت نشد!');
        return;
    }

    emojiPicker.addEventListener('emoji-click', event => {
        insertEmoji(event.detail);
        hideEmojiPicker();
    });

    EventBus.on('emoji:show', showEmojiPicker);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !emojiPicker.classList.contains('hidden')) {
            hideEmojiPicker();
        }
    });
    
    document.addEventListener('click', handleOutsideClick, true);

    // مدیریت تم
    const applyThemeToPicker = (theme) => {
        const effectiveTheme = (theme === 'device')
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;
        
        emojiPicker.className = ''; // حذف تمام کلاس‌ها
        emojiPicker.classList.add('hidden'); // اطمینان از پنهان بودن
        if (effectiveTheme === 'dark') {
            emojiPicker.classList.add('dark');
        } else {
            emojiPicker.classList.add('light');
        }
    };

    EventBus.on('settings:changed', (settings) => {
        if (settings.theme) {
            applyThemeToPicker(settings.theme);
        }
    });

    const currentTheme = document.querySelector('input[name="theme"]:checked').value;
    applyThemeToPicker(currentTheme);
}