"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { LazyCodeFileViewer } from "./lazy-code-file-viewer";
import {
  threadChatMarkdownComponents,
  threadChatRehypePlugins,
  threadChatRemarkPlugins,
} from "./markdown";
import {
  isCsvFile,
  isDocxFile,
  isImageMimeType,
  isMarkdownFile,
  isPdfFile,
  isPptxFile,
  isPreviewableTextFile,
} from "./shared";

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

function readUInt16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUInt32LE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function parseZipEntries(bytes: Uint8Array): ZipEntry[] {
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("Invalid zip archive");
  }

  const centralDirectoryOffset = readUInt32LE(bytes, eocdOffset + 16);
  const totalEntries = readUInt16LE(bytes, eocdOffset + 10);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (
      bytes[cursor] !== 0x50 ||
      bytes[cursor + 1] !== 0x4b ||
      bytes[cursor + 2] !== 0x01 ||
      bytes[cursor + 3] !== 0x02
    ) {
      throw new Error("Invalid zip central directory");
    }

    const compressionMethod = readUInt16LE(bytes, cursor + 10);
    const compressedSize = readUInt32LE(bytes, cursor + 20);
    const uncompressedSize = readUInt32LE(bytes, cursor + 24);
    const fileNameLength = readUInt16LE(bytes, cursor + 28);
    const extraLength = readUInt16LE(bytes, cursor + 30);
    const commentLength = readUInt16LE(bytes, cursor + 32);
    const localHeaderOffset = readUInt32LE(bytes, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflateRaw(data: Uint8Array) {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  const inputBytes = new Uint8Array(data.byteLength);
  inputBytes.set(data);
  await writer.write(inputBytes);
  await writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

async function extractZipEntry(bytes: Uint8Array, entry: ZipEntry) {
  const offset = entry.localHeaderOffset;
  if (
    bytes[offset] !== 0x50 ||
    bytes[offset + 1] !== 0x4b ||
    bytes[offset + 2] !== 0x03 ||
    bytes[offset + 3] !== 0x04
  ) {
    throw new Error("Invalid zip local header");
  }

  const fileNameLength = readUInt16LE(bytes, offset + 26);
  const extraLength = readUInt16LE(bytes, offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressed;
  }
  if (entry.compressionMethod === 8) {
    return inflateRaw(compressed);
  }
  throw new Error(`Unsupported zip compression method: ${entry.compressionMethod}`);
}

function xmlTextFromTag(doc: Document, localName: string) {
  return Array.from(doc.getElementsByTagNameNS("*", localName))
    .map((node) => node.textContent || "")
    .join("");
}

function extractDocxMarkdown(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const paragraphs = Array.from(doc.getElementsByTagNameNS("*", "p"))
    .map((paragraph) =>
      Array.from(paragraph.getElementsByTagNameNS("*", "t"))
        .map((node) => node.textContent || "")
        .join("")
        .trim(),
    )
    .filter(Boolean);

  return paragraphs.join("\n\n");
}

function slideOrder(name: string) {
  const match = name.match(/slide(\d+)\.xml$/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function extractPptxMarkdown(slides: Array<{ name: string; xml: string }>) {
  return slides
    .sort((a, b) => slideOrder(a.name) - slideOrder(b.name))
    .map((slide, index) => {
      const doc = new DOMParser().parseFromString(slide.xml, "application/xml");
      const texts = Array.from(doc.getElementsByTagNameNS("*", "t"))
        .map((node) => (node.textContent || "").trim())
        .filter(Boolean);

      if (texts.length === 0) {
        return `## Slide ${index + 1}`;
      }

      const [title, ...rest] = texts;
      const body = rest.length > 0 ? rest.map((line) => `- ${line}`).join("\n") : "";
      return [`## Slide ${index + 1}: ${title}`, body].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

async function extractOfficePreviewFromBlob(blob: Blob, path: string) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const entries = parseZipEntries(bytes);
  const decoder = new TextDecoder();

  if (isDocxFile(path)) {
    const documentEntry = entries.find((entry) => entry.name === "word/document.xml");
    if (!documentEntry) return null;
    const xml = decoder.decode(await extractZipEntry(bytes, documentEntry));
    return extractDocxMarkdown(xml);
  }

  if (isPptxFile(path)) {
    const slideEntries = entries.filter((entry) =>
      /^ppt\/slides\/slide\d+\.xml$/i.test(entry.name),
    );
    if (slideEntries.length === 0) return null;
    const slides = await Promise.all(
      slideEntries.map(async (entry) => ({
        name: entry.name,
        xml: decoder.decode(await extractZipEntry(bytes, entry)),
      })),
    );
    return extractPptxMarkdown(slides);
  }

  return null;
}

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((cell) => cell.length > 0));
}

function CsvPreview({ text, delimiter }: { text: string; delimiter: string }) {
  const rows = React.useMemo(() => parseDelimitedRows(text, delimiter), [delimiter, text]);
  if (rows.length === 0) return null;
  const [header, ...body] = rows;

  return (
    <div className="overflow-auto px-4 py-3">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left">
            {header.map((cell, index) => (
              <th key={`header-${index}`} className="px-3 py-2 font-medium text-foreground">
                {cell || `Column ${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-b border-border/35 align-top">
              {header.map((_, columnIndex) => (
                <td key={`cell-${rowIndex}-${columnIndex}`} className="px-3 py-2 text-foreground/78">
                  {row[columnIndex] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilePreviewPane({
  path,
  mimeType,
  content,
  contentBase64,
  isText,
  imageUrl,
  blob,
}: {
  path: string;
  mimeType?: string;
  content?: string | null;
  contentBase64?: string | null;
  isText: boolean;
  imageUrl?: string | null;
  blob?: Blob | null;
}) {
  const textContent = content || "";
  const shouldPreviewAsText = isText || isPreviewableTextFile(path, mimeType);
  const isOfficePreview = isDocxFile(path, mimeType);
  const isPowerPointFile = isPptxFile(path, mimeType);
  const isCsvPreview = isCsvFile(path, mimeType);
  const [binaryPreviewUrl, setBinaryPreviewUrl] = React.useState<string | null>(null);
  const [officePreview, setOfficePreview] = React.useState<string | null>(
    isOfficePreview && textContent ? textContent : null,
  );
  const [officePreviewLoading, setOfficePreviewLoading] = React.useState(false);

  React.useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setBinaryPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    if (contentBase64) {
      const normalizedMime = mimeType || "application/octet-stream";
      const url = `data:${normalizedMime};base64,${contentBase64}`;
      setBinaryPreviewUrl((current) => {
        if (current && current.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return url;
      });
      return;
    }

    setBinaryPreviewUrl((current) => {
      if (current && current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, [blob, contentBase64, mimeType]);

  React.useEffect(() => {
    let cancelled = false;

    if (!isOfficePreview) {
      setOfficePreview(null);
      setOfficePreviewLoading(false);
      return;
    }

    if (textContent) {
      setOfficePreview(textContent);
      setOfficePreviewLoading(false);
      return;
    }

    if (!blob) {
      setOfficePreview(null);
      setOfficePreviewLoading(false);
      return;
    }

    setOfficePreviewLoading(true);
    void extractOfficePreviewFromBlob(blob, path)
      .then((value) => {
        if (!cancelled) {
          setOfficePreview(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOfficePreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOfficePreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [blob, isOfficePreview, path, textContent]);

  if (isPowerPointFile) {
    return (
      <div className="px-4 py-4">
        <div className="text-sm text-foreground">Preview unavailable for this document.</div>
        <div className="mt-1 text-sm text-muted-foreground">
          PowerPoint preview is not supported.
        </div>
      </div>
    );
  }

  if (isOfficePreview) {
    if (officePreviewLoading) {
      return (
        <div className="px-4 py-4 text-sm text-muted-foreground">
          Loading document preview…
        </div>
      );
    }

    if (officePreview) {
      return (
        <Tabs defaultValue="preview" className="h-full gap-0">
          <div className="border-b border-border/60 px-3 py-2">
            <TabsList className="h-8 bg-accent/30">
              <TabsTrigger value="preview" className="text-xs">
                Preview
              </TabsTrigger>
              <TabsTrigger value="source" className="text-xs">
                Extracted text
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="preview" className="h-full min-h-0 overflow-y-auto">
            <div className="px-4 py-3">
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-headings:font-normal prose-p:text-sm prose-p:leading-6 prose-li:text-sm prose-pre:border prose-pre:border-border prose-pre:bg-accent/10 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown
                  remarkPlugins={threadChatRemarkPlugins}
                  rehypePlugins={threadChatRehypePlugins}
                  components={threadChatMarkdownComponents}
                >
                  {officePreview}
                </ReactMarkdown>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="source" className="h-full min-h-0">
            <LazyCodeFileViewer path={`${path}.md`} mimeType="text/markdown" value={officePreview} />
          </TabsContent>
        </Tabs>
      );
    }

    return (
      <div className="px-4 py-4">
        <div className="text-sm text-foreground">Preview unavailable for this document.</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Document preview could not be extracted.
        </div>
      </div>
    );
  }

  if (shouldPreviewAsText && isMarkdownFile(path)) {
    return (
      <Tabs defaultValue="preview" className="h-full gap-0">
        <div className="border-b border-border/60 px-3 py-2">
          <TabsList className="h-8 bg-accent/30">
            <TabsTrigger value="preview" className="text-xs">
              Preview
            </TabsTrigger>
            <TabsTrigger value="source" className="text-xs">
              Source
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="preview" className="h-full min-h-0 overflow-y-auto">
          <div className="px-4 py-3">
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-headings:font-normal prose-p:text-sm prose-p:leading-6 prose-li:text-sm prose-pre:border prose-pre:border-border prose-pre:bg-accent/10 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown
                remarkPlugins={threadChatRemarkPlugins}
                rehypePlugins={threadChatRehypePlugins}
                components={threadChatMarkdownComponents}
              >
                {textContent}
              </ReactMarkdown>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="source" className="h-full min-h-0">
          <LazyCodeFileViewer path={path} mimeType={mimeType} value={textContent} />
        </TabsContent>
      </Tabs>
    );
  }

  if (shouldPreviewAsText && isCsvPreview) {
    const delimiter = /\.tsv$/i.test(path) ? "\t" : ",";
    return (
      <Tabs defaultValue="preview" className="h-full gap-0">
        <div className="border-b border-border/60 px-3 py-2">
          <TabsList className="h-8 bg-accent/30">
            <TabsTrigger value="preview" className="text-xs">
              Preview
            </TabsTrigger>
            <TabsTrigger value="source" className="text-xs">
              Source
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="preview" className="h-full min-h-0 overflow-auto">
          <CsvPreview text={textContent} delimiter={delimiter} />
        </TabsContent>
        <TabsContent value="source" className="h-full min-h-0">
          <LazyCodeFileViewer path={path} mimeType={mimeType} value={textContent} />
        </TabsContent>
      </Tabs>
    );
  }

  if (shouldPreviewAsText) {
    return <LazyCodeFileViewer path={path} mimeType={mimeType} value={textContent} />;
  }

  if (isPdfFile(path, mimeType) && binaryPreviewUrl) {
    return (
      <iframe
        src={binaryPreviewUrl}
        title={path}
        className="h-full min-h-[60vh] w-full border-0"
      />
    );
  }

  if (isImageMimeType(mimeType) && (imageUrl || binaryPreviewUrl)) {
    return (
      <div className="flex min-h-full items-start justify-center px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || binaryPreviewUrl || ""}
          alt={path.split("/").pop() || path}
          className="max-h-[70vh] max-w-full object-contain"
        />
      </div>
    );
  }

  if (isImageMimeType(mimeType)) {
    return (
      <div className="px-4 py-4 text-sm text-muted-foreground">
        Loading image preview…
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="text-sm text-foreground">Preview unavailable for this file type.</div>
      <div className="mt-1 text-sm text-muted-foreground">
        {mimeType || "Binary file"}
      </div>
    </div>
  );
}
