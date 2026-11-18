import { extractText, getDocumentProxy } from "unpdf";
import { namesFromPlacePdfText } from "./rules";

/** Plot names from a PDF's extractable text. Scanned drawings usually return nothing. */
export async function extractPlaceNamesFromPdf(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text ?? "")];
  const joined = pages.map((page) => String(page ?? "")).join("\n");
  const names = namesFromPlacePdfText(joined);
  if (names.length) return names;
  const collapsed = namesFromPlacePdfText(joined.replace(/\s+/g, " "));
  return collapsed;
}
