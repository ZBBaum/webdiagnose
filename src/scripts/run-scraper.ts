import { scrapePage } from "../lib/scraper";

const TEST_URL = process.argv[2] ?? "https://example.com";

(async () => {
  console.log(`Scraping: ${TEST_URL}\n`);
  const result = await scrapePage(TEST_URL);
  console.log(JSON.stringify(result, null, 2));
})();
