import { elements } from '../utils/dom.js';
import { EventBus } from '../core/eventBus.js';
import { state } from '../core/state.js';
import { debounce } from '../utils/helpers.js';

/**
 * ماژول جستجو و جایگزینی
 */
let editorInstance;
let matches = [];
let currentMatchIndex = -1;

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateSearchCount() {
    if (matches.length > 0) {
        elements.searchCount.textContent = `${currentMatchIndex + 1}/${matches.length}`;
    } else {
        elements.searchCount.textContent = elements.searchInput.value ? '0/0' : '';
    }
}

function updateReplaceButtonsState() {
    const hasSearchTerm = elements.searchInput.value !== '';
    const hasReplaceTerm = elements.replaceInput.value !== '';
    const canReplace = hasSearchTerm && hasReplaceTerm;
    
    elements.replaceBtn.disabled = !canReplace || currentMatchIndex < 0 || !matches[currentMatchIndex]?.dataset.start;
    elements.replaceAllBtn.disabled = !canReplace || !matches.some(m => m.dataset.start);
}

function updateActiveHighlight() {
    matches.forEach(m => m.classList.remove('active'));
    if (currentMatchIndex > -1 && matches[currentMatchIndex]) {
        const activeMatch = matches[currentMatchIndex];
        activeMatch.classList.add('active');
        activeMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateSearchCount();
    updateReplaceButtonsState();
}

function performSearch(resetIndex = true) {
    const term = elements.searchInput.value;
    const scope = elements.searchScope.value;

    // پاک کردن هایلایت‌های قبلی
    elements.editorBackdrop.innerHTML = '';
    elements.preview.querySelectorAll('mark.highlight').forEach(m => {
        m.replaceWith(document.createTextNode(m.textContent));
    });
    elements.preview.normalize();

    if (!term) {
        matches = [];
        currentMatchIndex = -1;
        elements.editor.classList.remove('searching');
        updateActiveHighlight();
        return;
    }

    elements.editor.classList.toggle('searching', scope === 'editor' || scope === 'all');
    const regex = new RegExp(escapeRegExp(term), 'gi');
    let editorMatches = [];
    let previewMatches = [];

    // جستجو در ادیتور
    if (scope === 'editor' || scope === 'all') {
        const editorContent = editorInstance.getValue();
        let backdropHTML = '';
        let lastIndex = 0;
        const localEditorMatches = [];

        editorContent.replace(regex, (match, offset) => {
            localEditorMatches.push({ start: offset, end: offset + match.length });
            backdropHTML += editorContent.substring(lastIndex, offset).replace(/</g, '&lt;') + `<mark class="highlight">${match.replace(/</g, '&lt;')}</mark>`;
            lastIndex = offset + match.length;
        });
        backdropHTML += editorContent.substring(lastIndex).replace(/</g, '&lt;');
        elements.editorBackdrop.innerHTML = backdropHTML;
        
        editorMatches = Array.from(elements.editorBackdrop.querySelectorAll('.highlight'));
        editorMatches.forEach((el, i) => {
            el.dataset.start = localEditorMatches[i].start;
            el.dataset.end = localEditorMatches[i].end;
        });
    }

    // جستجو در پیش‌نمایش
    if (scope === 'preview' || scope === 'all') {
        const walker = document.createTreeWalker(elements.preview, NodeFilter.SHOW_TEXT, (node) => {
            return node.parentElement.closest('script, style, pre, code') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        });
        const textNodes = [];
        while(walker.nextNode()) textNodes.push(walker.currentNode);
        
        textNodes.forEach(node => {
            if (node.nodeValue.match(regex)) {
                const span = document.createElement('span');
                span.innerHTML = node.nodeValue.replace(regex, `<mark class="highlight">$&</mark>`);
                node.replaceWith(...span.childNodes);
            }
        });
        previewMatches = Array.from(elements.preview.querySelectorAll('.highlight'));
    }

    matches = [...editorMatches, ...previewMatches];
    if (resetIndex) {
        currentMatchIndex = matches.length > 0 ? 0 : -1;
    } else if (currentMatchIndex >= matches.length) {
        currentMatchIndex = matches.length > 0 ? matches.length - 1 : -1;
    }
    updateActiveHighlight();
}

const debouncedSearch = debounce(() => performSearch(), 300);

function openSearchBar() {
    state.isSearchActive = true;
    elements.searchBar.classList.remove('hidden');
    elements.searchInput.focus();
    elements.searchInput.select();
    performSearch();
}

function closeSearchBar() {
    state.isSearchActive = false;
    elements.searchBar.classList.add('hidden');
    elements.searchInput.value = '';
    elements.replaceInput.value = '';
    matches = [];
    currentMatchIndex = -1;
    elements.editorBackdrop.innerHTML = '';
    elements.editor.classList.remove('searching');
    EventBus.emit('editor:contentChanged', editorInstance.getValue()); // برای حذف هایلایت‌ها از پیش‌نمایش
}

function navigateMatches(direction) {
    if (matches.length === 0) return;
    currentMatchIndex = (currentMatchIndex + direction + matches.length) % matches.length;
    updateActiveHighlight();
}

async function replace() {
    const activeMatch = matches[currentMatchIndex];
    if (!activeMatch || !activeMatch.dataset.start || elements.replaceBtn.disabled) return;

    const start = parseInt(activeMatch.dataset.start, 10);
    const end = parseInt(activeMatch.dataset.end, 10);
    const replaceText = elements.replaceInput.value;
    const currentContent = editorInstance.getValue();
    
    editorInstance.setValue(currentContent.substring(0, start) + replaceText + currentContent.substring(end));
    
    // صبر می‌کنیم تا رویداد input ادیتور پردازش شود
    await new Promise(resolve => setTimeout(resolve, 0));

    performSearch(false);
    // منطق پیدا کردن ایندکس بعدی
    currentMatchIndex = matches.findIndex(m => parseInt(m.dataset.start, 10) >= start + replaceText.length);
    if(currentMatchIndex === -1 && matches.length > 0) currentMatchIndex = 0;
    updateActiveHighlight();
}

async function replaceAll() {
    if (elements.replaceAllBtn.disabled) return;
    const searchText = elements.searchInput.value;
    const replaceText = elements.replaceInput.value;
    const regex = new RegExp(escapeRegExp(searchText), 'gi');
    
    editorInstance.setValue(editorInstance.getValue().replace(regex, replaceText));
    
    await new Promise(resolve => setTimeout(resolve, 0));
    performSearch();
}

export function init(editor) {
    editorInstance = editor;

    elements.searchBtn.addEventListener('click', () => state.isSearchActive ? closeSearchBar() : openSearchBar());
    elements.closeSearchBtn.addEventListener('click', closeSearchBar);
    elements.searchInput.addEventListener('input', () => {
        debouncedSearch();
        updateReplaceButtonsState();
    });
    elements.replaceInput.addEventListener('input', updateReplaceButtonsState);
    elements.searchScope.addEventListener('change', () => performSearch());
    elements.nextMatchBtn.addEventListener('click', () => navigateMatches(1));
    elements.prevMatchBtn.addEventListener('click', () => navigateMatches(-1));
    elements.replaceBtn.addEventListener('click', replace);
    elements.replaceAllBtn.addEventListener('click', replaceAll);

    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateMatches(e.shiftKey ? -1 : 1);
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            openSearchBar();
        }
        if (e.key === 'Escape' && state.isSearchActive) {
            e.preventDefault();
            closeSearchBar();
        }
    });

    EventBus.on('search:rerun', () => performSearch(false));
}
