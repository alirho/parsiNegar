import { elements } from '../utils/dom.js';
import { slugifyHeading } from '../utils/helpers.js';
import { highlightCode } from './Highlighter.js';

/**
 * ماژول مفسر مارک‌داون
 * این ماژول وظیفه تبدیل متن مارک‌داون به HTML را با استفاده از مفسرهای مختلف بر عهده دارد.
 */

let parsneshanParser;

// --- توابع پیکربندی مفسرها ---

/**
 * پیکربندی کتابخانه marked.js با تنظیمات سفارشی
 */
function configureMarked() {
    if (typeof window.marked === 'undefined') return;

    const renderer = new window.marked.Renderer();

    // افزودن id به تگ‌های عنوان برای فهرست مطالب
    renderer.heading = (text, level, raw) => {
        const id = slugifyHeading(raw);
        return `<h${level} id="${id}">${text}</h${level}>`;
    };

    // مدیریت بلوک‌های کد برای هایلایت و نمودار Mermaid
    renderer.code = (code, lang) => {
        if (lang === 'mermaid') {
            return `<div class="mermaid">${code}</div>`;
        }
        return highlightCode(code, lang);
    };

    window.marked.setOptions({
        renderer,
        gfm: true,
        breaks: true,
        headerIds: false,
    });
}

/**
 * پیکربندی کتابخانه پارس‌نشان
 */
function configureParsNeshan() {
    if (typeof window.createParsNeshan === 'undefined' || typeof window.markdownit === 'undefined') return;

    parsneshanParser = window.createParsNeshan({
        html: true,
        highlight: (str, lang) => {
            if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                try {
                    return window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
                } catch (__) {}
            }
            return '';
        }
    });

    // بازنویسی قانون رندر بلوک کد برای پشتیبانی از Mermaid
    const defaultFenceRenderer = parsneshanParser.renderer.rules.fence;
    parsneshanParser.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const lang = token.info ? token.info.trim().split(/\s+/g)[0] : '';
        if (lang === 'mermaid') {
            return `<div class="mermaid">${token.content}</div>`;
        }
        return defaultFenceRenderer(tokens, idx, options, env, self);
    };

    // بازنویسی قانون رندر عنوان برای افزودن id
    const defaultHeadingOpenRenderer = parsneshanParser.renderer.rules.heading_open;
    parsneshanParser.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const textToken = tokens[idx + 1];
        if (textToken && textToken.type === 'inline') {
            const id = slugifyHeading(textToken.content);
            token.attrSet('id', id);
        }
        return defaultHeadingOpenRenderer(tokens, idx, options, env, self);
    };
}


// --- API عمومی ماژول ---

export const Parser = {
    /**
     * مقداردهی اولیه تمام مفسرها
     */
    init() {
        configureMarked();
        configureParsNeshan();
    },

    /**
     * تبدیل متن مارک‌داون به HTML بر اساس مفسر انتخاب شده
     * @param {string} markdown - متن مارک‌داون
     * @returns {string} - رشته HTML
     */
    parse(markdown) {
        const selectedParser = elements.markdownParserSelect.value;
        try {
            if (selectedParser === 'shahneshan' && window.shahneshan) {
                return window.shahneshan.markdownToOutput(markdown);
            } else if (selectedParser === 'parsneshan' && parsneshanParser) {
                return parsneshanParser.render(markdown);
            } else if (window.marked) {
                return window.marked.parse(markdown);
            }
        } catch (error) {
            console.error(`خطا در پردازش با مفسر ${selectedParser}:`, error);
            return `<p>خطایی در پردازش متن رخ داد.</p>`;
        }
        return markdown; // بازگشت به متن اصلی در صورت نبود مفسر
    },

    /**
     * دریافت توکن‌های مارک‌داون برای استفاده در قابلیت‌هایی مانند فهرست مطالب
     * @param {string} markdown - متن مارک‌داون
     * @returns {Array} - آرایه‌ای از توکن‌ها
     */
    getTokens(markdown) {
        const selectedParser = elements.markdownParserSelect.value;
        if (selectedParser === 'parsneshan' && parsneshanParser) {
            return parsneshanParser.parse(markdown, {});
        }
        // پیش‌فرض: استفاده از marked.lexer
        return window.marked.lexer(markdown);
    }
};