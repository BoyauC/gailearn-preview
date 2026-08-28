(function createGAILearnProgress(global) {
  'use strict';

  const STORAGE_KEY = 'gailearn.hs_ai_learning_base.progress.v1';
  const ROOM_IDS = ['filter_bubble', 'sift_detective', 'collaboration_director', 'companion_designer'];

  function emptyState() {
    return {
      schemaVersion: 1,
      completedRooms: {},
      completionOrder: [],
      acknowledgedRewards: [],
      updatedAt: null,
    };
  }

  function sanitize(raw) {
    const state = emptyState();
    if (!raw || typeof raw !== 'object') return state;
    ROOM_IDS.forEach((roomId) => {
      const record = raw.completedRooms?.[roomId];
      if (record?.completed === true) {
        state.completedRooms[roomId] = {
          completed: true,
          completedAt: typeof record.completedAt === 'string' ? record.completedAt : null,
        };
      }
    });
    const recordedOrder = Array.isArray(raw.completionOrder) ? raw.completionOrder : [];
    state.completionOrder = recordedOrder.filter((roomId, index) =>
      ROOM_IDS.includes(roomId) && state.completedRooms[roomId] && recordedOrder.indexOf(roomId) === index
    );
    ROOM_IDS.forEach((roomId) => {
      if (state.completedRooms[roomId] && !state.completionOrder.includes(roomId)) state.completionOrder.push(roomId);
    });
    const acknowledgedRewards = Array.isArray(raw.acknowledgedRewards) ? raw.acknowledgedRewards : [];
    state.acknowledgedRewards = acknowledgedRewards.filter((roomId, index) =>
      ROOM_IDS.includes(roomId) && state.completedRooms[roomId] && acknowledgedRewards.indexOf(roomId) === index
    );
    state.updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : null;
    return state;
  }

  function load() {
    try {
      return sanitize(JSON.parse(global.localStorage.getItem(STORAGE_KEY)));
    } catch {
      return emptyState();
    }
  }

  function save(state) {
    const safeState = sanitize(state);
    safeState.updatedAt = new Date().toISOString();
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
    return safeState;
  }

  function completeRoom(roomId) {
    if (!ROOM_IDS.includes(roomId)) throw new Error(`Unknown room_id: ${roomId}`);
    const state = load();
    if (state.completedRooms[roomId]?.completed) {
      return { firstCompletion: false, state };
    }
    state.completedRooms[roomId] = { completed: true, completedAt: new Date().toISOString() };
    state.completionOrder.push(roomId);
    return { firstCompletion: true, state: save(state) };
  }

  function summary() {
    const state = load();
    const completedCount = ROOM_IDS.filter((roomId) => state.completedRooms[roomId]?.completed).length;
    return { state, completedCount, totalRooms: ROOM_IDS.length, allCompleted: completedCount === ROOM_IDS.length };
  }

  function acknowledgeReward(roomId) {
    if (!ROOM_IDS.includes(roomId)) return { acknowledgedNow: false, state: load() };
    const state = load();
    if (!state.completedRooms[roomId]?.completed || state.acknowledgedRewards.includes(roomId)) {
      return { acknowledgedNow: false, state };
    }
    state.acknowledgedRewards.push(roomId);
    return { acknowledgedNow: true, state: save(state) };
  }

  global.GAILearnProgress = Object.freeze({ STORAGE_KEY, ROOM_IDS, load, completeRoom, acknowledgeReward, summary });
})(window);
