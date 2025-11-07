import React, { useState } from "react";
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

    const digitMap = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
    };
    text = text.replace(/[০-৯]/g, (d) => digitMap[d] || d);

    const tokens = text.split(/(\s+|[.,!?;:])/);
    const processedTokens = tokens.map((token) => {
      if (/^[A-Za-z0-9.,!?;:'"()\-\s]+$/.test(token)) return token;

      const customMap = {
        "ভূপেন হাজৰিকা": "Bhupen Hazarika",
        "অসম": "Asom",
        "অসমীয়া": "Asomiya",
        "গুৱাহাটী": "Guwahati",
        "ভাৰত": "Bharot",
        "সংগীত": "Songeet",
        "জীৱন": "Jeevon",
        "প্ৰেম": "Prem",
        "শিক্ষক": "Sikhok",
        "জন": "Jon",
        "হাজৰিকা": "Hazarika",
      };
      for (const [as, en] of Object.entries(customMap)) {
        token = token.replace(new RegExp(as, "g"), en);
      }

      const map = {
        "অ": "o", "আ": "a", "ই": "i", "ঈ": "ee", "উ": "u", "ঊ": "oo",
        "ঋ": "ri", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
        "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
        "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "ny",
        "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
        "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
        "প": "p", "ফ": "ph", "ব": "b", "ভ": "bh", "ম": "m",
        "য": "y", "ৰ": "r", "ল": "l", "ৱ": "w", "শ": "sh",
        "ষ": "sh", "স": "s", "হ": "h",
        "ঁ": "n", "ং": "ng", "ঃ": "h",
        "া": "a", "ি": "i", "ী": "ee", "ু": "u", "ূ": "oo", "ৃ": "ri",
        "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
        "্": "", "ৎ": "t",
      };

      let output = "";
      for (let i = 0; i < token.length; i++) {
        const ch = token[i];
        const next = token[i + 1];
        if (ch === "ং" || ch === "ঁ") {
          if (next && "কখগঘঙ".includes(next)) output += "ng";
          else if (next && "চছজঝঞ".includes(next)) output += "nj";
          else if (next && "টঠডঢণ".includes(next)) output += "n";
          else output += "m";
          continue;
        }
        output += map[ch] || ch;
      }
      return output;
    });

    let output = processedTokens.join("");
    output = output
      .replace(/aa+/g, "a")
      .replace(/ii+/g, "i")
      .replace(/oo+/g, "o")
      .replace(/\s+/g, " ")
      .replace(/([,;:])/g, "$1 ")
      .replace(/([.?!])/g, "$1 ")
      .replace(/\s{2,}/g, " ")
      .trim();

    output = output.replace(/(^\w{1}|\.\s*\w{1})/g, (m) => m.toUpperCase());
    return output;
  };

  // Remove all Markdown formatting
  const cleanMarkdown = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")       // bold **
      .replace(/_(.*?)_/g, "$1")             // italics _
      .replace(/~~(.*?)~~/g, "$1")           // strikethrough ~~
      .replace(/`{1,3}(.*?)`{1,3}/g, "$1")   // inline code
      .replace(/!\[.*?\]\(.*?\)/g, "")       // images
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // links
      .replace(/^#+\s*(.*)$/gm, "$1")        // headers #
      .replace(/^>\s*(.*)$/gm, "$1")         // blockquotes
      .replace(/^[-*]\s+(.*)$/gm, "$1")      // unordered lists
      .replace(/^\d+\.\s+(.*)$/gm, "$1")     // ordered lists
      .replace(/\r\n|\r|\n/g, "\n")          // normalize newlines
      .trim();
  };

  const handleSearch = async () => {
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }

    setLoading(true);
    setError("");
    setResponseText("");
    setRomanizedText("");

    try {
      const API_KEY = "AIzaSyDtDSg2l_FtH_bfFGDV3H9NYCEeS4MXM1M"; // Replace with your Gemini key
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
      const requestBody = {
        contents: [{ parts: [{ text: `Write a detailed biography in ${language} about ${name}.` }] }],
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      const generatedText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";

      const cleanedText = cleanMarkdown(generatedText);

      setResponseText(cleanedText);

      if (language === "Assamese") {
        setRomanizedText(transliterateAssameseToEnglish(cleanedText));
      }

      setHistory((prev) => [
        { id: Date.now(), name, text: cleanedText, language },
        ...prev,
      ]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = () => {
    if (!responseText) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(responseText);
    utterance.lang = language === "Assamese" ? "as-IN" : "en-US";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeakEnglishAccent = () => {
    if (!responseText) return;
    stopSpeaking();
    const romanized = transliterateAssameseToEnglish(responseText);
    const utterance = new SpeechSynthesisUtterance(romanized);
    utterance.lang = "en-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleDownloadPDF = () => {
    if (!responseText) return;
    const doc = new jsPDF();
    doc.setFont("Helvetica", "normal");
    doc.text(`Biography of ${name} (${language})`, 10, 20);
    doc.text(responseText, 10, 30, { maxWidth: 180 });
    if (romanizedText)
      doc.text("\nRomanized:", 10, 40).text(romanizedText, 10, 50, { maxWidth: 180 });
    doc.save(`${name}_biography.pdf`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f8f3e7] via-[#fff8ef] to-[#fdf2e1] text-[#2b2b2b] flex flex-col items-center px-4 py-10">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#ff9933] via-[#e05a00] to-[#008000] drop-shadow-md">
        Assamese Biography Generator 🇮🇳
      </h1>

      <div className="w-full max-w-lg bg-white/70 backdrop-blur-md border border-[#ffd580]/60 rounded-3xl p-6 shadow-2xl">
        <input
          type="text"
          placeholder="Enter a famous name (e.g., Bhupen Hazarika)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 rounded-lg bg-[#fff9f0] border border-[#e5c07b]"
        />
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-medium text-[#444]">Select Language:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-[#fff9f0] border border-[#e5c07b] rounded-lg px-3 py-2"
          >
            <option>Assamese</option>
            <option>English</option>
          </select>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#ff9933] via-[#e05a00] to-[#008000] py-3 rounded-xl font-semibold text-white"
        >
          {loading ? "Generating..." : "Generate Biography"}
        </button>
        {error && <p className="text-red-500 text-center mt-3">{error}</p>}
      </div>

      {responseText && (
        <div className="mt-10 w-full max-w-3xl bg-[#fffaf3]/90 border border-[#ffd580]/50 rounded-3xl p-6 shadow-xl space-y-3">
          <h2 className="text-2xl font-bold text-[#e05a00] border-b border-[#ffd580] pb-2">
            Biography ({language})
          </h2>
          <p className="text-lg leading-relaxed whitespace-pre-line">{responseText}</p>
          {language === "Assamese" && romanizedText && (
            <div className="mt-4 p-3 bg-[#fff3e0] rounded-xl border border-[#ffd580] text-[#333]">
              <h3 className="text-md font-semibold text-[#e05a00] mb-1">Romanized:</h3>
              <p className="text-base leading-relaxed">{romanizedText}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {!isSpeaking ? (
              <>
                <button
                  onClick={handleSpeak}
                  className="flex-1 bg-[#008000] hover:bg-[#006400] py-2 rounded-lg text-white"
                >
                  🔊 Listen
                </button>
                {language === "Assamese" && (
                  <button
                    onClick={handleSpeakEnglishAccent}
                    className="flex-1 bg-[#0077b6] hover:bg-[#005f8a] py-2 rounded-lg text-white"
                  >
                    🔊 Listen (English Version)
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={stopSpeaking}
                className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg text-white font-semibold"
              >
                ⏹️ Stop Voice
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="flex-1 bg-[#e05a00] hover:bg-[#c94f00] py-2 rounded-lg text-white"
            >
              💾 Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
