/* Browser UI for Gomoku. Rules and AI live in gomoku-ai.js (a port of the Python project). */
(function () {
  'use strict';
  const { BLACK, WHITE, SIZE, Game, GomokuAI } = window.Gomoku;
  const COLORS = { wood: '#ddc294', grid: '#9c8057', black: '#1e2828', blackShine: '#394441', white: '#f7f6e6', whiteShine: '#ffffff', whiteEdge: '#d5d2be', shadow: 'rgba(120,90,50,.35)', last: '#d27e41', win: '#25644f', cursor: '#25644f' };
  const STAR_POINTS = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];

  const canvas = document.getElementById('gomoku-board');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('gomoku-status');
  const announceEl = document.getElementById('gomoku-announce');
  const reasonEl = document.getElementById('gomoku-reason');
  const statsEl = document.getElementById('gomoku-stats');
  const lastEl = document.getElementById('gomoku-last');
  const undoBtn = document.getElementById('gomoku-undo');
  const newBtn = document.getElementById('gomoku-new');
  const difficultyInputs = document.querySelectorAll('input[name="gomoku-difficulty"]');
  const colorInputs = document.querySelectorAll('input[name="gomoku-color"]');

  let game, difficulty = 'Medium', human = BLACK, revision = 0, thinking = false, analysis = null;
  let hover = null, cursor = [7, 7], showCursor = false, worker = null;

  const label = (row, col) => String.fromCharCode(65 + col) + (row + 1);

  // The AI runs in a Web Worker so the page never freezes. If workers are unavailable
  // (for example when opened straight from disk), it runs on the page after a short pause.
  function makeWorker() {
    try {
      const w = new Worker('gomoku-ai.js');
      w.onmessage = event => finishAI(event.data);
      w.onerror = () => {
        w.terminate();
        if (worker === w) worker = null;
        if (thinking) requestAI(); // retry the pending move on the page instead
      };
      return w;
    } catch { return null; }
  }
  function cancelAI() {
    revision++;
    thinking = false;
    if (worker) { worker.terminate(); worker = makeWorker(); }
  }
  function requestAI() {
    thinking = true;
    const job = { history: game.board.history.slice(), player: game.ai, difficulty, revision: ++revision };
    render();
    if (worker) { worker.postMessage(job); return; }
    setTimeout(() => {
      if (job.revision !== revision) return;
      const result = new GomokuAI().choose(game.board, job.player, job.difficulty);
      finishAI({ revision: job.revision, analysis: result });
    }, 30);
  }
  function finishAI(data) {
    if (data.revision !== revision) return; // a stale answer from a cancelled search
    thinking = false;
    if (data.error || !data.analysis.move) {
      statusEl.textContent = 'The AI hit a problem. Press New game to try again.';
      render();
      return;
    }
    analysis = data.analysis;
    const [row, col] = analysis.move;
    game.play(row, col);
    announce(`AI played ${label(row, col)}. ${outcomeText() || 'Your move.'}`);
    render();
  }

  function startGame() {
    cancelAI();
    game = new Game(human);
    analysis = null;
    announce(human === BLACK ? 'New game. You are black and move first.' : 'New game. You are white; the AI moves first.');
    render();
    if (game.turn === game.ai) requestAI();
  }
  function playHuman(row, col) {
    if (thinking || game.finished || game.turn !== game.human) return;
    if (!game.play(row, col)) return;
    announce(`You played ${label(row, col)}. ${outcomeText()}`);
    if (!game.finished) requestAI();
    render();
  }
  function undo() {
    cancelAI();
    if (game.undoTurn()) { analysis = null; announce('Undid your last turn. Your move.'); }
    render();
  }
  function outcomeText() {
    if (!game.finished) return '';
    if (game.draw) return 'Board complete. It’s a draw.';
    return game.winner === game.human ? 'Beautifully played. You win!' : 'A lesson in foresight. The AI wins.';
  }
  function announce(text) { announceEl.textContent = text; }

  // ---- drawing ----
  let px = 0, step = 0, origin = 0;
  function resize() {
    const cssSize = canvas.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    px = cssSize;
    step = px / (SIZE + 1);
    origin = step;
    render();
  }
  const point = (row, col) => [origin + col * step, origin + row * step];
  function stone(row, col, player, alpha = 1) {
    const [x, y] = point(row, col), r = step * 0.44;
    ctx.globalAlpha = alpha;
    if (alpha === 1) {
      ctx.fillStyle = COLORS.shadow;
      ctx.beginPath(); ctx.arc(x + r * 0.1, y + r * 0.16, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = player === BLACK ? COLORS.black : COLORS.white;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = player === BLACK ? COLORS.blackShine : COLORS.whiteShine;
    ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.28, r * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = player === BLACK ? '#18221f' : COLORS.whiteEdge;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function render() {
    if (!game || !px) return;
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(0, 0, px, px);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < SIZE; i++) {
      const a = Math.round(origin + i * step) + 0.5;
      ctx.moveTo(origin, a); ctx.lineTo(origin + step * (SIZE - 1), a);
      ctx.moveTo(a, origin); ctx.lineTo(a, origin + step * (SIZE - 1));
    }
    ctx.stroke();
    ctx.fillStyle = COLORS.grid;
    for (const [r, c] of STAR_POINTS) { const [x, y] = point(r, c); ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, step * 0.09), 0, Math.PI * 2); ctx.fill(); }

    for (const m of game.board.history) stone(m.row, m.col, m.player);

    const canPlay = !thinking && !game.finished && game.turn === game.human;
    const ghost = showCursor ? cursor : hover;
    if (canPlay && ghost && game.board.legal(ghost[0], ghost[1])) stone(ghost[0], ghost[1], game.human, 0.4);
    if (showCursor) {
      const [x, y] = point(cursor[0], cursor[1]);
      ctx.strokeStyle = COLORS.cursor; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, step * 0.5, 0, Math.PI * 2); ctx.stroke();
    }

    const last = game.board.history[game.board.history.length - 1];
    if (last) {
      const [x, y] = point(last.row, last.col);
      ctx.strokeStyle = COLORS.last; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, step * 0.14, 0, Math.PI * 2); ctx.stroke();
    }
    if (game.winLine.length) {
      const [x1, y1] = point(...game.winLine[0]);
      const [x2, y2] = point(...game.winLine[game.winLine.length - 1]);
      ctx.strokeStyle = COLORS.win; ctx.lineWidth = Math.max(4, step * 0.14); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    updatePanel();
  }
  function updatePanel() {
    statusEl.textContent = game.finished ? outcomeText() : thinking ? 'AI is thinking…' : game.turn === game.human ? 'Your move' : 'AI to move';
    statusEl.dataset.state = game.finished ? (game.draw ? 'draw' : game.winner === game.human ? 'win' : 'loss') : thinking ? 'thinking' : 'play';
    const last = game.board.history[game.board.history.length - 1];
    lastEl.textContent = last ? `Last move: ${label(last.row, last.col)} (${last.player === BLACK ? 'black' : 'white'})` : 'No moves yet';
    if (analysis) {
      reasonEl.textContent = analysis.reason;
      statsEl.textContent = `Depth ${analysis.depth} · ${analysis.nodes.toLocaleString()} positions · ${analysis.cutoffs.toLocaleString()} cutoffs · ${analysis.seconds.toFixed(2)} s`;
    } else {
      reasonEl.textContent = 'The AI checks for wins and blocks, recognizes threats, then searches ahead.';
      statsEl.textContent = 'Its last decision will appear here.';
    }
    undoBtn.disabled = !game.board.history.some(m => m.player === game.human);
    canvas.setAttribute('aria-label', `Gomoku board, 15 by 15. ${statusEl.textContent}. Use arrow keys to choose an intersection and Enter to place a stone.`);
  }

  // ---- input ----
  function cellFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (px / rect.width), y = (event.clientY - rect.top) * (px / rect.height);
    const col = Math.round((x - origin) / step), row = Math.round((y - origin) / step);
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
    const [cx, cy] = point(row, col);
    return Math.hypot(x - cx, y - cy) <= step * 0.48 ? [row, col] : null;
  }
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; hover = cellFromEvent(e); showCursor = false; render(); });
  canvas.addEventListener('pointerleave', () => { hover = null; render(); });
  canvas.addEventListener('click', e => { const cell = cellFromEvent(e); if (cell) { cursor = cell; playHuman(cell[0], cell[1]); } });
  canvas.addEventListener('focus', () => { if (canvas.matches(':focus-visible')) { showCursor = true; render(); } });
  canvas.addEventListener('blur', () => { showCursor = false; render(); });
  canvas.addEventListener('keydown', e => {
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      showCursor = true;
      cursor = [Math.min(SIZE - 1, Math.max(0, cursor[0] + moves[e.key][0])), Math.min(SIZE - 1, Math.max(0, cursor[1] + moves[e.key][1]))];
      announce(`${label(cursor[0], cursor[1])}${game.board.legal(cursor[0], cursor[1]) ? '' : ', taken'}`);
      render();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showCursor = true;
      playHuman(cursor[0], cursor[1]);
    }
  });
  // Shortcuts only apply while focus is inside the game, so typing elsewhere on the page is safe.
  (document.getElementById('gomoku-game') || document).addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'u' || e.key === 'U') { if (!undoBtn.disabled) undo(); }
    else if (e.key === 'r' || e.key === 'R') startGame();
  });
  undoBtn.addEventListener('click', undo);
  newBtn.addEventListener('click', startGame);
  difficultyInputs.forEach(input => input.addEventListener('change', () => { difficulty = input.value; }));
  colorInputs.forEach(input => input.addEventListener('change', () => { human = Number(input.value); startGame(); }));

  new ResizeObserver(resize).observe(canvas);
  worker = makeWorker();
  startGame();
  resize();
})();
