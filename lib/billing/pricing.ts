// Owner approved on 2026-10-20. Customer shipping charges and internal planning
// assumptions are separate; no duty/tax/last-mile tariff is inferred here.
export const APPROVED_RATE_CENTS = [
  69500, 109500, 139500, 169500, 199500, 229500, 259500, 289500, 319500, 349500,
] as const;
export const PRICING_APPROVAL =
  "Owner approval, 2026-10-20; supplied JMD table and cost inputs";
export const COST_FIELDS = [
  "freight",
  "receiving",
  "consolidation",
  "payment",
  "last_mile",
  "other",
] as const;
export const SHIPMENT_STATES = [
  "pre_alerted",
  "received_us",
  "processing_us",
  "in_transit",
  "arrived_jm",
  "customs_processing",
  "customs_hold",
  "cleared",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "exception",
  "returned",
  "cancelled",
] as const;
export const NEXT_STATES: Record<string, string[]> = {
  pre_alerted: ["received_us", "cancelled"],
  received_us: ["processing_us", "exception", "returned"],
  processing_us: ["in_transit", "exception", "returned"],
  in_transit: ["arrived_jm", "exception", "returned"],
  arrived_jm: ["customs_processing", "exception", "returned"],
  customs_processing: ["customs_hold", "cleared", "exception", "returned"],
  customs_hold: ["customs_processing", "cleared", "exception", "returned"],
  cleared: ["ready_for_pickup", "exception", "returned"],
  ready_for_pickup: ["out_for_delivery", "delivered", "exception", "returned"],
  out_for_delivery: ["delivered", "exception", "returned"],
};
export function weightMilli(value: string) {
  if (!/^\d{1,5}(?:\.\d{1,3})?$/.test(value))
    throw Error("Enter a positive weight with up to three decimals.");
  const [whole, decimal = ""] = value.split(".");
  const n = Number(whole) * 1000 + Number(decimal.padEnd(3, "0"));
  if (n <= 0 || n > 50000000)
    throw Error("Weight is outside the supported range.");
  return n;
}
export function moneyCents(value: string) {
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(value))
    throw Error(
      "Use a non-negative JMD amount with at most two decimal places.",
    );
  const [whole, decimal = ""] = value.split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
}
export function shippingQuote(weight: string) {
  const milli = weightMilli(weight),
    billableWeight = Math.ceil(milli / 1000);
  return billableWeight > 10
    ? { billableWeight, quoteRequired: true as const }
    : {
        billableWeight,
        quoteRequired: false as const,
        amountCents: APPROVED_RATE_CENTS[billableWeight - 1],
      };
}
const round = (n: bigint, d: bigint) => Number((n + d / BigInt(2)) / d);
export function planningContribution(weight: string) {
  const q = shippingQuote(weight);
  if (q.quoteRequired) return null;
  const freight = round(
      BigInt(weightMilli(weight)) *
        BigInt(45359237) *
        BigInt(350) *
        BigInt(160),
      BigInt(100000000000),
    ),
    receiving = 21600,
    consolidation = 6280,
    payment = round(BigInt(q.amountCents) * BigInt(3), BigInt(100));
  const cost = freight + receiving + consolidation + payment;
  return {
    revenueCents: q.amountCents,
    freightCents: freight,
    receivingCents: receiving,
    consolidationCents: consolidation,
    paymentCents: payment,
    planningContributionCents: q.amountCents - cost,
    assumptions:
      "Planning only: measured lb converted to kg; USD3.50/kg, USD1.35 receiving, USD25 delivery per consolidation; USD14.25 AWB/XML/bag provisionally pooled with it over 100 packages, JMD160/USD, 3% payment fee. Last-mile/other costs excluded; confirm AWB/XML/bag allocation before relying on this scenario.",
  };
}
export const jmd = (cents: number) =>
  new Intl.NumberFormat("en-JM", { style: "currency", currency: "JMD" }).format(
    cents / 100,
  );
