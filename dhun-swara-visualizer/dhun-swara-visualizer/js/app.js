const $=id=>document.getElementById(id),cv=$('cv'),cx=cv.getContext('2d'),au=$('au');
const NOTE=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// [English, Devanagari, komal, tivra, just-intonation ratio]
const SW=[['Sa','सा',0,0,[1,1]],['Re(k)','रे',1,0,[16,15]],['Re','रे',0,0,[9,8]],['Ga(k)','ग',1,0,[6,5]],['Ga','ग',0,0,[5,4]],['Ma','म',0,0,[4,3]],['Ma(t)','म',0,1,[45,32]],['Pa','प',0,0,[3,2]],['Dha(k)','ध',1,0,[8,5]],['Dha','ध',0,0,[5,3]],['Ni(k)','नि',1,0,[9,5]],['Ni','नि',0,0,[15,8]]];
const JC=SW.map(s=>1200*Math.log2(s[4][0]/s[4][1]));
const RAGAS={Bihag:[0,2,4,5,6,7,9,11],Yaman:[0,2,4,6,7,9,11],Bilawal:[0,2,4,5,7,9,11],Khamaj:[0,2,4,5,7,9,10,11],Kafi:[0,2,3,5,7,9,10],Asavari:[0,2,3,5,7,8,10],Bhairavi:[0,1,3,5,7,8,10],Bhairav:[0,1,4,5,7,8,11],Todi:[0,1,3,6,7,8,11],Marwa:[0,1,4,6,9,11],Purvi:[0,1,4,6,7,8,11],Pilu:[0,1,2,3,4,5,7,8,9,10,11]};
const VADI={Bihag:4,Yaman:4,Bilawal:9,Khamaj:4,Kafi:7,Asavari:8,Bhairavi:5,Bhairav:8,Todi:8,Marwa:1,Purvi:4,Pilu:4};   // the swara a raag leans on most
NOTE.forEach((n,i)=>$('sa').add(new Option(n,i)));
Object.keys(RAGAS).forEach(r=>$('raga').add(new Option(r,r)));
const st=t=>$('st').textContent=t,gcd=(a,b)=>b?gcd(b,a%b):a;
const ALIAS={Bilawal:'Sankarabharanam',Yaman:'Kalyani',Bhairav:'Mayamalavagowla',Asavari:'Natabhairavi',Kafi:'Kharaharapriya',Bhairavi:'Hanumatodi'},rn=r=>r+(ALIAS[r]?' / '+ALIAS[r]:'');
const pc=x=>Math.round(Math.min(.99,Math.max(0,x))*100)+'%';
let D=null,M=null,cam=0,lastT=0;

/* ---------- 1. Vocal pitch tracking ---------- */
/* ---- Polyphonic vocal tracker: whitened spectrum -> harmonic salience on a 20-cent grid -> Viterbi ---- */
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
  for(let l=2;l<=n;l<<=1){const a=-2*Math.PI/l,wr=Math.cos(a),wi=Math.sin(a),h=l>>1;
    for(let i=0;i<n;i+=l){let cr=1,ci=0;for(let j=0;j<h;j++){const u=i+j,v=u+h,tr=re[v]*cr-im[v]*ci,ti=re[v]*ci+im[v]*cr;re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
async function analyze2(file){
  st('Decoding audio…');
  const ac=new (window.AudioContext||window.webkitAudioContext)();
  const ab=await ac.decodeAudioData(await file.arrayBuffer());try{ac.close()}catch(e){}
  const k=Math.max(1,Math.round(ab.sampleRate/16000)),sr=ab.sampleRate/k,L=Math.floor(ab.length/k),ch=ab.numberOfChannels;
  const x=new Float32Array(L);
  for(let c=0;c<ch;c++){const d=ab.getChannelData(c);for(let i=0;i<L;i++){let s=0;for(let j=0;j<k;j++)s+=d[i*k+j];x[i]+=s/k/ch}}
  const deep=$('prec').value==='deep'&&ab.duration<600,N=2048,H=256,STEP=deep?10:20,B=deep?440:220,F=Math.max(0,Math.floor((L-N)/H)),FMIN=90,bh=sr/N,HN=deep?8:6;
  const win=new Float64Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/N);
  const pos=new Float32Array(B*HN),wt=new Float32Array(HN);for(let h=0;h<HN;h++)wt[h]=Math.pow(.8,h);
  for(let b=0;b<B;b++){const f=FMIN*Math.pow(2,b*STEP/1200);for(let h=0;h<HN;h++)pos[b*HN+h]=(h+1)*f/bh}
  const sal=new Float32Array(F*B),re=new Float64Array(N),im=new Float64Array(N),w=new Float32Array(N/2),mx=new Float32Array(F),cs=new Float32Array(N/2+1),ons=new Float32Array(F);
  for(let f=0;f<F;f++){
    if(f%60===0){st('Listening for swaras… '+Math.round(100*f/F)+'%');await new Promise(r=>setTimeout(r))}
    const o=f*H;for(let i=0;i<N;i++){re[i]=x[o+i]*win[i];im[i]=0}fft(re,im);
    {let E=0;for(let i=Math.floor(1500/bh);i<Math.floor(6500/bh);i++)E+=Math.sqrt(Math.hypot(re[i],im[i]));ons[f]=Math.log1p(E*6)}
    for(let i=0;i<N/2;i++)cs[i+1]=cs[i]+Math.sqrt(Math.hypot(re[i],im[i]));
    for(let i=0;i<N/2;i++){const a=Math.max(0,i-12),b=Math.min(N/2,i+13),v=Math.sqrt(Math.hypot(re[i],im[i]))-(cs[b]-cs[a])/(b-a);w[i]=v>0?v:0}
    let m=0;for(let b=0;b<B;b++){let s=0;for(let h=0;h<HN;h++){const p=pos[b*HN+h],i=Math.floor(p);if(i+1>=N/2)break;s+=wt[h]*(w[i]*(1-(p-i))+w[i+1]*(p-i))}sal[f*B+b]=s;if(s>m)m=s}
    mx[f]=m}
  const srt=Array.from(mx).sort((a,b)=>a-b),ref=srt[Math.floor(F*.9)]||1;
  st('Tracing the melody…');
  const R=deep?40:20,LAM=.02*STEP/20,bp=new Int8Array(F*B);let sc=new Float32Array(B),nx=new Float32Array(B);
  for(let b=0;b<B;b++)sc[b]=sal[b]/ref;
  for(let f=1;f<F;f++){
    if(f%300===0)await new Promise(r=>setTimeout(r));
    let mv=-1e9;
    for(let b=0;b<B;b++){let best=-1e9,bd=0;const lo=Math.max(0,b-R),hi=Math.min(B-1,b+R);
      for(let q=lo;q<=hi;q++){const v=sc[q]-LAM*Math.abs(q-b);if(v>best){best=v;bd=q-b}}
      nx[b]=best+sal[f*B+b]/ref;bp[f*B+b]=bd;if(nx[b]>mv)mv=nx[b]}
    for(let b=0;b<B;b++)nx[b]-=mv;
    const t=sc;sc=nx;nx=t}
  const path=new Int16Array(F);let bb=0;for(let b=1;b<B;b++)if(sc[b]>sc[bb])bb=b;
  for(let f=F-1;f>=0;f--){path[f]=bb;if(f>0)bb+=bp[f*B+bb]}
  const f0=new Float32Array(F);
  for(let f=0;f<F;f++){const b=path[f],s=sal[f*B+b];if(mx[f]<.3*ref||s<.3*ref)continue;
    const a=sal[f*B+Math.max(0,b-1)],c=sal[f*B+Math.min(B-1,b+1)],dn=a-2*s+c,dl=dn<0?Math.max(-.5,Math.min(.5,.5*(a-c)/dn)):0;
    f0[f]=FMIN*Math.pow(2,(b+dl)*STEP/1200)}
  D={f0,hop:H/sr,dur:ab.duration,ons};
}

/* ---- Taal: onset envelope -> beat period -> cycle length by autocorrelation of the accent pattern ---- */
const TALAS=[[6,'Dadra'],[7,'Rupak'],[8,'Keherwa'],[10,'Jhaptal'],[12,'Ektal'],[14,'Deepchandi'],[16,'Teentaal']];
function tala(D){
  if(D.tl!==undefined)return D.tl;const o=D.ons,F=o?o.length:0,hop=D.hop;D.tl=null;if(F<400)return null;
  const e=new Float32Array(F);
  for(let i=1;i<F;i++){let s=0,c=0;for(let j=Math.max(1,i-30);j<=Math.min(F-1,i+30);j+=3){s+=Math.max(0,o[j]-o[j-1]);c++}e[i]=Math.max(0,o[i]-o[i-1]-s/c)}
  const ac=l=>{let s=0;for(let i=0;i+l<F;i++)s+=e[i]*e[i+l];return s/(F-l)};
  const a0=ac(0)||1,lo=Math.round(.25/hop),hi=Math.round(1.3/hop);let bl=lo,bv=-1;
  for(let l=lo;l<=hi;l++){const bpm=60/(l*hop),v=ac(l)*Math.exp(-.5*Math.pow(Math.log2(bpm/105)/.9,2));if(v>bv){bv=v;bl=l}}
  const a=ac(bl-1),b=ac(bl),c=ac(bl+1),dn=a-2*b+c,P=bl+(dn<0?Math.max(-.5,Math.min(.5,.5*(a-c)/dn)):0);
  const A=[0];for(let k=1;k<=18;k++){let m=0;const lg=Math.round(k*P);for(let d=-2;d<=2;d++)if(lg+d>0)m=Math.max(m,ac(lg+d));A[k]=m/a0}
  const sc=TALAS.map(([n,nm])=>[n,nm,(A[n]-.9*Math.max(A[n-1],A[n+1]))*(1-.015*n)]).sort((x,y)=>y[2]-x[2]);
  const top=sc[0],sec=sc[1],conf=Math.max(0,Math.min(.9,(top[2]-sec[2])/Math.max(top[2],1e-6)))*Math.min(1,A[1]*4+.3);
  let p0=0,pb=-1;for(let ph=0;ph<P;ph+=P/24){let s=0;for(let k=0;ph+k*P<F-1;k++)s+=e[Math.round(ph+k*P)];if(s>pb){pb=s;p0=ph}}
  const acc=new Float32Array(top[0]);for(let k=0;p0+k*P<F-1;k++)acc[k%top[0]]+=e[Math.round(p0+k*P)];
  let sam=0;for(let j=1;j<acc.length;j++)if(acc[j]>acc[sam])sam=j;
  return D.tl={n:top[0],name:top[1],bpm:60/(P*hop),P:P*hop,p0:p0*hop,sam,conf};
}

/* ---------- 2. Sa + raag detection, swara quantisation, segmentation ---------- */
const wrap=v=>((v+600)%1200+1200)%1200-600;
function build(){
  if(!D)return;
  const {f0,hop}=D,N=f0.length,mid=new Float32Array(N).fill(NaN);
  for(let i=0;i<N;i++)if(f0[i]>0)mid[i]=69+12*Math.log2(f0[i]/440);
  const sm=mid.slice();
  for(let i=3;i<N-3;i++){if(isNaN(mid[i]))continue;const w=[];for(let j=-3;j<=3;j++)if(!isNaN(mid[i+j]))w.push(mid[i+j]);w.sort((a,b)=>a-b);sm[i]=w[w.length>>1]}
  for(let i=0;i<N;){if(isNaN(sm[i])){i++;continue}let j=i;while(j<N&&!isNaN(sm[j]))j++;if(j-i<5)for(let q=i;q<j;q++)sm[q]=NaN;i=j}
  let sx=0,sy=0,cnt=0;
  for(const m of sm)if(!isNaN(m)){sx+=Math.cos(2*Math.PI*m);sy+=Math.sin(2*Math.PI*m);cnt++}
  if(!cnt){st('No clear pitched singing found in this file.');return}
  const off=Math.atan2(sy,sx)/(2*Math.PI);              // tuning offset vs A440, in semitones
  const h=new Float32Array(12);let hc=0;                  // histogram of steady (non-gliding) pitch only
  const dwell=(a,b,H)=>{let c=0;for(let i=Math.max(0,a);i<b;){if(isNaN(sm[i])){i++;continue}let j=i+1;while(j<b&&!isNaN(sm[j])&&Math.abs(sm[j]-sm[i])<.3)j++;if(j-i>=.1/hop){H[((Math.round((sm[i]+sm[j-1])/2-off)%12)+12)%12]+=j-i;c+=j-i}i=j}return c};
  hc=dwell(0,N,h)||1;                                     // sustained notes only: glides and pass-through pitches are ignored
  const fh=new Float32Array(12);let fc=0;                 // where phrases come to rest = strong Sa evidence
  for(let i=0;i<N;){if(isNaN(sm[i])){i++;continue}let j=i;while(j<N&&!isNaN(sm[j]))j++;
    if(j-i>=.3/hop){const q=[];for(let k=j-Math.ceil(.12/hop);k<j;k++)q.push(sm[k]);q.sort((a,b)=>a-b);fh[((Math.round(q[q.length>>1]-off)%12)+12)%12]++;fc++}i=j}
  fc=fc||1;const fw=Math.min(1,fc/60);
  const dupPen=(h,hc,t,S)=>{let p=0;for(const [a,b] of [[1,2],[3,4],[8,9],[10,11]])if(S.includes(a)&&S.includes(b)){const x=h[(t+a)%12]/hc,y=h[(t+b)%12]/hc,mn=Math.min(x,y),mx=Math.max(x,y);if(mn<.5*mx)p+=1.2*mn}return p};   // a minor komal/shuddha twin is usually just flat singing
  const fixT=$('sa').value==='auto'?-1:+$('sa').value,fixR=$('raga').value;
  let bt=0,br='Bilawal',bs=-9;const cand=[];
  for(let t=0;t<12;t++){if(fixT>=0&&t!==fixT)continue;
    for(const r in RAGAS){if(fixR!=='auto'&&r!==fixR)continue;const S=RAGAS[r];let m=0;let miss=0;for(let s=0;s<12;s++){const p=h[(t+s)%12]/hc;if(S.includes(s)){m+=p;if(p<.004&&s!==0&&s!==7)miss++}}
      const sc=m-.014*S.length+.25*h[t]/hc+.15*h[(t+7)%12]/hc+fw*(.7*fh[t]/fc+.2*fh[(t+7)%12]/fc)+.5*h[(t+(VADI[r]||4))%12]/hc-dupPen(h,hc,t,S)-.04*miss;cand.push([t,r,sc]);if(sc>bs){bs=sc;bt=t;br=r}}}
    /* consensus: re-estimate Sa + raag in 8 independent slices of the song; agreement = confidence */
  const rank=(h,hc)=>{const out=[];for(let t=0;t<12;t++)for(const r in RAGAS){const S=RAGAS[r];let m=0,miss=0;for(let s=0;s<12;s++){const p=h[(t+s)%12]/hc;if(S.includes(s)){m+=p;if(p<.004&&s!==0&&s!==7)miss++}}out.push([t,r,m-.014*S.length+.25*h[t]/hc+.15*h[(t+7)%12]/hc+fw*(.7*fh[t]/fc+.2*fh[(t+7)%12]/fc)+.5*h[(t+(VADI[r]||4))%12]/hc-dupPen(h,hc,t,S)-.04*miss])}return out.sort((a,b)=>b[2]-a[2])};
  let agT=0,agR=0,nw=0;
  for(let w=0;w<8;w++){const a=Math.floor(N*w/8),b=Math.floor(N*(w+1)/8),hh=new Float32Array(12);const c=dwell(a,b,hh);
    if(c<60)continue;nw++;const top=rank(hh,c)[0];if(top[0]===bt)agT++;if(top[0]===bt&&top[1]===br)agR++}
  const rk=rank(h,hc),nxt=rk.find(c=>c[0]!==bt||c[1]!==br)||[0,0,0],mg=Math.min(1,Math.max(0,(rk[0][2]-nxt[2])/.05));
  const confSa=nw?.12+.87*agT/nw:.3,confRg=nw?.08+.5*agR/nw+.41*mg:.3;
  const allowed=RAGAS[br],cents=new Float32Array(N).fill(NaN),vc=[];
  for(let i=0;i<N;i++)if(!isNaN(sm[i])){cents[i]=(sm[i]-off-bt)*100;vc.push(cents[i])}
  vc.sort((a,b)=>a-b);let lo=vc[Math.floor(vc.length*.2)],hi=vc[Math.floor(vc.length*.8)];   // octave anchor: in a duet the higher voice defines madhya
  for(let it=0;it<12;it++){let a=0,na=0,b=0,nb=0;for(const v of vc){if(Math.abs(v-lo)<=Math.abs(v-hi)){a+=v;na++}else{b+=v;nb++}}if(na)lo=a/na;if(nb)hi=b/nb}
  const up=vc.filter(v=>v>(lo+hi)/2),anc=(hi-lo>=700&&up.length>=vc.length*.15&&vc.length-up.length>=vc.length*.15)?up[up.length>>1]:vc[vc.length>>1];
  const base=Math.floor(anc/1200)*1200-(+$('osh').value||0)*1200;   // median voice sits in madhya
  /* two-pass snapping: pass 1 snaps to just intonation, then each swara's centre is nudged to where THIS singer really sings it, pass 2 re-snaps */
  const JA=JC.slice();let key,dev;
  for(let pass=0;pass<2;pass++){
    key=new Int16Array(N).fill(-999);dev=new Float32Array(N);const ds=Array.from({length:12},()=>[]);
    for(let i=0;i<N;i++){if(isNaN(cents[i]))continue;
      const c=cents[i]-base,o=Math.floor(c/1200),r=c-1200*o;let bi=-1,bd=1e9;
      for(const s of allowed){const q=Math.abs(wrap(r-JA[s]));if(q<bd){bd=q;bi=s}}
      if(bd>75)for(let s=0;s<12;s++){const q=Math.abs(wrap(r-JA[s]));if(q<bd){bd=q;bi=s}}
      const df=wrap(r-JA[bi]);dev[i]=Math.abs(df);key[i]=(o+Math.floor((r-JA[bi]+600)/1200))*12+bi;
      if(pass===0&&bd<60&&i&&Math.abs(cents[i]-cents[i-1])<15)ds[bi].push(df)}
    if(pass===0)for(let s=0;s<12;s++)if(ds[s].length>40){ds[s].sort((a,b)=>a-b);JA[s]+=Math.max(-35,Math.min(35,ds[s][ds[s].length>>1]))}}
  const k2=key.slice();                                   // mode filter
  for(let i=3;i<N-3;i++){if(key[i]===-999)continue;const c={};let bk=key[i],bc=0;
    for(let j=-3;j<=3;j++){const v=key[i+j];if(v===-999)continue;c[v]=(c[v]||0)+1;if(c[v]>bc){bc=c[v];bk=v}}k2[i]=bk}
  let runs=[];for(let i=0;i<N;){if(k2[i]===-999){i++;continue}let j=i;while(j<N&&k2[j]===k2[i])j++;runs.push({k:k2[i],a:i,b:j});i=j}
  const fin=runs.map(r=>({...r}));                        // gamaka / vibrato smoothing
  for(let pass=0;pass<6;pass++){let ch=false;
    for(let i=0;i<fin.length;i++){const r=fin[i],p=fin[i-1],q=fin[i+1];
      if(i&&p.k===r.k&&r.a-p.b<=2){p.b=r.b;fin.splice(i,1);i--;ch=true;continue}
      if(r.b-r.a<5){const pa=p&&r.a-p.b<=2,qa=q&&q.a-r.b<=2;
        if(pa&&qa&&p.k===q.k){p.b=q.b;fin.splice(i,2);i--;ch=true}
        else if(pa&&(!qa||p.b-p.a>=q.b-q.a)){p.b=r.b;fin.splice(i,1);i--;ch=true}
        else if(qa){q.a=r.a;fin.splice(i,1);i--;ch=true}
        else{fin.splice(i,1);i--;ch=true}}}
    if(!ch)break}
  const notes=fin.map(r=>{let sd=0;for(let i=r.a;i<r.b;i++)sd+=Math.min(dev[i],90);return{key:r.k,sw:((r.k%12)+12)%12,oct:Math.floor(r.k/12),t0:r.a*hop,t1:r.b*hop,fa:r.a,fb:r.b,c:Math.max(0,1-sd/(r.b-r.a)/75)*Math.min(1,(r.b-r.a)*hop/.09)}}).filter(n=>n.c>=.3);
  let cw=0,cs2=0;notes.forEach(n=>{const d=n.t1-n.t0;cw+=n.c*d;cs2+=d});const sconf=cs2?cw/cs2:0;
  const phrases=[];notes.forEach((n,i)=>{const p=phrases[phrases.length-1];
    if(!p||n.t0-notes[i-1].t1>.3||p.notes.length>=12)phrases.push({notes:[n]});else p.notes.push(n);n.ph=phrases.length-1;n.idx=phrases[n.ph].notes.length-1});
  /* male / female: per-phrase median pitch, 2-means split; duet only if clearly two registers */
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[s.length>>1]};
  const vf=new Uint8Array(N);
  phrases.forEach(p=>{p.notes.forEach(n=>{const a=[];for(let i=n.fa;i<n.fb;i++)if(!isNaN(sm[i]))a.push(sm[i]);n.pm=a.length?med(a):60});p.pm=med(p.notes.map(n=>n.pm))});
  const pms=notes.map(n=>n.pm).sort((x,y)=>x-y);let cL=pms[Math.floor(pms.length*.2)],cH=pms[Math.floor(pms.length*.8)];
  for(let it=0;it<12;it++){let sl=0,nl=0,sh=0,nh=0;for(const v of pms){if(Math.abs(v-cL)<=Math.abs(v-cH)){sl+=v;nl++}else{sh+=v;nh++}}if(nl)cL=sl/nl;if(nh)cH=sh/nh}
  const mid2=(cL+cH)/2,duet=pms.length>=6&&cH-cL>=7&&pms.filter(v=>v>mid2).length>=pms.length*.15&&pms.filter(v=>v<=mid2).length>=pms.length*.15;
  const ov=$('voice').value,mAll=med(pms);
  const vconf=ov!=='auto'?1:duet?Math.min(.99,.35+.65*pms.filter(v=>Math.min(Math.abs(v-cL),Math.abs(v-cH))<3).length/pms.length*Math.min(1,(cH-cL)/12)):Math.min(.99,.5+Math.abs(mAll-55.2)/9);
  notes.forEach(n=>{n.v=ov!=='auto'?+ov:duet?(n.pm>mid2?1:0):(mAll>=55.2?1:0)});   // per-note voice, so a phrase can swap singers mid-way
  if(duet&&ov==='auto'&&notes.length>1){const K=notes.length,cost=[[0,0]],bk=[],em=(n,s)=>Math.abs(n.pm-(s?cH:cL))/3;   // sticky 2-state Viterbi: singers rarely swap mid-phrase
    cost[0]=[em(notes[0],0),em(notes[0],1)];
    for(let i=1;i<K;i++){const sw=notes[i].t0-notes[i-1].t1>.25?.6:2.5,c=[0,0],b=[0,0];
      for(let s=0;s<2;s++){const stay=cost[i-1][s],swp=cost[i-1][1-s]+sw;if(stay<=swp){c[s]=stay+em(notes[i],s);b[s]=s}else{c[s]=swp+em(notes[i],s);b[s]=1-s}}
      cost.push(c);bk.push(b)}
    let s=cost[K-1][1]<cost[K-1][0]?1:0;for(let i=K-1;i>=0;i--){notes[i].v=s;if(i>0)s=bk[i-1][s]}}
  phrases.forEach(p=>{p.v=p.notes[0].v});
  {const vs=new Int8Array(N).fill(-1);notes.forEach(n=>vs.fill(n.v,n.fa,n.fb));let lv=0;for(let i=0;i<N;i++){if(vs[i]>=0)lv=vs[i];vf[i]=lv}}
  const mass=new Float32Array(12);let tot=0;for(let i=0;i<N;i++)if(key[i]!==-999){mass[((key[i]%12)+12)%12]++;tot++}
  const used=[];for(let s=0;s<12;s++)if(allowed.includes(s)||mass[s]/tot>.015||notes.some(n=>n.sw===s))used.push(s);
  const octs=new Set([-1,0,1]);notes.forEach(n=>octs.add(n.oct));
  const rows=[];octs.forEach(o=>used.forEach(s=>rows.push({key:o*12+s,sw:s,oct:o,c:JC[s]+1200*o})));
  rows.sort((a,b)=>a.c-b.c);const ri=new Map(rows.map((r,i)=>[r.key,i]));
  const rs=new Float32Array(N).fill(NaN),hold=new Int16Array(N);
  for(let i=0;i<N;i++)if(k2[i]!==-999&&ri.has(k2[i])){rs[i]=ri.get(k2[i]);hold[i]=i&&k2[i-1]===k2[i]?hold[i-1]+1:1}
  const rs2=rs.slice();for(let i=1;i<N-1;i++)if(!isNaN(rs[i])&&!isNaN(rs[i-1])&&!isNaN(rs[i+1]))rs2[i]=(rs[i-1]+rs[i]+rs[i+1])/3;
  const tl=tala(D);M={hop,N,rs:rs2,hold,notes,phrases,rows,allowed,tonic:bt,raga:br,off,ri,vf,v0:phrases.length?phrases[0].v:0,duet,tl,conf:{sa:confSa,raga:confRg,swara:sconf,voice:vconf}};
  st(`Sa = ${NOTE[bt]} (${pc(confSa)})  ·  Raag ${rn(br)} (${pc(confRg)})\nTuning ${off>=0?'+':''}${Math.round(off*100)}¢ vs A440  ·  ${notes.length} swaras in ${phrases.length} phrases  ·  intonation fit ${pc(sconf)}\nVoice: ${ov!=='auto'?(+ov?'female':'male'):duet?'male + female duet':(mAll>=55.2?'female':'male')} (${pc(vconf)})\nTaal: ${tl?'~'+tl.name+' ('+tl.n+' matras) · '+Math.round(tl.bpm)+' BPM · '+pc(tl.conf):'not enough rhythm to estimate'}\nAlso close: ${cand.sort((a,b)=>b[2]-a[2]).slice(1,3).map(c=>NOTE[c[0]]+' '+c[1]).join('  ·  ')}`);
  $('play').disabled=$('seek').disabled=$('rec').disabled=$('exj').disabled=false;
}

/* ---------- 3. Rendering ---------- */
const nm=(sw,oct)=>SW[sw][0].replace('(k)','(K)').replace('(t)','(T)').toUpperCase()+(oct<0?','.repeat(-oct):oct>0?'′'.repeat(oct):'');
function ratio(sw,oct){let[a,b]=SW[sw][4];if(oct>0)a*=2**oct;else b*=2**-oct;const g=gcd(a,b);return(a/g)+' : '+(b/g)}
function glyph(sw,oct,x,y,sz,col,al=1){
  cx.save();cx.globalAlpha=al;cx.fillStyle=cx.strokeStyle=col;cx.font=`800 ${sz}px "Noto Sans Devanagari",sans-serif`;cx.textAlign='center';cx.textBaseline='alphabetic';
  cx.fillText(SW[sw][1],x,y);const w=cx.measureText(SW[sw][1]).width;cx.lineWidth=Math.max(2,sz/14);
  if(SW[sw][2]){cx.beginPath();cx.moveTo(x-w*.3,y+sz*.2);cx.lineTo(x+w*.3,y+sz*.2);cx.stroke()}
  if(SW[sw][3]){cx.beginPath();cx.moveTo(x+w*.36,y-sz*1.0);cx.lineTo(x+w*.46,y-sz*.78);cx.stroke()}
  if(oct)cx.beginPath(),cx.arc(x,oct<0?y+sz*.36:y-sz*.98,sz*.065,0,7),cx.fill();
  cx.restore();
}
const bs=(a,t)=>{let l=0,r=a.length-1,o=-1;while(l<=r){const m=(l+r)>>1;if(a[m].t0<=t){o=m;l=m+1}else r=m-1}return o};
function txt(s,x,y,sz,col,al=1,ali='center',ls=0){cx.save();cx.globalAlpha=al;cx.fillStyle=col;cx.font=`${sz}px "Space Mono",monospace`;cx.textAlign=ali;cx.textBaseline='middle';if('letterSpacing' in cx)cx.letterSpacing=ls+'px';cx.fillText(s,x,y);cx.restore()}
function draw(){
  const wave=$('mode').value==='wave',t=au.currentTime||0;
  cx.clearRect(0,0,720,1280);cx.fillStyle='#0a0f18';cx.fillRect(0,0,720,1280);
  cx.strokeStyle='rgba(120,150,190,.06)';cx.lineWidth=1;cx.beginPath();for(let i=0;i<=720;i+=160){cx.moveTo(i,0);cx.lineTo(i,1280)}for(let i=0;i<=1280;i+=160){cx.moveTo(0,i);cx.lineTo(720,i)}cx.stroke();
  {const T=($('title').value||'').toUpperCase();cx.save();cx.font='34px "Space Mono",monospace';if('letterSpacing' in cx)cx.letterSpacing='3px';const tw=cx.measureText(T).width;cx.restore();txt(T,360,125,Math.max(14,Math.min(34,34*640/Math.max(tw,1))),'#8a93a3',1,'center',3)}
  if(!M){txt('UPLOAD A SONG TO BEGIN',360,640,24,'#4a5568',1,'center',4);return}
  const hop=M.hop,fi=Math.min(M.N-1,Math.floor(t/hop)),ni=bs(M.notes,t),n=ni>=0?M.notes[ni]:null,PX=120,PXH=360;
  const live=n&&t<n.t1+1.2,VC=['#27e6d6','#ff3d8b'],AC=VC[live?n.v:M.v0];
  let tr=live?M.ri.get(n.key):cam;cam+=(tr-cam)*Math.min(1,(t-lastT>0&&t-lastT<.5?t-lastT:.016)*5);lastT=t;
  const Y=r=>520-(r-cam)*34;
  // legend
  txt('_ = KOMAL    ′ = TIVRA',636,202,15,'#6b7587',1,'right',1);
  if(live){const o=n.oct,tp=n.key===12;glyph(n.sw,o,500,238,22,tp?'#ff3d8b':'#9aa3b2');
    txt(tp?'TOP SA ↑':'= '+(o<0?'मंद्र · LOW':o>0?'तार · HIGH':'मध्य · MID'),636,228,15,tp?'#ff3d8b':'#6b7587',1,'right',1);
    if(n.sw===6)txt('TIVRA MA = '+M.raga.toUpperCase(),636,254,14,'#ff3d8b',1,'right',1)}
  // ladder
  cx.save();cx.beginPath();cx.rect(0,285,720,490);cx.clip();
  M.rows.forEach((r,i)=>{const y=Y(i),d=Math.abs(i-cam),a=Math.max(0,1-d/8.5),cur=live&&r.key===n.key,inR=M.allowed.includes(r.sw);if(a<=0)return;
    cx.globalAlpha=a;cx.strokeStyle=cur?'#ffffff':inR?'rgba(39,230,214,.35)':'rgba(125,135,153,.25)';cx.lineWidth=cur?2.2:1.2;
    cx.setLineDash(r.sw===6||SW[r.sw][2]&&!inR?[6,6]:[]);cx.beginPath();cx.moveTo(112,y);cx.lineTo(604,y);cx.stroke();cx.setLineDash([]);
    cx.fillStyle=inR?'#27e6d6':'#6b7587';cx.beginPath();cx.arc(623,y,cur?7:4,0,7);cx.fill();cx.globalAlpha=1;
    txt(SW[r.sw][0],66,y,15,cur?'#27e6d6':'#6b7587',a,'right',0);
    if(cur){cx.save();cx.shadowColor='#27e6d6';cx.shadowBlur=18;glyph(r.sw,r.oct,92,y+10,32,'#27e6d6');cx.restore()}else glyph(r.sw,r.oct,92,y+10,30,'#c9d1de',a)});
  // contour
  let pc=VC[0];cx.strokeStyle=cx.shadowColor=pc;cx.lineWidth=3.2;cx.lineJoin='round';cx.shadowBlur=12;cx.beginPath();
  let pen=false,hz=0;
  for(let f=Math.max(0,fi-Math.floor(3/hop));f<=fi;f++){const v=M.rs[f];if(isNaN(v)){pen=false;continue}
    const x=PXH-(t-f*hop)*PX;let y=Y(v);
    if(wave){const nn=M.rows[Math.round(v)],q=SW[nn.sw][4];hz=2.2*(q[0]/q[1])*2**nn.oct;y+=Math.min(1,Math.max(0,(M.hold[f]-12)/10))*6*Math.sin(2*Math.PI*hz*f*hop)}
    const vc2=VC[M.vf[f]];if(vc2!==pc){if(pen)cx.lineTo(x,y);cx.stroke();cx.beginPath();pc=vc2;cx.strokeStyle=cx.shadowColor=pc;pen=false}
    pen?cx.lineTo(x,y):cx.moveTo(x,y);pen=true}
  cx.stroke();cx.shadowBlur=0;
  // future ghosts
  for(let j=ni+1;j<M.notes.length&&M.notes[j].t0<t+3.5;j++){const g=M.notes[j],x=PXH+(g.t0-t)*PX,y=Y(M.ri.get(g.key));
    cx.strokeStyle=VC[g.v];cx.globalAlpha=.55;cx.lineWidth=1.4;cx.beginPath();cx.arc(x,y,6,0,7);cx.stroke();cx.globalAlpha=1}
  // playhead
  cx.strokeStyle='rgba(120,150,190,.18)';cx.beginPath();cx.moveTo(360,285);cx.lineTo(360,775);cx.stroke();
  if(live){const y=Y(M.ri.get(n.key)),age=t-n.t0;
    if(age<.5){cx.strokeStyle=AC;cx.globalAlpha=(1-age/.5)*.5;cx.lineWidth=2;cx.beginPath();cx.arc(360,y,14+age*140,0,7);cx.stroke();cx.globalAlpha=1}
    cx.fillStyle=AC;cx.shadowColor=AC;cx.shadowBlur=16;cx.beginPath();cx.arc(360,y,9,0,7);cx.fill();cx.shadowBlur=0;
    // repeat ×n
    let c=1,f=ni;while(f>0&&M.notes[f-1].key===n.key&&M.notes[f-1].ph===n.ph){f--;c++}
    if(c>1){const xa=PXH-(t-M.notes[f].t0)*PX+8,xb=360-10,ym=y-38;cx.strokeStyle='#e8edf5';cx.lineWidth=2;cx.beginPath();cx.moveTo(xa,ym+14);cx.quadraticCurveTo((xa+xb)/2,ym-14,xb,ym+14);cx.stroke();
      cx.fillStyle='#fff';[xa,xb].forEach(x=>{cx.beginPath();cx.arc(x,ym+16,6,0,7);cx.fill()});txt('×'+c,(xa+xb)/2,ym-26,19,AC,1,'center',0)}}
  cx.restore();
  // phrase
  if(live){const P=M.phrases[n.ph].notes,FS=54,G=24;cx.font=`800 ${FS}px "Noto Sans Devanagari",sans-serif`;
    const ws=P.map(q=>cx.measureText(SW[q.sw][1]).width+G),lines=[[]];let lw=0;
    P.forEach((q,i)=>{if(lw+ws[i]>640&&lines[lines.length-1].length){lines.push([]);lw=0}lines[lines.length-1].push(i);lw+=ws[i]});
    lines.forEach((ln,li)=>{const tw=ln.reduce((s,i)=>s+ws[i],0);let x=360-tw/2,y=868+li*78;
      ln.forEach(i=>{const q=P[i],cxm=x+ws[i]/2,cu=i===n.idx,on=i<=n.idx;
        cx.save();if(cu){cx.shadowColor='#fff';cx.shadowBlur=18}glyph(q.sw,q.oct,cxm,y,FS,on?'#ffffff':'#4b5361');cx.restore();
        if(cu){cx.strokeStyle=AC;cx.lineWidth=3;cx.shadowColor=AC;cx.shadowBlur=8;cx.beginPath();cx.moveTo(cxm-22,y+22);cx.lineTo(cxm+22,y+22);cx.stroke();cx.shadowBlur=0}x+=ws[i]})});
    const by=868+(lines.length-1)*78;
    txt(wave?nm(n.sw,n.oct)+' = '+ratio(n.sw,n.oct):'SWARAS  '+(n.idx+1)+' / '+P.length,360,by+100,26,'#8a93a3',1,'center',2)}
  // footer
  const a1=$('s1').value.trim(),a2=$('s2').value.trim(),c1=live&&n.v!==0?'#2a4d52':'#27e6d6',c2=live&&n.v!==1?'#5a2a40':'#ff3d8b';
  if(a1){cx.font='700 22px "Space Mono",monospace';const w1=cx.measureText(a1.toUpperCase()).width,w2=a2?cx.measureText(a2.toUpperCase()).width:0,tot=w1+(a2?w2+44:0);
    txt(a1.toUpperCase(),360-tot/2,1004,22,c1,1,'left',0);if(a2){txt('·',360-tot/2+w1+22,1004,22,'#4b5361');txt(a2.toUpperCase(),360-tot/2+w1+44,1004,22,c2,1,'left',0)}}
  txt('RAAG '+rn(M.raga).toUpperCase()+' · SA = '+NOTE[M.tonic],360,1042,19,'#6b7587',1,'center',1);
  if(M.tl){const T=M.tl,b=(t-T.p0)/T.P,bi=Math.floor(b),mi=((bi-T.sam)%T.n+T.n)%T.n,ph=b-bi;
    txt('TAAL '+T.name.toUpperCase()+' · '+T.n+' MATRA · '+Math.round(T.bpm)+' BPM',360,1082,17,'#6b7587',1,'center',1);
    const bw=Math.min(30,600/T.n),x0=360-T.n*bw/2;
    for(let i=0;i<T.n;i++){const on=i===mi;cx.globalAlpha=on?1-ph*.45:1;cx.fillStyle=on?'#ffffff':i===0?'#5a6475':'#1f2735';cx.fillRect(x0+i*bw+2,on?1100:1104,bw-4,on?16:8)}cx.globalAlpha=1;
    txt(mi===0?'SAM':String(mi+1),360,1140,17,mi===0?'#ff3d8b':'#8a93a3',1,'center',1)}
  txt($('hdl').value,360,1180,19,'#8a93a3',.9,'center',0);
  cx.strokeStyle='#27e6d6';cx.globalAlpha=.7;cx.lineWidth=2;cx.beginPath();cx.arc(62,1253,15,0,7);cx.stroke();cx.globalAlpha=1;cx.fillStyle='#ff3d8b';cx.beginPath();cx.arc(62,1253,5,0,7);cx.fill();
}
(function loop(){try{draw()}catch(e){console.error(e)}requestAnimationFrame(loop)})();

/* ---------- 4. Controls ---------- */
const VERSION='1.0';
let curFile=null;$('prec').onchange=()=>{if(!curFile)return;M=null;D=null;au.pause();$('play').disabled=$('seek').disabled=$('rec').disabled=$('exj').disabled=true;analyze2(curFile).then(build).catch(err=>st('Error: '+err.message))};
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;curFile=f;
  M=null;D=null;$('play').disabled=$('seek').disabled=$('rec').disabled=$('exj').disabled=true;au.pause();au.src=URL.createObjectURL(f);
  $('title').value=f.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
  try{await analyze2(f);build()}catch(err){st('Could not read that file: '+err.message)}};
['sa','raga','voice','osh'].forEach(i=>$(i).onchange=()=>{try{build()}catch(e){st(e.message)}});
$('play').onclick=()=>{au.paused?au.play():au.pause()};
au.onplay=()=>$('play').textContent='PAUSE';au.onpause=au.onended=()=>$('play').textContent='PLAY';
au.ontimeupdate=()=>{if(au.duration&&document.activeElement!==$('seek'))$('seek').value=1000*au.currentTime/au.duration};
$('seek').oninput=()=>{if(au.duration)au.currentTime=au.duration*$('seek').value/1000};

/* ---------- 5. Exports and shortcuts ---------- */
const download=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
const safeName=()=>(($('title').value||'dhun').replace(/[^\w\- ]+/g,'').trim()||'dhun');
$('exj').onclick=()=>{if(!M)return;
  const NAMES=SW.map(s=>s[0]);
  const out={app:'Dhun Swara Visualizer',version:VERSION,title:$('title').value,sa:NOTE[M.tonic],raag:M.raga,raagAlias:ALIAS[M.raga]||null,
    tuningCentsVsA440:Math.round(M.off*100),confidence:M.conf,
    taal:M.tl?{name:M.tl.name,matras:M.tl.n,bpm:Math.round(M.tl.bpm),confidence:M.tl.conf}:null,
    swaras:M.notes.map(n=>({start:+n.t0.toFixed(3),end:+n.t1.toFixed(3),swara:NAMES[n.sw],devanagari:SW[n.sw][1],octave:n.oct<0?'mandra':n.oct>0?'taar':'madhya',
      ratio:ratio(n.sw,n.oct),voice:n.v?'female':'male',confidence:+n.c.toFixed(2)}))};
  download(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),safeName()+'.swaras.json')};
let recorder=null;
$('rec').onclick=async()=>{
  if(recorder){recorder.stop();return}
  if(!M)return;
  if(!window.MediaRecorder){st('This browser cannot record video. Use Chrome, Edge or Firefox.');return}
  const stream=cv.captureStream(30);let withAudio=false;
  try{const as=(au.captureStream||au.mozCaptureStream).call(au);as.getAudioTracks().forEach(t=>{stream.addTrack(t);withAudio=true})}catch(e){}
  const mt=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  const chunks=[];recorder=new MediaRecorder(stream,mt?{mimeType:mt,videoBitsPerSecond:6e6}:{videoBitsPerSecond:6e6});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=()=>{au.pause();download(new Blob(chunks,{type:'video/webm'}),safeName()+'.webm');recorder=null;$('rec').textContent='EXPORT VIDEO';st('Video saved'+(withAudio?'.':' (no audio track: this browser cannot capture audio).'))};
  au.addEventListener('ended',()=>{if(recorder)recorder.stop()},{once:true});
  $('rec').textContent='STOP & SAVE';st('Recording in real time. It stops automatically when the song ends.');
  au.currentTime=0;try{await au.play()}catch(e){}
  recorder.start(1000)};
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=='range'&&e.target.type!=='button')return;
  if(e.code==='Space'){e.preventDefault();$('play').click()}
  else if(e.code==='ArrowRight'&&au.duration)au.currentTime=Math.min(au.duration,au.currentTime+5);
  else if(e.code==='ArrowLeft')au.currentTime=Math.max(0,au.currentTime-5)});

