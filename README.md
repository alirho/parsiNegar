# پارسی‌نگار (ParsiNegar)

![پارسی‌نگار](https://img.shields.io/badge/ParsiNegar-v2.10.0-blue)
![زبان](https://img.shields.io/badge/Language-Persian-green)
![مجوز](https://img.shields.io/badge/License-MIT-yellow)

> این پروژه جهت بررسی توانایی دستیارهای هوش مصنوعی برای تولید و توسعه برنامه‌های تحت وب پیاده‌سازی شده است.

پارسی‌نگار یک ویرایشگر مارک‌داون آنلاین و سبک است که به طور خاص برای نوشتن متن‌های فارسی و راست به چپ (RTL) طراحی شده است. این ویرایشگر با تمرکز بر تجربه کاربری مناسب برای کاربران فارسی‌زبان ایجاد شده و امکان نوشتن، ویرایش و پیش‌نمایش متن‌های مارک‌داون را به صورت همزمان فراهم می‌کند.

این پروژه با استفاده از ابزارهای [bolt](https://bolt.new) و [google aistudio](https://aistudio.google.com) توسعه یافته است.

مشاور فنی [ShahroozD](https://github.com/ShahroozD)

![تصویر](pic/screenshot.png)

## ویژگی‌ها

- پشتیبانی کامل از زبان فارسی و نوشتار راست به چپ (RTL)
- پشتیبانی از مفسر [شه‌نشان](https://github.com/barnevis/ShahNeshan) و [marked](https://github.com/markedjs/marked)
- نمایش زنده و همزمان با نوشتن
- نمایش آمار متن (تعداد نویسه، کلمه، خط و حجم فایل)
- قابلیت تغییر فونت
- قابلیت تغییر اندازه فونت
- پشتیبانی از تم روشن، تاریک و  سپیا
- نوار ابزار با دکمه‌های فرمت‌بندی متن
- ذخیره خودکار محتوا در مرورگر
- امکان خروجی گرفتن به فرمت‌های Markdown، HTML و PDF
- میان‌بر نوشتاری (/) برای دسترسی سریع به فرمت‌بندی‌های مارک‌داون
- امکان فعال و غیرفعال کردن منوها
- امکان رسم نمودارها و دیاگرام‌های مختلف (mermaidjs)
- امکان ایجاد نقشه‌ذهنی (mindmap)
 

## نحوه استفاده

### استفاده آنلاین

برای استفاده آنلاین از پارسی‌نگار، کافی است به وب‌سایت پروژه مراجعه کنید: [پارسی‌نگار](https://alirho.github.io/parsiNegar)

### اجرای محلی

برای اجرای پارسی‌نگار به صورت محلی روی سیستم خود، مراحل زیر را دنبال کنید:

1. مخزن پروژه را کلون کنید:

```bash
git clone https://github.com/alirho/parsiNegar.git
```

2. به دایرکتوری پروژه بروید:

```bash
cd parsiNegar
```

3. فایل `index.html` را در مرورگر خود باز کنید یا از یک سرور محلی استفاده کنید.

### راهنمای استفاده

1. متن مارک‌داون خود را در پنل سمت راست بنویسید.
2. پیش‌نمایش متن به صورت همزمان در پنل سمت چپ نمایش داده می‌شود.
3. از دکمه‌های نوار ابزار برای فرمت‌بندی سریع متن استفاده کنید.
4. برای تغییر تنظیمات (فونت، تم و...) روی آیکون چرخ‌دنده کلیک کنید.
5. برای خروجی گرفتن از متن، از دکمه‌های خروجی در بالای پنل پیش‌نمایش استفاده کنید.

## توسعه

برای مشارکت در توسعه پارسی‌نگار:

1. ابتدا پروژه را فورک کنید.
2. یک شاخه جدید برای ویژگی یا اصلاح خود ایجاد کنید.
3. تغییرات خود را اعمال کنید.
4. یک درخواست ادغام (Pull Request) ارسال کنید.

## مجوز

این پروژه تحت مجوز MIT منتشر شده است.
