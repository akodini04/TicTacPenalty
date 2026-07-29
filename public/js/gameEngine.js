/**
 * GameEngine - 4x4 Tic-Tac-Toe logic, Smart Goalkeeper (exact cell), AI shot selection
 */
class GameEngine {
  constructor() {
    this.board = Array(16).fill(null); // 4x4
    this.currentTurn = 'PLAYER'; // 'PLAYER' or 'AI'
    this.aiDifficulty = 1; // 1: R16, 2: QF, 3: SF, 4: Final
    this.winningLines = this._buildWinningLines();
  }

  _buildWinningLines() {
    const lines = [];
    // Horizontal (4 rows)
    for (let r = 0; r < 4; r++) lines.push([r*4, r*4+1, r*4+2, r*4+3]);
    // Vertical (4 cols)
    for (let c = 0; c < 4; c++) lines.push([c, c+4, c+8, c+12]);
    // Diagonals
    lines.push([0, 5, 10, 15]);
    lines.push([3, 6, 9, 12]);
    return lines;
  }

  resetMatch(aiDifficultyLevel = 1) {
    this.board = Array(16).fill(null);
    this.currentTurn = 'PLAYER';
    this.aiDifficulty = aiDifficultyLevel;
  }

  // Map aim (0-100) and power (0-100) to 4x4 cell index (0-15)
  getShotCellIndex(aimVal, powerVal) {
    let col = Math.floor((aimVal / 100) * 4);
    if (col > 3) col = 3;
    if (col < 0) col = 0;

    let row = 3 - Math.floor((powerVal / 100) * 4);
    if (row > 3) row = 3;
    if (row < 0) row = 0;

    return row * 4 + col;
  }

  getCellColRow(cellIndex) {
    return { col: cellIndex % 4, row: Math.floor(cellIndex / 4) };
  }

  // 1. AI Goalkeeper chooses dive cell based on player's initial target
  getAiGkDiveCell(initialTargetCell) {
    return this._aiPickGkCell('X', initialTargetCell);
  }

  // 2. Evaluate player's final shot result after flight (incorporating mid-air curve shifts)
  evaluatePlayerShotResult(finalTargetCell, gkDiveCell) {
    const saved = (gkDiveCell === finalTargetCell);
    let claimed = false;

    if (!saved && this.board[finalTargetCell] === null) {
      this.board[finalTargetCell] = 'X';
      claimed = true;
    }

    return {
      targetCell: finalTargetCell,
      gkDiveCell,
      saved,
      claimed,
      winStatus: this.checkWin()
    };
  }

  // Legacy fallback evaluate
  evaluatePlayerShot(targetCell) {
    const gkCell = this.getAiGkDiveCell(targetCell);
    return this.evaluatePlayerShotResult(targetCell, gkCell);
  }

  // Smart AI GK: high probability to defend a strategically critical cell
  _aiPickGkCell(attackerSymbol, targetCell) {
    const baseRates = { 1: 0.15, 2: 0.25, 3: 0.35, 4: 0.45 };
    const baseChance = baseRates[this.aiDifficulty] || 0.2;

    const threatCell = this._findBiggestThreat(attackerSymbol);

    if (threatCell !== null) {
      const smartChance = Math.min(0.9, baseChance * 3.5);
      if (Math.random() < smartChance) {
        return threatCell;
      }
    }

    if (Math.random() < baseChance) {
      return targetCell;
    }

    const empties = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (empties.length === 0) return targetCell;
    return empties[Math.floor(Math.random() * empties.length)];
  }

  _findBiggestThreat(attackerSymbol) {
    const defender = attackerSymbol === 'X' ? 'O' : 'X';
    let bestCell = null;
    let bestCount = 0;

    for (const line of this.winningLines) {
      const attackCount = line.filter(i => this.board[i] === attackerSymbol).length;
      const defenderCount = line.filter(i => this.board[i] === defender).length;
      const emptyInLine = line.filter(i => this.board[i] === null);

      if (defenderCount === 0 && emptyInLine.length > 0 && attackCount > bestCount) {
        bestCount = attackCount;
        const winningEmpty = emptyInLine.find(idx => {
          const tmp = [...this.board];
          tmp[idx] = attackerSymbol;
          return this.checkWinForBoard(tmp, attackerSymbol);
        });
        bestCell = winningEmpty ?? emptyInLine[Math.floor(Math.random() * emptyInLine.length)];
      }
    }

    return bestCell;
  }

  // ─── AI SHOOTS: AI picks target cell ───────────────────────────────────────
  getAiTargetCell() {
    const empties = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (empties.length === 0) return 0;

    for (const idx of empties) {
      const tmp = [...this.board]; tmp[idx] = 'O';
      if (this.checkWinForBoard(tmp, 'O')) return idx;
    }

    for (const idx of empties) {
      const tmp = [...this.board]; tmp[idx] = 'X';
      if (this.checkWinForBoard(tmp, 'X')) return idx;
    }

    const smart = this._findBiggestThreat('O');
    if (smart !== null && Math.random() < 0.70) return smart;

    return empties[Math.floor(Math.random() * empties.length)];
  }

  // ─── AI SHOOTS: Player defends ONE exact cell ─────────────────────────────
  evaluateAiShot(playerGuessCell) {
    const aiTargetCell = this.getAiTargetCell();
    const saved = (playerGuessCell === aiTargetCell);
    let claimed = false;

    if (!saved && this.board[aiTargetCell] === null) {
      this.board[aiTargetCell] = 'O';
      claimed = true;
    }

    return { targetCell: aiTargetCell, playerDiveCell: playerGuessCell, saved, claimed, winStatus: this.checkWin() };
  }

  // ─── VAR: undo last AI goal ─────────────────────────────────────────────
  undoAiGoal(cellIndex) {
    if (this.board[cellIndex] === 'O') {
      this.board[cellIndex] = null;
      return true;
    }
    return false;
  }

  checkWinForBoard(b, symbol) {
    return this.winningLines.some(line => line.every(idx => b[idx] === symbol));
  }

  checkWin() {
    for (const line of this.winningLines) {
      if (line.every(i => this.board[i] === 'X')) return { winner: 'PLAYER', line };
      if (line.every(i => this.board[i] === 'O')) return { winner: 'AI', line };
    }
    if (this.board.every(c => c !== null)) {
      const px = this.board.filter(c => c === 'X').length;
      const po = this.board.filter(c => c === 'O').length;
      if (px > po) return { winner: 'PLAYER', line: null };
      if (po > px) return { winner: 'AI', line: null };
      return { winner: 'DRAW', line: null };
    }
    return { winner: null, line: null };
  }
}

window.gameEngine = new GameEngine();
