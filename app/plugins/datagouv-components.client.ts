import { datagouv } from "@datagouv/components-next/dist/components-next.js";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(datagouv, {
    name: "data.gouv.fr",
    baseUrl: "https://www.data.gouv.fr",
    apiBase: "https://www.data.gouv.fr",
    tabularApiUrl: "https://tabular-api.data.gouv.fr",
  });
});
