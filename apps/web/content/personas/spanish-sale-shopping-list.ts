import type { Persona } from "../../app/lib/personas.ts";

export default {
  slug: "spanish-sale-shopping-list",
  order: 64,
  group: "anywhere",
  title: "A sale shopping list you can write in Spanish",
  description:
    "Write your wants in Spanish or English and ask your agent in Spanish. Each price lands beside the earlier ones, so a puffed-up \"before\" price stands out.",
  h1: "Sale shopping, in Spanish or English",
  intro: "The site is in English, but your wants don't have to be. Write them in Spanish and ask your agent in Spanish; it can reply and leave notes the same way.",
  label: "Sale shopping in Spanish",
  index: false,
  lists: {
    shopping: {
      format: "shopping",
      title: "Ofertas de Black Friday",
      description: "Precios revisados antes y durante la venta.",
      look: "sheet--black-friday",
      items: [
        {
          want: "Lavadora de carga frontal, menos de $700",
          details: "Tiene que caber en 27 pulgadas de ancho.",
          products: [
            {
              title: "Front-load washer, 4.5 cu ft",
              store: "Riverside Appliance",
              price: "649.00",
              was: "899.00",
              earlier: ["749.00", "899.00"],
              by: "Claude",
              note: "El precio \"antes\" de $899 solo duró dos semanas; en octubre estaba en $749.",
            },
            { title: "Front-load washer with steam, 4.3 cu ft", store: "Casa Linda Home", price: "699.99", by: "ChatGPT" },
          ],
        },
        {
          want: "Audífonos inalámbricos para el gimnasio",
          products: [
            { title: "Sweat-resistant wireless earbuds", store: "Plaza Sound", price: "59.99", was: "89.99", by: "Gemini" },
            { title: "Ear-hook wireless earbuds", store: "Casa Linda Home", price: "49.00", by: "Grok", note: "También se pueden pagar en 4 pagos de $12.25." },
          ],
        },
        {
          want: "Tenis para correr, talla 9 de hombre",
          bought: 1,
          products: [
            { title: "Cushioned road running shoe, men's 9", store: "Pacer Lane", price: "84.00", was: "120.00", by: "Claude", image: "shoe" },
            { title: "Lightweight running shoe, men's 9", store: "Fieldhouse Sports", price: "72.50", by: "Codex", image: "shoe" },
          ],
        },
        {
          want: "A high-power blender for smoothies",
          products: [
            { title: "1,200-watt blender, 64 oz jar", store: "Casa Linda Home", price: "79.99", was: "109.99", by: "ChatGPT", coupon: "VIERNES10" },
            { title: "Personal blender with two travel cups", store: "Riverside Appliance", price: "39.99", by: "Muse" },
          ],
        },
      ],
    },
    tasks: {
      format: "tasks",
      title: "Plan para la semana de ofertas",
      look: "today--cyber-monday",
      items: [
        {
          want: "Pedirle al agente los precios el lunes y otra vez el viernes",
          status: "in_progress",
          updates: [
            {
              title: "Precios del lunes publicados",
              body: "Tres de cuatro ya bajaron desde octubre. La licuadora sigue igual.",
              by: "Claude",
            },
          ],
        },
        { want: "Check the washer's return policy, delivery and haul-away fees", dueInDays: 2 },
        { want: "Medir el espacio de la lavandería", status: "done", doneNote: "27 pulgadas de ancho: caben las dos lavadoras." },
        { want: "Decidir si conviene pagar en cuotas o de una vez" },
      ],
    },
    research: {
      format: "research",
      title: "Antes de comprar",
      look: "doc",
      items: [
        {
          want: "¿El precio \"antes\" de la lavadora fue real?",
          accepted: 0,
          updates: [
            {
              title: "No del todo: estuvo en $749 casi todo octubre",
              body: "Los precios guardados en esta lista muestran $749 en octubre y $899 solo dos semanas antes de la venta.",
              links: ["https://example.com/price-history/washer"],
              by: "Claude",
            },
            { title: "Sí, $899 es el precio de lista", body: "Según la página del fabricante, aunque las tiendas casi nunca lo cobran.", links: ["https://example.org/washer/specs"], by: "Gemini" },
          ],
        },
        {
          want: "Does the washer price include delivery and hookup?",
          status: "in_progress",
          updates: [
            {
              title: "Delivery yes, hookup $49 extra at Riverside",
              body: "Haul-away of the old washer is another $25. Still checking Casa Linda's terms.",
              links: ["https://example.com/riverside/delivery"],
              by: "ChatGPT",
            },
          ],
        },
        { want: "¿Qué garantía tienen los audífonos si se dañan con el sudor?" },
      ],
    },
  },
} satisfies Persona;
