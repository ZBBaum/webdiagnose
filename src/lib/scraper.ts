import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

export interface ElementMapEntry {
  text: string;
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  screenshotBase64: string | null;
  elementMap: ElementMapEntry[];
}

const CHROMIUM_REMOTE_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar";

const STEALTH_ARGS = ["--disable-blink-features=AutomationControlled"];

const BOT_DETECTION_PHRASES = [
  "captcha",
  "are you a robot",
  "verify you are human",
  "cloudflare",
  "access denied",
];

async function getLaunchOptions() {
  if (process.env.VERCEL) {
    return {
      args: [...chromium.args, ...STEALTH_ARGS],
      executablePath: await chromium.executablePath(CHROMIUM_REMOTE_URL),
      headless: true,
    };
  }
  return {
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: STEALTH_ARGS,
    headless: true,
    defaultViewport: null,
  };
}

export interface DiscoveredPage {
  url: string;
  title: string;
}

function extractSiteName(homeTitle: string): string {
  for (const sep of [" | ", " – ", " — ", " - "]) {
    const idx = homeTitle.lastIndexOf(sep);
    if (idx > 0) return homeTitle.slice(idx + sep.length).trim();
  }
  return homeTitle.trim();
}

function stripSiteName(raw: string, siteName: string): string {
  let t = raw.trim();
  if (!t || !siteName) return t;
  for (const sep of [" | ", " – ", " — ", " - "]) {
    const suffix = sep + siteName;
    if (t.endsWith(suffix)) return t.slice(0, t.length - suffix.length).trim();
  }
  return t;
}

function pathToTitle(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";
  const last = segments[segments.length - 1];
  return last
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function discoverLinks(homeUrl: string): Promise<DiscoveredPage[]> {
  const normalised = homeUrl.startsWith("http") ? homeUrl : `https://${homeUrl}`;
  let homeHostname: string;
  try {
    homeHostname = new URL(normalised).hostname;
  } catch {
    return [{ url: normalised, title: "Home" }];
  }

  const options = await getLaunchOptions();
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto(normalised, { waitUntil: "networkidle2", timeout: 30000 });

    const { pageTitle, links } = await page.evaluate(() => {
      const pageTitle = document.title ?? "";
      const links = Array.from(document.querySelectorAll("a[href]")).map((el) => ({
        href: (el as HTMLAnchorElement).href,
        // Take just the first line of the anchor text (avoid multiline nav items)
        text: ((el as HTMLElement).innerText ?? el.textContent ?? "")
          .split("\n")[0]
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 120),
      }));
      return { pageTitle, links };
    });

    const siteName = extractSiteName(pageTitle);
    const homeTitle = stripSiteName(pageTitle, siteName) || "Home";

    const homePath = new URL(normalised).pathname.replace(/\/$/, "") || "/";
    const seen = new Set<string>([homePath]);
    const result: DiscoveredPage[] = [{ url: normalised, title: homeTitle }];

    for (const { href, text } of links) {
      try {
        const parsed = new URL(href);
        if (parsed.hostname !== homeHostname) continue;
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
        const pathKey = parsed.pathname.replace(/\/$/, "") || "/";
        if (seen.has(pathKey)) continue;
        if (pathKey === homePath && parsed.hash) continue;
        seen.add(pathKey);

        // Use link text if it's a meaningful label; otherwise derive from path
        const cleanText = text.replace(/[^\w\s'"-]/g, "").trim();
        const title = cleanText.length >= 2 ? cleanText : pathToTitle(pathKey);

        const clean = `${parsed.origin}${parsed.pathname}`;
        result.push({ url: clean, title });
        if (result.length >= 20) break;
      } catch {
        // skip malformed URLs
      }
    }

    return result;
  } finally {
    await browser.close();
  }
}

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const t0 = Date.now();
  const options = await getLaunchOptions();
  const browser = await puppeteer.launch(options);
  console.log(`[scraper] browser launch: ${Date.now() - t0}ms`);
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`[scraper] page.goto: ${Date.now() - t0}ms`);

    const pageText = await page.evaluate(
      () => document.body?.innerText?.toLowerCase() ?? ""
    );
    const botPhrase = BOT_DETECTION_PHRASES.find((phrase) =>
      pageText.includes(phrase)
    );
    if (botPhrase) {
      throw new Error(
        "This website uses bot protection and cannot be audited automatically. Try a different URL."
      );
    }

    const result = await page.evaluate(() => {
      const isVisible = (el: Element): boolean => {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
      };

      const getText = (el: Element) =>
        ((el as HTMLElement).innerText ?? el.textContent ?? "").trim().replace(/\s+/g, " ");

      const title = document.title;

      const headings: { level: number; text: string }[] = [];
      document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((el) => {
        if (isVisible(el)) {
          const level = parseInt(el.tagName[1]);
          const text = getText(el);
          if (text) headings.push({ level, text });
        }
      });

      const bodyText: string[] = [];
      document.querySelectorAll("p, li, td, th, blockquote, figcaption").forEach((el) => {
        if (isVisible(el)) {
          const text = getText(el);
          if (text.length > 5) bodyText.push(text);
        }
      });

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

      const navItems: string[] = [];
      document.querySelectorAll("nav a, [role='navigation'] a, header a").forEach((el) => {
        if (isVisible(el)) {
          const text = getText(el);
          if (text) navItems.push(text);
        }
      });

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
              (input.getAttribute("aria-labelledby")
                ? getText(
                    document.getElementById(
                      input.getAttribute("aria-labelledby")!
                    ) ?? document.createElement("span")
                  )
                : null);
          }

          formFields.push({
            type: input.type || el.tagName.toLowerCase(),
            name: input.name || null,
            id: input.id || null,
            placeholder: input.placeholder || null,
            label,
          });
        });

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

    console.log(`[scraper] DOM scrape: ${Date.now() - t0}ms`);
    // Cap page height to avoid Claude token limits, then screenshot
    let screenshotBase64: string | null = null;
    let elementMap: ElementMapEntry[] = [];
    try {
      await page.evaluate(() => {
        document.body.style.maxHeight = "10000px";
        document.body.style.overflow = "hidden";
        document.documentElement.style.maxHeight = "10000px";
        document.documentElement.style.overflow = "hidden";
      });

      // Extract element map after CSS cap so positions match screenshot dimensions
      try {
        elementMap = await page.evaluate((): { text: string; tag: string; x: number; y: number; width: number; height: number }[] => {
          const pageW = document.documentElement.scrollWidth;
          const pageH = Math.min(document.documentElement.scrollHeight, 10000);
          if (pageW === 0 || pageH === 0) return [];

          const getText = (el: Element): string => {
            const t = ((el as HTMLElement).innerText ?? el.textContent ?? "").trim().replace(/\s+/g, " ");
            if (t) return t;
            return el.getAttribute("alt") ?? el.getAttribute("aria-label") ?? el.getAttribute("placeholder") ?? "";
          };

          const TAG_SELECTORS = 'h1,h2,h3,h4,button,[role="button"],a[href],input:not([type="hidden"]),textarea,select,label,img[alt],[class*="cta"],[class*="btn"],[class*="hero"],[class*="badge"]';
          const seen = new Set<string>();
          const entries: { text: string; tag: string; x: number; y: number; width: number; height: number }[] = [];

          document.querySelectorAll(TAG_SELECTORS).forEach((el) => {
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            if (rect.top >= pageH || rect.bottom <= 0) return;

            const text = getText(el).slice(0, 150);
            if (!text) return;

            const key = `${el.tagName.toLowerCase()}|${text}`;
            if (seen.has(key)) return;
            seen.add(key);

            entries.push({
              text,
              tag: el.tagName.toLowerCase(),
              x: Math.round((rect.left / pageW) * 10000) / 100,
              y: Math.round((rect.top / pageH) * 10000) / 100,
              width: Math.round((rect.width / pageW) * 10000) / 100,
              height: Math.round((rect.height / pageH) * 10000) / 100,
            });
          });

          return entries.slice(0, 120);
        });
        console.log(`[scraper] element map: ${elementMap.length} entries (${Date.now() - t0}ms)`);
      } catch (mapErr) {
        console.warn("[scraper] element map extraction failed:", mapErr instanceof Error ? mapErr.message : mapErr);
      }

      const rawBuf = await page.screenshot({ fullPage: true, type: "png" });
      const compressed = await sharp(rawBuf)
        .resize({ width: 1280, withoutEnlargement: true })
        .jpeg({ quality: 65 })
        .toBuffer();
      screenshotBase64 = compressed.toString("base64");
      console.log(`[scraper] screenshot: ${Math.round(screenshotBase64.length / 1024)}KB (${Date.now() - t0}ms)`);
    } catch (err) {
      console.warn("[scraper] screenshot failed:", err instanceof Error ? err.message : err);
    }

    return { url, ...result, screenshotBase64, elementMap };
  } finally {
    await browser.close();
  }
}
