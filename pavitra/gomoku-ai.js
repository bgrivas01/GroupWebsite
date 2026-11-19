/* Gomoku rules and AI: a JavaScript port of gomoku/game.py and gomoku/ai.py
   from github.com/Pavi21P/gomoku-ai. Coordinates are (row, col).
   Runs three ways: as a plain <script> (fallback), as a Web Worker, and in Node for tests. */
(function (scope) {
  'use strict';
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const SIZE = 15;

  class Board {
    constructor(size = SIZE) {
      if (size < 5) throw new Error('The board must be at least 5 by 5.');
      this.size = size;
      this.cells = new Uint8Array(size * size);
      this.history = [];
    }
    copy() {
      const other = new Board(this.size);
      other.cells.set(this.cells);
      other.history = this.history.slice();
      return other;
    }
    inside(row, col) { return row >= 0 && row < this.size && col >= 0 && col < this.size; }
    at(row, col) { return this.cells[row * this.size + col]; }
    legal(row, col) { return this.inside(row, col) && this.at(row, col) === EMPTY; }
    place(row, col, player) {
      if ((player !== BLACK && player !== WHITE) || !this.legal(row, col)) throw new Error('Illegal move');
      this.cells[row * this.size + col] = player;
      this.history.push({ row, col, player });
    }
    undo() {
      const move = this.history.pop();
      if (!move) return null;
      this.cells[move.row * this.size + move.col] = EMPTY;
      return move;
    }
    get full() { return this.history.length === this.size * this.size; }
    winningLine(row, col) {
      if (!this.inside(row, col) || this.at(row, col) === EMPTY) return [];
      const player = this.at(row, col);
      for (const [dr, dc] of DIRECTIONS) {
        const before = [], after = [];
        for (const [sign, segment] of [[-1, before], [1, after]]) {
          let r = row + sign * dr, c = col + sign * dc;
          while (this.inside(r, c) && this.at(r, c) === player) {
            segment.push([r, c]);
            r += sign * dr; c += sign * dc;
          }
        }
        const line = before.reverse().concat([[row, col]], after);
        if (line.length >= 5) return line;
      }
      return [];
    }
    wouldWin(row, col, player) {
      if (!this.legal(row, col)) return false;
      const i = row * this.size + col;
      this.cells[i] = player;
      try { return this.winningLine(row, col).length > 0; } finally { this.cells[i] = EMPTY; }
    }
    /** Only intersections within two squares of an existing stone, sorted by (row, col). */
    candidates() {
      if (!this.history.length) { const mid = Math.floor(this.size / 2); return [[mid, mid]]; }
      const found = new Set();
      for (const move of this.history) {
        for (let r = Math.max(0, move.row - 2); r < Math.min(this.size, move.row + 3); r++) {
          for (let c = Math.max(0, move.col - 2); c < Math.min(this.size, move.col + 3); c++) {
            if (this.at(r, c) === EMPTY) found.add(r * this.size + c);
          }
        }
      }
      return [...found].sort((a, b) => a - b).map(i => [Math.floor(i / this.size), i % this.size]);
    }
  }

  /** Owns turns and terminal states; search never mutates this board. */
  class Game {
    constructor(human = BLACK) {
      this.board = new Board();
      this.human = human;
      this.ai = 3 - human;
      this.turn = BLACK;
      this.winner = EMPTY;
      this.winLine = [];
      this.draw = false;
    }
    get finished() { return this.winner !== EMPTY || this.draw; }
    play(row, col) {
      if (this.finished || !this.board.legal(row, col)) return false;
      this.board.place(row, col, this.turn);
      this.winLine = this.board.winningLine(row, col);
      if (this.winLine.length) this.winner = this.turn;
      else if (this.board.full) this.draw = true;
      else this.turn = 3 - this.turn;
      return true;
    }
    /** Remove the latest human move and any subsequent computer reply. */
    undoTurn() {
      if (!this.board.history.some(m => m.player === this.human)) return false;
      while (this.board.history.length) {
        if (this.board.undo().player === this.human) break;
      }
      this.turn = this.human;
      this.winner = EMPTY; this.winLine = []; this.draw = false;
      return true;
    }
  }

  const WIN = 10000000;
  const PATTERNS = [
    ['.XXXX.', 160000, 'open four'],
    ['XXXX.', 28000, 'four'], ['.XXXX', 28000, 'four'],
    ['XXX.X', 28000, 'broken four'], ['XX.XX', 28000, 'broken four'],
    ['X.XXX', 28000, 'broken four'],
    ['.XXX.', 7000, 'open three'],
    ['.XX.X.', 5000, 'broken three'], ['.X.XX.', 5000, 'broken three'],
    ['XXX..', 650, 'three'], ['..XXX', 650, 'three'],
    ['XX.X.', 500, 'three'], ['.X.XX', 500, 'three'],
    ['.XX.', 250, 'open two'], ['.X.X.', 180, 'split two'],
    ['.X.', 25, 'single'],
  ];
  const ALL_PATTERNS = [['XXXXX', WIN, 'five in a row']].concat(PATTERNS);

  const LEVELS = {
    Easy: { seconds: 0.20, depth: 1, width: 6, nodes: 800 },
    Medium: { seconds: 0.65, depth: 3, width: 10, nodes: 5000 },
    Hard: { seconds: 1.40, depth: 5, width: 14, nodes: 15000 },
  };

  /** Score the four lines through a hypothetical or existing stone.
      Only patterns containing the evaluated stone count. Board edges are blockers.
      The strongest pattern per direction prevents overlapping-window inflation. */
  function threat(board, row, col, player) {
    let total = 0, strongest = 0, label = 'position', forcing = 0, threes = 0;
    for (const [dr, dc] of DIRECTIONS) {
      let line = '';
      for (let offset = -5; offset <= 5; offset++) {
        const r = row + dr * offset, c = col + dc * offset;
        if (offset === 0) line += 'X';
        else if (!board.inside(r, c)) line += '#';
        else {
          const value = board.at(r, c);
          line += value === EMPTY ? '.' : value === player ? 'X' : '#';
        }
      }
      let best = 0, name = 'position';
      for (const [pattern, weight, title] of ALL_PATTERNS) {
        let start = line.indexOf(pattern);
        while (start >= 0) {
          if (start <= 5 && 5 < start + pattern.length) {
            if (weight > best) { best = weight; name = title; }
            break;
          }
          start = line.indexOf(pattern, start + 1);
        }
      }
      total += best;
      if (best > strongest) { strongest = best; label = name; }
      if (best >= 28000) forcing++;
      if (best >= 5000 && best < 28000) threes++;
    }
    if (forcing >= 2 || (forcing && threes)) { total += 180000; label = 'fork threat'; }
    else if (threes >= 2) { total += 60000; label = 'double three'; }
    return [total, label];
  }

  const STOPPED = { stopped: true };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  class GomokuAI {
    choose(board, player, difficulty = 'Medium') {
      this.board = board.copy();
      this.level = LEVELS[difficulty];
      this.started = now();
      this.deadline = this.started + this.level.seconds * 1000;
      this.nodes = this.cutoffs = 0;
      this.table = new Map(); // per-search cache keyed by the full position
      const last = board.history[board.history.length - 1];
      if (board.full || (last && board.winningLine(last.row, last.col).length)) return this.result(null, 'Game finished', 0);
      const candidates = this.board.candidates();
      if (!candidates.length) return this.result(null, 'No legal moves', 0);
      let fallback = candidates[0];
      if (!board.history.length) return this.result(fallback, 'Take the center', 0);
      let best = null, score = 0, completed = 0, mode = null;
      try {
        let ordered;
        [ordered, mode] = this.ordered(player, this.level.width);
        fallback = ordered[0];
        if (mode === 'win') return this.result(fallback, 'Complete five in a row', 0, WIN);
        if (mode === 'block' && ordered.length === 1) return this.result(fallback, 'Block an immediate win', 0);
        best = fallback;
        for (let depth = 1; depth <= this.level.depth; depth++) {
          let iterationMove = best, iterationScore = -WIN * 2, alpha = -WIN * 2;
          // The previous completed iteration's best move is searched first.
          const moves = [best].concat(ordered.filter(m => m[0] !== best[0] || m[1] !== best[1]));
          for (const [row, col] of moves) {
            this.check();
            this.board.place(row, col, player);
            let value;
            try { value = -this.search(depth - 1, 3 - player, -WIN * 2, -alpha, 1); } finally { this.board.undo(); }
            if (value > iterationScore) { iterationMove = [row, col]; iterationScore = value; }
            alpha = Math.max(alpha, value);
          }
          best = iterationMove; score = iterationScore; completed = depth;
          fallback = best;
          if (Math.abs(score) >= WIN - 225) break;
        }
      } catch (error) {
        if (error !== STOPPED) throw error;
        // A partially searched depth never overwrites the last complete one.
      }
      best = best || fallback;
      const [attack, attackLabel] = threat(this.board, best[0], best[1], player);
      const [defense, defenseLabel] = threat(this.board, best[0], best[1], 3 - player);
      let reason;
      if (mode === 'block') reason = 'Defend against multiple winning threats';
      else if (defense > attack * 1.15 && defense >= 5000) reason = 'Defend: ' + defenseLabel;
      else if (attack >= 5000) reason = 'Build: ' + attackLabel;
      else reason = 'Develop connected stones';
      return this.result(best, reason, completed, score);
    }
    result(move, reason, depth, score = 0) {
      return { move, reason, nodes: this.nodes, depth, seconds: (now() - this.started) / 1000, score, cutoffs: this.cutoffs };
    }
    check() {
      if (this.nodes >= this.level.nodes || now() >= this.deadline) throw STOPPED;
    }
    ordered(player, limit) {
      const candidates = this.board.candidates();
      const wins = [], blocks = [];
      // Never let the beam discard an immediate win or mandatory defense.
      for (const [row, col] of candidates) {
        this.check();
        if (this.board.wouldWin(row, col, player)) wins.push([row, col]);
        if (this.board.wouldWin(row, col, 3 - player)) blocks.push([row, col]);
      }
      if (wins.length) return [wins, 'win'];
      if (blocks.length) return [blocks, 'block'];
      const ranked = [];
      const center = Math.floor(this.board.size / 2);
      for (const [row, col] of candidates) {
        this.check();
        const attack = threat(this.board, row, col, player)[0];
        const defense = threat(this.board, row, col, 3 - player)[0];
        ranked.push([attack + defense * 1.12 - Math.abs(row - center) - Math.abs(col - center), row, col]);
      }
      ranked.sort((a, b) => b[0] - a[0] || a[1] - b[1] || a[2] - b[2]);
      return [ranked.slice(0, limit).map(([, r, c]) => [r, c]), 'quiet'];
    }
    evaluate(player) {
      const scores = { [player]: 0, [3 - player]: 0 };
      for (const move of this.board.history) {
        this.check();
        scores[move.player] += threat(this.board, move.row, move.col, move.player)[0];
      }
      // Tactical terminal scores always dominate heuristic estimates.
      return Math.max(-WIN / 2, Math.min(WIN / 2, scores[player] - scores[3 - player]));
    }
    search(depth, player, alpha, beta, ply) {
      this.check();
      this.nodes++;
      const last = this.board.history[this.board.history.length - 1];
      if (this.board.winningLine(last.row, last.col).length) return -WIN + ply;
      if (this.board.full) return 0;
      if (depth === 0) return this.evaluate(player);
      const key = this.board.cells.join('') + player;
      const entry = this.table.get(key);
      const alphaStart = alpha, betaStart = beta;
      if (entry && entry.depth >= depth) {
        if (entry.flag === 'exact') return entry.value;
        if (entry.flag === 'lower') alpha = Math.max(alpha, entry.value);
        else beta = Math.min(beta, entry.value);
        if (alpha >= beta) return entry.value;
      }
      const [moves, mode] = this.ordered(player, this.level.width);
      if (mode === 'win') return WIN - ply - 1;
      if (mode === 'block' && moves.length > 1) return -WIN + ply + 2;
      if (!moves.length) return 0;
      let best = -WIN * 2;
      for (const [row, col] of moves) {
        this.board.place(row, col, player);
        let value;
        try { value = -this.search(depth - 1, 3 - player, -beta, -alpha, ply + 1); } finally { this.board.undo(); }
        best = Math.max(best, value);
        alpha = Math.max(alpha, value);
        if (alpha >= beta) { this.cutoffs++; break; }
      }
      const flag = best <= alphaStart ? 'upper' : best >= betaStart ? 'lower' : 'exact';
      this.table.set(key, { depth, value: best, flag });
      return best;
    }
  }

  /** Rebuild a board from a plain move list (used across the worker boundary). */
  function boardFromHistory(history) {
    const board = new Board();
    for (const m of history) board.place(m.row, m.col, m.player);
    return board;
  }

  const api = { EMPTY, BLACK, WHITE, SIZE, LEVELS, Board, Game, GomokuAI, threat, boardFromHistory };

  const isWorker = typeof WorkerGlobalScope !== 'undefined' && scope instanceof WorkerGlobalScope;
  if (isWorker) {
    scope.onmessage = event => {
      const { history, player, difficulty, revision } = event.data;
      try {
        const analysis = new GomokuAI().choose(boardFromHistory(history), player, difficulty);
        scope.postMessage({ revision, analysis });
      } catch (error) {
        scope.postMessage({ revision, error: String(error && error.message || error) });
      }
    };
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    scope.Gomoku = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
