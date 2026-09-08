# Math Engine

فضای کاری ریاضی، سراسر سمت کلاینت و آفلاین — بدون هیچ فراخوانی شبکه‌ای در منطق برنامه.

**ماژول‌ها:** ماشین‌حساب (ساده/علمی) · کتابخانه‌ی فرمول · مبدل واحد · میزکار (تاریخچه، سنجاق‌ها، علاقه‌مندی‌ها) · تنظیمات · راهنما

**فناوری:** React 19 + TypeScript + Vite 7 + Tailwind 3، با پشتیبانی کامل RTL/LTR (فارسی/انگلیسی) و اعداد فارسی/عربی در پارسر ریاضی.

## اجرا

```bash
npm install
npm run dev       # سرور توسعه
npm run build     # build نهایی (tsc -b && vite build) → پوشه‌ی dist
npm run preview   # پیش‌نمایش build نهایی
npm run lint      # eslint
```

## ساختار

```
src/
  core/       منطق مشترک: parser (موتور ریاضی), store (state), storage,
              formulas, units, i18n, format, events
  modules/    یک پوشه به‌ازای هر صفحه/بخش
  ui/kit.tsx  کامپوننت‌های پایه‌ی رابط کاربری (Btn, Card, Sheet, Toast, ...)
  layout/     AppShell (ناوبری) + ErrorBoundary
```

هیچ کتابخانه‌ی UI بیرونی (Radix/shadcn و مشابه) استفاده نمی‌شود؛ تمام کامپوننت‌ها داخلی و سفارشی‌اند.

## نکات فنی

- **پارسر:** الگوریتم Shunting-Yard + ارزیابی RPN — بدون `eval`/`new Function`.
- **ذخیره‌سازی:** فقط `localStorage`، با `try/catch` و fallback در صورت خرابی داده.
- **بدون تله‌متری:** هیچ درخواست شبکه‌ای (fetch/XHR) در کد برنامه وجود ندارد.

## Telegram Mini App

پروژه هم به‌عنوان وب‌اپ مستقل، هم به‌عنوان Telegram Mini App اجرا می‌شود. جزئیات کامل معماری در `PROJECT_CONTEXT.md` (بخش Platform Layer).

**بات:** `@MathEngineANBot` · **Mini App:** `t.me/MathEngineANBot/mathengine`

## تاریخچه‌ی نسخه‌ها

### v1.1 — Telegram Platform Layer
- زیرساخت کامل Telegram Mini App: تم زنده، Safe Area، دکمه‌ی Back، Haptic Feedback، CloudStorage (بک‌آپ تنظیمات/علاقه‌مندی‌ها)، Fullscreen، Main Button
- سیستم مرکزی Share (`core/sharing/`) برای Calculator/Formula/Converter — با اولویت Telegram native → Web Share → Clipboard
- نام کاربر تلگرام در پیام خوش‌آمدگویی (فقط نام، بدون عکس/یوزرنیم)
- Deep Link: باز کردن مستقیم یه محاسبه از طریق لینک تلگرام
- دسترسی به Developer Mode از موبایل (Settings ← ۷ ضربه روی آیکون Σ ← دکمه‌ی «توسعه‌دهنده ✓»)
- بات تلگرام (Cloudflare Worker جدا، پروژه‌ی `mathengine-bot`) برای پاسخ به `/start`

### v1.0 — انتشار اولیه
- ماشین‌حساب، کتابخانه‌ی فرمول، مبدل واحد، میزکار، تنظیمات
- رفع باگ محتوایی (شمار دسته‌های تبدیل)، یکپارچه‌سازی i18n، مکانیزم Migration برای Storage
- تصحیح رنگ پس‌زمینه در حالت لایت (سایدبار، Segmented control)

