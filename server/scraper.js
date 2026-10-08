/**
 * LinkedIn Easy Apply Job Listing Scraper
 * Extracts 50 to 100+ Easy Apply jobs across search result pages via Playwright CDP
 */

export async function scrapeEasyApplyJobs(page, query = "Senior Frontend Engineer", location = "Bengaluru, Karnataka, India", maxJobs = 100) {
  const encodedQuery = encodeURIComponent(query);
  const encodedLoc = encodeURIComponent(location);
  const results = [];
  const seenIds = new Set();

  try {
    const maxPages = Math.ceil(maxJobs / 25);

    for (let pageNum = 0; pageNum < maxPages && results.length < maxJobs; pageNum++) {
      if (page.isClosed()) break;

      const startOffset = pageNum * 25;
      const targetUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}&location=${encodedLoc}&f_AL=true&sortBy=DD&start=${startOffset}`;

      // Navigate to search page (or offset)
      const currentUrl = page.url();
      if (!currentUrl.includes(`start=${startOffset}`) && (!currentUrl.includes('keywords=') || pageNum > 0)) {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }

      if (page.isClosed()) break;

      // Wait for job links, then scroll the results list (LinkedIn only renders
      // cards that have been scrolled into view)
      await page.waitForSelector('a[href*="/jobs/view/"], [data-occludable-job-id], [data-job-id]', { timeout: 15000 }).catch(() => {});
      await page.evaluate(async () => {
        const first = document.querySelector('[data-occludable-job-id], [data-job-id], a[href*="/jobs/view/"]');
        let scroller = first?.parentElement;
        while (scroller && scroller !== document.body) {
          const st = getComputedStyle(scroller);
          if (/(auto|scroll)/.test(st.overflowY) && scroller.scrollHeight > scroller.clientHeight + 50) break;
          scroller = scroller.parentElement;
        }
        const target = scroller && scroller !== document.body ? scroller : null;
        for (let s = 0; s < 12; s++) {
          if (target) target.scrollBy(0, 600); else window.scrollBy(0, 600);
          await new Promise(r => setTimeout(r, 300));
        }
      }).catch(() => {});
      await page.waitForTimeout(800);

      // Each job card is identified by its /jobs/view/<id> link (stable across
      // LinkedIn redesigns); title/company/location come from the card's text.
      const pageCards = await page.evaluate((pageNumOffset) => {
        const seen = new Set();
        const out = [];
        const links = Array.from(document.querySelectorAll('a[href*="/jobs/view/"]'));
        links.forEach((link, idx) => {
          const href = link.getAttribute('href') || '';
          const idMatch = href.match(/\/jobs\/view\/(?:[^/?]*?-)?(\d{6,})/);
          if (!idMatch || seen.has(idMatch[1])) return;
          const card = link.closest('[data-occludable-job-id], [data-job-id], li, .job-card-container, .base-card') || link.parentElement;
          const lines = (card?.innerText || '').split('\n').map(t => t.trim()).filter(Boolean)
            .filter(t => !/^(promoted|easy apply|actively recruiting|viewed|be an early applicant|\d+ (applicants?|connections?)|.*alumni.*|.*school.*|.*ago)$/i.test(t));
          const title = (link.getAttribute('aria-label') || link.innerText || lines[0] || '').split('\n')[0].replace(/\s+with verification$/i, '').trim();
          const rest = lines.filter(t => t !== title && !title.startsWith(t));
          const companyEl = card?.querySelector('.artdeco-entity-lockup__subtitle, .job-card-container__primary-description, .base-search-card__subtitle, h4');
          const locationEl = card?.querySelector('.job-card-container__metadata-wrapper li, .job-card-container__metadata-item, .job-search-card__location, .artdeco-entity-lockup__caption');
          const company = companyEl?.innerText?.trim() || rest[0] || '';
          const location = locationEl?.innerText?.trim()?.split('\n')[0] || rest[1] || '';
          if (!title || !company) return;
          seen.add(idMatch[1]);
          out.push({
            id: idMatch[1],
            title,
            company,
            location,
            url: `https://www.linkedin.com/jobs/view/${idMatch[1]}/`,
            cardIndex: idx,
            pageNumber: pageNumOffset + 1,
            easyApply: /easy apply/i.test(card?.innerText || '') || true,
          });
        });
        return out;
      }, pageNum);

      let newFound = 0;
      for (const card of pageCards) {
        if (!seenIds.has(card.id) && results.length < maxJobs) {
          seenIds.add(card.id);
          newFound++;
          results.push({
            ...card,
            stepsTotal: 3,
            stepsCompleted: 0
          });
        }
      }

      console.log(`[Scraper] Page ${pageNum + 1}: Found ${pageCards.length} cards (${newFound} new). Total collected: ${results.length}`);

      // If no new cards were found on this page, stop paginating
      if (newFound === 0) break;
    }

    return results;
  } catch (err) {
    console.error('[Scraper] Error during scraping:', err);
    return results;
  }
}
