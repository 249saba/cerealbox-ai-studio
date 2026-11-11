import { GoogleGenAI, Type } from "@google/genai";

const text = { type: Type.STRING };
const ideaSchema = {
  type: Type.OBJECT,
  properties: { ideas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
    title: text, angle: text, description: text, hook: text, format: text
  }, required: ["title", "angle", "description", "hook", "format"] } } },
  required: ["ideas"]
};
const copySchema = {
  type: Type.OBJECT,
  properties: { primaryText: text, headline: text, cta: text, variations: { type: Type.ARRAY, items: text } },
  required: ["primaryText", "headline", "cta", "variations"]
};

function ensureString(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Gemini response missing ${name}`);
  return value.trim();
}
function normalizeError(error) {
  const status = Number(error?.status || error?.code || 0);
  const message = String(error?.message || "");
  if (status === 429 || /quota|resource_exhausted|rate.limit/i.test(message)) {
    return Object.assign(new Error("Gemini rate limit or quota reached. Wait and retry, or check your Google AI Studio usage."), { status: 429 });
  }
  if (status === 401 || status === 403 || /api.key.not.valid|permission.denied/i.test(message)) {
    return Object.assign(new Error("Gemini API key is invalid or does not have permission. Check server/.env and Google AI Studio."), { status: 502 });
  }
  if (status === 404 || /model.*not.found/i.test(message)) {
    return Object.assign(new Error("Gemini model unavailable. Check GEMINI_MODEL and available models in Google AI Studio."), { status: 502 });
  }
  return Object.assign(new Error("Gemini request failed. Check your internet connection and server logs."), { status: 502 });
}
async function requestGemini(prompt, schema) {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw Object.assign(new Error("Gemini is not configured. Add GEMINI_API_KEY to server/.env and restart the server."), { status: 503 });
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.8,
        httpOptions: { timeout: 45000 } }
    });
  } catch (error) { console.error("Gemini API error:", error?.message); throw normalizeError(error); }
  try { return JSON.parse(response.text || ""); }
  catch { throw Object.assign(new Error("Gemini returned an unreadable response. Please retry."), { status: 502 }); }
}
export async function generateIdeas(brief) {
  const result = await requestGemini(`You are a creative strategist for ethical fundraising and advertising. Generate exactly FIVE distinct, specific campaign ideas as JSON. Each needs title, angle, description, hook, format. Use only facts provided in the brief. No invented statistics, testimonials, guarantees, false urgency or unsupported claims. Be practical and varied.\nBRIEF:\n${JSON.stringify(brief)}`, ideaSchema);
  if (!Array.isArray(result.ideas) || result.ideas.length !== 5) throw Object.assign(new Error("Gemini returned the wrong number of ideas. Please retry."), { status: 502 });
  return { mode: "gemini", model: process.env.GEMINI_MODEL || "gemini-2.5-flash", ideas: result.ideas.map((item) => Object.fromEntries(["title","angle","description","hook","format"].map(k => [k, ensureString(item[k], k)]))) };
}
export async function generateCopy(brief) {
  const result = await requestGemini(`You are a responsible, platform-aware advertising copywriter. Return JSON with primaryText, headline, cta and exactly THREE distinct string variations. When selectedIdea is provided, use its title, angle, hook, and creative direction as the central concept for the ad copy, while grounding all factual statements in the campaign name, audience, and offer. If selectedIdea is absent, write from the general brief. Respect the requested tone and platform. No fabricated claims, results, guarantees, or testimonials. Use only facts supplied in the brief.\nBRIEF:\n${JSON.stringify(brief)}`, copySchema);
  if (!Array.isArray(result.variations) || result.variations.length !== 3) throw Object.assign(new Error("Gemini returned the wrong number of copy variations. Please retry."), { status: 502 });
  return { mode: "gemini", model: process.env.GEMINI_MODEL || "gemini-2.5-flash", primaryText: ensureString(result.primaryText,"primaryText"), headline: ensureString(result.headline,"headline"), cta: ensureString(result.cta,"cta"), variations: result.variations.map((v) => ensureString(v,"variation")) };
}


// Generate an actual image, not a mock illustration or text-only description.
export async function generateCreative(brief) {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw Object.assign(new Error("Set GEMINI_API_KEY in server/.env and restart the backend."), { status: 503 });
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const prompt = `Create ONE polished, original, high-quality static social advertising image for this campaign. Composition: ${brief.aspectRatio === "1:1" ? "square" : brief.aspectRatio === "9:16" ? "vertical portrait" : "landscape"}. Visual style: ${brief.style || "Editorial photography"}. Campaign: ${brief.campaignName}. Audience: ${brief.audience}. Key message: ${brief.offer}. Creative concept: ${brief.selectedIdea || "No selected concept"}. Ad headline context: ${brief.headline || "Not provided"}. Make the image visually compelling and appropriate for a responsible fundraising/marketing campaign. Prefer minimal or no embedded typography; do not invent logos, statistics, testimonials, endorsements or misleading claims. No watermark. Do not imply a real beneficiary is depicted if not supplied. Return an image.`;
  let response;
  try {
    response = await ai.models.generateContent({
      model, contents: prompt,
      config: { responseModalities: ["TEXT", "IMAGE"], httpOptions: { timeout: 120000 } }
    });
  } catch (error) { console.error("Gemini image API error:", error?.message); throw normalizeError(error); }
  const parts = response.candidates?.[0]?.content?.parts || [];
  const part = parts.find(p => p.inlineData?.data && p.inlineData?.mimeType?.startsWith("image/"));
  if (!part) throw Object.assign(new Error("Gemini returned no image. Check image-model access, quota and safety settings, then retry."), { status: 502 });
  const mimeType = part.inlineData.mimeType;
  const imageBase64 = part.inlineData.data;
  if (imageBase64.length > 12_000_000) throw Object.assign(new Error("Generated image exceeds the demo size limit."), { status: 502 });
  return { mode: "gemini", model, mimeType, imageBase64, note: "AI-generated image. Human review required before publishing." };
}
