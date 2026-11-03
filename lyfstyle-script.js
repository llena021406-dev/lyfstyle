/* ══════════════════════════════════════════════
   LYFSTYLE — Complete Script
   • Multi-user login / register with localStorage
   • Calorie count-up (X of TARGET)
   • Weekly calorie target
   • Food expand with full nutrition + energy
   • Progress date override (debug)
   • Fixed BMI meter
   • Exercise intensity → dashboard progress
   • Profile editor (avatar, name, password)
   • Light-mode toggle
   • Animations throughout
══════════════════════════════════════════════ */

// ══════════════════════════════════════════
//  STORAGE HELPERS
// ══════════════════════════════════════════
const S = {
  get:    k     => JSON.parse(localStorage.getItem('lyf_' + k) || 'null'),
  set:    (k,v) => localStorage.setItem('lyf_' + k, JSON.stringify(v)),
  remove: k     => localStorage.removeItem('lyf_' + k),
};

// Current logged-in username key
function currentUser() { return S.get('current_user'); }
function usk(k) {       // user-scoped key
  const u = currentUser();
  return u ? u + '_' + k : k;
}
const U = {
  get:  k     => S.get(usk(k)),
  set:  (k,v) => S.set(usk(k), v),
};

// ══════════════════════════════════════════
//  DATE (with debug override)
// ══════════════════════════════════════════
let _dateOverride = null;
function today() {
  return _dateOverride || new Date().toISOString().split('T')[0];
}
function setDateOverride(d) {
  _dateOverride = d || null;
  renderProgress();
  renderToday();
}

// ══════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════
function toast(msg, dur=2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

// ══════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════
function applyTheme() {
  const dark = U.get('theme') !== 'light';
  document.body.classList.toggle('light', !dark);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.classList.toggle('on', !dark);
}
function toggleTheme() {
  U.set('theme', U.get('theme') === 'light' ? 'dark' : 'light');
  applyTheme();
}

// ══════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════
function showAuth() {
  document.getElementById('auth-screen').style.display  = 'flex';
  document.getElementById('onboarding').style.display   = 'none';
  document.getElementById('appWrap').style.display      = 'none';
}
function hideAuth() {
  document.getElementById('auth-screen').style.display = 'none';
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('active', f.id === 'form-' + tab));
}

function doLogin() {
  const username = document.getElementById('login-user').value.trim().toLowerCase();
  const password = document.getElementById('login-pass').value;
  if (!username || !password) return toast('Fill in all fields');
  const accounts = S.get('accounts') || {};
  if (!accounts[username]) return toast('Account not found');
  if (accounts[username].password !== btoa(password)) return toast('Wrong password');
  S.set('current_user', username);
  hideAuth();
  const user = U.get('user');
  if (!user) {
    // New account, go to onboarding
    document.getElementById('onboarding').style.display = 'flex';
  } else {
    document.getElementById('appWrap').style.display = 'flex';
    applyTheme();
    initApp();
  }
}

function doRegister() {
  const username = document.getElementById('reg-user').value.trim().toLowerCase();
  const password = document.getElementById('reg-pass').value;
  const confirm  = document.getElementById('reg-conf').value;
  if (!username || !password) return toast('Fill in all fields');
  if (password !== confirm)   return toast('Passwords do not match');
  if (password.length < 6)   return toast('Password must be at least 6 characters');
  const accounts = S.get('accounts') || {};
  if (accounts[username]) return toast('Username already taken');
  accounts[username] = { password: btoa(password), created: new Date().toISOString() };
  S.set('accounts', accounts);
  S.set('current_user', username);
  toast('Account created! Let\'s set up your profile ✨');
  hideAuth();
  document.getElementById('onboarding').style.display = 'flex';
}

function signOut() {
  S.remove('current_user');
  location.reload();
}

// ══════════════════════════════════════════
//  ONBOARDING
// ══════════════════════════════════════════
let obStep = 1;
let userData = {};

function obStep1() {
  const name = document.getElementById('ob-name').value.trim();
  const age  = +document.getElementById('ob-age').value;
  const h    = +document.getElementById('ob-height').value;
  const w    = +document.getElementById('ob-weight').value;
  if (!name || !age || !h || !w) return toast('Please fill all fields');
  userData = {
    name, age, height: h, weight: w,
    sex:      document.getElementById('ob-sex').value,
    activity: +document.getElementById('ob-activity').value,
  };
  const bmi = w / ((h/100)**2);
  const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  document.getElementById('ob-bmi-num').textContent = bmi.toFixed(1);
  document.getElementById('ob-bmi-cat').textContent = cat;
  userData.bmi    = bmi.toFixed(1);
  userData.bmiCat = cat;
  showObStep(2);
}

function selectGoal(el) {
  document.querySelectorAll('.goal-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  userData.goal = el.dataset.goal;
  const rateEl = document.getElementById('ob-rate');
  if (userData.goal === 'gain') {
    rateEl.innerHTML = '<option value="0.25">+0.25 kg/week</option><option value="0.5" selected>+0.5 kg/week</option><option value="0.75">+0.75 kg/week</option>';
  } else if (userData.goal === 'maintain') {
    rateEl.innerHTML = '<option value="0" selected>Maintain weight</option>';
  } else {
    rateEl.innerHTML = '<option value="0.25">−0.25 kg/week</option><option value="0.5" selected>−0.5 kg/week</option><option value="0.75">−0.75 kg/week</option><option value="1">−1.0 kg/week</option>';
  }
}

function obStep2() {
  if (!userData.goal) return toast('Please select a goal');
  showObStep(3);
}

function obStep3() {
  const target = +document.getElementById('ob-target').value;
  if (!target) return toast('Enter a target weight');
  userData.target = target;
  userData.rate   = +document.getElementById('ob-rate').value;
  userData.equip  = document.getElementById('ob-equip').value;

  const bmr = userData.sex === 'male'
    ? 10*userData.weight + 6.25*userData.height - 5*userData.age + 5
    : 10*userData.weight + 6.25*userData.height - 5*userData.age - 161;
  const tdee    = Math.round(bmr * userData.activity);
  const deficit = userData.goal === 'lose' ?  userData.rate * 1100
                : userData.goal === 'gain' ? -(userData.rate * 550)
                : 0;
  userData.tdee    = tdee;
  userData.budget  = Math.max(1200, Math.round(tdee - deficit));
  userData.protein = Math.round(userData.weight * 2.0);
  userData.carbs   = Math.round((userData.budget * 0.45) / 4);
  userData.fat     = Math.round((userData.budget * 0.25) / 9);

  const icons  = {lose:'🔥', maintain:'⚖️', gain:'💪'};
  const labels = {lose:'Lose weight', maintain:'Stay active', gain:'Build muscle'};
  document.getElementById('ob-summary').innerHTML = `
    <div class="bmi-badge" style="flex-direction:column;align-items:flex-start;gap:6px">
      <div style="font-size:12px;opacity:0.7;font-weight:600">DAILY CALORIE BUDGET</div>
      <div style="font-size:32px;font-weight:800;font-family:'Syne',sans-serif">${userData.budget} kcal</div>
      <div style="font-size:13px;opacity:0.8">TDEE: ${tdee} kcal · ${userData.goal==='lose'?'Deficit':userData.goal==='gain'?'Surplus':'Maintenance'}: ${Math.abs(deficit)} kcal</div>
    </div>
    <div class="card" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
      <div><div style="font-size:20px;font-weight:700;font-family:'Syne',sans-serif;color:var(--lime)">${userData.protein}g</div><div style="font-size:11px;color:var(--muted)">PROTEIN</div></div>
      <div><div style="font-size:20px;font-weight:700;font-family:'Syne',sans-serif;color:var(--blue)">${userData.carbs}g</div><div style="font-size:11px;color:var(--muted)">CARBS</div></div>
      <div><div style="font-size:20px;font-weight:700;font-family:'Syne',sans-serif;color:var(--orange)">${userData.fat}g</div><div style="font-size:11px;color:var(--muted)">FAT</div></div>
    </div>
    <div class="card" style="display:flex;gap:12px;align-items:center">
      <div style="font-size:24px">${icons[userData.goal]}</div>
      <div><div style="font-size:14px;font-weight:600">${labels[userData.goal]}</div>
      <div style="font-size:12px;color:var(--muted)">${userData.weight}kg → ${userData.target}kg${userData.rate?' · '+(userData.goal==='gain'?'+':'-')+userData.rate+' kg/week':''}</div></div>
    </div>`;
  showObStep(4);
}

function showObStep(n) {
  for (let i=1;i<=4;i++) {
    document.getElementById('ob'+i).classList.toggle('active', i===n);
    document.getElementById('d'+i).classList.toggle('done', i<=n);
  }
  obStep = n;
}

function finishOnboarding() {
  U.set('user', userData);
  U.set('weightLog', [{date: today(), weight: userData.weight}]);
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('appWrap').style.display = 'flex';
  applyTheme();
  initApp();
}

// ══════════════════════════════════════════
//  APP INIT
// ══════════════════════════════════════════
function initApp() {
  const user = U.get('user');
  if (!user) return;
  const hr = new Date().getHours();
  const greet = hr<12 ? 'Good morning' : hr<18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('today-greeting').textContent = `${greet}, ${user.name.split(' ')[0]}!`;
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const streak = calcStreak();
  document.getElementById('today-streak-badge').textContent = streak > 1 ? `🔥 ${streak}` : '';
  // Sidebar avatar
  updateSidebarAvatar();
  renderToday();
  renderWorkoutPlan();
  renderWeeklySummary();
  checkWeeklyCheckIn();
  applyTheme();
}

function updateSidebarAvatar() {
  const user = U.get('user');
  const av = document.getElementById('sidebar-avatar');
  if (!av || !user) return;
  if (user.avatar) {
    av.innerHTML = `<img src="${user.avatar}" alt="avatar">`;
  } else {
    av.textContent = (user.name || 'U')[0].toUpperCase();
  }
}

function goTo(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page===page));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id==='page-'+page));
  if (page==='today')    renderToday();
  if (page==='food')     { renderFoodLog(); searchFoods(''); }
  if (page==='progress') renderProgress();
  if (page==='reminders') renderWeeklySummary();
}

// ══════════════════════════════════════════
//  TODAY DASHBOARD
// ══════════════════════════════════════════
function renderToday() {
  const user = U.get('user'); if (!user) return;
  const log    = getTodayFoodLog();
  const eaten  = log.reduce((s,f)=>s+f.cal, 0);
  const protein= log.reduce((s,f)=>s+f.protein, 0);
  const carbs  = log.reduce((s,f)=>s+f.carbs, 0);
  const fat    = log.reduce((s,f)=>s+(f.fat||0), 0);
  const budget = user.budget;
  const pct    = Math.min(100,(eaten/budget)*100);

  // Count-up style: X of TARGET
  document.getElementById('td-cal-remain').textContent = `${eaten} of ${budget}`;
  document.getElementById('td-cal-remain').style.color = eaten > budget ? 'var(--red)' : 'var(--lime)';
  document.getElementById('td-cal-label').textContent  = eaten > budget ? 'kcal — over budget!' : 'kcal eaten today';
  document.getElementById('td-budget').textContent  = budget;
  document.getElementById('td-eaten').textContent   = eaten;
  document.getElementById('td-protein').textContent = Math.round(protein) + 'g';
  document.getElementById('td-carbs').textContent   = Math.round(carbs)   + 'g';
  document.getElementById('td-fat').textContent     = Math.round(fat)     + 'g';
  document.getElementById('cal-bar').style.width      = pct + '%';
  document.getElementById('cal-bar').style.background = pct > 100 ? 'var(--red)' : 'var(--lime)';

  // Weekly calorie progress
  renderWeeklyCalorieProgress(budget);

  // Water
  const water = getTodayWater();
  const glassesEl = document.getElementById('water-glasses');
  glassesEl.innerHTML = '';
  for (let i=0;i<8;i++) {
    const g = document.createElement('div');
    g.className = 'glass' + (i < water ? ' filled' : '');
    g.onclick   = () => { setWater(i+1); renderToday(); };
    glassesEl.appendChild(g);
  }
  document.getElementById('water-count').textContent = `${water} / 8 glasses (${water*250}ml)`;

  // Steps
  const steps = U.get('steps_' + today()) || 0;
  document.getElementById('td-steps').textContent = steps.toLocaleString();

  // Exercise intensity progress
  renderExerciseProgress();

  // Today's workout card
  renderTodayWorkoutCard();
}

function renderWeeklyCalorieProgress(dailyBudget) {
  const weeklyTarget = dailyBudget * 7;
  let weeklyEaten    = 0;
  for (let i=0;i<7;i++) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const key  = d.toISOString().split('T')[0];
    const log  = U.get('food_' + key) || [];
    weeklyEaten += log.reduce((s,f)=>s+f.cal, 0);
  }
  const pct = Math.min(100,(weeklyEaten/weeklyTarget)*100);
  const el = document.getElementById('weekly-cal-card');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)">This Week</div>
      <div style="font-size:12px;color:var(--blue)">${weeklyEaten.toLocaleString()} / ${weeklyTarget.toLocaleString()} kcal</div>
    </div>
    <div class="week-progress-bar"><div class="week-progress-fill" style="width:${pct}%;background:${pct>100?'var(--red)':'var(--blue)'}"></div></div>
    <div style="font-size:11px;color:var(--muted)">${Math.round(pct)}% of weekly calorie target · ${weeklyTarget - weeklyEaten > 0 ? (weeklyTarget-weeklyEaten).toLocaleString()+' remaining' : 'over target'}</div>`;
}

function renderExerciseProgress() {
  const el = document.getElementById('dash-exercise-progress');
  if (!el) return;
  const log = U.get('exercise_log_' + today()) || [];  // [{name, calories, intensity, duration}]
  const totalBurnEst  = log.reduce((s,e)=>s+e.calories, 0);
  const setsCompleted = U.get('sets_log_' + today()) || 0;
  const workoutDone   = (U.get('workouts_done')||{})[today()];

  const pct = workoutDone ? 100 : Math.min(100, setsCompleted * 5); // rough %
  el.innerHTML = `
    <div class="dash-exercise-bar">
      <div class="deb-label">
        <span>Exercise Progress</span>
        <span>${workoutDone ? '✓ Complete' : setsCompleted + ' sets done'}</span>
      </div>
      <div class="deb-track"><div class="deb-fill" style="width:${pct}%"></div></div>
    </div>
    ${totalBurnEst > 0 ? `<div style="font-size:11px;color:var(--orange);margin-top:4px">~${totalBurnEst} kcal burned from exercises</div>` : ''}`;
}

function getTodayFoodLog() { return U.get('food_' + today()) || []; }
function getTodayWater()   { return U.get('water_' + today()) || 0; }
function setWater(n)       { U.set('water_' + today(), n); }

function addWater() {
  const cur = getTodayWater();
  if (cur >= 8) return toast('Daily water goal reached! 💧');
  setWater(cur + 1);
  renderToday();
  toast(`+250ml water · ${cur+1} glasses today`);
}

function logSteps() {
  const s = prompt('Enter steps today:');
  if (s && +s > 0) { U.set('steps_'+today(), +s); renderToday(); toast('Steps logged! 👟'); }
}

function quickLogWeight() {
  const v = parseFloat(document.getElementById('quick-weight').value);
  if (!v) return;
  const log = U.get('weightLog') || [];
  const ex  = log.findIndex(e=>e.date===today());
  if (ex>=0) log[ex].weight = v; else log.push({date:today(),weight:v});
  U.set('weightLog', log);
  document.getElementById('quick-weight').value = '';
  toast(`Weight logged: ${v} kg`);
  adjustCaloriesIfNeeded();
}

function renderTodayWorkoutCard() {
  const plan  = getWorkoutPlan();
  const card  = document.getElementById('today-workout-card');
  const dow   = new Date().getDay();
  const done  = (U.get('workouts_done')||{})[today()];
  const wDay  = plan.days.find(d=>d.dayIndex===dow) || plan.days[0];
  if (!wDay) { card.innerHTML='<div style="color:var(--muted);font-size:13px">Rest day today — recover strong 🌿</div>'; return; }
  const badge = done
    ? '<div class="workout-badge" style="background:rgba(200,241,53,0.1);color:var(--lime)">✓ Completed</div>'
    : '<div class="workout-badge" style="background:rgba(255,140,66,0.1);color:var(--orange)">● Active today</div>';
  card.innerHTML = `
    ${badge}
    <div style="font-size:16px;font-weight:700;font-family:\'Syne\',sans-serif;margin-bottom:4px">${wDay.name}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${wDay.exercises.length} exercises · ${wDay.duration} min</div>
    <div class="wday-exercises">
      ${wDay.exercises.slice(0,3).map(e=>`<div class="ex-row"><span>${e.name}</span><span>${e.sets}×${e.reps}</span></div>`).join('')}
      ${wDay.exercises.length>3?`<div style="font-size:12px;color:var(--muted)">+${wDay.exercises.length-3} more…</div>`:''}
    </div>`;
}

// ══════════════════════════════════════════
//  WEEKLY CHECK-IN
// ══════════════════════════════════════════
function checkWeeklyCheckIn() {
  const user  = U.get('user'); if (!user) return;
  const last  = U.get('last_checkin');
  const isSun = new Date().getDay() === 0;
  if (!isSun || last === today()) return;
  const log = U.get('weightLog') || [];
  if (log.length < 2) return;
  const latest = log[log.length-1].weight;
  const prev   = log[log.length-2].weight;
  const diff   = (latest - prev).toFixed(1);
  const area   = document.getElementById('checkin-area');
  if (user.goal === 'lose' && +diff >= 0) {
    user.budget = Math.max(1200, user.budget - 100);
    U.set('user', user);
    area.innerHTML = `<div class="checkin-banner" style="margin-bottom:0;margin-top:16px">
      <div class="ci-icon">📋</div>
      <div class="ci-text"><strong>Weekly check-in:</strong> Weight unchanged. Budget reduced by 100 kcal → <strong>${user.budget} kcal/day</strong>.</div>
    </div>`;
  } else {
    area.innerHTML = `<div class="checkin-banner" style="margin-bottom:0;margin-top:16px;border-color:rgba(200,241,53,0.2);background:rgba(200,241,53,0.05)">
      <div class="ci-icon">✅</div>
      <div class="ci-text"><strong>Weekly check-in:</strong> ${+diff<0?`Down ${Math.abs(diff)}kg`:`Up ${diff}kg`} — keeping <strong>${user.budget} kcal/day</strong>.</div>
    </div>`;
  }
  U.set('last_checkin', today());
}

function calcStreak() {
  const done = U.get('workouts_done') || {};
  let streak = 0; const d = new Date();
  for (let i=0;i<30;i++) {
    const key = d.toISOString().split('T')[0];
    if (done[key]) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

// ══════════════════════════════════════════
//  FOOD DATABASE (with energy kJ)
// ══════════════════════════════════════════
const FOODS = [
  {name:'Chicken breast (100g)',  cal:165, kj:690,  protein:31,  carbs:0,   fat:3.6,  fiber:0},
  {name:'Brown rice (100g cooked)',cal:112,kj:468,  protein:2.6, carbs:24,  fat:0.8,  fiber:1.8},
  {name:'Eggs (1 large)',         cal:78,  kj:326,  protein:6,   carbs:0.6, fat:5,    fiber:0},
  {name:'Oatmeal (100g dry)',     cal:389, kj:1627, protein:17,  carbs:66,  fat:7,    fiber:10},
  {name:'Greek yogurt (150g)',    cal:100, kj:418,  protein:17,  carbs:6,   fat:0.7,  fiber:0},
  {name:'Banana (1 medium)',      cal:105, kj:439,  protein:1.3, carbs:27,  fat:0.4,  fiber:3.1},
  {name:'Almonds (30g)',          cal:173, kj:723,  protein:6,   carbs:6,   fat:15,   fiber:3.5},
  {name:'Salmon (100g)',          cal:208, kj:870,  protein:20,  carbs:0,   fat:13,   fiber:0},
  {name:'Sweet potato (100g)',    cal:86,  kj:360,  protein:1.6, carbs:20,  fat:0.1,  fiber:3},
  {name:'Broccoli (100g)',        cal:34,  kj:142,  protein:2.8, carbs:7,   fat:0.4,  fiber:2.6},
  {name:'Whole milk (250ml)',     cal:149, kj:623,  protein:8,   carbs:12,  fat:8,    fiber:0},
  {name:'White bread (1 slice)',  cal:79,  kj:330,  protein:2.7, carbs:15,  fat:1,    fiber:0.6},
  {name:'Peanut butter (2 tbsp)', cal:188, kj:786,  protein:8,   carbs:6,   fat:16,   fiber:1.6},
  {name:'Tuna (100g, canned)',    cal:116, kj:485,  protein:26,  carbs:0,   fat:1,    fiber:0},
  {name:'Avocado (half)',         cal:120, kj:502,  protein:1.5, carbs:6,   fat:11,   fiber:5},
  {name:'Apple (1 medium)',       cal:95,  kj:397,  protein:0.5, carbs:25,  fat:0.3,  fiber:4.4},
  {name:'Protein shake (1 scoop)',cal:130, kj:544,  protein:25,  carbs:5,   fat:2,    fiber:0},
  {name:'White rice (100g cooked)',cal:130,kj:544,  protein:2.7, carbs:28,  fat:0.3,  fiber:0.4},
  {name:'Pasta (100g cooked)',    cal:131, kj:548,  protein:5,   carbs:25,  fat:1.1,  fiber:1.8},
  {name:'Cheddar cheese (30g)',   cal:120, kj:502,  protein:7,   carbs:0.4, fat:10,   fiber:0},
];

function foodItemHTML(f, showAddControls=true) {
  const safeId = f.name.replace(/\W/g,'');
  const totalCals = f.cal;
  // percent of macros by kcal
  const proteinPct = Math.round((f.protein*4 / totalCals)*100) || 0;
  const carbsPct   = Math.round((f.carbs*4  / totalCals)*100) || 0;
  const fatPct     = Math.round((f.fat*9    / totalCals)*100) || 0;

  return `
  <div class="food-item" id="fi-${safeId}">
    <div class="food-item-header" onclick="toggleFoodExpand('fi-${safeId}')">
      <div style="flex:1">
        <div class="food-name">${f.name}</div>
        <div class="food-energy">${f.kj} kJ · ${f.cal} kcal</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${showAddControls ? `
        <select class="inp" id="meal-sel-${safeId}" style="padding:5px 8px;font-size:12px;width:86px" onclick="event.stopPropagation()">
          <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option>
          <option value="dinner" selected>Dinner</option><option value="snacks">Snacks</option>
        </select>
        <button class="food-add-btn" onclick="event.stopPropagation();addFood(${JSON.stringify(f).replace(/"/g,"'")},document.getElementById('meal-sel-${safeId}').value)">+</button>
        ` : ''}
        <span class="food-expand-arrow">▼</span>
      </div>
    </div>
    <div class="food-details">
      <div class="food-macro-grid">
        <div class="fmg-item">
          <div class="fmg-val" style="color:var(--orange)">${f.kj}</div>
          <div class="fmg-lbl">kJ Energy</div>
          <div class="fmg-bar" style="background:var(--orange);width:100%"></div>
        </div>
        <div class="fmg-item">
          <div class="fmg-val" style="color:var(--lime)">${f.protein}g</div>
          <div class="fmg-lbl">Protein</div>
          <div class="fmg-bar" style="background:var(--lime);width:${proteinPct}%"></div>
        </div>
        <div class="fmg-item">
          <div class="fmg-val" style="color:var(--blue)">${f.carbs}g</div>
          <div class="fmg-lbl">Carbs</div>
          <div class="fmg-bar" style="background:var(--blue);width:${carbsPct}%"></div>
        </div>
        <div class="fmg-item">
          <div class="fmg-val" style="color:var(--red)">${f.fat}g</div>
          <div class="fmg-lbl">Fat</div>
          <div class="fmg-bar" style="background:var(--red);width:${fatPct}%"></div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);padding:0 2px">
        Fiber: ${f.fiber}g · Protein ${proteinPct}% · Carbs ${carbsPct}% · Fat ${fatPct}% of calories
      </div>
    </div>
  </div>`;
}

function toggleFoodExpand(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('expanded');
}

function searchFoods(q) {
  const res = document.getElementById('search-results');
  if (!q) { res.innerHTML=''; return; }
  const found = FOODS.filter(f=>f.name.toLowerCase().includes(q.toLowerCase())).slice(0,8);
  if (!found.length) {
    res.innerHTML='<div style="color:var(--muted);font-size:13px;padding:12px 24px">No foods found. Use custom entry.</div>';
    return;
  }
  res.innerHTML = `<div class="section-label" style="padding:12px 24px 6px">Search results</div>
    <div style="padding:0 24px">${found.map(f=>foodItemHTML(f,true)).join('')}</div>`;
}

function addFood(f, meal) {
  const log = getTodayFoodLog();
  log.push({...f, meal, id: Date.now()});
  U.set('food_'+today(), log);
  renderFoodLog();
  renderToday();
  document.getElementById('food-search').value = '';
  document.getElementById('search-results').innerHTML = '';
  toast(`${f.name} added to ${meal} ✓`);
}

function addCustomFood() {
  const name  = document.getElementById('cf-name').value.trim();
  const cal   = +document.getElementById('cf-cal').value   || 0;
  const pro   = +document.getElementById('cf-pro').value   || 0;
  const carbs = +document.getElementById('cf-carbs').value || 0;
  const meal  = document.getElementById('cf-meal').value;
  if (!name || !cal) return toast('Enter at least name and calories');
  addFood({name, cal, kj: Math.round(cal*4.184), protein:pro, carbs, fat:0, fiber:0}, meal);
  ['cf-name','cf-cal','cf-pro','cf-carbs'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('custom-food-area').style.display='none';
}

function toggleCustomFood() {
  const el = document.getElementById('custom-food-area');
  el.style.display = el.style.display==='none' ? 'block' : 'none';
}

function deleteFood(id) {
  let log = getTodayFoodLog();
  log = log.filter(f=>f.id!==id);
  U.set('food_'+today(), log);
  renderFoodLog();
  renderToday();
}

function renderFoodLog() {
  const log   = getTodayFoodLog();
  const meals = {breakfast:'🌅 Breakfast', lunch:'☀️ Lunch', dinner:'🌙 Dinner', snacks:'🍎 Snacks'};
  const area  = document.getElementById('food-log-sections');

  if (!log.length) {
    area.innerHTML = `<div style="padding:16px 24px">
      <div class="section-label">Suggested foods</div>
      <div>${FOODS.slice(0,5).map(f=>foodItemHTML(f,true)).join('')}</div>
    </div>`;
    return;
  }
  area.innerHTML = Object.entries(meals).map(([key,label]) => {
    const items = log.filter(f=>f.meal===key);
    if (!items.length) return '';
    return `<div class="meal-section">
      <div class="meal-section-title">${label} · ${items.reduce((s,f)=>s+f.cal,0)} kcal</div>
      ${items.map(f=>`
        <div class="logged-food">
          <div>
            <div class="lf-name">${f.name}</div>
            <div style="font-size:11px;color:var(--muted)">${f.kj||Math.round(f.cal*4.184)} kJ · P:${f.protein}g · C:${f.carbs}g · F:${f.fat||0}g</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="lf-cal">${f.cal}</span>
            <button class="lf-del" onclick="deleteFood(${f.id})">✕</button>
          </div>
        </div>`).join('')}
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════
//  WORKOUT PLANS
// ══════════════════════════════════════════
function getWorkoutPlan() {
  const user = U.get('user') || {};
  const goal = user.goal || 'maintain';
  const plans = {
    lose: {
      name:'Fat Loss Plan', desc:'3-day full-body · bodyweight + daily steps',
      days:[
        { dayIndex:1, name:'Full Body A', duration:35, intensity:'medium',
          exercises:[
            {name:'Push-ups',sets:3,reps:'12-15',rest:60,muscle:'Chest',emoji:'💪',intensity:'medium',calPerSet:8},
            {name:'Bodyweight Squats',sets:3,reps:'15-20',rest:60,muscle:'Legs',emoji:'🦵',intensity:'medium',calPerSet:10},
            {name:'Plank Hold',sets:3,reps:'30-45s',rest:45,muscle:'Core',emoji:'🔥',intensity:'low',calPerSet:4},
            {name:'Mountain Climbers',sets:3,reps:'20',rest:45,muscle:'Cardio',emoji:'🏃',intensity:'high',calPerSet:12},
            {name:'Glute Bridges',sets:3,reps:'15',rest:45,muscle:'Glutes',emoji:'🍑',intensity:'low',calPerSet:5},
            {name:'Jumping Jacks',sets:2,reps:'30',rest:30,muscle:'Cardio',emoji:'⚡',intensity:'medium',calPerSet:9},
          ]},
        { dayIndex:3, name:'Full Body B', duration:35, intensity:'high',
          exercises:[
            {name:'Reverse Lunges',sets:3,reps:'10 each',rest:60,muscle:'Legs',emoji:'🦵',intensity:'medium',calPerSet:9},
            {name:'Pike Push-ups',sets:3,reps:'10-12',rest:60,muscle:'Shoulders',emoji:'💪',intensity:'medium',calPerSet:8},
            {name:'Superman Hold',sets:3,reps:'12',rest:45,muscle:'Back',emoji:'🦸',intensity:'low',calPerSet:4},
            {name:'Bicycle Crunches',sets:3,reps:'20',rest:45,muscle:'Core',emoji:'🔥',intensity:'medium',calPerSet:7},
            {name:'Burpees',sets:3,reps:'8-10',rest:60,muscle:'Full body',emoji:'⚡',intensity:'high',calPerSet:15},
            {name:'High Knees',sets:2,reps:'30s',rest:30,muscle:'Cardio',emoji:'🏃',intensity:'high',calPerSet:11},
          ]},
        { dayIndex:5, name:'Full Body C', duration:35, intensity:'high',
          exercises:[
            {name:'Jump Squats',sets:3,reps:'12',rest:60,muscle:'Legs',emoji:'🦵',intensity:'high',calPerSet:13},
            {name:'Tricep Dips (chair)',sets:3,reps:'12',rest:60,muscle:'Arms',emoji:'💪',intensity:'medium',calPerSet:7},
            {name:'Side Plank',sets:2,reps:'30s each',rest:45,muscle:'Core',emoji:'🔥',intensity:'low',calPerSet:4},
            {name:'Step-ups',sets:3,reps:'12 each',rest:60,muscle:'Legs',emoji:'🦵',intensity:'medium',calPerSet:9},
            {name:'Push-up to T',sets:3,reps:'10',rest:60,muscle:'Full body',emoji:'⚡',intensity:'high',calPerSet:12},
            {name:'Bear Crawl',sets:2,reps:'20s',rest:30,muscle:'Cardio',emoji:'🐻',intensity:'high',calPerSet:14},
          ]},
      ]},
    gain: {
      name:'Muscle Building Plan', desc:'4-day upper/lower · dumbbells',
      days:[
        { dayIndex:1, name:'Upper A (Push)', duration:50, intensity:'high',
          exercises:[
            {name:'DB Bench Press',sets:4,reps:'8-10',rest:90,muscle:'Chest',emoji:'💪',intensity:'high',calPerSet:11},
            {name:'DB Shoulder Press',sets:4,reps:'8-10',rest:90,muscle:'Shoulders',emoji:'🏋️',intensity:'high',calPerSet:10},
            {name:'DB Lateral Raise',sets:3,reps:'12-15',rest:60,muscle:'Shoulders',emoji:'⚡',intensity:'medium',calPerSet:6},
            {name:'Tricep Kickbacks',sets:3,reps:'12',rest:60,muscle:'Triceps',emoji:'💪',intensity:'medium',calPerSet:6},
            {name:'Push-ups',sets:3,reps:'12-15',rest:60,muscle:'Chest',emoji:'🔥',intensity:'medium',calPerSet:8},
            {name:'DB Front Raise',sets:3,reps:'12',rest:60,muscle:'Shoulders',emoji:'💪',intensity:'medium',calPerSet:6},
          ]},
        { dayIndex:2, name:'Lower A', duration:50, intensity:'high',
          exercises:[
            {name:'DB Goblet Squat',sets:4,reps:'10-12',rest:90,muscle:'Quads',emoji:'🦵',intensity:'high',calPerSet:13},
            {name:'DB Romanian Deadlift',sets:4,reps:'10',rest:90,muscle:'Hamstrings',emoji:'🔥',intensity:'high',calPerSet:12},
            {name:'DB Lunges',sets:3,reps:'10 each',rest:75,muscle:'Legs',emoji:'🦵',intensity:'medium',calPerSet:10},
            {name:'Calf Raises',sets:4,reps:'15-20',rest:60,muscle:'Calves',emoji:'⚡',intensity:'low',calPerSet:4},
            {name:'Glute Bridge',sets:3,reps:'15',rest:60,muscle:'Glutes',emoji:'🍑',intensity:'low',calPerSet:5},
          ]},
        { dayIndex:4, name:'Upper B (Pull)', duration:50, intensity:'high',
          exercises:[
            {name:'DB Bent Row',sets:4,reps:'8-10',rest:90,muscle:'Back',emoji:'🏋️',intensity:'high',calPerSet:11},
            {name:'DB Bicep Curl',sets:4,reps:'10-12',rest:75,muscle:'Biceps',emoji:'💪',intensity:'medium',calPerSet:7},
            {name:'DB Hammer Curl',sets:3,reps:'12',rest:60,muscle:'Biceps',emoji:'💪',intensity:'medium',calPerSet:6},
            {name:'DB Pull-over',sets:3,reps:'12',rest:75,muscle:'Back',emoji:'🦸',intensity:'medium',calPerSet:8},
            {name:'DB Face Pull (band)',sets:3,reps:'15',rest:60,muscle:'Rear delts',emoji:'⚡',intensity:'medium',calPerSet:6},
            {name:'Reverse Fly',sets:3,reps:'15',rest:60,muscle:'Upper back',emoji:'🦸',intensity:'medium',calPerSet:6},
          ]},
        { dayIndex:5, name:'Lower B', duration:50, intensity:'high',
          exercises:[
            {name:'DB Split Squat',sets:4,reps:'10 each',rest:90,muscle:'Quads',emoji:'🦵',intensity:'high',calPerSet:12},
            {name:'DB Stiff-leg DL',sets:4,reps:'10',rest:90,muscle:'Hamstrings',emoji:'🔥',intensity:'high',calPerSet:12},
            {name:'Step-ups with DB',sets:3,reps:'12 each',rest:75,muscle:'Legs',emoji:'🦵',intensity:'medium',calPerSet:10},
            {name:'DB Sumo Squat',sets:3,reps:'12',rest:75,muscle:'Glutes',emoji:'🍑',intensity:'medium',calPerSet:11},
            {name:'Single-leg Calf Raise',sets:3,reps:'15 each',rest:45,muscle:'Calves',emoji:'⚡',intensity:'low',calPerSet:4},
          ]},
      ]},
    maintain: {
      name:'Stay Active Circuit', desc:'3-day home circuit · 20 min each',
      days:[
        { dayIndex:1, name:'20-Min Circuit A', duration:20, intensity:'medium',
          exercises:[
            {name:'Jumping Jacks',sets:2,reps:'45s',rest:15,muscle:'Cardio',emoji:'⚡',intensity:'medium',calPerSet:9},
            {name:'Push-ups',sets:2,reps:'12',rest:20,muscle:'Chest',emoji:'💪',intensity:'medium',calPerSet:8},
            {name:'Air Squats',sets:2,reps:'15',rest:20,muscle:'Legs',emoji:'🦵',intensity:'medium',calPerSet:9},
            {name:'Mountain Climbers',sets:2,reps:'30s',rest:15,muscle:'Core',emoji:'🔥',intensity:'high',calPerSet:12},
            {name:'Plank',sets:2,reps:'30s',rest:15,muscle:'Core',emoji:'🔥',intensity:'low',calPerSet:4},
          ]},
        { dayIndex:3, name:'20-Min Circuit B', duration:20, intensity:'medium',
          exercises:[
            {name:'High Knees',sets:2,reps:'40s',rest:15,muscle:'Cardio',emoji:'🏃',intensity:'high',calPerSet:11},
            {name:'Lunges',sets:2,reps:'10 each',rest:20,muscle:'Legs',emoji:'🦵',intensity:'medium',calPerSet:9},
            {name:'Tricep Dips',sets:2,reps:'12',rest:20,muscle:'Arms',emoji:'💪',intensity:'medium',calPerSet:6},
            {name:'Bicycle Crunches',sets:2,reps:'20',rest:15,muscle:'Core',emoji:'🔥',intensity:'medium',calPerSet:7},
            {name:'Burpees',sets:2,reps:'8',rest:30,muscle:'Full body',emoji:'⚡',intensity:'high',calPerSet:15},
          ]},
        { dayIndex:5, name:'20-Min Circuit C', duration:20, intensity:'medium',
          exercises:[
            {name:'Box Jumps (low)',sets:2,reps:'10',rest:20,muscle:'Power',emoji:'⚡',intensity:'high',calPerSet:13},
            {name:'Pike Push-ups',sets:2,reps:'10',rest:20,muscle:'Shoulders',emoji:'💪',intensity:'medium',calPerSet:8},
            {name:'Glute Bridges',sets:2,reps:'15',rest:15,muscle:'Glutes',emoji:'🍑',intensity:'low',calPerSet:5},
            {name:'Jumping Squats',sets:2,reps:'12',rest:20,muscle:'Legs',emoji:'🦵',intensity:'high',calPerSet:13},
            {name:'Flutter Kicks',sets:2,reps:'30s',rest:15,muscle:'Core',emoji:'🔥',intensity:'medium',calPerSet:6},
          ]},
      ]},
  };
  return plans[U.get('user')?.goal] || plans.maintain;
}

let currentWorkoutDay = null;

function renderWorkoutPlan() {
  const plan = getWorkoutPlan();
  const user = U.get('user') || {};
  document.getElementById('workout-tabs').innerHTML = `<div class="chip active" onclick="showPlanView()">📋 Overview</div>`;
  const icons = {lose:'🔥', maintain:'⚖️', gain:'💪'};
  document.getElementById('plan-info').innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="font-size:32px">${icons[user.goal]||'⚡'}</div>
      <div>
        <div class="plan-title">${plan.name}</div>
        <div class="plan-meta">${plan.desc}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="chip active" style="font-size:11px">${plan.days.length} days/week</span>
          <span class="chip" style="font-size:11px">${user.equip||'Bodyweight'}</span>
          <span class="chip" style="font-size:11px">${plan.days[0]?.duration||30} min/session</span>
        </div>
      </div>
    </div>`;
  const done = U.get('workouts_done') || {};
  document.getElementById('workout-days-list').innerHTML = plan.days.map(day => `
    <div class="day-chip${done[today()]&&day.dayIndex===new Date().getDay()?' done':''}" onclick="showWorkoutDay('${day.name}')">
      <div>
        <div class="dc-left">${day.name}</div>
        <div class="dc-right">${day.exercises.length} exercises · ${day.duration} min</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${done[today()]&&day.dayIndex===new Date().getDay()
          ? '<span class="dc-check">✓ Done</span>'
          : '<span style="color:var(--muted);font-size:18px">›</span>'}
      </div>
    </div>`).join('');
}

function showPlanView() {
  document.getElementById('plan-info').style.display = 'block';
  document.getElementById('workout-days-list').style.display = 'block';
  document.getElementById('workout-detail-view').style.display = 'none';
  document.getElementById('workout-panel-title').textContent  = 'Your Plan';
  document.getElementById('workout-back-btn').innerHTML = '';
}

function showWorkoutDay(dayName) {
  const plan = getWorkoutPlan();
  const day  = plan.days.find(d=>d.name===dayName);
  if (!day) return;
  currentWorkoutDay = day;
  document.getElementById('plan-info').style.display = 'none';
  document.getElementById('workout-days-list').style.display = 'none';
  document.getElementById('workout-panel-title').textContent = dayName;
  document.getElementById('workout-back-btn').innerHTML = `<button class="btn btn-ghost" style="padding:8px 14px;font-size:13px" onclick="showPlanView()">← Back</button>`;
  const detail = document.getElementById('workout-detail-view');
  detail.style.display = 'block';
  detail.innerHTML = day.exercises.map((ex, ei) => {
    const intColors = {low:'intensity-low', medium:'intensity-medium', high:'intensity-high'};
    const intLabel  = {low:'Low intensity', medium:'Moderate', high:'High intensity'};
    return `
    <div class="ex-card" id="ex-${ei}" style="animation-delay:${ei*0.05}s">
      <div class="ex-header">
        <div>
          <div class="ex-name">${ex.emoji} ${ex.name}</div>
          <div class="ex-meta">${ex.sets} sets · ${ex.reps} reps · ${ex.rest}s rest</div>
          <span class="intensity-badge ${intColors[ex.intensity]}">${ex.intensity==='high'?'🔥':ex.intensity==='medium'?'⚡':'💧'} ${intLabel[ex.intensity]}</span>
        </div>
        <span class="ex-tag">${ex.muscle}</span>
      </div>
      <div class="ex-demo" onclick="playDemo('${ex.name}','${ex.emoji}',${ei})" id="demo-${ei}">
        <span style="font-size:40px">${ex.emoji}</span>
      </div>
      <div class="ex-sets" id="sets-${ei}">
        ${Array.from({length:ex.sets},(_,si)=>`
          <button class="set-btn" id="set-${ei}-${si}" onclick="logSet(${ei},${si},${ex.rest},${ex.calPerSet||8})">Set ${si+1}</button>
        `).join('')}
      </div>
    </div>`;
  }).join('') +
  `<div style="margin:16px 0 4px"><button class="btn btn-lime btn-full" onclick="completeWorkout()">✓ Mark Workout Complete</button></div>`;
}

function playDemo(name, emoji, idx) {
  const d = document.getElementById('demo-'+idx);
  d.innerHTML = `<span style="font-size:40px;animation:bounce 0.5s ease infinite alternate">${emoji}</span><div style="position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:11px;color:var(--lime)">${name} · 10s demo</div>`;
  setTimeout(()=>{ d.innerHTML=`<span style="font-size:40px">${emoji}</span>`; }, 10000);
}

let restTimer = null;
function logSet(exIdx, setIdx, restSecs, calPerSet=8) {
  const btn = document.getElementById(`set-${exIdx}-${setIdx}`);
  btn.classList.add('done');
  // Track sets for today
  const sets = (U.get('sets_log_'+today())||0) + 1;
  U.set('sets_log_'+today(), sets);
  // Track calories burned
  const exLog = U.get('exercise_log_'+today()) || [];
  exLog.push({name:`Set ${setIdx+1}`, calories: calPerSet, timestamp: Date.now()});
  U.set('exercise_log_'+today(), exLog);
  startRest(restSecs);
}

function startRest(secs) {
  document.getElementById('restOverlay').classList.add('show');
  let rem = secs;
  document.getElementById('restNum').textContent = rem;
  clearInterval(restTimer);
  restTimer = setInterval(()=>{
    rem--;
    document.getElementById('restNum').textContent = rem;
    if (rem<=0) stopRest();
  }, 1000);
}
function stopRest() {
  clearInterval(restTimer);
  document.getElementById('restOverlay').classList.remove('show');
}

function completeWorkout() {
  const done = U.get('workouts_done') || {};
  done[today()] = true;
  U.set('workouts_done', done);
  toast('💪 Workout complete! Great job!');
  showPlanView();
  renderWorkoutPlan();
  renderTodayWorkoutCard();
  renderExerciseProgress();
}

// ══════════════════════════════════════════
//  PROGRESS
// ══════════════════════════════════════════
let weightChart = null;

function renderProgress() {
  const log    = (U.get('weightLog') || []).slice(-30);
  const labels = log.map(e => new Date(e.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}));
  const values = log.map(e => e.weight);
  const ctx    = document.getElementById('weightChart').getContext('2d');
  if (weightChart) weightChart.destroy();
  weightChart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[{
      label:'Weight (kg)', data: values,
      borderColor:'#C8F135', backgroundColor:'rgba(200,241,53,0.07)',
      tension:0.4, fill:true, pointBackgroundColor:'#C8F135',
      pointRadius:4, pointHoverRadius:6,
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:v=>`${v.parsed.y} kg`}}},
      scales:{
        y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#888',font:{size:11}}},
        x:{grid:{display:false},ticks:{color:'#888',font:{size:10},maxTicksLimit:6}}
      }
    }
  });
  const hist     = document.getElementById('weight-history');
  const reversed = [...log].reverse();
  hist.innerHTML = reversed.map((e,i) => {
    const prev  = reversed[i+1];
    const delta = prev ? (e.weight - prev.weight).toFixed(1) : null;
    const cls   = delta===null ? '' : +delta<0 ? 'dn' : 'up';
    return `<div class="wh-item" style="animation-delay:${i*0.04}s">
      <div class="wh-date">${new Date(e.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
      <div style="display:flex;align-items:center;gap:10px">
        ${delta!==null?`<span class="wh-delta ${cls}">${+delta>0?'+':''}${delta}kg</span>`:''}
        <span class="wh-val">${e.weight} kg</span>
      </div>
    </div>`;
  }).join('');
}

function logWeight() {
  const dateInput = document.getElementById('wl-date');
  const dateVal   = dateInput ? dateInput.value : today();
  const v = parseFloat(document.getElementById('wl-input').value);
  if (!v || v<20 || v>400) return toast('Enter a valid weight');
  const log = U.get('weightLog') || [];
  const ex  = log.findIndex(e=>e.date===dateVal);
  if (ex>=0) log[ex].weight = v; else log.push({date:dateVal, weight:v});
  log.sort((a,b)=>a.date.localeCompare(b.date));
  U.set('weightLog', log);
  document.getElementById('wl-input').value = '';
  adjustCaloriesIfNeeded();
  renderProgress();
  toast(`Weight logged: ${v} kg ✓`);
}

function adjustCaloriesIfNeeded() { /* weekly check-in handles this */ }

// ══════════════════════════════════════════
//  BMI CALCULATOR (fixed meter)
// ══════════════════════════════════════════
function calcBMI() {
  const h = parseFloat(document.getElementById('bmi-h').value);
  const w = parseFloat(document.getElementById('bmi-w').value);
  if (!h || !w) return toast('Enter height and weight');
  const bmi = w / ((h/100)**2);

  const result = document.getElementById('bmi-result');
  result.style.display = 'block';
  result.style.animation = 'slideUp 0.3s ease';

  // Count-up animation
  const valEl = document.getElementById('bmi-value');
  const start = performance.now();
  (function animate(t) {
    const p = Math.min((t-start)/1000, 1);
    const e = 1 - Math.pow(1-p, 3);
    valEl.textContent = (bmi * e).toFixed(1);
    if (p < 1) requestAnimationFrame(animate);
  })(start);

  let cat, color, desc;
  if      (bmi < 18.5) { cat='Underweight'; color='var(--blue)';   desc='Consider gaining healthy weight'; }
  else if (bmi < 25)   { cat='Normal';      color='var(--lime)';   desc='Great! Maintain your healthy weight'; }
  else if (bmi < 30)   { cat='Overweight';  color='var(--orange)'; desc='Consider a balanced diet and exercise'; }
  else                 { cat='Obese';       color='var(--red)';    desc='Consult a healthcare provider'; }

  document.getElementById('bmi-category').textContent = cat;
  document.getElementById('bmi-category').style.color = color;
  document.getElementById('bmi-desc').textContent     = desc;

  // Ring animation
  const circ   = 2 * Math.PI * 52;
  const maxBMI = 40;
  const pct    = Math.min(bmi / maxBMI, 1);
  const ring   = document.getElementById('bmi-ring');
  ring.style.stroke = color;
  setTimeout(()=>{ ring.style.strokeDashoffset = circ * (1 - pct); }, 100);

  // ── Fixed BMI meter indicator ──
  // Scale: underweight 16-18.5 | normal 18.5-25 | overweight 25-30 | obese 30-40
  // Total range = 16 to 40 = 24 units, mapped to 0–100%
  const minBMI = 16, rangeBMI = 40 - 16; // = 24
  const clampedBMI = Math.max(minBMI, Math.min(40, bmi));
  const indicatorPct = ((clampedBMI - minBMI) / rangeBMI) * 100;
  const indicator = document.getElementById('bmi-indicator-wrap');
  if (indicator) {
    setTimeout(()=>{
      indicator.style.left = indicatorPct + '%';
      const pin = indicator.querySelector('.bmi-indicator-pin');
      if (pin) pin.style.background = color;
    }, 150);
  }

  // Save to profile
  const user = U.get('user') || {};
  user.height = h; user.weight = w; user.bmi = bmi.toFixed(1);
  U.set('user', user);
  toast(`BMI: ${bmi.toFixed(1)} — ${cat}`);
}

// ══════════════════════════════════════════
//  REMINDERS
// ══════════════════════════════════════════
function toggleReminder(el) { el.classList.toggle('on'); }

function renderWeeklySummary() {
  const log    = U.get('weightLog') || [];
  const done   = U.get('workouts_done') || {};
  const streak = calcStreak();
  let weightChange = '—';
  if (log.length >= 2) {
    const diff = (log[log.length-1].weight - log[Math.max(0,log.length-8)].weight).toFixed(1);
    weightChange = (+diff > 0 ? '+' : '') + diff + ' kg';
  }
  const workoutsThisWeek = Object.keys(done).filter(d=>{
    const dd = new Date(d); const now = new Date();
    return (now - dd) < 7*86400000;
  }).length;
  document.getElementById('ws-stats').innerHTML = `
    <div class="ws-stat"><div class="v">${weightChange}</div><div class="l">Weight</div></div>
    <div class="ws-stat"><div class="v">${workoutsThisWeek}</div><div class="l">Workouts</div></div>
    <div class="ws-stat"><div class="v" style="color:var(--lime)">🔥 ${streak}</div><div class="l">Streak</div></div>`;
}

// ══════════════════════════════════════════
//  PROFILE EDITOR
// ══════════════════════════════════════════
function openProfileModal() {
  const user = U.get('user') || {};
  document.getElementById('profile-name-inp').value = user.name || '';
  // Load avatar
  const avatarEl = document.getElementById('profile-avatar-img');
  if (user.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" alt="avatar"><div class="profile-avatar-overlay">📷</div>`;
  } else {
    avatarEl.innerHTML = `<span>${(user.name||'U')[0].toUpperCase()}</span><div class="profile-avatar-overlay">📷</div>`;
  }
  document.getElementById('profile-modal').classList.add('show');
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.remove('show');
}

function saveProfileName() {
  const name = document.getElementById('profile-name-inp').value.trim();
  if (!name) return toast('Name cannot be empty');
  const user = U.get('user') || {};
  user.name = name;
  U.set('user', user);
  updateSidebarAvatar();
  const greetEl = document.getElementById('today-greeting');
  if (greetEl) greetEl.textContent = greetEl.textContent.replace(/,.*/, `, ${name.split(' ')[0]}!`);
  toast('Name updated ✓');
}

function triggerAvatarUpload() {
  document.getElementById('avatar-file-input').click();
}

function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 500000) return toast('Image too large (max 500KB)');
  const reader = new FileReader();
  reader.onload = e => {
    const user = U.get('user') || {};
    user.avatar = e.target.result;
    U.set('user', user);
    const avatarEl = document.getElementById('profile-avatar-img');
    avatarEl.innerHTML = `<img src="${e.target.result}" alt="avatar"><div class="profile-avatar-overlay">📷</div>`;
    updateSidebarAvatar();
    toast('Avatar updated ✓');
  };
  reader.readAsDataURL(file);
}

function changePassword() {
  const oldPass = document.getElementById('prof-old-pass').value;
  const newPass = document.getElementById('prof-new-pass').value;
  const conPass = document.getElementById('prof-con-pass').value;
  if (!oldPass || !newPass) return toast('Fill in all password fields');
  if (newPass !== conPass)  return toast('New passwords do not match');
  if (newPass.length < 6)  return toast('Password must be at least 6 characters');
  const accounts  = S.get('accounts') || {};
  const username  = currentUser();
  if (!accounts[username]) return toast('Account error');
  if (accounts[username].password !== btoa(oldPass)) return toast('Old password is incorrect');
  accounts[username].password = btoa(newPass);
  S.set('accounts', accounts);
  ['prof-old-pass','prof-new-pass','prof-con-pass'].forEach(id=>document.getElementById(id).value='');
  toast('Password changed successfully ✓');
}

// ══════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════
(function boot() {
  const cu = S.get('current_user');
  if (!cu) {
    showAuth();
    return;
  }
  const user = U.get('user');
  document.getElementById('auth-screen').style.display = 'none';
  if (!user) {
    document.getElementById('onboarding').style.display = 'flex';
  } else {
    document.getElementById('appWrap').style.display = 'flex';
    applyTheme();
    initApp();
  }
})();