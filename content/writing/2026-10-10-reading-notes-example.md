---
date: 2026-10-10
type: reading-notes
tags: [VLM, Robotics]
summary: A sample structure for connecting a paper's main idea, experimental evidence, and open questions.
example: true
---

# Reading a paper: a working template

This example demonstrates the reading-note format. Replace it with notes on a paper you have read.

## Paper

Record the paper's title, authors, year, and original source link here. Keep the paper's conclusions separate from your own interpretation.

## Main idea

Start with the problem. What does the method change, and why should that change help? A useful short explanation covers:

1. The limitation the paper identifies.
2. The mechanism the authors introduce.
3. The evidence supporting their claim.

### A notation example

Inline formulas such as $p(y \mid x)$ work within a sentence. Display equations can have their own line:

$$
\mathcal{L}(\theta) = -\sum_{i=1}^{N} \log p_\theta(y_i \mid x_i).
$$

This is a formatting example, not an equation attributed to a particular paper.

## Evidence and limitations

| Question | What to look for |
| --- | --- |
| What changed? | Architecture, data, training, or evaluation |
| Is the comparison fair? | Compute budgets and comparable baselines |
| Where does it fail? | Error cases and out-of-distribution tests |

## My take

Write the part that an abstract cannot tell the reader: what you found convincing, where you remain uncertain, and which experiment you would run next.

> Working notes can contain open questions. Label speculation explicitly.

## Follow-up

- Revisit an ablation that isolates the main contribution.
- Compare the evaluation setup with a related paper.
- Turn one open question into a small experiment.

For an example of the other article type, see [the experiment log example](2026-10-09-experiment-log-example.md).
