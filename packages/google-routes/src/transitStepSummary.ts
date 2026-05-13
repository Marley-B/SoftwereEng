/** UI-friendly segment built from Google Routes `RouteLegStep` objects. */
export interface TransitSegmentSummary {
  kind: "walk" | "transit";
  /** Vehicle category or "Walk". */
  modeLabel: string;
  /** Line short name, line title, or walking instruction. */
  line: string;
  /** Headsign, agency, or stop names when useful. */
  detail?: string;
}

interface LocalizedText {
  text?: string;
}

interface NavigationInstruction {
  instructions?: string;
}

interface TransitStop {
  name?: string;
}

interface TransitVehicle {
  type?: string;
  name?: LocalizedText;
}

interface TransitLine {
  nameShort?: string;
  name?: string;
  agencies?: Array<{ name?: string }>;
  vehicle?: TransitVehicle;
}

interface TransitStopDetails {
  departureStop?: TransitStop;
  arrivalStop?: TransitStop;
}

interface RouteLegStepTransitDetails {
  headsign?: string;
  transitLine?: TransitLine;
  stopDetails?: TransitStopDetails;
  stopCount?: number;
}

interface RouteLegStepLocalizedValues {
  staticDuration?: LocalizedText;
}

interface RouteLegStep {
  travelMode?: string;
  staticDuration?: string;
  navigationInstruction?: NavigationInstruction;
  localizedValues?: RouteLegStepLocalizedValues;
  transitDetails?: RouteLegStepTransitDetails;
}

interface RouteLeg {
  steps?: RouteLegStep[];
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  BUS: "Bus",
  CABLE_CAR: "Cable car",
  COMMUTER_TRAIN: "Commuter train",
  FERRY: "Ferry",
  FUNICULAR: "Funicular",
  GONDOLA_LIFT: "Gondola lift",
  HEAVY_RAIL: "Train",
  HIGH_SPEED_TRAIN: "High-speed train",
  INTERCITY_BUS: "Intercity bus",
  LONG_DISTANCE_TRAIN: "Long-distance train",
  METRO_RAIL: "Light rail",
  MONORAIL: "Monorail",
  OTHER: "Transit",
  RAIL: "Train",
  SHARE_TAXI: "Share taxi",
  SUBWAY: "Subway",
  TRAM: "Tram",
  TROLLEYBUS: "Trolleybus",
  TRANSIT_VEHICLE_TYPE_UNSPECIFIED: "Transit",
};

function localizedText(t: LocalizedText | undefined): string | undefined {
  const s = t?.text?.trim();
  return s || undefined;
}

function vehicleModeLabel(vehicle: TransitVehicle | undefined): string {
  const fromName = localizedText(vehicle?.name);
  if (fromName) {
    return fromName;
  }
  const t = vehicle?.type;
  if (!t) {
    return "Transit";
  }
  return VEHICLE_TYPE_LABELS[t] ?? "Transit";
}

function transitLineLabel(line: TransitLine | undefined): string {
  if (!line) {
    return "Transit";
  }
  const short = line.nameShort?.trim();
  const full = line.name?.trim();
  if (short && full && short !== full) {
    return `${short} · ${full}`;
  }
  return short || full || "Transit";
}

function formatWalkLine(step: RouteLegStep): string {
  const instr = step.navigationInstruction?.instructions?.trim();
  if (instr) {
    return instr;
  }
  const dur = localizedText(step.localizedValues?.staticDuration);
  if (dur) {
    return `Walk ${dur}`;
  }
  const sec = parseStepDurationSeconds(step.staticDuration);
  if (sec !== undefined && sec > 0) {
    const m = Math.max(1, Math.round(sec / 60));
    return `Walk ~${m} min`;
  }
  return "Walk";
}

function parseStepDurationSeconds(staticDuration: string | undefined): number | undefined {
  if (!staticDuration || !staticDuration.endsWith("s")) {
    return undefined;
  }
  const n = Number.parseFloat(staticDuration.replace("s", ""));
  return Number.isNaN(n) ? undefined : Math.round(n);
}

function transitDetailLine(details: RouteLegStepTransitDetails): string | undefined {
  const parts: string[] = [];
  const head = details.headsign?.trim();
  if (head) {
    parts.push(`Toward ${head}`);
  }
  const dep = details.stopDetails?.departureStop?.name?.trim();
  const arr = details.stopDetails?.arrivalStop?.name?.trim();
  if (dep && arr && dep !== arr) {
    parts.push(`${dep} → ${arr}`);
  } else if (dep) {
    parts.push(`From ${dep}`);
  } else if (arr) {
    parts.push(`To ${arr}`);
  }
  const sc = details.stopCount;
  if (typeof sc === "number" && sc > 0) {
    parts.push(`${sc} stop${sc === 1 ? "" : "s"}`);
  }
  const agency = details.transitLine?.agencies?.[0]?.name?.trim();
  if (agency) {
    parts.push(agency);
  }
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(" · ");
}

function rawStepToSegment(step: RouteLegStep): TransitSegmentSummary | null {
  const mode = step.travelMode ?? "";
  if (mode === "WALK") {
    return {
      kind: "walk",
      modeLabel: "Walk",
      line: formatWalkLine(step),
    };
  }
  if (mode === "TRANSIT" && step.transitDetails) {
    const td = step.transitDetails;
    const modeLabel = vehicleModeLabel(td.transitLine?.vehicle);
    const line = transitLineLabel(td.transitLine);
    const detail = transitDetailLine(td);
    return {
      kind: "transit",
      modeLabel,
      line,
      ...(detail ? { detail } : {}),
    };
  }
  return null;
}

/** Merge adjacent walk segments so the list matches typical trip summaries. */
function mergeAdjacentWalks(segments: TransitSegmentSummary[]): TransitSegmentSummary[] {
  const out: TransitSegmentSummary[] = [];
  for (const seg of segments) {
    const prev = out[out.length - 1];
    if (seg.kind === "walk" && prev?.kind === "walk") {
      prev.line = [prev.line, seg.line].filter(Boolean).join(" · ");
      continue;
    }
    out.push(seg);
  }
  return out;
}

/**
 * Extracts walk + transit segments from Google `routes[].legs` (first leg is used for summary).
 */
export function summarizeTransitLegs(legs: unknown): TransitSegmentSummary[] {
  if (!Array.isArray(legs) || legs.length === 0) {
    return [];
  }
  const first = legs[0] as RouteLeg;
  const steps = first.steps;
  if (!Array.isArray(steps)) {
    return [];
  }
  const raw: TransitSegmentSummary[] = [];
  for (const s of steps) {
    const seg = rawStepToSegment(s as RouteLegStep);
    if (seg) {
      raw.push(seg);
    }
  }
  return mergeAdjacentWalks(raw);
}
