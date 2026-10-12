<script setup lang="ts">
const route = useRoute();
const formBaseUrl = "https://grist.numerique.gouv.fr/o/datagouv/forms/rchxExoA1GEDLCVHNae7Y8/25";
const betaTesterFormBaseUrl = "https://grist.numerique.gouv.fr/o/datagouv/forms/hwUYRYmjXZnTD1eXAaMTEa/17";

const betaTesterUrl = betaTesterFormBaseUrl;
const openedForm = ref<"feedback" | "beta" | null>(null);

const pageType = computed(() => {
  if (route.path === "/") return "Accueil";
  if (route.path.startsWith("/laboratoire/exploration")) return "Explorateur";
  if (route.path.startsWith("/documentation")) return "Documentation";
  if (route.path.startsWith("/experiences")) return "Expérimentation";
  return "Autre";
});

const feedbackUrl = computed(() => {
  const url = new URL(formBaseUrl);
  url.searchParams.set("origin", `Bandeau · ${pageType.value}`);
  return url.toString();
});
</script>

<template>
  <aside class="sticky top-0 z-[90] border-b border-[#cacafb] bg-[#ececfe] text-[#161616]" aria-label="Information sur le prototype">
    <div class="mx-auto grid min-h-9 w-full max-w-[90rem] grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-2 px-4 py-2 text-[11px] leading-4 sm:flex sm:items-center sm:gap-x-3 sm:gap-y-1 sm:px-6 sm:text-[12px]">
      <i aria-hidden="true" class="ri-flask-line mt-0.5 shrink-0 text-[15px] leading-none text-[#000091] sm:mt-0" />
      <p class="min-w-0 flex-1">
        <strong>Prototype de démonstration.</strong>
        Les réponses peuvent être incomplètes ou erronées et doivent être vérifiées avant réutilisation.
      </p>
      <div class="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pl-6 sm:ml-auto sm:shrink-0 sm:flex-nowrap sm:pl-0">
        <button class="font-medium text-[#000091] underline underline-offset-2 hover:text-[#1212ff]" type="button" @click="openedForm = 'beta'">
          Devenir bêta-testeur
        </button>
        <button class="font-medium text-[#000091] underline underline-offset-2 hover:text-[#1212ff]" type="button" @click="openedForm = 'feedback'">
          Donner votre avis
        </button>
        <NuxtLink class="hidden font-medium text-[#000091] underline underline-offset-2 hover:text-[#1212ff] lg:inline" to="/documentation">
          En savoir plus
        </NuxtLink>
      </div>
    </div>
  </aside>
  <EmbeddedFormDialog
    v-if="openedForm === 'feedback'"
    title="Donner votre avis"
    description="Partagez votre impression générale sur le prototype. Aucune identité n’est demandée."
    :form-url="feedbackUrl"
    @close="openedForm = null"
  />
  <EmbeddedFormDialog
    v-else-if="openedForm === 'beta'"
    title="Devenir bêta-testeur"
    description="Inscrivez-vous pour participer aux prochains tests du prototype."
    :form-url="betaTesterUrl"
    @close="openedForm = null"
  />
</template>
