# آیکون و Splash واقعی — راهنما

## علت باگ

وقتی `npx cap add android` اجرا می‌شه، Capacitor یه سری آیکون/splash
placeholder پیش‌فرض خودش (لوگوی Capacitor) می‌سازه چون هیچ‌وقت بهش
نگفتیم از لوگوی واقعی ما استفاده کنه. این همون چیزیه که شما دیدید:
هم آیکون اپ روی صفحه‌ی اصلی، هم لوگوی splash موقع باز شدن، هیچ‌کدوم
Math Engine نیستن.

## راه‌حل

پروژه از قبل `public/icon-512.png` رو داره (همون که برای PWA استفاده
می‌شه) — از همین برای اندروید هم استفاده می‌کنیم، با ابزار رسمی خود
Capacitor.

## دستورها (توی ترموکس، داخل پوشه‌ی mathengine)

```bash
mkdir -p resources
cp public/icon-512.png resources/icon.png
cp public/icon-512.png resources/splash.png
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --android
```

این دستور آخر خودکار همه‌ی سایزهای mipmap (hdpi تا xxxhdpi) و همه‌ی
حالت‌های splash (light/dark، portrait/landscape) رو از روی همین یه
فایل می‌سازه و مستقیم جایگزین فایل‌های placeholder توی
`android/app/src/main/res/` می‌کنه.

### نکته درباره‌ی splash

چون `resources/splash.png` رو هم از همون آیکون ساختیم (نه یه طرح
splash جدا)، ابزار به‌صورت خودکار پس‌زمینه‌ی یکدست دورش می‌ذاره —
نتیجه یه splash ساده با لوگوی واقعی وسطش می‌شه، نه یه طرح گرافیکی
جدا. اگه بعداً خواستید splash قشنگ‌تر و اختصاصی‌تر (نه فقط لوگوی
وسط‌چین) داشته باشید، کافیه یه `resources/splash.png` جدا (۲۷۳۲×۲۷۳۲
پیشنهادی) با طرح دلخواه جایگزین کنید و دوباره همون دستور
`generate --android` رو بزنید.

## بعدش

```bash
npx cap sync android
```
