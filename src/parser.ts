// src/parser.ts

// This function recursively walks through the nested "children"
// of the Hygraph Rich Text JSON and extracts all the text content.
const extractTextFromNode = (node: any): string => {
  if (node.text) {
    return node.text;
  }

  if (node.children && Array.isArray(node.children)) {
    return node.children.map(extractTextFromNode).join(' ');
  }

  return '';
};

// This is the main function we'll use in our webhook.
// It finds the English localization and extracts the body text.
export const parseHygraphPayload = (payload: any): { id: string; text: string | null } => {
  const contentId = payload.id;

  // Find the English ('en') version of the content
  const englishLocalization = payload.localizations?.find(
    (loc: any) => loc.locale === 'en'
  );

  if (!englishLocalization || !englishLocalization.body?.raw) {
    return { id: contentId, text: null };
  }

  const rawBody = englishLocalization.body.raw;
  const fullText = extractTextFromNode(rawBody);

  return { id: contentId, text: fullText.trim() };
};