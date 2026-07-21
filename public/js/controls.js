/**
 * Controls - EA FC Aiming & Oscillating Goalkeeper Dive Button Mechanism
 */
class Controls {
  constructor() {
    this.phase = 'AIM'; // 'AIM', 'POWER', 'SHOT_LOCKED', 'DEFEND'
    this.aimVal = 50;
    this.powerVal = 0; // Start at 0 for bottom row
    
    this.aimDir = 1;
    this.powerDir = 1;

    this.aimSpeed = 2.2;
    this.powerSpeed = 3.2;

    this.defendAimVal = 50;
    this.defendAimDir = 1;
    this.defendAimSpeed = 2.4;

    this.selectedDiveDir = 'center';

    this.animFrameId = null;
    this.onKickCallback = null;
    this.onDiveCallback = null;

    this.aimPointerEl = document.getElementById('aim-pointer');
    this.powerBarEl = document.getElementById('power-bar');
    this.defendPointerEl = document.getElementById('defend-pointer');
    this.kickBtn = document.getElementById('btn-kick');
    this.defendBtn = document.getElementById('btn-defend');
    this.commentaryEl = document.getElementById('commentary-box');

    this.initEventListeners();
  }

  initEventListeners() {
    if (this.kickBtn) {
      this.kickBtn.addEventListener('click', () => this.handleActionTrigger());
    }

    if (this.defendBtn) {
      this.defendBtn.addEventListener('click', () => this.handleDefendActionTrigger());
    }

    window.addEventListener('keydown', (e) => {
      if (this.phase === 'AIM' || this.phase === 'POWER') {
        if (e.code === 'Space' && !e.repeat) {
          e.preventDefault();
          this.handleActionTrigger();
        }
      } else if (this.phase === 'DEFEND') {
        if (e.code === 'Space' && !e.repeat) {
          e.preventDefault();
          this.handleDefendActionTrigger();
        }
      }
    });
  }

  handleDefendActionTrigger() {
    if (this.phase !== 'DEFEND') return;

    let dir = 'center';
    if (this.defendAimVal < 35) dir = 'left';
    else if (this.defendAimVal > 65) dir = 'right';

    this.triggerDive(dir);
  }

  triggerDive(diveDir) {
    if (this.phase !== 'DEFEND') return;
    this.selectedDiveDir = diveDir;
    this.phase = 'SHOT_LOCKED';

    this.stopLoop();

    if (window.renderer) window.renderer.setDefendOverlay(false);
    if (window.soundFX) window.soundFX.playClick();

    if (this.onDiveCallback) {
      this.onDiveCallback(diveDir);
    }
  }

  startShootingControls(onKick) {
    this.onKickCallback = onKick;
    this.phase = 'AIM';
    this.aimVal = 50;
    this.powerVal = 0; // Explicitly reset power to 0 (bottom row)
    this.aimDir = 1;
    this.powerDir = 1;

    if (window.renderer) window.renderer.setDefendOverlay(false);

    document.getElementById('shoot-controls').classList.remove('hidden');
    document.getElementById('defend-controls').classList.add('hidden');

    this.updateButtonText();
    this.updateCommentary('🎯 <strong>STEP 1: LOCK DIRECTION</strong> (Watch arrow on pitch, press SPACEBAR/TAP)');

    this.stopLoop();
    this.loop();
  }

  startDefendingControls(onDive) {
    this.onDiveCallback = onDive;
    this.phase = 'DEFEND';
    this.defendAimVal = 50;
    this.defendAimDir = 1;
    this.selectedDiveDir = 'center';

    document.getElementById('shoot-controls').classList.add('hidden');
    document.getElementById('defend-controls').classList.remove('hidden');

    this.updateCommentary('GLOVE <strong>LOCK DIVING DIRECTION!</strong> (Watch glove arrow on pitch, press SPACEBAR/TAP button)');

    this.stopLoop();
    this.loop();
  }

  handleActionTrigger() {
    if (window.soundFX) window.soundFX.playClick();

    if (this.phase === 'AIM') {
      this.phase = 'POWER';
      this.powerVal = 0; // RESET POWER TO 0 (Bottom of Row 2) when locking direction!
      this.powerDir = 1;
      this.updateButtonText();
      this.updateCommentary('⚡ <strong>STEP 2: LOCK ELEVATION & POWER</strong> (Press SPACEBAR/TAP to shoot!)');
    } else if (this.phase === 'POWER') {
      this.phase = 'SHOT_LOCKED';
      this.stopLoop();
      this.updateButtonText();
      if (window.renderer) window.renderer.setAimOverlay(false);
      if (this.onKickCallback) {
        this.onKickCallback({ aimVal: this.aimVal, powerVal: this.powerVal });
      }
    }
  }

  loop() {
    if (this.phase === 'AIM') {
      this.aimVal += this.aimDir * this.aimSpeed;
      if (this.aimVal >= 100) {
        this.aimVal = 100;
        this.aimDir = -1;
      } else if (this.aimVal <= 0) {
        this.aimVal = 0;
        this.aimDir = 1;
      }
      if (this.aimPointerEl) {
        this.aimPointerEl.style.left = `${this.aimVal}%`;
      }
      if (window.renderer) {
        window.renderer.setAimOverlay(true, this.phase, this.aimVal, 0); // Keep reticle at power=0 (bottom) during direction phase!
      }
    } else if (this.phase === 'POWER') {
      this.powerVal += this.powerDir * this.powerSpeed;
      if (this.powerVal >= 100) {
        this.powerVal = 100;
        this.powerDir = -1;
      } else if (this.powerVal <= 0) {
        this.powerVal = 0;
        this.powerDir = 1;
      }
      if (this.powerBarEl) {
        this.powerBarEl.style.height = `${this.powerVal}%`;
      }
      if (window.renderer) {
        window.renderer.setAimOverlay(true, this.phase, this.aimVal, this.powerVal);
      }
    } else if (this.phase === 'DEFEND') {
      this.defendAimVal += this.defendAimDir * this.defendAimSpeed;
      if (this.defendAimVal >= 100) {
        this.defendAimVal = 100;
        this.defendAimDir = -1;
      } else if (this.defendAimVal <= 0) {
        this.defendAimVal = 0;
        this.defendAimDir = 1;
      }

      if (this.defendPointerEl) {
        this.defendPointerEl.style.left = `${this.defendAimVal}%`;
      }

      let currentZone = 'center';
      if (this.defendAimVal < 35) currentZone = 'left';
      else if (this.defendAimVal > 65) currentZone = 'right';

      if (window.renderer) {
        window.renderer.setDefendOverlay(true, currentZone, this.defendAimVal);
      }
    }

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  updateButtonText() {
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

  updateCommentary(htmlContent) {
    if (this.commentaryEl) {
      this.commentaryEl.innerHTML = htmlContent;
    }
  }
}

window.controls = new Controls();
