# Data problems found

- **Mixed proficiency formats:** numeric levels and labels such as `"Expanding"` are normalized to the WIDA 1–6 scale. Unknown values are not guessed.
- **Inconsistent languages:** student language names are normalized to base codes so values like `"Spanish"` and `es-MX` can be matched appropriately.
- **Mixed anchors:** offset-based and quoted-text anchors are normalized to one `{ start, end, text }` shape. Quotes must match exactly once.
- **Duplicate IDs:** both `s-08` records are kept, with deterministic internal keys so the source data is not altered.
- **Overlapping anchors:** `"water vapor"` and `"vapor"` are merged into one trigger while preserving both supports.
- **Low confidence:** `s-11` (`0.31`) remains in normalized data but is hidden below an exercise-specific `0.5` display threshold.

I kept `"vapor"` → `"vapor"` because identical wording can still be a valid translation.

# Why your scaffolds look and behave the way they do

The passage stays primary, so scaffolds are subtle inline buttons and help appears only when requested. Click, tap, Enter, or Space opens a contextual card near the phrase; it flips above when needed and keeps overlapping supports together.

The interaction is non-modal. Escape, the close button, or clicking outside dismisses help, keyboard focus returns to the phrase, translations include `lang`, and state is never communicated by color alone. The student selector is a native radio group styled as tabs.

# What you'd do next with more time

- Validate assumptions such as the confidence threshold with educators.
- Expand real-device and screen-reader testing.
- Add runtime schema validation for external/API data.
- Consider an internal view for diagnostics and confidence scores.

# How you used AI tools

I used ChatGPT and Claude Code to inspect the data, challenge architecture and UX decisions, accelerate implementation and tests, and review accessibility and responsive behavior. I reviewed the output throughout and changed direction when suggestions did not fit the product goal.

Approximate implementation time: 2 hours 40 minutes.
