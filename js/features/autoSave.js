import { EventBus } from '../core/eventBus.js';
import { state } from '../core/state.js';
import { debounce } from '../utils/helpers.js';
import { saveFileToDB } from '../utils/storage.js';

/**
 * ماژول ذخیره‌سازی خودکار
 * این ماژول به تغییرات ویرایشگر گوش می‌دهد و محتوا را به صورت خودکار ذخیره می‌کند.
 */

// تابع ذخیره‌سازی با تأخیر (debounce) برای جلوگیری از فراخوانی بیش از حد
const debouncedSave = debounce(async (editor) => {
    try {
        const currentContent = editor.getValue();

        // ذخیره آخرین وضعیت در localStorage برای بازیابی سریع
        localStorage.setItem('parsiNegarLastState', JSON.stringify({
            content: currentContent,
            filename: state.currentFileId,
        }));

        // اگر فایل نام معتبری داشت، آن را در IndexedDB هم ذخیره کن
        if (state.currentFileId && state.currentFileId.trim() !== '' && state.currentFileId !== 'نام فایل') {
            await saveFileToDB(state.currentFileId, currentContent);
            EventBus.emit('file:saved', state.currentFileId);
        }
    } catch (e) {
        console.error("خطا در ذخیره‌سازی خودکار:", e);
        // می‌توان یک رویداد خطا برای نمایش به کاربر نیز ارسال کرد
        // EventBus.emit('error:show', 'خطا در ذخیره‌سازی خودکار رخ داد.');
    }
}, 500); // تأخیر ۵۰۰ میلی‌ثانیه‌ای

/**
 * مقداردهی اولیه ماژول ذخیره‌سازی خودکار
 * @param {Editor} editor - نمونه‌ای از کلاس Editor
 */
export function init(editor) {
    // به رویداد تغییر محتوای ویرایشگر گوش بده
    EventBus.on('editor:contentChanged', () => {
        debouncedSave(editor);
    });

    // هنگامی که نام فایل تغییر می‌کند، ذخیره‌سازی را فراخوانی کن
    EventBus.on('file:renamed', () => {
        debouncedSave(editor);
    });
}
