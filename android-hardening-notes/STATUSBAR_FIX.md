# Status bar overlap — real fix (Stage 3.10 hardening, first real device test)

## علت واقعی

کد `StatusBar.setOverlaysWebView({ overlay: false })` از قبل توی
`CapacitorPlatformProvider.tsx` بود، ولی روی گوشی شما مشکل رو حل نکرد.
دلیلش: اندروید ۱۵ (API 35) که پروژه‌های Capacitor 7 پیش‌فرض باهاش
build می‌شن، **edge-to-edge رو اجباری می‌کنه** و APIهای قدیمی مثل همین
تابع رو نادیده می‌گیره — گوشی شما احتمالاً اندروید ۱۵ یا بالاتره.

راه‌حل واقعی: یه فلگ توی theme اندروید که موقتاً از این اجبار
opt-out می‌کنه.

## چیکار کنید

فایل `android/app/src/main/res/values/styles.xml` رو باز کنید:
```bash
cat android/app/src/main/res/values/styles.xml
```

داخل تگ `<style name="AppTheme" ...>` (و اگه یه `AppTheme.NoActionBarLaunch`
جدا هم بود، همون‌جا هم) این خط رو اضافه کنید:
```xml
<item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
```

اگه مطمئن نیستید کجا دقیقاً، محتوای کامل فایل رو برام بفرستید تا
دقیق بگم کجا اضافه بشه.

## بعدش

```bash
npx cap sync android
```
(نیازی به rebuild وب نیست، این فقط تغییر native بود.)
