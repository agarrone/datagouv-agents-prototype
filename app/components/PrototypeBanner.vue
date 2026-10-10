<script setup lang="ts">
const feedbackContext = useGenericFeedbackContext();
const route = useRoute();
const formBaseUrl = "https://grist.numerique.gouv.fr/o/datagouv/forms/gPEhuAgf3KHL2WJ5iW8zQa/16";
const betaTesterFormBaseUrl = "https://grist.numerique.gouv.fr/o/datagouv/forms/hwUYRYmjXZnTD1eXAaMTEa/17";

const betaTesterUrl = computed(() => {
  const url = new URL(betaTesterFormBaseUrl);
  url.searchParams.set("Source", "Prototype data.gouv.fr");
  url.searchParams.set("Created_at", new Date().toISOString());
  return url.toString();
});

const pageType = computed(() => {
  if (route.path === "/") return "Accueil";
  if (route.path.startsWith("/laboratoire/exploration")) return "Explorateur";
  if (route.path.startsWith("/documentation")) return "Documentation";
  if (route.path.startsWith("/experiences")) return "Expérimentation";
  return "Autre";
});

const feedbackUrl = computed(() => {
  const url = new URL(formBaseUrl);
  url.searchParams.set("Origin", "Bandeau");
  url.searchParams.set("Page_type", pageType.value);
  // Une URL d’exploration complète contient elle-même plusieurs URL encodées.
  // Injectée dans l’URL du formulaire, elle déclenche la protection Imperva de
  // Grist. Le chemin identifie la page ; le jeu et la ressource sont transmis
  // séparément dans leurs champs dédiés.
  url.searchParams.set("Page_url", route.path);
  url.searchParams.set("CreatedAt", new Date().toISOString());
  const context = feedbackContext.value;
  if (context.datasetName) url.searchParams.set("Dataset_name", context.datasetName);
  if (context.datasetUrl) url.searchParams.set("Dataset_url", context.datasetUrl);
  if (context.resourceName) url.searchParams.set("Ressource_name", context.resourceName);
  if (context.resourceUrl) url.searchParams.set("Resource", context.resourceUrl);
  if (context.model) url.searchParams.set("Model", context.model);
  return url.toString();
});
</script>

<template>
  <aside class="sticky top-0 z-[90] border-b border-[#cacafb] bg-[#ececfe] text-[#161616]" aria-label="Information sur le prototype">
    <div class="mx-auto flex min-h-9 w-full max-w-[90rem] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[11px] leading-4 sm:flex-nowrap sm:px-6 sm:text-[12px]">
      <i aria-hidden="true" class="ri-flask-line shrink-0 text-[15px] leading-none text-[#000091]" />
      <p class="min-w-0 flex-1">
        <strong>Prototype de démonstration.</strong>
        Les réponses peuvent être incomplètes ou erronées et doivent être vérifiées avant réutilisation.
      </p>
      <div class="ml-6 flex shrink-0 items-center gap-3 sm:ml-0">
        <a :href="betaTesterUrl" class="font-medium text-[#000091] underline underline-offset-2 hover:text-[#1212ff]" rel="noopener noreferrer" target="_blank">
          Devenir bêta-testeur
          <span class="sr-only"> (nouvel onglet)</span>
        </a>
        <a :href="feedbackUrl" class="font-medium text-[#000091] underline underline-offset-2 hover:text-[#1212ff]" rel="noopener noreferrer" target="_blank">
          Donner votre avis
          <span class="sr-only"> (nouvel onglet)</span>
        </a>
        <NuxtLink class="hidden font-medium text-[#000091] underline underline-offset-2 hover:text-[#1212ff] lg:inline" to="/documentation">
          En savoir plus
        </NuxtLink>
      </div>
    </div>
  </aside>
</template>
