import type {
  Card,
  Player,
  ActiveVirus,
  BoardTile,
  IntensityLevel,
  ThemeId,
  CardTransitionResult,
  BoardMoveResult,
} from './e2e-contracts';
import { CatalogProvider } from './catalog-provider';

export interface GameSessionConfig {
  players: string[];
  intensity: IntensityLevel;
  deckCards?: Card[];
}

export interface HistorySnapshot {
  cardIndex: number;
  card: Card;
  rawText: string;
  interpolatedText: string;
  assignedPlayers: Player[];
  calculatedDrinks: number;
  activeViruses: ActiveVirus[];
  playerSipCounts: Record<string, number>;
}

export class E2EGameDriver {
  private players: Player[] = [];
  private intensity: IntensityLevel = 2;
  private deck: Card[] = [];
  private currentIndex: number = -1;
  private activeViruses: ActiveVirus[] = [];
  private historyStack: HistorySnapshot[] = [];
  private playerPickCounts: Map<string, number> = new Map();
  private playerLastPickedTurn: Map<string, number> = new Map();
  private currentTurnNumber: number = 0;
  private currentTheme: ThemeId = 'cyber-neon';
  private activeBoard: BoardTile[] = [];
  private boardTurnPlayerIndex: number = 0;

  // Real-world neon themes CSS color tokens
  public static readonly THEME_TOKENS: Record<ThemeId, Record<string, string>> = {
    'cyber-neon': {
      '--bg-primary': '#0b0f19',
      '--surface-primary': '#111827',
      '--accent-primary': '#ec4899',
      '--accent-glow': 'rgba(236, 72, 153, 0.4)',
    },
    'electric-purple': {
      '--bg-primary': '#0d0b1a',
      '--surface-primary': '#18122b',
      '--accent-primary': '#a855f7',
      '--accent-glow': 'rgba(168, 85, 247, 0.4)',
    },
    'acid-lime': {
      '--bg-primary': '#08100c',
      '--surface-primary': '#0f1f18',
      '--accent-primary': '#84cc16',
      '--accent-glow': 'rgba(132, 204, 22, 0.4)',
    },
    'sunset-hot': {
      '--bg-primary': '#160b0e',
      '--surface-primary': '#241217',
      '--accent-primary': '#f97316',
      '--accent-glow': 'rgba(249, 115, 22, 0.4)',
    },
    'day-mode': {
      '--bg-primary': '#f8fafc',
      '--surface-primary': '#ffffff',
      '--accent-primary': '#db2777',
      '--accent-glow': 'rgba(219, 39, 119, 0.2)',
    },
  };

  public initCardsSession(config: GameSessionConfig): void {
    if (!config.players || config.players.length === 0) {
      throw new Error('At least 1 player is required to start a game session');
    }
    const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    this.players = config.players.map((name, idx) => ({
      id: `p_${idx + 1}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      color: colors[idx % colors.length],
      sipCount: 0,
      targetCount: 0,
      jailTurns: 0,
      boardPosition: 1,
    }));

    this.intensity = config.intensity;
    this.deck = config.deckCards ? [...config.deckCards] : [];
    this.currentIndex = -1;
    this.activeViruses = [];
    this.historyStack = [];
    this.playerPickCounts.clear();
    this.playerLastPickedTurn.clear();
    this.currentTurnNumber = 0;

    for (const p of this.players) {
      this.playerPickCounts.set(p.id, 0);
      this.playerLastPickedTurn.set(p.id, -1);
    }
  }

  public getPlayers(): Player[] {
    return [...this.players];
  }

  public getPlayer(idOrName: string): Player | undefined {
    return this.players.find((p) => p.id === idOrName || p.name === idOrName);
  }

  public getDeck(): Card[] {
    return [...this.deck];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getActiveViruses(): ActiveVirus[] {
    return [...this.activeViruses];
  }

  public getHistoryLength(): number {
    return this.historyStack.length;
  }

  // --- Fisher-Yates Shuffle Engine ---
  public shuffle<T>(array: T[], seed?: number): T[] {
    const copy = [...array];
    let s = seed !== undefined ? seed : Date.now();
    const pseudoRand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    for (let i = copy.length - 1; i > 0; i--) {
      const rand = seed !== undefined ? pseudoRand() : Math.random();
      const j = Math.floor(rand * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // --- Mode Deck Builders ---
  public buildCategoryDeck(
    cards: Card[],
    filter?: { intensity?: IntensityLevel; packIds?: string[] }
  ): Card[] {
    let result = cards;
    if (filter?.intensity) {
      result = result.filter((c) => c.intensity === filter.intensity);
    }
    if (filter?.packIds && filter.packIds.length > 0) {
      result = result.filter((c) => c.pack_id && filter.packIds!.includes(c.pack_id));
    }
    return this.shuffle(result);
  }

  public buildPresetDeck(cards: Card[], filter?: { intensity?: IntensityLevel }): Card[] {
    let result = cards;
    if (filter?.intensity) {
      result = result.filter((c) => c.intensity === filter.intensity);
    }
    return this.shuffle(result);
  }

  public buildChaosDeck(
    categoriesCards: Record<string, Card[]>,
    filter?: { intensity?: IntensityLevel }
  ): Card[] {
    // Filter cards and exclude 'guerra_equipos'
    const pools: Record<string, Card[]> = {};
    for (const [catId, cards] of Object.entries(categoriesCards)) {
      if (catId === 'guerra_equipos') continue;
      let filtered = cards.filter((c) => !c.exclude_from_chaos);
      if (filter?.intensity !== undefined) {
        filtered = filtered.filter((c) => c.intensity === filter.intensity);
      }
      if (filtered.length > 0) {
        pools[catId] = this.shuffle(filtered);
      }
    }

    const categoryKeys = Object.keys(pools);
    if (categoryKeys.length === 0) return [];

    const chaosDeck: Card[] = [];
    const poolIndices: Record<string, number> = {};
    categoryKeys.forEach((k) => (poolIndices[k] = 0));

    let consecutiveCategoryCount = 0;
    let lastCategoryId = '';

    let safety = 0;
    const maxCards = Object.values(pools).reduce((acc, p) => acc + p.length, 0);

    while (chaosDeck.length < maxCards && safety < maxCards * 2) {
      safety++;
      const otherCategories = categoryKeys.filter(
        (k) => k !== lastCategoryId && poolIndices[k] < pools[k].length
      );

      let pickedCat: string;
      if (consecutiveCategoryCount >= 2 && otherCategories.length > 0) {
        // Bias towards category switch when at 2 or more consecutive, weighted by remaining cards
        const totalRem = otherCategories.reduce((acc, k) => acc + (pools[k].length - poolIndices[k]), 0);
        let r = Math.random() * totalRem;
        pickedCat = otherCategories[0];
        for (const k of otherCategories) {
          r -= (pools[k].length - poolIndices[k]);
          if (r <= 0) {
            pickedCat = k;
            break;
          }
        }
      } else {
        const available = categoryKeys.filter(
          (k) => poolIndices[k] < pools[k].length && (k !== lastCategoryId || consecutiveCategoryCount < 3)
        );
        if (available.length === 0) {
          // If only lastCategoryId remains and it has reached 3 consecutive, break to uphold invariant
          break;
        }
        const totalRem = available.reduce((acc, k) => acc + (pools[k].length - poolIndices[k]), 0);
        let r = Math.random() * totalRem;
        pickedCat = available[0];
        for (const k of available) {
          r -= (pools[k].length - poolIndices[k]);
          if (r <= 0) {
            pickedCat = k;
            break;
          }
        }
      }

      const card = { ...pools[pickedCat][poolIndices[pickedCat]++] };
      card.category_id = card.category_id || pickedCat;
      chaosDeck.push(card);

      if (pickedCat === lastCategoryId) {
        consecutiveCategoryCount++;
      } else {
        lastCategoryId = pickedCat;
        consecutiveCategoryCount = 1;
      }
    }

    return chaosDeck;
  }

  // --- Variable Replacer Engine ---
  public pickWeightedPlayer(
    excludeIds: Set<string> = new Set()
  ): Player {
    const candidates = this.players.filter((p) => !excludeIds.has(p.id));
    if (candidates.length === 0) {
      return this.players[Math.floor(Math.random() * this.players.length)];
    }

    // Fairness formula: W_p = 1 / (C_p + 1) * (1 + 0.2 * min(T_p, 5))
    const weights: number[] = [];
    for (const c of candidates) {
      const picks = this.playerPickCounts.get(c.id) || 0;
      const lastTurn = this.playerLastPickedTurn.get(c.id) ?? -1;
      const cooldownTurns = lastTurn === -1 ? 5 : this.currentTurnNumber - lastTurn;
      const w = (1 / (picks + 1)) * (1 + 0.2 * Math.min(cooldownTurns, 5));
      weights.push(w);
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        return candidates[i];
      }
    }
    return candidates[candidates.length - 1];
  }

  public calculateDrinkPenalty(card: Card, intensity: IntensityLevel): number {
    const base = card.drinks_penalty ?? 1;
    switch (intensity) {
      case 1: // Chill
        return 1;
      case 2: // Fiesta
        return Math.max(1, Math.min(base, 2));
      case 3: // Hot
        return Math.max(2, Math.min(base + 1, 3));
      case 4: // Extremo
        return Math.max(3, base + 2);
      default:
        return base;
    }
  }

  public interpolateCardText(
    card: Card,
    turnIndex: number
  ): {
    interpolatedText: string;
    assignedPlayers: Player[];
    calculatedDrinks: number;
  } {
    let text = card.text;
    const assignedPlayers: Player[] = [];
    const usedIds = new Set<string>();

    // 1. {player1}
    if (text.includes('{player1}')) {
      const p1 = this.pickWeightedPlayer(usedIds);
      usedIds.add(p1.id);
      assignedPlayers.push(p1);
      text = text.replace(/\{player1\}/g, p1.name);
    }

    // 2. {player2} - strict distinctness
    if (text.includes('{player2}')) {
      const p2 = this.pickWeightedPlayer(usedIds);
      usedIds.add(p2.id);
      assignedPlayers.push(p2);
      text = text.replace(/\{player2\}/g, p2.name);
    }

    // 3. {player3} - distinctness if >= 3 players
    if (text.includes('{player3}')) {
      const p3 = this.pickWeightedPlayer(usedIds);
      usedIds.add(p3.id);
      assignedPlayers.push(p3);
      text = text.replace(/\{player3\}/g, p3.name);
    }

    // 4. {player4} - distinctness if >= 4 players
    if (text.includes('{player4}')) {
      const p4 = this.pickWeightedPlayer(usedIds);
      usedIds.add(p4.id);
      assignedPlayers.push(p4);
      text = text.replace(/\{player4\}/g, p4.name);
    }

    // 5. {drinks}
    const drinks = this.calculateDrinkPenalty(card, this.intensity);
    const drinksLabel = drinks === 1 ? '1 trago' : `${drinks} tragos`;
    text = text.replace(/\{drinks\}/g, drinksLabel);

    // 6. {team}
    if (text.includes('{team}')) {
      const teams = ['Equipo Neón', 'Equipo Fuego'];
      const teamPick = teams[turnIndex % teams.length];
      text = text.replace(/\{team\}/g, teamPick);
    }

    return {
      interpolatedText: text,
      assignedPlayers,
      calculatedDrinks: drinks,
    };
  }

  // --- Card Progression & Virus Lifecycle ---
  public nextCard(): CardTransitionResult {
    if (this.deck.length === 0) {
      throw new Error('Deck is empty');
    }
    if (this.currentIndex >= this.deck.length - 1) {
      throw new Error('End of deck reached');
    }

    this.currentIndex++;
    this.currentTurnNumber++;
    const card = this.deck[this.currentIndex];

    // Snapshot sip counts before this card
    const snapshotSips: Record<string, number> = {};
    for (const p of this.players) {
      snapshotSips[p.id] = p.sipCount;
    }

    // Interpolate tokens
    const { interpolatedText, assignedPlayers, calculatedDrinks } = this.interpolateCardText(
      card,
      this.currentTurnNumber
    );

    // Update player pick tracking
    for (const p of assignedPlayers) {
      const currentPicks = this.playerPickCounts.get(p.id) || 0;
      this.playerPickCounts.set(p.id, currentPicks + 1);
      this.playerLastPickedTurn.set(p.id, this.currentTurnNumber);
      p.targetCount++;
      // Award drinks to primary target if applicable
      if (card.target === 'active_player' || card.target === 'pair') {
        p.sipCount += calculatedDrinks;
      }
    }

    // Virus lifecycle:
    // 1. Tick existing active viruses
    const updatedViruses: ActiveVirus[] = [];
    const expiredViruses: ActiveVirus[] = [];

    for (const v of this.activeViruses) {
      const remaining = v.roundsRemaining - 1;
      if (remaining <= 0) {
        expiredViruses.push({ ...v, roundsRemaining: 0 });
      } else {
        updatedViruses.push({ ...v, roundsRemaining: remaining });
      }
    }

    // 2. Register new virus if drawn card is virus
    const isVirusCard = card.type === 'virus' || card.chain?.chain_type === 'timed_virus';
    if (isVirusCard) {
      const duration = card.chain?.min_delay_cards ?? 3;
      const primaryTarget = assignedPlayers[0];
      const newVirus: ActiveVirus = {
        id: `virus_${card.id}_${this.currentTurnNumber}`,
        cardId: card.id,
        ruleText: interpolatedText,
        targetPlayerId: primaryTarget?.id,
        targetPlayerName: primaryTarget?.name,
        roundsRemaining: duration,
        totalRounds: duration,
      };
      updatedViruses.push(newVirus);
    }

    this.activeViruses = updatedViruses;

    // Save to history stack for undo
    this.historyStack.push({
      cardIndex: this.currentIndex,
      card,
      rawText: card.text,
      interpolatedText,
      assignedPlayers: [...assignedPlayers],
      calculatedDrinks,
      activeViruses: this.activeViruses.map((v) => ({ ...v })),
      playerSipCounts: snapshotSips,
    });

    return {
      card,
      rawText: card.text,
      interpolatedText,
      assignedPlayers,
      calculatedDrinks,
      activeViruses: [...this.activeViruses],
      expiredViruses,
    };
  }

  // --- Undo Engine ---
  public undoCard(): boolean {
    if (this.historyStack.length <= 1) {
      return false; // Cannot undo at beginning
    }

    // Pop current snapshot
    this.historyStack.pop();
    // Prior snapshot is now the active state
    const prior = this.historyStack[this.historyStack.length - 1];

    this.currentIndex = prior.cardIndex;
    this.activeViruses = prior.activeViruses.map((v) => ({ ...v }));

    // Revert sip counts
    for (const p of this.players) {
      p.sipCount = prior.playerSipCounts[p.id] ?? p.sipCount;
    }

    return true;
  }

  // --- Hot-Join Player Mid-Game ---
  public hotJoinPlayer(name: string): Player {
    const idx = this.players.length + 1;
    const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const newPlayer: Player = {
      id: `p_${idx}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      color: colors[(idx - 1) % colors.length],
      sipCount: 0,
      targetCount: 0,
      jailTurns: 0,
      boardPosition: 1,
    };
    this.players.push(newPlayer);
    this.playerPickCounts.set(newPlayer.id, 0);
    this.playerLastPickedTurn.set(newPlayer.id, -1);
    return newPlayer;
  }

  // --- Manual Sip Adjustment [+1] / [-1] ---
  public adjustSips(playerId: string, delta: number): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (p) {
      p.sipCount = Math.max(0, p.sipCount + delta);
    }
  }

  // --- Neon Theming ---
  public setTheme(theme: ThemeId): void {
    if (!E2EGameDriver.THEME_TOKENS[theme]) {
      throw new Error(`Unknown theme: ${theme}`);
    }
    this.currentTheme = theme;
  }

  public getTheme(): ThemeId {
    return this.currentTheme;
  }

  public getThemeCSSVariables(): Record<string, string> {
    return E2EGameDriver.THEME_TOKENS[this.currentTheme];
  }

  // --- Board Engine (La Guatoca) ---
  public initBoardSession(boardId: 'guatoca_clasica' | 'guatoca_hot', players: string[]): void {
    this.activeBoard = CatalogProvider.getBoardTiles(boardId);
    this.initCardsSession({ players, intensity: 2 });
    this.boardTurnPlayerIndex = 0;
  }

  public getActiveBoard(): BoardTile[] {
    return this.activeBoard;
  }

  public rollDice(forcedRoll?: number): number {
    if (forcedRoll !== undefined) {
      if (forcedRoll < 1 || forcedRoll > 6 || !Number.isInteger(forcedRoll)) {
        throw new Error('Forced dice roll must be an integer between 1 and 6');
      }
      return forcedRoll;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  public calculateDestination(currentPos: number, roll: number, totalTiles: number): number {
    const rawTarget = currentPos + roll;
    if (rawTarget > totalTiles) {
      // Overshoot bounce-back: destination = totalTiles - (rawTarget - totalTiles)
      return totalTiles - (rawTarget - totalTiles);
    }
    return rawTarget;
  }

  public resolveTile(tile: BoardTile): {
    actionType: string;
    destination: number;
    extraRoll: boolean;
    turnsLost: number;
    drinks: number;
  } {
    const baseDrinks = tile.drinks_action || 0;
    switch (tile.tile_type) {
      case 'jump':
        return {
          actionType: 'jump',
          destination: tile.action_jump_to ?? tile.tile_number,
          extraRoll: true,
          turnsLost: 0,
          drinks: baseDrinks,
        };
      case 'trap_jail':
        return {
          actionType: 'trap_jail',
          destination: tile.tile_number,
          extraRoll: false,
          turnsLost: tile.turns_lost > 0 ? tile.turns_lost : 1,
          drinks: baseDrinks || 2,
        };
      case 'trap_skull':
        return {
          actionType: 'trap_skull',
          destination: 1, // Reset to Salida
          extraRoll: false,
          turnsLost: 0,
          drinks: baseDrinks || 3,
        };
      case 'trap_back':
        return {
          actionType: 'trap_back',
          destination: tile.action_jump_to ?? Math.max(1, tile.tile_number - 3),
          extraRoll: false,
          turnsLost: 0,
          drinks: baseDrinks || 1,
        };
      case 'finish':
        return {
          actionType: 'finish',
          destination: tile.tile_number,
          extraRoll: false,
          turnsLost: 0,
          drinks: 0,
        };
      default:
        return {
          actionType: tile.tile_type,
          destination: tile.tile_number,
          extraRoll: false,
          turnsLost: 0,
          drinks: baseDrinks,
        };
    }
  }

  public playBoardTurn(forcedRoll?: number): BoardMoveResult {
    const player = this.players[this.boardTurnPlayerIndex];
    const totalTiles = this.activeBoard.length;

    // Check jail lock
    if (player.jailTurns && player.jailTurns > 0) {
      player.jailTurns--;
      // Advance to next player
      this.boardTurnPlayerIndex = (this.boardTurnPlayerIndex + 1) % this.players.length;
      return {
        player,
        roll: 0,
        startPosition: player.boardPosition || 1,
        calculatedDestination: player.boardPosition || 1,
        finalPosition: player.boardPosition || 1,
        actionType: 'jail_skip',
        turnsLost: player.jailTurns,
        drinks: 0,
        extraRoll: false,
        isVictory: false,
      };
    }

    const startPos = player.boardPosition || 1;
    const roll = this.rollDice(forcedRoll);
    const calculatedDest = this.calculateDestination(startPos, roll, totalTiles);

    // Find destination tile (1-indexed)
    const destTile = this.activeBoard.find((t) => t.tile_number === calculatedDest) || {
      id: calculatedDest,
      board_id: this.activeBoard[0].board_id,
      tile_number: calculatedDest,
      tile_type: calculatedDest === totalTiles ? 'finish' : 'challenge',
      title: `Casilla ${calculatedDest}`,
      description: '',
      drinks_action: 1,
      target: 'active_player',
      action_jump_to: null,
      turns_lost: 0,
      icon: 'dice',
    };

    const resolution = this.resolveTile(destTile);
    const finalPos = resolution.destination;

    player.boardPosition = finalPos;
    player.sipCount += resolution.drinks;
    if (resolution.turnsLost > 0) {
      player.jailTurns = resolution.turnsLost;
    }

    const isVictory = finalPos === totalTiles;

    // If extra roll not granted and not won, pass to next player
    if (!resolution.extraRoll && !isVictory) {
      this.boardTurnPlayerIndex = (this.boardTurnPlayerIndex + 1) % this.players.length;
    }

    return {
      player,
      roll,
      startPosition: startPos,
      calculatedDestination: calculatedDest,
      finalPosition: finalPos,
      actionType: resolution.actionType,
      turnsLost: resolution.turnsLost,
      drinks: resolution.drinks,
      extraRoll: resolution.extraRoll,
      isVictory,
    };
  }

  // --- Podium Statistics ---
  public getPodiumStats(): {
    topDrinker: Player;
    mostTargeted: Player;
    totalSips: number;
    leaderboard: Player[];
  } {
    const sortedDrinker = [...this.players].sort((a, b) => b.sipCount - a.sipCount);
    const sortedTargeted = [...this.players].sort((a, b) => b.targetCount - a.targetCount);
    const totalSips = this.players.reduce((sum, p) => sum + p.sipCount, 0);

    return {
      topDrinker: sortedDrinker[0],
      mostTargeted: sortedTargeted[0],
      totalSips,
      leaderboard: sortedDrinker,
    };
  }
}
