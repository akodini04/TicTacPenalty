/**
 * App - Main Controller, Screen Flow, Hungary VAR Power-Up
 */
class App {
  constructor() {
    this.selectedTeamCode = 'HU';

    // VAR state (Hungary only, once per match)
    this.varAvailable  = false;
    this.varUsed       = false;
    this.lastAiGoalCell = -1; // cell index of the last AI goal (for undo)

    this.lastMatchResult = null;
    this.init();
  }

  init() {
    this.bindHeaderControls();
    this.renderTeamGrid();
    this.selectTeam('HU');

    if (window.tournament && window.tournament.loadState()) {
      this.showScreen('screen-tournament');
      this.renderBracket();
    } else {
      this.showScreen('screen-team-select');
    }

    this.bindButtons();
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
  }

  bindHeaderControls() {
    const audioBtn  = document.getElementById('btn-audio');
    const audioIcon = document.getElementById('audio-icon');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const enabled = window.soundFX.toggleAudio();
        if (audioIcon) audioIcon.textContent = enabled ? '🔊' : '🔇';
      });
    }

    const resetBtn = document.getElementById('btn-reset-tourney');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Start a new World Cup tournament? Your current cup progress will reset.')) {
          if (window.storageService) window.storageService.clearTournament();
          this.showScreen('screen-team-select');
        }
      });
    }
  }

  renderTeamGrid() {
    const grid = document.getElementById('team-grid');
    if (!grid || !window.tournament) return;

    grid.innerHTML = '';
    window.tournament.teams.forEach(team => {
      const card = document.createElement('div');
      card.className = `team-card ${team.featured ? 'featured' : ''}`;
      card.dataset.code = team.code;
      card.innerHTML = `
        <div class="team-flag">${team.flag}</div>
        <div class="team-name">${team.name}</div>
        <div class="team-rating">★ ${team.rating}</div>
      `;
      card.addEventListener('click', () => {
        if (window.soundFX) window.soundFX.playClick();
        this.selectTeam(team.code);
      });
      grid.appendChild(card);
    });
  }

  selectTeam(code) {
    this.selectedTeamCode = code;
    const team = window.tournament.getTeam(code);

    document.querySelectorAll('.team-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.code === code);
    });

    const infoBox = document.getElementById('selected-team-info');
    if (infoBox && team) {
      infoBox.classList.remove('hidden');
      document.getElementById('selected-flag').textContent = team.flag;
      document.getElementById('selected-name').textContent = team.name;
      document.getElementById('selected-desc').textContent = team.desc;
    }
  }

  bindButtons() {
    const startBtn = document.getElementById('btn-start-cup');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (window.soundFX) window.soundFX.playWhistle();
        window.tournament.startTournament(this.selectedTeamCode);
        this.showScreen('screen-tournament');
        this.renderBracket();
      });
    }

    const playMatchBtn = document.getElementById('btn-play-match');
    if (playMatchBtn) {
      playMatchBtn.addEventListener('click', () => {
        if (window.soundFX) window.soundFX.playWhistle();
        this.startMatch();
      });
    }

    const continueBtn = document.getElementById('btn-continue-tourney');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        document.getElementById('modal-result').classList.add('hidden');
        if (this.lastMatchResult === true || this.lastMatchResult === 'CHAMPION') {
          if (window.tournament.currentStageIndex <= 3 && this.lastMatchResult !== 'CHAMPION') {
            this.showScreen('screen-tournament');
            this.renderBracket();
          } else {
            if (window.storageService) {
              window.storageService.syncVictoryWithServer(
                window.tournament.userTeam.code,
                window.tournament.userTeam.name,
                4
              );
              window.storageService.clearTournament();
            }
            this.showScreen('screen-team-select');
          }
        } else {
          if (window.storageService) window.storageService.clearTournament();
          this.showScreen('screen-team-select');
        }
      });
    }

    // VAR button (Hungary power-up)
    const varBtn = document.getElementById('btn-var');
    if (varBtn) {
      varBtn.addEventListener('click', () => this.triggerVAR());
    }
  }

  renderBracket() {
    const bracketView = document.getElementById('bracket-view');
    const stageLabel  = document.getElementById('current-stage-name');
    if (!bracketView || !window.tournament) return;

    const tourney   = window.tournament;
    const stageName = tourney.stages[tourney.currentStageIndex] || 'WORLD CUP';
    if (stageLabel) stageLabel.textContent = stageName;

    bracketView.innerHTML = '';
    tourney.stages.forEach((stageTitle, stageIdx) => {
      const col = document.createElement('div');
      col.className = `bracket-round stage-${stageIdx}`;

      const header = document.createElement('div');
      header.className = 'round-title';
      header.textContent = stageTitle;
      col.appendChild(header);

      const matches = tourney.bracketMatches[stageIdx] || [];
      matches.forEach(m => {
        const matchCard = document.createElement('div');
        const isCurrentMatch = (stageIdx === tourney.currentStageIndex) &&
          (m.team1.code === tourney.userTeam.code || m.team2.code === tourney.userTeam.code);

        matchCard.className = `bracket-match ${isCurrentMatch ? 'current' : ''}`;

        const isT1User = m.team1.code === tourney.userTeam.code;
        const isT2User = m.team2.code === tourney.userTeam.code;
        const isT1Win  = m.winner && m.winner.code === m.team1.code;
        const isT2Win  = m.winner && m.winner.code === m.team2.code;

        matchCard.innerHTML = `
          <div class="bracket-team ${isT1User ? 'user' : ''} ${isT1Win ? 'winner' : ''}">
            <span>${m.team1.flag} ${m.team1.code}</span><span>${isT1Win ? '✓' : ''}</span>
          </div>
          <div class="bracket-team ${isT2User ? 'user' : ''} ${isT2Win ? 'winner' : ''}">
            <span>${m.team2.flag} ${m.team2.code}</span><span>${isT2Win ? '✓' : ''}</span>
          </div>
        `;
        col.appendChild(matchCard);
      });

      bracketView.appendChild(col);
    });
  }

  startMatch() {
    const userTeam  = window.tournament.userTeam;
    const oppTeam   = window.tournament.getCurrentOpponent();
    const stageIdx  = window.tournament.currentStageIndex;
    const stageName = window.tournament.stages[stageIdx];

    document.getElementById('match-player-flag').textContent = userTeam.flag;
    document.getElementById('match-player-code').textContent = userTeam.code;
    document.getElementById('match-opp-flag').textContent    = oppTeam.flag;
    document.getElementById('match-opp-code').textContent    = oppTeam.code;
    document.getElementById('match-stage-label').textContent = stageName;

    window.gameEngine.resetMatch(stageIdx + 1);
    window.renderer.resetPositions();

    // Reset VAR for Hungary
    this.varUsed        = false;
    this.varAvailable   = false;
    this.lastAiGoalCell = -1;
    this._hideVarButton();

    // Show VAR indicator if Hungary
    const isHungary = userTeam.code === 'HU';
    const varIndicator = document.getElementById('var-indicator');
    if (varIndicator) {
      varIndicator.style.display = isHungary ? 'flex' : 'none';
      varIndicator.querySelector('#var-status-text').textContent = '🇭🇺 VAR READY';
      varIndicator.style.opacity = '1';
    }

    this.updateBoardUI();
    this.showScreen('screen-match');
    this.startPlayerTurn();
  }

  // ─── TURNS ───────────────────────────────────────────────────────────────────
  startPlayerTurn() {
    window.gameEngine.currentTurn = 'PLAYER';
    document.getElementById('match-turn-label').textContent = 'YOUR SHOOTING TURN';
    document.getElementById('match-turn-label').style.color = 'var(--neon-green)';
    this._hideVarButton();

    window.controls.startShootingControls(({ aimVal, powerVal }) => {
      this.handlePlayerKick(aimVal, powerVal);
    });
  }

  handlePlayerKick(aimVal, powerVal) {
    const initialTargetCell = window.gameEngine.getShotCellIndex(aimVal, powerVal);
    const gkDiveCell        = window.gameEngine.getAiGkDiveCell(initialTargetCell);

    window.renderer.aimState.aimVal = aimVal;

    // Pass isPlayer = true to animateShot
    window.renderer.animateShot(initialTargetCell, gkDiveCell, false, (finalTargetCell) => {
      // Evaluate result based on finalTargetCell (which may have shifted to a neighboring square!)
      const result = window.gameEngine.evaluatePlayerShotResult(finalTargetCell, gkDiveCell);

      this.updateBoardUI();

      const curved = (finalTargetCell !== initialTargetCell);

      if (result.saved) {
        window.controls.updateCommentary(`❌ <strong>SAVED!</strong> Goalkeeper guessed cell ${result.gkDiveCell + 1} exactly!`);
      } else if (result.claimed) {
        if (curved) {
          window.controls.updateCommentary(`⚽ <strong>GOAL!</strong> 🌀 Curved into neighboring cell #${finalTargetCell + 1} and claimed it!`);
        } else {
          window.controls.updateCommentary(`⚽ <strong>GOAL!</strong> You claimed grid cell #${finalTargetCell + 1}!`);
        }
      } else {
        if (curved) {
          window.controls.updateCommentary(`⚽ <strong>GOAL!</strong> 🌀 Curved into cell #${finalTargetCell + 1}!`);
        } else {
          window.controls.updateCommentary(`⚽ <strong>GOAL!</strong> Hit cell #${finalTargetCell + 1} (already marked).`);
        }
      }

      if (result.winStatus.winner) {
        setTimeout(() => this.handleMatchEnd(result.winStatus), 1200);
      } else {
        setTimeout(() => this.startAiTurn(), 1400);
      }
    }, true); // isPlayer = true
  }

  startAiTurn() {
    window.gameEngine.currentTurn = 'AI';
    document.getElementById('match-turn-label').textContent = 'DEFENDING (AI SHOOTING)';
    document.getElementById('match-turn-label').style.color = 'var(--neon-red)';
    this._hideVarButton();

    window.controls.startDefendingControls((exactCell) => {
      this.handleAiKick(exactCell);
    });
  }

  handleAiKick(playerGuessCell) {
    const result = window.gameEngine.evaluateAiShot(playerGuessCell);

    // AI shot travels from penalty spot too — give it a bend
    window.renderer.aimState.aimVal = 50 + (result.targetCell % 4) * 16 - 25;

    // Pass isPlayer = false to animateShot
    window.renderer.animateShot(result.targetCell, playerGuessCell, result.saved, () => {
      this.updateBoardUI();

      if (result.saved) {
        window.controls.updateCommentary('🧤 <strong>GREAT SAVE!</strong> You guessed the exact cell!');
        this.lastAiGoalCell = -1;
        this._hideVarButton();
      } else if (result.claimed) {
        window.controls.updateCommentary(`🚨 <strong>GOAL!</strong> Opponent claimed cell #${result.targetCell + 1}! They dove to cell #${playerGuessCell + 1}.`);
        this.lastAiGoalCell = result.targetCell;
        this._maybeShowVarButton();
      } else {
        window.controls.updateCommentary(`🚨 <strong>GOAL!</strong> Opponent scored in cell #${result.targetCell + 1}.`);
        this.lastAiGoalCell = result.targetCell;
        this._maybeShowVarButton();
      }

      if (result.winStatus.winner) {
        setTimeout(() => this.handleMatchEnd(result.winStatus), 1500);
      } else {
        setTimeout(() => {
          if (!this.varAvailable) {
            this.startPlayerTurn();
          }
        }, 1500);
      }
    }, false); // isPlayer = false
  }

  // ─── VAR (Hungary Power-Up for EVERY conceded goal) ──────────────────────
  _maybeShowVarButton() {
    const isHungary = window.tournament.userTeam.code === 'HU';
    if (!isHungary) return;

    this.varAvailable = true;
    const varBtn = document.getElementById('btn-var');
    if (varBtn) {
      varBtn.style.display = 'flex';
      varBtn.classList.add('pulse');
    }

    // Update VAR indicator
    const varIndicator = document.getElementById('var-indicator');
    if (varIndicator) {
      varIndicator.querySelector('#var-status-text').textContent = '🇭🇺 VAR AVAILABLE FOR CONCEDED GOAL!';
      varIndicator.style.opacity = '1';
    }
  }

  _hideVarButton() {
    this.varAvailable = false;
    const varBtn = document.getElementById('btn-var');
    if (varBtn) {
      varBtn.style.display = 'none';
      varBtn.classList.remove('pulse');
    }
  }

  triggerVAR() {
    if (!this.varAvailable) return;
    this.varAvailable = false;

    // Hide the VAR button
    const varBtn = document.getElementById('btn-var');
    if (varBtn) { varBtn.style.display = 'none'; varBtn.classList.remove('pulse'); }

    // Show VAR modal
    const modal = document.getElementById('modal-var');
    if (modal) {
      modal.classList.remove('hidden');
      const coin = document.getElementById('var-coin');
      if (coin) { coin.className = 'var-coin spinning'; }

      setTimeout(() => {
        const heads = Math.random() < 0.5;
        if (coin) coin.className = `var-coin ${heads ? 'heads' : 'tails'}`;

        const verdictEl = document.getElementById('var-verdict');
        const descEl    = document.getElementById('var-desc');

        if (heads) {
          // DISALLOW — undo AI goal
          window.gameEngine.undoAiGoal(this.lastAiGoalCell);
          this.updateBoardUI();
          if (verdictEl) verdictEl.textContent = '✅ GOAL DISALLOWED!';
          if (descEl)    descEl.textContent   = 'VAR overturns the decision — Opponent goal cancelled!';
          if (verdictEl) verdictEl.style.color = '#22c55e';
        } else {
          // STANDS
          if (verdictEl) verdictEl.textContent = '❌ GOAL STANDS';
          if (descEl)    descEl.textContent   = 'VAR upholds the decision. Goal stands!';
          if (verdictEl) verdictEl.style.color = '#ef4444';
        }

        document.getElementById('btn-var-close').style.display = 'block';
      }, 1600);
    }
  }

  closeVarModal() {
    const modal = document.getElementById('modal-var');
    if (modal) modal.classList.add('hidden');

    // Check win status after potential VAR reversal
    const ws = window.gameEngine.checkWin();
    if (ws.winner) {
      setTimeout(() => this.handleMatchEnd(ws), 300);
    } else {
      this.startPlayerTurn();
    }
  }

  // ─── BOARD UI ────────────────────────────────────────────────────────────────
  updateBoardUI() {
    const board = window.gameEngine.board;
    let playerCount = 0;
    let aiCount     = 0;

    for (let i = 0; i < 16; i++) {
      const cellEl = document.getElementById(`cell-${i}`);
      if (!cellEl) continue;

      cellEl.className = 'cell';
      cellEl.style.borderColor      = '';
      cellEl.style.backgroundColor  = '';
      if (board[i] === 'X') { cellEl.classList.add('claimed-player'); playerCount++; }
      else if (board[i] === 'O') { cellEl.classList.add('claimed-ai'); aiCount++; }
    }

    document.getElementById('match-player-cells').textContent = `${playerCount} Cells`;
    document.getElementById('match-opp-cells').textContent    = `${aiCount} Cells`;
  }

  // ─── MATCH END ───────────────────────────────────────────────────────────────
  handleMatchEnd(winStatus) {
    const userWon = winStatus.winner === 'PLAYER';
    this.lastMatchResult = window.tournament.advanceTournament(userWon);

    const modal   = document.getElementById('modal-result');
    const title   = document.getElementById('result-title');
    const msg     = document.getElementById('result-message');
    const emoji   = document.getElementById('result-emoji');
    const preview = document.getElementById('result-board-preview');

    if (modal) modal.classList.remove('hidden');

    if (userWon) {
      if (this.lastMatchResult === 'CHAMPION') {
        emoji.textContent = '🏆';
        title.textContent = 'WORLD CUP CHAMPIONS!';
        msg.textContent   = `Congratulations! ${window.tournament.userTeam.name} won the World Cup!`;
      } else {
        emoji.textContent = '🎉';
        title.textContent = 'VICTORY!';
        msg.textContent   = `${window.tournament.userTeam.name} advanced to the next round!`;
      }
      if (window.soundFX) window.soundFX.playGoal();
    } else {
      emoji.textContent = '💔';
      title.textContent = 'ELIMINATED';
      msg.textContent   = 'Hard luck! Opponent took the match. Try again!';
      if (window.soundFX) window.soundFX.playSave();
    }

    if (preview) {
      preview.innerHTML = '';
      // 4x4 preview grid
      preview.style.gridTemplateColumns = 'repeat(4, 1fr)';
      window.gameEngine.board.forEach(val => {
        const d = document.createElement('div');
        d.className = `preview-cell ${val === 'X' ? 'X' : val === 'O' ? 'O' : ''}`;
        d.textContent = val || '';
        preview.appendChild(d);
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();

  // VAR close button
  const varCloseBtn = document.getElementById('btn-var-close');
  if (varCloseBtn) {
    varCloseBtn.addEventListener('click', () => window.app.closeVarModal());
  }
});
