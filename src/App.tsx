import { useState } from "react";
import { parseSpec } from "./core/spec";
import { generateTests } from "./core/generate";

export default function App() {
  const [spec, setSpec] = useState("# spec: MySpec\n");
  const [out, setOut] = useState("");
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">GhostSpec</h1>
      <textarea className="w-full h-40 bg-gray-900 text-green-300 p-3 rounded" value={spec} onChange={(e) => setSpec(e.target.value)} />
      <button className="mt-3 px-4 py-2 bg-purple-700 rounded" onClick={() => setOut(generateTests(parseSpec(spec)))}>Generate</button>
      <pre className="mt-4 bg-gray-900 p-3 rounded whitespace-pre-wrap">{out}</pre>
    </div>
  );
}