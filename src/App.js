import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";

function App() {
  const [name, setName] = useState("");
  const [responseText, setResponseText] = useState("");
  const [romanizedText, setRomanizedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("Assamese");
  const [history, setHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const transliterateAssameseToEnglish = (text) => {
    if (!text) return "";
    const digitMap = { "০":"0","১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9" };
    text = text.replace(/[০-৯]/g, (d) => digitMap[d] || d);
    const tokens = text.split(/(\s+|[.,!?;:])/);
    const processedTokens = tokens.map((token) => {
      if (/^[A-Za-z0-9.,!?;:'"()\-\s]+$/.test(token)) return token;
      const customMap = { "ভূপেন হাজৰিকা":"Bhupen Hazarika","অসম":"Asom","অসমীয়া":"Asomiya","গুৱাহাটী":"Guwahati","ভাৰত":"Bharot" };
      for (const [as,en] of Object.entries(customMap)) token = token.replace(new RegExp(as,"g"),en);
      const map = {
        "অ":"o","আ":"a","ই":"i","ঈ":"ee","উ":"u","ঊ":"oo","ঋ":"ri","এ":"e","ঐ":"oi","ও":"o","ঔ":"ou",
        "ক":"k","খ":"kh","গ":"g","ঘ":"gh","ঙ":"ng","চ":"ch","ছ":"chh","জ":"j","ঝ":"jh","ঞ":"ny",
        "ট":"t","ঠ":"th","ড":"d","ঢ":"dh","ণ":"n","ত":"t","থ":"th","দ":"d","ধ":"dh","ন":"n",
        "প":"p","ফ":"ph","ব":"b","ভ":"bh","ম":"m","য":"y","ৰ":"r","ল":"l","ৱ":"w","শ":"sh","ষ":"sh","স":"s","হ":"h",
        "ঁ":"n","ং":"ng","ঃ":"h","া":"a","ি":"i","ী":"ee","ু":"u","ূ":"oo","ৃ":"ri","ে":"e","ৈ":"oi","ো":"o","ৌ":"ou",
        "্":"","ৎ":"t"
      };
      let output = "";
      for(let i=0;i<token.length;i++){
        const ch=token[i], next=token[i+1];
        if(ch==="ং"||ch==="ঁ"){output+=next&&"কখগঘঙ".includes(next)?"ng":next&&"চছজঝঞ".includes(next)?"nj":next&&"টঠডঢণ".includes(next)?"n":"m";continue;}
        output+=map[ch]||ch;
      }
      return output;
    });
    let output=processedTokens.join("").replace(/aa+/g,"a").replace(/ii+/g,"i").replace(/oo+/g,"o").replace(/\s+/g," ").trim();
    return output.replace(/(^\w{1}|\.\s*\w{1})/g,m=>m.toUpperCase());
  };

  const cleanMarkdown = (text) => {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g,"$1")
               .replace(/_(.*?)_/g,"$1")
               .replace(/~~(.*?)~~/g,"$1")
               .replace(/`{1,3}(.*?)`{1,3}/g,"$1")
               .replace(/!\[.*?\]\(.*?\)/g,"")
               .replace(/\[([^\]]+)\]\(([^)]+)\)/g,"$1")
               .replace(/^#+\s*(.*)$/gm,"$1")
               .replace(/^>\s*(.*)$/gm,"$1")
               .replace(/^[-*]\s+(.*)$/gm,"$1")
               .replace(/^\d+\.\s+(.*)$/gm,"$1")
               .trim();
  };

  const handleSearch = async () => {
    if (!name.trim()) { setError("Please enter a name."); return; }
    setLoading(true); setError(""); setResponseText(""); setRomanizedText("");
    try {
      const API_KEY="AIzaSyDtDSg2l_FtH_bfFGDV3H9NYCEeS4MXM1M";
      const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
      const body={contents:[{parts:[{text:`Write a detailed biography in ${language} about ${name}.`}]}]};
      const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await res.json();
      const text=data?.candidates?.[0]?.content?.parts?.[0]?.text||"No response received.";
      const cleaned=cleanMarkdown(text);
      setResponseText(cleaned);
      if(language==="Assamese") setRomanizedText(transliterateAssameseToEnglish(cleaned));
      setHistory(prev=>[{id:Date.now(), name, text:cleaned, language}, ...prev]);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = () => {
    if(!responseText) return;
    stopSpeaking();
    const u=new SpeechSynthesisUtterance(responseText);
    u.lang=language==="Assamese"?"as-IN":"en-US";
    u.onstart=()=>setIsSpeaking(true);
    u.onend=()=>setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const handleSpeakEnglishAccent=()=>{
    if(!responseText) return;
    stopSpeaking();
    const u=new SpeechSynthesisUtterance(transliterateAssameseToEnglish(responseText));
    u.lang="en-IN"; u.rate=0.9; u.pitch=1;
    u.onstart=()=>setIsSpeaking(true);
    u.onend=()=>setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const handleDownloadPDF=()=>{
    if(!responseText) return;
    const doc=new jsPDF();
    doc.setFont("Helvetica","normal");
    doc.text(`Biography of ${name} (${language})`,10,20);
    doc.text(responseText,10,30,{maxWidth:180});
    if(romanizedText) doc.text("\nRomanized:",10,40).text(romanizedText,10,50,{maxWidth:180});
    doc.save(`${name}_biography.pdf`);
  };

  /* --------------------------- PARTICLE BACKGROUND --------------------------- */
  useEffect(() => {
    const canvas=document.getElementById("particles");
    const ctx=canvas.getContext("2d");
    let particles=[];
    const w=canvas.width=window.innerWidth;
    const h=canvas.height=window.innerHeight;
    for(let i=0;i<80;i++){particles.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*2+1,dx:(Math.random()-0.5)*0.5,dy:(Math.random()-0.5)*0.5})}
    const animate=()=>{
      ctx.clearRect(0,0,w,h);
      particles.forEach(p=>{
        p.x+=p.dx; p.y+=p.dy;
        if(p.x<0||p.x>w)p.dx*=-1;
        if(p.y<0||p.y>h)p.dy*=-1;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle="rgba(255,255,255,0.3)";
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
    window.addEventListener("resize",()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;});
  }, []);

  /* --------------------------- RENDER --------------------------- */
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#2a5368] to-[#0f2027] flex flex-col items-center px-4 py-10 text-white">
      <canvas id="particles" className="absolute top-0 left-0 w-full h-full z-0"></canvas>

      <h1 className="text-5xl md:text-6xl font-extrabold mb-10 text-center drop-shadow-xl animate-fadeIn">
       Assamese Biography Generator
      </h1>

      {/* Input Card */}
      <div className="relative z-10 w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-lg p-8 animate-fadeIn hover:scale-105 transition-transform duration-500">
        <input
          type="text"
          placeholder="Enter a name (e.g., Bhupen Hazarika)"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          className="w-full px-4 py-3 mb-5 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 outline-none"
        />
        <div className="flex justify-between items-center mb-6">
          <label className="text-white/90 font-medium">Language</label>
          <select value={language} onChange={(e)=>setLanguage(e.target.value)} className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white">
            <option className="text-black">Assamese</option>
            <option className="text-black">English</option>
          </select>
        </div>
        <button onClick={handleSearch} disabled={loading} className="w-full py-3 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-lg font-semibold hover:shadow-glow transition-shadow">
          {loading?"Generating...":"Generate Biography"}
        </button>
        {error && <p className="text-red-400 text-center mt-4">{error}</p>}
      </div>

      {/* Output Card */}
      {responseText && (
        <div className="relative z-10 mt-10 w-full max-w-3xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 animate-fadeIn hover:scale-105 transition-transform duration-500">
          <h2 className="text-3xl font-bold mb-4 border-b border-white/30 pb-2">Biography ({language})</h2>
          <p className="whitespace-pre-line leading-relaxed text-white/90 text-lg">{responseText}</p>

          {language==="Assamese" && romanizedText && (
            <div className="mt-6 p-4 rounded-xl bg-white/5 backdrop-blur-lg border border-white/30">
              <h3 className="text-xl font-semibold mb-2">Romanized</h3>
              <p>{romanizedText}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col md:flex-row gap-4">
            {!isSpeaking ? (
              <>
                <button onClick={handleSpeak} className="flex-1 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:shadow-glow transition-shadow">🔊 Listen</button>
                {language==="Assamese" && <button onClick={handleSpeakEnglishAccent} className="flex-1 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:shadow-glow transition-shadow">🔊 English Accent</button>}
              </>
            ) : (
              <button onClick={stopSpeaking} className="flex-1 py-3 bg-red-500/70 backdrop-blur-md rounded-xl hover:bg-red-600 transition-colors">⏹ Stop</button>
            )}
            <button onClick={handleDownloadPDF} className="flex-1 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:shadow-glow transition-shadow">💾 Download PDF</button>
          </div>
        </div>
      )}

      {/* History Panel */}
      {history.length>0 && (
        <div className="relative z-10 mt-10 w-full max-w-3xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-lg p-6 animate-fadeIn">
          <h3 className="text-2xl font-bold mb-4">Search History</h3>
          <div className="max-h-64 overflow-y-auto space-y-4">
            {history.map(h=>(
              <div key={h.id} className="p-3 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10 transition-colors">
                <p className="font-semibold">{h.name} ({h.language})</p>
                <p className="text-sm text-white/70 truncate">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tailwind Animations */}
      <style>{`
        .animate-fadeIn { animation: fadeIn 1s ease forwards; opacity:0; }
        @keyframes fadeIn { to { opacity:1; } }
        .hover\\:shadow-glow:hover { box-shadow: 0 0 15px 3px rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}

export default App;
