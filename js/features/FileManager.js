import { elements } from '../utils/dom.js';
import { EventBus } from '../core/EventBus.js';
import { state } from '../core/State.js';
import * as storage from '../utils/storage.js';
import { removeFileExtension } from '../utils/helpers.js';
import { customAlert, customConfirm, customPrompt } from './Modal.js';

/**
 * ماژول مدیریت فایل
 * مسئولیت تمام عملیات مربوط به فایل‌ها مانند ایجاد، بارگذاری، ذخیره، خروجی و حذف را بر عهده دارد.
 */
let editorInstance;

// --- توابع کمکی ---

/**
 * تابعی برای دانلود یک فایل Blob
 * @param {Blob} blob - محتوای فایل
 * @param {string} filename - نام فایل برای دانلود
 */
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- مدیریت رویدادها ---

// ایجاد فایل جدید
async function newFile() {
  editorInstance.setValue('', { resetHistory: true });
  state.currentFileId = 'نام فایل';
  elements.filename.value = 'نام فایل';
  localStorage.removeItem('parsiNegarLastState');
  EventBus.emit('file:listChanged');
}

// بارگذاری فایل از سیستم کاربر
function uploadFile() {
  elements.fileInput.click();
}

async function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const content = event.target.result;
    const newFileId = file.name;

    const existingFile = await storage.getFileFromDB(newFileId);
    if (existingFile) {
      await customAlert(`فایلی با نام «${newFileId}» از قبل وجود دارد و بازنویسی نخواهد شد.`, 'خطا در بارگذاری');
      elements.fileInput.value = ''; // ریست کردن اینپوت
      return;
    }

    state.currentFileId = newFileId;
    elements.filename.value = removeFileExtension(newFileId);
    editorInstance.setValue(content, { resetHistory: true });
    
    await storage.saveFileToDB(newFileId, content, { creationDate: new Date(file.lastModified) });
    EventBus.emit('file:listChanged');
  };
  reader.readAsText(file);
  elements.fileInput.value = '';
}

// تغییر نام فایل فعلی
async function renameCurrentFile() {
    const oldId = state.currentFileId;
    const oldNameWithoutExt = removeFileExtension(oldId);
    const newNameWithoutExt = await customPrompt('نام جدید فایل را وارد کنید:', oldNameWithoutExt, 'تغییر نام فایل');

    if (!newNameWithoutExt || newNameWithoutExt.trim() === '' || newNameWithoutExt === oldNameWithoutExt) {
        return;
    }

    const ext = oldId.endsWith('.md') ? '.md' : (oldId.endsWith('.txt') ? '.txt' : '.md');
    const newId = newNameWithoutExt.trim() + ext;

    if (newId === oldId) return;

    const existingFile = await storage.getFileFromDB(newId);
    if (existingFile) {
        await customAlert('فایلی با این نام از قبل وجود دارد.', 'خطا در تغییر نام');
        elements.filename.value = oldNameWithoutExt;
        return;
    }

    const contentToSave = editorInstance.getValue();
    let creationDate = new Date();

    if (oldId !== 'نام فایل') {
        const oldFile = await storage.getFileFromDB(oldId);
        if(oldFile) creationDate = oldFile.creationDate || oldFile.lastModified;
        await storage.deleteFileFromDB(oldId);
    }

    await storage.saveFileToDB(newId, contentToSave, { creationDate });
    state.currentFileId = newId;
    elements.filename.value = newNameWithoutExt;

    EventBus.emit('file:renamed', { oldId, newId });
    EventBus.emit('file:listChanged');
}


// --- توابع خروجی گرفتن ---

function exportAsMarkdown() {
  const content = editorInstance.getValue();
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const filename = state.currentFileId.endsWith('.md') ? state.currentFileId : `${removeFileExtension(state.currentFileId)}.md`;
  downloadFile(blob, filename);
}

function exportAsHtml() {
  const theme = document.querySelector('input[name="theme"]:checked').value;
  const styles = document.querySelector('styles').textContent;
  const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${removeFileExtension(state.currentFileId)}</title>
<style>${styles}</style>
</head>
<body id="html-output" class="theme-${theme}">
<div class="markdown-printed">${elements.preview.innerHTML}</div>
</body>
</html>`;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  downloadFile(blob, removeFileExtension(state.currentFileId) + '.html');
}

async function exportAsPdf() {
  const element = document.createElement('div');
  element.className = 'markdown-preview';
  element.innerHTML = elements.preview.innerHTML;
  element.style.padding = '2rem';
  element.style.maxWidth = '210mm';
  element.style.margin = '0 auto';

  const opt = {
    margin: [10, 10],
    filename: removeFileExtension(state.currentFileId) + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  try {
    await window.html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('خطا در ساخت PDF:', error);
    await customAlert('خطایی در هنگام ساخت فایل PDF رخ داد.', 'خطا');
  }
}

async function exportAllAsZip() {
    if (typeof window.JSZip === 'undefined') {
        await customAlert('کتابخانه مورد نیاز برای ساخت فایل فشرده بارگذاری نشده است.', 'خطا');
        return;
    }
    const confirmed = await customConfirm('آیا می‌خواهید از تمام فایل‌های ذخیره شده خروجی زیپ بگیرید؟', 'خروجی کلی');
    if (!confirmed) return;

    try {
        const files = await storage.getAllFilesFromDB();
        if (files.length === 0) {
            await customAlert('هیچ فایلی برای خروجی گرفتن وجود ندارد.', 'خروجی خالی');
            return;
        }

        const zip = new window.JSZip();
        files.forEach(file => {
            zip.file(file.id, file.content);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, 'parsiNegar-backup.zip');
    } catch (error) {
        console.error('خطا در ساخت فایل فشرده:', error);
        await customAlert('خطایی در هنگام ایجاد فایل فشرده رخ داد.', 'خطا');
    }
}

// --- بارگذاری راهنما ---
async function loadReadme() {
    try {
        const response = await fetch('./README.md');
        if (!response.ok) throw new Error('فایل یافت نشد');
        const content = await response.text();
        state.currentFileId = 'README.md';
        elements.filename.value = 'README';
        editorInstance.setValue(content, { resetHistory: true });
        await storage.saveFileToDB('README.md', content);
        EventBus.emit('file:listChanged');
    } catch (error) {
        console.error('خطا در بارگذاری README.md:', error);
    }
}

async function loadParsneshanGuide() {
    const content = `# راهنمای پارس‌نشان...`; // محتوای کامل راهنما
    state.currentFileId = 'راهنمای پارس‌نشان.md';
    elements.filename.value = 'راهنمای پارس‌نشان';
    editorInstance.setValue(content, { resetHistory: true });
    await storage.saveFileToDB(state.currentFileId, content);
    EventBus.emit('file:listChanged');
}

// --- مقداردهی اولیه ---

export function init(editor) {
  editorInstance = editor;

  // رویدادهای منوی فایل
  elements.newFileBtn.addEventListener('click', newFile);
  elements.loadFileBtn.addEventListener('click', uploadFile);
  elements.fileInput.addEventListener('change', handleFileSelect);

  // رویدادهای منوی خروجی
  elements.exportMdBtn.addEventListener('click', exportAsMarkdown);
  elements.exportHtmlBtn.addEventListener('click', exportAsHtml);
  elements.exportPdfBtn.addEventListener('click', exportAsPdf);
  elements.exportAllZipBtn.addEventListener('click', exportAllAsZip);
  
  // رویدادهای نوار ابزار
  elements.uploadBtn.addEventListener('click', uploadFile);
  elements.downloadMdBtn.addEventListener('click', exportAsMarkdown);
  elements.downloadHtmlBtn.addEventListener('click', exportAsHtml);
  elements.downloadPdfBtn.addEventListener('click', exportAsPdf);

  // رویدادهای منوی راهنما
  elements.helpBtn.addEventListener('click', loadReadme);
  elements.parsneshanHelpBtn.addEventListener('click', loadParsneshanGuide);

  // رویداد تغییر نام فایل از طریق اینپوت
  elements.filename.addEventListener('change', renameCurrentFile);

  // گوش دادن به رویدادها از ماژول‌های دیگر
  EventBus.on('file:loadReadme', loadReadme);
}
