import { SHIPMENT_STATES } from "../billing/pricing";
import { z } from "zod";
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const reason = text(5, 2000),
  uuid = z.uuid();
export const workspaceSchemas = {
  fulfillment: z
    .object({
      packageId: uuid,
      method: z.enum(["delivery", "pickup"]),
      address: text(0, 500).default(""),
      locationId: z.union([uuid, z.literal("")]).default(""),
    })
    .refine((d) => d.method !== "delivery" || d.address.length >= 10),
  location: z.object({
    name: text(2, 120),
    address: text(10, 500),
    parish: text(2, 80),
    hours: text(3, 300),
    reason,
  }),
  "location-status": z.object({
    id: uuid,
    active: z.enum(["true", "false"]),
    reason,
  }),
  "customer-status": z.object({
    profileId: uuid,
    expected: z.enum(["active", "suspended"]),
    status: z.enum(["active", "suspended"]),
    reason,
  }),
  ticket: z.object({
    packageId: uuid,
    locationId: uuid,
    available: z.iso.datetime(),
    instructions: text(5, 1000),
    reason,
  }),
  "ticket-email": z.object({ ticketId: uuid }),
  "pre-alert": z.object({
    requestId: uuid,
    tracking: text(1, 120),
    merchant: text(1, 160),
    carrier: text(0, 80).default(""),
    description: text(5, 1000),
    quantity: z.coerce.number().int().min(1).max(1000),
    value: z.coerce.number().positive().max(1000000).multipleOf(0.01),
    currency: z.enum(["USD", "JMD"]),
    notes: text(0, 2000).default(""),
    acknowledged: z.literal("on"),
  }),
  profile: z.object({
    fullName: text(2, 120),
    phone: text(7, 30),
    accountType: z.enum(["personal", "business"]),
  }),
  support: z.object({
    requestId: uuid,
    subject: text(5, 160),
    body: text(10, 2000),
    packageReference: text(0, 120).default(""),
  }),
  event: z.object({
    packageId: uuid,
    expected: text(1, 40),
    status: z.enum(SHIPMENT_STATES),
    source: text(5, 500),
    reason,
    occurred: z.iso.datetime(),
  }),
  correction: z.object({
    packageId: uuid,
    eventId: uuid,
    status: z.enum([
      "pre_alerted",
      "received_us",
      "processing_us",
      "in_transit",
      "arrived_jm",
    ]),
    source: text(5, 500),
    reason,
    explanation: text(5, 1000),
    occurred: z.iso.datetime(),
  }),
  queue: z.object({
    id: uuid,
    version: z.coerce.number().int().positive(),
    assignee: z.union([uuid, z.literal("")]),
    priority: z.coerce.number().int().min(0).max(3),
    due: z.union([z.iso.datetime(), z.literal("")]),
    reason,
  }),
  intake: z.object({ tracking: text(1, 120), source: text(5, 500), reason }),
  match: z.object({ id: uuid, packageId: uuid, reason }),
  resolve: z.object({ id: uuid, reply: text(5, 2000), reason }),
  assignment: z.object({
    profileId: uuid,
    warehouseId: uuid,
    code: text(1, 120),
    prefix: text(1, 80),
    unit: text(1, 120),
    reason,
  }),
};
