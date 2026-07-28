/**
 * Renderer - 4x4 Goal Grid, Mid-Air Bézier Curved Shots, Precise Aiming Overlay & Exact-Cell GK Dive
 */
class Renderer {
  constructor() {
    this.canvas = document.getElementById('match-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = 800;
    this.height = 480;

    // Goal frame dimensions (pixels on canvas)
    this.GOAL_LEFT   = 180;
    this.GOAL_RIGHT  = 620;
    this.GOAL_TOP    = 45;
    this.GOAL_BOTTOM = 295;
    this.GOAL_W = 440; // 620 - 180
    this.GOAL_H = 250; // 295 - 45

    // 4x4 cell size
    this.CELL_W = this.GOAL_W / 4; // 110
    this.CELL_H = this.GOAL_H / 4; // 62.5

    // Goalkeeper State
    this.gkPos    = { x: 400, y: 170 };
    this.gkTarget = { x: 400, y: 170 };

    // Ball State
    this.ball = {
      x: 400, y: 440,
      radius: 16,
      startX: 400, startY: 440,
      targetX: 400, targetY: 170,
      cpX: 400, cpY: 250,
      progress: 1,
      isKicking: false
    };

    // Live Mid-Air Curve Offsets (X = horizontal bend, Y = vertical dip/lift)
    this.liveCurveOffset  = 0;
    this.liveCurveYOffset = 0;

    // Aiming overlay
    this.aimState = { active: false, phase: 'AIM', aimVal: 50, powerVal: 0 };

    // Defending overlay
    this.defendState = { active: false, colVal: 50, rowVal: 50, phase: 'COL', lockedCol: -1 };

    this.particles = [];
    this.init();
  }

  init() {
    if (!this.canvas) return;
    this.canvas.width  = this.width;
    this.canvas.height = this.height;
    this.renderLoop();
  }

  setAimOverlay(active, phase, aimVal, powerVal) {
    this.aimState = { active, phase, aimVal, powerVal };
  }

  setDefendOverlay(active, colVal = 50, rowVal = 50, phase = 'COL', lockedCol = -1) {
    this.defendState = { active, colVal, rowVal, phase, lockedCol };
  }

  // Get pixel center of a 4x4 cell
  getCellCoords(cellIndex) {
    const col = cellIndex % 4;
    const row = Math.floor(cellIndex / 4);
    const x = this.GOAL_LEFT + col * this.CELL_W + this.CELL_W / 2;
    const y = this.GOAL_TOP  + row * this.CELL_H + this.CELL_H / 2;
    return { x, y };
  }

  applyMidAirCurve(direction) {
    if (!this.ball.isKicking) return;
    // direction: -1 (left) or +1 (right)
    this.liveCurveOffset = Math.max(-130, Math.min(130, this.liveCurveOffset + direction * 4.5));
    
    // Curve sparks
    if (Math.random() < 0.6) {
      this.particles.push({
        x: this.ball.x,
        y: this.ball.y,
        vx: -direction * (Math.random() * 3 + 2),
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 4 + 2,
        color: '#ffcc00',
        life: 0.6
      });
    }
  }

  applyMidAirVerticalCurve(direction) {
    if (!this.ball.isKicking) return;
    // direction: -1 (dip) or +1 (lift)
    this.liveCurveYOffset = Math.max(-90, Math.min(90, this.liveCurveYOffset + direction * 4.0));
  }

  animateShot(targetCellIndex, gkDiveCellIndex, isSaved, onComplete) {
    const targetCoords = this.getCellCoords(targetCellIndex);
    const gkCoords     = this.getCellCoords(gkDiveCellIndex);

    this.aimState.active    = false;
    this.defendState.active = false;
    this.liveCurveOffset    = 0; // Reset curve offsets at start of shot
    this.liveCurveYOffset   = 0;

    const startX = 400;
    const startY = 440;

    // Initial curve based on initial aimVal
    const aimVal = this.aimState.aimVal;
    const initialBend = (aimVal - 50) * 1.5;
    const baseCpX = (startX + targetCoords.x) / 2 - initialBend;
    const baseCpY = (startY + targetCoords.y) / 2 - 90;

    this.ball.startX    = startX;
    this.ball.startY    = startY;
    this.ball.targetX   = targetCoords.x;
    this.ball.targetY   = targetCoords.y;
    this.ball.progress  = 0;
    this.ball.isKicking = true;

    this.gkTarget.x = gkCoords.x;
    this.gkTarget.y = gkCoords.y;

    if (window.soundFX) window.soundFX.playKick();

    const startTime = performance.now();
    const duration  = 1200; // Slower shot flight to allow mid-air curving!

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      this.ball.progress = t;

      // Continuous polling for held Arrow keys during mid-air flight
      if (window.controls) {
        if (window.controls.isKeyPressed('ArrowLeft') || window.controls.isKeyPressed('KeyA')) {
          this.applyMidAirCurve(-1);
        }
        if (window.controls.isKeyPressed('ArrowRight') || window.controls.isKeyPressed('KeyD')) {
          this.applyMidAirCurve(1);
        }
        if (window.controls.isKeyPressed('ArrowUp') || window.controls.isKeyPressed('KeyW')) {
          this.applyMidAirVerticalCurve(-1);
        }
        if (window.controls.isKeyPressed('ArrowDown') || window.controls.isKeyPressed('KeyS')) {
          this.applyMidAirVerticalCurve(1);
        }
      }

      // Quadratic Bézier with dynamic live curve offsets
      const cpX = baseCpX + this.liveCurveOffset * 1.5;
      const cpY = baseCpY + this.liveCurveYOffset * 1.2;
      const finalTargetX = targetCoords.x + this.liveCurveOffset * 0.45;
      const finalTargetY = targetCoords.y + this.liveCurveYOffset * 0.35;

      const mt = 1 - t;
      this.ball.x = mt * mt * startX + 2 * t * mt * cpX + t * t * finalTargetX;
      this.ball.y = mt * mt * startY + 2 * t * mt * cpY + t * t * finalTargetY;

      // GK dives smoothly
      this.gkPos.x += (this.gkTarget.x - this.gkPos.x) * 0.10;
      this.gkPos.y += (this.gkTarget.y - this.gkPos.y) * 0.10;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.ball.isKicking = false;
        this.createSparks(targetCoords.x, targetCoords.y, isSaved ? '#ef4444' : '#22c55e');
        if (isSaved) { if (window.soundFX) window.soundFX.playSave(); }
        else         { if (window.soundFX) window.soundFX.playGoal(); }
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  resetPositions() {
    this.gkPos    = { x: 400, y: 170 };
    this.gkTarget = { x: 400, y: 170 };
    this.ball.x = 400; this.ball.y = 440;
    this.ball.progress = 1;
    this.ball.isKicking = false;
    this.liveCurveOffset  = 0;
    this.liveCurveYOffset = 0;
    this.aimState.active    = false;
    this.defendState.active = false;
  }

  createSparks(x, y, color) {
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 9,
        radius: Math.random() * 5 + 2,
        color,
        life: 1.0
      });
    }
  }

  renderLoop() {
    if (!this.ctx) return;
    this.drawScene();
    this.updateParticles();
    requestAnimationFrame(() => this.renderLoop());
  }

  drawScene() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Grass Field
    const grassGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grassGrad.addColorStop(0, '#0a2a14');
    grassGrad.addColorStop(0.5, '#124823');
    grassGrad.addColorStop(1, '#092311');
    this.ctx.fillStyle = grassGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Mown grass stripes
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 6; i += 2) this.ctx.fillRect(0, 50 + i * 70, this.width, 70);

    // 2. Penalty Box Lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(40, this.GOAL_BOTTOM);
    this.ctx.lineTo(760, this.GOAL_BOTTOM);
    this.ctx.stroke();

    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(110, this.GOAL_BOTTOM);
    this.ctx.lineTo(0, this.height);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(690, this.GOAL_BOTTOM);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.beginPath();
    this.ctx.moveTo(250, this.GOAL_BOTTOM);
    this.ctx.lineTo(220, 360);
    this.ctx.lineTo(580, 360);
    this.ctx.lineTo(550, this.GOAL_BOTTOM);
    this.ctx.stroke();

    // Penalty spot
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(400, 440, 7, 0, Math.PI * 2);
    this.ctx.fill();

    // 3. Goal Net & Frame
    this.drawGoalFrame();

    // 4. Shooting Aim Overlay
    if (this.aimState.active && !this.ball.isKicking) {
      this.drawEaFcAimingOverlay();
    }

    // 5. Goalkeeper
    this.drawGoalkeeper();

    // 6. Defending GK Dive Overlay
    if (this.defendState.active && !this.ball.isKicking) {
      this.drawDefendDiveOverlay();
    }

    // 7. Ball
    this.drawBall();

    // 8. Particles
    this.drawParticles();
  }

  drawGoalFrame() {
    const { GOAL_LEFT: GL, GOAL_RIGHT: GR, GOAL_TOP: GT, GOAL_BOTTOM: GB } = this;

    // Net background
    this.ctx.fillStyle = 'rgba(0,0,0,0.18)';
    this.ctx.fillRect(GL, GT, this.GOAL_W, this.GOAL_H);

    // Net mesh
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    this.ctx.lineWidth = 1;
    for (let x = GL; x <= GR; x += 18) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, GT);
      this.ctx.lineTo(x, GB);
      this.ctx.stroke();
    }
    for (let y = GT; y <= GB; y += 18) {
      this.ctx.beginPath();
      this.ctx.moveTo(GL, y);
      this.ctx.lineTo(GR, y);
      this.ctx.stroke();
    }

    // 4x4 grid dividers
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
    this.ctx.lineWidth = 1.5;
    for (let c = 1; c < 4; c++) {
      const x = GL + c * this.CELL_W;
      this.ctx.beginPath();
      this.ctx.moveTo(x, GT);
      this.ctx.lineTo(x, GB);
      this.ctx.stroke();
    }
    for (let r = 1; r < 4; r++) {
      const y = GT + r * this.CELL_H;
      this.ctx.beginPath();
      this.ctx.moveTo(GL, y);
      this.ctx.lineTo(GR, y);
      this.ctx.stroke();
    }

    // Goal posts & crossbar
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 10;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(GL, GB);
    this.ctx.lineTo(GL, GT);
    this.ctx.lineTo(GR, GT);
    this.ctx.lineTo(GR, GB);
    this.ctx.stroke();
  }

  drawEaFcAimingOverlay() {
    const { phase, aimVal, powerVal } = this.aimState;
    const { GOAL_LEFT: GL, GOAL_TOP: GT, GOAL_BOTTOM: GB, GOAL_W, GOAL_H, CELL_W, CELL_H } = this;

    // Calculate exact cell column and row from aimVal (0-100) and powerVal (0-100)
    let col = Math.floor((aimVal / 100) * 4);
    if (col > 3) col = 3; if (col < 0) col = 0;

    let row = 3 - Math.floor((powerVal / 100) * 4);
    if (row > 3) row = 3; if (row < 0) row = 0;

    // Continuous aiming coordinates for reticle circle
    const contX = GL + (aimVal / 100) * (GOAL_W - CELL_W) + CELL_W / 2;
    const contY = GB - (powerVal / 100) * (GOAL_H - CELL_H) - CELL_H / 2;

    // Trajectory dashed line directly to reticle circle center
    this.ctx.save();
    this.ctx.setLineDash([8, 6]);
    this.ctx.strokeStyle = phase === 'AIM'
      ? 'rgba(255, 204, 0, 0.85)'
      : 'rgba(34, 197, 94, 0.95)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(400, 440);
    this.ctx.lineTo(contX, contY);
    this.ctx.stroke();
    this.ctx.restore();

    let reticleColor = '#22c55e'; // Green (bottom row)
    if (row === 0) reticleColor = '#ef4444'; // Red (top row)
    else if (row === 1) reticleColor = '#ff8c00'; // Orange
    else if (row === 2) reticleColor = '#ffcc00'; // Gold

    // Target cell highlight (subtle glow fill inside target cell, NO outer rectangle)
    const cellX = GL + col * CELL_W;
    const cellY = GT + row * CELL_H;
    this.ctx.save();
    this.ctx.fillStyle = `${reticleColor}33`;
    this.ctx.beginPath();
    this.ctx.rect(cellX, cellY, CELL_W, CELL_H);
    this.ctx.fill();
    this.ctx.restore();

    // Crosshair reticle (centered directly at contX, contY)
    this.ctx.save();
    this.ctx.translate(contX, contY);
    this.ctx.strokeStyle = reticleColor;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 18, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = reticleColor;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-25, 0); this.ctx.lineTo(-10, 0);
    this.ctx.moveTo(10, 0);  this.ctx.lineTo(25, 0);
    this.ctx.moveTo(0, -25); this.ctx.lineTo(0, -10);
    this.ctx.moveTo(0, 10);  this.ctx.lineTo(0, 25);
    this.ctx.stroke();
    this.ctx.restore();

    // Highlight target cell in DOM grid
    if (window.gameEngine) {
      const activeCellIndex = row * 4 + col;
      document.querySelectorAll('.tictactoe-grid .cell').forEach((el, idx) => {
        if (idx === activeCellIndex && !el.classList.contains('claimed-player') && !el.classList.contains('claimed-ai')) {
          el.style.borderColor = reticleColor;
          el.style.backgroundColor = `${reticleColor}25`;
        } else {
          el.style.borderColor = '';
          el.style.backgroundColor = '';
        }
      });
    }
  }

  drawDefendDiveOverlay() {
    const { colVal, rowVal, phase, lockedCol } = this.defendState;
    const { GOAL_LEFT: GL, GOAL_TOP: GT, GOAL_BOTTOM: GB, GOAL_W, GOAL_H, CELL_W, CELL_H } = this;

    let col = Math.floor((colVal / 100) * 4);
    if (col > 3) col = 3; if (col < 0) col = 0;

    let row = 3 - Math.floor((rowVal / 100) * 4);
    if (row > 3) row = 3; if (row < 0) row = 0;

    const activeCol = (phase === 'ROW') ? lockedCol : col;
    const activeRow = (phase === 'COL') ? -1 : row;

    // PHASE LABEL at top
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
    this.ctx.beginPath();
    this.ctx.roundRect(250, 4, 300, 32, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.font = 'bold 13px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      phase === 'COL' ? '🧤 STEP 1: PICK COLUMN TO GUARD' : '🧤 STEP 2: PICK ROW TO GUARD',
      400, 20
    );
    this.ctx.restore();

    // Highlight active column beam
    if (activeCol >= 0) {
      const cx = GL + activeCol * CELL_W;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
      this.ctx.strokeStyle = '#ffcc00';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.rect(cx, GT, CELL_W, GOAL_H);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Highlight active row beam
    if (phase === 'ROW' && activeRow >= 0) {
      const ry = GT + activeRow * CELL_H;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
      this.ctx.strokeStyle = '#ffcc00';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.rect(GL, ry, GOAL_W, CELL_H);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Highlight exact targeted cell
    if (phase === 'ROW' && activeCol >= 0 && activeRow >= 0) {
      const cx = GL + activeCol * CELL_W;
      const ry = GT + activeRow * CELL_H;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 204, 0, 0.40)';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.rect(cx, ry, CELL_W, CELL_H);
      this.ctx.fill();
      this.ctx.stroke();

      // Glove icon
      this.ctx.font = '22px serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🧤', cx + CELL_W / 2, ry + CELL_H / 2);
      this.ctx.restore();
    }

    // Indicator Arrow
    const isColPhase = phase === 'COL';
    const arrowX = isColPhase ? (GL + (colVal / 100) * (GOAL_W - CELL_W) + CELL_W / 2) : (GL + (lockedCol + 0.5) * CELL_W);
    const arrowY = isColPhase ? (GB + 14) : (GB - (rowVal / 100) * (GOAL_H - CELL_H) - CELL_H / 2);

    this.ctx.save();
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;

    if (isColPhase) {
      this.ctx.translate(arrowX, arrowY);
      this.ctx.beginPath();
      this.ctx.moveTo(0, -12); this.ctx.lineTo(-10, 8); this.ctx.lineTo(10, 8);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      this.ctx.translate(GL - 14, arrowY);
      this.ctx.beginPath();
      this.ctx.moveTo(12, 0); this.ctx.lineTo(-8, -10); this.ctx.lineTo(-8, 10);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }
    this.ctx.restore();

    // DOM cell highlight sync
    if (phase === 'ROW' && activeCol >= 0 && activeRow >= 0) {
      const exactCell = activeRow * 4 + activeCol;
      document.querySelectorAll('.tictactoe-grid .cell').forEach((el, idx) => {
        if (idx === exactCell && !el.classList.contains('claimed-player') && !el.classList.contains('claimed-ai')) {
          el.style.borderColor = '#ffcc00';
          el.style.backgroundColor = 'rgba(255, 204, 0, 0.30)';
        } else {
          el.style.borderColor = '';
          el.style.backgroundColor = '';
        }
      });
    } else if (phase === 'COL') {
      document.querySelectorAll('.tictactoe-grid .cell').forEach((el, idx) => {
        const cellCol = idx % 4;
        if (cellCol === col && !el.classList.contains('claimed-player') && !el.classList.contains('claimed-ai')) {
          el.style.borderColor = '#ffcc009a';
          el.style.backgroundColor = 'rgba(255, 204, 0, 0.12)';
        } else {
          el.style.borderColor = '';
          el.style.backgroundColor = '';
        }
      });
    }
  }

  drawGoalkeeper() {
    const { x, y } = this.gkPos;

    this.ctx.save();
    this.ctx.translate(x, y);

    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 42, 22, 7, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.fillStyle = '#ffdbac';
    this.ctx.beginPath();
    this.ctx.arc(0, -18, 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Body (jersey)
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillRect(-14, -6, 28, 25);

    // Shorts
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(-12, 19, 24, 14);

    // Gloves
    this.ctx.fillStyle = '#22c55e';
    this.ctx.beginPath();
    this.ctx.arc(-19, -1, 7, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(19, -1, 7, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawBall() {
    const currentRadius = 18 - (1 - this.ball.progress) * 6;

    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    this.ctx.beginPath();
    this.ctx.ellipse(this.ball.x, Math.min(455, this.ball.y + currentRadius + 4),
      currentRadius, currentRadius * 0.35, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Ball
    this.ctx.save();
    this.ctx.translate(this.ball.x, this.ball.y);

    // Mid-air spin aura if actively curved horizontally or vertically
    if (this.ball.isKicking && (Math.abs(this.liveCurveOffset) > 10 || Math.abs(this.liveCurveYOffset) > 10)) {
      this.ctx.strokeStyle = '#ffcc00';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, currentRadius + 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius * 0.38, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#0f172a';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  updateParticles() {
    this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }
}

window.renderer = new Renderer();
