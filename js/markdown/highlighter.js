import { elements } from '../utils/dom.js';

/**
 * ماژول مدیریت هایلایت کردن کد
 */

/**
 * تنظیم قالب هایلایتر کد (highlight.js) بر اساس قالب کلی برنامه
 * @param {string} theme - نام قالب ('light', 'dark', 'sepia')
 */
export function setHljsTheme(theme) {
    if (!elements.hljsLightTheme || !elements.hljsDarkTheme) return;

    if (theme === 'dark') {
        elements.hljsLightTheme.disabled = true;
        elements.hljsDarkTheme.disabled = false;
    } else { // قالب‌های روشن و سپیا از یک تم هایلایت استفاده می‌کنند
        elements.hljsLightTheme.disabled = false;
        elements.hljsDarkTheme.disabled = true;
    }
}

/**
 * تنظیم قالب نمودارهای Mermaid بر اساس قالب کلی برنامه
 * @param {string} theme - نام قالب
 */
export function configureMermaidTheme(theme) {
    if (typeof window.mermaid === 'undefined') return;
    let mermaidTheme = 'default';
    if (theme === 'dark') {
        mermaidTheme = 'dark';
    } else if (theme === 'sepia') {
        mermaidTheme = 'neutral';
    }
    mermaid.initialize({
        startOnLoad: false,
        theme: mermaidTheme
    });
}


/**
 * رندر کردن یک بلوک کد با استفاده از highlight.js
 * @param {string} code - کد برای هایلایت شدن
 * @param {string} lang - زبان برنامه‌نویسی
 * @returns {string} - کد هایلایت شده در تگ‌های HTML
 */
export function highlightCode(code, lang) {
    // اطمینان از اینکه `code` یک رشته است تا از خطا در highlight.js جلوگیری شود
    const codeString = String(code || '');

    if (typeof window.hljs !== 'undefined') {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        try {
            const highlighted = hljs.highlight(codeString, { language, ignoreIllegals: true }).value;
            return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
        } catch (e) {
            console.error('خطا در هایلایت کردن کد:', e);
        }
    }
    // بازگشت به حالت ساده در صورت عدم وجود hljs یا خطا
    const escapedCode = codeString.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code>${escapedCode}</code></pre>`;
}