/**
 * Controls - Shooting (2-step: AIM → POWER), Defending (2-step: COL → ROW exact cell) & Mid-Air Arrow Swerving
 */
class Controls {
  constructor() {
    this.phase = 'AIM'; // 'AIM', 'POWER', 'SHOT_LOCKED', 'DEFEND_COL', 'DEFEND_ROW', 'DEFEND_LOCKED'

    // Key state dictionary for continuous holding
    this.keysState = {};

    // Shooting values
    this.aimVal   = 50;
    this.powerVal = 0;
    this.aimDir   = 1;
    this.powerDir = 1;
    this.aimSpeed   = 2.2;
    this.powerSpeed = 3.2;

    // Defending values (2-step: column then row)
    this.defendColVal  = 50;
    this.defendRowVal  = 0;
    this.defendColDir  = 1;
    this.defendRowDir  = 1;
    this.defendColSpeed = 2.4;
    this.defendRowSpeed = 2.8;
    this.lockedCol = -1; // column locked in step 1

    this.animFrameId  = null;
    this.onKickCallback = null;
    this.onDiveCallback = null;

    this.aimPointerEl   = document.getElementById('aim-pointer');
    this.powerBarEl     = document.getElementById('power-bar');
    this.defendPointerEl = document.getElementById('defend-pointer');
    this.kickBtn   = document.getElementById('btn-kick');
    this.defendBtn = document.getElementById('btn-defend');
    this.commentaryEl = document.getElementById('commentary-box');
    this.curveControlsEl = document.getElementById('midair-curve-controls');

    this.initEventListeners();
  }

  isKeyPressed(code) {
    return !!this.keysState[code];
  }

  initEventListeners() {
    if (this.kickBtn)   this.kickBtn.addEventListener('click',   () => this.handleShootTrigger());
    if (this.defendBtn) this.defendBtn.addEventListener('click', () => this.handleDefendTrigger());

    // On-screen curve buttons: support click, mouse hold, and touch hold
    const btnCurveLeft  = document.getElementById('btn-curve-left');
    const btnCurveRight = document.getElementById('btn-curve-right');

    if (btnCurveLeft) {
      const startLeft = () => { this.keysState['ArrowLeft'] = true; };
      const stopLeft  = () => { this.keysState['ArrowLeft'] = false; };
      btnCurveLeft.addEventListener('mousedown', startLeft);
      btnCurveLeft.addEventListener('mouseup', stopLeft);
      btnCurveLeft.addEventListener('mouseleave', stopLeft);
      btnCurveLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startLeft(); });
      btnCurveLeft.addEventListener('touchend', (e) => { e.preventDefault(); stopLeft(); });
      btnCurveLeft.addEventListener('click', () => { if (window.renderer) window.renderer.applyMidAirCurve(-1.5); });
    }

    if (btnCurveRight) {
      const startRight = () => { this.keysState['ArrowRight'] = true; };
      const stopRight  = () => { this.keysState['ArrowRight'] = false; };
      btnCurveRight.addEventListener('mousedown', startRight);
      btnCurveRight.addEventListener('mouseup', stopRight);
      btnCurveRight.addEventListener('mouseleave', stopRight);
      btnCurveRight.addEventListener('touchstart', (e) => { e.preventDefault(); startRight(); });
      btnCurveRight.addEventListener('touchend', (e) => { e.preventDefault(); stopRight(); });
      btnCurveRight.addEventListener('click', () => { if (window.renderer) window.renderer.applyMidAirCurve(1.5); });
    }

    // Keyboard Event Listeners
    window.addEventListener('keydown', (e) => {
      this.keysState[e.code] = true;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (this.phase === 'AIM' || this.phase === 'POWER')       this.handleShootTrigger();
        if (this.phase === 'DEFEND_COL' || this.phase === 'DEFEND_ROW') this.handleDefendTrigger();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysState[e.code] = false;
    });
  }

  showMidAirCurveUI() {
    if (this.curveControlsEl) this.curveControlsEl.classList.remove('hidden');
    this.updateCommentary('🌀 <strong>MID-AIR BEND ACTIVE!</strong> Hold <strong>◄ / ► ARROW KEYS</strong> to curve the ball mid-air!');
  }

  hideMidAirCurveUI() {
    if (this.curveControlsEl) this.curveControlsEl.classList.add('hidden');
  }

  // ─── SHOOTING ────────────────────────────────────────────────────────────────
  startShootingControls(onKick) {
    this.onKickCallback = onKick;
    this.phase    = 'AIM';
    this.aimVal   = 50;
    this.powerVal = 0;
    this.aimDir   = 1;
    this.powerDir = 1;

    this.hideMidAirCurveUI();
    if (window.renderer) window.renderer.setDefendOverlay(false);
    document.getElementById('shoot-controls').classList.remove('hidden');
    document.getElementById('defend-controls').classList.add('hidden');

    this._updateKickButton();
    this.updateCommentary('🎯 <strong>STEP 1: LOCK DIRECTION</strong> — Watch the arrow sweep, press SPACEBAR/TAP to lock!');
    this.stopLoop();
    this.loop();
  }

  handleShootTrigger() {
    if (window.soundFX) window.soundFX.playClick();

    if (this.phase === 'AIM') {
      this.phase    = 'POWER';
      this.powerVal = 0;
      this.powerDir = 1;
      this._updateKickButton();
      this.updateCommentary('⚡ <strong>STEP 2: LOCK POWER & HEIGHT</strong> — Press SPACEBAR/TAP to shoot!');

    } else if (this.phase === 'POWER') {
      this.phase = 'SHOT_LOCKED';
      this.stopLoop();
      this._updateKickButton();
      if (window.renderer) window.renderer.setAimOverlay(false);
      this.showMidAirCurveUI();
      if (this.onKickCallback) this.onKickCallback({ aimVal: this.aimVal, powerVal: this.powerVal });
    }
  }

  // ─── DEFENDING ────────────────────────────────────────────────────────────────
  startDefendingControls(onDive) {
    this.onDiveCallback   = onDive;
    this.phase            = 'DEFEND_COL';
    this.defendColVal     = 50;
    this.defendRowVal     = 0;
    this.defendColDir     = 1;
    this.defendRowDir     = 1;
    this.lockedCol        = -1;

    this.hideMidAirCurveUI();
    document.getElementById('shoot-controls').classList.add('hidden');
    document.getElementById('defend-controls').classList.remove('hidden');

    this._updateDefendButton();
    this.updateCommentary('🧤 <strong>STEP 1: PICK COLUMN</strong> — Sweep left/right, press SPACEBAR/TAP to lock column!');

    if (window.renderer) window.renderer.setDefendOverlay(true, 50, 0, 'COL', -1);
    this.stopLoop();
    this.loop();
  }

  handleDefendTrigger() {
    if (window.soundFX) window.soundFX.playClick();

    if (this.phase === 'DEFEND_COL') {
      this.lockedCol     = this._colFromVal(this.defendColVal);
      this.phase         = 'DEFEND_ROW';
      this.defendRowVal  = 0;
      this.defendRowDir  = 1;
      this._updateDefendButton();
      this.updateCommentary('🧤 <strong>STEP 2: PICK ROW</strong> — Sweep up/down, press SPACEBAR/TAP to dive!');

    } else if (this.phase === 'DEFEND_ROW') {
      const row = this._rowFromVal(this.defendRowVal);
      const exactCell = row * 4 + this.lockedCol;
      this.phase = 'DEFEND_LOCKED';
      this.stopLoop();

      if (window.renderer) window.renderer.setDefendOverlay(false);
      if (this.onDiveCallback) this.onDiveCallback(exactCell);
    }
  }

  _colFromVal(v) {
    let col = Math.floor((v / 100) * 4);
    if (col > 3) col = 3; if (col < 0) col = 0;
    return col;
  }

  _rowFromVal(v) {
    let row = 3 - Math.floor((v / 100) * 4);
    if (row > 3) row = 3; if (row < 0) row = 0;
    return row;
  }

  // ─── ANIMATION LOOP ──────────────────────────────────────────────────────────
  loop() {
    if (this.phase === 'AIM') {
      this.aimVal += this.aimDir * this.aimSpeed;
      if (this.aimVal >= 100) { this.aimVal = 100; this.aimDir = -1; }
      else if (this.aimVal <= 0) { this.aimVal = 0; this.aimDir = 1; }

      if (this.aimPointerEl) this.aimPointerEl.style.left = `${this.aimVal}%`;
      if (window.renderer) window.renderer.setAimOverlay(true, 'AIM', this.aimVal, 0);

    } else if (this.phase === 'POWER') {
      this.powerVal += this.powerDir * this.powerSpeed;
      if (this.powerVal >= 100) { this.powerVal = 100; this.powerDir = -1; }
      else if (this.powerVal <= 0) { this.powerVal = 0; this.powerDir = 1; }

      if (this.powerBarEl) this.powerBarEl.style.height = `${this.powerVal}%`;
      if (window.renderer) window.renderer.setAimOverlay(true, 'POWER', this.aimVal, this.powerVal);

    } else if (this.phase === 'DEFEND_COL') {
      this.defendColVal += this.defendColDir * this.defendColSpeed;
      if (this.defendColVal >= 100) { this.defendColVal = 100; this.defendColDir = -1; }
      else if (this.defendColVal <= 0) { this.defendColVal = 0; this.defendColDir = 1; }

      if (this.defendPointerEl) this.defendPointerEl.style.left = `${this.defendColVal}%`;
      if (window.renderer) window.renderer.setDefendOverlay(true, this.defendColVal, 0, 'COL', -1);

    } else if (this.phase === 'DEFEND_ROW') {
      this.defendRowVal += this.defendRowDir * this.defendRowSpeed;
      if (this.defendRowVal >= 100) { this.defendRowVal = 100; this.defendRowDir = -1; }
      else if (this.defendRowVal <= 0) { this.defendRowVal = 0; this.defendRowDir = 1; }

      if (this.defendPointerEl) this.defendPointerEl.style.left = `${this.defendRowVal}%`;
      if (window.renderer) window.renderer.setDefendOverlay(true, this.lockedCol * 25 + 12.5, this.defendRowVal, 'ROW', this.lockedCol);
    }

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  stopLoop() {
    if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
  }

  _updateKickButton() {
    if (!this.kickBtn) return;
    if (this.phase === 'AIM') {
      this.kickBtn.textContent = '🎯 LOCK DIRECTION (SPACE)';
      this.kickBtn.className = 'btn-action pulse';
    } else if (this.phase === 'POWER') {
      this.kickBtn.textContent = '⚡ SHOOT NOW! (SPACE)';
      this.kickBtn.className = 'btn-action btn-primary pulse';
    } else {
      this.kickBtn.textContent = 'KICKING... ⚽';
      this.kickBtn.className = 'btn-action disabled';
    }
  }

  _updateDefendButton() {
    if (!this.defendBtn) return;
    if (this.phase === 'DEFEND_COL') {
      this.defendBtn.textContent = '🧤 LOCK COLUMN (SPACE)';
      this.defendBtn.className = 'btn-action pulse';
    } else if (this.phase === 'DEFEND_ROW') {
      this.defendBtn.textContent = '🧤 DIVE HERE! (SPACE)';
      this.defendBtn.className = 'btn-action btn-primary pulse';
    } else {
      this.defendBtn.textContent = 'DIVING... 🧤';
      this.defendBtn.className = 'btn-action disabled';
    }
  }

  updateCommentary(htmlContent) {
    if (this.commentaryEl) this.commentaryEl.innerHTML = htmlContent;
  }
}

window.controls = new Controls();
