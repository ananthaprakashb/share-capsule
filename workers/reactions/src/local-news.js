const decodeXml = value => String(value || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/<[^>]+>/g, '')
  .trim();

const tag = (xml, name) => {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decodeXml(match?.[1]);
};

const parseItems = xml => {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const seen = new Set();

  return blocks
    .map(block => {
      const rawTitle = tag(block, 'title');
      const source = tag(block, 'source') || rawTitle.split(' - ').pop() || '';
      const suffix = source ? ` - ${source}` : '';
      const title = suffix && rawTitle.endsWith(suffix)
        ? rawTitle.slice(0, -suffix.length).trim()
        : rawTitle.trim();

      return {
        title,
        source,
        url: tag(block, 'link'),
        publishedAt: tag(block, 'pubDate'),
      };
    })
    .filter(item => {
      const key = item.title.toLowerCase();
      if (!item.title || !item.url || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
};

export async function getLocalNews(request) {
  const cf = request.cf || {};
  const url = new URL(request.url);
  const suppliedCity = (url.searchParams.get('city') || '').trim();
  const suppliedRegion = (url.searchParams.get('region') || '').trim();
  const city = suppliedCity || cf.city || '';
  const region = suppliedRegion || cf.region || cf.regionCode || '';
  const country = cf.country || 'US';

  if (!city) {
    return {
      status: 200,
      body: {
        location: null,
        headlines: [],
        message: 'Local city could not be determined.',
      },
    };
  }

  const locationLabel = [city, region].filter(Boolean).join(', ');
  const query = `"${locationLabel}" local news when:1d`;
  const locale = country === 'US'
    ? { hl: 'en-US', gl: 'US', ceid: 'US:en' }
    : { hl: 'en', gl: country, ceid: `${country}:en` };

  const rss = new URL('https://news.google.com/rss/search');
  rss.searchParams.set('q', query);
  rss.searchParams.set('hl', locale.hl);
  rss.searchParams.set('gl', locale.gl);
  rss.searchParams.set('ceid', locale.ceid);

  try {
    const response = await fetch(rss, {
      headers: {
        accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8',
        'user-agent': 'ShareCapsuleLocalNews/1.0',
      },
      cf: {
        cacheTtl: 900,
        cacheEverything: true,
      },
    });

    if (!response.ok) {
      return {
        status: 502,
        body: {
          location: locationLabel,
          headlines: [],
          message: `News source returned ${response.status}.`,
        },
      };
    }

    const xml = await response.text();
    return {
      status: 200,
      body: {
        location: locationLabel,
        generatedAt: new Date().toISOString(),
        headlines: parseItems(xml),
        source: 'Google News RSS',
        note: 'Headlines are read as published by their named news sources. Open the linked source for full context.',
      },
    };
  } catch (error) {
    return {
      status: 502,
      body: {
        location: locationLabel,
        headlines: [],
        message: error?.message || 'Local news is temporarily unavailable.',
      },
    };
  }
}
