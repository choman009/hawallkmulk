type MatchRequest = {
  kind: string;
  type: string;
  city: string;
  neighborhood: string;
  currency: string;
  budget_min: number | null;
  budget_max: number | null;
  area_min: number | null;
  area_max: number | null;
  bedrooms: number | null;
};
type MatchProperty = {
  type: string;
  purpose: string;
  city: string;
  neighborhood: string;
  price: number | null;
  currency: string;
  area: number | null;
  bedrooms: number | null;
  status: string;
};
const clean = (s: string) =>
  s.trim().toLocaleLowerCase().replace(/ك/g, "ک").replace(/ي/g, "ی");
export function matchingProperties<T extends MatchProperty>(
  request: MatchRequest,
  properties: T[],
): T[] {
  if (request.kind === "sell") return [];
  return properties.filter(
    (p) =>
      p.status === "available" &&
      p.purpose === (request.kind === "rent" ? "rent" : "sale") &&
      p.currency === request.currency &&
      p.type === request.type &&
      (!request.city || clean(p.city) === clean(request.city)) &&
      (!request.neighborhood ||
        clean(p.neighborhood).includes(clean(request.neighborhood))) &&
      (request.budget_min == null ||
        (p.price != null && p.price >= request.budget_min)) &&
      (request.budget_max == null ||
        (p.price != null && p.price <= request.budget_max)) &&
      (request.area_min == null ||
        (p.area != null && p.area >= request.area_min)) &&
      (request.area_max == null ||
        (p.area != null && p.area <= request.area_max)) &&
      (request.bedrooms == null ||
        (p.bedrooms != null && p.bedrooms >= request.bedrooms)),
  );
}
