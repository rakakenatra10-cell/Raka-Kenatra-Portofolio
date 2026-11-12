/**
 * Raka Dino Runner - Mini Game (TKJ Server Edition)
 * Dino jump game featuring Raka's face avatar jumping over stacked server racks.
 * Includes animated severed network cable (kabel terputus) with electric sparks and Game Over sequence.
 * Supports dynamic photo update from profile section & Web Audio sound effects.
 */

class RakaDinoGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Canvas sizing
    this.width = 800;
    this.height = 300;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Ground settings
    this.groundY = 245;

    // Player (Raka)
    this.player = {
      x: 70,
      y: this.groundY - 52,
      baseY: this.groundY - 52,
      width: 52,
      height: 52,
      vy: 0,
      jumpForce: -13.5,
      gravity: 0.65,
      isGrounded: true,
      rotation: 0,
      runCycle: 0
    };

    // Game state
    this.isRunning = false;
    this.isGameOver = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('raka_dino_highscore') || '0', 10);
    this.baseSpeed = 6;
    this.currentSpeed = this.baseSpeed;
    this.lastTime = 0;
    this.distance = 0;

    // Cable Snap & Death Animation state
    this.deathFrame = 0;
    this.severedCable = null;
    this.electricSparks = [];
    this.deathAnimId = null;

    // Obstacles & scenery
    this.obstacles = [];
    this.clouds = [
      { x: 150, y: 50, speed: 0.8, scale: 0.9 },
      { x: 420, y: 70, speed: 0.6, scale: 0.7 },
      { x: 700, y: 40, speed: 1.0, scale: 1.1 }
    ];
    this.particles = [];
    this.groundDashOffset = 0;

    // Sound effects via Web Audio API
    this.audioCtx = null;
    this.soundEnabled = true;

    // Player Face Image
    this.playerImg = new Image();
    this.playerImg.src = 'assets/images/profile.jpg';
    this.playerImgLoaded = false;
    this.playerImg.onload = () => {
      this.playerImgLoaded = true;
      if (!this.isRunning && !this.isGameOver) {
        this.drawInitialScreen();
      }
    };

    // UI elements
    this.scoreEl = document.getElementById('gameScore');
    this.highScoreEl = document.getElementById('gameHighScore');
    this.updateHighScoreDisplay();

    // Bind event listeners
    this.initControls();
    
    // Initial render
    this.drawInitialScreen();
  }

  // Update avatar image if user uploads a new photo
  updateAvatar(imgSrc) {
    const newImg = new Image();
    newImg.src = imgSrc;
    newImg.onload = () => {
      this.playerImg = newImg;
      this.playerImgLoaded = true;
      if (!this.isRunning && !this.isGameOver) {
        this.drawInitialScreen();
      }
    };
  }

  // Set theme ('dark' or 'light')
  setTheme(theme) {
    this.theme = theme;
    if (!this.isRunning) {
      if (this.isGameOver) {
        this.draw();
        this.drawSeveredCableAnimation();
        this.drawGameOverBanner();
      } else {
        this.drawInitialScreen();
      }
    }
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSound(type) {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (type === 'score') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (type === 'gameover') {
        // Dramatic low descending power failure
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.45);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.46);
      } else if (type === 'spark') {
        // Electric cable short circuit zap / crackle
        const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.18);
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
        }
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.18);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        noise.connect(filter);
        filter.connect(gain);
        noise.start(now);
      }
    } catch (e) {
      // Audio fallback silent
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    const btn = document.getElementById('soundToggleBtn');
    if (btn) {
      btn.innerHTML = this.soundEnabled ? '🔊 Suara: ON' : '🔇 Suara: OFF';
    }
  }

  initControls() {
    // Keyboard listener
    window.addEventListener('keydown', (e) => {
      // 1. Abaikan tombol jika pengguna sedang mengetik pesan di formulir atau input teks
      const targetTag = e.target ? e.target.tagName : '';
      if (
        targetTag === 'INPUT' ||
        targetTag === 'TEXTAREA' ||
        (e.target && e.target.isContentEditable)
      ) {
        return; // Biarkan pengguna bebas mengetik spasi di pesan!
      }

      // 2. Hanya jalankan kontrol game jika tombol Spasi / Panah Atas ditekan
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
        const rect = this.canvas.getBoundingClientRect();
        // Cek apakah game canvas sedang berada di viewport layar
        const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;

        // Jika kanvas sedang tidak terlihat di layar, abaikan agar game tidak jalan diam-diam
        if (!isInViewport) {
          return;
        }

        e.preventDefault();
        this.handleAction();
      }
    });

    // Canvas click / touch
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.handleAction();
    });

    // Mobile on-screen button
    const mobileBtn = document.getElementById('mobileJumpBtn');
    if (mobileBtn) {
      mobileBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handleAction();
      });
    }

    // Sound toggle button
    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => this.toggleSound());
    }

    // Reset highscore button
    const resetScoreBtn = document.getElementById('resetScoreBtn');
    if (resetScoreBtn) {
      resetScoreBtn.addEventListener('click', () => {
        localStorage.removeItem('raka_dino_highscore');
        this.highScore = 0;
        this.updateHighScoreDisplay();
      });
    }
  }

  handleAction() {
    this.initAudio();

    if (!this.isRunning && !this.isGameOver) {
      this.start();
      this.jump();
      return;
    }

    if (this.isGameOver) {
      this.restart();
      return;
    }

    this.jump();
  }

  jump() {
    if (this.player.isGrounded) {
      this.player.vy = this.player.jumpForce;
      this.player.isGrounded = false;
      this.playSound('jump');
      this.createJumpParticles();
    }
  }

  start() {
    if (this.deathAnimId) {
      cancelAnimationFrame(this.deathAnimId);
      this.deathAnimId = null;
    }

    this.isRunning = true;
    this.isGameOver = false;
    this.score = 0;
    this.distance = 0;
    this.currentSpeed = this.baseSpeed;
    this.obstacles = [];
    this.particles = [];
    this.electricSparks = [];
    this.severedCable = null;
    this.deathFrame = 0;
    this.player.y = this.player.baseY;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.lastTime = performance.now();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  restart() {
    this.start();
  }

  triggerGameOver(hitObstacle) {
    this.isRunning = false;
    this.isGameOver = true;
    this.playSound('spark');
    this.playSound('gameover');

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('raka_dino_highscore', this.highScore.toString());
      this.updateHighScoreDisplay();
    }

    // Setup severed cable animation coordinates
    const playerMidX = this.player.x + this.player.width;
    const playerMidY = this.player.y + this.player.height * 0.55;
    const obsX = hitObstacle ? hitObstacle.x : playerMidX + 25;
    const obsY = hitObstacle ? hitObstacle.y + hitObstacle.height * 0.4 : playerMidY;

    const snapX = (playerMidX + obsX) / 2;
    const snapY = (playerMidY + obsY) / 2;

    this.severedCable = {
      startX: this.player.x + 10,
      startY: playerMidY,
      endX: obsX + 15,
      endY: obsY,
      snapX: snapX,
      snapY: snapY,
      leftCurX: snapX,
      leftCurY: snapY,
      rightCurX: snapX,
      rightCurY: snapY,
      separation: 0
    };

    // Burst initial electrical sparks
    this.createElectricalBurst(snapX, snapY, 35);

    // Start animated death & game over loop
    this.deathFrame = 0;
    this.runDeathAnimationLoop();
  }

  createElectricalBurst(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6.5;
      const colors = ['#38bdf8', '#67e8f9', '#fef08a', '#fbbf24', '#ffffff'];
      this.electricSparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 25 + Math.random() * 30
      });
    }
  }

  updateHighScoreDisplay() {
    if (this.highScoreEl) {
      this.highScoreEl.innerText = this.highScore.toString().padStart(5, '0');
    }
  }

  updateScoreDisplay() {
    if (this.scoreEl) {
      this.scoreEl.innerText = Math.floor(this.score).toString().padStart(5, '0');
    }
  }

  createJumpParticles() {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.player.x + 15 + Math.random() * 20,
        y: this.groundY,
        vx: (Math.random() - 0.7) * 3,
        vy: -Math.random() * 2,
        radius: 2 + Math.random() * 3,
        alpha: 0.8
      });
    }
  }

  /**
   * Spawn Stacked Server Racks (Rak Server Tersusun)
   * Types:
   * 1. rack_2tier: 2-tier stacked rack (Height: 44, Width: 34)
   * 2. rack_3tier: 3-tier stacked rack tower (Height: 58, Width: 36)
   * 3. rack_4tier_tall: 4-tier high density stacked rack (Height: 68, Width: 38)
   * 4. rack_cluster: Dual stacked racks side-by-side with patch cords (Height: 48, Width: 52)
   */
  spawnObstacle() {
    const minGap = 250 + this.currentSpeed * 10;
    const lastObstacle = this.obstacles[this.obstacles.length - 1];

    if (!lastObstacle || (this.width - lastObstacle.x) > minGap) {
      if (Math.random() < 0.055) {
        const types = ['rack_2tier', 'rack_3tier', 'rack_4tier_tall', 'rack_cluster'];
        const chosenType = types[Math.floor(Math.random() * types.length)];

        let w = 34;
        let h = 44;
        if (chosenType === 'rack_3tier') {
          w = 36;
          h = 58;
        } else if (chosenType === 'rack_4tier_tall') {
          w = 38;
          h = 68;
        } else if (chosenType === 'rack_cluster') {
          w = 52;
          h = 48;
        }

        this.obstacles.push({
          x: this.width + 20,
          y: this.groundY - h,
          width: w,
          height: h,
          type: chosenType,
          seed: Math.random()
        });
      }
    }
  }

  update(deltaTime) {
    this.distance += this.currentSpeed;
    this.score = Math.floor(this.distance / 8);
    this.updateScoreDisplay();

    // Check milestone sounds (every 100 points)
    if (this.score > 0 && this.score % 100 === 0 && Math.floor(this.distance) % 8 === 0) {
      this.playSound('score');
    }

    // Accelerate smoothly
    this.currentSpeed = Math.min(14, this.baseSpeed + (this.score / 250));

    // Player physics
    this.player.vy += this.player.gravity;
    this.player.y += this.player.vy;

    if (this.player.y >= this.player.baseY) {
      this.player.y = this.player.baseY;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.rotation = 0;
    } else {
      this.player.rotation = Math.sin(this.distance * 0.05) * 0.08;
    }

    if (this.player.isGrounded) {
      this.player.runCycle += 0.25;
    }

    // Ground scroll
    this.groundDashOffset = (this.groundDashOffset + this.currentSpeed) % 40;

    // Clouds
    this.clouds.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x < -100) {
        cloud.x = this.width + 50;
        cloud.y = 30 + Math.random() * 60;
      }
    });

    // Spawn & update obstacles
    this.spawnObstacle();

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.currentSpeed;

      // Circle vs Box collision
      const playerCircle = {
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        r: this.player.width * 0.42
      };

      const closestX = Math.max(obs.x, Math.min(playerCircle.x, obs.x + obs.width));
      const closestY = Math.max(obs.y, Math.min(playerCircle.y, obs.y + obs.height));
      const distanceX = playerCircle.x - closestX;
      const distanceY = playerCircle.y - closestY;
      const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

      if (distanceSquared < (playerCircle.r * playerCircle.r)) {
        this.triggerGameOver(obs);
        return;
      }

      // Remove offscreen
      if (obs.x + obs.width < -30) {
        this.obstacles.splice(i, 1);
      }
    }

    // Dust particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const isLight = this.theme === 'light';
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    if (isLight) {
      bgGrad.addColorStop(0, '#f0f9ff');
      bgGrad.addColorStop(0.7, '#f8fafc');
      bgGrad.addColorStop(1, '#e2e8f0');
    } else {
      bgGrad.addColorStop(0, '#060a14');
      bgGrad.addColorStop(0.6, '#0b1326');
      bgGrad.addColorStop(1, '#080d1a');
    }
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Scenery
    this.drawClouds();
    this.drawGround();
    this.drawParticles();

    // Stacked Server Racks Obstacles
    this.obstacles.forEach(obs => this.drawStackedServerRack(obs));

    // Player (Raka's Face)
    this.drawPlayer();
  }

  drawClouds() {
    const isLight = this.theme === 'light';
    this.ctx.fillStyle = isLight ? 'rgba(186, 230, 253, 0.55)' : 'rgba(56, 189, 248, 0.1)';
    this.clouds.forEach(c => {
      this.ctx.beginPath();
      const r = 18 * c.scale;
      this.ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      this.ctx.arc(c.x + 18 * c.scale, c.y - 8 * c.scale, 22 * c.scale, 0, Math.PI * 2);
      this.ctx.arc(c.x + 38 * c.scale, c.y, 16 * c.scale, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawGround() {
    const isLight = this.theme === 'light';
    if (isLight) {
      this.ctx.strokeStyle = '#2563eb';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.groundY);
      this.ctx.lineTo(this.width, this.groundY);
      this.ctx.stroke();

      this.ctx.strokeStyle = '#94a3b8';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let x = -this.groundDashOffset; x < this.width; x += 40) {
        this.ctx.moveTo(x, this.groundY + 8);
        this.ctx.lineTo(x + 16, this.groundY + 8);

        this.ctx.moveTo(x + 22, this.groundY + 16);
        this.ctx.lineTo(x + 30, this.groundY + 16);
      }
      this.ctx.stroke();
    } else {
      // Glowing cyan optical ground bus
      this.ctx.strokeStyle = '#00f2fe';
      this.ctx.shadowColor = 'rgba(0, 242, 254, 0.6)';
      this.ctx.shadowBlur = 8;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.groundY);
      this.ctx.lineTo(this.width, this.groundY);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0; // reset

      // High-tech network dashed bus
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let x = -this.groundDashOffset; x < this.width; x += 40) {
        this.ctx.moveTo(x, this.groundY + 8);
        this.ctx.lineTo(x + 16, this.groundY + 8);

        this.ctx.moveTo(x + 22, this.groundY + 16);
        this.ctx.lineTo(x + 30, this.groundY + 16);
      }
      this.ctx.stroke();
    }
  }

  drawPlayer() {
    this.ctx.save();
    const cx = this.player.x + this.player.width / 2;
    const cy = this.player.y + this.player.height / 2;

    this.ctx.translate(cx, cy);
    this.ctx.rotate(this.player.rotation);

    const radius = this.player.width / 2;
    const bounceY = this.player.isGrounded ? Math.sin(this.player.runCycle) * 2.5 : 0;

    // Outer glow / border ring
    this.ctx.beginPath();
    this.ctx.arc(0, bounceY, radius + 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#0284c7';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(0, bounceY, radius + 1, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();

    // Clip circular face
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(0, bounceY, radius, 0, Math.PI * 2);
    this.ctx.clip();

    if (this.playerImgLoaded && this.playerImg.complete && this.playerImg.naturalWidth !== 0) {
      const nw = this.playerImg.naturalWidth;
      const nh = this.playerImg.naturalHeight;
      const faceSize = Math.min(nw, nh * 0.6);
      const sx = (nw - faceSize) / 2;
      const sy = nh * 0.08;

      this.ctx.drawImage(
        this.playerImg,
        sx, sy, faceSize, faceSize,
        -radius, -radius + bounceY, radius * 2, radius * 2
      );
    } else {
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.fillRect(-radius, -radius + bounceY, radius * 2, radius * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 16px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('RAKA', 0, bounceY);
    }
    this.ctx.restore();

    // Little running feet
    if (this.player.isGrounded) {
      const legOffset = Math.sin(this.player.runCycle) * 4;
      this.ctx.fillStyle = '#1e3a8a';
      this.ctx.fillRect(-12, radius + bounceY - 1, 6, 7 + legOffset);
      this.ctx.fillRect(6, radius + bounceY - 1, 6, 7 - legOffset);
    }

    this.ctx.restore();
  }

  /**
   * Renders Stacked Server Racks (Rak Server Tersusun)
   * Distinct enterprise server blades stacked vertically with mounting rails,
   * flashing status LEDs, ventilation slits, and front patch cables.
   */
  drawStackedServerRack(obs) {
    this.ctx.save();
    const x = obs.x;
    const y = obs.y;
    const w = obs.width;
    const h = obs.height;

    // Determine number of stacked tiers
    let tiers = 2;
    if (obs.type === 'rack_3tier') tiers = 3;
    else if (obs.type === 'rack_4tier_tall') tiers = 4;
    else if (obs.type === 'rack_cluster') tiers = 3;

    // Outer Cabinet Frame
    this.ctx.fillStyle = '#0f172a';
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1.5;
    this.roundRect(x, y, w, h, 3);
    this.ctx.fill();
    this.ctx.stroke();

    // Side Rails (Mounting posts with screw holes)
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(x, y, 4, h);
    this.ctx.fillRect(x + w - 4, y, 4, h);

    // Rack mounting screws
    this.ctx.fillStyle = '#94a3b8';
    for (let sy = y + 4; sy < y + h - 2; sy += 9) {
      this.ctx.fillRect(x + 1, sy, 2, 2);
      this.ctx.fillRect(x + w - 3, sy, 2, 2);
    }

    // Individual Stacked Server Units
    const unitH = (h - 4) / tiers;
    const blinkCycle = Math.floor(Date.now() / 200);

    for (let i = 0; i < tiers; i++) {
      const uy = y + 2 + i * unitH;
      const innerW = w - 10;
      const innerX = x + 5;

      // Server Blade Faceplate
      const bladeGrad = this.ctx.createLinearGradient(innerX, uy, innerX, uy + unitH);
      bladeGrad.addColorStop(0, '#334155');
      bladeGrad.addColorStop(1, '#1e293b');
      this.ctx.fillStyle = bladeGrad;
      this.ctx.fillRect(innerX, uy, innerW, unitH - 2);

      // Unit Border Divider
      this.ctx.strokeStyle = '#475569';
      this.ctx.lineWidth = 0.8;
      this.ctx.strokeRect(innerX, uy, innerW, unitH - 2);

      // Ventilation Grilles / Drive Bays
      this.ctx.fillStyle = '#0f172a';
      const ventW = Math.max(6, innerW * 0.38);
      this.ctx.fillRect(innerX + 2, uy + 3, ventW, unitH - 8);

      // Blinking Status LEDs (Green, Blue, Yellow/Red)
      const isGreenOn = (blinkCycle + i) % 2 === 0;
      const isBlueOn = (blinkCycle + i * 2) % 3 === 0;
      const isYellowOn = (blinkCycle + i) % 4 === 0;

      // LED 1: Link Activity (Green)
      this.ctx.fillStyle = isGreenOn ? '#10b981' : '#065f46';
      this.ctx.fillRect(innerX + innerW - 14, uy + 3, 3, 3);

      // LED 2: Data Transfer (Blue/Cyan)
      this.ctx.fillStyle = isBlueOn ? '#38bdf8' : '#0369a1';
      this.ctx.fillRect(innerX + innerW - 9, uy + 3, 3, 3);

      // LED 3: System Status (Yellow / Alert Red)
      this.ctx.fillStyle = isYellowOn ? '#f59e0b' : '#78350f';
      this.ctx.fillRect(innerX + innerW - 4, uy + 3, 3, 3);

      // RJ45 Port array row
      this.ctx.fillStyle = '#64748b';
      for (let p = 0; p < 3; p++) {
        this.ctx.fillRect(innerX + innerW - 14 + p * 4, uy + 8, 3, 2.5);
      }
    }

    // Stacked Patch Cables draping across the rack
    this.ctx.lineWidth = 1.8;
    // Blue Ethernet cord
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.beginPath();
    this.ctx.moveTo(x + 7, y + unitH * 0.5);
    this.ctx.quadraticCurveTo(x + 2, y + unitH * 1.2, x + 8, y + unitH * 1.7);
    this.ctx.stroke();

    // Yellow / Orange Fiber cord if 3 tiers or more
    if (tiers >= 3) {
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.beginPath();
      this.ctx.moveTo(x + w - 8, y + unitH * 1.4);
      this.ctx.quadraticCurveTo(x + w + 1, y + unitH * 2.1, x + w - 8, y + unitH * 2.6);
      this.ctx.stroke();
    }

    // Top Rack Branding Badge
    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillRect(x + w / 2 - 4, y + 1, 8, 2);

    this.ctx.restore();
  }

  roundRect(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawInitialScreen() {
    this.draw();

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.textAlign = 'center';

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px system-ui, sans-serif';
    this.ctx.fillText('🏃‍♂️ RAKA JUMP RUNNER', this.width / 2, this.height / 2 - 25);

    this.ctx.fillStyle = '#7dd3fc';
    this.ctx.font = '600 15px system-ui, sans-serif';
    this.ctx.fillText('Tekan SPASI, PANAH ATAS, atau KLIK DI SINI untuk Melompat!', this.width / 2, this.height / 2 + 10);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '13px system-ui, sans-serif';
    this.ctx.fillText('Lompati rak server yang tersusun! Hati-hati jangan sampai kabel jaringan terputus!', this.width / 2, this.height / 2 + 40);

    this.ctx.restore();
  }

  /**
   * Continuous animated death & Game Over loop
   * Renders the severed network cable snapping, pulling apart, shooting electric sparks,
   * and displays the dramatic Game Over message.
   */
  runDeathAnimationLoop() {
    if (!this.isGameOver) return;

    this.deathFrame++;
    this.draw(); // redraw game world freeze-frame

    // 1. Draw Severed Cable Animation (Animasi Kabel Terputus)
    this.drawSeveredCableAnimation();

    // 2. Draw Electric Sparks & Plasma Arcs
    this.updateAndDrawElectricSparks();

    // 3. Draw Game Over Overlay Card with Glitch / Terminal Style
    this.drawGameOverBanner();

    // Keep animating sparks & cable recoil continuously
    this.deathAnimId = requestAnimationFrame(() => this.runDeathAnimationLoop());
  }

  /**
   * Animates the severed UTP / RJ45 network cable
   * - Shows two snapped cable ends pulling apart.
   * - Frayed internal twisted pairs (Orange, Green, Blue, Brown) exposed at severed ends.
   * - Crackling electric lightning arcs jumping across the gap.
   */
  drawSeveredCableAnimation() {
    if (!this.severedCable) return;

    const c = this.severedCable;
    const progress = Math.min(1, this.deathFrame / 24);

    // Cable ends pull apart with recoil bounce
    const maxSep = 45;
    const recoil = Math.sin(progress * Math.PI * 0.5) * maxSep;
    const dropLeft = Math.sin(progress * Math.PI * 0.5) * 16;
    const dropRight = Math.sin(progress * Math.PI * 0.5) * 22;

    const leftTipX = c.snapX - recoil;
    const leftTipY = c.snapY + dropLeft;
    const rightTipX = c.snapX + recoil;
    const rightTipY = c.snapY + dropRight;

    this.ctx.save();

    // --- LEFT SEVERED CABLE SEGMENT ---
    // Outer blue jacket (Thick UTP cable)
    this.ctx.strokeStyle = '#2563eb';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(c.startX, c.startY);
    this.ctx.quadraticCurveTo(
      (c.startX + leftTipX) / 2,
      Math.max(c.startY, leftTipY) + 12,
      leftTipX,
      leftTipY
    );
    this.ctx.stroke();

    // Inner sheath highlight
    this.ctx.strokeStyle = '#60a5fa';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // --- RIGHT SEVERED CABLE SEGMENT ---
    this.ctx.strokeStyle = '#2563eb';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(c.endX, c.endY);
    this.ctx.quadraticCurveTo(
      (c.endX + rightTipX) / 2,
      Math.max(c.endY, rightTipY) + 15,
      rightTipX,
      rightTipY
    );
    this.ctx.stroke();

    this.ctx.strokeStyle = '#60a5fa';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // --- FRAYED INTERNAL WIRES AT SEVERED ENDS ---
    const wireColors = ['#ea580c', '#16a34a', '#2563eb', '#854d0e']; // Orange, Green, Blue, Brown twisted pairs

    // Left frayed wires
    wireColors.forEach((color, idx) => {
      const angle = (idx - 1.5) * 0.45;
      const wireLen = 8 + (idx % 2) * 5;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.8;
      this.ctx.beginPath();
      this.ctx.moveTo(leftTipX, leftTipY);
      this.ctx.lineTo(
        leftTipX + Math.cos(Math.PI - angle) * wireLen,
        leftTipY + Math.sin(Math.PI - angle) * wireLen
      );
      this.ctx.stroke();

      // Exposed copper tip
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fillRect(
        leftTipX + Math.cos(Math.PI - angle) * wireLen - 1,
        leftTipY + Math.sin(Math.PI - angle) * wireLen - 1,
        2.5,
        2.5
      );
    });

    // Right frayed wires
    wireColors.forEach((color, idx) => {
      const angle = (idx - 1.5) * 0.45;
      const wireLen = 8 + ((idx + 1) % 2) * 5;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.8;
      this.ctx.beginPath();
      this.ctx.moveTo(rightTipX, rightTipY);
      this.ctx.lineTo(
        rightTipX + Math.cos(angle) * wireLen,
        rightTipY + Math.sin(angle) * wireLen
      );
      this.ctx.stroke();

      // Exposed copper tip
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fillRect(
        rightTipX + Math.cos(angle) * wireLen - 1,
        rightTipY + Math.sin(angle) * wireLen - 1,
        2.5,
        2.5
      );
    });

    // --- ELECTRIC PLASMA ARCS (Jagged lightning between severed ends) ---
    if (this.deathFrame % 2 === 0 || Math.random() < 0.6) {
      this.ctx.strokeStyle = Math.random() < 0.5 ? '#38bdf8' : '#fef08a';
      this.ctx.lineWidth = 1.5 + Math.random() * 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(leftTipX, leftTipY);

      // Jagged zig-zag electrical discharge
      const midX = (leftTipX + rightTipX) / 2 + (Math.random() - 0.5) * 16;
      const midY = (leftTipY + rightTipY) / 2 + (Math.random() - 0.5) * 20;
      this.ctx.lineTo(midX, midY);
      this.ctx.lineTo(rightTipX, rightTipY);
      this.ctx.stroke();

      // Electric glow ring
      this.ctx.beginPath();
      this.ctx.arc(leftTipX, leftTipY, 4 + Math.random() * 4, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(rightTipX, rightTipY, 4 + Math.random() * 4, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
      this.ctx.fill();
    }

    this.ctx.restore();

    // Continually spawn small sparks from exposed wire tips
    if (Math.random() < 0.4) {
      this.createElectricalBurst(leftTipX, leftTipY, 2);
      this.createElectricalBurst(rightTipX, rightTipY, 2);
    }
  }

  updateAndDrawElectricSparks() {
    for (let i = this.electricSparks.length - 1; i >= 0; i--) {
      const s = this.electricSparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.18; // gravity
      s.life--;
      s.alpha = Math.max(0, s.life / 35);

      this.ctx.save();
      this.ctx.fillStyle = s.color;
      this.ctx.globalAlpha = s.alpha;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      if (s.life <= 0 || s.y > this.groundY + 10) {
        this.electricSparks.splice(i, 1);
      }
    }
  }

  /**
   * Renders the dramatic Game Over message
   * Displays "KABEL JARINGAN TERPUTUS!", "GAME OVER", score summary, and reconnect prompt.
   */
  drawGameOverBanner() {
    this.ctx.save();

    // Dark terminal backdrop with subtle cyber blur
    const bannerAlpha = Math.min(0.85, 0.35 + (this.deathFrame / 30));
    this.ctx.fillStyle = `rgba(15, 23, 42, ${bannerAlpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    this.ctx.textAlign = 'center';

    // Top Terminal Alert Tag
    this.ctx.fillStyle = '#ef4444';
    this.ctx.font = 'bold 13px Courier, monospace';
    this.ctx.fillText('⚡ [ ALERT: NETWORK CONNECTION SEVERED ] ⚡', cx, cy - 72);

    // Kalimat Spesifik: KABEL TERPUTUS
    this.ctx.fillStyle = '#fca5a5';
    this.ctx.font = 'bold 17px system-ui, sans-serif';
    this.ctx.fillText('KABEL JARINGAN TERPUTUS!', cx, cy - 48);

    // Big Bold GAME OVER with 3D drop shadow
    this.ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    this.ctx.shadowBlur = 12;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '900 36px system-ui, sans-serif';
    this.ctx.fillText('💥 GAME OVER 💥', cx, cy - 10);
    this.ctx.shadowBlur = 0; // reset shadow

    // Score Board Panel
    this.ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 1.5;
    this.roundRect(cx - 160, cy + 10, 320, 38, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px Courier, monospace';
    this.ctx.fillText(
      `SKOR: ${this.score.toString().padStart(5, '0')}   |   HIGH: ${this.highScore.toString().padStart(5, '0')}`,
      cx,
      cy + 34
    );

    // Blinking Reconnect / Restart Prompt
    const promptBlink = Math.floor(Date.now() / 450) % 2 === 0;
    if (promptBlink) {
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.font = '600 14px system-ui, sans-serif';
      this.ctx.fillText('🔄 Tekan [SPASI] atau Klik Layar untuk Menyambung Kembali Kabel', cx, cy + 76);
    } else {
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '600 14px system-ui, sans-serif';
      this.ctx.fillText('🔄 Tekan [SPASI] atau Klik Layar untuk Menyambung Kembali Kabel', cx, cy + 76);
    }

    this.ctx.restore();
  }

  gameLoop(timestamp) {
    if (!this.isRunning) return;

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.draw();

    if (this.isRunning) {
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }
}

// Global instance exposed for app.js
window.RakaDinoGame = RakaDinoGame;
