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
  // col 0=far-left, 3=far-right; row 0=top, 3=bottom (low power = bottom)
  getShotCellIndex(aimVal, powerVal) {
    let col = 0;
    if (aimVal > 75) col = 3;
    else if (aimVal > 50) col = 2;
    else if (aimVal > 25) col = 1;

    let row = 3; // low power = bottom row
    if (powerVal > 75) row = 0;
    else if (powerVal > 50) row = 1;
    else if (powerVal > 25) row = 2;

    return row * 4 + col;
  }

  // Get col/row from a cell index (used by renderer for 4x4)
  getCellColRow(cellIndex) {
    return { col: cellIndex % 4, row: Math.floor(cellIndex / 4) };
  }

  // ─── PLAYER SHOOTS: AI goalkeeper picks ONE exact cell to save ───────────────
  evaluatePlayerShot(targetCell) {
    const gkCell = this._aiPickGkCell('X', targetCell);
    const saved = (gkCell === targetCell);
    let claimed = false;

    if (!saved && this.board[targetCell] === null) {
      this.board[targetCell] = 'X';
      claimed = true;
    }

    return { targetCell, gkDiveCell: gkCell, saved, claimed, winStatus: this.checkWin() };
  }

  // Smart AI GK: high probability to defend a strategically critical cell (one that
  // would extend/complete player's longest threat), but still random element.
  _aiPickGkCell(attackerSymbol, targetCell) {
    // Base accuracy by difficulty (exact cell guess rate)
    const baseRates = { 1: 0.15, 2: 0.25, 3: 0.35, 4: 0.45 };
    const baseChance = baseRates[this.aiDifficulty] || 0.2;

    // Find the most threatening cell the attacker is aiming for
    const threatCell = this._findBiggestThreat(attackerSymbol);

    if (threatCell !== null) {
      // High probability to defend the strategic cell
      const smartChance = Math.min(0.9, baseChance * 3.5);
      if (Math.random() < smartChance) {
        return threatCell;
      }
    }

    // With base chance, just guess the exact target
    if (Math.random() < baseChance) {
      return targetCell;
    }

    // Otherwise pick a random empty cell (bad guess)
    const empties = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (empties.length === 0) return targetCell;
    return empties[Math.floor(Math.random() * empties.length)];
  }

  // Find the empty cell whose claiming would most extend the attacker's line (3-in-a-row threat)
  _findBiggestThreat(attackerSymbol) {
    const defender = attackerSymbol === 'X' ? 'O' : 'X';
    let bestCell = null;
    let bestCount = 0;

    for (const line of this.winningLines) {
      const attackCount = line.filter(i => this.board[i] === attackerSymbol).length;
      const defenderCount = line.filter(i => this.board[i] === defender).length;
      const emptyInLine = line.filter(i => this.board[i] === null);

      // Only a live threat (no defender in the line)
      if (defenderCount === 0 && emptyInLine.length > 0 && attackCount > bestCount) {
        bestCount = attackCount;
        // Prefer the cell in the line that completes a 4-in-a-row, else first empty
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

  // ─── AI SHOOTS: AI picks smart target cell ─────────────────────────────────
  getAiTargetCell() {
    const empties = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (empties.length === 0) return 0;

    // 1. Win immediately
    for (const idx of empties) {
      const tmp = [...this.board]; tmp[idx] = 'O';
      if (this.checkWinForBoard(tmp, 'O')) return idx;
    }

    // 2. Block player's winning move
    for (const idx of empties) {
      const tmp = [...this.board]; tmp[idx] = 'X';
      if (this.checkWinForBoard(tmp, 'X')) return idx;
    }

    // 3. Extend AI's longest line
    const smart = this._findBiggestThreat('O');
    if (smart !== null && Math.random() < 0.70) return smart;

    // 4. Random
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
