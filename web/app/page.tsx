"use client";

import { useEffect, useMemo, useState } from "react";
import Camera from "@/components/Camera";

type Preset = "subtle" | "balanced" | "creative";

const styles = [
  { id:"cartoon", title:"Cartoon", image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", prompt:"A colorful cartoon-style illustration of the original photo, highly stylized, bold outlines, flat colors, playful animation aesthetic." },
  { id:"gogh", title:"Van Gogh", image:"https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=80", prompt:"An expressive post-impressionist painting of the original photo in the style of Vincent van Gogh, vibrant brush strokes, swirling textures, oil painting." },
  { id:"watercolor", title:"Aquarel", image:"https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=900&q=80", prompt:"A soft watercolor painting version of the original photo, pastel tones, light brush strokes, expressive paper texture." },
  { id:"storybook", title:"Sprookjesboek", image:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80", prompt:"Transform the original photo into a whimsical fairytale storybook animated scene, magical lighting, expressive forms, vibrant colors. Keep people recognizable and poses intact." },
  { id:"anime", title:"Anime", image:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", prompt:"Transform the original photo into a Japanese anime-style illustration, vibrant colors, clean lines, dynamic shading and cinematic background. Keep people recognizable and poses intact." },
  { id:"winter", title:"Winter", image:"https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=900&q=80", prompt:"Transform the original photo into a magical winter scene, falling snow, frosty trees, cool color palette, soft lighting and peaceful winter atmosphere. Keep people recognizable and poses intact." },
];

const presets: Record<Preset,{strength:number; guidance:number; label:string; description:string}> = {
  subtle:{strength:.40,guidance:11.0,label:"Subtiel",description:"Houdt de originele foto goed herkenbaar"},
  balanced:{strength:.45,guidance:7.5,label:"Gebalanceerd",description:"Een duidelijke verandering, maar de foto blijft herkenbaar"},
  creative:{strength:.75,guidance:3.5,label:"Creatief",description:"Geeft AI meer vrijheid om de foto te veranderen"},
};

const Arrow = ({back=false}:{back?:boolean}) => <span aria-hidden>{back ? "←" : "→"}</span>;

export default function Home() {
  const [photo,setPhoto]=useState<string|null>(null);
  const [originalPhoto,setOriginalPhoto]=useState<string|null>(null);
  const [generatedPhoto,setGeneratedPhoto]=useState<string|null>(null);
  const [selectedId,setSelectedId]=useState("");
  const [strength,setStrength]=useState(.45);
  const [guidanceScale,setGuidanceScale]=useState(6.5);
  const [preset,setPresetState]=useState<Preset>("balanced");
  const [advanced,setAdvanced]=useState(false);
  const [step,setStep]=useState(1);
  const [stopCamera,setStopCamera]=useState(false);
  const [loading,setLoading]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [fullscreenResult,setFullscreenResult]=useState(false);
  const selected=useMemo(()=>styles.find(s=>s.id===selectedId),[selectedId]);

  useEffect(()=>setMounted(true),[]);

  const reset=()=>{
    setPhoto(null); setOriginalPhoto(null); setGeneratedPhoto(null); setSelectedId("");
    setStopCamera(false); setLoading(false); setFullscreenResult(false); setPresetState("balanced");
    setStrength(.45); setGuidanceScale(6.5); setStep(1);
  };

  const getPhoto=async()=>{
    try{
      const response=await fetch("http://localhost:5000/take_photo");
      if(!response.ok) throw new Error("Photo capture failed");
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      setPhoto(url); setOriginalPhoto(url); setStopCamera(true); setStep(2);
    }catch(error){ console.error(error); }
  };

  const choosePreset=(key:Preset)=>{
    setPresetState(key); setStrength(presets[key].strength); setGuidanceScale(presets[key].guidance);
  };

  const generate=async()=>{
    if(!photo||!selected) return;
    setLoading(true);
    try{
      const blob=await fetch(photo).then(r=>r.blob());
      const formData=new FormData();
      formData.append("image",blob,"captured_image.jpg");
      formData.append("tags",selected.prompt);
      formData.append("strength",strength.toString());
      formData.append("guidance_scale",guidanceScale.toString());
      const response=await fetch("http://localhost:5000/generate_image",{method:"POST",body:formData});
      if(!response.ok) throw new Error("Generation failed");
      const imageBlob=await response.blob();
      setGeneratedPhoto(URL.createObjectURL(imageBlob));
      setStep(4);
    }catch(error){ console.error(error); }
    finally{ setLoading(false); }
  };

  const downloadResult=()=>{
    if(!generatedPhoto) return;
    const a=document.createElement("a"); a.href=generatedPhoto; a.download="datalab-ai-artist.jpg"; a.click();
  };

  if(!mounted) return null;

  const labels=["Foto","Stijl","Aanpassen","Resultaat"];

  if(fullscreenResult && generatedPhoto){
    return <main className="fullscreen-result" onClick={()=>setFullscreenResult(false)}>
      <button className="fullscreen-close" onClick={()=>setFullscreenResult(false)} aria-label="Volledig scherm sluiten">×</button>
      <img src={generatedPhoto} alt="Door AI gemaakt resultaat, volledig scherm"/>
      <div className="fullscreen-hint"><strong>Maak een foto van je creatie</strong><span>Klik ergens om terug te gaan</span></div>
    </main>;
  }

  if(step===4 && originalPhoto && generatedPhoto){
    return <main className="result-page">
      <header className="topbar"><div className="brand"><span className="brand-mark hva-mark" aria-hidden><img src="./favicon.ico" alt=""/></span><span><b>HvA</b> DataLab <b>AI-Artist</b></span></div><button className="ghost-btn" onClick={reset}>Opnieuw beginnen ↻</button></header>
      <section className="result-shell">
        <div className="result-heading"><div><span className="eyebrow">CREATIE KLAAR</span><h1>Je afbeelding is klaar</h1><p>{selected?.title} · {presets[preset].label} transformatie</p></div></div>
        <div className="comparison-grid">
          <figure><div className="image-label">Origineel</div><img src={originalPhoto} alt="Originele foto"/></figure>
          <figure><div className="image-label accent">Door AI gemaakt</div><img src={generatedPhoto} alt="Door AI gemaakt resultaat"/></figure>
        </div>
        <div className="result-actions"><button className="secondary-btn" onClick={()=>setStep(3)}>← Instellingen aanpassen</button><button className="primary-btn" onClick={()=>setFullscreenResult(true)}>Volledig scherm ⛶</button><button className="secondary-btn" onClick={downloadResult}>Afbeelding downloaden ↓</button><button className="secondary-btn" onClick={reset}>Nieuwe foto</button></div>
      </section>
    </main>;
  }

  return <main className="studio">
    <section className="preview-panel">
      <div className="preview-top"><div className="brand brand-light"><span className="brand-mark hva-mark" aria-hidden><img src="./favicon.ico" alt=""/></span><span><b>HvA</b> DataLab <b>AI-Artist</b></span></div><span className="live-pill"><i/> {photo?"FOTO KLAAR":"LIVE CAMERA"}</span></div>
      <div className="preview-frame">
        {!photo ? <Camera stopCamera={stopCamera}/> : <img src={photo} alt="Gemaakte foto" className="captured"/>}
        {loading && <div className="generation-overlay"><div className="loader"/><strong>Je {selected?.title}-afbeelding wordt gemaakt…</strong><span>Je foto wordt met AI omgezet</span></div>}
      </div>
      <div className="preview-caption">{photo ? <><span>Gemaakte foto</span><button onClick={reset}>Nieuwe foto maken</button></> : <><span>Zorg dat je onderwerp goed in beeld staat</span><span>Cameravoorbeeld</span></>}</div>
    </section>

    <aside className="control-panel">
      <div className="stepper">{labels.map((label,i)=>{const n=i+1; const active=step===n; const done=step>n; return <div className={"step "+(active?"active ":"")+(done?"done":"")} key={label}><span>{done?"✓":String(n).padStart(2,"0")}</span><small>{label}</small></div>})}</div>

      <div className="control-content">
        {step===1 && <div className="screen-block"><span className="eyebrow">STAP 01</span><h1>Maak kunst van een foto.</h1><p className="lead">Maak een foto om een unieke AI-transformatie te starten.</p><div className="tip-card"><span className="tip-icon">◎</span><div><b>Voor het beste resultaat</b><p>Zorg voor voldoende licht en houd de camera stil.</p></div></div></div>}

        {step===2 && <div className="screen-block"><span className="eyebrow">STAP 02</span><h1>Kies een stijl</h1><p className="lead">Kies de visuele richting voor je transformatie.</p><div className="style-grid">{styles.map(s=><button key={s.id} className={"style-card "+(selectedId===s.id?"selected":"")} onClick={()=>setSelectedId(s.id)}><div className="style-art"><img src={s.image} alt={s.title+" stijlreferentie"} loading="lazy"/></div><div><b>{s.title}</b><small>{s.id==="winter"?"Sfeereffect":"Kunststijl"}</small></div>{selectedId===s.id&&<i className="check">✓</i>}</button>)}</div></div>}

        {step===3 && <div className="screen-block"><span className="eyebrow">STAP 03</span><h1>Hoe creatief mag AI zijn?</h1><p className="lead">Kies hoeveel het resultaat op je originele foto moet blijven lijken.</p><div className="preset-list">{(Object.keys(presets) as Preset[]).map(key=><button key={key} onClick={()=>choosePreset(key)} className={"preset-card "+(preset===key?"selected":"")}><span className="preset-dot"/><div><b>{presets[key].label}</b><small>{presets[key].description}</small></div>{preset===key&&<span className="preset-check">✓</span>}</button>)}</div><div className="closeup-warning"><b>Close-up van een gezicht?</b><span>Bij close-ups kan AI gezichten soms onnatuurlijk maken. Voor de beste resultaten adviseren we <strong>foto overnemen onder 3.5</strong> en <strong>kunstigheid vanaf 0.75</strong>.</span></div><button className="advanced-toggle" onClick={()=>setAdvanced(!advanced)}>Geavanceerde instellingen <span>{advanced?"−":"+"}</span></button>{advanced&&<div className="advanced-box"><label><span>Hoe erg gaat het op de foto lijken? <b>{guidanceScale.toFixed(1)} · {guidanceScale >= 10 ? "Lijkt veel op de foto" : guidanceScale >= 6 ? "Blijft redelijk herkenbaar" : "Mag veel veranderen"}</b></span><input type="range" min="1" max="15" step=".1" value={guidanceScale} onChange={e=>setGuidanceScale(+e.target.value)}/></label><label><span>Hoe kunstig gaat het worden? <b>{strength.toFixed(2)} · {strength <= .4 ? "Rustig" : strength <= .7 ? "Kunstig" : "Heel kunstig"}</b></span><input type="range" min="0" max="1" step=".01" value={strength} onChange={e=>setStrength(+e.target.value)}/></label></div>}</div>}
      </div>

      <div className="bottom-actions">
        {step===1 ? <button className="primary-btn" onClick={getPhoto}>Foto maken <span>◎</span></button> :
        <><button className="back-btn" onClick={()=>setStep(step-1)}><Arrow back/> Terug</button>{step===2?<button disabled={!selectedId} className="primary-btn" onClick={()=>setStep(3)}>Verder <Arrow/></button>:<button disabled={loading} className="primary-btn generate" onClick={generate}>{loading?"Bezig met maken…":"Afbeelding maken"} <span>✦</span></button>}</>}
      </div>
    </aside>
  </main>;
}
