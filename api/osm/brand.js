import { handleOsmBrandRequest } from "../../server/osm-brand.mjs";

export default async function handler(request, response) {
  await handleOsmBrandRequest(request, response);
}
