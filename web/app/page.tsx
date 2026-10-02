"use client";

import { useEffect, useMemo, useState } from "react";
import Camera from "@/components/Camera";

type Preset = "subtle" | "balanced" | "creative";

const styles = [
  { id:"cartoon", title:"Cartoon", image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", prompt:"A colorful cartoon-style illustration of the original photo, highly stylized, bold outlines, flat colors, playful animation aesthetic." },
  { id:"gogh", title:"Van Gogh", image:"https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=80", prompt:"An expressive post-impressionist painting of the original photo in the style of Vincent van Gogh, vibrant brush strokes, swirling textures, oil painting." },
  { id:"watercolor", title:"Watercolor", image:"https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=900&q=80", prompt:"A soft watercolor painting version of the original photo, pastel tones, light brush strokes, expressive paper texture." },
  { id:"storybook", title:"Storybook", image:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80", prompt:"Transform the original photo into a whimsical fairytale storybook animated scene, magical lighting, expressive forms, vibrant colors. Keep people recognizable and poses intact." },
  { id:"anime", title:"Anime", image:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", prompt:"Transform the original photo into a Japanese anime-style illustration, vibrant colors, clean lines, dynamic shading and cinematic background. Keep people recognizable and poses intact." },
  { id:"winter", title:"Winter", image:"https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=900&q=80", prompt:"Transform the original photo into a magical winter scene, falling snow, frosty trees, cool color palette, soft lighting and peaceful winter atmosphere. Keep people recognizable and poses intact." },
];

const presets: Record<Preset,{strength:number; guidance:number; label:string; description:string}> = {
  subtle:{strength:.30,guidance:5.5,label:"Subtle",description:"Keeps the original photo recognizable"},
  balanced:{strength:.45,guidance:6.5,label:"Balanced",description:"A clear transformation with familiar composition"},
  creative:{strength:.60,guidance:7.5,label:"Creative",description:"Lets AI reinterpret more of the scene"},
};

const Arrow = ({back=false}:{back?:boolean}) => <span aria-hidden>{back ? "←" : "→"}</span>;

const photoSimilarityLabel = (value:number) =>
  value <= .33 ? "Lijkt veel op de foto" : value <= .55 ? "Een beetje anders" : "Heel anders";

const artisticLabel = (value:number) =>
  value <= 5 ? "Rustig" : value <= 9 ? "Kunstig" : "Heel kunstig";

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

  const labels=["Photo","Style","Adjust","Result"];

  if(fullscreenResult && generatedPhoto){
    return <main className="fullscreen-result" onClick={()=>setFullscreenResult(false)}>
      <button className="fullscreen-close" onClick={()=>setFullscreenResult(false)} aria-label="Close fullscreen">×</button>
      <img src={generatedPhoto} alt="AI generated result fullscreen"/>
      <div className="fullscreen-hint"><strong>Take a photo of your creation</strong><span>Tap anywhere to go back</span></div>
    </main>;
  }

  if(step===4 && originalPhoto && generatedPhoto){
    return <main className="result-page">
      <header className="topbar"><div className="brand"><span className="brand-mark">AI</span><span>DataLab <b>AI Artist</b></span></div><button className="ghost-btn" onClick={reset}>Start over ↻</button></header>
      <section className="result-shell">
        <div className="result-heading"><div><span className="eyebrow">CREATION COMPLETE</span><h1>Your image is ready</h1><p>{selected?.title} · {presets[preset].label} transformation</p></div></div>
        <div className="comparison-grid">
          <figure><div className="image-label">Original</div><img src={originalPhoto} alt="Original photo"/></figure>
          <figure><div className="image-label accent">AI generated</div><img src={generatedPhoto} alt="AI generated result"/></figure>
        </div>
        <div className="result-actions"><button className="secondary-btn" onClick={()=>setStep(3)}>← Edit settings</button><button className="primary-btn" onClick={()=>setFullscreenResult(true)}>View fullscreen ⛶</button><button className="secondary-btn" onClick={downloadResult}>Download image ↓</button><button className="secondary-btn" onClick={reset}>New photo</button></div>
      </section>
    </main>;
  }

  return <main className="studio">
    <section className="preview-panel">
      <div className="preview-top"><div className="brand brand-light"><span className="brand-mark">AI</span><span>DataLab <b>AI Artist</b></span></div><span className="live-pill"><i/> {photo?"PHOTO READY":"LIVE CAMERA"}</span></div>
      <div className="preview-frame">
        {!photo ? <Camera stopCamera={stopCamera}/> : <img src={photo} alt="Captured photo" className="captured"/>}
        {loading && <div className="generation-overlay"><div className="loader"/><strong>Creating your {selected?.title} image…</strong><span>Transforming your photo with AI</span></div>}
      </div>
      <div className="preview-caption">{photo ? <><span>Captured photo</span><button onClick={reset}>Retake photo</button></> : <><span>Position your subject inside the frame</span><span>Camera preview</span></>}</div>
    </section>

    <aside className="control-panel">
      <div className="stepper">{labels.map((label,i)=>{const n=i+1; const active=step===n; const done=step>n; return <div className={"step "+(active?"active ":"")+(done?"done":"")} key={label}><span>{done?"✓":String(n).padStart(2,"0")}</span><small>{label}</small></div>})}</div>

      <div className="control-content">
        {step===1 && <div className="screen-block"><span className="eyebrow">STEP 01</span><h1>Turn a photo into art.</h1><p className="lead">Take a photo to start creating a unique AI transformation.</p><div className="tip-card"><span className="tip-icon">◎</span><div><b>For the best result</b><p>Use a clear, well-lit scene and keep the camera steady.</p></div></div></div>}

        {step===2 && <div className="screen-block"><span className="eyebrow">STEP 02</span><h1>Choose a style</h1><p className="lead">Pick the visual direction for your transformation.</p><div className="style-grid">{styles.map(s=><button key={s.id} className={"style-card "+(selectedId===s.id?"selected":"")} onClick={()=>setSelectedId(s.id)}><div className="style-art"><img src={s.image} alt={s.title+" style reference"} loading="lazy"/></div><div><b>{s.title}</b><small>{s.id==="winter"?"Scene effect":"Art style"}</small></div>{selectedId===s.id&&<i className="check">✓</i>}</button>)}</div></div>}

        {step===3 && <div className="screen-block"><span className="eyebrow">STEP 03</span><h1>How creative should AI be?</h1><p className="lead">Choose how closely the result should follow your original photo.</p><div className="preset-list">{(Object.keys(presets) as Preset[]).map(key=><button key={key} onClick={()=>choosePreset(key)} className={"preset-card "+(preset===key?"selected":"")}><span className="preset-dot"/><div><b>{presets[key].label}</b><small>{presets[key].description}</small></div>{preset===key&&<span className="preset-check">✓</span>}</button>)}</div><button className="advanced-toggle" onClick={()=>setAdvanced(!advanced)}>Advanced settings <span>{advanced?"−":"+"}</span></button>{advanced&&<div className="advanced-box"><label><span>Hoe erg gaat het op de foto lijken? <b>{strength.toFixed(2)} · {photoSimilarityLabel(strength)}</b></span><input type="range" min="0" max="1" step=".01" value={strength} onChange={e=>setStrength(+e.target.value)}/></label><label><span>Hoe kunstig gaat het worden? <b>{guidanceScale.toFixed(1)} · {artisticLabel(guidanceScale)}</b></span><input type="range" min="1" max="15" step=".1" value={guidanceScale} onChange={e=>setGuidanceScale(+e.target.value)}/></label></div>}</div>}
      </div>

      <div className="bottom-actions">
        {step===1 ? <button className="primary-btn" onClick={getPhoto}>Take photo <span>◎</span></button> :
        <><button className="back-btn" onClick={()=>setStep(step-1)}><Arrow back/> Back</button>{step===2?<button disabled={!selectedId} className="primary-btn" onClick={()=>setStep(3)}>Continue <Arrow/></button>:<button disabled={loading} className="primary-btn generate" onClick={generate}>{loading?"Creating…":"Create image"} <span>✦</span></button>}</>}
      </div>
    </aside>
  </main>;
}
