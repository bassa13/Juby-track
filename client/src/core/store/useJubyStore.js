import { create } from 'zustand';
import { uid } from '../utils/timeUtils.js';
import { computeCharges, getCurrentSnookerRate } from '../utils/costCalculator.js';

const STORAGE_KEY = 'juby-club-v1';
const SESSION_KEY = 'juby-session';
const LANG_KEY = 'juby-lang';

const DEFAULT_STATE = {
  staff: [
    { id: 'admin', username: 'admin', password: 'admin', name: 'Administrator', role: 'admin', createdAt: Date.now() }
  ],
  players: [],
  games: [],
  payments: [],
  shifts: [],
  tables: [
    { id: 'P1', label: 'Pool 1', type: '8ball', queue: [] },
    { id: 'P2', label: 'Pool 2', type: '8ball', queue: [] },
    { id: 'P3', label: 'Pool 3', type: '8ball', queue: [] },
    { id: 'P4', label: 'Pool 4', type: '8ball', queue: [] },
    { id: 'SN', label: 'Snooker', type: 'snooker', queue: [], tvEnabled: true }
  ],
  smsTemplates: [
    { id: 'fr1', lang: 'fr', title: 'Rappel dette', body: "Bonjour {name}, vous avez un solde impaye de {balance} dh chez Juby Club. Merci de passer regler votre compte des que possible." },
    { id: 'fr2', lang: 'fr', title: 'Anniversaire', body: "Bonjour {name}, toute l equipe Juby Club vous souhaite un tres joyeux anniversaire. Passez quand vous voulez profiter d une partie offerte." },
    { id: 'fr3', lang: 'fr', title: 'Bienvenue', body: "Bienvenue {name} chez Juby Club. Profitez bien de votre partie et a tres bientot." },
    { id: 'fr4', lang: 'fr', title: 'Tournoi a venir', body: "Bonjour {name}, un tournoi est organise ce week-end chez Juby Club. Inscrivez-vous a l accueil avant vendredi." },
    { id: 'fr5', lang: 'fr', title: 'Promotion du jour', body: "Bonjour {name}, profitez aujourd hui d une remise speciale chez Juby Club. A tres vite." },
    { id: 'fr6', lang: 'fr', title: 'Remerciement', body: "Merci {name} pour votre visite chez Juby Club. Au plaisir de vous revoir bientot." },
    { id: 'fr7', lang: 'fr', title: 'Reservation confirmee', body: "Bonjour {name}, votre reservation chez Juby Club est confirmee. A bientot." },
    { id: 'fr8', lang: 'fr', title: 'Heures d ouverture', body: "Bonjour {name}, Juby Club est ouvert tous les jours de 10h a 02h. Au plaisir de vous accueillir." },
    { id: 'fr9', lang: 'fr', title: 'Solde positif', body: "Bonjour {name}, vous disposez d un credit de {credit} dh chez Juby Club. Bienvenue quand vous voulez en profiter." },
    { id: 'fr10', lang: 'fr', title: 'Relance amicale', body: "Bonjour {name}, ca fait un moment qu on ne vous a pas vu chez Juby Club. Passez prendre un cafe et faire une partie." },
    { id: 'en1', lang: 'en', title: 'Debt reminder', body: "Hello {name}, you have an unpaid balance of {balance} dh at Juby Club. Please come settle your account as soon as you can." },
    { id: 'en2', lang: 'en', title: 'Birthday', body: "Hello {name}, the whole Juby Club team wishes you a very happy birthday. Drop by anytime for a free game on us." },
    { id: 'en3', lang: 'en', title: 'Welcome', body: "Welcome {name} to Juby Club. Enjoy your game and see you soon." },
    { id: 'en4', lang: 'en', title: 'Upcoming tournament', body: "Hello {name}, a tournament is scheduled this weekend at Juby Club. Register at the front desk before Friday." },
    { id: 'en5', lang: 'en', title: 'Daily promo', body: "Hello {name}, take advantage of today s special discount at Juby Club. See you soon." },
    { id: 'en6', lang: 'en', title: 'Thank you', body: "Thank you {name} for your visit to Juby Club. Looking forward to seeing you again." },
    { id: 'en7', lang: 'en', title: 'Booking confirmed', body: "Hello {name}, your reservation at Juby Club is confirmed. See you soon." },
    { id: 'en8', lang: 'en', title: 'Opening hours', body: "Hello {name}, Juby Club is open every day from 10am to 2am. Looking forward to welcoming you." },
    { id: 'en9', lang: 'en', title: 'Credit available', body: "Hello {name}, you have a credit of {credit} dh at Juby Club. Welcome whenever you want to use it." },
    { id: 'en10', lang: 'en', title: 'Friendly reminder', body: "Hello {name}, it has been a while since we saw you at Juby Club. Stop by for a coffee and a game." }
  ],
  settings: {
    jetonPrice: 5,
    framePrice: 25,
    snookerDayRate: 15,
    snookerNightRate: 20,
    snookerDayStart: 8,
    snookerDayEnd: 16,
    discountThreshold: 50,
    discountPercent: 10,
    levels: { A3: 5, A5: 9, A7: 13, A9: 17, A10: 19 },
    tournamentName: '',
    defaultStartingJetons: 200,
    enableJetonSales: true,
    telegramBotToken: '',
    telegramChats: [],
    telegramAutoSend: true,
    telegramNotifyOpenShift: true,
    telegramNotifyCloseShift: true,
    smsApiEnabled: true,
    smsApiKey: import.meta.env.VITE_SMS_API_KEY || '',
    smsApiBaseUrl: import.meta.env.VITE_SMS_API_BASE_URL || '6zyv1d.api.infobip.com',
    smsApiSender: import.meta.env.VITE_SMS_API_SENDER || 'JubyClub',
    whatsappApiEnabled: false,
    whatsappApiKey: '',
    whatsappApiBaseUrl: '6zyv1d.api.infobip.com',
    whatsappApiSender: '',
    supabaseSyncEnabled: true,
    branding: {
      clubName: 'Juby Club',
      tagline: 'Pool & Snooker',
      logo: null,
      accentColor: '#d4af37',
      themeMode: 'dark'
    }
  },
  ui: {
    playerFilter: 'all',
    historyFilter: 'all',
    reportPeriod: 'today',
    phTable: 'all',
    phDate: '',
    phMonth: '',
    phHourFrom: '',
    phHourTo: ''
  }
};

// Initial state loader
const getInitialState = () => {
  const localData = localStorage.getItem(STORAGE_KEY);
  let parsedState = DEFAULT_STATE;
  
  if (localData) {
    try {
      const loaded = JSON.parse(localData);
      parsedState = { ...DEFAULT_STATE, ...loaded };
      parsedState.settings = { ...DEFAULT_STATE.settings, ...(loaded.settings || {}) };
      parsedState.settings.branding = { ...DEFAULT_STATE.settings.branding, ...(loaded.settings?.branding || {}) };
      parsedState.settings.levels = { ...DEFAULT_STATE.settings.levels, ...(loaded.settings?.levels || {}) };
      parsedState.ui = { ...DEFAULT_STATE.ui, ...(loaded.ui || {}) };
    } catch (e) {
      console.error("Failed to parse local storage state", e);
    }
  }

  // Load session
  const activeSessionId = localStorage.getItem(SESSION_KEY);
  let currentUser = null;
  if (activeSessionId === 'investor') {
    currentUser = { id: 'investor', username: 'investor@jubyclub.com', name: 'Investor (Viewer Only)', role: 'investor' };
  } else if (activeSessionId) {
    currentUser = parsedState.staff.find(s => s.id === activeSessionId) || null;
  }

  // Load lang
  const currentLang = localStorage.getItem(LANG_KEY) || 'fr';

  return {
    ...parsedState,
    currentUser,
    currentLang,
    pendingAction: null,
    syncStatus: 'ok',
    syncDirty: false,
    syncPaused: false
  };
};

export const useJubyStore = create((set, get) => {
  const persist = (nextState) => {
    // Exclude runtime-only fields from local storage persistence
    // eslint-disable-next-line no-unused-vars
    const { currentUser, currentLang, pendingAction, syncStatus, syncDirty, syncPaused, ...dbState } = nextState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbState));
    set({ ...nextState, syncDirty: true });
    
    // Auto sync trigger hook
    const store = get();
    if (store.onStateChanged) {
      store.onStateChanged();
    }
  };

  return {
    ...getInitialState(),

    // Callback bound by sync manager
    onStateChanged: null,

    // I18N
    setLang: (lang) => {
      localStorage.setItem(LANG_KEY, lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      set({ currentLang: lang });
    },

    // Auth Actions
    login: (username, password) => {
      const { staff } = get();
      const uLower = (username || '').toLowerCase().trim();
      
      // Investor authentication (viewer only)
      if ((uLower === 'investor' || uLower === 'investor@jubyclub.com' || uLower === 'investor@juby.com') && (password === 'investor123' || password === '7777')) {
        const investorUser = { id: 'investor', username: 'investor@jubyclub.com', name: 'Investor (Viewer Only)', role: 'investor' };
        localStorage.setItem(SESSION_KEY, 'investor');
        set({ currentUser: investorUser });
        return { success: true };
      }

      const user = staff.find(s => s.username.toLowerCase() === uLower && s.password === password);
      if (user) {
        localStorage.setItem(SESSION_KEY, user.id);
        set({ currentUser: user });
        return { success: true };
      }
      return { success: false, error: 'err_login' };
    },

    logout: () => {
      localStorage.removeItem(SESSION_KEY);
      set({ currentUser: null });
    },

    changePassword: (oldPassword, newPassword) => {
      const { currentUser, staff } = get();
      if (!currentUser || currentUser.password !== oldPassword) {
        return { success: false, error: 'err_pwd_wrong' };
      }
      const updatedStaff = staff.map(s => s.id === currentUser.id ? { ...s, password: newPassword } : s);
      const updatedUser = { ...currentUser, password: newPassword };
      
      set({ staff: updatedStaff, currentUser: updatedUser });
      persist(get());
      return { success: true };
    },

    // UI Configuration
    setPendingAction: (action) => set({ pendingAction: action }),
    
    setUIFilter: (key, value) => {
      const currentUI = get().ui;
      set({ ui: { ...currentUI, [key]: value } });
    },

    saveSettings: (newSettings) => {
      const currentSettings = get().settings;
      const mergedSettings = {
        ...currentSettings,
        ...newSettings,
        branding: { ...currentSettings.branding, ...(newSettings.branding || {}) }
      };
      set({ settings: mergedSettings });
      persist(get());
    },

    // Table CRUD Actions
    addTable: (tableLabel, tableType, billingMode = 'perHour', rate = 0) => {
      const tables = get().tables;
      const newTable = {
        id: 'T-' + uid(),
        label: tableLabel,
        type: tableType,
        queue: [],
        ...(tableType === 'playstation' ? { billingMode, rate } : {})
      };
      const updated = [...tables, newTable];
      set({ tables: updated });
      persist(get());
    },

    deleteTable: (tableId) => {
      const { tables, games } = get();
      // Check if table is in use
      const inUse = games.some(g => g.tableId === tableId && !g.endTime);
      if (inUse) {
        return { success: false, error: 'table_in_use' };
      }
      const updated = tables.filter(t => t.id !== tableId);
      set({ tables: updated });
      persist(get());
      return { success: true };
    },

    // Player CRUD Actions
    addPlayer: (playerData) => {
      const { players, currentUser } = get();
      const existing = playerData.id ? players.find(p => p.id === playerData.id) : null;
      let updated;
      let resultPlayer;
      
      if (existing) {
        resultPlayer = { ...existing, ...playerData };
        updated = players.map(p => p.id === playerData.id ? resultPlayer : p);
      } else {
        resultPlayer = {
          id: playerData.id || uid(),
          name: (playerData.name || '').trim(),
          lastname: (playerData.lastname || '').trim(),
          phone: (playerData.phone || '').trim(),
          photo: playerData.photo || null,
          birthdate: playerData.birthdate || '',
          isStaff: Boolean(playerData.isStaff),
          createdByStaffId: currentUser?.id || 'admin',
          createdAt: Date.now()
        };
        updated = [...players, resultPlayer];
      }
      set({ players: updated });
      persist(get());
      return { success: true, player: resultPlayer };
    },

    deletePlayer: (playerId) => {
      const { players } = get();
      const updated = players.filter(p => p.id !== playerId);
      set({ players: updated });
      persist(get());
    },

    // Staff CRUD Actions
    addStaff: (staffData) => {
      const { staff } = get();
      const existing = staffData.id ? staff.find(s => s.id === staffData.id) : null;
      let updated;

      if (existing) {
        updated = staff.map(s => s.id === staffData.id ? { ...s, ...staffData } : s);
      } else {
        const newStaff = {
          id: uid(),
          username: staffData.username,
          password: staffData.password,
          name: staffData.name,
          role: staffData.role || 'staff',
          createdAt: Date.now()
        };
        updated = [...staff, newStaff];
      }
      set({ staff: updated });
      persist(get());
    },

    deleteStaff: (staffId) => {
      const { staff } = get();
      if (staffId === 'admin') return { success: false, error: 'cannot_delete_admin' };
      const updated = staff.filter(s => s.id !== staffId);
      set({ staff: updated });
      persist(get());
      return { success: true };
    },

    // Match / Games Domain Actions
    startGame: (tableId, player1Id, player2Id, level) => {
      const { tables, games, currentUser, settings } = get();
      const table = tables.find(t => t.id === tableId);
      if (!table) return { success: false, error: 'table_not_found' };

      // Guard: prevent duplicate game starting on table already in use
      const existingActive = games.find(g => g.tableId === tableId && !g.endTime);
      if (existingActive) return { success: false, error: 'table_already_in_use' };

      const players = [player1Id];
      if (player2Id) players.push(player2Id);
      const splitMode = players.length === 1 ? 'single' : 'loser';
      
      const newGame = {
        id: uid(),
        tableId,
        type: table.type,
        level: table.type === '8ball' ? level : null,
        jetons: table.type === '8ball' ? settings.levels[level] : 0,
        frames: 0,
        frameRecords: [],
        frameWins: {},
        players,
        splitMode,
        winnerId: null,
        score: {},
        startTime: Date.now(),
        endTime: null,
        charges: {},
        staffId: currentUser?.id || 'admin',
        endStaffId: null
      };

      set({ games: [...games, newGame] });
      persist(get());
      return { success: true, game: newGame };
    },

    endGame: (gameId, winnerId, scoreMap, manualDiscount = 0, discountReason = '') => {
      const { games, settings, tables, players, currentUser } = get();
      const gameIndex = games.findIndex(g => g.id === gameId);
      if (gameIndex === -1) return { success: false, error: 'game_not_found' };
      if (games[gameIndex].endTime) return { success: true, alreadyEnded: true }; // Guard against duplicate endGame calls

      const game = { ...games[gameIndex] };
      game.winnerId = winnerId || null;
      if (scoreMap) {
        game.score = scoreMap;
        if (game.type === '8ball' && game.players.length === 2) {
          const [p1, p2] = game.players;
          const s1 = scoreMap[p1] || 0;
          const s2 = scoreMap[p2] || 0;
          game.jetons = s1 + s2;
        }
      }
      
      game.manualDiscount = Math.max(0, manualDiscount);
      game.discountReason = discountReason.trim();
      game.charges = computeCharges(game, winnerId, settings, tables, players);
      game.endTime = Date.now();
      game.endStaffId = currentUser?.id || 'admin';

      const updatedGames = [...games];
      updatedGames[gameIndex] = game;

      // Handle queue next game trigger logic if any
      const table = tables.find(t => t.id === game.tableId);
      let updatedTables = tables;
      if (table && table.queue && table.queue.length > 0) {
        // queue remains unchanged, handled component-side or queue actions
      }

      set({ games: updatedGames, tables: updatedTables });
      persist(get());
      return { success: true, game };
    },

    editGame: (gameId, updateData) => {
      const { games } = get();
      const updated = games.map(g => g.id === gameId ? { ...g, ...updateData } : g);
      set({ games: updated });
      persist(get());
    },

    addFrame: (gameId, winnerId) => {
      const { games, settings } = get();
      const gameIndex = games.findIndex(g => g.id === gameId);
      if (gameIndex === -1) return { success: false, error: 'game_not_found' };

      const game = { ...games[gameIndex] };
      game.frames = (game.frames || 0) + 1;
      
      if (!Array.isArray(game.frameRecords)) game.frameRecords = [];
      
      const rate = getCurrentSnookerRate(settings);
      game.frameRecords.push({
        id: uid(),
        time: Date.now(),
        rate,
        winnerId: winnerId || null
      });

      if (!game.frameWins) game.frameWins = {};
      if (winnerId) {
        game.frameWins[winnerId] = (game.frameWins[winnerId] || 0) + 1;
      }

      const updatedGames = [...games];
      updatedGames[gameIndex] = game;

      set({ games: updatedGames });
      persist(get());
      return { success: true, rate, game };
    },

    // Queue Actions
    addToQueue: (tableId, p1Id, p2Id, level) => {
      const { tables } = get();
      const updated = tables.map(t => {
        if (t.id === tableId) {
          const entry = { id: uid(), p1: p1Id, p2: p2Id, level, date: Date.now() };
          return { ...t, queue: [...(t.queue || []), entry] };
        }
        return t;
      });
      set({ tables: updated });
      persist(get());
    },

    clearQueue: (tableId) => {
      const { tables } = get();
      const updated = tables.map(t => t.id === tableId ? { ...t, queue: [] } : t);
      set({ tables: updated });
      persist(get());
    },

    removeFromQueue: (tableId, queueEntryId) => {
      const { tables } = get();
      const updated = tables.map(t => {
        if (t.id === tableId) {
          return { ...t, queue: t.queue.filter(q => q.id !== queueEntryId) };
        }
        return t;
      });
      set({ tables: updated });
      persist(get());
    },

    // TV Scoreboard: per-table enable/disable of the /tv/snooker/:tableId display
    setTableTvEnabled: (tableId, enabled) => {
      const { tables } = get();
      const updated = tables.map(t => t.id === tableId ? { ...t, tvEnabled: enabled } : t);
      set({ tables: updated });
      persist(get());
    },

    // Cashier & Payments Domain Actions
    makePayment: (playerId, amount, note = '') => {
      const { payments, currentUser } = get();
      const numAmount = parseFloat(amount) || 0;

      // Deduplication: prevent duplicate payment within 2 seconds
      const lastSamePay = payments.slice(-5).find(p => p.playerId === playerId && Math.abs(p.amount - numAmount) < 0.001 && Date.now() - p.date < 2000);
      if (lastSamePay) {
        console.warn('Blocked duplicate payment in store:', playerId, numAmount);
        return { success: true, duplicate: true };
      }

      const newPayment = {
        id: uid(),
        playerId,
        amount: numAmount,
        date: Date.now(),
        staffId: currentUser?.id || 'admin',
        note: note.trim()
      };
      set({ payments: [...payments, newPayment] });
      persist(get());
      return { success: true };
    },

    addAdvance: (playerId, amount, note = '') => {
      // Advance is basically a negative debt / payment entry
      return get().makePayment(playerId, amount, note || 'Advance payment');
    },

    // Shifts Domain Actions
    openShift: (startingJetons, startingCash) => {
      const { shifts, currentUser } = get();
      // Ensure no active shift exists
      const active = shifts.find(s => !s.endTime);
      if (active) return { success: false, error: 'shift_already_active' };

      const newShift = {
        id: uid(),
        staffId: currentUser?.id || 'admin',
        startTime: Date.now(),
        endTime: null,
        startingJetons: parseInt(startingJetons) || 0,
        startingCash: parseFloat(startingCash) || 0,
        jetonAdditions: [],
        jetonSales: [],
        fauxMises: []
      };

      set({ shifts: [...shifts, newShift] });
      persist(get());
      return { success: true };
    },

    closeShift: (cashCount = 0) => {
      const { shifts, games, payments } = get();
      const activeIndex = shifts.findIndex(s => !s.endTime);
      if (activeIndex === -1) return { success: false, error: 'no_active_shift' };

      const shift = { ...shifts[activeIndex] };
      shift.endTime = Date.now();
      shift.cashCount = parseFloat(cashCount) || 0;

      // Calculate shift totals
      // 1. Games handled
      const shiftGames = games.filter(g => g.endTime && g.endTime >= shift.startTime && g.endTime <= shift.endTime && g.endStaffId === shift.staffId);
      // Jetons used in 8-ball games during shift
      const jetonsUsed = shiftGames.reduce((s, g) => s + (g.type === '8ball' ? g.jetons : 0), 0);
      shift.jetonsSold = jetonsUsed;

      // 2. Payments taken
      const shiftPayments = payments.filter(p => p.date >= shift.startTime && p.date <= shift.endTime && p.staffId === shift.staffId);
      const cashCollected = shiftPayments.reduce((s, p) => s + p.amount, 0);

      shift.expectedCash = shift.startingCash + cashCollected;
      shift.cashDiff = shift.cashCount - shift.expectedCash;

      const updated = [...shifts];
      updated[activeIndex] = shift;

      set({ shifts: updated });
      persist(get());
      return { success: true, shift };
    },

    addJetonsToDrawer: (count, note = '') => {
      const { shifts } = get();
      const activeIndex = shifts.findIndex(s => !s.endTime);
      if (activeIndex === -1) return { success: false, error: 'no_active_shift' };

      const updated = [...shifts];
      const shift = { ...updated[activeIndex] };
      if (!shift.jetonAdditions) shift.jetonAdditions = [];
      shift.jetonAdditions.push({ id: uid(), count: parseInt(count) || 0, note: note.trim(), time: Date.now() });
      updated[activeIndex] = shift;

      set({ shifts: updated });
      persist(get());
      return { success: true };
    },

    sellJetons: (count, remiz = 0) => {
      const { shifts, settings, payments, currentUser } = get();
      const activeIndex = shifts.findIndex(s => !s.endTime);
      if (activeIndex === -1) return { success: false, error: 'no_active_shift' };

      const updatedShifts = [...shifts];
      const shift = { ...updatedShifts[activeIndex] };
      
      const jetonPrice = settings.jetonPrice || 5;
      const gross = count * jetonPrice;
      const amount = Math.max(0, gross - remiz);

      if (!shift.jetonSales) shift.jetonSales = [];
      shift.jetonSales.push({
        id: uid(),
        count: parseInt(count) || 0,
        amount: amount,
        remiz: remiz,
        time: Date.now()
      });
      updatedShifts[activeIndex] = shift;

      // Add payment record
      const newPayment = {
        id: uid(),
        playerId: null, // No client ID
        amount: amount,
        date: Date.now(),
        staffId: currentUser?.id || 'admin',
        note: `Vente ${count} jetons${remiz > 0 ? ` (remise ${remiz}dh)` : ''}`,
        isJetonSale: true
      };

      set({ shifts: updatedShifts, payments: [...payments, newPayment] });
      persist(get());
      return { success: true, amount };
    },

    addFauxMise: (tableId, count, reason, note = '') => {
      const { shifts } = get();
      const activeIndex = shifts.findIndex(s => !s.endTime);
      if (activeIndex === -1) return { success: false, error: 'no_active_shift' };

      const updated = [...shifts];
      const shift = { ...updated[activeIndex] };
      if (!shift.fauxMises) shift.fauxMises = [];
      
      const fm = {
        id: uid(),
        tableId,
        count: parseInt(count) || 0,
        reason,
        note: note.trim(),
        time: Date.now()
      };
      
      shift.fauxMises.push(fm);
      updated[activeIndex] = shift;

      set({ shifts: updated });
      persist(get());
      return { success: true };
    },

    removeFauxMise: (fmId) => {
      const { shifts } = get();
      const activeIndex = shifts.findIndex(s => !s.endTime);
      if (activeIndex === -1) return { success: false, error: 'no_active_shift' };

      const updated = [...shifts];
      const shift = { ...updated[activeIndex] };
      shift.fauxMises = (shift.fauxMises || []).filter(x => x.id !== fmId);
      updated[activeIndex] = shift;

      set({ shifts: updated });
      persist(get());
      return { success: true };
    },

    // Sync Actions
    setSyncState: (syncFields) => {
      set(syncFields);
    },

    mergeCloudState: (cloudState) => {
      // Smart Merge Algorithm
      const localState = get();
      
      const mergedGames = [...(cloudState.games || [])];
      // Simple merge for payments & players
      const cloudPaymentIds = new Set(cloudState.payments?.map(p => p.id) || []);
      const localOnlyPayments = localState.payments.filter(p => !cloudPaymentIds.has(p.id));
      const mergedPayments = [...(cloudState.payments || []), ...localOnlyPayments].sort((a,b) => a.date - b.date);

      const cloudPlayerIds = new Set(cloudState.players?.map(p => p.id) || []);
      const localOnlyPlayers = localState.players.filter(p => !cloudPlayerIds.has(p.id));
      const mergedPlayers = [...(cloudState.players || []), ...localOnlyPlayers];

      const mergedShifts = [...(cloudState.shifts || [])];

      set({
        players: mergedPlayers,
        games: mergedGames,
        payments: mergedPayments,
        shifts: mergedShifts,
        settings: { ...DEFAULT_STATE.settings, ...(cloudState.settings || {}) },
        tables: cloudState.tables && cloudState.tables.length > 0 ? cloudState.tables : localState.tables,
        smsTemplates: cloudState.smsTemplates && cloudState.smsTemplates.length > 0 ? cloudState.smsTemplates : localState.smsTemplates,
        syncDirty: false,
        syncStatus: 'ok'
      });
      
      // Save merged state to local storage
      const dbState = {
        staff: get().staff,
        players: mergedPlayers,
        games: mergedGames,
        payments: mergedPayments,
        shifts: mergedShifts,
        tables: get().tables,
        smsTemplates: get().smsTemplates,
        settings: get().settings
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dbState));
    }
  };
});
