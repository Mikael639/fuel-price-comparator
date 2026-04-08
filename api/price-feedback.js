import { handlePriceFeedbackRequest } from "../server/price-feedback.mjs";

export default async function handler(request, response) {
  await handlePriceFeedbackRequest(request, response);
}
