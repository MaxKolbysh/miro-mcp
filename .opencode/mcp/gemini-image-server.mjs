#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

await loadDotEnv(resolve(".env"));

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
const outputDir = resolve(process.env.GEMINI_IMAGE_OUTPUT_DIR || ".opencode/generated-images");

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;

  while (true) {
    const newlineIndex = input.indexOf("\n");
    if (newlineIndex === -1) return;

    const line = input.slice(0, newlineIndex).trim();
    input = input.slice(newlineIndex + 1);

    if (!line) continue;

    handleLine(line).catch((error) => {
      writeMessage({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    });
  }
});

async function handleLine(line) {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return;
  }

  if (!request.id && request.method?.startsWith("notifications/")) return;

  if (request.method === "initialize") {
    writeMessage({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: request.params?.protocolVersion || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "gemini-image", version: "0.1.0" },
      },
    });
    return;
  }

  if (request.method === "tools/list") {
    writeMessage({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        tools: [
          {
            name: "generate_image",
            description:
              "Generate an image with Google Gemini/Nano Banana and save it to a local file for later upload to Miro.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "Detailed image prompt. Include style, composition, aspect ratio, and what to avoid.",
                },
                file_name: {
                  type: "string",
                  description: "Optional output file name ending in .png. Unsafe characters are replaced.",
                },
              },
              required: ["prompt"],
              additionalProperties: false,
            },
          },
        ],
      },
    });
    return;
  }

  if (request.method === "tools/call") {
    if (request.params?.name !== "generate_image") {
      writeError(request.id, -32602, `Unknown tool: ${request.params?.name}`);
      return;
    }

    try {
      const result = await generateImage(request.params.arguments || {});
      const output = {
        filePath: result.filePath,
        file_path: result.filePath,
        mimeType: result.mimeType,
        mime_type: result.mimeType,
        model,
      };
      writeMessage({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(output),
            },
          ],
        },
      });
    } catch (error) {
      writeError(request.id, -32603, error instanceof Error ? error.message : String(error));
    }
    return;
  }

  writeError(request.id, -32601, `Unsupported method: ${request.method}`);
}

async function generateImage(args) {
  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY or GOOGLE_API_KEY before starting opencode.");
  }

  const prompt = String(args.prompt || "").trim();
  if (!prompt) throw new Error("prompt is required.");

  log("generate_image:start", { model, outputDir, promptLength: prompt.length });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  const body = await response.json().catch(() => ({}));
  log("generate_image:response", { status: response.status, ok: response.ok });
  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${JSON.stringify(body)}`);
  }

  const parts = body?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;
  if (!inlineData?.data) {
    const text = parts.map((part) => part.text).filter(Boolean).join("\n");
    throw new Error(`Gemini response did not include image data.${text ? ` Text response: ${text}` : ""}`);
  }

  await mkdir(outputDir, { recursive: true });
  const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
  const extension = mimeType.includes("jpeg") || mimeType.includes("jpg") ? ".jpg" : ".png";
  const fileName = sanitizeFileName(args.file_name, extension);
  const filePath = join(outputDir, fileName);
  const imageBytes = Buffer.from(inlineData.data, "base64");

  await writeFile(filePath, imageBytes);
  log("generate_image:saved", { filePath, mimeType, bytes: imageBytes.byteLength });

  return { filePath, mimeType };
}

function sanitizeFileName(value, extension) {
  const fallback = `gemini-${randomUUID()}${extension}`;
  if (!value) return fallback;

  const safeBase = basename(String(value))
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  if (!safeBase) return fallback;
  const baseWithoutImageExtension = safeBase.replace(/\.(?:png|jpe?g)$/i, "");
  if (!baseWithoutImageExtension) return fallback;

  return `${baseWithoutImageExtension}${extension}`;
}

function log(message, details = {}) {
  process.stderr.write(`[gemini-image] ${message} ${JSON.stringify(details)}\n`);
}

async function loadDotEnv(filePath) {
  let content;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const rawValue = line.slice(equalsIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = unquoteEnvValue(rawValue);
  }
}

function unquoteEnvValue(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function writeError(id, code, message) {
  writeMessage({ jsonrpc: "2.0", id, error: { code, message } });
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
