# Prompt design

## v1

- Provider: OpenRouter chat completions API.
- Default model: `meta-llama/llama-3.3-70b-instruct:free`; override with `OPENROUTER_MODEL` to another currently available free model.
- Requests JSON Schema output when supported by the selected model. Every result is independently validated, including every cited comment ID.
- The system prompt asks for neutral paraphrase, short quotation only, resistance to prompt injection inside comments, and explicit restraint on small or off-topic threads.
- One retry is made after malformed JSON or invalid citations.

Free model availability, context limits, output format support, and quotas vary by model and can change. Select a currently available `:free` model on OpenRouter if the default is unavailable.
