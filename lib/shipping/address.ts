export type ShippingAddressInput = {
  fullName: string;
  prefix: string;
  customerCode: string;
  unit: string;
  addressLines: string[];
  city: string;
  region: string;
  postalCode: string;
  country: string;
};
export function formatShippingAddress(input: ShippingAddressInput) {
  return [
    [
      input.fullName.trim().replace(/\s+/g, " "),
      input.prefix.trim(),
      input.customerCode.trim(),
    ]
      .filter(Boolean)
      .join(" "),
    ...input.addressLines,
    input.unit,
    input.city,
    input.region,
    input.postalCode,
    input.country,
  ]
    .filter(Boolean)
    .join("\n");
}
