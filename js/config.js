// فایل تنظیمات عمومی برنامه

// تعریف میانبرهای نوشتاری (/)
export const shortcuts = [
    { name: 'عنوان', icon: 'fa-heading', text: '# ', filter: 'عنوان' },
    { name: 'عنوان دو', icon: 'fa-heading', text: '## ', filter: 'عنوان دو' },
    { name: 'عنوان سه', icon: 'fa-heading', text: '### ', filter: 'عنوان سه' },
    { name: 'پررنگ', icon: 'fa-bold', text: '****', filter: 'پررنگ' },
    { name: 'مورب', icon: 'fa-italic', text: '**', filter: 'مورب' },
    { name: 'نقل‌قول', icon: 'fa-quote-right', text: '> ', filter: 'نقل‌قول' },
    { name: 'کد تک‌خطی', icon: 'fa-code', text: '``', filter: 'کد تک‌خطی' },
    { name: 'کد چندخطی', icon: 'fa-code', text: '```\n\n```', filter: 'کد چندخطی' },
    { name: 'خط زده', icon: 'fa-strikethrough', text: '~~~~', filter: 'خط زده' },
    { name: 'لیست نامرتب', icon: 'fa-list-ul', text: '- ', filter: 'لیست نامرتب' },
    { name: 'لیست مرتب', icon: 'fa-list-ol', text: '1. ', filter: 'لیست مرتب' },
    { name: 'بازبینه', icon: 'fa-tasks', text: '- [ ] ', filter: 'بازبینه' },
    { name: 'جدول', icon: 'fa-table', text: '| ستون ۱ | ستون ۲ | ستون ۳ |\n| ------ | ------ | ------ |\n| محتوا | محتوا | محتوا |', filter: 'جدول' },
    { name: 'تصویر', icon: 'fa-image', text: '![]()', filter: 'تصویر' },
    { name: 'پیوند', icon: 'fa-link', text: '[]()', filter: 'پیوند' },
    { name: 'نمودار', icon: 'fa-sitemap', text: '```mermaid\nflowchart LR\n  A[شروع] --> B{تصمیم}\n  B -->|بله| C[ادامه]\n  B -->|خیر| D[توقف]\n```', filter: 'نمودار' },
    { name: 'نقشه‌ذهنی', icon: 'fa-brain', text: '...نقشه‌ذهنی\n- گره مرکزی\n  - گره یک\n  - گره دو\n  - گره سه\n  - گره چهار\n  - گره پنج\n  - گره شش\n...', filter: 'نقشه‌ذهنی' }
];

// تعریف کاراکترهای جفتی برای تکمیل خودکار
export const pairs = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
    '<': '>'
};