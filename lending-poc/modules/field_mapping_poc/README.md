# LegalAI Field Mapping POC

Generalized, schema-agnostic field mapping using a local Ollama model
(default: `gemma3:4b`). Takes raw OCR/translated text + a target
schema (arbitrary JSON, not a fixed Pydantic model) and returns a
schema-shaped JSON with values filled in, `null` where nothing was
found, and any extra fields the model discovers flagged separately.

## Project layout

```
legalai_field_mapping_poc/
├── config.py                    # model name, ollama host, retries, flagging keys
├── main.py                      # CLI demo entry point
├── core/
│   ├── ollama_client.py         # thin wrapper around the ollama lib + retries
│   ├── prompt_builder.py        # builds the system/user prompt from schema + text
│   ├── response_parser.py       # JSON repair + schema reconciliation
│   └── mapper.py                # FieldMapper — orchestrates the three above
├── schemas/examples/
│   ├── salary_slip.json         # flat schema example
│   └── identity_card.json       # nested schema example (address object)
├── samples/
│   └── sample_ocr_text.txt      # messy OCR-style salary slip for the demo
└── tests/
    └── test_response_parser.py  # offline tests, no Ollama needed
```

## Setup

```bash
pip install -r requirements.txt --break-system-packages   # or use a venv

# pull the model once
ollama pull gemma3:4b
ollama serve   # if not already running
```

## Run the demo

```bash
python main.py
# or point it at a different schema/text pair
python main.py --schema schemas/examples/identity_card.json --text samples/sample_ocr_text.txt
```

## Run the offline tests (no Ollama required)

```bash
python tests/test_response_parser.py
# or, with pytest installed:
python -m pytest tests/ -v
```

## Design notes

**Why the schema isn't a Pydantic model.** This needs to work across
arbitrary document types (salary slips, identity cards, court orders,
affidavits, ...) without writing a new Python class per type. So the
"schema" is just a JSON object where each key is a field name and each
value is a short type/description hint (`"string"`, `"number"`,
`"date (DD-MM-YYYY)"`). It can nest (see `identity_card.json`'s
`address` object). `FieldMapper.map_fields(schema, text)` works the
same way regardless of what schema you pass in.

**Extra-field convention.** The model is explicitly allowed to surface
fields it's confident about that aren't in the schema (e.g. a UAN
number on a salary slip). These stay at the same nesting level as
everything else ("flat"), but get wrapped:

```json
"uanNumber": { "value": "101234567890", "source": "llm_added" }
```

while schema-defined fields stay as plain values:

```json
"employeeName": "Ishaan Deshmukh"
```

This means code that only cares about the schema fields doesn't need
to change at all — it can keep reading plain values. Code that wants
to review/promote extra fields (e.g. before Neo4j insertion) can just
filter on `isinstance(v, dict) and v.get("source") == "llm_added"`.

**Reliability layers.**
1. `format="json"` is passed to Ollama, which constrains the model to
   emit syntactically valid JSON (supported by Gemma 3 and other
   JSON-mode-capable models).
2. `response_parser.py` still does a repair pass (strips stray
   markdown fences, extracts the `{...}` substring) in case the model
   wraps the JSON in commentary anyway.
3. `reconcile_with_schema()` guarantees every schema key exists in the
   final output — even if the model silently dropped one — by
   filling it with `null`.
4. `ollama_client.py` retries transient failures with linear backoff
   (configurable via `OLLAMA_MAX_RETRIES`).

**What's deliberately out of scope for this POC** (per the ask):
- Neo4j insertion — this only produces the clean per-document JSON
  that would later be written to the graph.
- Confidence scoring per field.
- Batching / async processing across many documents at once.
- The LoRA/QLoRA fine-tuning step — this POC targets a base/instruct
  Gemma model via prompting only, to establish a baseline before any
  fine-tuning work.

## Suggested next steps

- Run this against a handful of real document types (salary slip,
  Aadhaar/PAN, property extract, etc.) and eyeball how often
  `llm_added` fields are genuinely useful vs. noise — that ratio
  should inform whether the "add new fields" permission stays as
  loose as it is now, or gets tightened (e.g. require a `confidence`
  field, or a controlled vocabulary of allowed extra fields per
  document type).
- Once field mapping is trusted, this is the natural point to bolt on
  the Neo4j writer: schema fields become properties on a `:Document`
  node (or field-specific nodes, depending on how the graph model is
  set up for cross-document consistency checks), and `llm_added`
  fields can be written with an extra `source: "llm_added"` property
  so later Cypher queries can distinguish provenance.
- If `gemma3:4b` under-performs on domain-specific field names (legal
  terminology, regional document formats), that's the point to swap
  in the QLoRA-fine-tuned checkpoint — `ollama_client.py` only needs
  `OLLAMA_MODEL` changed, nothing else in the pipeline changes.
