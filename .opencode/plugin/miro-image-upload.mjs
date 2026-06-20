import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pendingUploads = new Map();

export default async function miroImageUploadPlugin() {
  return {
    "tool.definition": async (input, output) => {
      if (isTool(input.toolID, "miro_image_get_upload_url")) {
        output.description = `${output.description}\n\nOpenCode helper: for local or Gemini-generated images, pass local_file_path with the path to the image. The plugin will upload the bytes after Miro returns the presigned URL and will hide the long upload URL from the model-visible output.`;
        addLocalFilePathParameter(output.parameters);
      }

      if (isTool(input.toolID, "miro_image_create")) {
        output.description = `${output.description}\n\nOpenCode helper: when image_token is provided, this plugin normalizes image_url/title/x/y/width placeholders before the remote Miro call so token-created images use the placement stored during upload-url creation.`;
      }
    },

    "tool.execute.before": async (input, output) => {
      if (isTool(input.tool, "miro_image_get_upload_url")) {
        const filePath = String(output.args?.local_file_path || "").trim();
        if (filePath) {
          pendingUploads.set(input.callID, {
            filePath: resolve(filePath),
            contentType: output.args?.content_type || guessContentType(filePath),
          });
          delete output.args.local_file_path;
        }
      }

      if (isTool(input.tool, "miro_image_create") && output.args?.image_token) {
        // The remote Miro tool treats non-empty placeholders as a real image_url.
        output.args.image_url = "";
        output.args.title ??= "";
        output.args.x ??= 0;
        output.args.y ??= 0;
        output.args.width ??= 1;
      }
    },

    "tool.execute.after": async (input, output) => {
      if (!isTool(input.tool, "miro_image_get_upload_url")) return;

      const pending = pendingUploads.get(input.callID);
      if (!pending) return;
      pendingUploads.delete(input.callID);

      const payload = parseToolJson(output.output);
      const uploadUrl = payload?.upload_url;
      const token = payload?.token;
      if (!uploadUrl || !token) {
        output.output = JSON.stringify({
          uploaded: false,
          error: "Miro upload-url response did not include upload_url and token.",
          original_response_keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
        });
        return;
      }

      try {
        const bytes = await readFile(pending.filePath);
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": pending.contentType },
          body: bytes,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          output.output = JSON.stringify({
            uploaded: false,
            token,
            image_token: token,
            file_path: pending.filePath,
            content_type: pending.contentType,
            status: response.status,
            error: body || response.statusText,
            next_step: "Fix the upload error, then retry miro_image_get_upload_url with local_file_path.",
          });
          return;
        }

        output.title = `${output.title || "Miro image upload"} (local file uploaded)`;
        output.output = JSON.stringify(
          {
            uploaded: true,
            token,
            image_token: token,
            file_path: pending.filePath,
            content_type: pending.contentType,
            bytes: bytes.byteLength,
            next_step:
              "Call miro_image_create with this image_token. The plugin will normalize image_url/title/x/y/width placeholders automatically.",
          },
          null,
          2,
        );
      } catch (error) {
        output.output = JSON.stringify({
          uploaded: false,
          token,
          image_token: token,
          file_path: pending.filePath,
          content_type: pending.contentType,
          error: error instanceof Error ? error.message : String(error),
          next_step: "Fix the local file path or permissions, then retry miro_image_get_upload_url with local_file_path.",
        });
      }
    },
  };
}

function addLocalFilePathParameter(parameters) {
  if (!parameters || typeof parameters !== "object") return;

  parameters.properties ??= {};
  parameters.properties.local_file_path = {
    type: "string",
    description:
      "Optional local path to an image file. When set, OpenCode uploads this file to the returned Miro presigned URL and returns only the token, not the long upload URL.",
  };
}

function isTool(toolID, name) {
  return typeof toolID === "string" && (toolID === name || toolID.endsWith(`_${name}`) || toolID.includes(name));
}

function parseToolJson(value) {
  if (value && typeof value === "object") return value;
  const text = String(value || "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function guessContentType(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".psd")) return "image/vnd.adobe.photoshop";
  return "image/png";
}
