---
name: SPIKE-LOCAL-MODEL-SELECTION
description: Which local model and quantisation the Classifier should run on a CPU-only Windows machine with 32 GB RAM, and why parameter count matters more than bit depth
date: 2026-09-08
metadata:
  version: 1.1
  created-by: Claude Opus 5
  story: P2.10, P2.11
---

# Spike — choosing a local model for classification and tagging on CPU

Story P2.10 pins whatever tag `application.yaml` already names and puts model choice on quality
grounds explicitly out of scope. This is that deferred question, answered for one specific machine:
Windows, 32 GB RAM, no dedicated GPU.

`application.yaml:38` currently says `model: mistral`. Ollama resolves that floating tag to Mistral
7B at Q4_0.

Everything below is an argument from hardware and from model generation. None of it is a measurement.
Story P2.11 exists to test the conclusion against real documents, and it can overturn it.

## The constraint is bandwidth, not capacity

With no VRAM, every weight is read from system RAM on every token. 32 GB would hold a 32B model at
4-bit; it would generate at roughly one to two tokens per second. Capacity is not what limits this
machine.

Generation throughput on CPU approximates `effective memory bandwidth ÷ model size in bytes`.
Dual-channel DDR4-3200 delivers somewhere near 35 GB/s in practice against 51 GB/s on paper;
DDR5-5600 gets nearer 60. **Which of the two this machine has is the first thing to measure**, because
it sets every number below.

That formula gives, for a 4-bit model:

| Parameters | Size at Q4_K_M | Generation, ~35 GB/s | Generation, ~60 GB/s |
|---|---|---|---|
| 4B | ~2.5 GB | ~14 tok/s | ~24 tok/s |
| 8B | ~4.9 GB | ~7 tok/s | ~12 tok/s |
| 14B | ~9 GB | ~4 tok/s | ~6 tok/s |
| 32B | ~20 GB | ~1.7 tok/s | ~3 tok/s |

These are ceilings from bandwidth alone and ignore sampling overhead, so treat them as the optimistic
end.

## For the Classifier, prefill is the cost

ADR31's output contract is a topic string and a tag array — call it 40 tokens. The input is a whole
document. So the Classifier spends almost all of its wall time reading the prompt, not writing the
answer, and prefill is compute-bound rather than bandwidth-bound: it scales with core count and
AVX support.

A rough figure for an 8B model on a desktop CPU is 20–60 prompt tokens per second. A 2,000-token
document is then 30 to 100 seconds before the first output token appears. A 4B model roughly halves
that. Under `concurrency: 1` this cost is serialised across every document in the queue, which is
what makes parameter count the decision that matters here.

## Quantisation

Q4_K_M is the answer for anything at 7B or above.

| Level | Size at 8B | Verdict |
|---|---|---|
| Q8_0 | ~8.5 GB | Spends bandwidth on accuracy no tagging task will notice |
| Q6_K | ~6.6 GB | Reasonable if there is speed to spare |
| Q5_K_M | ~5.7 GB | Worth the cost on models of 4B and under |
| **Q4_K_M** | ~4.9 GB | The default |
| Q4_0 | ~4.7 GB | The older scheme; measurably worse than Q4_K_M at nearly the same size |
| Q3_K, Q2_K | ~3.5 GB and below | JSON structure starts to break down |

The K-quants allocate more bits to the layers that are sensitive to rounding and fewer to the rest,
which is why Q4_K_M beats Q4_0 without being meaningfully larger. The current `mistral` tag is Q4_0,
so switching quantisation alone is free.

## Recommendation

**A 4B-class model at Q4_K_M.** `qwen3:4b` is the strongest instruction-follower at that size and
holds JSON shape well; `gemma3:4b` is the alternative if it does not. Move up to `qwen3:8b-q4_K_M`
only if tag quality proves measurably worse, and expect classification latency to roughly double.

The interesting part is that this is smaller than what the project names today. Mistral 7B dates from
2023, and a 2025-era 4B model beats it on instruction-following and on structured output while being
half the size. Both axes point the same way.

ADR31's balanced-brace parser exists precisely because "local 7B-class models wrap JSON in prose or
in a code fence regardless of instruction". That observation is a fair description of Mistral 7B and
a poor one of the current generation of small instruct models.

## Two settings that matter more than the model

**Constrain the output at the sampler.** Ollama's OpenAI-compatible surface — the one
`OllamaHttpClient` already calls — accepts `response_format: {"type": "json_schema", ...}`. That
restricts decoding to tokens that keep the output valid against the schema, so the model cannot emit
a code fence or a preamble at all. This is what makes a 4B model reliable enough for ADR31's
contract. The tolerant parser stays as the safety net and stops firing in normal operation.

**Cap `num_ctx`.** Ollama allocates the KV cache for the full declared context whether or not the
prompt uses it. Set it to 4096 or 8192 and truncate long documents before the call. An unbounded
context on CPU is where the pathological latencies come from, and a document long enough to need
more than 8k tokens of context is one the Classifier should be sampling rather than reading whole.

Also worth setting, both of which belong to P2.10 decision 5:

- `OLLAMA_KEEP_ALIVE=30m`, so the model is not reloaded from disk between documents. A 2.5 GB reload
  costs more than the classification does. The memory it holds resident is the model size.
- `OLLAMA_NUM_PARALLEL=1`, matching the single-permit `ConcurrencyGate` from P2.1. Leaving Ollama
  free to run several requests at once against a gate that admits one wastes the KV cache
  allocation.

## Alternative considered — embeddings instead of a chat model

Tagging against a fixed vocabulary does not need a generative model at all. An embedding model
(`nomic-embed-text`, `bge-m3`) plus cosine similarity against pre-embedded tag descriptions runs in
tens of milliseconds on CPU, against tens of seconds for a chat model, and the vault is already
embedded by Smart Connections.

Rejected for now on one point: ADR31 decided the Classifier produces the vocabulary rather than
selecting from one, and an embedding model can only select. It becomes the better answer the moment
"tag vocabulary drifts" — which ADR31 lists as a consequence and as the first thing to revisit if
search gets noisy — actually becomes a problem. Worth keeping in view for `topic`, which is a free
noun phrase, versus tags, which want to be a controlled set. P2.11 measures the drift, which is what
would tell anyone whether that moment has arrived.

## What to measure

**Story P2.11 owns this section.** It was written here as a list of open questions; it is now that
story's scope, and the numbers belong in ADR34 rather than in a later version of this file.

P2.10 already records wall time for one `/v1/chat/completions` call. Four numbers would settle this
document:

1. Memory type and speed (`Get-CimInstance Win32_PhysicalMemory | Select Speed, ConfiguredClockSpeed`),
   which fixes which column of the throughput table applies.
2. Prefill and generation rates per candidate model, from Ollama's own timings
   (`ollama run <model> --verbose`).
3. End-to-end Classifier wall time on a real document of typical length, for `mistral`,
   `qwen3:4b` and `qwen3:8b`.
4. Tag agreement across the three on the same set of documents. Speed is worthless if the tags are
   wrong, and nothing in the project has yet compared a model's output against a human answer —
   Story P2.4 closed with every test using a hand-written fake.

Number 4 is the one that can reverse the recommendation above, and it is also the expensive one,
because it needs documents somebody has labelled by hand. P2.11 treats that fixture set as its
longest-lived artifact for exactly that reason.

## Consequences for P2.10

P2.10 decision 2 says to pin the tag the project already names. If this document is accepted, the tag
it pins changes, and decision 3's storage estimate ("a 7B model at 4-bit is roughly 4–5 GB") halves.
Nothing else in that story moves.

P2.11 can then change the pin again, on evidence rather than on the argument made here. That is the
intended order: pin something so behaviour stops drifting, then measure, then re-pin once.
