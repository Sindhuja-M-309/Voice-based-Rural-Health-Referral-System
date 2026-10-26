import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert medical triage system for ASHA workers in Tamil Nadu.
Analyze spoken Tamil/English voice transcripts and output structured medical JSON.

CRITICAL INSTRUCTIONS:
- Extract patient info, vitals, triage level, first aid, and differential diagnosis.
- Include a "confidence_score" (0 to 100).
- Include an "audit_trail" mapping extracted medical facts directly to spoken Tamil words.
- Generate an "sms_payload": A compressed string under 140 chars formatted as:
  "EMERGENCY:[TRIAGE] Pt:[Name],[Age] Vit:[SpO2/BP] Facility:[Facility] ABHA:[ABHA]"

JSON Schema (Strict):
{
  "patient_info": { "name": string|null, "age": number|null, "gender": string|null, "abha_id": string|null },
  "triage": { "level": "RED"|"YELLOW"|"GREEN", "risk_score": number, "urgency_reason": string },
  "clinical_summary": {
    "chief_complaints": [{"symptom": string, "duration": string}],
    "vitals": {"spO2": string|null, "bp": string|null, "temperature": string|null, "pulse": string|null}
  },
  "first_aid_guidance": [string],
  "differential_diagnoses": [string],
  "referral_facility": string,
  "confidence_score": number,
  "audit_trail": [{"spoken_phrase": string, "extracted_fact": string}],
  "sms_payload": string
}`;

export async function POST(req) {
  try {
    const { transcript, abhaId } = await req.json();

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Clinical Tamil Voice Log: "${transcript}" | ABHA: "${abhaId || 'None'}"` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const structuredData = JSON.parse(completion.choices[0].message.content);
    return Response.json({ success: true, data: structuredData });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}