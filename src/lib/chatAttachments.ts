export type AttachmentType = "image" | "pdf";

const LEGACY_IMAGE_PREFIX_REGEX = /^\[Image: (.+?)\]\n?/s;
const ATTACHMENT_PREFIX_REGEX = /^\[Attachment:(image|pdf):(.*?)\]\n?/s;
const DOCUMENT_CONTEXT_REGEX = /\n?\[Document Context\]\n([\s\S]*)$/s;

export const getAttachmentLabel = (attachmentType?: AttachmentType) => {
  if (attachmentType === "pdf") return "PDF upload";
  if (attachmentType === "image") return "Photo upload";
  return "";
};

export const isPdfAttachmentUrl = (url?: string) => {
  if (!url) return false;

  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().split("?")[0].endsWith(".pdf");
  }
};

export const encodeStoredMessage = ({
  content,
  attachmentUrl,
  attachmentType,
  contextText,
}: {
  content: string;
  attachmentUrl?: string;
  attachmentType?: AttachmentType;
  contextText?: string;
}) => {
  const visibleContent = content.trim() || getAttachmentLabel(attachmentType);
  const resolvedAttachmentType = attachmentType ?? (isPdfAttachmentUrl(attachmentUrl) ? "pdf" : "image");

  let storedContent = visibleContent;
  if (contextText?.trim()) {
    storedContent = `${storedContent}\n[Document Context]\n${contextText.trim()}`;
  }

  if (attachmentUrl) {
    storedContent = `[Attachment:${resolvedAttachmentType}:${attachmentUrl}]\n${storedContent}`;
  }

  return storedContent;
};

export const parseStoredMessage = (storedContent: string) => {
  let workingContent = storedContent;
  let imageUrl: string | undefined;
  let attachmentType: AttachmentType | undefined;

  const attachmentMatch = workingContent.match(ATTACHMENT_PREFIX_REGEX);
  if (attachmentMatch) {
    attachmentType = attachmentMatch[1] as AttachmentType;
    imageUrl = attachmentMatch[2].trim();
    workingContent = workingContent.replace(ATTACHMENT_PREFIX_REGEX, "").trimStart();
  } else {
    const legacyImageMatch = workingContent.match(LEGACY_IMAGE_PREFIX_REGEX);
    if (legacyImageMatch) {
      imageUrl = legacyImageMatch[1].trim();
      attachmentType = isPdfAttachmentUrl(imageUrl) ? "pdf" : "image";
      workingContent = workingContent.replace(LEGACY_IMAGE_PREFIX_REGEX, "").trimStart();
    }
  }

  let contextText: string | undefined;
  const contextMatch = workingContent.match(DOCUMENT_CONTEXT_REGEX);
  if (contextMatch) {
    contextText = contextMatch[1].trim();
    workingContent = workingContent.replace(DOCUMENT_CONTEXT_REGEX, "").trimEnd();
  }

  const content = workingContent.trim() || getAttachmentLabel(attachmentType);

  return {
    content,
    imageUrl,
    attachmentType,
    contextText,
  };
};

export const buildModelMessageContent = (message: {
  content: string;
  contextText?: string;
  imageUrl?: string;
  attachmentType?: AttachmentType;
}): string | Array<{ type: string; text?: string; image_url?: { url: string } }> => {
  const visibleContent = message.content.trim();
  const documentContext = message.contextText?.trim();

  // For image attachments, send the actual image to the multimodal model
  // instead of relying on OCR text (which is poor for math/diagrams)
  if (message.imageUrl && message.attachmentType === "image") {
    const textParts = [visibleContent];
    if (documentContext) {
      textParts.push("[Document Context]", documentContext);
    }
    const combinedText = textParts.filter(Boolean).join("\n\n");

    return [
      { type: "text", text: combinedText || "Please analyze this image and answer any questions shown." },
      { type: "image_url", image_url: { url: message.imageUrl } },
    ];
  }

  if (!documentContext) return visibleContent;

  return [visibleContent, "[Document Context]", documentContext].filter(Boolean).join("\n\n");
};