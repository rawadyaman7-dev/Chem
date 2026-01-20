// Molecule Formula Quiz (Multiple Choice)
// - Shows molecule name
// - Student chooses correct formula among 3 choices
// - Score + streak + optional timed mode
// - Editable question bank stored in localStorage

const DEFAULT_BANK = [
  { name: "Water", formula: "H2O" },
  { name: "Carbon dioxide", formula: "CO2" },
  { name: "Ammonia", formula: "NH3" },
  { name: "Methane", formula: "CH4" },
  { name: "Ethanol", formula: "C2H6O" },
  { name: "Glucose", formula: "C6H12O6" },
  { name: "Sodium chloride", formula: "NaCl" },
  { name: "Sulfuric acid", formula: "H2SO4" },
  { name: "Nitric acid", formula: "HNO3" },
  { name: "Calcium carbonate", formula: "CaCO3" },
  { name: "Sodium bicarbonate", formula: "NaHCO3" },
  { name: "Acetic acid", formula: "C2H4O2" },
];

const $ = (id) => document.getElementById(id);

const els = {
  qNum: $("qNum"),
  qTotal: $("qTotal"),
  score: $("score"),
  streak: $("streak"),
  timerPill: $("timerPill"),
  timeLeft: $("timeLeft"),
  moleculeName: $("moleculeName"),
  choices: $("choices"),
  feedback: $("feedback"),
  nextBtn: $("nextBtn"),
  skipBtn: $("skipBtn"),
  restartBtn: $("restartBtn"),
  shuffleBtn: $("shuffleBtn"),
  timedMode: $("timedMode"),
  editBtn: $("editBtn"),
  editor: $("editor"),
  bankText: $("bankText"),
  saveBankBtn: $("saveBankBtn"),
};

let bank = loadBank();
let order = [...bank.keys()];
let idx = 0;

let score = 0;
let streak = 0;

let locked = false;

let timer = null;
let timeRemaining = 0;
const TIME_PER_Q = 15;

function loadBank() {
  try {
    const raw = localStorage.getItem("molecule_bank_jsonl");
    if (!raw) return DEFAULT_BANK.slice();
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = [];
    for (const line of lines) parsed.push(JSON.parse(line));
    // basic validation
    return parsed.filter(q => q && typeof q.name === "string" && typeof q.formula === "string");
  } catch {
    return DEFAULT_BANK.slice();
  }
}

function saveBankToStorage(newBank) {
  const jsonl = newBank.map(q => JSON.stringify({ name: q.name, formula: q.formula })).join("\n");
  localStorage.setItem("molecule_bank_jsonl", jsonl);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function formatFormula(s) {
  // simple subscripts for digits (visual only)
  return s.replace(/(\d+)/g, "<sub>$1</sub>");
}

function setFeedback(text, type = "") {
  els.feedback.textContent = text;
  els.feedback.className = "feedback " + type;
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
  els.timeLeft.textContent = "—";
}

function startTimer() {
  stopTimer();
  if (!els.timedMode.checked) {
    els.timerPill.style.opacity = 0.65;
    els.timeLeft.textContent = "—";
    return;
  }
  els.timerPill.style.opacity = 1;
  timeRemaining = TIME_PER_Q;
  els.timeLeft.textContent = `${timeRemaining}s`;
  timer = setInterval(() => {
    timeRemaining -= 1;
    els.timeLeft.textContent = `${timeRemaining}s`;
    if (timeRemaining <= 0) {
      clearInterval(timer);
      timer = null;
      // time out: reveal answer
      if (!locked) {
        locked = true;
        streak = 0;
        els.streak.textContent = streak;
        revealCorrect(null, true);
        els.nextBtn.disabled = false;
        setFeedback("⏰ Time’s up! The correct answer is highlighted.", "bad");
      }
    }
  }, 1000);
}

function pickQuestion() {
  if (bank.length < 3) {
    els.moleculeName.textContent = "Need at least 3 questions in the bank.";
    els.choices.innerHTML = "";
    els.nextBtn.disabled = true;
    stopTimer();
    return;
  }

  const qIndex = order[idx];
  const q = bank[qIndex];

  els.qNum.textContent = String(idx + 1);
  els.qTotal.textContent = String(order.length);
  els.moleculeName.textContent = q.name;

  // Build 3 choices: 1 correct + 2 random incorrect formulas
  const correct = q.formula;
  const wrongFormulas = bank
    .map(x => x.formula)
    .filter(f => f !== correct);

  shuffle(wrongFormulas);
  const options = shuffle([correct, wrongFormulas[0], wrongFormulas[1]]);

  els.choices.innerHTML = "";
  options.forEach((formula) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.innerHTML = formatFormula(formula);
    btn.dataset.formula = formula;
    btn.addEventListener("click", () => handleChoice(btn, correct));
    els.choices.appendChild(btn);
  });

  locked = false;
  els.nextBtn.disabled = true;
  setFeedback("Pick the correct formula.", "");
  startTimer();
}

function revealCorrect(chosenBtn, timedOut = false) {
  const correct = bank[order[idx]].formula;
  const buttons = [...els.choices.querySelectorAll(".choice")];
  for (const b of buttons) {
    b.disabled = true;
    if (b.dataset.formula === correct) b.classList.add("correct");
  }
  if (chosenBtn && chosenBtn.dataset.formula !== correct) chosenBtn.classList.add("wrong");
  if (timedOut) {
    // nothing else
  }
  stopTimer();
}

function handleChoice(btn, correctFormula) {
  if (locked) return;
  locked = true;

  const chosen = btn.dataset.formula;
  const isCorrect = chosen === correctFormula;

  if (isCorrect) {
    score += 1;
    streak += 1;
    setFeedback("✅ Correct! Nice.", "good");
  } else {
    streak = 0;
    setFeedback(`❌ Not quite.`, "bad");
  }

  els.score.textContent = String(score);
  els.streak.textContent = String(streak);

  revealCorrect(btn);
  els.nextBtn.disabled = false;
}

function nextQuestion() {
  idx += 1;
  if (idx >= order.length) {
    // end screen
    stopTimer();
    els.moleculeName.textContent = "🎉 Finished!";
    els.choices.innerHTML = "";
    els.nextBtn.disabled = true;
    setFeedback(`Final score: ${score}/${order.length}. Hit Restart to play again.`, "good");
    return;
  }
  pickQuestion();
}

function restart() {
  stopTimer();
  idx = 0;
  score = 0;
  streak = 0;
  els.score.textContent = "0";
  els.streak.textContent = "0";
  order = [...bank.keys()];
  pickQuestion();
}

function skip() {
  if (locked) {
    nextQuestion();
    return;
  }
  // skipping without answering: no score change, reset streak
  streak = 0;
  els.streak.textContent = String(streak);
  setFeedback("Skipped.", "");
  locked = true;
  revealCorrect(null);
  els.nextBtn.disabled = false;
}

function shuffleQuestions() {
  order = shuffle([...bank.keys()]);
  idx = 0;
  score = 0;
  streak = 0;
  els.score.textContent = "0";
  els.streak.textContent = "0";
  pickQuestion();
}

function openEditor() {
  // show current bank as JSONL
  const jsonl = bank.map(q => JSON.stringify({ name: q.name, formula: q.formula })).join("\n");
  els.bankText.value = jsonl;
  els.editor.showModal();
}

function saveEditor() {
  try {
    const lines = els.bankText.value.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(line => JSON.parse(line));
    const cleaned = parsed.filter(q => q && typeof q.name === "string" && typeof q.formula === "string");
    if (cleaned.length < 3) {
      alert("Please include at least 3 valid questions.");
      return;
    }
    bank = cleaned;
    saveBankToStorage(bank);
    restart();
    els.editor.close();
  } catch (e) {
    alert("Could not parse. Make sure each line is valid JSON.");
  }
}

// events
els.nextBtn.addEventListener("click", nextQuestion);
els.skipBtn.addEventListener("click", skip);
els.restartBtn.addEventListener("click", restart);
els.shuffleBtn.addEventListener("click", shuffleQuestions);
els.timedMode.addEventListener("change", () => {
  // restart timer for current question (if not locked)
  if (!locked) startTimer();
});
els.editBtn.addEventListener("click", openEditor);
els.saveBankBtn.addEventListener("click", (e) => {
  e.preventDefault();
  saveEditor();
});

// init
els.qTotal.textContent = String(bank.length);
restart();
