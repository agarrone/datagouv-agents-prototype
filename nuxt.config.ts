import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-07-19",
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: "fr" },
      title: "Assistant de données — Prototype data.gouv.fr",
      meta: [
        { name: "description", content: "Un prototype pour interroger et explorer des jeux de données en langage naturel." },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:site_name", content: "Assistant de données — Prototype data.gouv.fr" },
        { property: "og:title", content: "Posez vos questions directement aux données" },
        { property: "og:description", content: "Explorez des jeux de données de data.gouv.fr en langage naturel, avec des requêtes, graphiques et cartes vérifiables." },
        { property: "og:url", content: "https://datagouv-agent.agarrone.fr/" },
        { property: "og:image", content: "https://datagouv-agent.agarrone.fr/link-preview.png" },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "675" },
        { property: "og:image:alt", content: "Prototype data.gouv — Assistant d’exploration de données" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Posez vos questions directement aux données" },
        { name: "twitter:description", content: "Explorez des jeux de données de data.gouv.fr en langage naturel." },
        { name: "twitter:image", content: "https://datagouv-agent.agarrone.fr/link-preview.png" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/icon.png" },
        { rel: "apple-touch-icon", href: "/icon.png" },
      ],
    },
  },
  modules: ["@nuxt/eslint"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    albertApiUrl: "",
    albertApiKey: "",
    albertModel: "",
    albertTemperature: "",
    albertPresencePenalty: "",
    rateLimitSecret: "",
    albertDailyRequestLimit: "",
  },
  typescript: {
    strict: true,
    // Le contrôle continu de vite-plugin-checker est actuellement incompatible
    // avec le runtime Vite 8 de Nuxt 4.5. Le typage reste exécuté pendant le
    // build et via la commande dédiée `pnpm typecheck`.
    typeCheck: "build",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
