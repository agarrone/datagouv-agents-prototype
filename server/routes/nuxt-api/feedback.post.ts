import { feedbackSchema } from "~~/shared/schemas/feedback";
import { buildFeedbackFields } from "~~/server/services/feedback";

const gristFeedbackEndpoint =
  "https://grist.numerique.gouv.fr/o/datagouv/api/s/iMKAxQa486jfLdQ5AJEyHj/tables/Retours_assistant/records?utm_source=grist-forms";

export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event);
  const origin = getHeader(event, "origin");

  if (origin && origin !== requestUrl.origin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Origine non autorisée.",
    });
  }

  const feedback = feedbackSchema.safeParse(await readBody(event));
  if (!feedback.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le retour envoyé est invalide.",
    });
  }

  const fields = buildFeedbackFields(feedback.data);

  try {
    await $fetch(gristFeedbackEndpoint, {
      method: "POST",
      body: { records: [{ fields }] },
    });
    return { sent: true };
  } catch (error) {
    console.error("Feedback submission error", error);
    throw createError({
      statusCode: 502,
      statusMessage: "Le retour n’a pas pu être envoyé.",
    });
  }
});
