// فایل تنظیمات عمومی برنامه

// تعریف میانبرهای نوشتاری (/)
export const shortcuts = [
    { name: 'عنوان', icon: 'fa-heading', text: '# ', filter: 'عنوان', shortcut: 'Ctrl+1' },
    { name: 'عنوان دو', icon: 'fa-heading', text: '## ', filter: 'عنوان دو', shortcut: 'Ctrl+2' },
    { name: 'عنوان سه', icon: 'fa-heading', text: '### ', filter: 'عنوان سه', shortcut: 'Ctrl+3' },
    { name: 'پررنگ', icon: 'fa-bold', text: '****', filter: 'پررنگ', shortcut: 'Ctrl+B' },
    { name: 'مورب', icon: 'fa-italic', text: '**', filter: 'مورب', shortcut: 'Ctrl+I' },
    { name: 'نقل‌قول', icon: 'fa-quote-right', text: '> ', filter: 'نقل‌قول', shortcut: 'Ctrl+Shift+Q' },
    { name: 'کد تک‌خطی', icon: 'fa-code', text: '``', filter: 'کد تک‌خطی', shortcut: 'Ctrl+`' },
    { name: 'کد چندخطی', icon: 'fa-code', text: '```\n\n```', filter: 'کد چندخطی', shortcut: 'Ctrl+Shift+C' },
    { name: 'خط زده', icon: 'fa-strikethrough', text: '~~~~', filter: 'خط زده', shortcut: 'Ctrl+U' },
    { name: 'لیست نامرتب', icon: 'fa-list-ul', text: '- ', filter: 'لیست نامرتب', shortcut: 'Ctrl+Shift+U' },
    { name: 'لیست مرتب', icon: 'fa-list-ol', text: '1. ', filter: 'لیست مرتب', shortcut: 'Ctrl+Shift+L' },
    { name: 'بازبینه', icon: 'fa-tasks', text: '- [ ] ', filter: 'بازبینه', shortcut: 'Ctrl+Shift+T' },
    { name: 'جدول', icon: 'fa-table', text: '| ستون ۱ | ستون ۲ | ستون ۳ |\n| ------ | ------ | ------ |\n| محتوا | محتوا | محتوا |', filter: 'جدول', shortcut: 'Ctrl+Alt+I' },
    { name: 'تصویر', icon: 'fa-image', text: '![]()', filter: 'تصویر', shortcut: 'Ctrl+Shift+I' },
    { name: 'پیوند', icon: 'fa-link', text: '[]()', filter: 'پیوند', shortcut: 'Ctrl+K' },
    { name: 'شکلک', icon: 'fa-smile', text: '', filter: 'شکلک', shortcut: 'Ctrl+Shift+E' },
    { name: 'برجسته', icon: 'fa-highlighter', text: '====', filter: 'برجسته', shortcut: 'Ctrl+Shift+H' },
    { name: 'شعر', icon: 'fa-feather-alt', text: '...شعر\n\n...', filter: 'شعر', shortcut: 'Ctrl+Shift+P' },
    { name: 'جعبه توجه', icon: 'fa-info-circle', text: '...توجه\n\n...', filter: 'جعبه توجه' },
    { name: 'جعبه هشدار', icon: 'fa-exclamation-triangle', text: '...هشدار\n\n...', filter: 'جعبه هشدار' },
    { name: 'جعبه نکته', icon: 'fa-lightbulb', text: '...نکته\n\n...', filter: 'جعبه نکته' },
    { name: 'جعبه مهم', icon: 'fa-star', text: '...مهم\n\n...', filter: 'جعبه مهم' },
    { name: 'جعبه احتیاط', icon: 'fa-shield-alt', text: '...احتیاط\n\n...', filter: 'جعبه احتیاط' },
    { name: 'نمودار', icon: 'fa-sitemap', text: '```mermaid\nflowchart LR\n  A[شروع] --> B{تصمیم}\n  B -->|بله| C[ادامه]\n  B -->|خیر| D[توقف]\n```', filter: 'نمودار' },
    { name: 'نقشه‌ذهنی', icon: 'fa-brain', text: '...نقشه‌ذهنی\n- گره مرکزی\n  - گره یک\n  - گره دو\n  - گره سه\n  - گره چهار\n  - گره پنج\n  - گره شش\n...', filter: 'نقشه‌ذهنی', shortcut: 'Ctrl+Shift+M' }
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