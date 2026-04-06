import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { AttachmentType } from "@/lib/chatAttachments";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MIN_EXTRACTED_TEXT_LENGTH = 50;
const MAX_PDF_TEXT_PAGES = 10;
const MAX_PDF_OCR_PAGES = 3;
const PDF_EXTRACTION_FALLBACK =
  "The uploaded PDF could not be read clearly. Do not answer using earlier conversation context. Ask the user to upload a clearer PDF or paste the question text.";

const normalizeExtractedText = (value: string) =>
  value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const extractTextFromImage = async (file: File) => {
  const result = await Tesseract.recognize(file, "eng");
  return normalizeExtractedText(result.data.text);
};

const extractPageText = async (page: any) => {
  const textContent = await page.getTextContent();
  const items = textContent.items as Array<{ str?: string; transform?: number[]; width?: number }>;
  const lines: string[] = [];
  let currentLine = "";
  let lastY: number | null = null;
  let lastX: number | null = null;

  for (const item of items) {
    const text = item.str ?? "";
    if (!text) continue;

    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    if (lastY !== null && Math.abs(y - lastY) > 4) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = "";
      lastX = null;
    }

    if (currentLine && lastX !== null && x - lastX > 10) {
      currentLine += " ";
    }

    currentLine += text;
    lastY = y;
    lastX = x + (item.width ?? 0);
  }

  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines.join("\n");
};

const renderPdfPageToCanvas = async (page: any) => {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create canvas context for PDF OCR");

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
};

const extractTextFromPdf = async (file: File) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const textChunks: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PDF_TEXT_PAGES); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    textChunks.push(await extractPageText(page));
  }

  const extractedText = normalizeExtractedText(textChunks.join("\n\n"));
  if (extractedText.length >= MIN_EXTRACTED_TEXT_LENGTH) return extractedText;

  const ocrChunks: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PDF_OCR_PAGES); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const canvas = await renderPdfPageToCanvas(page);
    const result = await Tesseract.recognize(canvas, "eng");
    ocrChunks.push(result.data.text);
  }

  const ocrText = normalizeExtractedText(ocrChunks.join("\n\n"));
  return ocrText.length >= MIN_EXTRACTED_TEXT_LENGTH ? ocrText : PDF_EXTRACTION_FALLBACK;
};

export const extractTextFromFile = async (file: File, type: AttachmentType) => {
  if (type === "pdf") return extractTextFromPdf(file);
  return extractTextFromImage(file);
};