import type { Channel } from "./types";

export interface MessageTemplate {
  id: string;
  label: string;
  channels: Channel[];
  body: string;
}

// Fixed templates seeded from the FixFlow sales deck's example customer messages,
// plus the spec's other trigger points. {{tokens}} are substituted at send time;
// the result stays editable before sending.
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "received",
    label: "Item Received",
    channels: ["whatsapp", "sms"],
    body: "Hi {{customer}} — we've received your {{appliance}} ({{jobId}}). We'll share a diagnosis shortly.",
  },
  {
    id: "estimate_ready",
    label: "Estimate Ready",
    channels: ["whatsapp", "sms", "email"],
    body: "Estimate ready for {{jobId}}: {{amount}} for parts + labor. Reply YES to approve.",
  },
  {
    id: "repair_complete",
    label: "Repair Complete",
    channels: ["whatsapp", "sms"],
    body: "Your {{appliance}} is repaired and ready for pickup today after 4 PM.",
  },
  {
    id: "pickup_reminder",
    label: "Pickup Reminder",
    channels: ["whatsapp", "sms"],
    body: "Reminder: your {{appliance}} ({{jobId}}) is ready for pickup. Please collect at your convenience.",
  },
  {
    id: "warranty_report",
    label: "Warranty Report (Email)",
    channels: ["email"],
    body: "Dear {{customer}}, please find attached the warranty validation report for {{jobId}} — {{appliance}}.",
  },
  {
    id: "custom",
    label: "Custom message",
    channels: ["whatsapp", "sms", "email"],
    body: "",
  },
];

export function renderTemplate(body: string, tokens: Record<string, string>) {
  return body.replace(/{{\s*(\w+)\s*}}/g, (_, key) => tokens[key] ?? "");
}
