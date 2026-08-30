# PROJECT_CONTEXT.md — Math Engine

> این فایل حافظه‌ی بلندمدت معماری پروژه است. هر تصمیم مهم معماری یا تغییر ساختاری در آینده باید این فایل رو هم به‌روزرسانی کنه.
> آخرین به‌روزرسانی: بعد از تکمیل فاز آنبوردینگ + اصلاحات v1 + هر ۷ گام Platform Layer برای Telegram Mini App.

---

## ۱. نمای کلی پروژه

Math Engine یک فضای کاری ریاضی تماماً کلاینت‌ساید و آفلاین است — بدون حساب کاربری، بدون ردیابی، بدون هیچ فراخوانی شبکه‌ای (تأیید شده: هیچ `fetch`/`XHR`/`axios` در کل `src` وجود ندارد).

**استک فنی:** React 19 + TypeScript + Vite 7 + Tailwind 3 + react-router 7 + lucide-react + `@fontsource-variable/vazirmatn`.

**ابزارهای اصلی:** Calculator (پایه/علمی)، Formula Library، Unit Converter، Workspace (میزکار)، Settings، Help، Developer Mode (فقط dev).

**زبان‌ها:** فارسی (RTL) و انگلیسی (LTR)، با تناظر کامل کلید — هیچ کلید گم‌شده‌ای در هیچ‌کدام نیست (۲۲۲ کلید در هر دو).

---

## ۲. معماری

```
src/
  core/       ← منطق مشترک، بدون وابستگی به UI
    parser.ts       — Tokenizer → Shunting-Yard → RPN Evaluator (بدون eval)
    store.tsx        — State مرکزی (useReducer) + persistence + migration hook
    storage.ts        — Platform-independent storage adapter (Web: localStorage)
    i18n.tsx           — سیستم ترجمه fa/en
    formulas.ts         — کتابخانه‌ی ۴۲ فرمول (data-driven)
    units.ts              — ۱۲ دسته‌ی واحد تبدیل (data-driven)
    format.ts               — فرمت‌بندی عدد/زمان
    calc-helpers.ts           — منطق خالص ویرایش عبارت (negateExpr و...)
    events.ts                  — Event Bus سبک (برای Developer Monitor)
  modules/    ← هر صفحه یک پوشه (calculator, converter, developer, formula, help, home, settings, workspace)
  ui/kit.tsx  ← کامپوننت‌های پایه (Btn, Card, Sheet, Toast, Toggle, ...)
  layout/     ← AppShell (ناوبری موبایل/دسکتاپ) + ErrorBoundary
```

جریان کلی: `main.tsx` → `App.tsx` → `StoreProvider` → `LanguageProvider` → `Routes` داخل `AppShell`.

**اصل معماری کلیدی:** `core/` کاملاً UI-agnostic و بدون وابستگی به DOM/browser API خاصه — این عمداً برای قابلیت استفاده‌ی مجدد در پلتفرم‌های آینده (Telegram Mini App) طراحی شده.

---

## ۳. موتور ریاضی (Parser)

مسیر واقعی پردازش: **ورودی خام → نرمال‌سازی (اعداد فارسی/عربی، `sin²`→`(sin(...))^2`، `³`→`^3`) → Tokenizer → درج ضرب ضمنی → Shunting-Yard → RPN Evaluator → نتیجه**.

- **بدون `eval`/`new Function`** — یک تست امنیتی صریح (`console.log(1)` و `while(true){}`) این رو تضمین می‌کنه.
- توابع پشتیبانی‌شده: مثلثاتی (sin/cos/tan + معکوس + هایپربولیک)، لگاریتم (ln/log/log2)، توان/ریشه (sqrt/cbrt/pow)، فاکتوریل (سقف ۱۷۰ برای جلوگیری از Overflow، تست‌شده)، درصد، مد درجه/رادیان.
- ثابت‌ها: pi, e, tau, phi, inf.
- خطاها با کد مشخص (`MathError` با `code`: EMPTY, SYNTAX, UNBALANCED, DIV_ZERO, DOMAIN, UNKNOWN_NAME, BAD_ARG, OVERFLOW).
- `tan(90°)` عمداً یه خطای DOMAIN میده، نه یه عدد گنده‌ی بی‌معنی.

---

## ۴. State Management

`core/store.tsx` — یک `useReducer` با یک reducer خالص (`reducer(state, action)`) که کاملاً قابل تست است (فایل `store.test.ts` مستقیم روی خودِ reducer تست می‌زنه، نه از طریق UI).

نکات کلیدی reducer:
- `history:add` سقف ۵۰۰ ورودی.
- `pin:add` سقف ۲۴ ورودی + dedupe بر اساس `ref`+`type`.
- `theme:reset` بدون override موجود، همون رفرنس state رو برمی‌گردونه (بدون re-render اضافه).
- Action ناشناخته → state بدون تغییر (رفرنس یکسان).

### Persistence
- فقط اسلایس‌های *تغییرکرده* نوشته می‌شن (diff مبتنی بر رفرنس، نه deep-equal) — نوشتن روی storage گرون نیست.
- Debounce ۲۵۰ میلی‌ثانیه‌ای.
- شکست نوشتن (مثلاً پر شدن Quota) به‌جای فیل سایلنت، از طریق event bus (`system:persist-failed`) به toast کاربر گزارش می‌شه.

---

## ۵. Storage Architecture

`core/storage.ts` — یک Adapter مستقل از پلتفرم (کامنت خودِ فایل: «Platform-independent Storage Service (Web adapter: localStorage)»).

- `STORAGE_VERSION = 1`، پیشوند کلید: `mathengine:v1:`.
- **دسترسی به `localStorage` تقریباً کاملاً متمرکزه** در این فایل — تنها استثنا یک خط فقط-خوانشی در `DeveloperPage.tsx` برای نمایش حجم یک کلید (بدون ریسک).
- `importAll` ورودی‌ها رو با regex اعتبارسنجی می‌کنه (محافظت در برابر کلید مخرب هنگام import پشتیبان).

### مکانیزم Migration (تازه اضافه‌شده، قبل از انتشار v1)
- یک مارکر نسخه‌ی **بدون پیشوند** (`mathengine:storage-version`) که در تغییر پیشوند هم باقی می‌مونه.
- یک رجیستری `MIGRATIONS: Record<number, Migration>` که فعلاً **خالیه** (چون v1 اولین نسخه‌ی منتشرشده‌ست، چیزی برای migrate کردن وجود نداره).
- `runMigrations()` یک‌بار در بوت اپ (داخل `loadState()` در `store.tsx`) صدا زده می‌شه، قبل از خوندن هر اسلایس.
- **برای توسعه‌دهنده‌ی آینده:** وقتی `STORAGE_VERSION` رو بالا بردی، فقط یه تابع transform به `MIGRATIONS` زیر کلید نسخه‌ی قبلی اضافه کن — بقیه‌ی مکانیزم خودکار کار می‌کنه.

---

## ۶. Theme Architecture

سه حالت: `system` / `light` / `dark`.

- `system` به‌صورت زنده `matchMedia('(prefers-color-scheme: dark)')` رو گوش می‌ده؛ فقط وقتی `pref === 'system'` باشه subscribe می‌کنه (اگه کاربر صریح light/dark انتخاب کرده باشه، دیگه گوش نمی‌ده).
- `resolveTheme(pref)` یک تابع خالص و تست‌شده‌ست (`store.test.ts`).
- توکن‌های light/dark به‌صورت جدا در `index.css` تعریف شدن، نه صرفاً معکوس‌کردن رنگ‌ها.
- حالت‌های کیفیت گرافیک (Auto/High/Medium/Low) رابطه‌ی درست `High ≥ Medium ≥ Low` رو رعایت می‌کنن (بلور، سایه، مدت انیمیشن به‌ترتیب کاهش پیدا می‌کنن). `resolveAutoQuality()` از `hardwareConcurrency`/`deviceMemory` واقعی دستگاه استفاده می‌کنه.
- Theme Editor (dev-only) از طریق `theme:set`/`theme:reset` override هر متغیر CSS رو ممکن می‌کنه.

---

## ۷. i18n / RTL

- سیستم ترجمه در `core/i18n.tsx` — دو آبجکت `fa`/`en` با تناظر کامل کلید (۲۲۲ کلید هرکدوم، تست‌شده به‌صورت static).
- `root.dir` و `root.lang` به‌صورت پویا بر اساس زبان تنظیم می‌شن.
- **قانون پروژه:** متن کاربر فقط از طریق `t('key')`. یک استثنای مجاز شناخته‌شده: در `HomePage.tsx` نقطه‌گذاری نام کاربر (`، نام` فارسی در برابر `, name` انگلیسی) که چون خروجی پویاست، نمی‌تونه کلید ثابت باشه.
- `DeveloperPage.tsx` **عمداً** تماماً انگلیسیه (تصمیم طراحی، نه باگ) — چون فقط ابزار دیباگ توسعه‌دهنده‌ست.

---

## ۸. UI Architecture

- **موبایل:** هدر بالا ثابت (۴۸px) + نوار ناوبری شناور پایین (glass pill) با `safe-area-inset` درست مدیریت‌شده.
- **دسکتاپ:** Sidebar ثابت ۲۳۲px، بدون نوار پایین.
- **Sheet/Modal:** focus-trap کامل و درست (Tab/Shift+Tab بین اولین/آخرین المان می‌چرخه، Escape می‌بنده، فوکوس بعد از بسته‌شدن برمی‌گرده به المان اولیه).
- **Calculator:** یک گرید تخت بدون اسکرول؛ ارتفاعش با `calc(100dvh - 104px)` (موبایل) / `calc(100dvh - 56px)` (دسکتاپ) دقیقاً به‌اندازه‌ی فضای چروم صفحه تنظیم می‌شه.
- **جستجوی سراسری (Ctrl/Cmd+K):** روی فرمول‌ها، واحدها، ابزارها، و تاریخچه هم‌زمان جستجو می‌کنه.
- **هماهنگی Calculator ↔ Parser:** تمام توکن‌های تولیدشده توسط کیبورد علمی، دقیقاً با توابع/عملگرهای `parser.ts` یکی هستن — بدون توکن یتیم.

---

## ۹. فرمول‌ها و واحدها (Data-driven)

- `core/formulas.ts`: **۴۲ فرمول** (نه ۵۲ — این عدد قبلاً در یه گزارش اولیه اشتباه محاسبه شده بود). فقط از توابع `sin`, `cos`, `sqrt` استفاده می‌کنن — هرسه در parser موجودن.
- هنگام «ارسال به ماشین‌حساب»، مقادیر متغیر با پرانتز جایگذاری می‌شن (`(-3)` نه `-3`) تا مشکل کلاسیک `-3^2 ≠ (-3)^2` رخ نده.
- `core/units.ts`: **۱۲ دسته‌ی واحد** — length, mass, temperature, area, volume, speed, time, data, pressure, energy, angle, power. دما به‌صورت غیرخطی (`toBase`/`fromBase`) پیاده شده، بقیه خطی (`factor`).

---

## ۱۰. تست‌ها

۴ فایل تست (`parser.test.ts`, `store.test.ts`, `units.test.ts`, `calc-helpers.test.ts`، جمعاً ۴۷۸ خط) با Vitest.

**وضعیت تأیید:** به‌دلیل نبود دسترسی شبکه در محیط تحلیل، تست‌ها به‌صورت واقعی اجرا نشدن. بررسی **static** (ردیابی دستی خط‌به‌خط هر Assertion در برابر پیاده‌سازی واقعی) انجام شد و همه‌ی موارد بررسی‌شده منطقاً درست بودن — ولی این معادل اجرای واقعی نیست.

**⚠️ قبل از انتشار v1، حتماً لوکال اجرا کن:**
```bash
npm install
npm run build
npm test
```

---

## ۱۱. امنیت

- بدون `eval`/`new Function`/`innerHTML`/`dangerouslySetInnerHTML` در کل کدبیس.
- پارسر ریاضی امنه چون از الگوریتم Shunting-Yard دستی استفاده می‌کنه، نه اجرای رشته به‌صورت کد.
- دسترسی به storage متمرکزه.
- `importAll` (بازیابی پشتیبان) ورودی رو اعتبارسنجی می‌کنه.

---

## ۱۲. مسیر Developer

`/developer` یک self-guard داره:
```ts
if (!state.settings.devMode) return <Navigate to="/" replace />;
```
یعنی حتی با URL مستقیم هم بدون فعال‌بودن `devMode`، به Home ریدایرکت می‌شه. (این نکته چون در تحلیل اولیه اشتباه گزارش شده بود، اینجا صریح ثبت می‌شه تا سردرگمی آینده پیش نیاد.)

---

## ۱۳. اصلاحات انجام‌شده در فاز نهایی‌سازی v1

| # | تغییر | فایل(ها) |
|---|---|---|
| ۱ | تصحیح «۱۱ دسته» → «۱۲ دسته» در متن راهنمای مبدل واحد (fa+en) | `HelpPage.tsx` |
| ۲ | افزودن کلید رسمی `conv.nonLinearHint` به‌جای hint هاردکد دوزبانه | `i18n.tsx`, `ConverterPage.tsx` |
| ۳ | لوکالایز aria-labelهای Calculator (scientific/undo/redo/history) و دکمه‌ی close در Sheet | `i18n.tsx`, `CalculatorPage.tsx`, `kit.tsx` |
| ۴ | افزودن مکانیزم واقعی Migration (مارکر نسخه + رجیستری + `runMigrations()`) | `storage.ts`, `store.tsx` |
| ۵ | رفع رنگ تیره‌ی هاردکد (`rgba(7,25,30,...)`) که در ۷ جا (سایدبار، Segmented control، چند input) به تم لایت وابسته نبود — دو توکن جدید (`--surface-fill`, `--surface-chrome`) با مقدار لایت `#EAF3E9` | `index.css`, `AppShell.tsx`, `kit.tsx`, `ConverterPage.tsx`, `FormulaPage.tsx`, `HomePage.tsx` |

**عمداً دست‌نخورده مونده (تصمیم آگاهانه، نه فراموشی):**
- Duplicate جزئی بین `formatNumber`/`formatPlain` — خروجی‌شون واقعاً متفاوته، ادغام ریسک بی‌مورد داره.
- Duplicate جزئی فرمول تبدیل درجه↔رادیان در `parser.ts` (یک‌بار در `toRad`/`fromRad`، یک‌بار در توابع `deg()`/`rad()`) — مصرفشون متفاوته.
- aria-labelهای انگلیسی در `DeveloperPage.tsx` — کل صفحه عمداً انگلیسیه (ابزار دیباگ، نه UI کاربر نهایی).

---

## ۱۴. Platform Layer — Telegram Mini App (کامل، هر ۷ گام پیاده‌سازی شد)

Math Engine الان روی دو پلتفرم اجرا می‌شه: **Web** (مستقل، بدون هیچ وابستگی به تلگرام) و **Telegram Mini App** (لایه‌ی اضافه‌ی اختیاری). SDK رسمی استفاده‌شده: **`@tma.js/sdk-react`** — نسخه‌های قدیمی‌تر `@telegram-apps/sdk-react`/`@telegram-apps/sdk` **رسمآ deprecated** شدن، از اون‌ها استفاده نشد.

### ساختار فایل‌ها
```
src/platform/
  types.ts                              — قرارداد PlatformAdapter (بدون import از SDK)
  detectTelegram.ts                      — تشخیص محیط، zero-dependency (بدون import از SDK)
  webAdapter.ts                           — پیاده‌سازی کامل و امن Web (همه no-op)
  PlatformContext.tsx                      — Context + usePlatform() + PlatformProvider (lazy-load شرطی)
  telegram/
    TelegramPlatformProvider.tsx            — تنها فایلی که @tma.js/sdk-react رو import می‌کنه
```

### قانون معماری غیرقابل‌نقض
**هیچ فایلی بیرون `src/platform/` نباید `@tma.js/*` رو import کنه.** این مرز بعد از هر گام با `grep` تأیید شده. صفحات و کامپوننت‌ها فقط `usePlatform()` رو صدا می‌زنن و یه شیء ساده (`PlatformAdapter`) می‌گیرن — نه چیزی از SDK.

### PlatformAdapter — هر ۸ بخش، همه واقعی
```ts
interface PlatformAdapter {
  isTelegram: boolean;
  theme: PlatformTheme;              // colorScheme (از luminance بک‌گراند مشتق می‌شه) + onChange
  viewport: PlatformViewport;         // safeAreaInsets + contentSafeAreaInsets، زنده
  backButton: PlatformBackButton;      // show/hide/onClick واقعی
  haptics: PlatformHaptics;             // impact/notification/selectionChanged واقعی
  initData: PlatformInitData;            // raw + user — فقط نمایشی، هرگز معتبر فرض نشه
  fullscreen: PlatformFullscreen;         // request/exit/isFullscreen واقعی
  cloudStorage: PlatformCloudStorage;      // get/set/remove واقعی
  ready(): void;
}
```

### تصمیمات کلیدی (باید حفظ بشن)

1. **Lazy-load شرطی.** `PlatformContext.tsx` با یه تابع zero-dependency (`isTelegramEnvironment()` — فقط `window.Telegram.WebApp` یا پارامترهای URL رو چک می‌کنه) تصمیم می‌گیره، و فقط اگه true بود، `TelegramPlatformProvider` رو با `React.lazy()` بارگذاری می‌کنه. **در وب معمولی، حتی یک بایت از SDK تلگرام fetch نمی‌شه.**

2. **تم:** چون `themeParams` تلگرام یه فیلد مستقیم `colorScheme` نداره (فقط رنگ‌های تک‌تک)، dark/light از روی **luminance ادراک‌شده‌ی `bgColor`** محاسبه می‌شه. `resolveTheme(pref, telegramColorScheme?)` در `core/store.tsx` یه پارامتر دوم اختیاری گرفت — اولویت: **۱) انتخاب صریح کاربر ۲) رنگ تلگرام (فقط در حالت system) ۳) matchMedia (fallback وب، دست‌نخورده)**. زنده‌بودن (بدون reload) از طریق React reactivity تضمین می‌شه، نه event listener دستی.

3. **Safe Area:** AppShell دو تا CSS variable (`--platform-safe-top/bottom`) رو فقط وقتی `isTelegram` باشه ست می‌کنه؛ دو نقطه‌ی مصرف قدیمی `env(safe-area-inset-*)` به `var(--platform-safe-*, env(...))` تبدیل شدن — بیرون تلگرام دقیقاً همون رفتار قبلی.

4. **Back Button:** چون routeهای پروژه **تخت** هستن (بدون صفحه‌ی جزئیات تودرتو)، «Back» همیشه یعنی **برو Home**، نه `navigate(-1)` (که با deep link می‌تونست از کل Mini App خارج کنه). دو `effect` جدا در AppShell: یکی فقط یه‌بار `onClick` رجیستر می‌کنه، یکی فقط `show/hide` رو بر اساس مسیر عوض می‌کنه — این جدایی عمدیه، وگرنه بین دو صفحه‌ی غیر-Home دکمه چشمک می‌زد.

5. **Haptic Feedback:** کامپوننت `Key` (تنها مصرف‌کننده‌ش کیبورد ماشین‌حسابه) یه `impact('light')` عمومی روی هر فشار می‌زنه. کلیدهای `=`/`C`/`⌫` یه پرچم `ownHaptic: true` دارن که haptic عمومی رو خاموش می‌کنه (وگرنه دوبار پشت‌سرهم لرزش می‌زدن) و به‌جاش فیدبک اختصاصی خودشون رو دارن (`=` موفق→medium، `=` خطا→notification error، Clear/Backspace→selectionChanged).
   **باگ شناخته‌شده‌ی خودِ تلگرام (نه ما):** توی بعضی نسخه‌های Telegram Android، `impactOccurred`/`selectionChanged` لرزش تولید نمی‌کنن، فقط `notificationOccurred` کار می‌کنه (گزارش رسمی در ایشوی خود Telegram-Mini-Apps).

6. **CloudStorage:** primitive کامل و واقعیه (`getItem`/`setItem`/`deleteItem`)، ولی **به `core/storage.ts` وصل نشده** — یعنی هنوز هیچ داده‌ای (تم، تاریخچه، ...) خودکار sync نمی‌شه. این عمدیه: تصمیم اینکه کدوم اسلایس‌ها sync بشن و تعارض چطور حل بشه، یه تصمیم محصولیه که باید جدا بررسی بشه. تلگرام برای «کلید وجود نداره» رشته‌ی خالی `''` برمی‌گردونه؛ adapter اون رو به `null` ترجمه می‌کنه تا با قرارداد خودمون یکی باشه.

7. **Fullscreen:** primitive کامل و واقعیه، ولی **هیچ دکمه‌ی UI براش اضافه نشده** — طبق اصل «UI فعلی رو بی‌دلیل تغییر نده».

8. **نکته‌ی performance جزئی (نه باگ):** چون کل `PlatformAdapter` توی یه `useMemo` واحد ساخته می‌شه، هر تغییر توی هر سیگنالی (مثلاً insets ویوپورت) باعث می‌شه کل آبجکت (شامل بخش‌هایی که واقعاً عوض نشدن، مثل `backButton`) رفرنس جدید بگیره. بی‌خطره، ولی باعث چند تا re-run اضافی توی effectهای مصرف‌کننده می‌شه. اگه لازم شد، می‌شه با چند `useMemo` جدا بهینه‌ترش کرد.

9. **`PlatformErrorBoundary` (در `PlatformContext.tsx`):** چون `layout/ErrorBoundary` فعلی *داخل* `TelegramPlatformProvider` قرار می‌گیره (دور `<Outlet/>`، نه دور کل اپ)، هیچ محافظی بالای خودِ `TelegramPlatformProvider` وجود نداشت. اگه SDK تلگرام هر جایی throw می‌کرد (مثلاً هوک‌های `useRawInitData`/`useLaunchParams`)، کل اپ سفید می‌شد. یه Error Boundary مخصوص و **بی‌صدا** (بدون UI نمایشی، برخلاف `layout/ErrorBoundary`) اضافه شد که دور کل `TelegramPlatformProvider` می‌پیچه و در صورت شکست، بی‌سروصدا به `webAdapter` برمی‌گرده. به لطف همین محافظ، هوک‌های initData دیگه نیازی به `try/catch` دور خودشون ندارن (که خودش یه ریسک نقض Rules of Hooks بود چون تعداد هوک‌های صداشده بین رندرها می‌تونست فرق کنه) — الان بدون قید-وشرط صدا زده می‌شن.

10. **hedge برای Responsive viewport (`--tg-viewport-stable-height`):** بعضی WebView های تلگرام ممکنه پشتیبانی کمتر قابل‌اعتمادی از `100dvh` داشته باشن (مشکل شناخته‌شده‌ی عمومی در اکوسیستم Mini App، نه چیزی که خودمون تأییدش کرده باشیم). چون Calculator تنها صفحه‌ایه که صریحاً «هرگز نباید اسکرول بخوره»، فقط همون یه فرمول ارتفاع (`h-[calc(...)]`) به `var(--tg-viewport-stable-height, 100dvh)` تغییر کرد — یعنی داخل تلگرام از مقدار پیکسلی واقعی خودِ تلگرام (که با `viewport.bindCssVars()` به‌صورت خودکار زنده نگه داشته می‌شه) استفاده می‌کنه، و بیرون تلگرام دقیقاً همون `100dvh` قبلی fallback می‌شه. جای دیگه‌ای از اپ دست نخورده. **این یه hedge محتاطانه‌ست، نه یه تضمین قطعی** — قطعیت واقعی فقط با تست روی دستگاه واقعی به دست میاد.

11. **Performance adaptation (چرا کد جدید نگرفت):** `resolveAutoQuality()` در `core/store.tsx` از `navigator.hardwareConcurrency`/`navigator.deviceMemory`/`prefers-reduced-motion` استفاده می‌کنه — همه‌شون API استاندارد مرورگرن که **دقیقاً همون‌جوری داخل WebView تلگرام هم کار می‌کنن** که در هر مرورگر دیگه‌ای کار می‌کنن. یعنی سیستم Auto Quality از قبل، بدون نیاز به هیچ کد مخصوص تلگرام، به‌درستی با سخت‌افزار واقعی دستگاه (چه داخل تلگرام چه بیرون) تطبیق پیدا می‌کنه. هیچ API رسمی از طرف تلگرام برای «این WebView الان تحت فشاره» وجود نداره که بشه بهش اضافه کرد.

### وضعیت تست
build/type-check واقعی روی این لایه **هنوز تأیید نشده** (نیاز به `npm install` واقعی که در محیط تحلیل ممکن نبود). مشکوک‌ترین نقطه برای خطای احتمالی: امضای دقیق TypeScript هوک‌های `useLaunchParams`/`useRawInitData` و متد `cloudStorage.deleteItem`.

### وضعیت مرحله دوم (🟠) — تکمیل شد، به‌جز یک مورد

| # | مورد | وضعیت و تصمیم کلیدی |
|---|---|---|
| ۱۱ | CloudStorage sync | ✅ فقط اسلایس `settings`، write-only، debounce ۲۵۰ms، کاملاً جدا از مکانیزم persist محلی. **هنوز چیزی از cloud خونده نمی‌شه** — این یه بک‌آپ ساده‌ست، نه sync دوطرفه (تصمیم عمدی، برای اینکه مسیر بوت sync سریع و synchronous بمونه) |
| ۱۲ | DeviceStorage | ❌ **عمداً پیاده نشد** — این API در مستندات رسمی `@tma.js/sdk-react` که چک کردم تأیید نشد؛ بدون اطمینان از وجودش، ساختنش ریسک بی‌مورد بود |
| ۱۳ | Deep Links | ✅ `core/calc-helpers.ts` دو تابع `encodeExprForStartParam`/`decodeExprFromStartParam` (base64url) دارن؛ `AppShell.tsx` موقع بوت `startParam` رو می‌خونه و به همون `?expr=` deep-link قدیمی Calculator هدایت می‌کنه (کد تکراری نساختیم) |
| ۱۴ | Share Results | ✅ دکمه‌ی Share در Calculator — **عمداً Telegram-specific نشد** چون username بات به کلاینت شناخته نیست و نمی‌شه یه لینک t.me معتبر ساخت؛ به‌جاش از Web Share API (که داخل تلگرام هم کار می‌کنه) با fallback کپی استفاده می‌کنه |
| ۱۵ | Telegram user greeting | ✅ `HomePage.tsx` — اولویت: نام دستی کاربر > `initData.user.firstName` (تلگرام) > خالی |
| ۱۶ | Telegram Settings integration | ✅ بخش «تلگرام» در Settings، فقط وقتی `platform.isTelegram`، شامل toggle هپتیک |
| ۱۷ | Main/Secondary Button | ✅ primitive کامل (`types.ts`, `webAdapter.ts`, `TelegramPlatformProvider.tsx`) + وصل به دکمه‌ی Favorite در `FormulaDetail` (آینه‌ی دکمه‌ی موجود، نه جایگزینش) |

### تصمیمات کلیدی مرحله دوم (باید حفظ بشن)

12. **`hapticsEnabled` (تنظیم جدید در `SettingsState`):** پیش‌فرض `true`. کاربر قدیمی خودکار این مقدار رو می‌گیره چون `loadState()` از قبل settings رو shallow-merge می‌کنه. **هر ۶ نقطه‌ی haptic** (۲ تا در `Key`/`kit.tsx`، ۴ تا در `CalculatorPage.tsx`) به این فلگ گیت شدن — اگه هاپتیک جدیدی جای دیگه‌ای اضافه شد، باید همینجوری گیت بشه.

13. **الگوی «دو Effect جدا» برای هر دکمه‌ی Telegram (Back/Main):** چون `PlatformAdapter` توی یه `useMemo` واحد ساخته می‌شه (تصمیم ۸)، هر آبجکت زیرمجموعه (`backButton`, `mainButton`, ...) رفرنس جدید می‌گیره با هر تغییر سیگنال بی‌ربط. برای `MainButton` در `FormulaDetail`، این‌بار یه قدم جلوتر رفتیم: به‌جای وابسته‌کردن effect به کل `platform.mainButton`، فقط پرایمیتیو `platform.mainButton.isSupported` (بولین، پایدار) رو dependency گذاشتیم — effect دیگه به‌خاطر تغییرات بی‌ربط دوباره اجرا نمی‌شه. (نسخه‌ی Back Button در AppShell هنوز به شکل قبلی‌شه — کار می‌کنه، فقط کمی کمتر بهینه‌ست؛ عمداً دست‌نخورده موند چون از قبل تست‌شده بود.)

14. **چرا Share «متن»ه، نه «لینک»:** برای ساختن یه لینک واقعی `t.me/<bot>/<app>?startapp=...`، باید username بات و short name اپ رو از جایی بدونیم — که هیچ‌کدوم به کلاینت (فرانت‌اند) داده نمی‌شن. اگه در آینده خواستی share واقعاً یه لینک قابل‌بازگشایی مجدد اپ باشه، باید این دو مقدار رو (مثلاً از طریق یه فایل config ساده) به پروژه اضافه کنی.

15. **`IconBtn` علاقه‌مندی در `FormulaDetail` و `MainButton` هردو به یه `toggleFav` مشترک وصلن** — قبلاً منطق داخل `onClick` دکمه تکرار شده بود، یکی‌شون کردیم؛ رفتار عوض نشده، فقط منبع واحد شد.

16. **سیستم مرکزی Share (`core/sharing/`):** به‌جای پیاده‌سازی جدا در هر صفحه (که قبلاً همین‌جوری بود — Calculator و Formula هرکدوم یه نسخه‌ی تقریباً یکسان از منطق Web Share/Clipboard داشتن)، حالا یه `useShareService()` واحد وجود داره که Calculator/Formula/Converter هرسه ازش استفاده می‌کنن. قرارداد داده (`ShareData`) ساختاریافته‌ست (نه رشته‌ی آماده) تا فرمت‌بندی همیشه یک‌جا (`share-formatter.ts`) و بر اساس i18n انجام بشه.
    - **اولویت استراتژی:** Telegram (`shareURL`، فقط وقتی `deepLink` موجود باشه) → Web Share API → Clipboard. **هیچ صفحه‌ای مستقیم `navigator.share` یا SDK تلگرام صدا نمی‌زنه.**
    - **چرا Telegram فعلاً معمولاً به Web Share می‌افته:** ~~`shareURL` تلگرام نیاز به یه URL واقعی داره...~~ **به‌روز شد:** بات ساخته شد (`@MathEngineANBot`) و Mini App هم ثبت شد (short name: `mathengine`). `platform/telegram/config.ts` حالا لینک واقعی می‌سازه: `https://t.me/MathEngineANBot/mathengine?startapp=<expr-encoded>`. Calculator از این لینک برای `shareURL` واقعی استفاده می‌کنه — یعنی Share داخل تلگرام الان واقعاً از پیکر چت خودِ تلگرام استفاده می‌کنه، نه فقط Web Share. Formula/Converter هنوز به deep link وصل نشدن (نیاز به طراحی جدا دارن، خارج از scope کار قبلی).
    - آدرس واقعی وب‌اپ منتشرشده هم از همین مکالمه معلوم شد: `https://math-engine.pages.dev`.
    - **باگ واقعی که موقع نوشتن گرفتم و رفع کردم:** گارد ضد دوبار-تپ اولش با `state` نوشته شده بود که در برابر دو تپ خیلی سریع (قبل از commit شدن state) مصون نبود؛ با یه `ref` جایگزین شد.
    - **باگ واقعی دوم:** در Calculator، بعد از `commit()`، متغیر `expr` به خودِ نتیجه overwrite می‌شه (برای زنجیره‌کردن محاسبات). اگه مستقیم از `expr` برای Share استفاده می‌شد، عبارت اصلی گم می‌شد و «نتیجه = نتیجه» نمایش داده می‌شد. با یه `ref` (`lastEvaluated`) که دقیقاً لحظه‌ی commit مقداردهی می‌شه، حل شد.

### وضعیت مرحله سوم (🟢)

| # | مورد | وضعیت |
|---|---|---|
| ۱۸ | Formula sharing | ✅ همون الگوی Share Calculator، در `FormulaDetail` |
| ۱۹ | Saved calculations sync | ✅ `favFormulas`/`favConverters` به بک‌آپ CloudStorage اضافه شدن (کنار `settings`، همون effect) |
| ۲۰ | AI | 🛑 **عمداً اجرا نشد** — هم طبق لیست «فعلاً اضافه نمی‌کنم» خودِ سند اولیه، هم چون نیازمند بک‌اندیه که این پروژه ندارد (کلید API هرگز نباید در فرانت‌اند باشد) |
| ۲۱ | Bot integration | 🛑 عمداً اجرا نشد — نیازمند سرور جدا، بیرون از scope این کدبیس (SPA) |
| ۲۲ | امکانات اجتماعی/اشتراک‌گذاری پیشرفته | 🛑 عمداً اجرا نشد — هم مبهم، هم در لیست «فعلاً نه»ی سند اولیه |

اگه AI یا Bot integration در آینده جدی شد، اول باید یه پروژه‌ی بک‌اند جدا طراحی بشه — این یه تصمیم معماری بزرگه که باید آگاهانه و جدا باز بشه، نه ادامه‌ی طبیعی همین Platform Layer.

---

## ۱۵. قوانین همکاری آینده (از پرامپت اصلی آنبوردینگ)

- قبل از تغییر، فایل مربوطه رو واقعاً بخون.
- قبل از refactor، وابستگی‌ها و مصرف‌کننده‌هاش رو بررسی کن.
- قبل از حذف چیزی، توی کل ریپو usage‌ش رو جست‌وجو کن.
- قبل از تغییر CSS، همه‌ی کامپوننت‌هایی که ازش استفاده می‌کنن رو ببین.
- قبل از تغییر parser، تست‌های ریاضی و رفتار calculator وابسته رو بررسی کن.
- ظاهر بصری موجود رو بدون دستور صریح تغییر نده.
- منطق تکراری نساز.
- ساده‌ترین راه‌حل قابل‌اعتماد رو به پیچیده‌تر ترجیح بده.
- اگه چیزی رو نمی‌دونی، صریح بگو — هرگز حدس نزن.
