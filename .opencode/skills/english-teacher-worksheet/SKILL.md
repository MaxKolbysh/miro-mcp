---
name: english-teacher-worksheet
description: Use when creating reusable English teacher worksheets, ESL/EFL lesson materials, Miro worksheet boards, article-based lessons, card games, exercises, teacher notes, answer keys, or Gemini/Miro image assets.
---

# English Teacher Worksheet

Use this skill to create polished English teacher worksheets in Miro from an existing design board or frame. The output should be practical for teachers, visually consistent with the source design, and reusable in class.

## Required Inputs

Ask one concise clarification question only if a required input is missing and cannot be reasonably inferred.

- Miro board URL or frame URL containing the target design style.
- Learner level, preferably CEFR such as A2, B1, B2, C1.
- Topic or theme.
- Lesson duration or worksheet scope.
- Article links, or permission to find/suggest suitable article links.
- Desired activity types, if any: reading, vocabulary, grammar, speaking, writing, card game, homework, answer key.

## Default Output

Create a complete Miro worksheet package with these sections unless the user asks otherwise:

- Title and lesson objective.
- Warm-up prompt.
- Article section with source links, short summaries, and teacher-friendly notes.
- Vocabulary section with definitions, examples, and learner-safe wording.
- Reading comprehension exercises.
- Language focus or grammar noticing task.
- Speaking or discussion task.
- Card game or cut-out activity.
- Optional writing or homework task.
- Answer key.
- Teacher notes with timing and setup instructions.

## Workflow

1. Explore the source Miro board with `miro_context_explore`, `miro_context_get`, `miro_layout_read`, or item-specific reads.
2. Identify the reusable visual system: frame sizes, section layout, colors, typography style, spacing, card formats, and visual hierarchy.
3. Gather or process article inputs. Preserve links and cite source URLs in the worksheet.
4. Decide image sources:
   - Use real article images only when the source allows public display or the user explicitly provides/approves the URL.
   - If a fetch MCP such as `web-fetcher` is available, use it to inspect article pages for image URLs, captions, alt text, and licensing/source context before deciding whether to use article images.
   - Use Gemini-generated images for custom scenes, abstract concepts, or when rights are unclear.
   - Avoid adding copyrighted article images from restricted pages.
5. Draft lesson content at the requested learner level.
6. Create the worksheet in Miro using the existing design language.
7. Add article links as visible source text or link fields.
8. Add images using the proper upload flow.
9. Review the board for classroom usability: readable text, clear task order, enough whitespace, and teacher-ready instructions.

## Miro Design Rules

- Match the existing board style instead of inventing a generic template.
- Prefer frames for major worksheet pages or activity zones.
- Keep student-facing content visually separate from teacher notes and answer keys.
- Use consistent colors for repeated roles, such as reading, vocabulary, grammar, speaking, game cards, and answers.
- Keep cards printable or easily movable when creating games.
- Avoid overcrowding. If content is large, split it across multiple frames.

## Article Handling

- Keep article links visible and clickable where possible.
- Include a short summary rather than copying full article text unless the user provided the text or the source permits it.
- Adapt language for the learner level.
- For reading tasks, use excerpts, summaries, or teacher-provided text where copyright is uncertain.
- Note any assumptions about source rights when using real images or long extracts.
- When using article images, fetch and record the image source URL plus any visible caption/credit/license information.
- Only place an article image in Miro when it is publicly accessible and either clearly permitted for reuse, provided by the user, or explicitly approved by the user for classroom use.
- If image rights are unclear, do not use the article image; generate a visually similar but original Gemini image instead.
- Add a visible source/credit note near any article image used in the worksheet.

## Gemini Image Rules

- Generate images when they improve comprehension, engagement, or card-game play.
- Prompt for classroom-safe, uncluttered, high-contrast images.
- Prefer simple illustration or editorial style unless the source design clearly uses photography.
- Avoid text inside generated images.
- Use the `gemini-image` tool to generate local files, then upload to Miro.
- Generated images must be included visibly in the worksheet slides/frames, not only generated as local files.
- Place at least one image in a student-facing frame, such as the title, warm-up, reading, vocabulary, or card-game frame.
- Use images as teaching prompts: add a nearby question, instruction, or activity that refers to the image.
- Size and position images so they are clearly visible and do not overlap text, cards, or teacher notes.

## Miro Image Upload Rules

- For Gemini-generated images, always use the token upload flow. Do not try to place the local file directly and do not use a placeholder `image_url`.
- Call `miro_image_get_upload_url` for each generated or local image, including the intended `title`, `x`, `y`, and `width` there. These placement values are stored with the returned token.
- Upload bytes to the returned `upload_url` with the exact matching content type, such as `image/png` or `image/jpeg`.
- Then call `miro_image_create` with the returned `image_token`. Set `image_url` to `null`; do not pass a string placeholder such as `":"`, `""`, or the local path.
- When creating from an `image_token`, `title`, `x`, `y`, and `width` are ignored because they come from the token. Set them to `null` if the tool schema requires the fields.
- When using a public image URL directly, call `miro_image_create` with `image_url` and set `image_token` to `null`.
- For permitted article images with a stable public URL, use `miro_image_create` with `image_url` directly. For images that require download or transformation, use the upload token flow instead.
- Never pass both a non-null `image_token` and a non-null `image_url`.
- After creating each image item, verify it appears on the target board or frame with `miro_board_list_items`, `miro_layout_read`, or another suitable read/list tool. If the image is missing, fix the upload/create flow before finishing.

Example token placement after uploading a Gemini-generated image:

```json
{
  "miro_url": "https://miro.com/app/board/uXj...=/?moveToWidget=FRAME_ID",
  "image_token": "TOKEN_FROM_IMAGE_GET_UPLOAD_URL",
  "image_url": null,
  "title": null,
  "x": null,
  "y": null,
  "width": null
}
```

## Card Game Patterns

Choose the simplest game that supports the language objective.

- Vocabulary match: word cards plus definition/example cards.
- Discussion deck: prompts ranked by difficulty.
- Opinion line: statement cards for agree/disagree discussion.
- Role-play cards: role, goal, useful language, constraint.
- Taboo-style speaking: target word plus forbidden words.
- Article recall: fact, inference, and opinion cards.

Each card should be short, legible, and movable. Include teacher setup instructions and suggested timing.

## Exercise Patterns

- Lead-in: prediction, image prompt, personal connection.
- Vocabulary: match, gap-fill, collocation, word family, synonym/antonym.
- Reading: gist, detail, inference, true/false/not given, headline matching.
- Grammar: noticing from article language, controlled practice, personalized production.
- Speaking: pair questions, debate prompts, ranking task, problem-solving task.
- Writing: short response, comment, email, opinion paragraph.

## Quality Checklist

Before finishing, verify:

- The worksheet matches the source Miro design closely enough to feel like the same template family.
- The learner level is appropriate.
- Article links are included.
- Gemini-generated images are visible inside the worksheet frames and support a task or prompt.
- Real images have acceptable source handling or are replaced with generated images.
- Instructions are teacher-ready and student-facing tasks are clear.
- Card game pieces are easy to move or print.
- Answer key and teacher notes are separate from student sections.
- Miro items are not overlapping and are placed in a logical reading order.

## Example User Request

Use this skill for requests like:

```text
Create a B1 English teacher worksheet from this Miro design: <board-url>. Topic: AI in schools. Use these two article links: <links>. Include a warm-up, vocabulary, reading comprehension, discussion cards, one Gemini image, and answer key.
```

## Final Response Format

Keep the final response concise:

- Link to the created or updated Miro board/frame.
- Brief list of included worksheet sections.
- Mention any article/image rights assumptions if relevant.
- Mention if OpenCode needs restart only when the skill itself was created or edited.
