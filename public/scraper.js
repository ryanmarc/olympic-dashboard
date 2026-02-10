// Olympics Medal Dashboard — Client-Side Wikipedia Scraper
// Uses MediaWiki Action API (CORS-friendly) + DOMParser instead of axios + cheerio

// ── Wikipedia API helper ──────────────────────────────────────────────
async function fetchWikipediaPage(pageName) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'parse',
    page: pageName,
    prop: 'text',
    format: 'json',
    origin: '*'
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Wikipedia API error: ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(`Wikipedia API: ${json.error.info}`);

  const html = json.parse.text['*'];
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

// ── Country data & lookup (verbatim from server.js) ───────────────────
const countryData = {
  'Norway': { code: 'NOR', flag: '\u{1F1F3}\u{1F1F4}', wikiName: 'Norway' },
  'Germany': { code: 'GER', flag: '\u{1F1E9}\u{1F1EA}', wikiName: 'Germany' },
  'United States': { code: 'USA', flag: '\u{1F1FA}\u{1F1F8}', wikiName: 'United_States' },
  'Sweden': { code: 'SWE', flag: '\u{1F1F8}\u{1F1EA}', wikiName: 'Sweden' },
  'Austria': { code: 'AUT', flag: '\u{1F1E6}\u{1F1F9}', wikiName: 'Austria' },
  'Canada': { code: 'CAN', flag: '\u{1F1E8}\u{1F1E6}', wikiName: 'Canada' },
  'Switzerland': { code: 'SUI', flag: '\u{1F1E8}\u{1F1ED}', wikiName: 'Switzerland' },
  'France': { code: 'FRA', flag: '\u{1F1EB}\u{1F1F7}', wikiName: 'France' },
  'Netherlands': { code: 'NED', flag: '\u{1F1F3}\u{1F1F1}', wikiName: 'Netherlands' },
  'Italy': { code: 'ITA', flag: '\u{1F1EE}\u{1F1F9}', wikiName: 'Italy' },
  'Japan': { code: 'JPN', flag: '\u{1F1EF}\u{1F1F5}', wikiName: 'Japan' },
  'China': { code: 'CHN', flag: '\u{1F1E8}\u{1F1F3}', wikiName: 'China' },
  'South Korea': { code: 'KOR', flag: '\u{1F1F0}\u{1F1F7}', wikiName: 'South_Korea' },
  'Finland': { code: 'FIN', flag: '\u{1F1EB}\u{1F1EE}', wikiName: 'Finland' },
  'Czech Republic': { code: 'CZE', flag: '\u{1F1E8}\u{1F1FF}', wikiName: 'Czech_Republic' },
  'Czechia': { code: 'CZE', flag: '\u{1F1E8}\u{1F1FF}', wikiName: 'Czech_Republic' },
  'Slovenia': { code: 'SLO', flag: '\u{1F1F8}\u{1F1EE}', wikiName: 'Slovenia' },
  'Australia': { code: 'AUS', flag: '\u{1F1E6}\u{1F1FA}', wikiName: 'Australia' },
  'Great Britain': { code: 'GBR', flag: '\u{1F1EC}\u{1F1E7}', wikiName: 'Great_Britain' },
  'Poland': { code: 'POL', flag: '\u{1F1F5}\u{1F1F1}', wikiName: 'Poland' },
  'New Zealand': { code: 'NZL', flag: '\u{1F1F3}\u{1F1FF}', wikiName: 'New_Zealand' },
  'Spain': { code: 'ESP', flag: '\u{1F1EA}\u{1F1F8}', wikiName: 'Spain' },
  'Slovakia': { code: 'SVK', flag: '\u{1F1F8}\u{1F1F0}', wikiName: 'Slovakia' },
  'Belgium': { code: 'BEL', flag: '\u{1F1E7}\u{1F1EA}', wikiName: 'Belgium' },
  'Belarus': { code: 'BLR', flag: '\u{1F1E7}\u{1F1FE}', wikiName: 'Belarus' },
  'Ukraine': { code: 'UKR', flag: '\u{1F1FA}\u{1F1E6}', wikiName: 'Ukraine' },
  'Kazakhstan': { code: 'KAZ', flag: '\u{1F1F0}\u{1F1FF}', wikiName: 'Kazakhstan' },
  'ROC': { code: 'ROC', flag: '\u{1F3F3}\u{FE0F}', wikiName: 'ROC' },
  'Russia': { code: 'RUS', flag: '\u{1F1F7}\u{1F1FA}', wikiName: 'Russia' },
  'Estonia': { code: 'EST', flag: '\u{1F1EA}\u{1F1EA}', wikiName: 'Estonia' },
  'Latvia': { code: 'LAT', flag: '\u{1F1F1}\u{1F1FB}', wikiName: 'Latvia' },
  'Lithuania': { code: 'LTU', flag: '\u{1F1F1}\u{1F1F9}', wikiName: 'Lithuania' },
  'Hungary': { code: 'HUN', flag: '\u{1F1ED}\u{1F1FA}', wikiName: 'Hungary' },
  'Croatia': { code: 'CRO', flag: '\u{1F1ED}\u{1F1F7}', wikiName: 'Croatia' },
  'Denmark': { code: 'DEN', flag: '\u{1F1E9}\u{1F1F0}', wikiName: 'Denmark' },
  'Ireland': { code: 'IRL', flag: '\u{1F1EE}\u{1F1EA}', wikiName: 'Ireland' },
  'Romania': { code: 'ROU', flag: '\u{1F1F7}\u{1F1F4}', wikiName: 'Romania' },
  'Bulgaria': { code: 'BUL', flag: '\u{1F1E7}\u{1F1EC}', wikiName: 'Bulgaria' },
  'Serbia': { code: 'SRB', flag: '\u{1F1F7}\u{1F1F8}', wikiName: 'Serbia' },
  'Monaco': { code: 'MON', flag: '\u{1F1F2}\u{1F1E8}', wikiName: 'Monaco' },
  'Liechtenstein': { code: 'LIE', flag: '\u{1F1F1}\u{1F1EE}', wikiName: 'Liechtenstein' },
  'Andorra': { code: 'AND', flag: '\u{1F1E6}\u{1F1E9}', wikiName: 'Andorra' },
};

function getCountryInfo(name) {
  const cleanName = name.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  if (countryData[cleanName]) {
    return { ...countryData[cleanName], name: cleanName };
  }
  for (const [key, value] of Object.entries(countryData)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return { ...value, name: key };
    }
  }
  return false;
}

// ── Scrape main medal table ───────────────────────────────────────────
async function scrapeWikipediaMedalTable() {
  const pages = [
    '2026_Winter_Olympics_medal_table'
  ];

  for (const pageName of pages) {
    try {
      console.log(`Scraping: ${pageName}`);
      const doc = await fetchWikipediaPage(pageName);
      const countries = [];

      const tables = doc.querySelectorAll('table.wikitable, table.sortable');
      console.log(`  Found ${tables.length} tables on page`);

      for (const table of tables) {
        const headerRow = table.querySelector('tr');
        if (!headerRow) continue;
        const headerText = headerRow.textContent.toLowerCase();

        const isMedalTable = (headerText.includes('gold') || headerText.includes('nation')) &&
                            (headerText.includes('total') || headerText.includes('bronze'));
        if (!isMedalTable) continue;

        console.log('  Found medal table');

        const rows = table.querySelectorAll('tr');
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const cells = row.querySelectorAll('th, td');
          if (cells.length < 4) continue;

          let countryName = '';
          for (const cell of cells) {
            const link = cell.querySelector('a[href*="/wiki/"]');
            const linkText = link ? link.textContent.trim() : '';
            const cellText = cell.textContent.trim();
            if (/^\d+$/.test(cellText) || cellText === '') continue;

            if (linkText && linkText.length > 2 && !/^\d+$/.test(linkText) &&
                !(link.getAttribute('href') || '').includes('File:')) {
              countryName = linkText;
              break;
            }
          }

          if (!countryName) continue;

          const numCells = cells.length;
          let gold = 0, silver = 0, bronze = 0, total = 0;
          if (numCells >= 4) {
            gold = parseInt(cells[numCells - 4].textContent.trim()) || 0;
            silver = parseInt(cells[numCells - 3].textContent.trim()) || 0;
            bronze = parseInt(cells[numCells - 2].textContent.trim()) || 0;
            total = parseInt(cells[numCells - 1].textContent.trim()) || 0;
          }

          const calculatedTotal = gold + silver + bronze;
          if (total === 0) total = calculatedTotal;

          if (calculatedTotal > 0) {
            const info = getCountryInfo(countryName);
            if (!info) continue;
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
        }
      }

      // Remove duplicates
      const unique = countries.filter((country, index, self) =>
        index === self.findIndex(c => c.code === country.code)
      );

      if (unique.length > 0) {
        console.log(`Successfully scraped ${unique.length} countries`);
        return unique;
      }

    } catch (error) {
      console.error(`Failed to scrape ${pageName}: ${error.message}`);
    }
  }

  // Fallback: try medal winners list
  try {
    console.log('Trying List of medal winners page...');
    const doc = await fetchWikipediaPage('List_of_2026_Winter_Olympics_medal_winners');
    const countryMedals = {};

    const rows = doc.querySelectorAll('table.wikitable tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 3) continue;

      for (const cell of cells) {
        const links = cell.querySelectorAll('a[href*="/wiki/"]');
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          if (href.includes('_at_the_2026_Winter_Olympics')) {
            const countryMatch = href.match(/\/wiki\/([^_]+)_at_the_2026/);
            if (countryMatch) {
              const countryName = countryMatch[1].replace(/_/g, ' ');
              const info = getCountryInfo(countryName);
              if (!info) continue;

              if (!countryMedals[info.code]) {
                countryMedals[info.code] = { ...info, gold: 0, silver: 0, bronze: 0, total: 0 };
              }

              const cellStyle = cell.getAttribute('style') || '';
              const rowText = row.textContent.toLowerCase();
              if (cellStyle.includes('gold') || rowText.includes('gold')) {
                countryMedals[info.code].gold++;
              } else if (cellStyle.includes('silver') || rowText.includes('silver')) {
                countryMedals[info.code].silver++;
              } else if (cellStyle.includes('bronze') || rowText.includes('bronze')) {
                countryMedals[info.code].bronze++;
              }
            }
          }
        }
      }
    }

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

// ── Scrape detailed medals for a single country ───────────────────────
async function scrapeCountryMedals(country) {
  const pageName = `${country.wikiName}_at_the_2026_Winter_Olympics`;

  try {
    console.log(`  Fetching ${country.name}...`);
    const doc = await fetchWikipediaPage(pageName);
    const medals = [];

    const sportNames = [
      'Alpine skiing', 'Biathlon', 'Bobsled', 'Bobsleigh', 'Cross-country skiing',
      'Curling', 'Figure skating', 'Freestyle skiing', 'Ice hockey',
      'Luge', 'Nordic combined', 'Short track speed skating', 'Short track', 'Skeleton',
      'Ski jumping', 'Snowboarding', 'Snowboard', 'Speed skating'
    ];

    const tables = doc.querySelectorAll('table.wikitable');
    for (const table of tables) {
      // Check nearby headers for context
      let prevHeader = '';
      let el = table.previousElementSibling;
      while (el) {
        if (/^H[2-4]$/i.test(el.tagName)) {
          prevHeader = el.textContent.toLowerCase();
          break;
        }
        el = el.previousElementSibling;
      }

      // Analyze header row
      const headerRow = table.querySelector('tr');
      if (!headerRow) continue;
      const headers = Array.from(headerRow.querySelectorAll('th, td')).map(
        el => el.textContent.toLowerCase().trim()
      );

      let currentSport = '';
      let sportRowsRemaining = 0;

      const rows = table.querySelectorAll('tr');
      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) continue;

        let sport = '';
        let event = '';
        let athletes = [];
        let medalType = '';

        if (sportRowsRemaining > 0) {
          sport = currentSport;
          sportRowsRemaining--;
        }

        for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
          const cell = cells[cellIndex];
          const cellText = cell.textContent.replace(/\[.*?\]/g, '').trim();
          const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;

          // Check if cell contains a sport name
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
            const eventPatterns = /men'?s|women'?s|mixed|team|individual|sprint|relay|slalom|downhill|super-g|giant|halfpipe|slopestyle|cross|pursuit|mass start|combined|moguls|aerials|big air|parallel|singles|doubles|pairs|ice dance|monobob|\d+\s*(m|km|g)/i;
            if (eventPatterns.test(cellText) || (sport && cellIndex === 1)) {
              event = cellText;
            }
          }

          // Look for athlete names in links
          const links = cell.querySelectorAll('a');
          for (const link of links) {
            const linkText = link.textContent.trim();
            const href = link.getAttribute('href') || '';
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
                /^[A-Z]/.test(linkText) &&
                linkText.length > 3 &&
                linkText.length < 50 &&
                !athletes.includes(linkText) &&
                !sportNames.some(s => linkText.toLowerCase().includes(s.toLowerCase()))) {
              athletes.push(linkText);
            }
          }

          // Check for medal type from styling
          const cellStyle = cell.getAttribute('style') || '';
          const cellBg = cell.getAttribute('bgcolor') || '';
          const cellClass = cell.getAttribute('class') || '';

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
        }

        // Check for medal images in the row
        if (!medalType) {
          if (row.querySelector('img[alt*="gold" i], img[src*="gold" i]')) medalType = 'gold';
          else if (row.querySelector('img[alt*="silver" i], img[src*="silver" i]')) medalType = 'silver';
          else if (row.querySelector('img[alt*="bronze" i], img[src*="bronze" i]')) medalType = 'bronze';
        }

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
      }
    }

    // Deduplicate
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

// ── Main data fetching (with progress callback) ───────────────────────
async function fetchAllMedalData(onProgress) {
  console.log('Fetching medal data from Wikipedia...');

  if (onProgress) onProgress({ phase: 'table', message: 'Fetching medal standings...' });

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

  const allAthletes = [];
  const sportsMedals = {};

  console.log('Fetching country details...');

  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    if (onProgress) {
      onProgress({
        phase: 'countries',
        message: `Fetching ${country.name}...`,
        current: i + 1,
        total: countries.length
      });
    }

    // Rate limit: 500ms between requests
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));

    const medals = await scrapeCountryMedals(country);

    for (const medal of medals) {
      allAthletes.push({
        id: `${medal.sport}-${medal.event}-${medal.medal}`.replace(/\s/g, '-').toLowerCase(),
        name: medal.athlete,
        country: medal.country,
        countryCode: medal.countryCode,
        flag: medal.flag,
        sport: medal.sport,
        event: medal.event,
        medal: medal.medal,
        date: new Date().toISOString().split('T')[0]
      });

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

  const sportsArray = Object.values(sportsMedals).sort((a, b) => b.total - a.total);

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

  const topPerformers = allAthletes.filter(a => a.medal === 'gold').slice(0, 10);
  const recentMedals = [...allAthletes].slice(0, 20);

  console.log(`Scraping complete! Countries: ${countries.length}, Medals: ${totalMedals}`);

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

// ── Country details (replaces /api/medals/:code) ──────────────────────
function getCountryDetails(countryCode, data) {
  if (!data) return null;

  const countryParam = countryCode.toLowerCase();
  const country = data.countries.find(
    c => (c.code || '').toLowerCase() === countryParam ||
         (c.name || '').toLowerCase() === countryParam
  );

  if (!country) return null;

  const countryAthletes = (data.athletes || []).filter(
    a => a.countryCode === country.code || a.country === country.name
  );

  const medalsBySport = {};
  for (const athlete of countryAthletes) {
    if (!medalsBySport[athlete.sport]) {
      medalsBySport[athlete.sport] = [];
    }
    medalsBySport[athlete.sport].push(athlete);
  }

  return {
    ...country,
    athletes: countryAthletes,
    medalsBySport,
    medalsByDay: data.dailyProgression
  };
}
