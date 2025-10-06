import { elements } from '../utils/dom.js';
import { EventBus } from '../core/EventBus.js';
import { state } from '../core/State.js';
import * as storage from '../utils/storage.js';
import { removeFileExtension, slugifyHeading } from '../utils/helpers.js';
import { customConfirm, customPrompt, customAlert } from './Modal.js';
import { Parser } from '../markdown/Parser.js';

/**
 * ماژول پنل کناری (فهرست مطالب و لیست فایل‌ها)
 */

// --- مدیریت تب‌ها و نمایش پنل ---

function updateSidePanelVisibility(options = {}) {
    const showToc = elements.showTocCheckbox.checked;
    const showFiles = elements.showFilesCheckbox.checked;
    const show = showToc || showFiles;

    elements.sidePanel.style.display = show ? 'flex' : 'none';

    if (show) {
        // اگر یکی از چک‌باکس‌ها فعال شد، تب مربوطه را فعال کن
        if (options.tabToActivate) {
             activateTab(options.tabToActivate);
        } else {
             // در غیر این صورت، اگر هیچ تبی فعال نیست، تب فایل‌ها را به عنوان پیش‌فرض فعال کن
            const isActive = elements.filesTabBtn.classList.contains('active') || elements.tocTabBtn.classList.contains('active');
            if (!isActive) {
                activateTab('files');
            }
        }
    }
}

function activateTab(tabName) {
    const isFiles = tabName === 'files';
    elements.filesTabBtn.classList.toggle('active', isFiles);
    elements.tocTabBtn.classList.toggle('active', !isFiles);
    elements.filesPanel.classList.toggle('active', isFiles);
    elements.tocPanel.classList.toggle('active', !isFiles);

    if (isFiles) {
        populateFilesList();
    } else {
        updateToc();
    }
    // ذخیره تب فعال در تنظیمات
    EventBus.emit('settings:save');
}


// --- منطق فهرست مطالب (TOC) ---

function extractHeadings() {
    const content = document.getElementById('editor').value; // Get fresh content
    const headings = [];
    const tokens = Parser.getTokens(content); // Use parser's lexer

    tokens.forEach((token, i) => {
        const isHeading = token.type === 'heading_open' || token.type === 'heading';
        if (isHeading) {
            const textToken = token.type === 'heading_open' ? tokens[i + 1] : token;
            const text = textToken.content || textToken.text;
            headings.push({
                level: token.level || token.depth,
                text: text,
                id: slugifyHeading(text)
            });
        }
    });
    return headings;
}

function buildTocStructure(headings) {
    const root = { children: [], level: 0 };
    const stack = [root];
    headings.forEach(heading => {
        const node = { ...heading, children: [] };
        while (stack[stack.length - 1].level >= heading.level) {
            stack.pop();
        }
        stack[stack.length - 1].children.push(node);
        stack.push(node);
    });
    return root.children;
}

function createTocHtml(structure, level = 0) {
    if (!structure.length) return '';
    let html = '<ul class="toc-list-inner">';
    structure.forEach(item => {
        const hasChildren = item.children && item.children.length > 0;
        html += `
            <li class="toc-item" style="--level: ${level}">
                <div class="toc-link">
                    ${hasChildren ? '<span class="toc-toggle"><i class="fas fa-caret-down"></i></span>' : ''}
                    <a href="#${item.id}">${item.text}</a>
                </div>
                ${hasChildren ? createTocHtml(item.children, level + 1) : ''}
            </li>`;
    });
    html += '</ul>';
    return html;
}

function updateToc() {
    if (!elements.showTocCheckbox.checked && !elements.tocTabBtn.classList.contains('active')) return;

    const headings = extractHeadings();
    const structure = buildTocStructure(headings);
    elements.tocList.innerHTML = createTocHtml(structure);
    
    // افزودن رویدادها به عناصر جدید TOC
    elements.tocList.querySelectorAll('.toc-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const item = e.target.closest('.toc-item');
            item.classList.toggle('collapsed');
        });
    });
    elements.tocList.querySelectorAll('.toc-link a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const id = link.getAttribute('href').substring(1);
            const element = elements.preview.querySelector(`[id="${id}"]`);
            element?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}


// --- منطق لیست فایل‌ها ---

async function populateFilesList() {
    const files = await storage.getAllFilesFromDB();
    files.sort((a, b) => b.lastModified - a.lastModified);
    
    if (files.length === 0) {
        elements.filesList.innerHTML = '<p style="text-align:center;opacity:0.7;">فایلی یافت نشد.</p>';
        return;
    }

    elements.filesList.innerHTML = files.map(file => `
        <div class="file-item ${file.id === state.currentFileId ? 'active' : ''}" data-id="${file.id}">
            <span class="file-name" title="آخرین تغییر: ${new Date(file.lastModified).toLocaleString('fa-IR')}">${removeFileExtension(file.id)}</span>
            <div class="file-actions-menu">
                <button class="file-actions-toggle" title="گزینه‌ها"><i class="fas fa-ellipsis-v"></i></button>
                <div class="file-actions-dropdown hidden">
                    <a href="#" class="rename-file-btn"><i class="fas fa-edit"></i> تغییر نام</a>
                    <a href="#" class="properties-file-btn"><i class="fas fa-info-circle"></i> ویژگی‌ها</a>
                    <a href="#" class="delete-file-btn danger-action"><i class="fas fa-trash"></i> حذف</a>
                </div>
            </div>
        </div>
    `).join('');
    
    // افزودن رویدادها به عناصر جدید لیست فایل‌ها
    elements.filesList.querySelectorAll('.file-item').forEach(el => {
        el.querySelector('.file-name')?.addEventListener('click', handleLoadFile);
        el.querySelector('.file-actions-toggle')?.addEventListener('click', toggleFileActionsMenu);
        el.querySelector('.rename-file-btn')?.addEventListener('click', handleRenameFile);
        el.querySelector('.properties-file-btn')?.addEventListener('click', handleShowProperties);
        el.querySelector('.delete-file-btn')?.addEventListener('click', handleDeleteFile);
    });
}

function toggleFileActionsMenu(e) {
    e.stopPropagation();
    const currentDropdown = e.target.closest('.file-actions-menu').querySelector('.file-actions-dropdown');
    document.querySelectorAll('.file-actions-dropdown').forEach(dropdown => {
        if (dropdown !== currentDropdown) dropdown.classList.add('hidden');
    });
    currentDropdown.classList.toggle('hidden');
}

async function handleLoadFile(e) {
    const id = e.target.closest('.file-item').dataset.id;
    const file = await storage.getFileFromDB(id);
    if (file && state.currentFileId !== file.id) {
        EventBus.emit('file:load', file);
    }
}

async function handleRenameFile(e) {
    e.preventDefault();
    const oldId = e.target.closest('.file-item').dataset.id;
    const newName = await customPrompt('نام جدید فایل را وارد کنید:', removeFileExtension(oldId), 'تغییر نام');
    if(newName && newName.trim() !== '' && newName !== removeFileExtension(oldId)) {
        const newId = newName.trim() + '.md';
        if (await storage.getFileFromDB(newId)) {
            return customAlert('فایلی با این نام وجود دارد.');
        }
        const file = await storage.getFileFromDB(oldId);
        await storage.saveFileToDB(newId, file.content, { creationDate: file.creationDate });
        await storage.deleteFileFromDB(oldId);
        if (state.currentFileId === oldId) {
            state.currentFileId = newId;
            elements.filename.value = removeFileExtension(newId);
            EventBus.emit('file:renamed', { oldId, newId });
        }
        populateFilesList();
    }
}

async function handleDeleteFile(e) {
    e.preventDefault();
    const id = e.target.closest('.file-item').dataset.id;
    const confirmed = await customConfirm(`آیا از حذف فایل «${removeFileExtension(id)}» مطمئن هستید؟`);
    if (confirmed) {
        await storage.deleteFileFromDB(id);
        if (state.currentFileId === id) {
            EventBus.emit('file:new');
        }
        populateFilesList();
    }
}

async function handleShowProperties(e) {
    e.preventDefault();
    const id = e.target.closest('.file-item').dataset.id;
    const file = await storage.getFileFromDB(id);
    if (file) {
        EventBus.emit('file:showProperties', file);
    }
}


// --- مقداردهی اولیه ---

export function init() {
    elements.filesTabBtn.addEventListener('click', () => activateTab('files'));
    elements.tocTabBtn.addEventListener('click', () => activateTab('toc'));
    
    EventBus.on('settings:panelsVisibilityChanged', updateSidePanelVisibility);
    EventBus.on('sidePanel:activateTab', activateTab);
    EventBus.on('toc:update', updateToc);
    EventBus.on('file:listChanged', populateFilesList);
    EventBus.on('file:load', (file) => {
        // وقتی فایل جدیدی بارگذاری می‌شود، لیست را به‌روز کن تا فایل فعال مشخص شود
        populateFilesList();
    });
}
