// ماژول توابع کمکی عمومی

/**
 * ایجاد یک تابع debounced
 * @param {Function} func - تابعی که باید با تأخیر اجرا شود
 * @param {number} wait - مدت زمان تأخیر به میلی‌ثانیه
 * @returns {Function}
 */
export function debounce(func, wait) {
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

/**
 * تبدیل اعداد انگلیسی به فارسی در یک رشته
 * @param {string|number} value - مقدار برای تبدیل
 * @returns {string} - رشته با اعداد فارسی
 */
function toPersianDigits(value) {
    const strValue = String(value);
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return strValue.replace(/[0-9]/g, (w) => persianDigits[+w]);
}

/**
 * حذف پسوند فایل از نام آن
 * @param {string} name - نام فایل
 * @returns {string} - نام فایل بدون پسوند
 */
export function removeFileExtension(name) {
    if (typeof name !== 'string') return name || '';
    return name.replace(/\.(md|markdown|txt)$/i, '');
}

/**
 * فرمت‌بندی حجم فایل به صورت خوانا
 * @param {number} bytes - حجم فایل به بایت
 * @returns {string} - رشته فرمت‌شده
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
    if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(1))} کیلوبایت`;
    return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

/**
 * تبدیل رشته عنوان به یک شناسه‌ی مناسب برای URL (slug)
 * @param {string} text - متن عنوان
 * @returns {string} - رشته تبدیل شده
 */
export function slugifyHeading(text) {
    if (typeof text !== 'string') {
        return 'heading';
    }

    const cleanedText = text
        .toLowerCase()
        .replace(/<[^>]*>/g, '') // حذف تگ‌های HTML
        .replace(/[\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u200C]/g, (char) => {
            const persianMap = { 'ا': 'a', 'آ': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h', 'ی': 'y', ' ': '-', '-': '-', '‌': '-' };
            return persianMap[char] || '';
        })
        .replace(/[^\w\s-]/g, '') // حذف کاراکترهای خاص
        .trim()
        .replace(/\s+/g, '-') // جایگزینی فاصله‌ها با خط تیره
        .replace(/-+/g, '-');
    return cleanedText || 'heading';
}

/**
 * مختصات پیکسل مکان‌نمای ویرایشگر را محاسبه می‌کند.
 * @param {HTMLTextAreaElement} editor - عنصر textarea ویرایشگر.
 * @returns {{top: number, left: number, lineHeight: number}} - مختصات بالا و چپ و ارتفاع خط.
 */
export function getCursorCoordinates(editor) {
    const editorWrapper = editor.parentElement;
    if (!editorWrapper) return { top: 0, left: 0, lineHeight: 0 };

    // یک div آینه برای محاسبات ایجاد می‌کنیم.
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(editor);
    const properties = [
        'boxSizing', 'width', 'height', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
        'letterSpacing', 'lineHeight', 'whiteSpace', 'wordWrap', 'direction', 'overflowWrap',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'
    ];
    properties.forEach(prop => mirror.style[prop] = style[prop]);
    mirror.style.position = 'absolute';
    mirror.style.top = '0';
    mirror.style.left = '0';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';

    editorWrapper.appendChild(mirror);

    const cursorPos = editor.selectionStart;
    const textToCursor = editor.value.substring(0, cursorPos);
    
    mirror.textContent = textToCursor;

    // از یک span برای پیدا کردن انتهای متن استفاده می‌کنیم.
    const marker = document.createElement('span');
    marker.innerHTML = '&#8203;'; // یک فاصله با عرض صفر
    mirror.appendChild(marker);

    const top = marker.offsetTop - editor.scrollTop;
    const left = marker.offsetLeft - editor.scrollLeft;
    const lineHeight = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.5);

    editorWrapper.removeChild(mirror);

    return { top, left, lineHeight };
}