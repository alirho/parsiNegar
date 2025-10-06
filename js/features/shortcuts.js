import { elements } from '../utils/dom.js';
import { state } from '../core/state.js';
import { shortcuts } from '../config.js';
import { EventBus } from '../core/eventBus.js';

/**
 * ماژول مدیریت میانبرهای نوشتاری (/)
 */
let editorInstance;

function showShortcutsMenu(query = '') {
    const filteredShortcuts = shortcuts.filter(s =>
        s.filter.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredShortcuts.length === 0) {
        hideShortcutsMenu();
        return;
    }
    
    state.selectedShortcutIndex = 0;

    elements.shortcutsMenu.innerHTML = filteredShortcuts.map((shortcut, index) => `
        <div class="shortcut-item ${index === state.selectedShortcutIndex ? 'selected' : ''}" data-index="${index}" data-filter="${shortcut.filter}">
            <i class="fas ${shortcut.icon}"></i>
            <span>${shortcut.name}</span>
        </div>
    `).join('');

    // محاسبه موقعیت منو
    const cursorPos = editorInstance.el.selectionStart;
    const textBeforeCursor = editorInstance.getValue().substring(0, cursorPos);
    const lineHeight = parseInt(window.getComputedStyle(editorInstance.el).lineHeight);
    const lines = textBeforeCursor.split('\n').length;
    const top = (lines * lineHeight) - editorInstance.el.scrollTop;

    elements.shortcutsMenu.style.display = 'block';
    elements.shortcutsMenu.style.top = `${top}px`;
    state.isShortcutMenuVisible = true;
    updateSelectedShortcut();
}

function hideShortcutsMenu() {
    elements.shortcutsMenu.style.display = 'none';
    state.isShortcutMenuVisible = false;
    state.selectedShortcutIndex = -1;
}

function updateSelectedShortcut() {
    const items = elements.shortcutsMenu.querySelectorAll('.shortcut-item');
    items.forEach(item => item.classList.remove('selected'));
    if (state.selectedShortcutIndex >= 0 && items[state.selectedShortcutIndex]) {
        items[state.selectedShortcutIndex].classList.add('selected');
        items[state.selectedShortcutIndex].scrollIntoView({ block: 'nearest' });
    }
}

function insertShortcut(shortcut) {
    const cursorPos = editorInstance.el.selectionStart;
    const textBeforeCursor = editorInstance.getValue().substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
        const query = textBeforeCursor.substring(lastSlashIndex);
        const newText = editorInstance.getValue().substring(0, lastSlashIndex) + shortcut.text + editorInstance.getValue().substring(cursorPos);
        
        editorInstance.setValue(newText);

        const newCursorPos = lastSlashIndex + shortcut.text.length;
        if(shortcut.filter === 'پررنگ' || shortcut.filter === 'مورب' || shortcut.filter === 'خط زده' || shortcut.filter === 'کد تک‌خطی'){
            editorInstance.el.setSelectionRange(newCursorPos - (shortcut.text.length / 2), newCursorPos - (shortcut.text.length / 2));
        } else if (shortcut.filter === 'پیوند' || shortcut.filter === 'تصویر') {
             editorInstance.el.setSelectionRange(newCursorPos - 1, newCursorPos - 1);
        } else {
             editorInstance.el.setSelectionRange(newCursorPos, newCursorPos);
        }
    }
    hideShortcutsMenu();
}

function handleInputForShortcuts() {
    const cursorPos = editorInstance.el.selectionStart;
    const textBeforeCursor = editorInstance.getValue().substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1 && lastSlashIndex === textBeforeCursor.search(/\S|$/)) {
        const query = textBeforeCursor.substring(lastSlashIndex + 1);
        showShortcutsMenu(query);
    } else {
        hideShortcutsMenu();
    }
}

function handleKeyDownForShortcuts(e) {
    if (!state.isShortcutMenuVisible) return;

    const items = elements.shortcutsMenu.querySelectorAll('.shortcut-item');

    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            state.selectedShortcutIndex = Math.max(0, state.selectedShortcutIndex - 1);
            updateSelectedShortcut();
            break;
        case 'ArrowDown':
            e.preventDefault();
            state.selectedShortcutIndex = Math.min(items.length - 1, state.selectedShortcutIndex + 1);
            updateSelectedShortcut();
            break;
        case 'Enter':
            e.preventDefault();
            if (state.selectedShortcutIndex >= 0) {
                const selectedItem = items[state.selectedShortcutIndex];
                const filter = selectedItem.dataset.filter;
                const shortcut = shortcuts.find(s => s.filter === filter);
                if(shortcut) insertShortcut(shortcut);
            }
            break;
        case 'Escape':
            e.preventDefault();
            hideShortcutsMenu();
            break;
    }
}


export function init(editor) {
    editorInstance = editor;

    editor.el.addEventListener('input', handleInputForShortcuts);
    editor.el.addEventListener('keydown', handleKeyDownForShortcuts);

    elements.shortcutsMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.shortcut-item');
        if (item) {
            const filter = item.dataset.filter;
            const shortcut = shortcuts.find(s => s.filter === filter);
            if(shortcut) insertShortcut(shortcut);
        }
    });
}
