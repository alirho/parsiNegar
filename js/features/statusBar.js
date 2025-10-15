import { elements } from '../utils/dom.js';
import { EventBus } from '../core/eventBus.js';
import { formatFileSize, removeFileExtension } from '../utils/helpers.js';

/**
 * ماژول نوار وضعیت (آمار متن)
 */

/**
 * به‌روزرسانی آمار نمایش داده شده در نوار وضعیت
 * @param {string} content - محتوای فعلی ویرایشگر
 */
function updateStats(content) {
  const chars = content.length;
  const letters = (content.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lines = content.split('\n').length;
  const size = new Blob([content]).size;

  elements.charsCount.textContent = `نویسه: ${chars.toLocaleString('fa-IR')}`;
  elements.lettersCount.textContent = `حرف: ${letters.toLocaleString('fa-IR')}`;
  elements.wordsCount.textContent = `واژه: ${words.toLocaleString('fa-IR')}`;
  elements.linesCount.textContent = `خط: ${lines.toLocaleString('fa-IR')}`;
  elements.fileSize.textContent = `حجم: ${formatFileSize(size)}`;
}

/**
 * نمایش اطلاعات یک پرونده خاص در مودال ویژگی‌ها
 * @param {object} file - آبجکت پرونده از IndexedDB
 */
function showFileProperties(file) {
    const content = file.content || '';
    const stats = {
        chars: content.length,
        words: content.trim() ? content.trim().split(/\s+/).length : 0,
        lines: content.split('\n').length,
        size: new Blob([content]).size
    };

    elements.propFileName.textContent = removeFileExtension(file.id);
    elements.propFileSize.textContent = formatFileSize(stats.size);
    elements.propCreationDate.textContent = new Date(file.creationDate || file.lastModified).toLocaleString('fa-IR');
    elements.propLastModified.textContent = new Date(file.lastModified).toLocaleString('fa-IR');
    elements.propCharsCount.textContent = stats.chars.toLocaleString('fa-IR');
    elements.propWordsCount.textContent = stats.words.toLocaleString('fa-IR');
    elements.propLinesCount.textContent = stats.lines.toLocaleString('fa-IR');

    elements.filePropertiesModal.classList.remove('hidden');
}


/**
 * مقداردهی اولیه ماژول نوار وضعیت
 */
export function init() {
    // گوش دادن به رویداد تغییر محتوای ویرایشگر
    EventBus.on('editor:contentChanged', updateStats);
    EventBus.on('app:loaded', updateStats);

    // مدیریت مودال ویژگی‌های پرونده
    EventBus.on('file:showProperties', showFileProperties);
    elements.closePropertiesBtn.addEventListener('click', () => {
        elements.filePropertiesModal.classList.add('hidden');
    });
}