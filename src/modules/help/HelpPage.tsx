/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — modules/help
   The one and only Help Center. No scattered tooltips.
   ═══════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { ChevronDown, Rocket, Calculator, SquareFunction, ArrowLeftRight, LayoutGrid, CircleHelp, Keyboard, Lightbulb, LifeBuoy } from 'lucide-react';
import { useT, useLang } from '../../core/i18n';
import { Page, PageHeader, Card } from '../../ui/kit';

interface HelpSection {
  id: string;
  icon: typeof Rocket;
  titleKey: Parameters<ReturnType<typeof useT>>[0];
  fa: string[];
  en: string[];
}

const SECTIONS: HelpSection[] = [
  {
    id: 'start',
    icon: Rocket,
    titleKey: 'help.gettingStarted',
    fa: [
      'Math Engine یک فضای کاری ریاضی است که کاملاً آفلاین کار می‌کند؛ بدون حساب کاربری و بدون ردیابی.',
      'از صفحه «خانه» با دسترسی سریع شروع کنید یا مستقیم به ماشین‌حساب بروید.',
      'هر ابزار حداکثر با دو لمس در دسترس است: خانه، ماشین‌حساب، فرمول‌ها، مبدل واحد و میزکار.',
      'با دکمه «حالت تمرکز» همه عناصر اضافه مخفی می‌شوند و فقط ابزار فعال می‌ماند.',
    ],
    en: [
      'Math Engine is a mathematical workspace that works fully offline — no account, no tracking.',
      'Start from Home with Quick Actions, or jump straight into the Calculator.',
      'Every tool is at most two taps away: Home, Calculator, Formulas, Converter, Workspace.',
      'Use Focus Mode to hide everything except the active tool.',
    ],
  },
  {
    id: 'calc',
    icon: Calculator,
    titleKey: 'help.calcGuide',
    fa: [
      'ماشین‌حساب همیشه آماده تایپ است؛ نتیجه به‌صورت زنده هنگام نوشتن نمایش داده می‌شود.',
      'با دکمه «علمی» پنل توابع باز می‌شود: مثلثاتی، لگاریتم، رادیکال، توان، فاکتوریل و ثابت‌ها.',
      'کلیدهای M+ / M- / MR / MC حافظه را مدیریت می‌کنند. Ans پاسخ قبلی را وارد می‌کند.',
      'صفحه‌کلید فیزیکی هم کار می‌کند: اعداد، عملگرها، Enter برای نتیجه، Backspace و Escape.',
      'بین حالت درجه (DEG) و رادیان (RAD) با دکمه بالای نمایشگر جابه‌جا شوید.',
      'تاریخچه محاسبات در همان صفحه است؛ روی هر مورد بزنید تا دوباره استفاده شود.',
    ],
    en: [
      'The calculator is always ready to type; results appear live as you write.',
      'Open the Scientific panel for trig, logarithms, roots, powers, factorials and constants.',
      'M+ / M- / MR / MC manage memory. Ans inserts the previous answer.',
      'Physical keyboard works too: digits, operators, Enter for result, Backspace and Escape.',
      'Switch between DEG and RAD with the toggle above the display.',
      'Calculation history lives on the same page — tap any entry to reuse it.',
    ],
  },
  {
    id: 'formula',
    icon: SquareFunction,
    titleKey: 'help.formulaGuide',
    fa: [
      'کتابخانه فرمول شامل هندسه، جبر، مثلثات، فیزیک، مالی و آمار است.',
      'فرمول را باز کنید، مقادیر متغیرها را وارد کنید؛ نتیجه به‌صورت زنده محاسبه می‌شود.',
      'با ستاره به علاقه‌مندی‌ها و با سنجاق به میزکار اضافه کنید.',
      'با «سازنده فرمول» فرمول خودتان را بسازید: عبارت را بنویسید، متغیرها خودکار شناسایی می‌شوند.',
      'با «ارسال به ماشین‌حساب» عبارت با مقادیر جایگذاری‌شده به ماشین‌حساب می‌رود.',
    ],
    en: [
      'The Formula Library covers geometry, algebra, trigonometry, physics, finance and statistics.',
      'Open a formula, enter variable values — the result computes live.',
      'Star to favorites, pin to your Workspace.',
      'Use Formula Builder to create your own: write an expression, variables are auto-detected.',
      '“Send to Calculator” moves the expression with values substituted into the calculator.',
    ],
  },
  {
    id: 'converter',
    icon: ArrowLeftRight,
    titleKey: 'help.converterGuide',
    fa: [
      '۱۲ دسته تبدیل: طول، جرم، دما، مساحت، حجم، سرعت، زمان، داده، فشار، انرژی، زاویه و توان.',
      'مقدار را وارد کنید؛ نتیجه بلافاصله نمایش داده می‌شود. با دکمه وسط، واحدها جابه‌جا می‌شوند.',
      'زیر نتیجه، نرخ واحد (۱ واحد = X واحد دیگر) همیشه دیده می‌شود.',
      'تبدیل‌های پرکاربرد را ستاره‌دار کنید تا در بخش علاقه‌مندی‌ها بمانند.',
      'با «سازنده واحد» واحد سفارشی بسازید: نام + ضریب نسبت به واحد پایه.',
    ],
    en: [
      '12 categories: length, mass, temperature, area, volume, speed, time, data, pressure, energy, angle and power.',
      'Enter a value — the result appears instantly. The middle button swaps units.',
      'The unit rate (1 unit = X other) is always visible below the result.',
      'Star frequent conversions to keep them in Favorites.',
      'Use Unit Builder for custom units: a name plus a factor relative to the base unit.',
    ],
  },
  {
    id: 'workspace',
    icon: LayoutGrid,
    titleKey: 'help.workspaceGuide',
    fa: [
      'میزکار مرکز فعالیت‌های شماست: علاقه‌مندی‌ها، سنجاق‌شده‌ها، حافظه ماشین‌حساب، فرمول‌ها و واحدهای سفارشی.',
      'خط زمانی، همه محاسبات، فرمول‌ها و تبدیل‌های اخیر را یکجا نشان می‌دهد.',
      'برای سنجاق کردن یک فرمول، در صفحه جزئیات آن روی آیکون سنجاق بزنید.',
    ],
    en: [
      'Workspace is your activity hub: favorites, pinned items, calculator memory, custom formulas and units.',
      'The Timeline shows all recent calculations, formulas and conversions in one place.',
      'To pin a formula, tap the pin icon on its detail page.',
    ],
  },
  {
    id: 'faq',
    icon: CircleHelp,
    titleKey: 'help.faq',
    fa: [
      'آیا اطلاعات من جایی ارسال می‌شود؟ — خیر. همه‌چیز روی دستگاه شما می‌ماند.',
      'آیا بدون اینترنت کار می‌کند؟ — بله، Math Engine کاملاً آفلاین است.',
      'داده‌هایم را چگونه منتقل کنم؟ — از تنظیمات ← پشتیبان‌گیری، خروجی بگیرید و روی دستگاه دیگر بازیابی کنید.',
      'حالت تمرکز چیست؟ — حذف همه عناصر اضافه برای تمرکز کامل روی مسئله.',
    ],
    en: [
      'Is my data sent anywhere? — No. Everything stays on your device.',
      'Does it work offline? — Yes, Math Engine is fully offline.',
      'How do I move my data? — Settings → Backup: export, then import on another device.',
      'What is Focus Mode? — It removes every distraction so you focus on the problem.',
    ],
  },
  {
    id: 'shortcuts',
    icon: Keyboard,
    titleKey: 'help.shortcuts',
    fa: [
      'Ctrl / Cmd + K — جستجوی سراسری',
      'Enter — محاسبه نتیجه',
      'Backspace — حذف آخرین ورودی',
      'Escape — پاک کردن عبارت',
      'اعداد و عملگرهای صفحه‌کلید — ورود مستقیم در ماشین‌حساب',
    ],
    en: [
      'Ctrl / Cmd + K — Global search',
      'Enter — Evaluate',
      'Backspace — Delete last input',
      'Escape — Clear expression',
      'Keyboard digits & operators — direct calculator input',
    ],
  },
  {
    id: 'tips',
    icon: Lightbulb,
    titleKey: 'help.tips',
    fa: [
      'از Ans برای زنجیره‌کردن محاسبات استفاده کنید: نتیجه قبلی در محاسبه بعدی.',
      'در ماشین‌حساب، ضرب ضمنی پشتیبانی می‌شود: 2π یا 3(4+5).',
      'برای درصد، کافی است بنویسید: 200*15% — نتیجه ۳۰.',
      'فرمول‌های سفارشی خود را بسازید تا محاسبات تکراری‌تان یک‌لمسی شوند.',
      'نسخه پشتیبان را هر چند وقت یک بار دانلود کنید.',
    ],
    en: [
      'Use Ans to chain calculations — the previous answer feeds the next one.',
      'Implicit multiplication works: 2π or 3(4+5).',
      'For percentages just write: 200*15% — result is 30.',
      'Build custom formulas to make repetitive calculations one-tap.',
      'Download a backup every once in a while.',
    ],
  },
];

export default function HelpPage() {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState<string | null>('start');

  return (
    <Page>
      <PageHeader title={t('help.title')} />
      <div className="flex flex-col gap-2.5">
        {SECTIONS.map((sec) => {
          const isOpen = open === sec.id;
          return (
            <Card key={sec.id} className="overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : sec.id)}
                className="press focus-ring flex w-full items-center gap-3.5 px-5 py-4 text-start"
                aria-expanded={isOpen}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(153,204,51,0.1)] text-[var(--accent-primary)]">
                  <sec.icon size={18} />
                </span>
                <span className="flex-1 text-[15px] font-semibold">{t(sec.titleKey)}</span>
                <ChevronDown
                  size={17}
                  className="shrink-0 text-[var(--text-tertiary)] transition-transform"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transitionDuration: 'var(--dur-med)', transitionTimingFunction: 'var(--ease)' }}
                />
              </button>
              {isOpen && (
                <div className="border-t border-[var(--border-subtle)] px-5 py-4" style={{ animation: 'fadeUp var(--dur-med) var(--ease)' }}>
                  <ul className="flex flex-col gap-2.5">
                    {sec[lang].map((line, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-secondary)]">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <footer className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[var(--text-tertiary)]">
        <LifeBuoy size={12} />
        Math Engine v1.0.0
      </footer>
    </Page>
  );
}
