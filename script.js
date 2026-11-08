const goalInput = document.getElementById("goal");
const tree = document.getElementById("tree");
const message = document.getElementById("message");
const history = document.getElementById("history");
const saveStatus = document.getElementById("saveStatus");
const buttons = document.querySelectorAll("[data-rating]");

let selectedRating = null;

// 以前の◎○△データも読めるようにする
function normalizeRating(rating) {
  return { "◎": "Excellent", "○": "Great", "△": "Good" }[rating] || rating;
}
function isStudyRating(rating) {
  return ["Good", "Great", "Excellent"].includes(normalizeRating(rating));
}

// 日付を「YYYY-MM-DD」の形で取得
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 達成度によって桜の表示を変更
function updateTree(rating) {
  const flowers = document.getElementById("flowers");
  flowers.innerHTML = "";

  let flowerCount = 0;

  if (normalizeRating(rating) === "Excellent") {
    flowerCount = 165;
    message.textContent = "満開！目標達成おめでとう！";
  } else if (normalizeRating(rating) === "Great") {
    flowerCount = 85;
    message.textContent = "八分咲き！よく頑張ったね！";
  } else if (normalizeRating(rating) === "Good") {
    flowerCount = 9;
    message.textContent = "少しずつ開花中！今日も一歩前進！";
  } else {
    message.textContent = "今日の学習を記録しよう！";
  }

  // 規則的な渦巻きを避けるため、固定シードの疑似乱数で自然に配置する。
  // 同じ評価なら再描画しても花の位置が変わらない。
  const normalized = normalizeRating(rating);
  let seed = 20261108;
  function random() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const colors = ["#ffd7e6", "#f28db6"];
  const goodPositions = [
    [85, 102],
    [105, 85],
    [128, 72],
    [148, 102],
    [170, 70],
    [197, 84],
    [218, 105],
    [135, 120],
    [190, 116],
  ];

  // 花冠の外形を少し凸凹させることで、自然な桜の木らしく見せる。

  const clusters = [
    { x: 95, y: 102, rx: 42, ry: 50 },
    { x: 122, y: 76, rx: 44, ry: 30 },
    { x: 166, y: 69, rx: 46, ry: 28 },
    { x: 207, y: 93, rx: 40, ry: 50 },
    { x: 153, y: 110, rx: 50, ry: 27 },
  ];

  for (let i = 0; i < flowerCount; i++) {
    const flower = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    let x, y;
    if (normalized === "Good") {
      [x, y] = goodPositions[i];
      y -= 30;
    } else {
      const cluster = clusters[Math.floor(random() * clusters.length)];
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random());
      x = cluster.x + Math.cos(angle) * cluster.rx * radius;
      y = cluster.y + Math.sin(angle) * cluster.ry * radius - 30;
    }
    flower.setAttribute("cx", x.toFixed(2));
    flower.setAttribute("cy", y.toFixed(2));
    flower.setAttribute("r", normalized === "Excellent" ? "8" : "7.5");
    flower.setAttribute("fill", colors[random() < 0.55 ? 0 : 1]);
    flowers.appendChild(flower);
  }
}

// 評価はユーザー自身が選ぶ。タスクのチェックによる自動判定はしない。
function selectRating(rating) {
  selectedRating = rating;
  buttons.forEach((button) => {
    button.disabled = false;
    button.title = "";
    button.classList.toggle(
      "selected",
      button.dataset.rating === selectedRating,
    );
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.rating === selectedRating),
    );
  });
  updateTree(selectedRating);
  saveStatus.textContent = "";
}

buttons.forEach((button) => {
  button.addEventListener("click", () => selectRating(button.dataset.rating));
});

// 記録を画面に表示
function showRecord() {
  const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");
  const todayRecord = records[getToday()];

  if (todayRecord) {
    goalInput.value = todayRecord.goal || "";
    selectRating(normalizeRating(todayRecord.rating));
    history.textContent = `${getToday()}：${normalizeRating(todayRecord.rating)} / ${todayRecord.goal || ""}`;
  } else {
    selectRating(null);
    history.textContent = "今日はまだ記録がありません。";
  }
}

// 保存ボタンをクリックしたとき
document.getElementById("save").addEventListener("click", () => {
  const goal = getTodayTaskSummary();

  if (!goal) {
    alert("目標設定タブで最低タスクを設定してください。");
    return;
  }

  // 評価は自動判定せず、選択した値を保存する。
  if (!selectedRating) {
    alert("Good・Great・Excellentのいずれかを選んでください。");
    return;
  }
  const minimum = getTodayTasks().find((task) => task.minimum);
  if (!minimum || !minimum.done) {
    alert("まず最低タスクにチェックを付けてください。");
    return;
  }

  const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");

  const todayTasks = getTodayTasks();
  const completedCount = todayTasks.filter((t) => t.done).length;
  const totalCount = todayTasks.length;
  // 再保存時は既に回答した意欲を消さない。
  const previousRecord = records[getToday()] || {};

  records[getToday()] = {
    ...previousRecord,
    goal: goal,
    taskCompleted: completedCount,
    taskTotal: totalCount,
    taskCompletionRate: totalCount ? Math.round(completedCount / totalCount * 1000) / 10 : null,
    rating: selectedRating,
    savedAt: new Date().toISOString(),
    tasks: getTodayTasks().map((t) => ({
      text: t.text,
      done: t.done,
      minimum: t.minimum,
    })),
  };

  localStorage.setItem("sakuraRecords", JSON.stringify(records));

  saveStatus.textContent = "🌸 今日の記録を保存しました！";
  showRecord();
  updateStreak();
  renderTodayTasks();
  // 記録の保存後に、任意の翌日学習意欲アンケートを表示する。
  document.getElementById("motivationDialog").showModal();
});

// 翌日の学習意欲（任意回答）を今日の記録に追加する。
const motivationDialog = document.getElementById("motivationDialog");
document.querySelectorAll("[data-motivation]").forEach((button) => {
  button.addEventListener("click", () => {
    const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");
    const today = getToday();
    if (records[today]) {
      records[today].nextDayMotivation = Number(button.dataset.motivation);
      records[today].motivationAnsweredAt = new Date().toISOString();
      localStorage.setItem("sakuraRecords", JSON.stringify(records));
      saveStatus.textContent = "🌸 学習記録とアンケートを保存しました！";
    }
    motivationDialog.close();
  });
});
document.getElementById("skipMotivation").addEventListener("click", () => {
  motivationDialog.close();
});

// ページを開いたときに保存済みの記録を表示
showRecord();

// ===== タブ切り替え =====

const homeTab = document.getElementById("homeTab");
const recordTab = document.getElementById("recordTab");
const homePage = document.getElementById("homePage");
const recordPage = document.getElementById("recordPage");

homeTab.addEventListener("click", () => {
  homePage.style.display = "block";
  recordPage.style.display = "none";
  goalPage.style.display = "none";

  homeTab.classList.add("active");
  recordTab.classList.remove("active");
  goalTab.classList.remove("active");
});

recordTab.addEventListener("click", () => {
  homePage.style.display = "none";
  recordPage.style.display = "block";
  goalPage.style.display = "none";

  recordTab.classList.add("active");
  homeTab.classList.remove("active");
  goalTab.classList.remove("active");

  showSakuraRoad();
});

// ===== 桜並木の表示 =====

function showSakuraRoad() {
  const road = document.getElementById("sakuraRoad");
  const monthTitle = document.getElementById("monthTitle");
  const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  monthTitle.textContent = `${year}年${month}月`;
  road.replaceChildren();
  road.classList.add("learning-calendar");

  // 曜日を日曜日から土曜日まで横並びに表示
  for (const weekday of ["日", "月", "火", "水", "木", "金", "土"]) {
    const label = document.createElement("div");
    label.className = "calendar-weekday";
    label.textContent = weekday;
    road.appendChild(label);
  }

  // 月初の曜日に合わせて空白マスを挿入
  for (let i = 0; i < firstWeekday; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-blank";
    blank.setAttribute("aria-hidden", "true");
    road.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = records[date];
    const rating = record ? normalizeRating(record.rating) : null;
    const flowerText =
      rating === "Excellent"
        ? "🌸🌸🌸"
        : rating === "Great"
          ? "🌸🌸"
          : rating === "Good"
            ? "🌸"
            : "";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    if (date === getToday()) button.classList.add("calendar-today");
    if (date > getToday()) button.classList.add("calendar-future");
    button.setAttribute(
      "aria-label",
      `${month}月${day}日 ${rating || "未記録"}`,
    );

    const number = document.createElement("span");
    number.className = "calendar-day-number";
    number.textContent = day;
    const flowers = document.createElement("span");
    flowers.className = "calendar-flowers";
    flowers.textContent = flowerText || "·";
    if (!flowerText) flowers.classList.add("calendar-empty");
    button.append(number, flowers);

    button.addEventListener("click", () => {
      const detail = document.getElementById("dayDetail");
      detail.textContent = record
        ? `${date}｜達成度：${rating}｜目標：${record.goal}`
        : `${date}｜記録なし`;
      openEditForm(date);
    });
    road.appendChild(button);
  }
}

// ===== 過去の記録の追加・修正 =====

let editingDate = null;
let editingRating = null;

const editForm = document.getElementById("editForm");
const editGoal = document.getElementById("editGoal");
const editDateTitle = document.getElementById("editDateTitle");
const editStatus = document.getElementById("editStatus");
const editButtons = document.querySelectorAll("[data-edit-rating]");

// 達成度ボタンの選択表示
function selectEditRating(rating) {
  editingRating = rating;

  editButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.editRating === rating);
  });
}

// 編集フォームを開く
function openEditForm(date) {
  // 未来の日付には記録できないようにする
  if (date > getToday()) {
    alert("未来の日付には記録できません。");
    return;
  }

  const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");

  const record = records[date];

  editingDate = date;
  editGoal.value = record ? record.goal : "";
  selectEditRating(record ? normalizeRating(record.rating) : null);

  editDateTitle.textContent = `${date} の学習記録`;
  editStatus.textContent = "";
  editForm.style.display = "block";
}

// 達成度を選択
editButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectEditRating(button.dataset.editRating);
  });
});

// 保存
document.getElementById("saveEdit").addEventListener("click", () => {
  if (!editingDate) return;

  const goal = editGoal.value.trim();

  if (!goal || !editingRating) {
    editStatus.textContent = "目標と達成度を入力してください。";
    return;
  }

  const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");

  records[editingDate] = {
    ...(records[editingDate] || {}),
    goal: goal,
    rating: editingRating,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem("sakuraRecords", JSON.stringify(records));

  editStatus.textContent = "🌸 記録を保存しました！";
  showSakuraRoad();
  updateStreak();

  // 今日の記録を編集した場合はホーム画面も更新
  if (editingDate === getToday()) {
    showRecord();
  }
});

// キャンセル
document.getElementById("cancelEdit").addEventListener("click", () => {
  editForm.style.display = "none";
  editingDate = null;
});

// ===== 連続学習日数 =====

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function updateStreak() {
  const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");

  const date = new Date();
  const today = formatDate(date);

  // 今日が未記録なら、昨日から数える
  if (!records[today]) {
    date.setDate(date.getDate() - 1);
  }

  let streak = 0;

  while (true) {
    const key = formatDate(date);
    const record = records[key];

    if (!record || !isStudyRating(record.rating)) {
      break;
    }

    streak++;
    date.setDate(date.getDate() - 1);
  }

  document.getElementById("streakCount").textContent = streak;

  document.getElementById("streakMessage").textContent =
    streak > 0
      ? `${streak}日分の努力が積み重なっているよ！`
      : "今日から新しい桜を咲かせよう！";
}

// ページを開いたとき
updateStreak();

// ===== 学習記録の削除 =====

const deleteEditButton = document.getElementById("deleteEdit");

deleteEditButton.addEventListener("click", () => {
  if (!editingDate) return;

  const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");

  // 記録がない日は削除しない
  if (!records[editingDate]) {
    editStatus.textContent = "この日はまだ記録がありません。";
    return;
  }

  // 誤操作防止の確認
  const confirmed = confirm(`${editingDate} の学習記録を削除しますか？`);

  if (!confirmed) return;

  // 選択した日の記録を削除
  delete records[editingDate];

  // 保存データを更新
  localStorage.setItem("sakuraRecords", JSON.stringify(records));

  // 編集画面を閉じる
  editForm.style.display = "none";
  editingDate = null;
  editingRating = null;

  // 桜並木と連続記録を更新
  showSakuraRoad();
  showRecord();
  updateStreak();

  document.getElementById("dayDetail").textContent = "記録を削除しました。";
});

// ===== 学習記録のCSV出力 =====

document.getElementById("exportCSV").addEventListener("click", () => {
  const records = JSON.parse(localStorage.getItem("sakuraRecords") || "{}");

  const dates = Object.keys(records).sort();

  if (dates.length === 0) {
    alert("出力できる学習記録がありません。");
    return;
  }

  // CSV内の文字を安全に扱う
  function csvCell(value) {
    let text = String(value ?? "");

    // Excelで数式として実行されないようにする
    if (/^[\s]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  }

  // CSVの見出し
  const rows = [["日付", "学習目標", "達成度", "学習実施", "保存日時", "完了タスク数", "総タスク数", "タスク達成率(%)", "翌日の学習意欲(1-5)", "意欲回答日時"]];

  // 記録を1日ずつ追加
  dates.forEach((date) => {
    const record = records[date];

    const studied = isStudyRating(record.rating) ? 1 : 0;

    rows.push([
      date,
      record.goal,
      normalizeRating(record.rating),
      studied,
      record.savedAt
        ? new Date(record.savedAt).toLocaleString("ja-JP")
        : "記録なし",
      record.taskCompleted ?? (Array.isArray(record.tasks) ? record.tasks.filter(t => t.done).length : ""),
      record.taskTotal ?? (Array.isArray(record.tasks) ? record.tasks.length : ""),
      record.taskCompletionRate ?? (Array.isArray(record.tasks) && record.tasks.length ? Math.round(record.tasks.filter(t => t.done).length / record.tasks.length * 1000) / 10 : ""),
      record.nextDayMotivation ?? "",
      record.motivationAnsweredAt ? new Date(record.motivationAnsweredAt).toLocaleString("ja-JP") : "",
    ]);
  });

  // CSV形式に変換
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  // Excelで日本語が文字化けしにくいUTF-8 BOM付き
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `SakuraRoad_${getToday()}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

// ===== 目標設定機能 =====

const goalTab = document.getElementById("goalTab");
const goalPage = document.getElementById("goalPage");

const monthlyGoalInput = document.getElementById("monthlyGoal");
const minimumTaskInput = document.getElementById("minimumTask");
const goalSaveStatus = document.getElementById("goalSaveStatus");

// 保存済みの目標を読み込む
function loadGoals() {
  const goals = JSON.parse(localStorage.getItem("sakuraGoals") || "{}");

  monthlyGoalInput.value = goals.monthlyGoal || "";
  minimumTaskInput.value = goals.minimumTask || "";
}

// 目標設定画面を表示する
goalTab.addEventListener("click", () => {
  homePage.style.display = "none";
  recordPage.style.display = "none";
  goalPage.style.display = "block";

  homeTab.classList.remove("active");
  recordTab.classList.remove("active");
  goalTab.classList.add("active");

  loadGoals();
});

// 目標を保存する
document.getElementById("saveGoals").addEventListener("click", () => {
  const monthlyGoal = monthlyGoalInput.value.trim();
  const minimumTask = minimumTaskInput.value.trim();

  if (!monthlyGoal || !minimumTask) {
    goalSaveStatus.textContent =
      "1か月後の目標と最低タスクを入力してください。";
    return;
  }

  const goals = {
    monthlyGoal: monthlyGoal,
    minimumTask: minimumTask,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem("sakuraGoals", JSON.stringify(goals));

  goalSaveStatus.textContent =
    "🌸 目標を保存しました！明日以降の最低タスクに反映されます。";
  renderTodayTasks();
});

// 初回読み込み
loadGoals();

// ===== 今日のタスク（最低タスク＋自由な追加タスク） =====
// sakuraTasks は日付別。sakuraRecords はこれまでどおり保存する。
const todayTaskList = document.getElementById("todayTaskList");
const newTaskInput = document.getElementById("newTask");
const taskStatus = document.getElementById("taskStatus");

function getTaskStore() {
  return JSON.parse(localStorage.getItem("sakuraTasks") || "{}");
}

function getTodayTasks() {
  const store = getTaskStore();
  const today = getToday();
  if (!store[today]) {
    const settings = JSON.parse(localStorage.getItem("sakuraGoals") || "{}");
    if (!settings.minimumTask) return [];
    store[today] = [
      {
        id: "minimum",
        text: settings.minimumTask,
        done: false,
        minimum: true,
        addedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("sakuraTasks", JSON.stringify(store));
  }
  return store[today];
}

function saveTodayTasks(tasks) {
  const store = getTaskStore();
  store[getToday()] = tasks;
  localStorage.setItem("sakuraTasks", JSON.stringify(store));
}

function getTodayTaskSummary() {
  return getTodayTasks()
    .map((t) => t.text)
    .join(" / ");
}

function renderTodayTasks() {
  const tasks = getTodayTasks();
  todayTaskList.replaceChildren();
  const hasSettings = tasks.length > 0;
  document.getElementById("taskHint").textContent = hasSettings
    ? "最低タスクを少しでも進めたら、今日の努力を記録しよう。"
    : "先に「目標設定」で毎日の最低タスクを登録してね。";
  document.querySelector(".add-task-row").style.display = hasSettings
    ? "flex"
    : "none";
  goalInput.value = getTodayTaskSummary();

  tasks.forEach((task) => {
    const row = document.createElement("div");
    row.className = "task-item";
    const label = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = Boolean(task.done);
    check.addEventListener("change", () => {
      const current = getTodayTasks();
      const target = current.find((t) => t.id === task.id);
      if (target) target.done = check.checked;
      saveTodayTasks(current);
      renderTodayTasks();
    });
    const name = document.createElement("span");
    name.textContent = task.text;
    if (task.done) name.className = "task-done";
    label.append(check, name);
    row.append(label);
    if (task.minimum) {
      const tag = document.createElement("small");
      tag.textContent = "最低";
      tag.className = "minimum-tag";
      row.append(tag);
    } else {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-task";
      remove.textContent = "削除";
      remove.setAttribute("aria-label", `${task.text} を削除`);
      remove.addEventListener("click", () => {
        saveTodayTasks(getTodayTasks().filter((t) => t.id !== task.id));
        renderTodayTasks();
      });
      row.append(remove);
    }
    todayTaskList.append(row);
  });
  const completed = tasks.filter((t) => t.done).length;
  taskStatus.textContent = hasSettings
    ? `完了 ${completed} / ${tasks.length} 件`
    : "";
  // タスクを変更しても、手動で選んだ評価は変えない。
}

document.getElementById("addTask").addEventListener("click", () => {
  const text = newTaskInput.value.trim();
  if (!text) {
    taskStatus.textContent = "追加するタスクを入力してね。";
    return;
  }
  const tasks = getTodayTasks();
  if (!tasks.length) return;
  if (tasks.length >= 20) {
    taskStatus.textContent = "タスクは1日20件までです。";
    return;
  }
  tasks.push({
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
    minimum: false,
    addedAt: new Date().toISOString(),
  });
  saveTodayTasks(tasks);
  newTaskInput.value = "";
  renderTodayTasks();
});
newTaskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.getElementById("addTask").click();
});

// 既存データの読み込み後に初期表示
renderTodayTasks();
