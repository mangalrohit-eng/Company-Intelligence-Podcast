/**
 * Playwright HTTP Gateway - real browser-based scraping with stealth mode
 * Uses Playwright with stealth techniques to avoid detection
 * Automatically uses playwright-aws-lambda in Lambda environments
 */

// Don't import playwright at top level - it's not available in Lambda
// We'll dynamically import it based on environment
import { IHttpGateway, HttpRequest, HttpResponse } from '../types';
import { logger } from '@/utils/logger';

// Type definitions for Playwright (used for type checking)
type Browser = any;
type Page = any;
type BrowserContext = any;

export class PlaywrightHttpGateway implements IHttpGateway {
  private browser: Browser | null = null;
  private isLambda: boolean;

  constructor() {
    this.isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      if (this.isLambda) {
        // Use playwright-aws-lambda for Lambda environment
        try {
          // playwright-aws-lambda is a CommonJS package that exports launchChromium
          // After bundling, we need to handle both CommonJS and ES module import styles
          let launchChromium: any;
          let importMethod = 'unknown';
          
          // Method 1: Try direct require (works in CommonJS contexts and after bundling)
          try {
            // Use Function constructor to avoid bundler transforming require
            const requireFunc = new Function('moduleName', 'return require(moduleName)');
            const playwrightAws = requireFunc('playwright-aws-lambda');
            
            if (playwrightAws && typeof playwrightAws.launchChromium === 'function') {
              launchChromium = playwrightAws.launchChromium;
              importMethod = 'require (Function constructor)';
              logger.info('playwright-aws-lambda imported via require', {
                method: importMethod,
                hasLaunchChromium: true,
                exports: Object.keys(playwrightAws).slice(0, 10),
              });
            }
          } catch (requireError) {
            logger.debug('require method failed', {
              error: requireError instanceof Error ? requireError.message : String(requireError),
            });
          }
          
          // Method 2: Try ES module import (may work after bundling transforms it)
          if (!launchChromium) {
            try {
              const playwrightAws = await import('playwright-aws-lambda');
              
              // Check for named export
              if (playwrightAws.launchChromium && typeof playwrightAws.launchChromium === 'function') {
                launchChromium = playwrightAws.launchChromium;
                importMethod = 'ES module (named export)';
              }
              // Check for default export containing launchChromium
              else if ((playwrightAws as any).default) {
                const defaultExport = (playwrightAws as any).default;
                if (defaultExport.launchChromium && typeof defaultExport.launchChromium === 'function') {
                  launchChromium = defaultExport.launchChromium;
                  importMethod = 'ES module (default.launchChromium)';
                } else if (typeof defaultExport === 'function' && defaultExport.name === 'launchChromium') {
                  launchChromium = defaultExport;
                  importMethod = 'ES module (default as function)';
                }
              }
              
              if (launchChromium) {
                logger.info('playwright-aws-lambda imported via ES module', {
                  method: importMethod,
                  hasLaunchChromium: true,
                  exports: Object.keys(playwrightAws).slice(0, 10),
                  hasDefault: !!(playwrightAws as any).default,
                });
              }
            } catch (importError) {
              logger.debug('ES module import failed', {
                error: importError instanceof Error ? importError.message : String(importError),
              });
            }
          }
          
          // Method 3: Try importing from chromium module directly
          if (!launchChromium) {
            try {
              const chromiumModule = await import('playwright-aws-lambda/dist/src/chromium');
              if (chromiumModule.launchChromium && typeof chromiumModule.launchChromium === 'function') {
                launchChromium = chromiumModule.launchChromium;
                importMethod = 'chromium module direct';
                logger.info('chromium module imported directly', {
                  method: importMethod,
                  hasLaunchChromium: true,
                  exports: Object.keys(chromiumModule),
                });
              }
            } catch (chromiumError) {
              logger.debug('chromium module import failed', {
                error: chromiumError instanceof Error ? chromiumError.message : String(chromiumError),
              });
            }
          }
          
          // Method 4: Try createRequire (works in Node.js ES modules)
          if (!launchChromium) {
            try {
              const { createRequire } = await import('module');
              // Try to get a valid URL for createRequire
              let requireUrl: string | URL = process.cwd();
              try {
                // import.meta.url might not be available after bundling
                if (typeof import.meta !== 'undefined' && import.meta.url) {
                  requireUrl = import.meta.url;
                } else {
                  // Fallback to using a file URL from current directory
                  requireUrl = new URL('file://' + process.cwd());
                }
              } catch {
                // If URL construction fails, use process.cwd() as string
                requireUrl = process.cwd();
              }
              const require = createRequire(requireUrl);
              const playwrightAws = require('playwright-aws-lambda');
              
              if (playwrightAws && typeof playwrightAws.launchChromium === 'function') {
                launchChromium = playwrightAws.launchChromium;
                importMethod = 'createRequire';
                logger.info('playwright-aws-lambda imported via createRequire', {
                  method: importMethod,
                  hasLaunchChromium: true,
                  exports: Object.keys(playwrightAws).slice(0, 10),
                });
              }
            } catch (createRequireError) {
              logger.debug('createRequire method failed', {
                error: createRequireError instanceof Error ? createRequireError.message : String(createRequireError),
              });
            }
          }
          
          if (!launchChromium || typeof launchChromium !== 'function') {
            // Final attempt: try to inspect what's actually available
            let availableExports: string[] = [];
            try {
              const testImport = await import('playwright-aws-lambda').catch(() => ({}));
              availableExports = Object.keys(testImport);
            } catch {}
            
            throw new Error(
              `launchChromium is not a function after all import attempts. ` +
              `Import method tried: ${importMethod}. ` +
              `Available exports: ${availableExports.join(', ') || 'none'}. ` +
              `This usually means playwright-aws-lambda is not properly bundled in the Lambda package. ` +
              `Check that playwright-aws-lambda is included in node_modules and not excluded in CDK bundling config.`
            );
          }
          
          this.browser = await launchChromium({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-blink-features=AutomationControlled',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
            ],
          });
          logger.info(`Initialized Playwright using playwright-aws-lambda for Lambda (import method: ${importMethod})`);
        } catch (error: any) {
          logger.error('Failed to initialize playwright-aws-lambda', { 
            error: error.message,
            errorName: error.name,
            errorStack: error.stack,
          });
          throw error;
        }
      } else {
        // Use regular Playwright for local/non-Lambda environments
        try {
          const { chromium } = await import('playwright');
          this.browser = await chromium.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-blink-features=AutomationControlled',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
            ],
          });
          logger.info('Initialized Playwright using standard chromium for local environment');
        } catch (error: any) {
          logger.error('Failed to initialize Playwright', { error: error.message });
          throw error;
        }
      }
    }
  }

  /**
   * Apply stealth techniques to avoid bot detection
   */
  private async applyStealth(page: Page): Promise<void> {
    // Override navigator.webdriver
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    // Override navigator.plugins
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });

    // Override navigator.languages
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    // Override chrome object
    await page.addInitScript(() => {
      (window as any).chrome = {
        runtime: {},
      };
    });

    // Override permissions
    await page.addInitScript(() => {
      const originalQuery = (window.navigator as any).permissions.query;
      (window.navigator as any).permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    // Note: User agent, viewport, and headers are now set in the context creation
    // This method only applies JavaScript-based stealth techniques
  }

  async fetch(request: HttpRequest): Promise<HttpResponse> {
    await this.initialize();

    const startTime = Date.now();
    const context = await this.browser!.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    const page: Page = await context.newPage();

    try {
      // Apply stealth techniques
      await this.applyStealth(page);

      // Navigate to URL with realistic settings
      const response = await page.goto(request.url, {
        timeout: request.timeout || 30000,
        waitUntil: 'domcontentloaded', // Wait for DOM to be ready
      });

      if (!response) {
        throw new Error(`No response received for ${request.url}`);
      }

      // For Google News redirects, wait for JavaScript redirects to complete
      if (request.url.includes('news.google.com')) {
        // Wait for potential redirects (Google News uses JS redirects)
        await page.waitForTimeout(3000); // 3 second delay for JS redirects
        
        // Try to wait for navigation if a redirect happens
        try {
          await page.waitForURL((url) => !url.href.includes('news.google.com'), {
            timeout: 5000,
          }).catch(() => {
            // If no redirect happens, that's okay - continue
          });
        } catch (e) {
          // Ignore timeout - page might not redirect
        }
      } else {
        // For other pages, wait for network to be idle
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          // If network doesn't become idle, that's okay - continue
        });
      }

      const body = await page.content();
      const finalUrl = page.url(); // Get URL after any redirects
      
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
        url: finalUrl, // Return final URL after all redirects
        status: response.status(),
        headers,
        body,
        latencyMs,
      };
    } catch (error: any) {
      logger.error('Playwright fetch failed', { 
        url: request.url, 
        error: error.message,
        errorName: error.name,
      });
      throw error;
    } finally {
      await page.close();
      await context.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

