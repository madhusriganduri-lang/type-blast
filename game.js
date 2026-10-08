const WORDS = [
  "python","javascript","developer","machine","learning","coding","algorithm","function",
  "database","computer","website","frontend","backend","network","security","project",
  "student","technology","software","programming","artificial","intelligence","browser",
  "keyboard","internet","creative","challenge","success","future","innovation","career",
  "github","cloud","server","variable","object","class","array","string","boolean",
  "digital","system","application","framework","responsive","animation","developer",
  "design","mobile","laptop","tablet","interface","robot","cyber","data","model","neural",
];

const LEVELS = {
  1:{name:"CADET",target:30,time:180,spawn:2.2,speed:55},
  2:{name:"HUNTER",target:45,time:180,spawn:1.5,speed:65},
  3:{name:"ACE",target:55,time:180,spawn:1.1,speed:80}
};

const game=document.getElementById("game");
const playArea=document.getElementById("playArea");
const input=document.getElementById("wordInput");
const startBtn=document.getElementById("startBtn");
const levelMenu=document.getElementById("levelMenu");
const resultOverlay=document.getElementById("resultOverlay");
const resultTitle=document.getElementById("resultTitle");
const resultMessage=document.getElementById("resultMessage");
const nextBtn=document.getElementById("nextBtn");
const menuBtn=document.getElementById("menuBtn");
const scoreEl=document.getElementById("score");
const wpmEl=document.getElementById("wpm");
const accuracyEl=document.getElementById("accuracy");
const comboEl=document.getElementById("combo");
const livesEl=document.getElementById("lives");
const progressEl=document.getElementById("progress");
const timerEl=document.getElementById("timer");
const typedDisplay=document.getElementById("typedDisplay");
const flash=document.getElementById("flash");
const toast=document.getElementById("toast");

let selectedLevel=1,running=false,words=[],score=0,lives=3,combo=0,bestCombo=0;
let correctChars=0,wrongAttempts=0,startTime=0,lastTime=0,spawnTimer=0;
let animationId=0,audioCtx=null,completed=0,timeLeft=180,ending=false;

function sound(type){
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended")audioCtx.resume();
    const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);

    if(type==="type"){
      o.type="sine";o.frequency.setValueAtTime(720+Math.random()*120,now);
      o.frequency.exponentialRampToValueAtTime(330,now+.055);
      g.gain.setValueAtTime(.035,now);g.gain.exponentialRampToValueAtTime(.001,now+.07);
      o.start();o.stop(now+.075);
    }else if(type==="shoot"){
      o.type="triangle";o.frequency.setValueAtTime(520,now);
      o.frequency.exponentialRampToValueAtTime(170,now+.12);
      g.gain.setValueAtTime(.09,now);g.gain.exponentialRampToValueAtTime(.001,now+.14);
      o.start();o.stop(now+.14);
    }else if(type==="shot"){
  o.type="triangle";

  o.frequency.setValueAtTime(980,now);
  o.frequency.exponentialRampToValueAtTime(430,now+0.075);

  g.gain.setValueAtTime(0.045,now);
  g.gain.exponentialRampToValueAtTime(0.001,now+0.09);

  o.start();
  o.stop(now+0.095);
}else if(type==="complete"){
      o.type="sine";o.frequency.setValueAtTime(520,now);
      o.frequency.setValueAtTime(780,now+.08);o.frequency.setValueAtTime(1040,now+.16);
      g.gain.setValueAtTime(.09,now);g.gain.exponentialRampToValueAtTime(.001,now+.32);
      o.start();o.stop(now+.32);
    }else if(type==="boom"){
      o.type="sawtooth";o.frequency.setValueAtTime(190,now);
      o.frequency.exponentialRampToValueAtTime(45,now+.28);
      g.gain.setValueAtTime(.12,now);g.gain.exponentialRampToValueAtTime(.001,now+.3);
      o.start();o.stop(now+.3);
    }else if(type==="bad"){
      o.type="square";o.frequency.setValueAtTime(95,now);
      g.gain.setValueAtTime(.08,now);g.gain.exponentialRampToValueAtTime(.001,now+.15);
      o.start();o.stop(now+.15);
    }else if(type==="life"){
      o.type="sine";o.frequency.setValueAtTime(300,now);
      o.frequency.exponentialRampToValueAtTime(700,now+.15);
      g.gain.setValueAtTime(.1,now);g.gain.exponentialRampToValueAtTime(.001,now+.2);
      o.start();o.stop(now+.2);
    }else if(type==="level"){
      o.type="sine";
      [440,660,880].forEach((f,i)=>o.frequency.setValueAtTime(f,now+i*.09));
      g.gain.setValueAtTime(.1,now);g.gain.exponentialRampToValueAtTime(.001,now+.4);
      o.start();o.stop(now+.4);
    }
  }catch(e){}
}

function accuracy(){
  const attempts=correctChars+wrongAttempts;
  return attempts?Math.max(0,Math.round(correctChars/attempts*100)):100;
}
function wpm(){
  const mins=Math.max((performance.now()-startTime)/60000,.01);
  return Math.round((correctChars/5)/mins);
}
function formatTime(sec){
  sec=Math.max(0,Math.ceil(sec));
  return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");
}
function updateHUD(){
  const cfg=LEVELS[selectedLevel];
  scoreEl.textContent=score.toLocaleString();
  wpmEl.textContent=wpm();
  accuracyEl.textContent=accuracy()+"%";
  comboEl.textContent="x"+combo;
  livesEl.textContent="♥".repeat(lives)+"♡".repeat(3-lives);
  progressEl.textContent=completed+"/"+cfg.target;
  timerEl.textContent=formatTime(timeLeft);
  timerEl.style.color=timeLeft<=20?"#ff5d7d":"";
}

document.querySelectorAll(".level-card").forEach(card=>{
  card.addEventListener("click",()=>{
    selectedLevel=Number(card.dataset.level);
    document.querySelectorAll(".level-card").forEach(c=>c.classList.remove("selected"));
    card.classList.add("selected");
    startBtn.textContent="START LEVEL "+selectedLevel;
    updateHUD();
  });
});

function randomWord(){
  return WORDS[Math.floor(Math.random()*WORDS.length)];
}

function reset(){
  words.forEach(w=>w.el?.remove());
  words=[];
  score=0;lives=3;combo=0;bestCombo=0;correctChars=0;wrongAttempts=0;completed=0;
  timeLeft=LEVELS[selectedLevel].time;spawnTimer=0;ending=false;
  updateHUD();resultOverlay.classList.add("hidden");
}

function start(){
  reset();
  running=true;
  levelMenu.classList.add("hidden");
  input.disabled=false;input.value="";input.focus();
  startTime=performance.now();lastTime=startTime;
  sound("life");
  animationId=requestAnimationFrame(loop);
}

function showResult(success,message){
  if(ending)return;
  ending=true;running=false;input.disabled=true;cancelAnimationFrame(animationId);
  document.getElementById("finalScore").textContent=score.toLocaleString();
  document.getElementById("finalWpm").textContent=wpm();
  document.getElementById("finalAccuracy").textContent=accuracy()+"%";
  document.getElementById("finalCombo").textContent=bestCombo;
  resultTitle.textContent=success?"MISSION COMPLETE":"MISSION FAILED";
  resultTitle.style.color=success?"#55f7ff":"#ff5d7d";
  resultMessage.textContent=message;
  nextBtn.style.display=(success&&selectedLevel<3)?"inline-block":"none";
  nextBtn.textContent=selectedLevel<3?"NEXT LEVEL":"PLAY AGAIN";
  resultOverlay.classList.remove("hidden");
  success?sound("level"):sound("bad");
}

function spawn(){
  const text=randomWord(),el=document.createElement("div");
  el.className="word";el.dataset.word=text;el.textContent=text;
  const x=6+Math.random()*88,y=-35;
  el.style.left=x+"%";el.style.top=y+"px";
  playArea.appendChild(el);
  words.push({text,el,x:x/100,y,speed:LEVELS[selectedLevel].speed*(.9+Math.random()*.2)});
}

function renderWord(w){
  w.el.style.left=(w.x*100)+"%";
  w.el.style.top=w.y+"px";
  const typed=input.value.toLowerCase();
  const isTarget=typed.length>0&&w.text.startsWith(typed);
  w.el.classList.toggle("active-target",isTarget);
  const prefix=typed&&w.text.startsWith(typed)?typed:"";
  w.el.innerHTML=prefix?'<span class="match">'+prefix+"</span>"+w.text.slice(prefix.length):w.text;
}
function typingShot(w){
  const r=w.el.getBoundingClientRect();
  const gr=game.getBoundingClientRect();

  const targetX=r.left-gr.left+r.width/2;
  const targetY=r.top-gr.top+r.height/2;

  const shipX=game.clientWidth/2;
  const shipY=game.clientHeight-72;

  const dx=targetX-shipX;
  const dy=targetY-shipY;

  const distance=Math.hypot(dx,dy);
  const angle=Math.atan2(dy,dx)*180/Math.PI;

  const shot=document.createElement("div");

  shot.className="typing-shot";

  shot.style.left=shipX+"px";
  shot.style.top=shipY+"px";

  shot.style.setProperty("--angle",angle+"deg");
  shot.style.setProperty("--distance",distance+"px");

  playArea.appendChild(shot);

  sound("shot");

  requestAnimationFrame(()=>{
    shot.style.width=distance+"px";
    shot.classList.add("flying");
  });

  setTimeout(()=>{
    shot.remove();
  },125);
}

function blast(w){
  const r=w.el.getBoundingClientRect(),gr=game.getBoundingClientRect();
  const targetX=r.left-gr.left+r.width/2,targetY=r.top-gr.top+r.height/2;
  const shipX=game.clientWidth/2,shipY=game.clientHeight-72;
  const dx=targetX-shipX,dy=targetY-shipY,distance=Math.hypot(dx,dy);
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const bullet=document.createElement("div");
  bullet.className="bullet";bullet.style.left=shipX+"px";bullet.style.top=shipY+"px";
  bullet.style.width="0px";bullet.style.transform=`rotate(${angle}deg)`;
  playArea.appendChild(bullet);sound("shoot");
  requestAnimationFrame(()=>{bullet.style.transition="width .13s linear";bullet.style.width=distance+"px"});
  setTimeout(()=>{
    bullet.remove();sound("boom");
    const ex=document.createElement("div");ex.className="explosion";
    ex.style.left=targetX+"px";ex.style.top=targetY+"px";playArea.appendChild(ex);
    for(let i=0;i<16;i++){
      const p=document.createElement("div");p.className="particle";
      p.style.left=targetX+"px";p.style.top=targetY+"px";
      p.style.setProperty("--dx",(Math.random()*170-85)+"px");
      p.style.setProperty("--dy",(Math.random()*170-85)+"px");
      playArea.appendChild(p);setTimeout(()=>p.remove(),700);
    }
    setTimeout(()=>ex.remove(),500);
  },140);
}

function destroyWord(w){
  blast(w);w.el.classList.add("hit");
  score+=w.text.length*10+combo*5;combo++;bestCombo=Math.max(bestCombo,combo);
  correctChars+=w.text.length;completed++;
  if(combo>0&&combo%5===0)showToast("🔥 COMBO x"+combo+"!");
  flash.className="";void flash.offsetWidth;flash.className="flash-good";
  words=words.filter(x=>x!==w);w.el.remove();input.value="";typedDisplay.textContent="";
  updateHUD();
  if(completed>=LEVELS[selectedLevel].target){
    setTimeout(()=>showResult(true,LEVELS[selectedLevel].target+" words destroyed in Level "+selectedLevel+"."),180);
  }
}

function damage(w){
  sound("bad");lives--;combo=0;wrongAttempts++;
  flash.className="";void flash.offsetWidth;flash.className="flash-bad";
  w.el.remove();words=words.filter(x=>x!==w);input.value="";typedDisplay.textContent="";
  updateHUD();
  if(lives<=0)showResult(false,"Your shield was destroyed. Try again!");
}

function showToast(t){
  toast.textContent=t;toast.className="";void toast.offsetWidth;toast.className="toast-show";
}

input.addEventListener("input",()=>{
  if(!running)return;

  if(input.value.length>0){
    sound("type");
  }

  const value=input.value.toLowerCase().trim();

  typedDisplay.textContent=value;

  if(!value)return;

  const target=words.find(w=>w.text.startsWith(value));

  if(target){

    // Shoot toward the target for every typed letter
    typingShot(target);

    // Complete word
    if(target.text===value){
      sound("complete");
      destroyWord(target);
      return;
    }
  }

  const possible=words.some(w=>w.text.startsWith(value));
  if(!possible&&value.length>=2){
    wrongAttempts++;sound("bad");combo=0;input.value="";typedDisplay.textContent="";
    flash.className="";void flash.offsetWidth;flash.className="flash-bad";updateHUD();
  }
});

function loop(now){
  if(!running)return;
  const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
  timeLeft=LEVELS[selectedLevel].time-(now-startTime)/1000;
  if(timeLeft<=0){
    timeLeft=0;updateHUD();
    if(completed>=LEVELS[selectedLevel].target)showResult(true,"Target completed!");
    else showResult(false,`Time is up. You destroyed ${completed}/${LEVELS[selectedLevel].target} words.`);
    return;
  }

  spawnTimer+=dt;
  const cfg=LEVELS[selectedLevel];
  // Keep the exact intended average challenge: 25 / 35 / 45 words in 3 minutes.
  if(spawnTimer>=cfg.spawn && completed<cfg.target+3){spawnTimer=0;spawn()}

  for(const w of [...words]){
    w.y+=w.speed*dt;renderWord(w);
    const limit=playArea.clientHeight-112;
    if(w.y>limit){damage(w);if(!running)break}
  }
  updateHUD();
  animationId=requestAnimationFrame(loop);
}

startBtn.onclick=start;

nextBtn.onclick=()=>{
  if(selectedLevel<3){
    selectedLevel++;
    document.querySelectorAll(".level-card").forEach(c=>c.classList.toggle("selected",Number(c.dataset.level)===selectedLevel));
    startBtn.textContent="START LEVEL "+selectedLevel;
    resultOverlay.classList.add("hidden");
    start();
  }else{
    resultOverlay.classList.add("hidden");start();
  }
};

menuBtn.onclick=()=>{
  running=false;input.disabled=true;cancelAnimationFrame(animationId);
  resultOverlay.classList.add("hidden");levelMenu.classList.remove("hidden");
  updateHUD();
};

window.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&!running&&resultOverlay.classList.contains("hidden"))start();
});
