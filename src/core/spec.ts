export interface Spec {
  name: string;
  properties: Property[];
}

export interface Property {
  name: string;
  kind: "roundtrip" | "invariant" | "no-crash";
  input: string;
  expected?: string;
}

export function parseSpec(text: string): Spec {
  const lines = text.split(/\r?\n/);
  let name = "UnnamedSpec";
  const properties: Property[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^#\s*spec:\s*(.+)$/i);
    if (m) { name = m[1].trim(); continue; }
    const pm = line.match(/^-\s*property\s+(\w+)\s*\(([^)]*)\)\s*:\s*(.+)$/i);
    if (pm) {
      properties.push({ name: pm[1], kind: "invariant", input: pm[2].trim(), expected: pm[3].trim() });
    }
  }
  return { name, properties };
}