import { chromium } from "playwright-core";

export interface ScrapedPage {
  url: string;
  title: string;
  headings: { level: number; text: string }[];
  bodyText: string[];
  buttons: string[];
  navItems: string[];
  formFields: {
    type: string;
    name: string | null;
    id: string | null;
    placeholder: string | null;
    label: string | null;
  }[];
  links: { text: string; href: string }[];
  meta: { description: string | null; keywords: string | null };
}

async function getLaunchOptions(): Promise<{ executablePath: string; args: string[] }> {
  if (process.env.VERCEL) {
    // @sparticuz/chromium bundles a Linux x86_64 binary for serverless environments.
    const sparticuz = await import("@sparticuz/chromium");
    return {
      executablePath: await sparticuz.default.executablePath(),
      args: sparticuz.default.args,
    };
  }
  // Local dev: use CHROMIUM_PATH override or playwright-core's managed chromium.
  // Run `npx playwright install chromium` once if the managed binary is missing.
  return {
    executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
    args: [],
  };
}

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const { executablePath, args } = await getLaunchOptions();
  const browser = await chromium.launch({ executablePath, args, headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const result = await page.evaluate(() => {
      const isVisible = (el: Element): boolean => {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
      };

      const getText = (el: Element) =>
        ((el as HTMLElement).innerText ?? el.textContent ?? "").trim().replace(/\s+/g, " ");

      // Title
      const title = document.title;

      // Headings
      const headings: { level: number; text: string }[] = [];
      document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((el) => {
        if (isVisible(el)) {
          const level = parseInt(el.tagName[1]);
          const text = getText(el);
          if (text) headings.push({ level, text });
        }
      });

      // Body text (paragraphs, list items, spans with meaningful text)
      const bodyText: string[] = [];
      document.querySelectorAll("p, li, td, th, blockquote, figcaption").forEach((el) => {
        if (isVisible(el)) {
          const text = getText(el);
          if (text.length > 5) bodyText.push(text);
        }
      });

      // Buttons
      const buttons: string[] = [];
      document.querySelectorAll("button, [role='button'], input[type='submit'], input[type='button']").forEach((el) => {
        if (isVisible(el)) {
          const text =
            getText(el) ||
            (el as HTMLInputElement).value ||
            el.getAttribute("aria-label") ||
            "";
          if (text) buttons.push(text.trim().slice(0, 150));
        }
      });

      // Nav items
      const navItems: string[] = [];
      document.querySelectorAll("nav a, [role='navigation'] a, header a").forEach((el) => {
        if (isVisible(el)) {
          const text = getText(el);
          if (text) navItems.push(text);
        }
      });

      // Form fields — find associated label text
      const formFields: {
        type: string;
        name: string | null;
        id: string | null;
        placeholder: string | null;
        label: string | null;
      }[] = [];

      document
        .querySelectorAll(
          "input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select"
        )
        .forEach((el) => {
          if (!isVisible(el)) return;
          const input = el as HTMLInputElement;
          let label: string | null = null;

          if (input.id) {
            const labelEl = document.querySelector(`label[for="${input.id}"]`);
            if (labelEl) label = getText(labelEl);
          }
          if (!label) {
            const parentLabel = input.closest("label");
            if (parentLabel) label = getText(parentLabel);
          }
          if (!label) {
            label =
              input.getAttribute("aria-label") ||
              input.getAttribute("aria-labelledby")
                ? getText(
                    document.getElementById(
                      input.getAttribute("aria-labelledby")!
                    ) ?? document.createElement("span")
                  )
                : null;
          }

          formFields.push({
            type: input.type || el.tagName.toLowerCase(),
            name: input.name || null,
            id: input.id || null,
            placeholder: input.placeholder || null,
            label,
          });
        });

      // Links
      const links: { text: string; href: string }[] = [];
      document.querySelectorAll("a[href]").forEach((el) => {
        if (isVisible(el)) {
          const text = getText(el);
          const href = (el as HTMLAnchorElement).href;
          if (text && href && !href.startsWith("javascript:")) {
            links.push({ text, href });
          }
        }
      });

      // Meta
      const metaDesc = document.querySelector('meta[name="description"]');
      const metaKw = document.querySelector('meta[name="keywords"]');

      return {
        title,
        headings,
        bodyText: [...new Set(bodyText)],
        buttons: [...new Set(buttons)],
        navItems: [...new Set(navItems)],
        formFields,
        links,
        meta: {
          description: metaDesc?.getAttribute("content") ?? null,
          keywords: metaKw?.getAttribute("content") ?? null,
        },
      };
    });

    return { url, ...result };
  } finally {
    await browser.close();
  }
}
