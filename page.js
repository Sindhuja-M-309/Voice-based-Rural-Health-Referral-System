"use client";
import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { 
  Mic, MicOff, AlertTriangle, 
  Share2, ShieldAlert, Stethoscope, HeartPulse, Send,
  PhoneCall, History, Globe, Download, Volume2, UserCheck, ShieldCheck,
  MessageSquare, MapPin, Radio
} from "lucide-react";

export default function AshaReferralApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralData, setReferralData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [recognition, setRecognition] = useState(null);
  
  // App States
  const [language, setLanguage] = useState("ta");
  const [savedRecords, setSavedRecords] = useState([]);
  const [abhaId, setAbhaId] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Get User GPS Location on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Location access skipped", err)
      );
    }

    const history = localStorage.getItem("asha_referral_history");
    if (history) {
      try {
        setSavedRecords(JSON.parse(history));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language === "ta" ? "ta-IN" : "en-IN";

      rec.onresult = (event) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);

      setRecognition(rec);
    }
  }, [language]);

  const toggleRecording = () => {
    if (!recognition) {
      alert(language === "ta" ? "பேச்சை உணரும் தொழில் நுட்பம் இல்லை." : "Speech recognition not supported.");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setReferralData(null);
      setQrCodeUrl("");
      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const processVoiceData = async () => {
    if (!transcript.trim()) {
      alert(language === "ta" ? "தயவுசெய்து விவரங்களை பேசவும்." : "Please speak or type details first.");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch("/api/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, abhaId }),
      });

      const res = await response.json();
      if (res.success) {
        const fullData = { ...res.data, abha_id: abhaId || res.data.patient_info?.abha_id || "N/A" };
        setReferralData(fullData);

        const qrPayload = JSON.stringify({
          triage: fullData.triage?.level,
          patient: fullData.patient_info?.name || "Unknown",
          vitals: fullData.clinical_summary?.vitals,
          facility: fullData.referral_facility,
          abha: fullData.abha_id,
          score: fullData.confidence_score
        });
        
        const qrUrl = await QRCode.toDataURL(qrPayload);
        setQrCodeUrl(qrUrl);

        const newRecord = {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          patient: fullData.patient_info?.name || "Patient",
          triage: fullData.triage?.level,
          status: "Pending Transfer",
          data: fullData
        };
        const updatedHistory = [newRecord, ...savedRecords];
        setSavedRecords(updatedHistory);
        localStorage.setItem("asha_referral_history", JSON.stringify(updatedHistory));

      } else {
        alert("API Error: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const speakInstructions = () => {
    if (!referralData?.first_aid_guidance) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = referralData.first_aid_guidance.join(". ");
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = language === "ta" ? "ta-IN" : "en-US";
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const sendSMS = () => {
    if (!referralData) return;
    const smsBody = referralData.sms_payload || `EMERGENCY:${referralData.triage?.level} Pt:${referralData.patient_info?.name} Vit:${referralData.clinical_summary?.vitals?.spO2 || 'N/A'}`;
    window.open(`sms:108?body=${encodeURIComponent(smsBody)}`, "_self");
  };

  const shareToWhatsApp = () => {
    if (!referralData) return;
    const text = `🚨 *ASHA EMERGENCY REFERRAL* 🚨\n\n*Patient:* ${referralData.patient_info?.name || "N/A"} (${referralData.patient_info?.age || "N/A"} yrs)\n*ABHA ID:* ${referralData.abha_id || "N/A"}\n*Triage:* ${referralData.triage?.level} (Risk Score: ${referralData.triage?.risk_score}/10)\n*Vitals:* SpO2: ${referralData.clinical_summary?.vitals?.spO2 || "N/A"} | BP: ${referralData.clinical_summary?.vitals?.bp || "N/A"}\n*Facility:* ${referralData.referral_facility}\n\n_Sent via ASHA-Pulse AI Bridge_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const loadPreset = (text) => {
    setTranscript(text);
    setReferralData(null);  
    setQrCodeUrl("");
  };

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans bg-slate-100 min-h-screen text-slate-900">
      
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-xl mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-emerald-400" /> ASHA-Pulse AI
          </h1>
          <p className="text-xs text-emerald-200 mt-1">
            {language === "ta" ? "ஆஷா பணியாளர்களுக்கான குரல்வழி மருத்துவ பரிந்துரை அமைப்பு" : "Voice Clinical Triage & Emergency Referral Bridge"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === "ta" ? "en" : "ta")}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-1 font-semibold transition"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-300" />
            {language === "ta" ? "English" : "தமிழ்"}
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-1 font-semibold transition"
          >
            <History className="w-3.5 h-3.5 text-emerald-300" />
            {language === "ta" ? "பதிவுகள்" : "History"} ({savedRecords.length})
          </button>
        </div>
      </header>

      {/* History Ledger Drawer */}
      {showHistory && (
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200 mb-4">
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" /> 
              {language === "ta" ? "பரிந்துரை கண்காணிப்பு பதிவுகள்" : "Referral Status Ledger"}
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-xs text-red-500 font-bold hover:underline">
              {language === "ta" ? "மூடு" : "Close"}
            </button>
          </div>
          {savedRecords.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-4">No records saved yet.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {savedRecords.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 border rounded-xl flex flex-wrap items-center justify-between text-xs gap-2">
                  <div>
                    <span className="font-bold text-slate-800">{item.patient}</span>
                    <span className="text-slate-400 text-[10px] block">{item.timestamp}</span>
                  </div>
                  <button
                    onClick={() => { setReferralData(item.data); setShowHistory(false); }}
                    className="bg-emerald-600 text-white px-2.5 py-1 rounded text-[10px] font-semibold"
                  >
                    {language === "ta" ? "பார்" : "View"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Voice Recorder & Input Area */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center mb-6">
        <button
          onClick={toggleRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all shadow-xl ${
            isRecording
              ? "bg-red-500 text-white animate-pulse scale-105 ring-8 ring-red-100"
              : "bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105"
          }`}
        >
          {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
        </button>

        {isRecording && (
          <div className="flex justify-center items-center gap-1.5 mt-4">
            <span className="w-1.5 h-6 bg-red-500 animate-bounce rounded-full"></span>
            <span className="w-1.5 h-10 bg-red-500 animate-bounce [animation-delay:0.2s] rounded-full"></span>
            <span className="w-1.5 h-12 bg-red-500 animate-bounce [animation-delay:0.4s] rounded-full"></span>
            <span className="w-1.5 h-8 bg-red-500 animate-bounce [animation-delay:0.1s] rounded-full"></span>
            <span className="w-1.5 h-4 bg-red-500 animate-bounce [animation-delay:0.3s] rounded-full"></span>
          </div>
        )}

        <p className="mt-3 text-sm font-semibold text-slate-700">
          {isRecording 
            ? (language === "ta" ? "கேட்கிறது... தமிழில் பேசுங்கள்..." : "Listening... Speak clinical updates...") 
            : (language === "ta" ? "பதிவு செய்ய மைக்ரோஃபோனை அழுத்தவும்" : "Tap Microphone to Start Voice Log")}
        </p>

        {/* ABHA ID Input */}
        <div className="mt-4 max-w-md mx-auto flex items-center gap-2 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
          <UserCheck className="w-5 h-5 text-emerald-700 ml-1" />
          <input
            type="text"
            placeholder={language === "ta" ? "ABHA ID (விருப்பத்தேர்வு, e.g. 12-3456-7890)" : "Patient ABHA ID (Optional)"}
            value={abhaId}
            onChange={(e) => setAbhaId(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none font-mono text-slate-800"
          />
        </div>

        {/* Presets */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-2">{language === "ta" ? "மாதிரி பரிசோதனை:" : "Quick Test Presets:"}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => loadPreset(language === "ta" ? "ரமேஷ் 45 வயது, 4 நாட்களாக காய்ச்சல், மூச்சு விடுவதில் சிரமம் மற்றும் SpO2 89 சதவீதம்" : "Ramesh 45 years old, 4 days fever, breathing difficulty, SpO2 89 percent")}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border font-medium"
            >
              Preset 1 (Critical RED)
            </button>
            <button
              onClick={() => loadPreset(language === "ta" ? "சுனிதா 28 வயது, கடுமையான தலைவலி மற்றும் காய்ச்சல், ரத்த அழுத்தம் 130/85" : "Sunita 28 years old, severe headache and fever, BP 130/85")}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border font-medium"
            >
              Preset 2 (Urgent YELLOW)
            </button>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="mt-4 text-left">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            {language === "ta" ? "நோயாளி குரல் / உரை விவரங்கள்:" : "Clinical Transcript / Voice Log:"}
          </label>
          <textarea
            rows="3"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={language === "ta" ? "இங்கே பேசுங்கள் அல்லது புதிய நோயாளியின் விவரங்களை தட்டச்சு செய்யவும்..." : "Speak or type patient symptoms..."}
            className="w-full p-3 border border-slate-300 rounded-xl text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={processVoiceData}
          disabled={loading}
          className="mt-3 w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition shadow-md disabled:bg-slate-400 flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            language === "ta" ? "AI தரவுகளை பகுப்பாய்வு செய்கிறது..." : "Running Clinical AI Engine..."
          ) : (
            <>
              <Send className="w-4 h-4" /> {language === "ta" ? "பரிந்துரை படிவத்தை உருவாக்கு" : "Generate Clinical Referral Pass"}
            </>
          )}
        </button>
      </div>

      {/* Generated Clinical Report */}
      {referralData && (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-5">
          
          {/* Triage Banner */}
          <div
            className={`p-4 rounded-xl font-bold text-sm flex items-center justify-between ${
              referralData.triage?.level === "RED"
                ? "bg-red-50 text-red-900 border border-red-300"
                : referralData.triage?.level === "YELLOW"
                ? "bg-amber-50 text-amber-900 border border-amber-300"
                : "bg-emerald-50 text-emerald-900 border border-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <span className="block text-lg font-black">
                  {language === "ta" ? "ஆபத்து நிலை:" : "TRIAGE LEVEL:"} {referralData.triage?.level}
                </span>
                <span className="text-xs font-normal">{referralData.triage?.urgency_reason}</span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-xs font-mono block">Risk Index</span>
              <span className="text-xl font-black">{referralData.triage?.risk_score}/10</span>
            </div>
          </div>

          {/* 108 Call & SMS Emergency Fallback Buttons */}
          {referralData.triage?.level === "RED" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="tel:108"
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl flex items-center justify-between transition shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                  <span>Call 108 Transport</span>
                </div>
                <span className="bg-white text-red-700 text-[10px] px-2 py-0.5 rounded font-black">DIAL</span>
              </a>

              <button
                onClick={sendSMS}
                className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl flex items-center justify-between transition shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Radio className="w-4 h-4" />
                  <span>SMS Fallback (No Internet)</span>
                </div>
                <span className="bg-white text-amber-800 text-[10px] px-2 py-0.5 rounded font-black">SMS 2G</span>
              </button>
            </div>
          )}

          {/* AI Clinical Safety & Audit Trail */}
          {referralData.confidence_score && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {language === "ta" ? "AI மருத்துவ பாதுகாப்பு & துல்லியம்" : "AI Clinical Safety & Audit Trail"}
                </span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                  referralData.confidence_score >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {referralData.confidence_score}% Confidence
                </span>
              </div>

              {referralData.audit_trail?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-slate-500 font-medium">Verified Tamil Spoken Mapping:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {referralData.audit_trail.map((item, idx) => (
                      <div key={idx} className="bg-white border text-[11px] p-2 rounded-lg flex items-center justify-between">
                        <span className="text-slate-600 italic">"{item.spoken_phrase}"</span>
                        <span className="text-emerald-700 font-bold">➔ {item.extracted_fact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Patient Details & Recommended Facility */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              {language === "ta" ? "நோயாளி விவரங்கள் & குறியீடுகள்" : "Patient Profile & Recorded Vitals"}
            </h3>
            
            <div className="mb-3 text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border">
              <div><strong>{language === "ta" ? "பெயர்:" : "Name:"}</strong> {referralData.patient_info?.name || "N/A"}</div>
              <div><strong>{language === "ta" ? "வயது / பாலினம்:" : "Age / Gender:"}</strong> {referralData.patient_info?.age || "N/A"} / {referralData.patient_info?.gender || "N/A"}</div>
              <div><strong>ABHA ID:</strong> <span className="font-mono text-emerald-700 font-bold">{referralData.abha_id || "N/A"}</span></div>
            </div>

            {/* Nearest PHC Facility Recommendation */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="font-bold text-slate-800 block">Recommended Referral Center:</span>
                  <span className="text-emerald-900 font-medium">{referralData.referral_facility || "Nearest District Govt Hospital"}</span>
                </div>
              </div>
              {userLocation && (
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                  GPS Active
                </span>
              )}
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border text-center">
                <span className="block text-slate-400">SpO2</span>
                <span className="font-bold text-slate-800 text-sm">{referralData.clinical_summary?.vitals?.spO2 || "—"}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border text-center">
                <span className="block text-slate-400">BP</span>
                <span className="font-bold text-slate-800 text-sm">{referralData.clinical_summary?.vitals?.bp || "—"}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border text-center">
                <span className="block text-slate-400">Temp</span>
                <span className="font-bold text-slate-800 text-sm">{referralData.clinical_summary?.vitals?.temperature || "—"}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border text-center">
                <span className="block text-slate-400">Pulse</span>
                <span className="font-bold text-slate-800 text-sm">{referralData.clinical_summary?.vitals?.pulse || "—"}</span>
              </div>
            </div>
          </div>

          {/* First Aid Guidance */}
          {referralData.first_aid_guidance?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-700" /> {language === "ta" ? "முதல் உதவி வழிகாட்டுதல்" : "Pre-Hospital First Aid Guidance"}
                </h3>
                
                <button
                  onClick={speakInstructions}
                  className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition ${
                    isSpeaking ? "bg-blue-600 text-white animate-pulse" : "bg-blue-200 text-blue-800 hover:bg-blue-300"
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {isSpeaking 
                    ? (language === "ta" ? "வாசிக்கிறது..." : "Speaking...") 
                    : (language === "ta" ? "குரலில் கேள்" : "Read Aloud")}
                </button>
              </div>

              <ul className="list-disc pl-5 text-xs text-blue-950 space-y-1">
                {referralData.first_aid_guidance.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Differential Diagnoses */}
          {referralData.differential_diagnoses?.length > 0 && (
            <div className="bg-slate-50 border p-4 rounded-xl">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-slate-700" /> {language === "ta" ? "மருத்துவருக்கான நோயறிதல்கள்" : "Differential Diagnoses (For Doctor)"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {referralData.differential_diagnoses.map((diag, index) => (
                  <span key={index} className="bg-white border text-slate-800 text-xs px-2.5 py-1 rounded-md shadow-sm font-medium">
                    {diag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions & QR Code */}
          <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            {qrCodeUrl && (
              <div className="text-center sm:text-left flex items-center gap-4">
                <img src={qrCodeUrl} alt="Offline Medical QR" className="w-28 h-28 border p-1 rounded-xl bg-white shadow-sm" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{language === "ta" ? "இணையமில்லா QR குறியீடு" : "Offline Transfer QR"}</p>
                  <p className="text-xs text-slate-500 max-w-[180px]">Scan with any camera to read patient data without internet connection.</p>
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={shareToWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition"
              >
                <Share2 className="w-4 h-4" /> {language === "ta" ? "வாட்ஸ்அப்பில் அனுப்பு" : "Share via WhatsApp"}
              </button>

              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" /> {language === "ta" ? "அச்சிடு / PDF" : "Print / PDF Pass"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}