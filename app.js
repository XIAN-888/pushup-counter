(() => {
  'use strict';

  const OLD_HISTORY_KEY = 'pushup-counter-history-v1';
  const OLD_SETTINGS_KEY = 'pushup-counter-settings-v1';
  const PROFILE_KEY = 'pushup-profile-v30';
  const APP_VERSION = 'v32-web-test';
  const POSE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/';

  const PLANS = {
    beginner: { label: '入门', weeks: 6, daysPerWeek: 3, sets: 3, rest: 60, base: 6, grow: 1 },
    intermediate: { label: '进阶', weeks: 8, daysPerWeek: 4, sets: 4, rest: 60, base: 10, grow: 2 },
    challenge: { label: '挑战', weeks: 10, daysPerWeek: 5, sets: 5, rest: 45, base: 14, grow: 3 }
  };
  const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const CDN_LIBS = [
    {
      name: 'camera',
      jsdelivr: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      unpkg: 'https://unpkg.com/@mediapipe/camera_utils/camera_utils.js'
    },
    {
      name: 'drawing',
      jsdelivr: 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      unpkg: 'https://unpkg.com/@mediapipe/drawing_utils/drawing_utils.js'
    },
    {
      name: 'pose',
      jsdelivr: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
      unpkg: 'https://unpkg.com/@mediapipe/pose/pose.js'
    }
  ];

  const $ = (id) => document.getElementById(id);

  const els = {
    appView: $('app-view'),
    countValue: $('count-value'),
    goalRing: $('goal-ring'),
    countWrap: $('count-wrap'),
    goalText: $('goal-text'),
    goalPct: $('goal-pct'),
    todayStat: $('today-stat'),
    weekStat: $('week-stat'),
    monthStat: $('month-stat'),
    calorieStat: $('calorie-stat'),
    addBtn: $('add-btn'),
    undoBtn: $('undo-btn'),
    resetBtn: $('reset-btn'),
    startBtn: $('start-btn'),
    timer: $('timer'),
    pace: $('pace'),
    calories: $('calories'),
    historyChart: $('history-chart'),
    monthSummary: $('month-summary'),
    planBadge: $('plan-badge'),
    planProgressFill: $('plan-progress-fill'),
    planProgressText: $('plan-progress-text'),
    planMonthHint: $('plan-month-hint'),
    planToday: $('plan-today'),
    planStart: $('plan-start'),
    planDone: $('plan-done'),
    customPlanEditor: $('custom-plan-editor'),
    customWeeks: $('custom-weeks'),
    customSetRows: $('custom-set-rows'),
    customAddSet: $('custom-add-set'),
    customRemoveSet: $('custom-remove-set'),
    customRest: $('custom-rest'),
    customSave: $('custom-save'),
    modeFree: $('mode-free'),
    modePlan: $('mode-plan'),
    planModeInfo: $('plan-mode-info'),
    sessionInfo: $('session-info'),
    skipRestBtn: $('skip-rest-btn'),
    planRoundsInfo: $('plan-rounds-info'),
    challengeFill: $('challenge-fill'),
    challengeText: $('challenge-text'),
    challengeLevel: $('challenge-level'),
    challengeStreak: $('challenge-streak'),
    challengeBest: $('challenge-best'),
    challengeMonth: $('challenge-month'),
    challengeTotal: $('challenge-total'),
    challengeWeek: $('challenge-week'),
    cameraStart: $('camera-start'),
    cameraStop: $('camera-stop'),
    cameraFlip: $('camera-flip'),
    cameraStatus: $('camera-status'),
    cameraDebug: $('camera-debug'),
    camMask: $('cam-mask'),
    video: $('video'),
    overlay: $('overlay'),
    goalInput: $('goal-input'),
    soundToggle: $('sound-toggle'),
    profNickname: $('prof-nickname'),
    profHeight: $('prof-height'),
    profAge: $('prof-age'),
    profWeight: $('prof-weight'),
    saveProfile: $('save-profile'),
    exportHealth: $('export-health'),
    exportCsv: $('export-csv'),
    tabbar: $('tabbar'),
    repFlash: $('rep-flash'),
    todayLabel: $('today-label'),
    versionLabel: $('version-label')
  };

  let currentAccount = loadProfile();
  let history = currentAccount.history || {};
  let settings = Object.assign({ goal: 30, sound: true }, currentAccount.settings || {});

  let sessionCount = 0;
  let running = false;
  let startedAt = null;
  let timerId = null;
  let phase = null;
  let lastCountAt = 0;
  let downFrames = 0;
  let gapBaseline = 0;
  let kneelingFrames = 0;
  let pose = null;
  let camera = null;
  let facingMode = 'user';
  let audioCtx = null;
  let goalCelebrated = false;
  let workoutMode = 'free';
  let modePlan = false;
  let setIndex = 0;
  let setCount = 0;
  let planSetsList = [];
  let planRest = 60;
  let restSeconds = 0;
  let restTimerId = null;
  let flashTimerId = null;
  let planStartedToday = false;
  let planDayCompleted = false;
  let sessionTarget = 0;
  let customSetCounts = [];

  const RING_RADIUS = 98;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  /* ---------- 账号存储 ---------- */

  /* ---------- 本机资料存储 ---------- */

  function importOldHistory() {
    try {
      const h = JSON.parse(localStorage.getItem(OLD_HISTORY_KEY));
      return h && typeof h === 'object' ? h : {};
    } catch (_) {
      return {};
    }
  }

  function importOldSettings() {
    try {
      return JSON.parse(localStorage.getItem(OLD_SETTINGS_KEY)) || {};
    } catch (_) {
      return {};
    }
  }

  function defaultProfile() {
    return {
      id: 'local',
      email: '',
      nickname: '阿健',
      heightCm: 175,
      age: 28,
      weightKg: 68,
      history: importOldHistory(),
      settings: Object.assign({ goal: 30, sound: true }, importOldSettings()),
      bestSession: 0
    };
  }

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
      if (saved && typeof saved === 'object') {
        saved.history = saved.history || {};
        saved.settings = Object.assign({ goal: 30, sound: true }, saved.settings);
        return saved;
      }
    } catch (_) {
      /* ignore */
    }
    return defaultProfile();
  }

  function persistAccount() {
    if (!currentAccount) return;
    ensurePlan();
    currentAccount.history = history;
    currentAccount.settings = settings;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(currentAccount));
    } catch (_) {
      /* ignore */
    }
  }

  function enterApp() {
    els.appView.hidden = false;
    els.tabbar.hidden = false;
    switchTab('workout');
    els.profNickname.value = currentAccount.nickname;
    els.profHeight.value = currentAccount.heightCm;
    els.profAge.value = currentAccount.age;
    els.profWeight.value = currentAccount.weightKg;
    els.goalInput.value = settings.goal;
    els.soundToggle.checked = settings.sound;
    modePlan = false;
    planStartedToday = false;
    planDayCompleted = todayTotal() >= settings.goal;
    els.modeFree.classList.add('active');
    els.modePlan.classList.remove('active');
    els.planModeInfo.hidden = true;
    workoutMode = 'free';
    render();
  }

  /* ---------- 核心统计 ---------- */

  function dateKey(d) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function todayTotal() {
    return (history[todayKey()] || 0) + sessionCount;
  }

  function monthTotal() {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let total = 0;
    for (const [key, value] of Object.entries(history)) {
      if (key.startsWith(prefix)) total += value || 0;
    }
    if (dateKey(now).startsWith(prefix)) total += sessionCount;
    return total;
  }

  function monthCompletedDays() {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let days = 0;
    for (const [key, value] of Object.entries(history)) {
      if (value > 0 && key.startsWith(prefix)) days += 1;
    }
    const today = todayKey();
    if (sessionCount > 0 && !(history[today] > 0)) days += 1;
    return days;
  }

  function planMonthlyGoal() {
    ensurePlan();
    if (settings.plan.preset === 'custom') {
      return 7 * 4;
    }
    return planMeta(settings.plan.preset).daysPerWeek * 4;
  }

  function monthRemainingDays() {
    const now = new Date();
    const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, total - now.getDate());
  }

  function weekCompletedDays() {
    const today = todayKey();
    let days = 0;
    const cursor = new Date();
    for (let i = 0; i < 7; i++) {
      const key = dateKey(cursor);
      const value = key === today ? todayTotal() : history[key] || 0;
      if (value > 0) days += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return days;
  }

  function allTimeTotal() {
    let total = 0;
    for (const value of Object.values(history)) total += value || 0;
    return total + sessionCount;
  }

  function caloriesFor(count) {
    const kg = currentAccount ? currentAccount.weightKg : 70;
    return Math.round(count * kg * 0.007);
  }

  /* ---------- 训练计划 ---------- */

  function ensurePlan() {
    if (!settings.plan) settings.plan = { preset: 'beginner', completed: 0 };
    if (!PLANS[settings.plan.preset] && settings.plan.preset !== 'custom') {
      settings.plan.preset = 'beginner';
    }
    if (!settings.customPlan) {
      settings.customPlan = { weeks: 4, sets: [8, 8, 8], restSec: 60 };
    } else if (settings.customPlan.days) {
      const first = settings.customPlan.days.find((d) => !d.rest) || null;
      settings.customPlan = {
        weeks: settings.customPlan.weeks || 4,
        sets: first && first.sets && first.sets.length ? first.sets.slice() : [8, 8, 8],
        restSec: (first && first.restSec) || 60
      };
    } else if (!Array.isArray(settings.customPlan.sets)) {
      const setsCount = settings.customPlan.setsCount || 3;
      const reps = settings.customPlan.reps || 8;
      settings.customPlan.sets = Array.from({ length: setsCount }, () => reps);
      delete settings.customPlan.setsCount;
      delete settings.customPlan.reps;
    }
    settings.customPlan.weeks = Math.min(12, Math.max(1, parseInt(settings.customPlan.weeks, 10) || 4));
    settings.customPlan.restSec = Math.min(600, Math.max(10, parseInt(settings.customPlan.restSec, 10) || 60));
    if (!settings.customPlan.sets || settings.customPlan.sets.length === 0) {
      settings.customPlan.sets = [8];
    }
    settings.customPlan.sets = settings.customPlan.sets
      .slice(0, 20)
      .map((v) => Math.min(200, Math.max(1, parseInt(v, 10) || 8)));
    const total = settings.plan.preset === 'custom'
      ? settings.customPlan.weeks * 7
      : planMeta(settings.plan.preset).weeks * planMeta(settings.plan.preset).daysPerWeek;
    if (settings.plan.completed > total) settings.plan.completed = total;
  }

  function planMeta(preset) {
    return PLANS[preset] || PLANS.beginner;
  }

  function planTotalDays(preset) {
    if (preset === 'custom') {
      ensurePlan();
      return settings.customPlan.weeks * 7;
    }
    const p = planMeta(preset);
    return p.weeks * p.daysPerWeek;
  }

  function planCurrent(completed, preset) {
    const p = planMeta(preset);
    const week = Math.min(p.weeks, Math.floor(completed / p.daysPerWeek) + 1);
    const day = Math.min(p.daysPerWeek, (completed % p.daysPerWeek) + 1);
    return { week, day };
  }

  function planDayInfo() {
    ensurePlan();
    const preset = settings.plan.preset;
    if (preset === 'custom') {
      const cp = settings.customPlan;
      const weekdayIndex = (new Date().getDay() + 6) % 7;
      return {
        week: Math.floor(settings.plan.completed / 7) + 1,
        dayLabel: WEEKDAY_NAMES[weekdayIndex],
        sets: cp.sets.slice(),
        rest: cp.restSec
      };
    }
    const cur = planCurrent(settings.plan.completed, preset);
    return {
      week: cur.week,
      dayLabel: `第 ${cur.day} 天`,
      sets: planSets(preset, cur.week),
      rest: planMeta(preset).rest
    };
  }

  function planSets(preset, week) {
    const p = planMeta(preset);
    const grow = (week - 1) * p.grow;
    const step = p.sets <= 3 ? 1 : 2;
    return Array.from({ length: p.sets }, (_, i) =>
      Math.max(2, p.base + grow - i * step)
    );
  }

  function planTotalForToday() {
    ensurePlan();
    const info = planDayInfo();
    if (!info) return 0;
    return info.sets.reduce((a, b) => a + b, 0);
  }

  function customRestToday() {
    return false;
  }

  function planRoundsInfo() {
    const planTotal = planTotalForToday();
    if (planTotal <= 0) return null;
    const roundsNeeded = Math.max(1, Math.ceil(settings.goal / planTotal));
    const roundsDone = Math.min(
      roundsNeeded,
      Math.floor(todayTotal() / planTotal)
    );
    const label =
      settings.plan.preset === 'custom'
        ? '自定义'
        : planMeta(settings.plan.preset).label;
    return { label, roundsDone, roundsNeeded, planTotal };
  }

  function renderPlan() {
    ensurePlan();
    const preset = settings.plan.preset;
    const total = planTotalDays(preset);
    const info = planDayInfo();
    const monthDone = monthCompletedDays();
    const monthGoal = planMonthlyGoal();
    els.planBadge.textContent = preset === 'custom' ? '自定义' : planMeta(preset).label;
    els.planProgressFill.style.width =
      `${Math.min(100, Math.round((monthDone / Math.max(1, monthGoal)) * 100))}%`;
    els.planProgressText.textContent = `本月已完成 ${monthDone} 天 · 目标 ${monthGoal} 天`;
    els.planMonthHint.textContent = `本月还剩 ${monthRemainingDays()} 个自然日`;
    els.planToday.textContent = info
      ? `今日组次 ${info.sets.join('-')} · 组间休息 ${info.rest} 秒`
      : customRestToday()
        ? '今日休息，不需要训练 🛌'
        : '请先在自定义计划中设置至少一个训练日';
    document.querySelectorAll('.plan-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    els.customPlanEditor.hidden = preset !== 'custom';
    if (preset === 'custom') populateCustomEditor();
    updatePlanModeChip();
    updatePlanDoneButton();
  }

  function updatePlanDoneButton() {
    ensurePlan();
    const total = planTotalDays(settings.plan.preset);
    const allDone = total > 0 && settings.plan.completed >= total;
    const hasProgress = planStartedToday || todayTotal() > 0;
    els.planDone.disabled = allDone || !hasProgress;
    els.planDone.classList.toggle('ready', hasProgress && !planDayCompleted && !allDone);
    els.planDone.classList.toggle('done', planDayCompleted || allDone);
    els.planDone.textContent = allDone
      ? '计划已完成 🎉'
      : planDayCompleted
        ? '今日已完成 ✅'
        : '完成今日计划';
  }

  function updatePlanModeChip() {
    ensurePlan();
    const label =
      settings.plan.preset === 'custom'
        ? '自定义'
        : planMeta(settings.plan.preset).label;
    els.modePlan.textContent = `📋 计划（${label}）`;
    const info = planDayInfo();
    els.planModeInfo.textContent = info
      ? `今日组次 ${info.sets.join('-')} · 组间休息 ${info.rest} 秒`
      : customRestToday()
        ? '今日休息，不需要训练 🛌'
        : '请先在「计划」页设置至少一个训练日';
  }

  function startPlanWorkout() {
    ensurePlan();
    modePlan = true;
    selectPlanMode();
    planStartedToday = true;
    updatePlanDoneButton();
    const info = planDayInfo();
    if (!info) {
      flash(customRestToday() ? '今天是休息日 🛌' : '请先设置自定义计划中的训练日');
      return;
    }
    planSetsList = info.sets;
    planRest = info.rest;
    setIndex = 0;
    setCount = 0;
    clearRest();
    workoutMode = 'sets';
    els.modePlan.classList.add('active');
    els.modeFree.classList.remove('active');
    const target = planSetsList.reduce((a, b) => a + b, 0);
    sessionTarget = target;
    if (!running) startStop();
    updateSessionInfo();
    flash(`今日训练 ${target} 个：${planSetsList.join('-')} 💪`);
  }

  function completePlanDay() {
    ensurePlan();
    if (planDayCompleted) {
      flash('今日已完成 ✅');
      return;
    }
    const total = planTotalDays(settings.plan.preset);
    if (settings.plan.completed >= total) {
      flash('训练计划已全部完成 🎉');
      return;
    }
    if (sessionCount <= 0 && !window.confirm('今日没有计数记录，仍要标记今日计划完成吗？')) {
      flash('⚠️ 本次训练还没有计数，请先 +1 或打开摄像头');
      return;
    }
    if (sessionCount > 0) {
      const key = todayKey();
      history[key] = (history[key] || 0) + sessionCount;
      if (sessionCount > (currentAccount.bestSession || 0)) {
        currentAccount.bestSession = sessionCount;
      }
      sessionCount = 0;
      running = false;
      clearInterval(timerId);
      clearRest();
      setIndex = 0;
      setCount = 0;
      planSetsList = [];
      sessionTarget = 0;
      if (workoutMode === 'sets') workoutMode = 'free';
      els.startBtn.textContent = '开始训练';
      els.startBtn.classList.remove('active');
      els.timer.textContent = '00:00';
      els.pace.textContent = '0.0';
      els.calories.textContent = '0';
    }
    settings.plan.completed += 1;
    planDayCompleted = true;
    persistAccount();
    renderPlan();
    render();
    flash('今日计划完成 ✅');
  }

  function populateCustomEditor() {
    ensurePlan();
    const cp = settings.customPlan;
    els.customWeeks.value = cp.weeks;
    els.customRest.value = cp.restSec;
    customSetCounts = cp.sets.slice();
    renderCustomSetRows();
  }

  function renderCustomSetRows() {
    const rows = customSetCounts
      .map(
        (count, index) => `
    <div class="custom-set-row">
      <span class="custom-set-name">第 ${index + 1} 组</span>
      <span class="set-stepper">
        <button type="button" data-action="dec" data-index="${index}" aria-label="减少">−</button>
        <span class="set-count">${count}</span>
        <button type="button" data-action="inc" data-index="${index}" aria-label="增加">＋</button>
      </span>
    </div>`
      )
      .join('');
    els.customSetRows.innerHTML =
      rows || '<div class="custom-set-empty">还没有组，点击「添加一组」</div>';
  }

  function addCustomSet() {
    ensurePlan();
    if (customSetCounts.length >= 20) {
      flash('最多 20 组');
      return;
    }
    customSetCounts.push(customSetCounts[customSetCounts.length - 1] || 8);
    renderCustomSetRows();
  }

  function removeCustomSet() {
    if (customSetCounts.length <= 1) {
      flash('至少保留 1 组');
      return;
    }
    customSetCounts.pop();
    renderCustomSetRows();
  }

  function saveCustomPlan() {
    ensurePlan();
    const weeks = Math.min(12, Math.max(1, parseInt(els.customWeeks.value, 10) || 4));
    const restSec = Math.min(600, Math.max(10, parseInt(els.customRest.value, 10) || 60));
    if (!customSetCounts || customSetCounts.length === 0) customSetCounts = [8];
    const sets = customSetCounts
      .slice(0, 20)
      .map((v) => Math.min(200, Math.max(1, parseInt(v, 10) || 8)));
    settings.customPlan = { weeks, sets, restSec };
    settings.plan.preset = 'custom';
    const total = weeks * 7;
    if (settings.plan.completed > total) settings.plan.completed = total;
    persistAccount();
    renderPlan();
    render();
    flash('自定义计划已保存 ✅');
  }

  /* ---------- 导航与训练模式 ---------- */

  function switchTab(name) {
    ['workout', 'plan', 'stats', 'me'].forEach((tab) => {
      const pane = document.getElementById('tab-' + tab);
      if (pane) pane.hidden = tab !== name;
    });
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
  }

  function updateSessionInfo() {
    if (workoutMode === 'sets') {
      if (restSeconds > 0) {
        els.sessionInfo.textContent =
          `休息中 ${restSeconds} 秒 · 下一组 ${setIndex + 1}/${planSetsList.length}`;
      } else if (setIndex < planSetsList.length) {
        els.sessionInfo.textContent =
          `第 ${setIndex + 1}/${planSetsList.length} 组 · 目标 ${planSetsList[setIndex]} · 已完成 ${setCount}`;
      } else {
        els.sessionInfo.textContent = '今日训练已完成 🎉';
      }
      els.skipRestBtn.hidden = !(restSeconds > 0);
      return;
    }
    els.skipRestBtn.hidden = true;
    els.sessionInfo.textContent = '';
  }

  function selectFreeMode() {
    if (running) {
      flash('训练进行中，请先结束当前训练');
      return;
    }
    modePlan = false;
    els.modeFree.classList.add('active');
    els.modePlan.classList.remove('active');
    els.planModeInfo.hidden = true;
    workoutMode = 'free';
    updateSessionInfo();
  }

  function selectPlanMode() {
    if (running) {
      flash('训练进行中，请先结束当前训练');
      return;
    }
    modePlan = true;
    els.modePlan.classList.add('active');
    els.modeFree.classList.remove('active');
    els.planModeInfo.hidden = false;
    updatePlanModeChip();
    updateSessionInfo();
  }

  function clearRest() {
    if (restTimerId) {
      clearInterval(restTimerId);
      restTimerId = null;
    }
    restSeconds = 0;
  }

  function startRest(nextIndex) {
    clearRest();
    setIndex = nextIndex;
    setCount = 0;
    restSeconds = planRest;
    updateSessionInfo();
    restTimerId = setInterval(() => {
      restSeconds -= 1;
      if (restSeconds <= 0) {
        clearRest();
        updateSessionInfo();
        flash(`第 ${setIndex + 1} 组开始 💪`);
      } else {
        updateSessionInfo();
      }
    }, 1000);
  }

  function computeStreak() {
    const cursor = new Date();
    let streak = 0;
    if (todayTotal() === 0) {
      cursor.setDate(cursor.getDate() - 1);
    }
    for (let i = 0; i < 3660; i++) {
      const key = dateKey(cursor);
      if ((history[key] || 0) > 0) {
        streak += 1;
      } else {
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function renderChallenge() {
    ensurePlan();
    const streak = computeStreak();
    const best = (currentAccount && currentAccount.bestSession) || 0;
    const monthDone = monthCompletedDays();
    const monthGoal = planMonthlyGoal();
    const weekDone = weekCompletedDays();
    const totalCount = allTimeTotal();
    const label =
      settings.plan.preset === 'custom'
        ? '自定义'
        : planMeta(settings.plan.preset).label;
    const pct = Math.min(100, Math.round((streak / 100) * 100));
    els.challengeLevel.textContent = label;
    els.challengeStreak.textContent = streak;
    els.challengeFill.style.width = `${pct}%`;
    els.challengeText.textContent = `坚持 ${streak} / 100 天`;
    els.challengeMonth.textContent = `${monthDone}/${monthGoal}`;
    els.challengeTotal.textContent = totalCount;
    els.challengeBest.textContent = best;
    els.challengeWeek.textContent = weekDone;
  }

  /* ---------- 导出 ---------- */

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportHealth() {
    if (!currentAccount) return;
    const rows = Object.entries(history)
      .filter(([, v]) => v > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (rows.length === 0) {
      flash('还没有训练数据可导出');
      return;
    }
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<HealthData locale="zh_CN">'
    ];
    for (const [day, count] of rows) {
      const kcal = caloriesFor(count);
      const minutes = Math.max(1, Math.round(count * 0.4));
      lines.push(
        `  <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="${minutes}" durationUnit="min" totalEnergyBurned="${kcal}" totalEnergyBurnedUnit="kcal" sourceName="PushPulse" sourceVersion="1.0">`
      );
      lines.push(`    <MetadataEntry key="HKStartDate" value="${day} 07:00:00 +0800"/>`);
      lines.push(`    <MetadataEntry key="HKEndDate" value="${day} 07:${String(minutes).padStart(2, '0')}:00 +0800"/>`);
      lines.push('  </Workout>');
    }
    lines.push('</HealthData>');
    downloadFile('apple-health-export.xml', lines.join('\n'), 'application/xml');
    flash('Apple 健康文件已导出 ✅');
  }

  function exportCsv() {
    if (!currentAccount) return;
    const rows = Object.entries(history)
      .filter(([, v]) => v > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (rows.length === 0) {
      flash('还没有训练数据可导出');
      return;
    }
    const lines = ['日期,次数,估算千卡'];
    for (const [day, count] of rows) {
      lines.push(`${day},${count},${caloriesFor(count)}`);
    }
    downloadFile('pushup-history.csv', lines.join('\n'), 'text/csv;charset=utf-8');
    flash('CSV 已导出 ✅');
  }

  function updateTodayLabel() {
    const d = new Date();
    const week = ['日', '一', '二', '三', '四', '五', '六'];
    els.todayLabel.textContent =
      `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${week[d.getDay()]}`;
  }

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function beep() {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.2);
    } catch (_) {
      /* ignore */
    }
  }

  function flash(text) {
    els.repFlash.textContent = text;
    els.repFlash.classList.remove('show');
    void els.repFlash.offsetWidth;
    els.repFlash.classList.add('show');
    if (flashTimerId) clearTimeout(flashTimerId);
    flashTimerId = setTimeout(() => {
      els.repFlash.classList.remove('show');
      flashTimerId = null;
    }, 1800);
  }

  function addRep() {
    sessionCount += 1;
    beep();
    if (navigator.vibrate) navigator.vibrate(30);
    els.countWrap.classList.remove('pop');
    void els.countWrap.offsetWidth;
    els.countWrap.classList.add('pop');
    flash(`第 ${sessionCount} 个 💪`);
    if (workoutMode === 'sets' && restSeconds <= 0 && setIndex < planSetsList.length) {
      setCount += 1;
      if (setCount >= planSetsList[setIndex]) {
        if (setIndex < planSetsList.length - 1) {
          startRest(setIndex + 1);
          flash(`第 ${setIndex + 1} 组完成，休息 ${planRest} 秒`);
        } else {
          setIndex += 1;
          flash('今日训练完成！可到「计划」页点完成今日计划 ✅');
        }
      }
    }
    updateSessionInfo();
    checkTodayTarget();
    render();
  }

  function checkTodayTarget() {
    if (!currentAccount) return;
    const total = todayTotal();
    if (total < settings.goal || sessionCount <= 0) return;

    const key = todayKey();
    if (sessionCount > (currentAccount.bestSession || 0)) {
      currentAccount.bestSession = sessionCount;
    }
    history[key] = (history[key] || 0) + sessionCount;
    sessionCount = 0;

    if (!planDayCompleted && settings.plan.completed < planTotalDays(settings.plan.preset)) {
      settings.plan.completed += 1;
    }
    planDayCompleted = true;

    running = false;
    clearInterval(timerId);
    clearRest();
    setIndex = 0;
    setCount = 0;
    planSetsList = [];
    sessionTarget = 0;
    if (workoutMode === 'sets') workoutMode = 'free';
    els.startBtn.textContent = '开始训练';
    els.startBtn.classList.remove('active');
    els.timer.textContent = '00:00';
    els.pace.textContent = '0.0';
    els.calories.textContent = '0';

    persistAccount();
    flash('🎉 今日目标达成，已自动保存！');
  }

  function render() {
    els.countValue.textContent = sessionCount;
    const total = todayTotal();
    const planTotal = planTotalForToday();
    const goal = planTotal > 0 ? planTotal : settings.goal;
    const pct = Math.min(100, Math.round((total / goal) * 100));
    els.goalRing.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    els.goalRing.style.strokeDashoffset = String(
      RING_CIRCUMFERENCE * (1 - pct / 100)
    );
    els.goalText.textContent = `今日 ${total} / ${goal}`;
    els.goalPct.textContent = `${pct}%`;
    renderMiniStats();
    renderPlan();
    renderChallenge();
    updateSessionInfo();
    const rounds = planRoundsInfo();
    els.planRoundsInfo.textContent = rounds
      ? `${rounds.label}计划：完成 ${rounds.roundsDone}/${rounds.roundsNeeded} 次（每次 ${rounds.planTotal} 个 · 今日 ${todayTotal()}/${settings.goal} 个）`
      : '';
    if (total >= settings.goal && !goalCelebrated) {
      goalCelebrated = true;
      celebrateGoal();
    } else if (total < settings.goal) {
      goalCelebrated = false;
    }
    renderHistory();
  }

  function renderMiniStats() {
    const today = todayKey();
    const todayVal = todayTotal();
    let week = 0;
    const cursor = new Date();
    for (let i = 0; i < 7; i++) {
      const key = dateKey(cursor);
      week += key === today ? todayVal : history[key] || 0;
      cursor.setDate(cursor.getDate() - 1);
    }
    els.todayStat.textContent = todayVal;
    els.weekStat.textContent = week;
    els.monthStat.textContent = monthTotal();
    els.calorieStat.textContent = caloriesFor(todayVal);
  }

  function celebrateGoal() {
    setTimeout(() => flash('🎉 达成今日目标！'), 260);
    els.countWrap.classList.add('celebrate');
    setTimeout(() => els.countWrap.classList.remove('celebrate'), 1000);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  }

  function renderHistory() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      days.push({
        key,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        value: history[key] || 0
      });
    }

    const max = Math.max(1, ...days.map((x) => x.value));
    els.historyChart.innerHTML = '';
    els.monthSummary.textContent = `本月共 ${monthTotal()} 个`;

    days.forEach((day) => {
      const col = document.createElement('div');
      col.className = 'chart-col';

      const wrap = document.createElement('div');
      wrap.className = 'chart-bar-wrap';
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.height = `${Math.max((day.value / max) * 100, day.value ? 8 : 3)}%`;
      bar.title = `${day.label}: ${day.value} 个`;
      wrap.appendChild(bar);

      const val = document.createElement('div');
      val.className = 'chart-value';
      val.textContent = day.value;

      const lbl = document.createElement('div');
      lbl.className = 'chart-label';
      lbl.textContent = day.label;

      col.appendChild(wrap);
      col.appendChild(val);
      col.appendChild(lbl);
      els.historyChart.appendChild(col);
    });
  }

  function tick() {
    if (!running) return;
    const sec = Math.floor((Date.now() - startedAt) / 1000);
    els.timer.textContent = formatTime(sec);
    const minutes = sec / 60;
    els.pace.textContent = minutes > 0 ? (sessionCount / minutes).toFixed(1) : '0.0';
    els.calories.textContent = caloriesFor(sessionCount);
    updateSessionInfo();
  }

  function startStop() {
    if (!running) {
      running = true;
      startedAt = Date.now();
      els.startBtn.textContent = '结束并保存';
      els.startBtn.classList.add('active');
      timerId = setInterval(tick, 500);
      tick();
    } else {
      finishWorkout();
    }
  }

  function finishWorkout() {
    running = false;
    clearInterval(timerId);
    clearRest();

    const key = todayKey();
    if (sessionCount > 0) {
      history[key] = (history[key] || 0) + sessionCount;
      if (currentAccount && sessionCount > (currentAccount.bestSession || 0)) {
        currentAccount.bestSession = sessionCount;
      }
      persistAccount();
    }
    if (todayTotal() >= settings.goal) {
      if (!planDayCompleted && settings.plan.completed < planTotalDays(settings.plan.preset)) {
        settings.plan.completed += 1;
      }
      planDayCompleted = true;
      persistAccount();
    }
    const done = sessionCount;

    sessionCount = 0;
    phase = null;
    setIndex = 0;
    setCount = 0;
    planSetsList = [];
    sessionTarget = 0;
    if (workoutMode === 'sets') workoutMode = 'free';
    els.startBtn.textContent = '开始训练';
    els.startBtn.classList.remove('active');
    els.timer.textContent = '00:00';
    els.pace.textContent = '0.0';
    els.calories.textContent = '0';
    render();

    if (done > 0) flash(`已保存 ${done} 个 ✅`);
  }

  /* ---------- 摄像头自动识别 ---------- */

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve();
      s.onerror = () => {
        s.remove();
        reject(new Error('加载失败'));
      };
      document.head.appendChild(s);
    });
  }

  async function ensurePoseLibs() {
    if (window.Pose && window.Camera && window.drawConnectors) return true;
    for (const lib of CDN_LIBS) {
      const loaded =
        (lib.name === 'camera' && window.Camera) ||
        (lib.name === 'drawing' && window.drawConnectors) ||
        (lib.name === 'pose' && window.Pose);
      if (loaded) continue;
      try {
        await loadScript(lib.jsdelivr);
      } catch (_) {
        await loadScript(lib.unpkg);
      }
    }
    return !!(window.Pose && window.Camera && window.drawConnectors);
  }

  async function startCamera() {
    els.cameraStatus.textContent = '正在加载识别模型（首次需要联网）…';
    els.cameraStart.disabled = true;
    try {
      const ok = await ensurePoseLibs();
      if (!ok) throw new Error('模型加载失败，请检查网络后重试');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('当前浏览器不支持摄像头，请使用 Chrome 或 Edge');
      }

      if (!pose) {
        pose = new Pose({
          locateFile: (file) => POSE_CDN + file
        });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        pose.onResults(onResults);
      }

      camera = new Camera(els.video, {
        onFrame: async () => {
          if (pose) await pose.send({ image: els.video });
        },
        facingMode,
        width: 1280,
        height: 720
      });

      await camera.start();
      els.camMask.classList.add('hidden');
      els.cameraStop.disabled = false;
      els.cameraFlip.disabled = false;
      els.cameraStatus.textContent = '识别中：身体水平、双手撑地，先伸直手臂再下压。';
    } catch (err) {
      els.cameraStatus.textContent =
        '无法启动：' + (err && err.message ? err.message : '请检查摄像头权限');
    } finally {
      els.cameraStart.disabled = false;
    }
  }

  function stopCamera() {
    if (camera) {
      try {
        camera.stop();
      } catch (_) {
        /* ignore */
      }
      camera = null;
    }
    els.camMask.classList.remove('hidden');
    els.cameraStop.disabled = true;
    els.cameraFlip.disabled = true;
    els.cameraStatus.textContent = '已关闭摄像头。';
    els.cameraDebug.textContent = '';
    const ctx = els.overlay.getContext('2d');
    ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);
    els.overlay.width = 640;
    els.overlay.height = 480;
    resetDetection();
  }

  async function toggleCamera() {
    const wasRunning = !!camera;
    stopCamera();
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    if (wasRunning) await startCamera();
  }

  function onResults(results) {
    const ctx = els.overlay.getContext('2d');
    ctx.save();
    const vw =
      results.image && results.image.videoWidth
        ? results.image.videoWidth
        : els.overlay.width;
    const vh =
      results.image && results.image.videoHeight
        ? results.image.videoHeight
        : els.overlay.height;
    if (els.overlay.width !== vw || els.overlay.height !== vh) {
      els.overlay.width = vw;
      els.overlay.height = vh;
    }
    ctx.clearRect(0, 0, vw, vh);
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, vw, vh);
    }
    if (results.poseLandmarks) {
      if (window.drawConnectors && window.POSE_CONNECTIONS) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#ffb199',
          lineWidth: 3
        });
      }
      if (window.drawLandmarks) {
        drawLandmarks(ctx, results.poseLandmarks, {
          color: '#ff6b35',
          lineWidth: 2,
          radius: 5
        });
      }
      updateDetection(results.poseLandmarks);
    } else {
      resetDetection();
      els.cameraStatus.textContent = '未检测到身体，请进入画面';
      els.cameraDebug.textContent = '未检测到身体';
    }
    ctx.restore();
  }

  function updateDetection(lm) {
    const shouldersOk = isUsable(lm[11]) && isUsable(lm[12]);
    const wristsOk = isUsable(lm[15]) && isUsable(lm[16]);
    const hipsOk = isUsable(lm[23]) && isUsable(lm[24]);
    const kneesOk = isUsable(lm[25]) && isUsable(lm[26]);
    const anklesOk = isUsable(lm[27]) && isUsable(lm[28]);

    if (!shouldersOk) {
      resetDetection();
      els.cameraStatus.textContent = '请让肩膀入画';
      els.cameraDebug.textContent =
        `肩膀 ${shouldersOk ? '✓' : '✗'} · 双手 ${wristsOk ? '✓' : '✗'}`;
      return;
    }

    const shoulderY = (lm[11].y + lm[12].y) / 2;
    const wristY = (lm[15].y + lm[16].y) / 2;
    const hipY = hipsOk ? (lm[23].y + lm[24].y) / 2 : shoulderY;
    const handsBelow = wristsOk ? wristY > shoulderY - 0.04 : true;

    if (wristsOk && !handsBelow) {
      resetDetection();
      els.cameraStatus.textContent = '请摆好俯卧撑姿势：双手撑地';
      els.cameraDebug.textContent = '双手不在肩部下方';
      return;
    }

    if (hipsOk) {
      const bodyLevel = Math.abs(shoulderY - hipY) < 0.25;
      if (!bodyLevel) {
        resetDetection();
        els.cameraStatus.textContent = '请摆好俯卧撑姿势：身体保持水平';
        els.cameraDebug.textContent = '身体水平 ✗';
        return;
      }
    }

    if (hipsOk && kneesOk) {
      const hipAngle =
        (angleDeg3D(lm[11], lm[23], lm[25]) + angleDeg3D(lm[12], lm[24], lm[26])) / 2;
      if (hipAngle < 120) {
        kneelingFrames += 1;
        if (kneelingFrames >= 5) {
          resetDetection();
          els.cameraStatus.textContent = '膝盖着地不计入，请做标准俯卧撑';
          els.cameraDebug.textContent = `髋角 ${Math.round(hipAngle)}°（疑似跪姿）`;
          return;
        }
        return;
      } else {
        kneelingFrames = Math.max(0, kneelingFrames - 1);
      }
    }

    if (kneesOk && anklesOk) {
      const kneeAngle =
        (angleDeg3D(lm[23], lm[25], lm[27]) + angleDeg3D(lm[24], lm[26], lm[28])) / 2;
      if (kneeAngle < 120) {
        kneelingFrames += 1;
        if (kneelingFrames >= 5) {
          resetDetection();
          els.cameraStatus.textContent = '膝盖弯曲不计入，请伸直双腿';
          els.cameraDebug.textContent = `膝角 ${Math.round(kneeAngle)}°（疑似跪姿）`;
          return;
        }
        return;
      } else {
        kneelingFrames = Math.max(0, kneelingFrames - 1);
      }
    }

    const armTriplets = [
      [11, 13, 15],
      [12, 14, 16]
    ];
    const validArms = armTriplets.filter((triplet) =>
      triplet.every((i) => isUsable(lm[i]))
    );

    let mode;
    let value;
    let down;
    let up;

    if (validArms.length > 0) {
      const avgAngle =
        validArms.reduce(
          (sum, triplet) =>
            sum + angleDeg(lm[triplet[0]], lm[triplet[1]], lm[triplet[2]]),
          0
        ) / validArms.length;
      mode = '手臂角度';
      value = `${Math.round(avgAngle)}°`;
      down = avgAngle < 140;
      up = avgAngle > 155;
    } else if (hipsOk) {
      const gap = Math.abs(shoulderY - hipY);
      if (phase !== 'down') {
        if (!gapBaseline) gapBaseline = gap;
        gapBaseline = gapBaseline * 0.9 + gap * 0.1;
      }
      const gapDelta = gap - gapBaseline;
      mode = '肩髋间距';
      value = (gapDelta >= 0 ? '+' : '') + gapDelta.toFixed(3);
      down = gapDelta > 0.05;
      up = gapDelta < 0.02;
    } else {
      resetDetection();
      els.cameraStatus.textContent = '请让手臂完整入画或让胯部入画';
      els.cameraDebug.textContent = '手臂不完整且胯部不可见';
      return;
    }

    if (down) {
      if (phase !== 'down') downFrames = 0;
      phase = 'down';
      downFrames += 1;
      els.cameraStatus.textContent = '⬇ 保持控制，然后撑起';
    } else if (up) {
      if (
        phase === 'down' &&
        downFrames >= 5 &&
        Date.now() - lastCountAt > 500
      ) {
        lastCountAt = Date.now();
        addRep();
      }
      phase = 'up';
      downFrames = 0;
      els.cameraStatus.textContent = '⬆ 好姿势，继续';
    } else {
      els.cameraStatus.textContent = '正在识别动作…';
    }
    els.cameraDebug.textContent =
      `模式 ${mode} · 数值 ${value} · 状态 ${phase === 'down' ? '下压' : '撑起'}`;
  }

  function resetDetection() {
    phase = null;
    downFrames = 0;
    gapBaseline = 0;
    kneelingFrames = 0;
  }

  function isUsable(p) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
    if (p.x < -0.3 || p.x > 1.3 || p.y < -0.3 || p.y > 1.3) return false;
    if (Math.abs(p.x) < 0.005 && Math.abs(p.y) < 0.005) return false;
    return true;
  }

  function angleDeg(a, b, c) {
    const v1x = a.x - b.x;
    const v1y = a.y - b.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
    if (!m) return 180;
    const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / m));
    return (Math.acos(cos) * 180) / Math.PI;
  }

  function angleDeg3D(a, b, c) {
    const v1x = a.x - b.x;
    const v1y = a.y - b.y;
    const v1z = (a.z || 0) - (b.z || 0);
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const v2z = (c.z || 0) - (b.z || 0);
    const m = Math.hypot(v1x, v1y, v1z) * Math.hypot(v2x, v2y, v2z);
    if (!m) return 180;
    const cos = Math.max(
      -1,
      Math.min(1, (v1x * v2x + v1y * v2y + v1z * v2z) / m)
    );
    return (Math.acos(cos) * 180) / Math.PI;
  }

  /* ---------- 事件绑定 ---------- */

  els.addBtn.addEventListener('click', addRep);
  els.undoBtn.addEventListener('click', () => {
    if (sessionCount > 0) {
      sessionCount -= 1;
      render();
    }
  });
  els.resetBtn.addEventListener('click', () => {
    if (sessionCount > 0 && !window.confirm('确定清空本次计数吗？')) return;
    sessionCount = 0;
    phase = null;
    render();
  });
  els.startBtn.addEventListener('click', () => {
    if (running) {
      startStop();
    } else if (modePlan) {
      startPlanWorkout();
    } else {
      startStop();
    }
  });
  els.skipRestBtn.addEventListener('click', () => {
    if (restSeconds > 0 && setIndex < planSetsList.length) {
      clearRest();
      updateSessionInfo();
      flash(`第 ${setIndex + 1} 组开始 💪`);
    }
  });
  els.cameraStart.addEventListener('click', startCamera);
  els.cameraStop.addEventListener('click', stopCamera);
  els.cameraFlip.addEventListener('click', toggleCamera);

  els.goalInput.addEventListener('change', () => {
    const v = Math.min(999, Math.max(1, parseInt(els.goalInput.value, 10) || 30));
    els.goalInput.value = v;
    settings.goal = v;
    persistAccount();
    render();
  });

  els.soundToggle.addEventListener('change', () => {
    settings.sound = els.soundToggle.checked;
    persistAccount();
  });

  els.saveProfile.addEventListener('click', () => {
    const nickname = els.profNickname.value.trim();
    const heightCm = parseFloat(els.profHeight.value);
    const age = parseInt(els.profAge.value, 10);
    const weightKg = parseFloat(els.profWeight.value);
    if (
      !nickname ||
      !(heightCm >= 80 && heightCm <= 250) ||
      !(age >= 5 && age <= 120) ||
      !(weightKg >= 20 && weightKg <= 300)
    ) {
      flash('请填写有效的昵称、身高、年龄、体重');
      return;
    }
    currentAccount.nickname = nickname;
    currentAccount.heightCm = heightCm;
    currentAccount.age = age;
    currentAccount.weightKg = weightKg;
    persistAccount();
    render();
    flash('资料已保存 ✅');
  });

  document.querySelectorAll('.plan-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.plan.preset = btn.dataset.preset;
      settings.plan.completed = 0;
      planStartedToday = false;
      planDayCompleted = false;
      document.querySelectorAll('.plan-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.preset === settings.plan.preset);
      });
      els.customPlanEditor.hidden = settings.plan.preset !== 'custom';
      if (settings.plan.preset === 'custom') {
        populateCustomEditor();
        els.customPlanEditor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      persistAccount();
      renderPlan();
      render();
      flash(settings.plan.preset === 'custom' ? '自定义计划已展开 ✏️' : '已切换训练计划');
    });
  });
  els.planStart.addEventListener('click', startPlanWorkout);
  els.planDone.addEventListener('click', completePlanDay);
  els.customSave.addEventListener('click', saveCustomPlan);
  els.customAddSet.addEventListener('click', addCustomSet);
  els.customRemoveSet.addEventListener('click', removeCustomSet);
  els.customSetRows.addEventListener('click', (e) => {
    const target = e && e.target;
    const dataset = target && target.dataset ? target.dataset : null;
    if (!dataset || !dataset.action) return;
    const index = parseInt(dataset.index, 10);
    if (!Number.isFinite(index)) return;
    if (dataset.action === 'inc') {
      customSetCounts[index] = Math.min(200, (customSetCounts[index] || 0) + 1);
      renderCustomSetRows();
    } else if (dataset.action === 'dec') {
      customSetCounts[index] = Math.max(1, (customSetCounts[index] || 0) - 1);
      renderCustomSetRows();
    }
  });
  els.exportHealth.addEventListener('click', exportHealth);
  els.exportCsv.addEventListener('click', exportCsv);

  els.modeFree.addEventListener('click', selectFreeMode);
  els.modePlan.addEventListener('click', selectPlanMode);
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      addRep();
    }
  });

  window.addEventListener('pagehide', () => {
    if (running && sessionCount > 0 && currentAccount) {
      const key = todayKey();
      history[key] = (history[key] || 0) + sessionCount;
      persistAccount();
    }
    if (camera) {
      try {
        camera.stop();
      } catch (_) {
        /* ignore */
      }
    }
  });

  /* ---------- 初始化 ---------- */

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('sw.js')
        .then((reg) => {
          if (!navigator.serviceWorker.controller) return;
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                window.location.reload();
              }
            });
          });
        })
        .catch(() => {
          /* 离线缓存失败不影响使用 */
        });
    });
  }

  (function boot() {
    updateTodayLabel();
    els.versionLabel.textContent = '版本 ' + APP_VERSION;
    enterApp();
  })();
})();
