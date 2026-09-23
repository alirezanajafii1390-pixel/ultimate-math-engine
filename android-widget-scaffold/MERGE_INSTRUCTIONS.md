# Widget V1 — merge instructions

این پوشه یه **staging area**‌ست، نه بخشی از یه پروژه‌ی اندروید واقعی —
چون `android/` هنوز وجود نداره (هنوز `npx cap add android` لوکال روی
سیستم شما اجرا نشده، طبق محدودیت شبکه‌ای که قبلاً گفته شد). وقتی
Stage 3.2 رو لوکال کامل کردید (`npm install` + `npx cap add android`)،
این فایل‌ها رو دقیقاً به این مسیرها کپی/merge کنید:

## ۱. فایل‌های جدید (کپی مستقیم، بدون merge)

| از | به |
|---|---|
| `kotlin/MathEngineWidgetProvider.kt` | `android/app/src/main/java/dev/mathengine/app/MathEngineWidgetProvider.kt` |
| `res/layout/widget_math_engine.xml` | `android/app/src/main/res/layout/widget_math_engine.xml` |
| `res/drawable/widget_background.xml` | `android/app/src/main/res/drawable/widget_background.xml` |
| `res/xml/math_engine_widget_info.xml` | `android/app/src/main/res/xml/math_engine_widget_info.xml` |

## ۲. فایل‌های موجود (merge، نه overwrite)

### `android/app/src/main/res/values/strings.xml`
دو خط داخل `res/values/strings_snippet.xml` رو داخل بلاک
`<resources>...</resources>` موجود این فایل اضافه کنید.

### `android/app/src/main/AndroidManifest.xml`
داخل تگ `<application>` موجود (کنار `<activity>` که Capacitor خودش
ساخته)، این `<receiver>` رو اضافه کنید:

```xml
<receiver
    android:name=".MathEngineWidgetProvider"
    android:exported="false"
    android:label="@string/widget_label">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/math_engine_widget_info" />
</receiver>
```

`android:exported="false"` عمداً — این widget provider فقط باید توسط
سیستم اندروید (launcher) صدا زده بشه، نه از بیرون اپلیکیشن.

## ۳. بعد از merge

```bash
npm run build
npx cap sync android
```

سپس از Android Studio (یا `./gradlew assembleDebug`) بیلد بگیرید و
روی امولاتور/دستگاه واقعی نصب کنید. برای تست:
1. اپ رو نصب کنید (حتی بدون باز کردنش لازم نیست، ولی معمولاً اول اپ
   نصب باشه بهتره).
2. روی صفحه‌ی اصلی اندروید، long-press → Widgets → Math Engine باید
   توی لیست ظاهر بشه.
3. بکشیدش روی صفحه‌ی اصلی.
4. روش تپ کنید → باید اپ باز بشه (`MainActivity`).

## وضعیت واقعی این Stage

هیچ‌کدوم از موارد بالا اینجا build یا تست نشدن (طبق محدودیت شبکه).
این فایل‌ها از نظر syntax و منطق Android/Kotlin استاندارد درستن
(بر پایه‌ی API رسمی `AppWidgetProvider`)، ولی رسماً:
`NOT TESTED — REQUIRES LOCAL BUILD + REQUIRES REAL DEVICE`.
