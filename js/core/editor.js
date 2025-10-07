import { EventBus } from './eventBus.js';
import { pairs } from '../config.js';
import { init as initShortcuts } from '../features/shortcuts.js';
import { state } from './state.js';

/**
 * کلاس مدیریت ویرایشگر متن
 * این کلاس مسئول تمام تعاملات با عنصر <textarea> است.
 */
export class Editor {
    constructor(element) {
        this.el = element;
        this.history = [''];
        this.historyIndex = 0;
        this.lastEnterTime = 0; // برای تشخیص دابل-اینتر در لیست‌ها

        this._init();
    }
    
    // مقداردهی اولیه و اتصال رویدادها
    _init() {
        this._attachEventListeners();
        initShortcuts(this); // مقداردهی اولیه ماژول میانبرهای نوشتاری
    }

    // اتصال شنوندگان رویداد به ویرایشگر
    _attachEventListeners() {
        this.el.addEventListener('input', this._onInput.bind(this));
        this.el.addEventListener('keydown', this._onKeyDown.bind(this));
    }

    // رویداد input برای تشخیص تغییرات محتوا
    _onInput() {
        const currentValue = this.el.value;
        // ثبت در تاریخچه برای واگرد/ازنو
        if (this.history[this.historyIndex] !== currentValue) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(currentValue);
            this.historyIndex++;
        }
        // ارسال رویداد برای به‌روزرسانی پیش‌نمایش و ذخیره خودکار
        EventBus.emit('editor:contentChanged', currentValue);
    }
    
    // رویداد keydown برای مدیریت کلیدهای خاص مانند Tab, Enter, Backspace
    _onKeyDown(e) {
        if (this._handleKeyboardShortcuts(e)) return;
        if (state.isShortcutMenuVisible) return;
        if (this._handleTab(e)) return;
        if (this._handleAutoPairing(e)) return;
        if (this._handleEnterKey(e)) return;
        if (this._handleBackspace(e)) return;
    }

    // مدیریت کلیدهای میانبر قالب‌بندی
    _handleKeyboardShortcuts(e) {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) return false;

        const shift = e.shiftKey;
        const alt = e.altKey;
        let command = null;

        if (shift && !alt) {
            switch (e.code) {
                case 'KeyL': command = 'orderedList'; break;
                case 'KeyU': command = 'unorderedList'; break;
                case 'KeyT': command = 'checklist'; break;
                case 'KeyC': command = 'blockCode'; break;
                case 'KeyQ': command = 'quote'; break;
                case 'KeyI': command = 'image'; break;
                case 'KeyM': command = 'mindmap'; break;
                case 'KeyH': command = 'highlight'; break;
                case 'KeyP': command = 'poetry'; break;
            }
        } else if (!shift && alt) {
            switch (e.code) {
                case 'KeyI': command = 'table'; break; // Changed from KeyT
            }
        } else if (!shift && !alt) {
            switch (e.code) {
                case 'KeyB': command = 'bold'; break;
                case 'KeyI': command = 'italic'; break;
                case 'KeyU': command = 'strike'; break;
                case 'KeyK': command = 'link'; break;
                case 'Backquote': command = 'inlineCode'; break;
                case 'Digit1': command = 'heading1'; break;
                case 'Digit2': command = 'heading2'; break;
                case 'Digit3': command = 'heading3'; break;
                case 'Digit4': command = 'heading4'; break;
            }
        }

        if (command) {
            e.preventDefault();
            this.applyFormat(command);
            return true;
        }

        return false;
    }

    // مدیریت کلید Tab برای تورفتگی
    _handleTab(e) {
        if (e.key !== 'Tab') return false;
        
        e.preventDefault();
        const start = this.el.selectionStart;
        const end = this.el.selectionEnd;
        const value = this.el.value;
        const indent = '  ';

        if (start === end) {
            // اگر متنی انتخاب نشده باشد، فقط دو فاصله اضافه کن
            this.el.value = value.substring(0, start) + indent + value.substring(end);
            this.el.setSelectionRange(start + indent.length, start + indent.length);
        } else {
            // اگر متنی انتخاب شده باشد، به ابتدای هر خط تورفتگی بده
            const blockStart = value.lastIndexOf('\n', start - 1) + 1;
            const blockEnd = value.indexOf('\n', end - 1) === -1 ? value.length : value.indexOf('\n', end - 1);
            const selectedBlock = value.substring(blockStart, blockEnd);
            let newBlock;

            if (e.shiftKey) { // Shift+Tab برای بیرون‌رفتگی
                newBlock = selectedBlock.split('\n').map(line => 
                    line.startsWith(indent) ? line.substring(indent.length) : (line.startsWith(' ') ? line.substring(1) : line)
                ).join('\n');
            } else { // Tab برای تورفتگی
                newBlock = selectedBlock.split('\n').map(line => indent + line).join('\n');
            }
            
            this.el.value = value.substring(0, blockStart) + newBlock + value.substring(blockEnd);
            this.el.selectionStart = blockStart;
            this.el.selectionEnd = blockStart + newBlock.length;
        }
        EventBus.emit('editor:contentChanged', this.el.value);
        return true;
    }
    
    // مدیریت تکمیل خودکار جفت کاراکترها
    _handleAutoPairing(e) {
        if (pairs[e.key]) {
            e.preventDefault();
            const start = this.el.selectionStart;
            const end = this.el.selectionEnd;
            const selectedText = this.el.value.substring(start, end);
            
            this.el.value = this.el.value.substring(0, start) +
                e.key + selectedText + pairs[e.key] +
                this.el.value.substring(end);
            
            this.el.setSelectionRange(start + 1, end + 1);
            EventBus.emit('editor:contentChanged', this.el.value);
            return true;
        }
        return false;
    }

    // مدیریت کلید Backspace برای حذف جفت کاراکترها
    _handleBackspace(e) {
        if (e.key === 'Backspace') {
            const start = this.el.selectionStart;
            if (start === this.el.selectionEnd && start > 0) {
                const charBefore = this.el.value[start - 1];
                const charAfter = this.el.value[start];
                if (pairs[charBefore] === charAfter) {
                    e.preventDefault();
                    this.el.value = this.el.value.substring(0, start - 1) + this.el.value.substring(start + 1);
                    this.el.setSelectionRange(start - 1, start - 1);
                    EventBus.emit('editor:contentChanged', this.el.value);
                    return true;
                }
            }
        }
        return false;
    }

    // مدیریت کلید Enter برای ادامه دادن لیست‌ها
    _handleEnterKey(e) {
        if (e.key !== 'Enter') return false;

        const cursorPos = this.el.selectionStart;
        const lineStart = this.el.value.lastIndexOf('\n', cursorPos - 1) + 1;
        const currentLine = this.el.value.substring(lineStart, cursorPos);
        const prefix = this._getListPrefix(currentLine);

        if (prefix) {
            e.preventDefault();
            const now = Date.now();
            if (now - this.lastEnterTime < 500 && currentLine.trim().match(/^(\s*([-*+]|([0-9۰-۹]+\.))\s*)$/)) {
                // دابل-اینتر: شکستن لیست
                this.el.value = this.el.value.substring(0, lineStart -1) + this.el.value.substring(cursorPos);
                this.el.setSelectionRange(lineStart, lineStart);
            } else {
                // ادامه دادن لیست
                const textToInsert = '\n' + prefix;
                this.el.value = this.el.value.substring(0, cursorPos) + textToInsert + this.el.value.substring(cursorPos);
                this.el.setSelectionRange(cursorPos + textToInsert.length, cursorPos + textToInsert.length);
            }
            this.lastEnterTime = now;
            EventBus.emit('editor:contentChanged', this.el.value);
            return true;
        }
        this.lastEnterTime = 0;
        return false;
    }
    
    // تشخیص پیشوند لیست برای ادامه دادن خودکار
    _getListPrefix(line) {
        const trimmedLine = line.trim();
        if (trimmedLine === '') return null;

        // لیست بازبینه
        const checklistMatch = line.match(/^(\s*[-*+]\s*\[\s?\]\s*)/);
        if (checklistMatch) return checklistMatch[0];

        // لیست نامرتب
        const unorderedMatch = line.match(/^(\s*[-*+]\s+)/);
        if (unorderedMatch) return unorderedMatch[1];
        
        // لیست مرتب
        const orderedMatch = line.match(/^(\s*([0-9۰-۹]+))(\.\s+)/);
        if (orderedMatch) {
            const indentation = orderedMatch[1].substring(0, orderedMatch[1].length - orderedMatch[2].length);
            const numberStr = orderedMatch[2];
            const isPersian = /[۰-۹]/.test(numberStr);
            const westernNumber = parseInt(numberStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)), 10);
            const nextNumber = westernNumber + 1;
            const nextNumberStr = isPersian
                ? nextNumber.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d])
                : nextNumber.toString();
            return `${indentation}${nextNumberStr}${orderedMatch[3]}`;
        }
        return null;
    }

    // اعمال فرمت عنوان
    _applyHeadingFormat(level) {
        const start = this.el.selectionStart;
        const value = this.el.value;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = value.indexOf('\n', start);
        if (lineEnd === -1) lineEnd = value.length;

        const currentLine = value.substring(lineStart, lineEnd);
        const content = currentLine.replace(/^#+\s*/, '');
        const newHeading = '#'.repeat(level) + ' ';
        const newLine = newHeading + content;

        this.el.value = value.substring(0, lineStart) + newLine + value.substring(lineEnd);
        this.el.setSelectionRange(start + (newLine.length - currentLine.length), start + (newLine.length - currentLine.length));
        this.el.focus();
        EventBus.emit('editor:contentChanged', this.el.value);
    }

    // API عمومی کلاس

    // گرفتن محتوای فعلی ویرایشگر
    getValue() {
        return this.el.value;
    }

    // تنظیم محتوای ویرایشگر
    setValue(content, options = {}) {
        this.el.value = content;
        if (options.resetHistory) {
            this.history = [content];
            this.historyIndex = 0;
        }
        // رویداد تغییر محتوا را برای به‌روزرسانی سایر بخش‌ها ارسال می‌کنیم
        EventBus.emit('editor:contentChanged', content);
    }
    
    // اعمال فرمت مارک‌داون
    applyFormat(action) {
        if (action.startsWith('heading')) {
            const level = parseInt(action.replace('heading', ''), 10);
            this._applyHeadingFormat(level);
            return;
        }

        const start = this.el.selectionStart;
        const end = this.el.selectionEnd;
        const selectedText = this.el.value.substring(start, end);
        let newText = '';
        let finalSelection = [start, end];

        switch (action) {
            case 'bold': newText = `**${selectedText}**`; finalSelection = [start + 2, end + 2]; break;
            case 'italic': newText = `*${selectedText}*`; finalSelection = [start + 1, end + 1]; break;
            case 'strike': newText = `~~${selectedText}~~`; finalSelection = [start + 2, end + 2]; break;
            case 'highlight': newText = `==${selectedText}==`; finalSelection = [start + 2, end + 2]; break;
            case 'heading': this._applyHeadingFormat(2); return;
            case 'unorderedList': newText = `- ${selectedText}`; finalSelection = [start + 2, end + 2]; break;
            case 'orderedList': newText = `1. ${selectedText}`; finalSelection = [start + 3, end + 3]; break;
            case 'checklist': newText = `- [ ] ${selectedText}`; finalSelection = [start + 6, end + 6]; break;
            case 'quote': newText = `> ${selectedText}`; finalSelection = [start + 2, end + 2]; break;
            case 'code':
                newText = selectedText.includes('\n') ? `\`\`\`\n${selectedText}\n\`\`\`` : `\`${selectedText}\``;
                finalSelection = [start + (selectedText.includes('\n') ? 4 : 1), end + (selectedText.includes('\n') ? 4 : 1)];
                break;
            case 'inlineCode': newText = `\`${selectedText}\``; finalSelection = [start + 1, end + 1]; break;
            case 'blockCode': newText = `\`\`\`\n${selectedText}\n\`\`\``; finalSelection = [start + 4, end + 4]; break;
            case 'link':
                newText = `[${selectedText}]()`;
                finalSelection = selectedText ? [end + 3, end + 3] : [start + 1, end + 1];
                break;
            case 'image': newText = `![]()`; finalSelection = [start + 4, start + 4]; break;
            case 'table': newText = '| ستون ۱ | ستون ۲ |\n|---|---|\n| محتوا | محتوا |'; finalSelection = [start + newText.length, start + newText.length]; break;
            case 'chart': newText = '```mermaid\nflowchart LR\n  A --> B\n```'; finalSelection = [start + newText.length, start + newText.length]; break;
            case 'mindmap': newText = '...نقشه‌ذهنی\n- ریشه\n  - شاخه\n...'; finalSelection = [start + newText.length, start + newText.length]; break;
            case 'poetry':
                newText = `...شعر\n${selectedText}\n...`;
                finalSelection = [start + `...شعر\n`.length, start + `...شعر\n`.length + selectedText.length];
                break;
            case 'admonition-note':
                newText = `...توجه\n${selectedText}\n...`;
                finalSelection = [start + `...توجه\n`.length, start + `...توجه\n`.length + selectedText.length];
                break;
            case 'admonition-warning':
                newText = `...هشدار\n${selectedText}\n...`;
                finalSelection = [start + `...هشدار\n`.length, start + `...هشدار\n`.length + selectedText.length];
                break;
            case 'admonition-tip':
                newText = `...نکته\n${selectedText}\n...`;
                finalSelection = [start + `...نکته\n`.length, start + `...نکته\n`.length + selectedText.length];
                break;
            case 'admonition-important':
                newText = `...مهم\n${selectedText}\n...`;
                finalSelection = [start + `...مهم\n`.length, start + `...مهم\n`.length + selectedText.length];
                break;
            case 'admonition-caution':
                newText = `...احتیاط\n${selectedText}\n...`;
                finalSelection = [start + `...احتیاط\n`.length, start + `...احتیاط\n`.length + selectedText.length];
                break;
        }
        
        if (newText) {
            this.el.value = this.el.value.substring(0, start) + newText + this.el.value.substring(end);
            this.el.setSelectionRange(finalSelection[0], finalSelection[1]);
        }
        
        this.el.focus();
        EventBus.emit('editor:contentChanged', this.el.value);
    }

    // واگرد (Undo)
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.el.value = this.history[this.historyIndex];
            EventBus.emit('editor:contentChanged', this.el.value);
        }
    }

    // ازنو (Redo)
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.el.value = this.history[this.historyIndex];
            EventBus.emit('editor:contentChanged', this.el.value);
        }
    }
}