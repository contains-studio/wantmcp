import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "product-comparison-in-plain-text",
  order: 36,
  group: "delegating",
  title: "Compare products in one plain, readable list",
  description:
    "Your AI agent visits the shops and writes each option out in words: size, materials, controls and price, with a link. You read one tidy list, not ten pages.",
  h1: "One plain list instead of ten shop pages",
  intro: "Say what you want and which details matter. Your agent writes each option out in words, including what the photos would have shown.",
  label: "Plain-text product comparison",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Kitchen and desk: compared in words",
      description: "Every option described in text: size, materials, controls, price.",
      look: "sheet",
      items: [
        {
          want: "A 5-quart air fryer with physical knobs, not a touchscreen",
          details: "Describe the controls: how many, where they sit, whether they click.",
          products: [
            { title: "Twin-dial air fryer, 5 qt", store: "Copperline Kitchen", price: "79.99", was: "99.99", earlier: ["99.99", "89.99"], by: "Claude", note: "Two round dials on the front: left sets temperature in clicks of 25°F, right is a 60-minute timer that rings at zero. 12 x 11 x 13 in." },
            { title: "Basket air fryer with knob and two buttons, 5.5 qt", store: "Maple Street Home", price: "89.00", by: "Gemini", note: "One large knob in the center with a raised dot at the top; power and start buttons below it, each a different shape. Basket handle is plastic." },
            { title: "Digital air fryer, 5 qt", store: "Harbor Electronics", price: "69.99", by: "ChatGPT", note: "Flat touch panel with eight icons and no raised edges. Listed for completeness; does not meet the knobs request." },
          ],
        },
        {
          want: "A full-size keyboard with a number pad and clearly separated keys",
          products: [
            { title: "Wired full-size keyboard, quiet keys", store: "Fieldstone", price: "44.99", by: "Codex", image: "keyboard", note: "Standard layout, 17.5 x 5.5 in. Raised bumps on F, J and the 5 on the number pad. Keys have a small gap between them." },
            { title: "Wireless keyboard, low profile", store: "Harbor Electronics", price: "59.00", was: "74.00", by: "Claude", image: "keyboard", note: "Chiclet keys with flat tops. The arrow keys are half-height and share a block with Page Up and Down." },
          ],
        },
        {
          want: "A stainless electric kettle with a lid that opens by button",
          bought: 0,
          products: [
            { title: "1.7 L kettle, push-button lid, ridged handle", store: "Hearth & Table", price: "39.95", by: "Gemini", note: "Lid button on top of the handle; on-off switch at the base of the handle, clicks when pressed. Beeps once when boiled." },
            { title: "Gooseneck kettle with temperature dial", store: "Morning Ritual Coffee Co.", price: "64.00", was: "79.00", by: "ChatGPT", note: "Lid lifts off by a small knob rather than a button." },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Shopping legwork for the agents",
      look: "today",
      items: [
        {
          want: "For each air fryer, find the manual and describe the control panel",
          status: "in_progress",
          updates: [{ title: "Two of three manuals found", body: "Both describe the dials in text with positions and settings. The third store links only a picture of the panel; still looking for a text manual.", links: ["https://example.com/manuals/twin-dial-af"], by: "Claude" }],
        },
        {
          want: "Check each store's return policy and write it in two lines",
          dueInDays: 3,
        },
        { want: "Add the weight of each kettle when full" },
        { want: "Put the keyboard options in the same order: size, layout, key feel, price", status: "done", doneNote: "Every entry now follows that order." },
      ],
    },
    research: {
      format: "research",
      title: "Questions about the options",
      look: "doc",
      items: [
        {
          want: "Does the twin-dial air fryer make a sound when the timer ends?",
          accepted: 0,
          updates: [
            { title: "Yes: a bell rings for about two seconds", body: "The manual says the mechanical timer rings when it reaches zero and the heating stops at the same time.", links: ["https://example.com/manuals/twin-dial-af"], by: "Claude" },
            { title: "The fan keeps running for 20 seconds after", body: "A product Q&A answer from the maker says the fan runs briefly to cool down, so a quiet hum continues after the bell.", links: ["https://example.org/twin-dial-af/faq"], by: "Grok" },
          ],
        },
        {
          want: "Which kettle has the steadiest base when pouring?",
          status: "in_progress",
          updates: [{ title: "The 1.7 L kettle's base is wider", body: "Its spec sheet lists an 8-inch base against 6.5 inches for the gooseneck. Still checking the weights.", links: ["https://example.com/specs/kettles"], by: "Gemini" }],
        },
        { want: "Is the low-profile keyboard's battery replaceable or built in?" },
      ],
    },
  },
} satisfies Persona;
