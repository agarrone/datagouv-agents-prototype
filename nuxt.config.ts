import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-07-19",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    aiBaseUrl: "",
    aiApiKey: "",
    aiModel: "",
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
