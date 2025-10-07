import { elements } from '../utils/dom.js';
import { state } from '../core/state.js';
import { shortcuts } from '../config.js';

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

    elements.shortcutsMenu.innerHTML = filteredShortcuts.map((shortcut, index) => {
        const shortcutHint = shortcut.shortcut
            ? `<span class="shortcut-hint">${shortcut.shortcut.replace(/\+/g, ' + ')}</span>`
            : '';
        
        return `
            <div class="shortcut-item ${index === state.selectedShortcutIndex ? 'selected' : ''}" data-index="${index}" data-filter="${shortcut.filter}">
                <i class="fas ${shortcut.icon}"></i>
                <span>${shortcut.name}</span>
                ${shortcutHint}
            </div>
        `;
    }).join('');

    // --- NEW POSITIONING LOGIC ---
    const editor = editorInstance.el;
    const editorWrapper = editor.parentElement;

    // Create a mirror div for calculations.
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(editor);
    const properties = [
        'boxSizing', 'width', 'height', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
        'letterSpacing', 'lineHeight', 'whiteSpace', 'wordWrap', 'direction',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'
    ];
    properties.forEach(prop => mirror.style[prop] = style[prop]);
    mirror.style.position = 'absolute';
    mirror.style.top = '0';
    mirror.style.left = '0';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';

    editorWrapper.appendChild(mirror);

    const cursorPos = editor.selectionStart;
    const textToCursor = editor.value.substring(0, cursorPos);
    
    // Use textContent to avoid HTML injection and properly handle spaces/newlines.
    mirror.textContent = textToCursor;

    // Use a span to find the end of the text.
    const marker = document.createElement('span');
    // A zero-width space is a good marker.
    marker.innerHTML = '&#8203;';
    mirror.appendChild(marker);

    const top = marker.offsetTop - editor.scrollTop;
    const left = marker.offsetLeft - editor.scrollLeft;
    const lineHeight = parseFloat(style.lineHeight) || 0;

    editorWrapper.removeChild(mirror);
    // --- END OF NEW LOGIC ---

    const menu = elements.shortcutsMenu;
    menu.style.display = 'block';
    
    // Position below the cursor line initially
    menu.style.top = `${top + lineHeight}px`;
    menu.style.left = `${left}px`;
    menu.style.right = 'auto'; // Ensure left positioning is used for measurement

    // Get dimensions needed for adjustment
    const menuRect = menu.getBoundingClientRect();
    const containerRect = elements.editorContainer.getBoundingClientRect();

    // Adjust horizontal position to stay within the container
    if (menuRect.right > containerRect.right) {
        menu.style.left = 'auto';
        menu.style.right = '0px';
    }
    if (menuRect.left < containerRect.left) {
        menu.style.left = '0px';
        menu.style.right = 'auto';
    }

    // Adjust vertical position
    if (menuRect.bottom > containerRect.bottom) {
        menu.style.top = `${top - menuRect.height}px`;
    }

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
        if(shortcut.filter === 'پررنگ' || shortcut.filter === 'مورب' || shortcut.filter === 'خط زده' || shortcut.filter === 'کد تک‌خطی' || shortcut.filter === 'برجسته'){
            editorInstance.el.setSelectionRange(newCursorPos - (shortcut.text.length / 2), newCursorPos - (shortcut.text.length / 2));
        } else if (shortcut.filter === 'پیوند' || shortcut.filter === 'تصویر') {
             editorInstance.el.setSelectionRange(newCursorPos - 3, newCursorPos - 3);
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

    if (lastSlashIndex === -1) {
        hideShortcutsMenu();
        return;
    }

    // Check if the slash is at the beginning of the string or preceded by whitespace.
    const isAtStart = lastSlashIndex === 0;
    const isAfterWhitespace = lastSlashIndex > 0 && /\s/.test(textBeforeCursor[lastSlashIndex - 1]);

    // Check if there's any whitespace between the slash and the cursor,
    // which would invalidate the shortcut.
    const queryPart = textBeforeCursor.substring(lastSlashIndex + 1);
    const hasWhitespaceAfter = /\s/.test(queryPart);

    if ((isAtStart || isAfterWhitespace) && !hasWhitespaceAfter) {
        showShortcutsMenu(queryPart);
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
        case 'Tab':
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