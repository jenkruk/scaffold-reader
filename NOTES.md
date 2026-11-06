# Data problems found

- **The proficiency levels weren't consistent.** Some students had numbers while Diego had `"Expanding"`. I mapped the named level to the WIDA scale so all four students could be evaluated the same way. If I couldn't confidently map a value, I chose not to guess.
- **Languages weren't represented consistently either.** Students had values like `"Spanish"` and `"Español"`, while scaffolds used `es` and `es-MX`. I normalized the student values to base language codes. Since the student data doesn't include locale, I decided an `es` student should still see an `es-MX` scaffold rather than lose useful support because of specificity the student record doesn't provide.
- **Anchors came in two formats.** Some used offsets and others quoted text. I normalized both into the same shape. For quotes, I require exactly one match because silently choosing the first occurrence felt riskier than rejecting an ambiguous scaffold.
- **`s-08` is duplicated.** I didn't want to alter the source data or throw either scaffold away, so I kept the original ID and added the array position to create a unique internal key.
- **`"water vapor"` and `"vapor"` overlap.** I didn't want students to see nested or competing controls inside a sentence. I combine eligible overlapping supports into one trigger, but keep each support tied to the phrase it originally described.
- **`s-11` has much lower confidence than everything else.** I chose `0.5` as a cutoff for this exercise and don't show lower-confidence support to a student. I would want to validate that threshold with educators and product stakeholders before using it in a real product.

I kept `"vapor"` → `"vapor"`. It initially looks redundant, but the word is valid in both languages and confirming that meaning can still be useful.

# Why your scaffolds look and behave the way they do

My main goal was to keep the student reading.

I wanted the help to feel available without competing with the passage, so the scaffolds are quiet inline controls rather than badges, icons, or permanently visible definitions. A student chooses when they need support, and the help stays next to the phrase they were reading.

I also kept the interaction consistent across mouse, keyboard, and touch. Help opens intentionally rather than on hover, overlapping supports stay together, and the card is non-modal so opening a definition never takes over the reading experience.

The visual design is intentionally restrained to avoid distraction and keep the student's focus on the text.

# What I'd do next with more time

I would validate the confidence threshold and scaffold behavior with educators and students rather than treating my assumptions as product requirements. I would also broaden real-device and assistive-technology testing and add runtime schema validation if this data were coming from an API.

I'd also be interested in whether teachers need visibility into rejected or low-confidence scaffolds. That information seemed more useful as an internal or educator-facing tool than something a student should have to interpret.

# How I used AI tools

I used ChatGPT and Claude Code throughout the exercise. Claude Code helped me move quickly through implementation and testing, while I used ChatGPT heavily as a second opinion on architecture, UX, accessibility, and tradeoffs.

I didn't always take the suggestions. The mobile scaffold interaction is a good example: I tried an in-flow treatment, then a bottom tray, and rejected both because they either interrupted the sentence or separated the help too far from the phrase. I ultimately went back to a contextual popover and refined its responsive positioning.

In retrospect, I relied too much on AI to help polish the written explanation of the work. The decisions were mine, but the notes didn't communicate enough of the reasoning behind them. I would handle that differently next time.

Approximate implementation time: 2 hours 40 minutes.