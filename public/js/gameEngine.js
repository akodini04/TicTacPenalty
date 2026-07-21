/**
 * GameEngine - Handles 3x3 Tic-Tac-Toe logic, Shot-to-Cell Mapping, and AI Decision Making
 */
class GameEngine {
  constructor() {
    this.board = Array(9).fill(null);
    this.currentTurn = 'PLAYER'; // 'PLAYER' or 'AI'
    this.aiDifficulty = 1; // 1: R16, 2: QF, 3: SF, 4: Final
    this.winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
  }

  resetMatch(aiDifficultyLevel = 1) {
    this.board = Array(9).fill(null);
    this.currentTurn = 'PLAYER';
    this.aiDifficulty = aiDifficultyLevel;
  }

  // Map aim (0-100) and power (0-100) to 3x3 cell index (0-8)
  getShotCellIndex(aimVal, powerVal) {
    // Col: 0 (Left), 1 (Center), 2 (Right)
    let col = 1;
    if (aimVal < 35) col = 0;
    else if (aimVal > 65) col = 2;

    // Row: 0 (Top), 1 (Middle), 2 (Bottom)
    let row = 1;
    if (powerVal > 65) row = 0;
    else if (powerVal < 35) row = 2;

    return row * 3 + col;
  }

  // Determine if AI Goalkeeper saves Player's shot
  evaluatePlayerShot(targetCell, aimVal, powerVal) {
    // AI GK dive zone prediction based on difficulty
    const gkSaveChances = {
      1: 0.35, // Round of 16
      2: 0.50, // Quarter Final
      3: 0.65, // Semi Final
      4: 0.78  // Grand Final
    };

    const chance = gkSaveChances[this.aiDifficulty] || 0.4;
    const isGkPredicting = Math.random() < chance;

    // AI GK pick cell to dive
    let gkDiveCell;
    if (isGkPredicting) {
      gkDiveCell = targetCell;
    } else {
      // Dive to a random cell
      gkDiveCell = Math.floor(Math.random() * 9);
    }

    const saved = (gkDiveCell === targetCell);
    let claimed = false;

    if (!saved) {
      if (this.board[targetCell] === null) {
        this.board[targetCell] = 'X';
        claimed = true;
      }
    }

    return {
      targetCell,
      gkDiveCell,
      saved,
      claimed,
      winStatus: this.checkWin()
    };
  }

  // AI chooses target cell to shoot at using Tic-Tac-Toe minimax / heuristics
  getAiTargetCell() {
    const emptyIndices = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);

    if (emptyIndices.length === 0) return 0;

    // 1. Check if AI can win immediately
    for (const idx of emptyIndices) {
      const temp = [...this.board];
      temp[idx] = 'O';
      if (this.checkWinForBoard(temp, 'O')) return idx;
    }

    // 2. Check if Player can win on next turn & block
    for (const idx of emptyIndices) {
      const temp = [...this.board];
      temp[idx] = 'X';
      if (this.checkWinForBoard(temp, 'X')) return idx;
    }

    // 3. Prefer center if available
    if (emptyIndices.includes(4) && Math.random() < 0.7) return 4;

    // 4. Prefer corners
    const corners = [0, 2, 6, 8].filter(c => emptyIndices.includes(c));
    if (corners.length > 0 && Math.random() < 0.6) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    // 5. Random empty cell
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  // Evaluate AI Shot against Player's dive choice
  evaluateAiShot(playerDiveDir) {
    const aiTargetCell = this.getAiTargetCell();
    
    // Convert target cell to column ('left', 'center', 'right')
    const colMap = ['left', 'center', 'right'];
    const aiTargetCol = colMap[aiTargetCell % 3];

    // Check if player's dive guessed the correct column
    const saved = (playerDiveDir === aiTargetCol);
    let claimed = false;

    if (!saved) {
      if (this.board[aiTargetCell] === null) {
        this.board[aiTargetCell] = 'O';
        claimed = true;
      }
    }

    return {
      targetCell: aiTargetCell,
      saved,
      claimed,
      winStatus: this.checkWin()
    };
  }

  checkWinForBoard(b, symbol) {
    return this.winningLines.some(line => line.every(idx => b[idx] === symbol));
  }

  checkWin() {
    // Check 3-in-a-row for X (Player)
    for (const line of this.winningLines) {
      if (line.every(i => this.board[i] === 'X')) {
        return { winner: 'PLAYER', line };
      }
    }

    // Check 3-in-a-row for O (AI)
    for (const line of this.winningLines) {
      if (line.every(i => this.board[i] === 'O')) {
        return { winner: 'AI', line };
      }
    }

    // Check board full
    const isFull = this.board.every(cell => cell !== null);
    if (isFull) {
      // Count cells claimed
      const playerCells = this.board.filter(c => c === 'X').length;
      const aiCells = this.board.filter(c => c === 'O').length;

      if (playerCells > aiCells) return { winner: 'PLAYER', line: null };
      if (aiCells > playerCells) return { winner: 'AI', line: null };
      return { winner: 'DRAW', line: null };
    }

    return { winner: null, line: null };
  }
}

window.gameEngine = new GameEngine();
