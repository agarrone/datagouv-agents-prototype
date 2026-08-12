export type ManualTestStatus = "todo" | "passed" | "failed" | "blocked";

export type ManualTestScenario = {
  id: string;
  category: string;
  title: string;
  prompt: string;
  objective: string;
  expected: string;
  criteria: string[];
};

export const manualTestScenarios: ManualTestScenario[] = [
  {
    id: "content",
    category: "Contexte",
    title: "Compréhension de la ressource",
    prompt: "Explique-moi le contenu de ce jeu de données",
    objective: "Vérifier que le schéma et les métadonnées fondent la réponse.",
    expected: "Une présentation fidèle de la finalité, du contenu et des principales colonnes.",
    criteria: [
      "La ressource active est la bonne.",
      "Les colonnes citées existent.",
      "Les types techniques sont reformulés en français.",
    ],
  },
  {
    id: "schema",
    category: "Contexte",
    title: "Lecture du schéma",
    prompt: "Quelles sont les colonnes de ce jeu de données ?",
    objective: "Contrôler que le schéma chargé au démarrage est réutilisé.",
    expected: "Une liste fidèle des colonnes, sans requête SQL inutile.",
    criteria: [
      "Toutes les colonnes citées existent.",
      "Aucun SQL inutile n’est exécuté.",
      "La réponse reste lisible lorsque le schéma est long.",
    ],
  },
  {
    id: "answer",
    category: "Analyse",
    title: "Réponse sans modifier le tableau",
    prompt: "Combien de lignes contient cette ressource ?",
    objective: "Vérifier la distinction entre répondre et modifier l’explorateur.",
    expected: "Le nombre de lignes est donné dans la conversation et le tableau reste inchangé.",
    criteria: [
      "Le résultat correspond au compteur de l’explorateur.",
      "Aucune vue n’est proposée.",
      "Les opérations effectuées sont résumées à la fin.",
    ],
  },
  {
    id: "filter",
    category: "Explorateur",
    title: "Filtre explicite",
    prompt: "Filtre le tableau sur une valeur présente dans une colonne catégorielle",
    objective: "Tester la proposition d’une vue et sa confirmation par l’utilisateur.",
    expected: "Une vue conservant les colonnes est proposée avant toute application.",
    criteria: [
      "La requête conserve les colonnes avec SELECT *.",
      "Le tableau attend une confirmation explicite.",
      "La vue appliquée ne contient que les lignes attendues.",
    ],
  },
  {
    id: "clarification",
    category: "Clarification",
    title: "Correspondance ambiguë",
    prompt: "Filtre le tableau sur Lime",
    objective: "Éviter un choix arbitraire entre égalité et recherche partielle.",
    expected: "Une clarification courte, accompagnée de choix lorsque ceux-ci sont identifiables.",
    criteria: [
      "Aucun filtre large n’est appliqué avant la réponse.",
      "Les choix sont proposés sous forme de chips.",
      "Le choix relance correctement l’analyse.",
    ],
  },
  {
    id: "chart",
    category: "Visualisation",
    title: "Graphique",
    prompt: "Crée un graphique pertinent à partir de ces données",
    objective: "Tester la chaîne SQL, chargement, spécification et rendu graphique.",
    expected: "L’état de chargement est remplacé par un graphique cohérent fondé sur des données vérifiées.",
    criteria: [
      "Le graphique repose sur une requête SQL réussie.",
      "Le chargement apparaît après la réponse textuelle et garde la taille du résultat.",
      "Titre, source, axes, tooltips, copie et plein écran fonctionnent.",
    ],
  },
  {
    id: "map",
    category: "Visualisation",
    title: "Carte",
    prompt: "Crée une carte à partir des informations géographiques disponibles",
    objective: "Tester la détection et la représentation des données géographiques.",
    expected: "Une carte fiable, ou une explication claire si la ressource ne le permet pas.",
    criteria: [
      "Les champs géographiques utilisés existent et les valeurs invalides sont ignorées.",
      "Le fond, la légende, la source et les tooltips sont descriptifs.",
      "Le mode plein écran fonctionne depuis la conversation.",
    ],
  },
  {
    id: "follow-up",
    category: "Mémoire",
    title: "Question de suivi",
    prompt: "Et uniquement pour la catégorie précédente ?",
    objective: "Vérifier la conservation du contexte utile entre deux questions.",
    expected: "La question précédente est comprise sans mélange avec une ancienne analyse.",
    criteria: [
      "La ressource active reste correcte.",
      "La référence à la réponse précédente est comprise.",
      "Aucun contexte sans rapport n’est utilisé.",
    ],
  },
  {
    id: "out-of-scope",
    category: "Garde-fous",
    title: "Question hors sujet",
    prompt: "Donne-moi la recette de la tarte aux fraises",
    objective: "Vérifier que l’assistant reste centré sur la ressource chargée.",
    expected: "Un refus bref qui rappelle le périmètre et propose de revenir aux données.",
    criteria: [
      "Aucun tool de données n’est appelé.",
      "Aucune recette n’est générée.",
      "La réponse suggère une action pertinente sur la ressource.",
    ],
  },
  {
    id: "recovery",
    category: "Résilience",
    title: "Correction SQL",
    prompt: "Analyse une relation pertinente entre deux colonnes de types différents",
    objective: "Observer la correction d’une requête invalide ou imprécise.",
    expected: "La requête est corrigée ou l’impossibilité est expliquée clairement.",
    criteria: [
      "Les tentatives SQL échouées ne parasitent pas le résultat final.",
      "Une erreur intermédiaire n’est pas présentée comme définitive.",
      "L’erreur finale éventuelle propose une action de récupération.",
    ],
  },
  {
    id: "feedback",
    category: "Feedback",
    title: "Évaluation d’une réponse",
    prompt: "Évaluez la dernière réponse avec les boutons utile ou inutile",
    objective: "Contrôler l’envoi du feedback et l’accès au formulaire détaillé.",
    expected: "Le retour est confirmé, sans valeur présélectionnée, et le contexte de la ressource est transmis.",
    criteria: [
      "Les tooltips restent visibles dans le panneau.",
      "Le formulaire complémentaire Grist est proposé.",
      "Dataset_name, Dataset_url et Ressource_name sont renseignés lorsqu’ils sont disponibles.",
    ],
  },
];
