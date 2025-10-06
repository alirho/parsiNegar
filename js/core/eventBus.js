// ماژول گذرگاه رویداد (Event Bus)
// این ماژول یک سیستم ساده انتشار/اشتراک (Pub/Sub) برای ارتباط بین ماژول‌ها فراهم می‌کند.

const events = {};

export const EventBus = {
  /**
   * اشتراک در یک رویداد
   * @param {string} event - نام رویداد
   * @param {Function} callback - تابعی که هنگام وقوع رویداد فراخوانی می‌شود
   */
  on(event, callback) {
    if (!events[event]) {
      events[event] = [];
    }
    events[event].push(callback);
  },

  /**
   * انتشار یک رویداد
   * @param {string} event - نام رویداد
   * @param {*} data - داده‌ای که به شنوندگان رویداد ارسال می‌شود
   */
  emit(event, data) {
    if (events[event]) {
      events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`خطا در اجرای شنونده برای رویداد '${event}':`, error);
        }
      });
    }
  },

  /**
   * لغو اشتراک از یک رویداد
   * @param {string} event - نام رویداد
   * @param {Function} callback - تابعی که باید حذف شود
   */
  off(event, callback) {
    if (events[event]) {
      events[event] = events[event].filter(cb => cb !== callback);
    }
  }
};
