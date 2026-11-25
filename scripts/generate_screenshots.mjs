import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const VITE_PORT = 5173;
const OUTPUT_DIR = path.resolve('docs/screenshots');
const VIEWPORT = { width: 393, height: 852, deviceScaleFactor: 2 };

async function isPortOpen(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`).catch(() => null);
    return res !== null;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[Screenshots] Starting automated frameless mobile capture pipeline...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let viteServer = null;
  const isViteRunning = await isPortOpen(VITE_PORT);
  if (!isViteRunning) {
    console.log(`[Screenshots] Launching local Vite dev server on port ${VITE_PORT}...`);
    viteServer = await createServer({
      server: { port: VITE_PORT },
      logLevel: 'error',
    });
    await viteServer.listen();
    console.log(`[Screenshots] Vite ready on http://localhost:${VITE_PORT}`);
  } else {
    console.log(`[Screenshots] Existing Vite dev server detected on http://localhost:${VITE_PORT}`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[Browser Console error]:', msg.text());
    }
  });
  page.on('pageerror', (err) => console.error('[Browser Error]:', err));

  await page.goto(`http://localhost:${VITE_PORT}`, { waitUntil: 'networkidle2' });

  // Dismiss install banner and ensure flagship theme (coral-night)
  await page.evaluate(() => {
    localStorage.setItem('previalo_a2hs_dismissed_until', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    localStorage.setItem(
      'previalo_settings',
      JSON.stringify({ state: { theme: 'coral-night', soundEnabled: true, hapticsEnabled: true }, version: 0 })
    );
  });

  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(() => typeof window.__setScreen === 'function', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const captureViewport = async (filename, description) => {
    console.log(`[Screenshots] Capturing: ${description} -> ${filename}`);
    const outPath = path.join(OUTPUT_DIR, filename);
    await page.screenshot({ path: outPath, type: 'png' });
    const stats = fs.statSync(outPath);
    console.log(`  OK ${filename} (${Math.round(stats.size / 1024)} KB)`);
  };

  // 1. HomeScreen
  await page.evaluate(() => {
    window.__setScreen('home');
  });
  await sleep(600);
  await captureViewport('01-home-screen.png', 'Pantalla principal con modos rapidos y categorias');

  // 2. SetupScreen
  await page.evaluate(() => {
    const players = [
      { id: 'p_1_alex', name: 'Alex', color: '#ff6257', avatar: '🦁', sips: 0, timesTargeted: 0 },
      { id: 'p_2_sara', name: 'Sara', color: '#7c7aff', avatar: '🦊', sips: 0, timesTargeted: 0 },
      { id: 'p_3_dani', name: 'Dani', color: '#2ecc87', avatar: '🐼', sips: 0, timesTargeted: 0 },
    ];
    window.__playerStore.setState({
      players,
      historicalPlayers: ['Alex', 'Sara', 'Dani', 'Clara', 'Nico', 'Elena'],
    });
    window.__setScreen('setup');
  });
  await sleep(600);
  await captureViewport('02-setup-screen.png', 'Configuracion de sala, intensidad y jugadores');

  // 3. GameCardsScreen with active Virus card and VirusHUD
  await page.evaluate(() => {
    const players = [
      { id: 'p_1_alex', name: 'Alex', color: '#ff6257', avatar: '🦁', sips: 0, timesTargeted: 0 },
      { id: 'p_2_sara', name: 'Sara', color: '#7c7aff', avatar: '🦊', sips: 0, timesTargeted: 0 },
      { id: 'p_3_dani', name: 'Dani', color: '#2ecc87', avatar: '🐼', sips: 0, timesTargeted: 0 },
      { id: 'p_4_clara', name: 'Clara', color: '#f59e0b', avatar: '🐯', sips: 0, timesTargeted: 0 },
    ];
    window.__playerStore.setState({ players });

    const currentCard = {
      id: 3201,
      type: 'virus',
      category_id: 'retos_y_virus',
      text: 'Sara y Alex, a partir de ahora solo podéis hablar susurrando al oído. Si alguien os escucha alzar la voz, ambos bebéis 2 tragos.',
      intensity: 2,
      drinks_penalty: 2,
      chain: {
        chain_id: 'whisper_virus',
        role: 'trigger',
        chain_type: 'timed_virus',
        min_delay_cards: 6,
        max_delay_cards: 10,
      },
    };

    const activeViruses = [
      {
        id: 'v_active_brindis',
        cardId: 3200,
        chainId: 'chain_brindis',
        ruleText: 'Dani y Clara deben brindar cruzando los brazos cada vez que beban.',
        targetPlayerId: players[2].id,
        targetPlayerName: players[2].name,
        roundsRemaining: 3,
        totalRounds: 4,
        hasResolverCard: true,
        assignedPlayers: [players[2], players[3]],
      },
    ];

    window.__gameSessionStore.setState({
      mode: 'chaos',
      modeConfig: { intensity: 2 },
      deck: [
        currentCard,
        { id: 3202, type: 'challenge', text: 'Siguiente reto', intensity: 2 },
        { id: 3203, type: 'rule', text: 'Tercera carta', intensity: 1 },
      ],
      currentIndex: 0,
      currentCard,
      interpolatedText: currentCard.text,
      assignedPlayers: [players[1], players[0]],
      calculatedDrinks: 2,
      activeViruses,
      expiredVirusesQueue: [],
      isGameOver: false,
    });

    window.__setScreen('game-cards');
  });
  await sleep(700);
  await captureViewport('03-game-cards.png', 'Partida de cartas con Virus HUD y controles inferiores fijos');

  // 4. GameBoardScreen
  await page.evaluate(async () => {
    const players = [
      { id: 'p_1_alex', name: 'Alex', color: '#ff6257', avatar: '🦁', sips: 0, timesTargeted: 0 },
      { id: 'p_2_sara', name: 'Sara', color: '#7c7aff', avatar: '🦊', sips: 0, timesTargeted: 0 },
      { id: 'p_3_dani', name: 'Dani', color: '#2ecc87', avatar: '🐼', sips: 0, timesTargeted: 0 },
      { id: 'p_4_clara', name: 'Clara', color: '#f59e0b', avatar: '🐯', sips: 0, timesTargeted: 0 },
    ];
    window.__playerStore.setState({ players });

    let tiles = [];
    try {
      const res = await fetch('/data/by_category/07_el_tablero.json');
      const data = await res.json();
      tiles = data.tiles_by_board?.guatoca_clasica || [];
    } catch (e) {
      console.warn('Tiles fetch error:', e);
    }

    window.__gameSessionStore.setState({
      mode: 'board',
      modeConfig: { boardId: 'guatoca_clasica', tiles, hotTiers: [1, 2, 3] },
      boardPositions: {
        p_1_alex: 14,
        p_2_sara: 8,
        p_3_dani: 22,
        p_4_clara: 4,
      },
      boardJails: {
        p_3_dani: 1,
      },
      currentTurnPlayerIndex: 1,
      lastDiceRoll: 4,
      isGameOver: false,
    });
    window.__setScreen('game-board');
  });
  await sleep(900);
  await captureViewport('04-game-board.png', 'El Tablero con 64 casillas, fichas y dock de dado');

  // Verification gate (> 40 KB)
  const files = ['01-home-screen.png', '02-setup-screen.png', '03-game-cards.png', '04-game-board.png'];
  let allValid = true;
  for (const f of files) {
    const fPath = path.join(OUTPUT_DIR, f);
    if (!fs.existsSync(fPath)) {
      console.error(`Missing screenshot: ${f}`);
      allValid = false;
      continue;
    }
    const stat = fs.statSync(fPath);
    if (stat.size < 40000) {
      console.error(`File too small (${stat.size} bytes): ${f}`);
      allValid = false;
    } else {
      console.log(`Verified ${f} - ${Math.round(stat.size / 1024)} KB`);
    }
  }

  await browser.close();
  if (viteServer) await viteServer.close();

  if (allValid) {
    console.log('[Screenshots] All 4 frameless mobile screenshots generated successfully.');
    process.exit(0);
  } else {
    console.error('[Screenshots] Verification failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in screenshot generator:', err);
  process.exit(1);
});
