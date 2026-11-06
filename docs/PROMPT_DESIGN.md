# Prompt design

## v1

- Provider: OpenRouter chat completions API.
- Default model: `google/gemma-4-26b-a4b-it:free`, which supports structured output; override with `OPENROUTER_MODEL` to pin another currently available free chat model.
- Requests JSON Schema output when supported by the selected model. Every result is independently validated, including every cited comment ID.
- The system prompt asks for neutral paraphrase, short quotation only, resistance to prompt injection inside comments, and explicit restraint on small or off-topic threads.
- One retry is made after malformed JSON or invalid citations.

Free model availability, context limits, output format support, and quotas vary by model and can change. Gemini Omni is a paid video-generation model; Gemma 4 26B A4B is the free Google chat model used here.
