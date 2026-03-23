
import { GoogleGenAI, Type } from "@google/genai";
import { QuoteItem, Quotation } from "../types";

// ── Multi-provider AI setup ──────────────────────────────────────────────────
// Priority:  Ollama (local)  →  Groq  →  OpenRouter  →  Gemini
// @ts-ignore
const ENV = import.meta.env as Record<string, string | undefined>;

interface OpenAIMessage { role: 'user' | 'system' | 'assistant'; content: string | OpenAIContentPart[]; }
interface OpenAIContentPart { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }

async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${baseUrl} ${res.status}: ${body}`);
  }

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error(`Empty response from ${baseUrl}`);
  return text;
}

/** Try every provider in sequence; return first successful text response. */
async function callAI(
  prompt: string,
  imageParts?: { data: string; mimeType: string }[],
): Promise<string> {
  const errors: string[] = [];

  // 1. Ollama
  const ollamaHost = ENV.VITE_OLLAMA_HOST || 'http://localhost:11434';
  const ollamaModel = ENV.VITE_OLLAMA_MODEL || 'llama3.2';
  const ollamaVisionModel = ENV.VITE_OLLAMA_VISION_MODEL || 'llava';
  try {
    const model = imageParts?.length ? ollamaVisionModel : ollamaModel;
    let messages: OpenAIMessage[];
    if (imageParts?.length) {
      const parts: OpenAIContentPart[] = [
        { type: 'text', text: prompt },
        ...imageParts.map(img => ({
          type: 'image_url' as const,
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        })),
      ];
      messages = [{ role: 'user', content: parts }];
    } else {
      messages = [{ role: 'user', content: prompt }];
    }
    const result = await callOpenAICompat(`${ollamaHost}/v1`, '', model, messages);
    console.log('[AI] Ollama responded');
    return result;
  } catch (e: any) {
    errors.push(`Ollama: ${e.message}`);
    console.warn('[AI] Ollama failed:', e.message);
  }

  // 2. Groq
  const groqKey = ENV.VITE_GROQ_API_KEY || '';
  if (groqKey) {
    try {
      const groqModel = imageParts?.length ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
      let messages: OpenAIMessage[];
      if (imageParts?.length) {
        const parts: OpenAIContentPart[] = [
          { type: 'text', text: prompt },
          ...imageParts.map(img => ({
            type: 'image_url' as const,
            image_url: { url: `data:${img.mimeType};base64,${img.data}` },
          })),
        ];
        messages = [{ role: 'user', content: parts }];
      } else {
        messages = [{ role: 'user', content: prompt }];
      }
      const result = await callOpenAICompat('https://api.groq.com/openai/v1', groqKey, groqModel, messages);
      console.log('[AI] Groq responded');
      return result;
    } catch (e: any) {
      errors.push(`Groq: ${e.message}`);
      console.warn('[AI] Groq failed:', e.message);
    }
  }

  // 3. OpenRouter
  const orKey = ENV.VITE_OPENROUTER_API_KEY || '';
  if (orKey) {
    try {
      const orModel = imageParts?.length
        ? 'meta-llama/llama-3.2-11b-vision-instruct'
        : 'meta-llama/llama-3.3-70b-instruct';
      let messages: OpenAIMessage[];
      if (imageParts?.length) {
        const parts: OpenAIContentPart[] = [
          { type: 'text', text: prompt },
          ...imageParts.map(img => ({
            type: 'image_url' as const,
            image_url: { url: `data:${img.mimeType};base64,${img.data}` },
          })),
        ];
        messages = [{ role: 'user', content: parts }];
      } else {
        messages = [{ role: 'user', content: prompt }];
      }
      const result = await callOpenAICompat('https://openrouter.ai/api/v1', orKey, orModel, messages);
      console.log('[AI] OpenRouter responded');
      return result;
    } catch (e: any) {
      errors.push(`OpenRouter: ${e.message}`);
      console.warn('[AI] OpenRouter failed:', e.message);
    }
  }

  // 4. Gemini (existing SDK)
  const geminiKey = ENV.VITE_GEMINI_API_KEY || '';
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      if (imageParts?.length) {
        const parts: any[] = imageParts.map(img => ({
          inlineData: { data: img.data, mimeType: img.mimeType },
        }));
        parts.push({ text: prompt });
        const res = await ai.models.generateContent({ model: 'gemini-1.5-flash', contents: { parts } });
        console.log('[AI] Gemini (vision) responded');
        return res.text.trim();
      } else {
        const res = await ai.models.generateContent({ model: 'gemini-1.5-flash', contents: prompt });
        console.log('[AI] Gemini responded');
        return res.text.trim();
      }
    } catch (e: any) {
      errors.push(`Gemini: ${e.message}`);
      console.warn('[AI] Gemini failed:', e.message);
    }
  }

  throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
}

/** Extract a JSON object/array from a text response that may contain markdown fences. */
function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  // Try to find first { or [ to last } or ]
  const start = text.search(/[\[{]/);
  const end   = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

// ── Legacy Gemini client (used only for JSON-schema-constrained calls) ────────
const getAI = () => {
  const apiKey = ENV.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('No Gemini API key. Set VITE_GEMINI_API_KEY or use another provider.');
  return new GoogleGenAI({ apiKey });
};

export const getSmartEstimation = async (description: string): Promise<Partial<QuoteItem>> => {
  if (!description || description.trim() === "") {
    return {};
  }

  const prompt = `You are an expert interior designer and quantity surveyor based in Bangalore, India with 15+ years of experience in high-end residential interiors.

For the interior design item: "${description}"

Provide realistic 2024-2025 market estimates for HIGH-QUALITY residential work in Bangalore:
- dimensions: typical L×W or L×W×H in feet (e.g. "8 × 4" or "10 × 8 × 9")
- sqft: calculated area in square feet (L × W)
- rate: per sqft rate in INR (mid-to-premium range materials like BWP plywood + Bonn/Dulex/Asian paints, Hettich hardware)
- amount: sqft × rate

Consider item category from keywords: wardrobe→350-600/sqft, modular kitchen→800-1500/sqft, TV unit→1200-2000 lumpsum or 400-700/sqft, false ceiling→120-200/sqft, flooring→80-200/sqft, painting→18-35/sqft, etc.

Return ONLY valid JSON, no markdown:
{"dimensions": "string", "sqft": number, "rate": number, "amount": number}`;

  try {
    const raw = await callAI(prompt);
    return JSON.parse(extractJSON(raw));
  } catch (error: any) {
    console.error("AI Estimation Error:", error);
    // Fallback: try Gemini with structured schema
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dimensions: { type: Type.STRING },
              sqft: { type: Type.NUMBER },
              rate: { type: Type.NUMBER },
              amount: { type: Type.NUMBER }
            },
            required: ["dimensions", "sqft", "rate", "amount"]
          }
        }
      });
      return JSON.parse(response.text.trim());
    } catch {
      return {};
    }
  }
};

export const suggestItemsForCategory = async (category: string): Promise<Partial<QuoteItem>[]> => {
  if (!category || category.trim() === "") {
    return [];
  }

  const prompt = `Suggest 5-8 common interior design items for a room/section named "${category}". For each item, provide: description, typical dimensions, sqft, rate (INR per sqft, high-quality Bangalore), amount.
Return ONLY a JSON array. No markdown, no explanation.`;

  try {
    const raw = await callAI(prompt);
    return JSON.parse(extractJSON(raw));
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                dimensions: { type: Type.STRING },
                sqft: { type: Type.NUMBER },
                rate: { type: Type.NUMBER },
                amount: { type: Type.NUMBER }
              },
              required: ["description", "dimensions", "sqft", "rate", "amount"]
            }
          }
        }
      });
      return JSON.parse(response.text.trim());
    } catch { return []; }
  }
};

export const generateItemSpecification = async (itemName: string): Promise<string> => {
  if (!itemName || itemName.trim() === "") {
    return "";
  }

  const prompt = `Generate a professional, detailed technical specification for an interior design item named "${itemName}". Include materials (e.g., 18mm BWP Plywood), finishes (e.g., 1mm Suede Laminate), and hardware (e.g., Hettich/Hafele soft-close). Keep it concise but professional (2-3 sentences). Return plain text only, no JSON.`;

  try {
    return (await callAI(prompt)).trim();
  } catch (error) {
    console.error("AI Specification Error:", error);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      return response.text.trim();
    } catch { return itemName; }
  }
};

export interface ImageInput {
  data: string;
  mimeType: string;
}

export const extractQuoteFromImages = async (images: ImageInput[]): Promise<Partial<Quotation>> => {
  if (images.length === 0) return {};

  const ocrPrompt = `You are a world-class Quantity Surveyor and Interior Design Estimator with 20+ years of experience in Indian residential interiors.

TASK: Carefully analyze ALL images provided and extract a complete, structured interior design quotation.

═══ MANDATORY CORRECTION RULES ═══
1. Spelling corrections: "Grand Floor" / "Grond Floor" / "Grd Floor" → "Ground Floor".
2. Abbreviations: MBR→Master Bedroom, GBR/GR→Guest Bedroom, KBR→Kids Bedroom, Liv/LR→Living Room, Din/DR→Dining, Kit→Kitchen, PR→Pooja Room, UT→Utility, SIT→Sitting, STD→Study, ENT→Entrance, BALC/BAL→Balcony.
3. Dimensions: Always normalize to "L × W" or "L × W × H" format. If a single number, treat as sqft.
4. Amounts: If no amount is shown but sqft and rate are available, calculate amount = sqft × rate.
5. Fix obvious OCR errors in numbers (e.g., "1O" → "10", "S00" → "500").

═══ CATEGORIZATION RULES ═══
1. Bold/underlined text blocks or lines that DON'T have a price → Room/section headers; assign as category.
2. Numbered items under a header → belong to that header's category.
3. Use item description keywords to infer category when no header exists:
   - TV unit, Sofa backdrop, Entertainment → Living Room
   - Wardrobe, Bed back panel, Side table → Bedroom (use specific bedroom name if known)
   - Chimney, Hob, Modular cabinets, Sink → Kitchen
   - Vanity, Mirror cabinet, Shower partition → Bathroom
   - Crockery, Dining table top → Dining
4. "Optional", "Extra", "Add-on" items → requestedItems array.
5. Default fallback category: "General Works".

═══ WHAT TO EXCLUDE ═══
- Rows that are purely totals: "Subtotal", "Total", "Grand Total", "GST", "Tax", "Less Discount".
- Page numbers, header/footer text.

═══ DATA QUALITY ═══
- If a value is unclear or missing, use 0.
- Clean all descriptions: fix capitalization, remove leading numbers like "1.", "a)".
- If multiple images cover different rooms, merge them all into one items array.

Return ONLY this exact JSON (no markdown, no commentary):
{
  "clientName": "string or empty",
  "projectLocation": "string or empty",
  "items": [
    { "category": "string", "description": "string", "dimensions": "string", "sqft": 0, "rate": 0, "amount": 0 }
  ],
  "requestedItems": [
    { "category": "string", "description": "string", "dimensions": "string", "sqft": 0, "rate": 0, "amount": 0 }
  ],
  "isGstEnabled": true,
  "subtotal": 0,
  "gst": 0,
  "grandTotal": 0
}`;

  try {
    const raw = await callAI(ocrPrompt, images);
    return JSON.parse(extractJSON(raw));
  } catch (error) {
    console.error("Multi-provider OCR Error:", error);
    // Gemini fallback with structured schema
    try {
      const ai = getAI();
      const parts: any[] = images.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } }));
      parts.push({ text: ocrPrompt });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING },
              projectLocation: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    dimensions: { type: Type.STRING },
                    sqft: { type: Type.NUMBER },
                    rate: { type: Type.NUMBER },
                    amount: { type: Type.NUMBER }
                  }
                }
              },
              requestedItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    dimensions: { type: Type.STRING },
                    sqft: { type: Type.NUMBER },
                    rate: { type: Type.NUMBER },
                    amount: { type: Type.NUMBER }
                  }
                }
              },
              isGstEnabled: { type: Type.BOOLEAN },
              subtotal: { type: Type.NUMBER },
              gst: { type: Type.NUMBER },
              grandTotal: { type: Type.NUMBER }
            }
          }
        }
      });
      return JSON.parse(response.text.trim());
    } catch (e2) {
      console.error("Gemini OCR fallback also failed:", e2);
      return {};
    }
  }
};

export const generateSignatureImage = async (name: string): Promise<string | null> => {
  if (!name) return null;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          {
            text: `A professional handwritten signature of the name "${name}" in black ink on a pure white background. Elegant cursive style. High contrast.`,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Signature Generation Error:", error);
    return null;
  }
};

/** Generate a payment schedule for a project */
export const generatePaymentSchedule = async (
  grandTotal: number,
  projectType: string,
  projectDuration?: string,
): Promise<{ milestone: string; percentage: number; amount: number }[]> => {
  const prompt = `Generate a professional payment schedule for an interior design project.
Project Type: ${projectType || 'Residential'}
Total Contract Value: Rs. ${grandTotal.toLocaleString('en-IN')}
Estimated Duration: ${projectDuration || '45-60 Working Days'}

Create 4-5 milestone-based payment stages (e.g., Booking Advance, Post-demolition, Mid-stage, Pre-handover, On-completion).
The percentages MUST add up to exactly 100.

Return ONLY valid JSON array, no explanation:
[{ "milestone": "string", "percentage": number, "amount": number }]`;
  try {
    const raw = await callAI(prompt);
    const data = JSON.parse(extractJSON(raw));
    // Correct amounts if AI computed them oddly
    return data.map((row: any) => ({
      milestone: row.milestone || 'Payment Stage',
      percentage: row.percentage || 0,
      amount: Math.round(grandTotal * (row.percentage || 0) / 100),
    }));
  } catch (e) {
    console.error('generatePaymentSchedule error:', e);
    // Sensible default
    const stages = [
      { milestone: 'Booking Advance', percentage: 20 },
      { milestone: 'Post-demolition & Civil Works', percentage: 25 },
      { milestone: 'Mid-stage – Carpentry & Fabrication', percentage: 25 },
      { milestone: 'Pre-handover – Painting & Finishing', percentage: 20 },
      { milestone: 'On Completion & Handover', percentage: 10 },
    ];
    return stages.map(s => ({ ...s, amount: Math.round(grandTotal * s.percentage / 100) }));
  }
};

/** Generate a concise executive summary / cover note for a quotation */
export const generateProjectSummary = async (
  clientName: string,
  projectType: string,
  projectLocation: string,
  grandTotal: number,
  itemCount: number,
): Promise<string> => {
  const prompt = `Write a professional 3-sentence executive summary for an interior design quotation proposal.
Client: ${clientName || 'Valued Client'}
Project Type: ${projectType || 'Residential Interior'}
Location: ${projectLocation || 'Bangalore'}
Scope: ${itemCount} line items
Total Value: Rs. ${grandTotal.toLocaleString('en-IN')}

Keep it concise, warm, professional – suitable as the opening paragraph of a proposal. Return PLAIN TEXT only, no JSON.`;
  try {
    return (await callAI(prompt)).trim();
  } catch (e) {
    console.error('generateProjectSummary error:', e);
    return `We are pleased to present this comprehensive interior design proposal for your ${projectType || 'residential'} project at ${projectLocation || 'your site'}. Our detailed estimate covers ${itemCount} scope items tailored to deliver a premium finish that reflects your vision and lifestyle. We look forward to transforming your space and building a lasting relationship.`;
  }
};

/** Identify common items that may be missing from a category scope */
export const suggestMissingItems = async (
  category: string,
  existingDescriptions: string[],
): Promise<{ description: string; reason: string }[]> => {
  const prompt = `You are an expert interior designer. For the room/section "${category}", the client already has these items:
${existingDescriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Suggest 3-5 commonly MISSING or often-forgotten items for this scope. For each, give a SHORT reason why it's recommended.

Return ONLY valid JSON array:
[{ "description": "string", "reason": "string" }]`;
  try {
    const raw = await callAI(prompt);
    return JSON.parse(extractJSON(raw));
  } catch (e) {
    console.error('suggestMissingItems error:', e);
    return [];
  }
};

/** Estimate project duration from item count and types */
export const estimateProjectDuration = async (
  projectType: string,
  itemCount: number,
  grandTotal: number,
): Promise<string> => {
  const prompt = `Estimate the working days required to complete an interior design project with these parameters:
Project Type: ${projectType || 'Residential'}
Total Line Items: ${itemCount}
Contract Value: Rs. ${grandTotal.toLocaleString('en-IN')}

Return a single short string like "45-60 Working Days" or "3 Months". No extra text, no JSON.`;
  try {
    return (await callAI(prompt)).trim().replace(/["']/g, '');
  } catch {
    return '45-60 Working Days';
  }
};
