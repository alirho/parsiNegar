import { elements } from '../utils/dom.js';
import { EventBus } from '../core/eventBus.js';
import { state } from '../core/state.js';
import * as storage from '../utils/storage.js';
import { removeFileExtension } from '../utils/helpers.js';
import { customAlert, customConfirm, customPrompt } from './modal.js';

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

/**
 * واکشی و ترکیب فایل‌های CSS خاص مورد نیاز برای خروجی HTML تمیز.
 * این شامل استایل‌های پایه، پیش‌نمایش و تم فعال هایلایت کد است.
 * همچنین URLهای نسبی درون CSS واکشی شده را به مسیرهای مطلق تبدیل می‌کند.
 * @returns {Promise<string>} یک رشته واحد حاوی تمام قوانین CSS لازم.
 */
async function getPreviewStyles() {
    const cssUrls = [
        'assets/css/base/_reset.css',
        'assets/css/base/_fonts.css',
        'assets/css/base/_base.css',
        'assets/css/base/_themes.css',
        'assets/css/preview/_markdown.css',
        'assets/css/preview/_code.css',
        'assets/css/preview/_parsneshan.css',
        'assets/css/preview/_print.css',
    ];

    // به صورت پویا URL شیوه‌نامه تم فعال highlight.js را اضافه می‌کند
    const activeHljsThemeLink = document.querySelector('link[id^="hljs-"]:not([disabled])');
    if (activeHljsThemeLink) {
        cssUrls.push(activeHljsThemeLink.href);
    }

    const fetchAndProcessCss = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`واکشی شیوه‌نامه برای خروجی ناموفق بود: ${url}`);
                return '';
            }
            const text = await response.text();
            // URL پایه برای حل مسیرهای نسبی، URL خود فایل CSS است.
            const baseUrl = new URL(url, document.baseURI).href;
            return text.replace(/url\((?!['"]?(?:data:|https:|http:|ftp:|\/\/))['"]?(.+?)['"]?\)/g, (match, relativeUrl) => {
                try {
                    // حل URL نسبی در برابر URL فایل CSS
                    const absoluteUrl = new URL(relativeUrl, baseUrl);
                    return `url('${absoluteUrl.href}')`;
                } catch (e) {
                    console.warn(`امکان حل URL وجود ندارد "${relativeUrl}" در شیوه‌نامه ${url}`);
                    return match; // اگر حل ناموفق بود، اصلی را برگردان
                }
            });
        } catch (error) {
            console.error(`خطا در واکشی یا پردازش شیوه‌نامه ${url}:`, error);
            return '';
        }
    };

    const allCssPromises = cssUrls.map(fetchAndProcessCss);
    const allCssStrings = await Promise.all(allCssPromises);
    return allCssStrings.join('\n');
}


// --- مدیریت رویدادها ---

/**
 * بارگذاری محتوای یک فایل در ویرایشگر و به‌روزرسانی وضعیت برنامه
 * @param {object} file - آبجکت فایل از IndexedDB
 */
function loadFile(file) {
    if (!file) return;

    state.currentFileId = file.id;
    elements.filename.value = removeFileExtension(file.id);
    editorInstance.setValue(file.content, { resetHistory: true });
    
    // آخرین وضعیت را در localStorage نیز به‌روزرسانی می‌کنیم
    localStorage.setItem('parsiNegarLastState', JSON.stringify({
        content: file.content,
        filename: file.id,
    }));
}

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
    const newNameWithoutExt = elements.filename.value.trim();

    if (!newNameWithoutExt || newNameWithoutExt === 'نام فایل' || newNameWithoutExt === oldNameWithoutExt) {
        elements.filename.value = oldNameWithoutExt; // Revert if invalid
        return;
    }

    const extMatch = oldId.match(/\.\w+$/);
    const ext = (oldId !== 'نام فایل' && extMatch) ? extMatch[0] : '.md';
    const newId = newNameWithoutExt + ext;

    if (newId === oldId) {
        return;
    }

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
        if (oldFile) creationDate = oldFile.creationDate || oldFile.lastModified;
        await storage.deleteFileFromDB(oldId);
    }

    await storage.saveFileToDB(newId, contentToSave, { creationDate });
    state.currentFileId = newId;

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

async function exportAsHtml() {
  const theme = document.querySelector('input[name="theme"]:checked').value;
  const styles = await getPreviewStyles();
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
    const content = `# راهنمای پارس‌نشان

«پارس‌نشان» یک مفسر مارک‌داون قدرتمند برای زبان فارسی است که ویژگی‌های خاصی را به مارک‌داون استاندارد اضافه می‌کند.

## جعبه‌های توضیحی

برای جلب توجه خواننده به نکات مهم از جعبه‌های توضیحی استفاده کنید.

...توجه
این یک پیام توجه است. شما می‌توانید **قالب‌بندی‌های** مارک‌دوان را *درون* این جعبه‌ها نیز استفاده کنید.
...

...هشدار
مراقب باشید! این یک عملیات حساس است.
...

...نکته
این یک نکته مفید برای کاربران است.
...

...مهم
این بخش را حتما مطالعه کنید.
...

...احتیاط
تغییر دادن این تنظیمات ممکن است باعث از کار افتادن برنامه شود.
...

## نمایش شعر

اشعار را با قالب‌بندی کلاسیک و خوانا نمایش دهید.

...شعر
بنی آدم اعضای یکدیگرند
که در آفرینش ز یک گوهرند

چو عضوی به درد آورد روزگار
دگر عضوها را نماند قرار
...

## هایلایت متن

برای تاکید روی کلمات یا عبارات کلیدی، آن‌ها را هایلایت کنید.

این یک متن ==بسیار مهم== است که باید دیده شود.

## لیست مرتب با اعداد فارسی

نیازی نیست اعداد را به انگلیسی تایپ کنید. «پارس‌نشان» به طور خودکار لیست‌های مرتب با اعداد فارسی را تشخیص می‌دهد.

۱. آیتم اول
۲. آیتم دوم
   ۱. آیتم تودرتو
۳. آیتم سوم

## بازبینه (Checklist)

لیست کارها را به راحتی ایجاد کنید.

- [x] اولین کار انجام شد
- [ ] دومین کار باقی مانده است
- [ ] سومین کار

## تشخیص خودکار جهت متن

پاراگراف‌ها به طور خودکار راست‌چین یا چپ‌چین می‌شوند.

این یک پاراگراف فارسی است و باید راست‌چین باشد.

This is an English paragraph and it should be left-aligned.
`;
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
  EventBus.on('file:load', loadFile);
  EventBus.on('file:new', newFile);
}