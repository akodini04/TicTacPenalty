/**
 * Renderer - EA FC Pitch, Dead-Center 3x3 Grid Target Mapping & Prominent GK Overlay
 */
class Renderer {
  constructor() {
    this.canvas = document.getElementById('match-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = 800;
    this.height = 480;

    // Goalkeeper State
    this.gkPos = { x: 400, y: 190 };
    this.gkTarget = { x: 400, y: 190 };

    // Ball State
    this.ball = {
      x: 400,
      y: 430,
      radius: 16,
      startX: 400,
      startY: 430,
      targetX: 400,
      targetY: 190,
      progress: 1,
      isKicking: false
    };

    // EA FC Aiming State
    this.aimState = {
      active: false,
      phase: 'AIM',
      aimVal: 50,
      powerVal: 0
    };

    // Defending GK Dive State
    this.defendState = {
      active: false,
      diveVal: 50,
      selectedDir: 'center'
    };

    this.particles = [];

    this.init();
  }

  init() {
    if (!this.canvas) return;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.renderLoop();
  }

  setAimOverlay(active, phase, aimVal, powerVal) {
    this.aimState.active = active;
    this.aimState.phase = phase;
    this.aimState.aimVal = aimVal;
    this.aimState.powerVal = powerVal;
  }

  setDefendOverlay(active, selectedDir = 'center', diveVal = 50) {
    this.defendState.active = active;
    this.defendState.selectedDir = selectedDir;
    this.defendState.diveVal = diveVal;
  }

  getCellCoords(cellIndex) {
    const col = cellIndex % 3;
    const row = Math.floor(cellIndex / 3);

    const cellW = 440 / 3;
    const cellH = 250 / 3;

    const x = 180 + col * cellW + cellW / 2;
    const y = 45 + row * cellH + cellH / 2;

    return { x, y };
  }

  animateShot(targetCellIndex, gkDiveCellIndex, isSaved, onComplete) {
    const targetCoords = this.getCellCoords(targetCellIndex);
    const gkCoords = this.getCellCoords(gkDiveCellIndex);

    this.aimState.active = false;
    this.defendState.active = false;

    this.ball.startX = 400;
    this.ball.startY = 430;
    this.ball.x = 400;
    this.ball.y = 430;
    this.ball.targetX = targetCoords.x;
    this.ball.targetY = targetCoords.y;
    this.ball.progress = 0;
    this.ball.isKicking = true;

    this.gkTarget.x = gkCoords.x;
    this.gkTarget.y = gkCoords.y;

    if (window.soundFX) window.soundFX.playKick();

    const startTime = performance.now();
    const duration = 650;

    const animate = (now) => {
      const elapsed = now - startTime;
      this.ball.progress = Math.min(1, elapsed / duration);

      const t = this.ball.progress;
      this.ball.x = this.ball.startX + (this.ball.targetX - this.ball.startX) * t;
      this.ball.y = this.ball.startY + (this.ball.targetY - this.ball.startY) * t - Math.sin(t * Math.PI) * 45;

      this.gkPos.x += (this.gkTarget.x - this.gkPos.x) * 0.18;
      this.gkPos.y += (this.gkTarget.y - this.gkPos.y) * 0.18;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.ball.isKicking = false;
        this.createSparks(targetCoords.x, targetCoords.y, isSaved ? '#ef4444' : '#22c55e');

        if (isSaved) {
          if (window.soundFX) window.soundFX.playSave();
        } else {
          if (window.soundFX) window.soundFX.playGoal();
        }

        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  resetPositions() {
    this.gkPos = { x: 400, y: 190 };
    this.gkTarget = { x: 400, y: 190 };
    this.ball.x = 400;
    this.ball.y = 430;
    this.ball.progress = 1;
    this.ball.isKicking = false;
    this.aimState.active = false;
    this.defendState.active = false;
  }

  createSparks(x, y, color) {
    for (let i = 0; i < 24; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
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
    for (let i = 0; i < 6; i += 2) {
      this.ctx.fillRect(0, 50 + i * 70, this.width, 70);
    }

    // 2. Penalty Box Lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.moveTo(40, 295);
    this.ctx.lineTo(760, 295);
    this.ctx.stroke();

    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(110, 295);
    this.ctx.lineTo(0, 480);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(690, 295);
    this.ctx.lineTo(800, 480);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.beginPath();
    this.ctx.moveTo(250, 295);
    this.ctx.lineTo(220, 360);
    this.ctx.lineTo(580, 360);
    this.ctx.lineTo(550, 295);
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(400, 430, 7, 0, Math.PI * 2);
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
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;

    for (let x = 180; x <= 620; x += 22) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 45);
      this.ctx.lineTo(x, 295);
      this.ctx.stroke();
    }
    for (let y = 45; y <= 295; y += 22) {
      this.ctx.beginPath();
      this.ctx.moveTo(180, y);
      this.ctx.lineTo(620, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 10;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(180, 295);
    this.ctx.lineTo(180, 45);
    this.ctx.lineTo(620, 45);
    this.ctx.lineTo(620, 295);
    this.ctx.stroke();
  }

  drawEaFcAimingOverlay() {
    const { phase, aimVal, powerVal } = this.aimState;

    // Center X of columns: 253.3 (Left col), 400.0 (Mid col), 546.6 (Right col)
    const aimX = 253.3 + (aimVal / 100) * 293.3;

    // Center Y of rows: 
    // powerVal = 0%   => targetY = 253.3 (DEAD CENTER of Bottom Row 2, cells 7, 8, 9!)
    // powerVal = 50%  => targetY = 170.0 (DEAD CENTER of Mid Row 1, cells 4, 5, 6!)
    // powerVal = 100% => targetY = 86.5  (DEAD CENTER of Top Row 0, cells 1, 2, 3!)
    const targetY = 253.3 - (powerVal / 100) * 166.8;

    // Trajectory Line
    this.ctx.save();
    this.ctx.setLineDash([8, 6]);
    this.ctx.strokeStyle = phase === 'AIM' ? 'rgba(255, 204, 0, 0.85)' : 'rgba(34, 197, 94, 0.95)';
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.moveTo(400, 430);
    this.ctx.lineTo(aimX, targetY);
    this.ctx.stroke();
    this.ctx.restore();

    // Target Crosshair Reticle Ring
    this.ctx.save();
    this.ctx.translate(aimX, targetY);

    let reticleColor = '#22c55e'; // Green (Bottom row)
    if (powerVal > 65) reticleColor = '#ef4444'; // Red (Top row)
    else if (powerVal > 35) reticleColor = '#ffcc00'; // Gold (Mid row)

    this.ctx.strokeStyle = reticleColor;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 22, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = reticleColor;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-30, 0); this.ctx.lineTo(-14, 0);
    this.ctx.moveTo(14, 0);  this.ctx.lineTo(30, 0);
    this.ctx.moveTo(0, -30); this.ctx.lineTo(0, -14);
    this.ctx.moveTo(0, 14);  this.ctx.lineTo(0, 30);
    this.ctx.stroke();

    this.ctx.restore();

    if (window.gameEngine) {
      const activeCellIndex = window.gameEngine.getShotCellIndex(aimVal, powerVal);
      document.querySelectorAll('.tictactoe-grid .cell').forEach((el, idx) => {
        if (idx === activeCellIndex && !el.classList.contains('claimed-player') && !el.classList.contains('claimed-ai')) {
          el.style.borderColor = reticleColor;
          el.style.backgroundColor = 'rgba(255, 204, 0, 0.25)';
        } else {
          el.style.borderColor = '';
          el.style.backgroundColor = '';
        }
      });
    }
  }

  drawDefendDiveOverlay() {
    const { diveVal } = this.defendState;

    const diveX = 253.3 + (diveVal / 100) * 293.3;

    let currentZone = 'center';
    if (diveVal < 35) currentZone = 'left';
    else if (diveVal > 65) currentZone = 'right';

    const zones = [
      { id: 'left', label: '⬅️ DIVE LEFT', x: 250, y: 24 },
      { id: 'center', label: '⬆️ STAY CENTER', x: 400, y: 24 },
      { id: 'right', label: '➡️ DIVE RIGHT', x: 550, y: 24 }
    ];

    zones.forEach(z => {
      const isTargeted = (z.id === currentZone);

      this.ctx.save();
      this.ctx.translate(z.x, z.y);

      this.ctx.fillStyle = isTargeted ? '#ffcc00' : 'rgba(15, 23, 42, 0.85)';
      this.ctx.strokeStyle = isTargeted ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = isTargeted ? 3 : 1;

      this.ctx.beginPath();
      this.ctx.roundRect(-54, -14, 108, 28, 14);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = isTargeted ? '#000000' : '#ffffff';
      this.ctx.font = 'bold 11px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(z.label, 0, 1);

      this.ctx.restore();
    });

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 204, 0, 0.7)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([6, 4]);

    this.ctx.beginPath();
    this.ctx.moveTo(diveX, 45);
    this.ctx.lineTo(diveX, 295);
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(diveX, 310);

    this.ctx.fillStyle = '#ffcc00';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -14);
    this.ctx.lineTo(-12, 10);
    this.ctx.lineTo(12, 10);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawGoalkeeper() {
    const { x, y } = this.gkPos;

    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 45, 25, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffdbac';
    this.ctx.beginPath();
    this.ctx.arc(0, -20, 14, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillRect(-16, -6, 32, 28);

    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(-14, 22, 28, 16);

    this.ctx.fillStyle = '#22c55e';
    this.ctx.beginPath();
    this.ctx.arc(-22, -2, 8, 0, Math.PI * 2);
    this.ctx.arc(22, -2, 8, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawBall() {
    const currentRadius = 18 - (1 - this.ball.progress) * 8;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    this.ctx.beginPath();
    this.ctx.ellipse(this.ball.x, Math.min(450, this.ball.y + currentRadius + 4), currentRadius, currentRadius * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.save();
    this.ctx.translate(this.ball.x, this.ball.y);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius * 0.4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#0f172a';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  updateParticles() {
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;
    });
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
