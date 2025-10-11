import { EventBus } from '../core/eventBus.js';
import { state } from '../core/state.js';
import { debounce, removeFileExtension } from '../utils/helpers.js';
import { saveFileToDB, getFileFromDB, getUniqueFileName } from '../utils/storage.js';
import { elements } from '../utils/dom.js';

/**
 * ماژول ذخیره‌سازی خودکار
 * این ماژول به تغییرات ویرایشگر گوش می‌دهد و محتوا را به صورت خودکار ذخیره می‌کند.
 */

// تابع ذخیره‌سازی با تأخیر (debounce) برای جلوگیری از فراخوانی بیش از حد
const debouncedSave = debounce(async (editor) => {
    try {
        const currentContent = editor.getValue();
        let fileIdToSave = state.currentFileId;
        let isNewFile = false;

        // Handle new, unnamed files that now have content
        if (fileIdToSave === 'نام فایل' && currentContent.trim() !== '') {
            isNewFile = true;
            const baseName = 'بی‌نام'; // Always use 'بی‌نام' for new unnamed files
            const newFileId = await getUniqueFileName(baseName);
            
            state.currentFileId = newFileId;
            elements.filename.value = removeFileExtension(newFileId);
            fileIdToSave = newFileId;
        }

        // Always update localStorage
        localStorage.setItem('parsiNegarLastState', JSON.stringify({
            content: currentContent,
            filename: fileIdToSave,
        }));
        
        // Save to IndexedDB if the file has a valid name
        if (fileIdToSave !== 'نام فایل') {
            const existingFile = await getFileFromDB(fileIdToSave);
            
            // Save if it's a brand new file, or if content has changed for an existing file
            if (isNewFile || !existingFile || existingFile.content !== currentContent) {
                await saveFileToDB(fileIdToSave, currentContent);
                EventBus.emit('file:saved', fileIdToSave);
                if (isNewFile) {
                    EventBus.emit('file:listChanged'); // Update file list only for new files
                }
            }
        }

    } catch (e) {
        console.error("خطا در ذخیره‌سازی خودکار:", e);
        // می‌توان یک رویداد خطا برای نمایش به کاربر نیز ارسال کرد
        // EventBus.emit('error:show', 'خطا در ذخیره‌سازی خودکار رخ داد.');
    }
}, 900); // تأخیر ۵۰۰ میلی‌ثانیه‌ای

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
