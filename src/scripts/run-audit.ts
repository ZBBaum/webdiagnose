import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { scrapePage } from "../lib/scraper";
import { auditPage } from "../lib/auditor";

const TEST_URL = process.argv[2] ?? "https://stripe.com";

(async () => {
  console.log(`Scraping: ${TEST_URL}`);
  const scraped = await scrapePage(TEST_URL);

  console.log("Running CRO audit...\n");
  const audit = await auditPage(scraped);

  console.log(JSON.stringify(audit, null, 2));
})();
