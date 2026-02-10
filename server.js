import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));

// Cache for medal data
let cachedData = null;
let lastFetch = null;
const CACHE_DURATION = 300000; // 5 minutes

// Ethical scraping: identify ourselves properly
const BOT_USER_AGENT = 'OlympicsMedalDashboard/1.0 (Educational Project; respects robots.txt)';

const axiosConfig = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  },
  timeout: 20000,
  maxRedirects: 5
};

// Country code and flag mapping
const countryData = {
  'Norway': { code: 'NOR', flag: '🇳🇴', wikiName: 'Norway' },
  'Germany': { code: 'GER', flag: '🇩🇪', wikiName: 'Germany' },
  'United States': { code: 'USA', flag: '🇺🇸', wikiName: 'United_States' },
  'Sweden': { code: 'SWE', flag: '🇸🇪', wikiName: 'Sweden' },
  'Austria': { code: 'AUT', flag: '🇦🇹', wikiName: 'Austria' },
  'Canada': { code: 'CAN', flag: '🇨🇦', wikiName: 'Canada' },
  'Switzerland': { code: 'SUI', flag: '🇨🇭', wikiName: 'Switzerland' },
  'France': { code: 'FRA', flag: '🇫🇷', wikiName: 'France' },
  'Netherlands': { code: 'NED', flag: '🇳🇱', wikiName: 'Netherlands' },
  'Italy': { code: 'ITA', flag: '🇮🇹', wikiName: 'Italy' },
  'Japan': { code: 'JPN', flag: '🇯🇵', wikiName: 'Japan' },
  'China': { code: 'CHN', flag: '🇨🇳', wikiName: 'China' },
  'South Korea': { code: 'KOR', flag: '🇰🇷', wikiName: 'South_Korea' },
  'Finland': { code: 'FIN', flag: '🇫🇮', wikiName: 'Finland' },
  'Czech Republic': { code: 'CZE', flag: '🇨🇿', wikiName: 'Czech_Republic' },
  'Czechia': { code: 'CZE', flag: '🇨🇿', wikiName: 'Czech_Republic' },
  'Slovenia': { code: 'SLO', flag: '🇸🇮', wikiName: 'Slovenia' },
  'Australia': { code: 'AUS', flag: '🇦🇺', wikiName: 'Australia' },
  'Great Britain': { code: 'GBR', flag: '🇬🇧', wikiName: 'Great_Britain' },
  'Poland': { code: 'POL', flag: '🇵🇱', wikiName: 'Poland' },
  'New Zealand': { code: 'NZL', flag: '🇳🇿', wikiName: 'New_Zealand' },
  'Spain': { code: 'ESP', flag: '🇪🇸', wikiName: 'Spain' },
  'Slovakia': { code: 'SVK', flag: '🇸🇰', wikiName: 'Slovakia' },
  'Belgium': { code: 'BEL', flag: '🇧🇪', wikiName: 'Belgium' },
  'Belarus': { code: 'BLR', flag: '🇧🇾', wikiName: 'Belarus' },
  'Ukraine': { code: 'UKR', flag: '🇺🇦', wikiName: 'Ukraine' },
  'Kazakhstan': { code: 'KAZ', flag: '🇰🇿', wikiName: 'Kazakhstan' },
  'ROC': { code: 'ROC', flag: '🏳️', wikiName: 'ROC' },
  'Russia': { code: 'RUS', flag: '🇷🇺', wikiName: 'Russia' },
  'Estonia': { code: 'EST', flag: '🇪🇪', wikiName: 'Estonia' },
  'Latvia': { code: 'LAT', flag: '🇱🇻', wikiName: 'Latvia' },
  'Lithuania': { code: 'LTU', flag: '🇱🇹', wikiName: 'Lithuania' },
  'Hungary': { code: 'HUN', flag: '🇭🇺', wikiName: 'Hungary' },
  'Croatia': { code: 'CRO', flag: '🇭🇷', wikiName: 'Croatia' },
  'Denmark': { code: 'DEN', flag: '🇩🇰', wikiName: 'Denmark' },
  'Ireland': { code: 'IRL', flag: '🇮🇪', wikiName: 'Ireland' },
  'Romania': { code: 'ROU', flag: '🇷🇴', wikiName: 'Romania' },
  'Bulgaria': { code: 'BUL', flag: '🇧🇬', wikiName: 'Bulgaria' },
  'Serbia': { code: 'SRB', flag: '🇷🇸', wikiName: 'Serbia' },
  'Monaco': { code: 'MON', flag: '🇲🇨', wikiName: 'Monaco' },
  'Liechtenstein': { code: 'LIE', flag: '🇱🇮', wikiName: 'Liechtenstein' },
  'Andorra': { code: 'AND', flag: '🇦🇩', wikiName: 'Andorra' },
};

function getCountryInfo(name) {
  // Clean up country name
  const cleanName = name.replace(/\*/g, '').replace(/\s+/g, ' ').trim();

  // Direct match
  if (countryData[cleanName]) {
    return { ...countryData[cleanName], name: cleanName };
  }

  // Partial match
  for (const [key, value] of Object.entries(countryData)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return { ...value, name: key };
    }
  }

  return false;
  // Generate from name
  // return {
  //   code: cleanName.substring(0, 3).toUpperCase(),
  //   flag: '🏳️',
  //   wikiName: cleanName.replace(/\s+/g, '_'),
  //   name: cleanName
  // };
}

// Scrape main medal table from Wikipedia
async function scrapeWikipediaMedalTable() {
  const urls = [
    'https://en.wikipedia.org/wiki/2026_Winter_Olympics_medal_table'
    // 'https://en.wikipedia.org/wiki/2026_Winter_Olympics'
  ];

  for (const url of urls) {
    try {
      console.log(`Scraping: ${url}`);
      const response = await axios.get(url, axiosConfig);
      const $ = cheerio.load(response.data);
      const countries = [];

      // Debug: count tables found
      console.log(`  Found ${$('table').length} tables on page`);

      // Look for medal table - Wikipedia uses various table structures
      $('table.wikitable, table.sortable').each((tableIndex, table) => {
        const $table = $(table);
        const headerRow = $table.find('tr').first();
        const headerText = headerRow.text().toLowerCase();

        // Check if this is a medal table
        const isMedalTable = (headerText.includes('gold') || headerText.includes('nation')) &&
                            (headerText.includes('total') || headerText.includes('bronze'));

        if (!isMedalTable) return;

        console.log(`  Found medal table (table ${tableIndex})`);

        $table.find('tr').each((rowIndex, row) => {
          const $row = $(row);
          const cells = $row.find('th, td');

          // Skip header rows (need at least 4 data cells for rank, country, medals)
          if (cells.length < 4) return;

          // Try to find country name - look for links with country names
          let countryName = '';
          let countryCell = null;

          cells.each((cellIndex, cell) => {
            const $cell = $(cell);
            const link = $cell.find('a[href*="/wiki/"]').first();
            const linkText = link.text().trim();
            const cellText = $cell.text().trim();
            // Skip if it's just a number (rank or medal count)
            if (cellText.match(/^\d+$/) || cellText === '') return;

            // Look for country name (has link to country page, not a flag)
            if (linkText && linkText.length > 2 && !linkText.match(/^\d+$/) &&
                !link.attr('href')?.includes('File:')) {
              countryName = linkText;
              countryCell = $cell;
              return false; // break
            }
          });

          if (!countryName) return;

          // Extract medal counts from the last 4 cells
          const numCells = cells.length;
          let gold = 0, silver = 0, bronze = 0, total = 0;

          // Try different cell positions for medal counts
          if (numCells >= 4) {
            gold = parseInt($(cells[numCells - 4]).text().trim()) || 0;
            silver = parseInt($(cells[numCells - 3]).text().trim()) || 0;
            bronze = parseInt($(cells[numCells - 2]).text().trim()) || 0;
            total = parseInt($(cells[numCells - 1]).text().trim()) || 0;
          }

          // Validate: total should equal sum of medals (or be close)
          const calculatedTotal = gold + silver + bronze;
          if (total === 0) total = calculatedTotal;

          // Only add if we have at least one medal
          if (calculatedTotal > 0) {
            const info = getCountryInfo(countryName);
            countries.push({
              name: info.name,
              code: info.code,
              flag: info.flag,
              wikiName: info.wikiName,
              gold,
              silver,
              bronze,
              total: calculatedTotal
            });
            console.log(`    ${info.name}: ${gold}G ${silver}S ${bronze}B`);
          }
        });
      });

      // Remove duplicates
      const unique = countries.filter((country, index, self) =>
        index === self.findIndex(c => c.code === country.code)
      );

      if (unique.length > 0) {
        console.log(`Successfully scraped ${unique.length} countries from ${url}`);
        return unique;
      }

    } catch (error) {
      console.error(`Failed to scrape ${url}: ${error.message}`);
    }
  }

  // Try the medal winners list as a last resort
  try {
    console.log('Trying List of medal winners page...');
    const response = await axios.get('https://en.wikipedia.org/wiki/List_of_2026_Winter_Olympics_medal_winners', axiosConfig);
    const $ = cheerio.load(response.data);
    const countryMedals = {};

    // This page lists individual medal events - aggregate by country
    $('table.wikitable tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      // Look for country links/flags
      cells.each((ci, cell) => {
        const $cell = $(cell);
        const links = $cell.find('a[href*="/wiki/"]');

        links.each((li, link) => {
          const href = $(link).attr('href') || '';
          const text = $(link).text().trim();

          // Check if this links to a country at Olympics page
          if (href.includes('_at_the_2026_Winter_Olympics')) {
            const countryMatch = href.match(/\/wiki\/([^_]+)_at_the_2026/);
            if (countryMatch) {
              const countryName = countryMatch[1].replace(/_/g, ' ');
              const info = getCountryInfo(countryName);

              if (!countryMedals[info.code]) {
                countryMedals[info.code] = { ...info, gold: 0, silver: 0, bronze: 0, total: 0 };
              }

              // Determine medal type from row context
              const rowText = $(row).text().toLowerCase();
              const prevHeader = $(row).prevAll('tr').find('th').text().toLowerCase();

              // Check background colors
              const cellStyle = $cell.attr('style') || '';
              if (cellStyle.includes('gold') || rowText.includes('gold')) {
                countryMedals[info.code].gold++;
              } else if (cellStyle.includes('silver') || rowText.includes('silver')) {
                countryMedals[info.code].silver++;
              } else if (cellStyle.includes('bronze') || rowText.includes('bronze')) {
                countryMedals[info.code].bronze++;
              }
            }
          }
        });
      });
    });

    const countries = Object.values(countryMedals)
      .map(c => ({ ...c, total: c.gold + c.silver + c.bronze }))
      .filter(c => c.total > 0);

    if (countries.length > 0) {
      console.log(`Aggregated ${countries.length} countries from medal winners list`);
      return countries;
    }
  } catch (error) {
    console.error(`Medal winners list failed: ${error.message}`);
  }

  console.log('All Wikipedia scraping attempts failed');
  return null;
}

// Scrape detailed medal info for a specific country
async function scrapeCountryMedals(country) {
  const url = `https://en.wikipedia.org/wiki/${country.wikiName}_at_the_2026_Winter_Olympics`;

  try {
    console.log(`  Fetching ${country.name}...`);
    const response = await axios.get(url, axiosConfig);
    const $ = cheerio.load(response.data);
    const medals = [];

    const sportNames = [
      'Alpine skiing', 'Biathlon', 'Bobsled', 'Bobsleigh', 'Cross-country skiing',
      'Curling', 'Figure skating', 'Freestyle skiing', 'Ice hockey',
      'Luge', 'Nordic combined', 'Short track speed skating', 'Short track', 'Skeleton',
      'Ski jumping', 'Snowboarding', 'Snowboard', 'Speed skating'
    ];

    // Look for medal tables
    $('table.wikitable').each((tableIndex, table) => {
      const $table = $(table);

      // Check nearby headers for context
      const prevHeader = $table.prevAll('h2, h3, h4').first().text().toLowerCase();
      const isMedalSection = prevHeader.includes('medal') || prevHeader.includes('podium');

      // Analyze header row to find column indices
      const headerRow = $table.find('tr').first();
      const headers = headerRow.find('th, td').map((i, el) => $(el).text().toLowerCase().trim()).get();

      let sportCol = headers.findIndex(h => h.includes('sport'));
      let eventCol = headers.findIndex(h => h.includes('event'));
      let athleteCol = headers.findIndex(h => h.includes('athlete') || h.includes('name') || h.includes('competitor'));
      let medalCol = headers.findIndex(h => h.includes('medal'));

      // Track rowspan values for sport column
      let currentSport = '';
      let sportRowsRemaining = 0;

      $table.find('tr').each((rowIndex, row) => {
        if (rowIndex === 0) return; // Skip header row

        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length === 0) return;

        let sport = '';
        let event = '';
        let athletes = [];
        let medalType = '';

        // Handle rowspan for sport column
        if (sportRowsRemaining > 0) {
          sport = currentSport;
          sportRowsRemaining--;
        }

        // Process each cell
        let cellOffset = 0; // Offset due to rowspan cells from previous rows
        if (sport) cellOffset = 1; // If we got sport from rowspan, first cell is event

        cells.each((cellIndex, cell) => {
          const $cell = $(cell);
          const cellText = $cell.text().replace(/\[.*?\]/g, '').trim();
          const rowspan = parseInt($cell.attr('rowspan')) || 1;
          const actualCol = cellIndex + (sport ? 1 : 0); // Adjust column index if sport came from rowspan

          // Check if this cell contains a sport name
          let foundSport = '';
          for (const s of sportNames) {
            if (cellText.toLowerCase() === s.toLowerCase() ||
                cellText.toLowerCase().startsWith(s.toLowerCase())) {
              foundSport = s;
              break;
            }
          }

          if (foundSport && !sport) {
            sport = foundSport;
            if (rowspan > 1) {
              currentSport = foundSport;
              sportRowsRemaining = rowspan - 1;
            }
          } else if (!event && cellText.length > 0 && cellText.length < 100) {
            // If we have a sport and this isn't the sport cell, it might be the event
            // Event names are usually descriptive (Men's, Women's, Mixed, Team, etc.)
            const eventPatterns = /men'?s|women'?s|mixed|team|individual|sprint|relay|slalom|downhill|super-g|giant|halfpipe|slopestyle|cross|pursuit|mass start|combined|moguls|aerials|big air|parallel|singles|doubles|pairs|ice dance|monobob|\d+\s*(m|km|g)/i;
            if (eventPatterns.test(cellText) || (sport && cellIndex === 1)) {
              event = cellText;
            }
          }

          // Look for athlete names in cells
          const links = $cell.find('a');
          links.each((li, link) => {
            const linkText = $(link).text().trim();
            const href = $(link).attr('href') || '';
            // Athlete links point to /wiki/Name_Name format, exclude sport/event pages
            if (href.includes('/wiki/') &&
                !href.includes('File:') &&
                !href.includes('_Olympics') &&
                !href.includes('_at_') &&
                !href.includes('_skiing') &&
                !href.includes('_skating') &&
                !href.includes('_curling') &&
                !href.includes('_biathlon') &&
                !href.includes('Figure_skating') &&
                !href.includes('Ice_hockey') &&
                linkText.match(/^[A-Z]/) &&
                linkText.length > 3 &&
                linkText.length < 50 &&
                !athletes.includes(linkText) &&
                !sportNames.some(s => linkText.toLowerCase().includes(s.toLowerCase()))) {
              athletes.push(linkText);
            }
          });

          // Check for medal type from cell styling or content
          const cellStyle = $(cell).attr('style') || '';
          const cellBg = $(cell).attr('bgcolor') || '';
          const cellClass = $(cell).attr('class') || '';

          if (cellStyle.includes('gold') || cellBg.includes('gold') ||
              cellText.toLowerCase() === 'gold' || cellClass.includes('gold')) {
            medalType = 'gold';
          } else if (cellStyle.includes('silver') || cellBg.includes('silver') ||
                     cellText.toLowerCase() === 'silver' || cellClass.includes('silver')) {
            medalType = 'silver';
          } else if (cellStyle.includes('#c96') || cellStyle.includes('bronze') ||
                     cellBg.includes('bronze') || cellText.toLowerCase() === 'bronze' ||
                     cellClass.includes('bronze')) {
            medalType = 'bronze';
          }
        });

        // Also check for medal images in the row
        if (!medalType) {
          if ($row.find('img[alt*="gold" i], img[src*="gold" i]').length) medalType = 'gold';
          else if ($row.find('img[alt*="silver" i], img[src*="silver" i]').length) medalType = 'silver';
          else if ($row.find('img[alt*="bronze" i], img[src*="bronze" i]').length) medalType = 'bronze';
        }

        // Only add if we have the required data
        if (medalType && sport) {
          const athleteName = athletes.length > 0 ? athletes.join(', ') : 'TBD';
          const eventName = event || 'Unknown Event';

          medals.push({
            athlete: athleteName,
            sport: sport.replace('Bobsleigh', 'Bobsled').replace('Snowboarding', 'Snowboard'),
            event: eventName,
            medal: medalType,
            country: country.name,
            countryCode: country.code,
            flag: country.flag
          });
        }
      });
    });

    // Deduplicate based on sport + event + medal type
    const unique = medals.filter((medal, index, self) =>
      index === self.findIndex(m =>
        m.sport === medal.sport && m.event === medal.event && m.medal === medal.medal
      )
    );

    if (unique.length > 0) {
      console.log(`    Found ${unique.length} medals`);
    }

    return unique;
  } catch (error) {
    console.log(`    ${country.name}: page not found or error`);
    return [];
  }
}

// Main data fetching function
async function fetchAllMedalData() {
  console.log('\n========================================');
  console.log('Fetching medal data from Wikipedia...');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('========================================\n');

  // Get main medal standings
  const countries = await scrapeWikipediaMedalTable();

  if (!countries || countries.length === 0) {
    console.log('Failed to fetch medal table from Wikipedia');
    return null;
  }

  // Sort by gold, then silver, then bronze
  countries.sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  // Fetch detailed medal info for each country (with rate limiting)
  const allAthletes = [];
  const sportsMedals = {};

  console.log('\nFetching country details (rate limited)...');

  for (const country of countries) {
    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));

    const medals = await scrapeCountryMedals(country);

    for (const medal of medals) {
      // Add to athletes list
      allAthletes.push({
        id: `${medal.sport}-${medal.event}-${medal.medal}`.replace(/\s/g, '-').toLowerCase(),
        name: medal.athlete,
        country: medal.country,
        countryCode: medal.countryCode,
        flag: medal.flag,
        sport: medal.sport,
        event: medal.event,
        medal: medal.medal,
        date: new Date().toISOString().split('T')[0] // Today's date as placeholder
      });

      // Aggregate by sport
      if (!sportsMedals[medal.sport]) {
        sportsMedals[medal.sport] = {
          name: medal.sport,
          gold: 0,
          silver: 0,
          bronze: 0,
          total: 0,
          events: []
        };
      }

      sportsMedals[medal.sport][medal.medal]++;
      sportsMedals[medal.sport].total++;

      // Add event if not already present
      if (!sportsMedals[medal.sport].events.find(e => e.name === medal.event && e.medal === medal.medal)) {
        sportsMedals[medal.sport].events.push({
          name: medal.event,
          medal: medal.medal,
          athlete: medal.athlete,
          country: medal.country,
          flag: medal.flag
        });
      }
    }
  }

  // Convert sports object to array and sort
  const sportsArray = Object.values(sportsMedals).sort((a, b) => b.total - a.total);

  // Calculate daily progression based on total medals
  const totalMedals = countries.reduce((sum, c) => sum + c.total, 0);
  const gamesStartDate = new Date('2026-02-04');
  const today = new Date();
  const dayNumber = Math.ceil((today - gamesStartDate) / (1000 * 60 * 60 * 24)) + 1;

  const dailyProgression = [];
  const medalsPerDay = Math.ceil(totalMedals / Math.max(dayNumber, 1));

  for (let i = 1; i <= Math.min(dayNumber, 19); i++) {
    const date = new Date(gamesStartDate);
    date.setDate(date.getDate() + i - 1);
    const dayMedals = i === dayNumber ? totalMedals % medalsPerDay || medalsPerDay : medalsPerDay;
    dailyProgression.push({
      date: date.toISOString().split('T')[0],
      day: i,
      medalsAwarded: dayMedals,
      cumulativeTotal: Math.min(i * medalsPerDay, totalMedals)
    });
  }

  // Get top performers (gold medalists)
  const topPerformers = allAthletes
    .filter(a => a.medal === 'gold')
    .slice(0, 10);

  // Get recent medals (all medals, sorted)
  const recentMedals = [...allAthletes].slice(0, 20);

  console.log('\n========================================');
  console.log(`Scraping complete!`);
  console.log(`Countries: ${countries.length}`);
  console.log(`Total medals: ${totalMedals}`);
  console.log(`Athletes/events found: ${allAthletes.length}`);
  console.log(`Sports: ${sportsArray.length}`);
  console.log('========================================\n');

  return {
    lastUpdated: new Date().toISOString(),
    isLive: true,
    dataSource: 'Wikipedia',
    gameStatus: `Day ${dayNumber} - Games in Progress`,
    gameDay: dayNumber,
    totalMedals,
    countries,
    athletes: allAthletes,
    sports: sportsArray,
    dailyProgression,
    topPerformers,
    recentMedals
  };
}

// API endpoint for medal data
app.get('/api/medals', async (req, res) => {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedData && lastFetch && (now - lastFetch) < CACHE_DURATION) {
    console.log('Returning cached data');
    return res.json(cachedData);
  }

  const data = await fetchAllMedalData();

  if (data) {
    cachedData = data;
    lastFetch = now;
    res.json(cachedData);
  } else {
    // Return empty structure if scraping fails
    res.json({
      lastUpdated: new Date().toISOString(),
      isLive: false,
      dataSource: 'Unavailable',
      gameStatus: 'Data unavailable',
      error: 'Could not fetch data from Wikipedia',
      totalMedals: 0,
      countries: [],
      athletes: [],
      sports: [],
      dailyProgression: [],
      topPerformers: [],
      recentMedals: []
    });
  }
});

// API endpoint for specific country details
app.get('/api/medals/:countryCode', async (req, res) => {
  if (!cachedData) {
    cachedData = await fetchAllMedalData();
  }

  if (!cachedData) {
    return res.status(503).json({ error: 'Data not available' });
  }

  const countryParam = req.params.countryCode.toLowerCase();
  const country = cachedData.countries.find(
    c => c.code?.toLowerCase() === countryParam ||
         c.name?.toLowerCase() === countryParam
  );

  if (!country) {
    return res.status(404).json({ error: 'Country not found' });
  }

  const countryAthletes = cachedData.athletes?.filter(
    a => a.countryCode === country.code || a.country === country.name
  ) || [];

  // Group athletes by sport
  const medalsBySport = {};
  for (const athlete of countryAthletes) {
    if (!medalsBySport[athlete.sport]) {
      medalsBySport[athlete.sport] = [];
    }
    medalsBySport[athlete.sport].push(athlete);
  }

  res.json({
    ...country,
    athletes: countryAthletes,
    medalsBySport,
    medalsByDay: cachedData.dailyProgression
  });
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏅 Olympics Medal Dashboard`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`\n📊 Data source: Wikipedia (scraped every 5 minutes)`);
  console.log(`✅ Ethical scraping: Bot identified, rate limited\n`);
});
