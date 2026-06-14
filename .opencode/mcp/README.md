# Gemini Image MCP

This local MCP server exposes a `generate_image` tool for Google Gemini image generation and saves the result as a local PNG/JPG file.

## Setup

Create a `.env` file in the project root:

```bash
GEMINI_API_KEY=your_google_gemini_api_key
```

Or set your API key before starting opencode:

```bash
export GEMINI_API_KEY="your_google_gemini_api_key"
```

On Windows PowerShell:

```powershell
$env:GEMINI_API_KEY="your_google_gemini_api_key"
```

Optional model override:

```bash
export GEMINI_IMAGE_MODEL="gemini-2.5-flash-image-preview"
```

The server reads `.env` itself. Real environment variables take priority over `.env` values.

## Workflow With Miro

1. Ask opencode to generate an image with the `gemini-image.generate_image` MCP tool.
2. The tool saves the image under `.opencode/generated-images`.
3. Upload the file to Miro using the Miro image upload workflow.
4. Place the uploaded image inside the target lesson frame or slide.

## Prompt Tip

For lesson slides, specify:

- topic
- visual style
- aspect ratio
- no text unless needed
- classroom-safe content
- clear composition for a slide

Example:

```text
Create a 16:9 editorial illustration for an English lesson about Met Gala outfits. Show three diverse fashion silhouettes on a red carpet, dramatic lighting, no logos, no readable text, polished magazine style.
```
