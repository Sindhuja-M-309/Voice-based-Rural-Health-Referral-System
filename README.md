#  ASHA-Pulse AI: Voice Clinical Triage & Offline Referral Bridge

An intelligent, multi-lingual decision-support system built for frontline ASHA health workers in rural India, designed to streamline clinical triage, bridge regional language barriers, and ensure secure medical data transfer even without internet connectivity.

---

##  Key Features

* **Voice Intake & Pechu Valakku Parsing:** Converts informal spoken Tamil, regional dialects, and code-mixed speech into standardized clinical English via Llama 3.3 (Groq SDK).
* **Automated Triage & Risk Index:** Instantly calculates real-time clinical risk scores (RED, YELLOW, GREEN) with automated, actionable first-aid guidelines.
* **Offline Micro-QR Transfer:** Compresses the entire clinical triage payload directly into an offline QR code that can be scanned and read by any basic camera without an internet connection.
* **2G SMS Emergency Bridge:** Provides a 160-character fallback SMS payload to immediately alert emergency services or health centers in zero-data zones.
* **AI Safety Audit Trail & Confidence Scoring:** Maps extracted medical facts directly back to the health worker's spoken phrases, ensuring clinical accountability and doctor trust.
* **Bilingual UI & Text-to-Speech:** Features an instant language toggle (Tamil/English) and voice-assisted readout for low-literacy field conditions.
* **Local Storage Status Ledger:** Tracks referral lifecycle stages (*Pending Transfer, Hospital Reached, Treated & Safe*) locally on the device.

---

##  Tech Stack

* **Frontend:** Next.js (App Router), Tailwind CSS, Lucide Icons, QRcode.js
* **Backend:** Next.js API Routes, Groq SDK (`llama-3.3-70b-versatile`)
* **Hardware Interoperability:** Web Speech API, Geolocation API, Web Speech Synthesis (TTS)

---

##  Getting Started & Local Installation

1. **Clone the repository:**
   ```
   git clone [https://github.com/Sindhuja-M-309/asha-pulse-ai.git](https://github.com/your-username/asha-pulse-ai.git)
   cd asha-pulse-ai
   ```

 i) **Install dependencies:**
      ```
       npm install
      ```

ii) **Configure Environment Variables:**

  Create a .env.local file in the root directory and add your Groq API key:
      
  ```
        GROQ_API_KEY=your_groq_api_key_here
  ```
       
  iii) **Run the Development Server:**
       ```
        npm run dev
       ```
       
   Open http://localhost:3000 in your browser (Microsoft Edge or Google Chrome recommended for microphone support).
