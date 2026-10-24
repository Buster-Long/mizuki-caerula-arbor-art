/* Native Hydra/Proton show director. The song is the clock; no scroll animation
   owns its own timer. Space starts / pauses / resumes; Shift+Space restarts. */
(() => {
  'use strict';
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const inverseSmooth=x=>{let a=0,b=1;for(let i=0;i<30;i++){const m=(a+b)/2;if(smooth(m)<x)a=m;else b=m;}return(a+b)/2;};
  const details=[
    {slug:'the-beginning',start:38,end:45},
    {slug:'precious-days',start:65,end:72},
    {slug:'price-of-peace',start:80,end:86},
    {slug:'price-of-peace-ii',start:90,end:95},
    {slug:'stella-caerula',start:98,end:103}
  ];
  const knots=[
    [0,'Home',0,'raw'],[6.8,'Home',0,'raw'],
    [10.2,'Home',.62],[14.2,'Home',.75],[18,'Home',.88],
    [20,'About',.40],[22,'About',.82],
    [24,'card',0],[27.5,'card',1],[31.5,'card',2],
    [36.8,'card',3],[45.8,'card',3],[48,'card',4],
    [51.5,'card',5],[55,'card',6],[59,'card',7],
    [63.8,'card',8],[72.8,'card',8],[75.2,'card',9],
    [78.8,'card',10],[86.8,'card',10],[88.8,'card',11],
    [95.8,'card',11],[97,'card',12],[103.8,'card',12],
    [105,'card',13],[106.5,'TreeScene',.23],[110.5,'TreeScene',.80],
    [113,'CleanRoom',.52],[120.8,'CleanRoom',.72],
    [123,'CleanRoom',.92],[125.5,'Footer',.32],
    [131,'Footer',.48],[135.7,'Footer',1],[140.412381,'Footer',1]
  ];
  let audio,scroll,work,raf=0,starting=false,selectedDetail=null,savedLoop=true;
  const show={running:false,paused:false,finished:false,time:0,duration:140.412381,wallStart:0,details,knots,events:[]};
  const log=(kind,extra={})=>show.events.push({kind,time:audio?.currentTime||0,...extra});
  const ready=entrance=>window.AppState&&AppState.get('FXScroll/initialized')&&(entrance?AppState.get('Global/loadFinished'):AppState.get('ViewController/visibleV')>.99);
  async function initialize(entrance=false){
    while(!ready(entrance))await new Promise(r=>setTimeout(r,25));
    audio=document.getElementById('bgm');if(!audio)throw Error('Missing soundtrack');
    if(!Number.isFinite(audio.duration))await new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',reject,{once:true});audio.load();});
    show.duration=audio.duration;knots[knots.length-1][0]=audio.duration;
    scroll=AppState.get('ViewController/scroll');work=scroll.views.find(v=>v.fragName==='Work');
  }
  function scenePixel(name,p){
    const view=scroll.views.find(v=>v.fragName===name);
    return clamp(view.start+p*(view.end-view.start+innerHeight)-innerHeight,0,scroll.views.at(-1).end);
  }
  function cardPixel(index){
    const mobile=innerWidth<innerHeight&&!!window.Device?.mobile;
    const offset=mobile?.10:.06;
    let p=offset+(1-2*offset)*inverseSmooth(index/13);
    // Keep the first/last card fully inside the Work scene's transition edges.
    p=clamp(p,.115,.905);return scenePixel('Work',p);
  }
  function pixel(k){return k[3]==='raw'?0:k[1]==='card'?cardPixel(k[2]):scenePixel(k[1],k[2]);}
  function positionAt(t){
    for(let i=1;i<knots.length;i++)if(t<=knots[i][0]){
      const a=knots[i-1],b=knots[i],f=clamp((t-a[0])/(b[0]-a[0]));
      return pixel(a)+(pixel(b)-pixel(a))*smooth(f);
    }
    return pixel(knots.at(-1));
  }
  function closeDetail(){if(AppState.get('Work/project'))work.set('Work/project',null);selectedDetail=null;}
  function setDetail(t){
    const cue=details.find(d=>t>=d.start&&t<d.end),slug=cue?.slug||null;
    if(slug===selectedDetail)return;
    if(selectedDetail||AppState.get('Work/project'))closeDetail();
    if(slug){selectedDetail=slug;work.navigate('work/'+slug);log('detail-open',{slug});}
    else log('detail-close');
  }
  function pulse(name,t){
    const layer=scroll.views.find(v=>v.fragName===name)?.layers.particles?.layers.particles;
    if(!layer?.shader.uniforms.uShowWave)return;
    const uniform=layer.shader.uniforms;uniform.uShowActive.value=show.running?1:0;
    let y=0,strength=0,radius=0,radial=0;
    const centerY=uniform.uLogoPos.value.y;
    if(name==='Home'&&t>=2&&t<=6.8){const f=clamp((t-2)/4.8);y=centerY+22-44*f;strength=Math.sin(Math.PI*f)*1.3;}
    if(name==='Home'&&t>=10.2&&t<=14.2){const f=clamp((t-10.2)/4);radius=3+33*f;radial=Math.sin(Math.PI*f)*1.25;}
    if(name==='Footer'&&t>=125&&t<=132){const f=clamp((t-125)/7);radius=3+35*f;radial=Math.sin(Math.PI*f)*1.25;}
    if(name==='Footer'&&t>=135.7){const f=clamp((t-135.7)/(show.duration-135.7));y=centerY-24+48*f;strength=Math.sin(Math.PI*f)*1.3;}
    uniform.uShowWave.value.set(y,strength,radius,radial);
  }
  function render(t){
    show.time=clamp(t,0,show.duration);
    scroll.scrollTo(positionAt(show.time),0);
    setDetail(show.time);pulse('Home',show.time);pulse('Footer',show.time);
    scroll.renderManager.controller.lock();
  }
  function tick(){
    if(!show.running)return;
    render(audio.currentTime);
    if(audio.ended||audio.currentTime>=show.duration-.025){finish();return;}
    raf=requestAnimationFrame(tick);
  }
  function finish(){
    render(show.duration);show.finished=true;show.running=false;show.paused=false;
    audio.pause();scroll.renderManager.controller.unlock();log('finish');
    window.dispatchEvent(new CustomEvent('mizuki-show-ended',{detail:{duration:show.duration}}));
  }
  show.start=async function({entrance=false}={}){
    if(starting)return;starting=true;
    try{
      await initialize(entrance);cancelAnimationFrame(raf);closeDetail();
      // Existing native audio remains available for manual browsing; the show
      // uses exactly one music element to avoid a second, out-of-phase copy.
      AppState.set('Global/audioEnabled',0);audio.pause();savedLoop=audio.loop;audio.loop=false;
      audio.currentTime=0;audio.playbackRate=1;audio.muted=false;audio.volume=.55;
      show.events=[];show.finished=false;show.running=true;show.paused=false;show.wallStart=0;
      scroll.scrollTo(0,0);render(0);
      await audio.play();show.wallStart=performance.timeOrigin+performance.now()-audio.currentTime*1000;
      log('start');raf=requestAnimationFrame(tick);
    }catch(error){show.running=false;console.error('Mizuki show:',error);throw error;}
    finally{starting=false;}
  };
  show.pause=()=>{if(!show.running||show.paused)return;audio.pause();show.paused=true;log('pause');};
  show.resume=async()=>{if(!show.running||!show.paused)return;await audio.play();show.paused=false;log('resume');};
  show.stop=()=>{
    cancelAnimationFrame(raf);show.running=false;show.paused=false;if(!scroll)return;
    closeDetail();audio.pause();audio.loop=savedLoop;scroll.renderManager.controller.unlock();
    for(const name of ['Home','Footer']){const u=scroll.views.find(v=>v.fragName===name)?.layers.particles?.layers.particles?.shader.uniforms;if(u?.uShowActive)u.uShowActive.value=0;}
    log('stop');
  };
  show.seek=async seconds=>{if(!scroll)await initialize();audio.currentTime=clamp(seconds,0,show.duration-.001);render(audio.currentTime);};
  show.state=()=>({running:show.running,paused:show.paused,finished:show.finished,time:show.time,duration:show.duration,wallStart:show.wallStart,detail:selectedDetail,scroll:scroll?.renderManager.controller.scroll,events:show.events});
  window.MizukiShow=show;
  window.addEventListener('keydown',event=>{
    if(event.target?.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName||''))return;
    if(event.code==='Space'){
      event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;
      if(!show.running||event.shiftKey)show.start();else if(show.paused)show.resume();else show.pause();
    }else if(event.code==='Escape'&&show.running){event.preventDefault();event.stopImmediatePropagation();show.stop();}
  },true);
  const block=event=>{if(show.running){event.preventDefault();event.stopImmediatePropagation();}};
  window.addEventListener('wheel',block,{capture:true,passive:false});
  window.addEventListener('touchmove',block,{capture:true,passive:false});
  // Capture/export route: begin at native loadFinished, while its five-second
  // visibility/rotation entrance is still playing, rather than waiting it out.
  if(new URLSearchParams(location.search).get('autoplay')==='1')show.start({entrance:true});
})();
