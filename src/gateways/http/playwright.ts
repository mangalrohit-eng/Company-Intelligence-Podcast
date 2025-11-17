/**
 * Playwright HTTP Gateway - real browser-based scraping
 */

import { chromium, Browser, Page } from 'playwright';
import { IHttpGateway, HttpRequest, HttpResponse } from '../types';
import { logger } from '@/utils/logger';

export class PlaywrightHttpGateway implements IHttpGateway {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  }

  async fetch(request: HttpRequest): Promise<HttpResponse> {
    await this.initialize();

    const startTime = Date.now();
    const page: Page = await this.browser!.newPage();

    try {
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (compatible; PodcastBot/1.0; +https://example.com/bot)'
      });

      const response = await page.goto(request.url, {
        timeout: request.timeout || 30000,
        waitUntil: 'networkidle',  // Wait for all network requests to finish (includes redirects)
      });

      if (!response) {
        throw new Error(`No response received for ${request.url}`);
      }

      // For Google News redirects, wait a bit more for any JS redirects
      if (request.url.includes('news.google.com')) {
        await page.waitForTimeout(2000);  // 2 second delay for JS redirects
      }

      const body = await page.content();
      const finalUrl = page.url();  // Get URL after any redirects
      
      logger.debug('Playwright page loaded', {
        originalUrl: request.url,
        finalUrl,
        redirected: finalUrl !== request.url,
      });
      const headers: Record<string, string> = {};
      const responseHeaders = response.headers();
      for (const [key, value] of Object.entries(responseHeaders)) {
        headers[key] = value;
      }

      const latencyMs = Date.now() - startTime;

      logger.debug('Playwright fetch successful', {
        url: request.url,
        finalUrl,
        status: response.status(),
        latencyMs,
        bodyLength: body.length,
      });

      return {
        url: finalUrl,  // Return final URL after all redirects
        status: response.status(),
        headers,
        body,
        latencyMs,
      };
    } catch (error) {
      logger.error('Playwright fetch failed', { url: request.url, error });
      throw error;
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

