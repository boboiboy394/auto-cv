import mammoth from "mammoth";
import type { ParsedCVData } from "@/lib/types";

export interface TextExtractionResult {
  text: string;
  pageCount?: number;
  isEmpty: boolean; // true if text < 100 chars for files > 50KB
  warnings: string[];
}

export interface ParseResult {
  text: string;
  structuredData: ParsedCVData | null;
  confidence: number | null;
  warnings: string[];
}

/** Lazy-loaded pdf-parse so it only loads when called (not at module import time). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
type PdfParseFn = (buf: Buffer) => Promise<{ text: string; metadata?: { numberOfPages?: number } }>;
let _pdfParse: PdfParseFn | null = null;
function getPdfParse(): PdfParseFn {
  if (!_pdfParse) {
    // pdf-parse v2 ESM has no default export — use CJS entry
    _pdfParse = require("pdf-parse") as PdfParseFn;
  }
  return _pdfParse;
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<TextExtractionResult> {
  const warnings: string[] = [];
  const data = await getPdfParse()(buffer);
  const text = data.text?.trim() ?? "";

  // Check for low text extraction (potential scanned/image PDF)
  const isEmpty = buffer.length > 50 * 1024 && text.length < 100;
  if (isEmpty) {
    warnings.push("LOW_TEXT_EXTRACTION");
  }

  return {
    text,
    pageCount: data.metadata?.numberOfPages,
    isEmpty,
    warnings,
  };
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<TextExtractionResult> {
  const warnings: string[] = [];

  const result = await mammoth.extractRawText({ buffer });
  const text = result.value?.trim() ?? "";

  const isEmpty = buffer.length > 50 * 1024 && text.length < 100;
  if (isEmpty) {
    warnings.push("LOW_TEXT_EXTRACTION");
  }

  return {
    text,
    isEmpty,
    warnings,
  };
}

/**
 * Parse CV text into structured data using Claude AI.
 * Returns null structuredData if parsing fails (raw text still returned).
 */
export async function parseCVWithAI(rawText: string): Promise<ParseResult> {
  const warnings: string[] = [];
  let structuredData: ParsedCVData | null = null;
  let confidence: number | null = null;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    warnings.push("AI_PARSE_SKIPPED: ANTHROPIC_API_KEY not set");
    return { text: rawText, structuredData: null, confidence: null, warnings };
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: anthropicKey });

    // Truncate to keep within token budget (~8KB chars ≈ ~2K tokens)
    const truncationLimit = 8000;
    const truncatedText = rawText.slice(0, truncationLimit);

    const response = await Promise.race([
      client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        system: `You are an expert CV parser. Extract structured data from CV text.
Return a JSON object with this exact shape:
{
  "personalInfo": { "name": "", "email": "", "phone": "", "location": "", "linkedIn": "", "portfolio": "" },
  "summary": "",
  "experience": [{ "company": "", "title": "", "startDate": "", "endDate": "", "bullets": [] }],
  "education": [{ "institution": "", "degree": "", "field": "", "graduationYear": 0 }],
  "skills": []
}
If a field is not found, use an empty string/array.
Only extract what is explicitly stated in the CV. Do not invent or assume information.
Return ONLY the JSON object, no markdown code blocks, no explanation.`,
        messages: [
          {
            role: "user",
            content: `Parse this CV:\n\n${truncatedText}`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 30_000)
      ),
    ]);

    const textBlock = response.content[0];
    if (textBlock?.type === "text") {
      const parsed = JSON.parse(textBlock.text) as ParsedCVData;
      structuredData = parsed;
      // Estimate confidence based on completeness of required fields
      const hasName = !!parsed.personalInfo?.name;
      const hasEmail = !!parsed.personalInfo?.email;
      const hasSkills = (parsed.skills?.length ?? 0) > 0;
      const hasExperience = (parsed.experience?.length ?? 0) > 0;
      const completenessScore =
        [hasName, hasEmail, hasSkills, hasExperience].filter(Boolean).length / 4;
      confidence = 0.5 + completenessScore * 0.5; // 0.5–1.0
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "AI_TIMEOUT") {
      warnings.push("PARSE_TIMEOUT");
    } else {
      console.error("AI parse error:", err);
      warnings.push("PARSE_FAILED");
    }
  }

  return { text: rawText, structuredData, confidence, warnings };
}

/**
 * Full pipeline: extract text from file buffer → AI parse → structured result.
 */
export async function parseCVFile(
  buffer: Buffer,
  mimeType: string
): Promise<ParseResult> {
  const warnings: string[] = [];
  let rawText = "";

  // Step 1: Extract raw text based on file type
  if (mimeType === "application/pdf") {
    const result = await extractTextFromPDF(buffer);
    rawText = result.text;
    warnings.push(...result.warnings);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await extractTextFromDOCX(buffer);
    rawText = result.text;
    warnings.push(...result.warnings);
  } else {
    warnings.push("UNSUPPORTED_MIME_TYPE");
    return { text: "", structuredData: null, confidence: null, warnings };
  }

  if (!rawText.trim()) {
    warnings.push("EMPTY_TEXT");
    return { text: "", structuredData: null, confidence: null, warnings };
  }

  // Step 2: AI structured extraction
  const aiResult = await parseCVWithAI(rawText);
  return {
    text: rawText,
    structuredData: aiResult.structuredData,
    confidence: aiResult.confidence,
    warnings: [...warnings, ...aiResult.warnings],
  };
}
