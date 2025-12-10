const boardEl = document.getElementById('board');
const cells = Array.from(document.querySelectorAll('.cell'));
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalActions = document.getElementById('modalActions');
const introOverlay = document.getElementById('introOverlay');
const introStart = document.getElementById('introStart');

let board = Array(9).fill('');
let playerTurn = true;
let gameOver = false;
let aiThinking = false;
let losses = 0;
let hintActive = false;
let hintStep = 0;
const hintSequence = [0, 8, 6, 3]; // фиксированная стратегия: верхний левый → нижний правый → нижний левый → левый центр

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const corners = [0, 2, 6, 8];
const edges = [1, 3, 5, 7];

cells.forEach(cell => cell.addEventListener('click', onPlayerMove));
resetBtn.addEventListener('click', resetGame);
introStart.addEventListener('click', closeIntro);

function onPlayerMove(event) {
  if (gameOver || !playerTurn || aiThinking) return;
  const index = Number(event.currentTarget.dataset.index);
  if (board[index]) return;

  placeMark(index, 'X');
  playerTurn = false;
  if (hintActive && hintSequence[hintStep] === index) {
    hintStep += 1;
  }

  const winner = detectWinner('X');
  if (winner) {
    finishGame('player', winner);
    return;
  }

  if (isDraw()) {
    showDraw();
    return;
  }

  clearHint();
  setStatus('Ход компьютера…');
  aiThinking = true;
  setTimeout(() => {
    computerMove();
    aiThinking = false;
  }, 420);
}

function placeMark(index, mark) {
  board[index] = mark;
  const cell = cells[index];
  cell.textContent = mark;
  cell.classList.add('played');
}

function detectWinner(mark) {
  return winningLines.find(line => line.every(idx => board[idx] === mark));
}

function isDraw() {
  return board.every(Boolean);
}

function computerMove() {
  if (gameOver) return;
  const move = chooseAIMove();
  placeMark(move, 'O');

  const winner = detectWinner('O');
  if (winner) {
    finishGame('ai', winner);
    return;
  }

  if (isDraw()) {
    showDraw();
    return;
  }

  playerTurn = true;
  setStatus('Ваш ход: крестики');
  showHintIfNeeded();
}

function chooseAIMove() {
  const winningMove = findCriticalMove('O');
  if (winningMove !== null) return winningMove;

  const blockMove = findCriticalMove('X');
  if (blockMove !== null) return blockMove;

  if (!board[4]) return 4;

  const freeCorner = corners.find(i => !board[i]);
  if (freeCorner !== undefined) return freeCorner;

  const freeEdge = edges.find(i => !board[i]);
  if (freeEdge !== undefined) return freeEdge;

  return board.findIndex(cell => !cell);
}

function findCriticalMove(mark) {
  for (const line of winningLines) {
    const values = line.map(i => board[i]);
    const countMark = values.filter(v => v === mark).length;
    const emptyIndex = line.find(i => !board[i]);
    if (countMark === 2 && emptyIndex !== undefined) {
      return emptyIndex;
    }
  }
  return null;
}

function finishGame(result, line) {
  gameOver = true;
  playerTurn = false;
  highlightWin(line);

  if (result === 'player') {
    const code = generatePromo();
    setStatus('Победа! Промокод внутри.');
    showWin(code);
  } else {
    losses += 1;
    if (losses >= 3) {
      hintActive = true;
    }
    setStatus('Компьютер победил. Попробуем ещё?');
    showLoss();
  }
}

function highlightWin(line) {
  line.forEach(i => cells[i].classList.add('win'));
}

function showWin(code) {
  modalBody.innerHTML = `
    <h2>Браво! Вы победили</h2>
    <p>Ловите промокод. Скопируйте и используйте в течение часа.</p>
    <div class="promo-box">
      <span id="codeValue">${code}</span>
      <button class="ghost" id="copyCodeBtn">Скопировать</button>
    </div>
    <div class="note" id="notifyNote">Отправляем уведомление в Telegram…</div>
  `;

  modalActions.innerHTML = `
    <button class="cta" id="playAgainWin">Сыграть снова</button>
  `;

  openModal();

  document.getElementById('copyCodeBtn').addEventListener('click', () => copyCode(code));
  document.getElementById('playAgainWin').addEventListener('click', () => {
    closeModal();
    resetGame();
  });

  sendWinNotification(code);
}

function showLoss() {
  modalBody.innerHTML = `
    <h2>Компьютер взял партию</h2>
    <p>Быстрый реванш? Попробуйте другую стратегию и заберите промокод.</p>
    ${losses >= 3 ? '<p class="note">Я помогу: на Вашем ходу подсвечу лучший ход.</p>' : ''}
  `;
  modalActions.innerHTML = `
    <button class="cta" id="playAgainLoss">Сыграть ещё</button>
  `;
  openModal();
  document.getElementById('playAgainLoss').addEventListener('click', () => {
    closeModal();
    resetGame();
  });
}

function showDraw() {
  gameOver = true;
  playerTurn = false;
  setStatus('Ничья. Это шанс начать заново.');

  modalBody.innerHTML = `
    <h2>Ничья</h2>
    <p>Ходы закончились. Давайте ещё одну партию?</p>
  `;
  modalActions.innerHTML = `
    <button class="cta" id="playAgainDraw">Сыграть ещё</button>
  `;
  openModal();
  document.getElementById('playAgainDraw').addEventListener('click', () => {
    closeModal();
    resetGame();
  });
}

function openModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

function closeIntro() {
  introOverlay.classList.add('hidden');
}

function resetGame() {
  board = Array(9).fill('');
  gameOver = false;
  playerTurn = true;
  aiThinking = false;
  hintStep = 0;
  cells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('played', 'win');
  });
  setStatus('Ваш ход: крестики');
  clearHint();
  if (hintActive) {
    showHintIfNeeded();
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function generatePromo() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    const note = document.getElementById('notifyNote');
    if (note) note.textContent = 'Промокод скопирован. Приятных покупок!';
  } catch {
    alert('Не удалось скопировать. Скопируйте вручную: ' + code);
  }
}

async function sendWinNotification(code) {
  const note = document.getElementById('notifyNote');
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: 'win', code })
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    if (note) note.textContent = 'Уведомление отправлено в Telegram.';
  } catch (error) {
    console.error('Notify error', error);
    if (note) note.textContent = 'Не удалось отправить в Telegram. Проверь .env';
  }
}

function showHintIfNeeded() {
  if (!hintActive || gameOver || !playerTurn) return;
  const move = getHintMove();
  if (move === null || move === undefined) return;
  clearHint();
  cells[move].classList.add('hint');
  setStatus('Подсказка: нажмите на подсвеченную клетку.');
}

function clearHint() {
  cells.forEach(cell => cell.classList.remove('hint'));
}

function getHintMove() {
  // Фиксированная стратегия: верхний левый → нижний правый → нижний левый → левый центр.
  for (let i = hintStep; i < hintSequence.length; i++) {
    const target = hintSequence[i];
    if (!board[target]) {
      return target;
    }
  }
  // Если всё занято, fallback: выигрыш, блок, центр, угол, ребро.
  const winning = findCriticalMove('X');
  if (winning !== null) return winning;
  const block = findCriticalMove('O');
  if (block !== null) return block;
  if (!board[4]) return 4;
  const corner = corners.find(i => !board[i]);
  if (corner !== undefined) return corner;
  const edge = edges.find(i => !board[i]);
  if (edge !== undefined) return edge;
  return null;
}

resetGame();
