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
    if (bytes < 1024) return `${bytes} بایت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
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
