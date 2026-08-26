'use strict';

(() => {
  const engine = window.RomkaRunnerEngine;
  const canvas = document.getElementById('canvas');
  const gameNode = document.getElementById('game');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const start = document.getElementById('start');
  const restart = document.getElementById('restart');
  const pause = document.getElementById('pause');
  const sound = document.getElementById('sound');
  const jumpButton = document.getElementById('jump');
  const duckButton = document.getElementById('duck');
  const scoreNode = document.getElementById('score');
  const bestNode = document.getElementById('best');
  const status = document.getElementById('status');
  const context = canvas?.getContext('2d');
  if (!engine || !context) return;

  const WIDTH = 960;
  const HEIGHT = 360;
  const BEST_KEY = 'doodle-t-rex-runner-best-v1';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const game = engine.createGame({ width: WIDTH, height: HEIGHT });
  const mascot = new Image();
  mascot.src = 'assets/mascot-romka.png';
  let best = readBest();
  let lastFrame = performance.now();
  let lastState = game.status;
  let soundOn = false;
  let audio = null;

  function readBest() {
    try { return Math.max(0, Number.parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0); }
    catch { return 0; }
  }
  function saveBest() { try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* optional */ } }
  function format(value) { return String(Math.min(99999, Math.max(0, Math.floor(value)))).padStart(5, '0'); }
  function line(points, color = '#111214', width = 3) {
    context.beginPath();
    points.forEach(([x,y], index) => index ? context.lineTo(x,y) : context.moveTo(x,y));
    context.strokeStyle = color; context.lineWidth = width; context.lineCap = 'round'; context.lineJoin = 'round'; context.stroke();
  }
  function beep(frequency, duration=.06) {
    if (!soundOn) return;
    try {
      audio ||= new (AudioContext || webkitAudioContext)();
      const oscillator = audio.createOscillator(); const gain = audio.createGain();
      oscillator.type='square'; oscillator.frequency.value=frequency; gain.gain.value=.025;
      oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime+duration);
    } catch { soundOn=false; }
  }
  function resize() {
    const ratio=Math.min(2,Math.max(1,devicePixelRatio||1));
    canvas.width=WIDTH*ratio; canvas.height=HEIGHT*ratio; context.setTransform(ratio,0,0,ratio,0,0);
  }
  function sync() {
    gameNode.dataset.state=game.status;
    gameNode.dataset.playerState=game.status==='idle'?'ready':(!game.player.grounded?'jumping':game.player.ducking?'ducking':'running');
    scoreNode.textContent=format(game.score); bestNode.textContent=format(best);
    pause.disabled=game.status==='idle'||game.status==='gameover'; pause.textContent=game.status==='paused'?'resume':'pause';
    if(game.status==='running') overlay.hidden=true;
    else {
      overlay.hidden=false;
      if(game.status==='paused'){overlayTitle.textContent='paused — the bugs are waiting.';start.hidden=true;restart.hidden=true;}
      else if(game.status==='gameover'){overlayTitle.textContent=`deploy failed at ${format(game.score)}.`;start.hidden=true;restart.hidden=false;}
      else{overlayTitle.textContent='ready to make questionable decisions?';start.hidden=false;restart.hidden=true;}
    }
  }
  function begin() { engine.startGame(game); lastFrame=performance.now(); lastState=game.status; status.textContent='Run started. Jump over junk and slide under flying hazards.'; sync(); canvas.focus({preventScroll:true}); beep(260); }
  function jump() { if(game.status==='idle'||game.status==='gameover') begin(); if(engine.jump(game)){status.textContent='Jump!';beep(430);sync();} }
  function duck(value) { engine.setDucking(game,value); sync(); }
  function togglePause() { if(engine.togglePause(game)){lastFrame=performance.now();status.textContent=game.status==='paused'?'Paused.':'Run resumed.';sync();} }

  function drawBackground() {
    context.fillStyle='#fbf8ef';context.fillRect(0,0,WIDTH,HEIGHT);
    context.strokeStyle='rgba(34,63,72,.07)';context.lineWidth=1;
    for(let x=0;x<=WIDTH;x+=32){context.beginPath();context.moveTo(x,0);context.lineTo(x,HEIGHT);context.stroke();}
    for(let y=0;y<=HEIGHT;y+=32){context.beginPath();context.moveTo(0,y);context.lineTo(WIDTH,y);context.stroke();}
    const drift=reducedMotion.matches?0:(game.distance*.08)%1180;
    context.strokeStyle='rgba(17,18,20,.55)';context.lineWidth=2;
    for(let i=0;i<3;i++){const x=((250+i*390-drift)%1180+1180)%1180-80,y=72+(i%2)*42;context.beginPath();context.moveTo(x,y+12);context.bezierCurveTo(x+20,y-8,x+40,y+2,x+44,y+14);context.bezierCurveTo(x+60,y,x+78,y+6,x+84,y+18);context.stroke();}
  }
  function drawGround() {
    const y=game.groundY;line([[0,y],[150,y-1],[300,y+2],[480,y],[650,y-2],[820,y+1],[960,y]],'#111214',4);
    const offset=Math.floor(game.distance)%44;
    for(let x=-offset;x<WIDTH;x+=44)line([[x,y+14],[x+15,y+12]],'rgba(17,18,20,.45)',2);
  }
  function drawPlayer() {
    const p=game.player,phase=Math.floor(game.elapsed*12)%2,bob=reducedMotion.matches||!p.grounded?0:(phase?2:-1);
    context.save();
    if(p.ducking){context.translate(p.x+5,p.y+bob+22);context.rotate(-.08);context.scale(1.18,.58);}else context.translate(p.x,p.y+bob);
    context.fillStyle='#111214';context.beginPath();context.moveTo(5,56);context.lineTo(32,43);context.quadraticCurveTo(43,35,55,42);context.lineTo(61,24);context.lineTo(82,20);context.lineTo(82,41);context.lineTo(67,43);context.lineTo(79,50);context.lineTo(61,55);context.lineTo(56,72);context.lineTo(40,72);context.lineTo(34,59);context.lineTo(18,62);context.closePath();context.fill();
    context.fillStyle='#fbf8ef';context.beginPath();context.arc(72,30,3,0,Math.PI*2);context.fill();
    const shift=p.grounded?(phase?7:-4):2;line([[42,69],[37+shift,86],[29+shift,86]],'#111214',5);line([[55,69],[61-shift,86],[72-shift,86]],'#111214',5);
    if(mascot.complete&&mascot.naturalWidth)context.drawImage(mascot,p.ducking?24:20,p.ducking?2:-9,p.ducking?39:47,p.ducking?39:47);
    context.restore();
    if(p.ducking&&p.grounded)for(let i=0;i<3;i++)line([[p.x-8-i*13,game.groundY-5-(i%2)*5],[p.x-16-i*13,game.groundY-3-(i%2)*5]],'rgba(17,18,20,.5)',2);
  }
  function drawObstacle(obstacle) {
    const {x,y,width,height}=obstacle;context.save();context.translate(x,y);context.strokeStyle='#111214';context.lineWidth=3;
    if(obstacle.challenge==='duck'){
      context.fillStyle=obstacle.type==='drone'?'#65d9ef':'#a78bfa';context.beginPath();context.roundRect(2,4,width-4,height-8,Math.min(9,height/3));context.fill();context.stroke();
      line([[5,2],[width-5,2]],'#111214',2);context.fillStyle='#ff9c8f';context.beginPath();context.arc(width/2,height/2,3,0,Math.PI*2);context.fill();
    } else if(obstacle.type==='coffee'){
      context.fillStyle='#ffd21f';context.fillRect(3,10,width-12,height-12);context.strokeRect(3,10,width-12,height-12);context.beginPath();context.arc(width-8,height*.6,8,-Math.PI/2,Math.PI/2);context.stroke();
    } else if(obstacle.type==='deploy'){
      context.fillStyle='#ff9c8f';context.fillRect(2,7,width-4,height-9);context.strokeRect(2,7,width-4,height-9);context.fillStyle='#111214';context.font='700 11px "Space Mono"';context.fillText('500',width/2-11,height*.65);
    } else {
      context.fillStyle=obstacle.type==='cable'?'#65d9ef':'#a78bfa';context.beginPath();context.roundRect(2,5,width-4,height-7,8);context.fill();context.stroke();
    }
    context.restore();
  }
  function draw() { drawBackground();drawGround();game.obstacles.forEach(drawObstacle);drawPlayer();context.fillStyle='rgba(17,18,20,.6)';context.font='700 11px "Space Mono"';context.fillText(`SPEED ${Math.round(game.speed)}`,20,28); }
  function tick(now) {
    const delta=(now-lastFrame)/1000;lastFrame=now;engine.updateGame(game,delta);
    if(lastState!==game.status&&game.status==='gameover'){best=Math.max(best,game.score);saveBest();status.textContent=`Game over. Score ${game.score}. Best ${best}.`;beep(105,.16);}
    lastState=game.status;sync();draw();requestAnimationFrame(tick);
  }
  function typing(target){return target instanceof HTMLElement&&Boolean(target.closest('button,a,input,textarea'));}
  function keyDown(event){if(typing(event.target))return;const duckKey=['ArrowDown','ShiftLeft','ShiftRight'].includes(event.code);if(['Space','ArrowUp'].includes(event.code)){event.preventDefault();if(!event.repeat)jump();}else if(duckKey){event.preventDefault();duck(true);}else if(event.code==='KeyP'&&!event.repeat){event.preventDefault();togglePause();}}
  function keyUp(event){if(['ArrowDown','ShiftLeft','ShiftRight'].includes(event.code)){event.preventDefault();duck(false);}}

  start.addEventListener('click',begin);restart.addEventListener('click',begin);pause.addEventListener('click',togglePause);jumpButton.addEventListener('click',jump);
  sound.addEventListener('click',()=>{soundOn=!soundOn;sound.textContent=`sound: ${soundOn?'on':'off'}`;sound.setAttribute('aria-pressed',String(soundOn));beep(320);});
  duckButton.addEventListener('pointerdown',event=>{event.preventDefault();duck(true);});['pointerup','pointercancel','pointerleave'].forEach(name=>duckButton.addEventListener(name,event=>{event.preventDefault();duck(false);}));
  addEventListener('keydown',keyDown,{passive:false});addEventListener('keyup',keyUp,{passive:false});addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='running')togglePause();});
  resize();sync();draw();requestAnimationFrame(tick);
})();
