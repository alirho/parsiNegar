import { elements } from '../utils/dom.js';

/**
 * ماژول مدیریت مودال‌ها و دیالوگ‌های سفارشی
 */

/**
 * نمایش یک دیالوگ سفارشی
 * @param {object} options - تنظیمات دیالوگ
 * @returns {Promise<any>} - مقداری که با کلیک کاربر بازگردانده می‌شود
 */
function showCustomDialog(options) {
  return new Promise((resolve) => {
    elements.dialogTitle.textContent = options.title || '';
    elements.dialogMessage.innerHTML = options.message || '';

    if (options.type === 'prompt') {
      elements.dialogInput.classList.remove('hidden');
      elements.dialogInput.value = options.defaultValue || '';
    } else {
      elements.dialogInput.classList.add('hidden');
    }
    
    elements.dialogButtons.innerHTML = '';
    
    options.buttons.forEach(btnInfo => {
      const button = document.createElement('button');
      button.textContent = btnInfo.text;
      button.classList.add('dialog-btn');
      if (btnInfo.isPrimary) {
        button.classList.add('dialog-btn-primary');
      }
      
      button.onclick = () => {
        closeDialog();
        const result = (options.type === 'prompt' && btnInfo.value === true) ? elements.dialogInput.value : btnInfo.value;
        resolve(result);
      };
      elements.dialogButtons.appendChild(button);
    });

    const closeDialog = () => {
      elements.customDialog.classList.add('hidden');
      document.removeEventListener('keydown', escapeHandler);
    };
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            const cancelValue = options.buttons.find(b => b.value === false || b.value === null)?.value;
            closeDialog();
            resolve(cancelValue);
        }
    };
    
    elements.dialogCloseBtn.onclick = () => {
        const cancelValue = options.buttons.find(b => b.value === false || b.value === null)?.value;
        closeDialog();
        resolve(cancelValue);
    };

    document.addEventListener('keydown', escapeHandler);
    elements.customDialog.classList.remove('hidden');

    const primaryButton = elements.dialogButtons.querySelector('.dialog-btn-primary');
    if (options.type === 'prompt') {
        elements.dialogInput.focus();
        elements.dialogInput.select();
    } else if (primaryButton) {
        primaryButton.focus();
    }
  });
}

/**
 * نمایش یک پیام هشدار (Alert)
 * @param {string} message - متن پیام
 * @param {string} [title='توجه'] - عنوان پیام
 * @returns {Promise<boolean>}
 */
export function customAlert(message, title = 'توجه') {
  return showCustomDialog({
    title,
    message,
    type: 'alert',
    buttons: [
      { text: 'باشه', value: true, isPrimary: true }
    ]
  });
}

/**
 * نمایش یک پیام تایید (Confirm)
 * @param {string} message - متن پیام
 * @param {string} [title='تایید'] - عنوان پیام
 * @returns {Promise<boolean>}
 */
export function customConfirm(message, title = 'تایید') {
  return showCustomDialog({
    title,
    message,
    type: 'confirm',
    buttons: [
      { text: 'انصراف', value: false, isPrimary: false },
      { text: 'تایید', value: true, isPrimary: true }
    ]
  });
}

/**
 * نمایش یک پیام برای دریافت ورودی (Prompt)
 * @param {string} message - متن پیام
 * @param {string} [defaultValue=''] - مقدار پیش‌فرض ورودی
 * @param {string} [title='ورودی'] - عنوان پیام
 * @returns {Promise<string|null>}
 */
export function customPrompt(message, defaultValue = '', title = 'ورودی') {
  return showCustomDialog({
    title,
    message,
    type: 'prompt',
    defaultValue,
    buttons: [
      { text: 'انصراف', value: null, isPrimary: false },
      { text: 'تایید', value: true, isPrimary: true }
    ]
  });
}
