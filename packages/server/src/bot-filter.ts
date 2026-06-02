const BOT_UA_PATTERNS: RegExp[] = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /ia_archiver/i,
  /mj12bot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /rogerbot/i,
  /seznambot/i,
  /naverbot/i,
  /yeti\/\d/i,
  /screaming frog/i,
  /sitebulb/i,
  /deepcrawl/i,
  /sitechecker/i,
  /seobilitybot/i,
  /dataprovider/i,
  /linkdexbot/i,
  /spbot/i,
  /blexbot/i,
  /mail\.ru_bot/i,
  /zgrab/i,
  /coccocbot/i,
  /petalbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterestbot/i,
  /whatsapp/i,
  /slackbot/i,
  /telegrambot/i,
  /discordbot/i,
  /applebot/i,
  /iframely/i,
  /embedly/i,
  /outbrain/i,
  /uptimerobot/i,
  /pingdom/i,
  /statuscake/i,
  /freshping/i,
  /hetrixtools/i,
  /site24x7/i,
  /newrelic/i,
  /datadog/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /go-http-client/i,
  /java\/\d/i,
  /okhttp/i,
  /axios\/\d/i,
  /node-fetch/i,
  /got \(node/i,
  /libwww-perl/i,
  /lwp-trivialhttp/i,
  /mechanize/i,
  /scrapy/i,
  /nutch/i,
  /larbin/i,
  /httrack/i,
  /webzip/i,
  /offline explorer/i,
  /headlesschrome/i,
  /headless/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /cypress/i,
  /selenium/i,
  /webdriver/i,
  /slimerjs/i,
  /casperjs/i,
  /nmap/i,
  /nikto/i,
  /sqlmap/i,
  /masscan/i,
  /nessus/i,
  /openvas/i,
  /zap\//i,
];

const MIN_UA_LENGTH = 10;

export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent || userAgent.trim().length < MIN_UA_LENGTH) {
    return true; // Empty or suspiciously short user agents are considered bots
  }

  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }

  return false;
}

export function getUserAgent(header: string | string[] | undefined): string | undefined {
  if (!header) return undefined;
  return Array.isArray(header) ? header[0] : header;
}
