// ماژول مدیریت ذخیره‌سازی در IndexedDB

let db;

/**
 * باز کردن یا ایجاد پایگاه داده IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
async function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open('parsiNegarDB', 1);

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains('files')) {
                dbInstance.createObjectStore('files', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('خطای IndexedDB:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

/**
 * ذخیره یک فایل در پایگاه داده
 * @param {string} id - شناسه‌ی فایل
 * @param {string} content - محتوای فایل
 * @param {object} [options={}] - گزینه‌ها (مانند تاریخ ایجاد)
 * @returns {Promise<void>}
 */
export async function saveFileToDB(id, content, options = {}) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const existingFile = getRequest.result;
            const creationDate = options.creationDate || (existingFile ? (existingFile.creationDate || existingFile.lastModified) : new Date());
            
            const file = { 
                id, 
                content, 
                lastModified: new Date(),
                creationDate: creationDate
            };
            const putRequest = store.put(file);
        
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = (event) => reject(event.target.error);
        };
        getRequest.onerror = (event) => reject(event.target.error);
    });
}

/**
 * خواندن یک فایل از پایگاه داده
 * @param {string} id - شناسه‌ی فایل
 * @returns {Promise<object|undefined>}
 */
export async function getFileFromDB(id) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * خواندن تمام فایل‌ها از پایگاه داده
 * @returns {Promise<Array<object>>}
 */
export async function getAllFilesFromDB() {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * حذف یک فایل از پایگاه داده
 * @param {string} id - شناسه‌ی فایل
 * @returns {Promise<void>}
 */
export async function deleteFileFromDB(id) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * پاک کردن تمام فایل‌ها از پایگاه داده
 * @returns {Promise<void>}
 */
export async function clearFilesDB() {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}
