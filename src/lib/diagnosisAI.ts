// Lightweight, fully local "diagnosis assistant": pattern-matches the reported
// symptom text against a rule table of common appliance failure signatures and
// maps each to a likely cause + the spare parts historically associated with
// that fix. This is intentionally not a hosted-LLM call (the demo is a static
// site with no backend) — it demonstrates the UX and value of an AI copilot
// using rules a real model would eventually replace or augment.

interface DiagnosisRule {
  pattern: RegExp;
  cause: string;
  partNames: string[];
  confidence: number;
}

const RULES: DiagnosisRule[] = [
  { pattern: /not cooling|no cold air|cooling/i, cause: "Refrigerant leak or failing compressor relay", partNames: ["Refrigerant Gas R410a (kg)", "Compressor Relay", "Evaporator Coil"], confidence: 0.82 },
  { pattern: /compressor cycling/i, cause: "Faulty thermostat causing erratic compressor cycling", partNames: ["Thermostat", "Compressor Relay"], confidence: 0.74 },
  { pattern: /noise|vibrat/i, cause: "Worn fan motor or belt drive causing vibration/noise", partNames: ["Fan Motor", "Belt Drive"], confidence: 0.7 },
  { pattern: /not powering on|won.?t turn on|no power/i, cause: "Faulty PCB control board or power capacitor", partNames: ["PCB Control Board", "Capacitor 35uF"], confidence: 0.76 },
  { pattern: /leak/i, cause: "Blocked drain pump or worn door gasket allowing water through", partNames: ["Drain Pump", "Door Gasket", "Water Inlet Valve"], confidence: 0.68 },
  { pattern: /flicker|screen|crack|display/i, cause: "Display assembly or backlight fault", partNames: ["Display Screen Assembly", "LED Backlight Strip"], confidence: 0.8 },
  { pattern: /battery/i, cause: "Battery degradation past safe cycle count", partNames: ["Battery Pack"], confidence: 0.85 },
  { pattern: /error code/i, cause: "Sensor fault triggering a control-board error code", partNames: ["PCB Control Board", "Thermostat"], confidence: 0.6 },
  { pattern: /door not sealing|seal/i, cause: "Worn door gasket losing its seal", partNames: ["Door Gasket"], confidence: 0.78 },
  { pattern: /remote/i, cause: "Remote control battery or IR receiver fault", partNames: ["Remote Control"], confidence: 0.72 },
  { pattern: /overheat/i, cause: "Blocked air filter restricting airflow, or heating element fault", partNames: ["Air Filter", "Heating Element"], confidence: 0.65 },
  { pattern: /spin|cycle/i, cause: "Belt drive slipping or timer module misfiring", partNames: ["Belt Drive", "Timer Module"], confidence: 0.66 },
  { pattern: /drainage|blocked/i, cause: "Drain pump obstruction", partNames: ["Drain Pump"], confidence: 0.75 },
];

export interface DiagnosisSuggestion {
  cause: string;
  confidence: number;
  partNames: string[];
}

export function suggestDiagnosis(problemDescription: string): DiagnosisSuggestion[] {
  const matches = RULES.filter((r) => r.pattern.test(problemDescription));
  if (matches.length === 0) return [];
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2)
    .map((m) => ({ cause: m.cause, confidence: m.confidence, partNames: m.partNames }));
}

// Maps a connected-appliance telemetry error code straight to the spare parts a
// technician would carry for it — the value of pulling diagnostics before the
// truck rolls, per LG ThinQ Care / Samsung SmartThings-style service portals.
const TELEMETRY_PART_HINTS: Record<string, string[]> = {
  E1: ["Refrigerant Gas R410a (kg)", "Compressor Relay"],
  E5: ["Compressor Relay", "Capacitor 35uF"],
  F0: ["PCB Control Board"],
  "Er FF": ["Fan Motor"],
  "Er dh": ["Heating Element"],
  "Er 5C": ["Compressor Relay"],
  E4: ["Drain Pump"],
  UE: ["Belt Drive"],
  E2: ["Water Inlet Valve"],
  E101: ["LED Backlight Strip", "Display Screen Assembly"],
  E204: ["PCB Control Board"],
  "E-3": ["Door Gasket"],
  "F-1": ["Magnetron"],
};

export function suggestFromTelemetry(errorCode: string, errorDescription: string): DiagnosisSuggestion | null {
  const partNames = TELEMETRY_PART_HINTS[errorCode];
  if (!partNames) return null;
  return { cause: `${errorDescription} (error ${errorCode}, pulled from device telemetry)`, confidence: 0.93, partNames };
}
