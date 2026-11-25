import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { DeviceFrameServer } = require('device-frame-pro');

const VITE_PORT = 5173;
const DEVICE_FRAME_PORT = 4300;
const DEVICE_ID = 'iphone-15-pro';
const OUTPUT_DIR = path.resolve('docs/screenshots');

async function isPortOpen(port) {
  try {
    const res = await fetch(`http://localhost:${port}/health`).catch(() => null);
    if (res && res.ok) return true;
    const resRoot = await fetch(`http://localhost:${port}/`).catch(() => null);
    return resRoot !== null;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 [Screenshots] Starting automated mobile capture pipeline...');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Vite dev server check / start
  let viteServer = null;
  const isViteRunning = await isPortOpen(VITE_PORT);
  if (!isViteRunning) {
    console.log(`📡 Launching local Vite dev server on port ${VITE_PORT}...`);
    viteServer = await createServer({
      server: { port: VITE_PORT },
      logLevel: 'error',
    });
    await viteServer.listen();
    console.log(`✅ Vite ready on http://localhost:${VITE_PORT}`);
  } else {
    console.log(`✅ Existing Vite dev server detected on http://localhost:${VITE_PORT}`);
  }

  // 2. DeviceFrameServer start
  let dfServer = null;
  const isDfRunning = await isPortOpen(DEVICE_FRAME_PORT);
  if (!isDfRunning) {
    console.log(`📱 Launching DeviceFrame Pro emulator server on port ${DEVICE_FRAME_PORT}...`);
    dfServer = new DeviceFrameServer({
      port: DEVICE_FRAME_PORT,
      targetUrl: `http://localhost:${VITE_PORT}`,
      autoOpen: false,
      screenshots: true,
    });
    await dfServer.start();
    console.log(`✅ DeviceFrame Pro ready on http://localhost:${DEVICE_FRAME_PORT}`);
  } else {
    console.log(`✅ DeviceFrame Pro already running on http://localhost:${DEVICE_FRAME_PORT}`);
  }

  // 3. Launch Puppeteer
  console.log('🌐 Launching headless browser for iPhone framing...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1200, deviceScaleFactor: 2 });

  page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
  page.on('pageerror', (err) => console.error('[Browser Error]:', err));

  // Navigate to DeviceFrame preview page
  await page.goto(`http://localhost:${DEVICE_FRAME_PORT}`, { waitUntil: 'networkidle2' });

  // Select device and configure styling for iPhone OLED aesthetic
  console.log(`📱 Configuring device frame: ${DEVICE_ID}...`);
  await page.evaluate((devId) => {
    window.selectDevice(devId);
    if (typeof window.setZoom === 'function') {
      window.setZoom(1.0);
    }
  }, DEVICE_ID);

  await sleep(1500);

  // Apply authentic iPhone 15 Pro Dynamic Island and iOS status bar styling
  await page.evaluate(() => {
    // 1. Style Bezel (Titanium frame)
    const bezel = document.querySelector('.device-bezel');
    if (bezel) {
      bezel.style.cssText = `
        position: relative !important;
        background: linear-gradient(145deg, #2b2a2f 0%, #161519 50%, #222126 100%) !important;
        border-radius: 54px !important;
        padding: 12px !important;
        width: 417px !important;
        height: 876px !important;
        box-shadow: 0 25px 70px rgba(0,0,0,0.65), inset 0 0 0 1.5px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.3) !important;
        box-sizing: border-box !important;
      `;
    }

    // 2. Style Screen Container (Exact iPhone 15 Pro resolution: 393 x 852)
    const screenContainer = document.querySelector('.device-screen-container');
    if (screenContainer) {
      screenContainer.style.cssText = `
        position: relative !important;
        width: 393px !important;
        height: 852px !important;
        border-radius: 44px !important;
        background: #090d16 !important;
        overflow: hidden !important;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.6) !important;
      `;
    }

    // 3. Dynamic Island (Pill shape floating at top)
    let dynamicIsland = document.querySelector('.device-notch');
    if (dynamicIsland) {
      dynamicIsland.className = 'device-notch dynamic-island';
      dynamicIsland.style.cssText = `
        position: absolute !important;
        top: 11px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 124px !important;
        height: 35px !important;
        background: #000000 !important;
        border-radius: 20px !important;
        z-index: 60 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        padding-right: 14px !important;
        box-shadow: 0 0 1px rgba(255,255,255,0.15) !important;
      `;
      const speaker = dynamicIsland.querySelector('.notch-speaker');
      if (speaker) speaker.style.display = 'none';
      const camera = dynamicIsland.querySelector('.notch-camera');
      if (camera) {
        camera.style.cssText = `
          width: 11px !important;
          height: 11px !important;
          border-radius: 50% !important;
          background: radial-gradient(circle at 35% 35%, #182848, #060b13) !important;
          box-shadow: inset 0 0 2px rgba(255,255,255,0.2) !important;
          position: static !important;
        `;
      }
    }

    // 4. Status Bar (Authentic iOS layout: 9:41 on left, vector icons on right)
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      statusBar.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 54px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 0 28px 0 32px !important;
        background: transparent !important;
        z-index: 55 !important;
        pointer-events: none !important;
      `;

      statusBar.innerHTML = `
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; letter-spacing: -0.2px;">9:41</span>
        <div style="display: flex; align-items: center; gap: 7px;">
          <!-- iOS Cellular Signal -->
          <svg width="17" height="11" viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="8" width="3" height="3" rx="1" fill="white"/>
            <rect x="4.5" y="5.5" width="3" height="5.5" rx="1" fill="white"/>
            <rect x="9" y="3" width="3" height="8" rx="1" fill="white"/>
            <rect x="13.5" y="0" width="3" height="11" rx="1" fill="white"/>
          </svg>
          <!-- iOS Wi-Fi -->
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M8 1.5C10.7 1.5 13.1 2.6 14.9 4.4L16 3.2C13.9 1.2 11.1 0 8 0C4.9 0 2.1 1.2 0 3.2L1.1 4.4C2.9 2.6 5.3 1.5 8 1.5ZM8 5C9.7 5 11.3 5.7 12.5 6.9L13.6 5.7C12.1 4.2 10.2 3.3 8 3.3C5.8 3.3 3.9 4.2 2.4 5.7L3.5 6.9C4.7 5.7 6.3 5 8 5ZM8 8.5C9 8.5 9.9 8.9 10.6 9.6L11.7 8.4C10.7 7.5 9.4 6.9 8 6.9C6.6 6.9 5.3 7.5 4.3 8.4L5.4 9.6C6.1 8.9 7 8.5 8 8.5ZM8 10.3C7.3 10.3 6.8 10.8 6.8 11.5C6.8 12.2 7.3 12.7 8 12.7C8.7 12.7 9.2 12.2 9.2 11.5C9.2 10.8 8.7 10.3 8 10.3Z" fill="white"/>
          </svg>
          <!-- iOS Battery -->
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" stroke-opacity="0.85"/>
            <rect x="2.5" y="2.5" width="16" height="7" rx="2" fill="white"/>
            <path d="M23 4C23.6 4.3 24 5 24 5.8V6.2C24 7 23.6 7.7 23 8V4Z" fill="white" fill-opacity="0.85"/>
          </svg>
        </div>
      `;
    }

    // Override preview.html time interval so 9:41 remains frozen
    window.getCurrentTime = () => '9:41';
    window.updateStatusBarTime = () => {};

    // 5. Iframe edge-to-edge under status bar / dynamic island
    const iframe = document.querySelector('.device-screen');
    if (iframe && screenContainer) {
      iframe.style.cssText = `
        position: absolute !important;
        top: 48px !important;
        left: 0 !important;
        width: 100% !important;
        height: calc(100% - 48px) !important;
        border: none !important;
        z-index: 10 !important;
      `;
    }

    // 6. Home Indicator inside screen container
    let homeIndicator = document.querySelector('.home-indicator');
    if (!homeIndicator && screenContainer) {
      homeIndicator = document.createElement('div');
      homeIndicator.className = 'home-indicator';
      screenContainer.appendChild(homeIndicator);
    }
    if (homeIndicator) {
      if (screenContainer && homeIndicator.parentElement !== screenContainer) {
        screenContainer.appendChild(homeIndicator);
      }
      homeIndicator.style.cssText = `
        position: absolute !important;
        bottom: 8px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 136px !important;
        height: 5px !important;
        background: rgba(255, 255, 255, 0.55) !important;
        border-radius: 100px !important;
        z-index: 50 !important;
        pointer-events: none !important;
      `;
    }
  });

  await sleep(1000);

  const getIframe = async () => {
    const iframeElement = await page.$('.device-screen');
    if (!iframeElement) throw new Error('DeviceFrame iframe element not found');
    const frame = await iframeElement.contentFrame();
    if (!frame) throw new Error('Could not access iframe contentFrame');
    return frame;
  };

  const captureBezel = async (filename, description) => {
    console.log(`📸 Capturing: ${description} -> ${filename}...`);
    const bezel = await page.$('.device-bezel');
    if (!bezel) throw new Error('.device-bezel element not found');
    const outPath = path.join(OUTPUT_DIR, filename);
    await bezel.screenshot({ path: outPath, type: 'png' });
    const stats = fs.statSync(outPath);
    console.log(`   ✓ Saved ${filename} (${Math.round(stats.size / 1024)} KB)`);
  };

  // Wait for iframe app to be initialized
  let frame = await getIframe();
  await frame.waitForFunction(() => typeof window.__setScreen === 'function', { timeout: 15000 });

  // -------------------------------------------------------------
  // SCREEN 1: HomeScreen (Menú principal y catálogo de categorías)
  // -------------------------------------------------------------
  console.log('\n--- [1/4] Capturing HomeScreen ---');
  await frame.evaluate(() => {
    window.__setScreen('home');
  });
  await sleep(2000);
  await captureBezel('01-home-screen.png', 'Pantalla Principal con Catálogo de Categorías');

  // -------------------------------------------------------------
  // SCREEN 2: SetupScreen (Configuración de sala y jugadores)
  // -------------------------------------------------------------
  console.log('\n--- [2/4] Capturing SetupScreen ---');
  await frame.evaluate(() => {
    const players = [
      { id: 'p_1_alex', name: 'Alex', color: '#ec4899', avatar: '🦁', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 1 },
      { id: 'p_2_sara', name: 'Sara', color: '#8b5cf6', avatar: '🦊', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 1 },
      { id: 'p_3_dani', name: 'Dani', color: '#06b6d4', avatar: '🐼', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 1 },
    ];
    window.__playerStore.setState({
      players,
      historicalPlayers: ['Alex', 'Sara', 'Dani', 'Clara', 'Nico', 'Elena'],
    });
    window.__setScreen('setup');
  });
  await sleep(2000);
  // Ensure the primary action button is nicely framed in view
  await frame.evaluate(() => {
    const startBtn = document.querySelector('[data-testid="start-game-btn"]');
    if (startBtn) {
      startBtn.scrollIntoView({ behavior: 'instant', block: 'end' });
    }
  });
  await sleep(500);
  await captureBezel('02-setup-screen.png', 'Configuración de Jugadores y Sala de Juego');

  // -------------------------------------------------------------
  // SCREEN 3: GameCardsScreen (Partida de cartas con Virus HUD)
  // -------------------------------------------------------------
  console.log('\n--- [3/4] Capturing GameCardsScreen ---');
  const res3 = await frame.evaluate(() => {
    try {
      const players = [
        { id: 'p_1_alex', name: 'Alex', color: '#ec4899', avatar: '🦁', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 1 },
        { id: 'p_2_sara', name: 'Sara', color: '#8b5cf6', avatar: '🦊', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 1 },
        { id: 'p_3_dani', name: 'Dani', color: '#06b6d4', avatar: '🐼', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 1 },
        { id: 'p_4_clara', name: 'Clara', color: '#10b981', avatar: '🐯', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 1 },
      ];
      window.__playerStore.setState({ players });
      const currentCard = {
        id: 'virus_card_demo',
        type: 'virus',
        category_id: 'retos_y_virus',
        title: '¡Maldición de los Susurros!',
        text: 'Sara y Alex, a partir de ahora solo podéis hablar susurrando al oído. Si alguien os escucha alzar la voz, ¡ambos bebéis 2 tragos!',
        intensity: 2,
        drinks_penalty: 2,
        chain: {
          chain_id: 'whisper_virus',
          role: 'trigger',
          chain_type: 'timed_virus',
          delay_rounds: 3,
        },
      };
      const activeViruses = [
        {
          id: 'v_active_brindis',
          cardId: 'c_virus_brindis',
          chainId: 'chain_brindis',
          ruleText: 'Regla del Brindis Cruzado',
          targetPlayerId: players[2].id,
          targetPlayerName: players[2].name,
          roundsRemaining: 3,
          totalRounds: 4,
          hasResolverCard: false,
          icon: '☣️',
          assignedPlayers: [players[2], players[3]],
        },
      ];
      window.__gameSessionStore.setState({
        mode: 'chaos',
        modeConfig: { title: 'Modo Caos' },
        deck: [currentCard, { id: 'c2', type: 'normal', text: 'Siguiente reto', intensity: 1 }],
        currentIndex: 0,
        currentCard,
        interpolatedText: 'Sara y Alex, a partir de ahora solo podéis hablar susurrando al oído. Si alguien os escucha alzar la voz, ¡ambos bebéis 2 tragos!',
        assignedPlayers: [players[1], players[0]],
        calculatedDrinks: 2,
        activeViruses,
        expiredVirusesQueue: [],
        isGameOver: false,
      });
      window.__setScreen('game-cards');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message, stack: e.stack };
    }
  });
  console.log('Screen 3 eval result:', res3);
  await sleep(2500);
  await captureBezel('03-game-cards.png', 'Partida de Cartas con Virus HUD y Reto Dinámico');

  // -------------------------------------------------------------
  // SCREEN 4: GameBoardScreen (Modo tablero "El Tablero" con dado 3D)
  // -------------------------------------------------------------
  console.log('\n--- [4/4] Capturing GameBoardScreen ---');
  const res4 = await frame.evaluate(async () => {
    try {
      const players = [
        { id: 'p_1_alex', name: 'Alex', color: '#ec4899', avatar: '🦁', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 14 },
        { id: 'p_2_sara', name: 'Sara', color: '#8b5cf6', avatar: '🦊', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 8 },
        { id: 'p_3_dani', name: 'Dani', color: '#06b6d4', avatar: '🐼', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 22 },
        { id: 'p_4_clara', name: 'Clara', color: '#10b981', avatar: '🐯', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, jailTurns: 0, boardPosition: 4 },
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
          'p_1_alex': 14,
          'p_2_sara': 8,
          'p_3_dani': 22,
          'p_4_clara': 4,
        },
        boardJails: {
          'p_3_dani': 1,
        },
        currentTurnPlayerIndex: 1, // Sara's turn
        lastDiceRoll: 4,
        isGameOver: false,
      });
      window.__setScreen('game-board');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message, stack: e.stack };
    }
  });
  console.log('Screen 4 eval result:', res4);


  await sleep(2500);
  await captureBezel('04-game-board.png', 'El Tablero con Dado 3D, Casillas y Fichas');

  // Verify all files
  console.log('\n--- Verifying Generated Screenshots ---');
  const files = ['01-home-screen.png', '02-setup-screen.png', '03-game-cards.png', '04-game-board.png'];
  let allValid = true;
  for (const f of files) {
    const fPath = path.join(OUTPUT_DIR, f);
    if (!fs.existsSync(fPath)) {
      console.error(`❌ Missing screenshot: ${f}`);
      allValid = false;
      continue;
    }
    const stat = fs.statSync(fPath);
    if (stat.size < 50000) {
      console.error(`⚠️ File suspiciously small (${stat.size} bytes): ${f}`);
      allValid = false;
    } else {
      console.log(`✅ ${f} - ${Math.round(stat.size / 1024)} KB (Valid PNG)`);
    }
  }

  // Cleanup
  console.log('\n🛑 Cleaning up background processes...');
  await browser.close();
  if (dfServer) await dfServer.stop();
  if (viteServer) await viteServer.close();

  if (allValid) {
    console.log('🎉 [Screenshots] All 4 framed iPhone screenshots generated successfully!\n');
    process.exit(0);
  } else {
    console.error('❌ Some screenshots failed verification.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in screenshot generator:', err);
  process.exit(1);
});
