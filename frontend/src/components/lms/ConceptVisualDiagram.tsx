"use client";

import React from "react";

export type SubjectDomain = "PYTHON" | "DSA" | "GRAPHICS" | "PHYSICS" | "TOC" | "GENERAL";

export function detectSubjectDomain(
  courseCode: string = "",
  courseTitle: string = "",
  topicTitle: string = ""
): SubjectDomain {
  const text = `${courseCode} ${courseTitle} ${topicTitle}`.toLowerCase();
  if (text.includes("python") || text.includes("cs-101") || text.includes("cs101")) return "PYTHON";
  if (
    text.includes("dsa") ||
    text.includes("data structure") ||
    text.includes("algorithm") ||
    text.includes("tree") ||
    text.includes("linked list") ||
    text.includes("cs-301") ||
    text.includes("cs301")
  )
    return "DSA";
  if (
    text.includes("graphic") ||
    text.includes("cad") ||
    text.includes("me-102") ||
    text.includes("me102") ||
    text.includes("projection") ||
    text.includes("isometric") ||
    text.includes("orthographic")
  )
    return "GRAPHICS";
  if (
    text.includes("physic") ||
    text.includes("ph-101") ||
    text.includes("ph101") ||
    text.includes("optics") ||
    text.includes("laser") ||
    text.includes("quantum") ||
    text.includes("wave") ||
    text.includes("harmonic")
  )
    return "PHYSICS";
  if (
    text.includes("automata") ||
    text.includes("toc") ||
    text.includes("computation") ||
    text.includes("it-04") ||
    text.includes("turing") ||
    text.includes("grammar") ||
    text.includes("dfa") ||
    text.includes("nfa")
  )
    return "TOC";
  return "GENERAL";
}

export interface ConceptVisualDiagramProps {
  cardIndex: number;
  topicTitle: string;
  courseTitle: string;
  courseCode?: string;
}

export function ConceptVisualDiagram({
  cardIndex,
  topicTitle,
  courseTitle,
  courseCode,
}: ConceptVisualDiagramProps) {
  const domain = detectSubjectDomain(courseCode || "", courseTitle || "", topicTitle || "");

  // ==========================================
  // DOMAIN 1: PYTHON PROGRAMMING
  // ==========================================
  if (domain === "PYTHON") {
    if (cardIndex === 0) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <defs>
              <marker id="arrow-py" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
              </marker>
            </defs>
            {[
              { title: "Source Code", sub: "main.py", x: 30, color: "#ffffff" },
              { title: "Bytecode Compiler", sub: "CPython (.pyc)", x: 225, color: "#eff6ff" },
              { title: "Python VM (PVM)", sub: "Runtime Loop", x: 420, color: "#eff6ff" },
              { title: "Memory Engine", sub: "Stack & Heap Objects", x: 615, color: "#dbeafe" },
            ].map((step, idx) => (
              <g key={idx}>
                <rect x={step.x} y="45" width="145" height="85" rx="14" fill={step.color} stroke="#1e3a8a" strokeWidth="3" />
                <text x={step.x + 72} y="82" textAnchor="middle" className="fill-blue-950 font-sans text-[13px] font-bold">
                  {step.title}
                </text>
                <text x={step.x + 72} y="106" textAnchor="middle" className="fill-blue-700 font-mono text-[11px] font-semibold">
                  {step.sub}
                </text>
                {idx < 3 && (
                  <line x1={step.x + 145} y1="87" x2={step.x + 195} y2="87" stroke="#2563eb" strokeWidth="3" markerEnd="url(#arrow-py)" />
                )}
              </g>
            ))}
          </svg>
        </div>
      );
    }

    if (cardIndex === 1) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <rect x="40" y="30" width="320" height="115" rx="14" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="200" y="58" textAnchor="middle" className="fill-blue-900 font-sans text-[14px] font-bold">
              List Contiguous Memory: [10, 20, 30]
            </text>
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x={70 + i * 85} y="75" width="75" height="42" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
                <text x={70 + i * 85 + 37} y="96" textAnchor="middle" className="fill-blue-950 font-mono text-[13px] font-bold">
                  {(i + 1) * 10}
                </text>
                <text x={70 + i * 85 + 37} y="112" textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                  idx [{i}]
                </text>
              </g>
            ))}

            <rect x="420" y="30" width="320" height="115" rx="14" fill="#eff6ff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="580" y="58" textAnchor="middle" className="fill-blue-900 font-sans text-[14px] font-bold">
              Dictionary Hash Map: O(1) Lookup
            </text>
            <rect x="450" y="75" width="260" height="42" rx="8" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            <text x="580" y="100" textAnchor="middle" className="fill-blue-800 font-mono text-[12px] font-bold">
              hash(&quot;id&quot;) &rarr; Bucket 4 &rarr; Value: 42
            </text>
          </svg>
        </div>
      );
    }

    if (cardIndex === 2) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <rect x="40" y="30" width="310" height="120" rx="14" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="195" y="58" textAnchor="middle" className="fill-blue-900 font-mono text-[13px] font-bold">
              def process_stream(data):
            </text>
            <text x="70" y="90" className="fill-slate-700 font-mono text-[12px]">
              &bull; Frame: local_scope
            </text>
            <text x="70" y="112" className="fill-slate-700 font-mono text-[12px]">
              &bull; Param: data = [x1, x2]
            </text>
            <text x="70" y="134" className="fill-blue-700 font-mono text-[12px] font-bold">
              &bull; Return: result_tensor
            </text>

            <line x1="365" y1="90" x2="435" y2="90" stroke="#2563eb" strokeWidth="3" />

            <rect x="450" y="30" width="290" height="120" rx="14" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="595" y="60" textAnchor="middle" className="fill-blue-950 font-sans text-[14px] font-bold">
              Call Stack Allocation
            </text>
            <rect x="475" y="76" width="240" height="30" rx="6" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
            <text x="595" y="96" textAnchor="middle" className="fill-blue-800 font-mono text-[11px] font-bold">
              [Frame: process_stream]
            </text>
            <text x="595" y="130" textAnchor="middle" className="fill-slate-600 font-sans text-[11px]">
              Preserves caller state &amp; return address
            </text>
          </svg>
        </div>
      );
    }

    if (cardIndex === 3) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 170" className="w-full max-w-[740px] h-auto select-none">
            <rect x="40" y="40" width="180" height="80" rx="12" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="130" y="75" textAnchor="middle" className="fill-blue-900 font-mono text-[14px] font-bold">
              try: block
            </text>
            <text x="130" y="98" textAnchor="middle" className="fill-slate-500 font-sans text-[11px]">
              Execute statements
            </text>

            <line x1="225" y1="80" x2="295" y2="80" stroke="#2563eb" strokeWidth="3" />

            <rect x="305" y="40" width="200" height="80" rx="12" fill="#eff6ff" stroke="#e11d48" strokeWidth="2.5" />
            <text x="405" y="75" textAnchor="middle" className="fill-rose-700 font-mono text-[14px] font-bold">
              except Error as e:
            </text>
            <text x="405" y="98" textAnchor="middle" className="fill-slate-600 font-sans text-[11px]">
              Handle fault gracefully
            </text>

            <line x1="510" y1="80" x2="575" y2="80" stroke="#2563eb" strokeWidth="3" />

            <rect x="585" y="40" width="165" height="80" rx="12" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="667" y="75" textAnchor="middle" className="fill-blue-950 font-mono text-[14px] font-bold">
              finally:
            </text>
            <text x="667" y="98" textAnchor="middle" className="fill-blue-700 font-sans text-[11px] font-semibold">
              Guaranteed cleanup
            </text>
          </svg>
        </div>
      );
    }

    if (cardIndex === 4) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <rect x="290" y="15" width="200" height="55" rx="12" fill="#1e3a8a" />
            <text x="390" y="48" textAnchor="middle" className="fill-white font-mono text-[14px] font-bold">
              class BaseAlgorithm
            </text>

            <line x1="390" y1="70" x2="200" y2="105" stroke="#2563eb" strokeWidth="2.5" />
            <line x1="390" y1="70" x2="580" y2="105" stroke="#2563eb" strokeWidth="2.5" />

            <rect x="90" y="105" width="220" height="60" rx="12" fill="#eff6ff" stroke="#2563eb" strokeWidth="2.5" />
            <text x="200" y="132" textAnchor="middle" className="fill-blue-900 font-mono text-[12px] font-bold">
              class RecursiveModel
            </text>
            <text x="200" y="152" textAnchor="middle" className="fill-slate-500 font-sans text-[11px]">
              Overrides execute()
            </text>

            <rect x="470" y="105" width="220" height="60" rx="12" fill="#eff6ff" stroke="#2563eb" strokeWidth="2.5" />
            <text x="580" y="132" textAnchor="middle" className="fill-blue-900 font-mono text-[12px] font-bold">
              class IterativeModel
            </text>
            <text x="580" y="152" textAnchor="middle" className="fill-slate-500 font-sans text-[11px]">
              Overrides execute()
            </text>
          </svg>
        </div>
      );
    }

    return (
      <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
        <svg viewBox="0 0 780 170" className="w-full max-w-[740px] h-auto select-none">
          {[
            { step: "1. PEP-8 Code", sub: "Flake8 & Black", x: 30 },
            { step: "2. Type Checking", sub: "Mypy Strict", x: 225 },
            { step: "3. Unit Testing", sub: "PyTest Assertions", x: 420 },
            { step: "4. Deployment", sub: "Virtualenv / Docker", x: 615 },
          ].map((stage, idx) => (
            <g key={idx}>
              <rect x={stage.x} y="45" width="145" height="80" rx="14" fill={idx === 3 ? "#dbeafe" : "#ffffff"} stroke="#1e3a8a" strokeWidth="3" />
              <text x={stage.x + 72} y="80" textAnchor="middle" className="fill-blue-950 font-sans text-[13px] font-bold">
                {stage.step}
              </text>
              <text x={stage.x + 72} y="102" textAnchor="middle" className="fill-blue-700 font-mono text-[11px] font-semibold">
                {stage.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // ==========================================
  // DOMAIN 2: DATA STRUCTURES & ALGORITHMS (DSA)
  // ==========================================
  if (domain === "DSA") {
    if (cardIndex === 0) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <text x="50" y="95" className="fill-blue-700 font-mono text-[14px] font-bold">HEAD</text>
            <line x1="95" y1="90" x2="140" y2="90" stroke="#1e3a8a" strokeWidth="3" />

            {[
              { val: "10", next: "0x1A", x: 145 },
              { val: "25", next: "0x4B", x: 335 },
              { val: "42", next: "NULL", x: 525 },
            ].map((node, i) => (
              <g key={i}>
                <rect x={node.x} y="55" width="130" height="70" rx="10" fill="#ffffff" stroke="#1e3a8a" strokeWidth="3" />
                <line x1={node.x + 75} y1="55" x2={node.x + 75} y2="125" stroke="#1e3a8a" strokeWidth="2" />
                <text x={node.x + 37} y="96" textAnchor="middle" className="fill-blue-950 font-mono text-[16px] font-bold">
                  {node.val}
                </text>
                <text x={node.x + 102} y="96" textAnchor="middle" className="fill-slate-500 font-mono text-[11px] font-semibold">
                  {node.next}
                </text>
                {i < 2 && (
                  <line x1={node.x + 130} y1="90" x2={node.x + 185} y2="90" stroke="#1e3a8a" strokeWidth="3" />
                )}
              </g>
            ))}
          </svg>
        </div>
      );
    }

    if (cardIndex === 1) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 190" className="w-full max-w-[740px] h-auto select-none">
            <circle cx="390" cy="40" r="28" fill="#1e3a8a" stroke="#1e3a8a" strokeWidth="3" />
            <text x="390" y="47" textAnchor="middle" className="fill-white font-mono text-[15px] font-bold">50</text>

            <line x1="370" y1="58" x2="250" y2="105" stroke="#2563eb" strokeWidth="2.5" />
            <circle cx="230" cy="115" r="24" fill="#eff6ff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="230" y="122" textAnchor="middle" className="fill-blue-900 font-mono text-[14px] font-bold">30</text>

            <line x1="410" y1="58" x2="530" y2="105" stroke="#2563eb" strokeWidth="2.5" />
            <circle cx="550" cy="115" r="24" fill="#eff6ff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="550" y="122" textAnchor="middle" className="fill-blue-900 font-mono text-[14px] font-bold">70</text>

            <text x="390" y="170" textAnchor="middle" className="fill-slate-600 font-mono text-[12px] font-bold">
              Binary Search Property: Left &lt; Root &le; Right &bull; O(log n) Search
            </text>
          </svg>
        </div>
      );
    }

    if (cardIndex === 2) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <line x1="80" y1="140" x2="700" y2="140" stroke="#1e3a8a" strokeWidth="2.5" />
            <line x1="80" y1="140" x2="80" y2="20" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="710" y="145" className="fill-slate-600 font-mono text-[11px]">n</text>
            <text x="75" y="15" className="fill-slate-600 font-mono text-[11px]">Time</text>

            <line x1="80" y1="125" x2="680" y2="125" stroke="#059669" strokeWidth="2.5" />
            <text x="690" y="128" className="fill-emerald-700 font-mono text-[11px] font-bold">O(1)</text>

            <path d="M 80 140 Q 300 115, 680 95" fill="none" stroke="#2563eb" strokeWidth="2.5" />
            <text x="690" y="98" className="fill-blue-600 font-mono text-[11px] font-bold">O(log n)</text>

            <line x1="80" y1="140" x2="680" y2="55" stroke="#d97706" strokeWidth="2.5" />
            <text x="690" y="58" className="fill-amber-600 font-mono text-[11px] font-bold">O(n)</text>

            <path d="M 80 140 Q 350 120, 520 25" fill="none" stroke="#e11d48" strokeWidth="2.5" />
            <text x="530" y="28" className="fill-rose-600 font-mono text-[11px] font-bold">O(n²)</text>
          </svg>
        </div>
      );
    }

    if (cardIndex === 3) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 170" className="w-full max-w-[740px] h-auto select-none">
            <text x="60" y="30" className="fill-blue-900 font-mono text-[13px] font-bold">Hash Buckets [0..3]</text>
            {[0, 1, 2, 3].map((b) => (
              <g key={b}>
                <rect x="60" y={45 + b * 28} width="60" height="24" fill="#eff6ff" stroke="#1e3a8a" strokeWidth="2" />
                <text x="90" y={62 + b * 28} textAnchor="middle" className="fill-blue-950 font-mono text-[12px] font-bold">[{b}]</text>
                {b === 1 && (
                  <>
                    <line x1="120" y1={57 + b * 28} x2="180" y2={57 + b * 28} stroke="#2563eb" strokeWidth="2" />
                    <rect x="180" y={45 + b * 28} width="90" height="24" rx="4" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                    <text x="225" y={61 + b * 28} textAnchor="middle" className="fill-blue-800 font-mono text-[11px]">Key: 15</text>
                    <line x1="270" y1={57 + b * 28} x2="330" y2={57 + b * 28} stroke="#2563eb" strokeWidth="2" />
                    <rect x="330" y={45 + b * 28} width="90" height="24" rx="4" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                    <text x="375" y={61 + b * 28} textAnchor="middle" className="fill-blue-800 font-mono text-[11px]">Key: 29</text>
                  </>
                )}
              </g>
            ))}
          </svg>
        </div>
      );
    }

    return (
      <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
        <svg viewBox="0 0 780 170" className="w-full max-w-[740px] h-auto select-none">
          {[
            { step: "1. Problem Model", sub: "Input Invariants", x: 30 },
            { step: "2. Recurrence", sub: "State Equations", x: 225 },
            { step: "3. Space/Time Opt", sub: "DP / Memoization", x: 420 },
            { step: "4. Correctness", sub: "Big-O Verification", x: 615 },
          ].map((stage, idx) => (
            <g key={idx}>
              <rect x={stage.x} y="45" width="145" height="80" rx="14" fill={idx === 3 ? "#dbeafe" : "#ffffff"} stroke="#1e3a8a" strokeWidth="3" />
              <text x={stage.x + 72} y="80" textAnchor="middle" className="fill-blue-950 font-sans text-[13px] font-bold">
                {stage.step}
              </text>
              <text x={stage.x + 72} y="102" textAnchor="middle" className="fill-blue-700 font-mono text-[11px] font-semibold">
                {stage.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // ==========================================
  // DOMAIN 3: ENGINEERING GRAPHICS & CAD
  // ==========================================
  if (domain === "GRAPHICS") {
    if (cardIndex === 0) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <line x1="80" y1="90" x2="700" y2="90" stroke="#1e3a8a" strokeWidth="3" />
            <text x="60" y="95" className="fill-blue-700 font-mono text-[16px] font-bold">X</text>
            <text x="710" y="95" className="fill-blue-700 font-mono text-[16px] font-bold">Y</text>

            <rect x="240" y="20" width="300" height="60" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 4" />
            <text x="390" y="55" textAnchor="middle" className="fill-blue-900 font-sans text-[13px] font-bold">
              Vertical Plane (VP) &bull; Front Elevation View
            </text>

            <rect x="240" y="100" width="300" height="60" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 4" />
            <text x="390" y="135" textAnchor="middle" className="fill-blue-950 font-sans text-[13px] font-bold">
              Horizontal Plane (HP) &bull; Top Plan View
            </text>
          </svg>
        </div>
      );
    }

    if (cardIndex === 1) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <rect x="120" y="30" width="160" height="90" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="200" y="75" textAnchor="middle" className="fill-blue-900 font-sans text-[13px] font-bold">
              Front View
            </text>
            <text x="200" y="95" textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
              Elevation (on VP)
            </text>

            <rect x="330" y="30" width="160" height="90" fill="#eff6ff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="410" y="75" textAnchor="middle" className="fill-blue-900 font-sans text-[13px] font-bold">
              Top View
            </text>
            <text x="410" y="95" textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
              Plan (on HP)
            </text>

            <rect x="540" y="30" width="160" height="90" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="620" y="75" textAnchor="middle" className="fill-blue-950 font-sans text-[13px] font-bold">
              Side View
            </text>
            <text x="620" y="95" textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
              Profile (on PP)
            </text>
          </svg>
        </div>
      );
    }

    return (
      <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
        <svg viewBox="0 0 780 170" className="w-full max-w-[740px] h-auto select-none">
          {[
            { step: "1. 2D Sketch", sub: "Parametric Constraints", x: 30 },
            { step: "2. Extrude / Revolve", sub: "3D Feature Generation", x: 225 },
            { step: "3. Sectional Cut", sub: "45° Hatch Lines", x: 420 },
            { step: "4. Dimensioning", sub: "ISO / BIS Standard", x: 615 },
          ].map((stage, idx) => (
            <g key={idx}>
              <rect x={stage.x} y="45" width="145" height="80" rx="14" fill={idx === 3 ? "#dbeafe" : "#ffffff"} stroke="#1e3a8a" strokeWidth="3" />
              <text x={stage.x + 72} y="80" textAnchor="middle" className="fill-blue-950 font-sans text-[13px] font-bold">
                {stage.step}
              </text>
              <text x={stage.x + 72} y="102" textAnchor="middle" className="fill-blue-700 font-mono text-[11px] font-semibold">
                {stage.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // ==========================================
  // DOMAIN 4: ENGINEERING PHYSICS
  // ==========================================
  if (domain === "PHYSICS") {
    if (cardIndex === 0) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <line x1="150" y1="140" x2="600" y2="140" stroke="#94a3b8" strokeWidth="2" />
            <line x1="150" y1="140" x2="600" y2="40" stroke="#1e3a8a" strokeWidth="3" />

            <rect x="350" y="60" width="70" height="50" rx="6" fill="#eff6ff" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="385" y="90" textAnchor="middle" className="fill-blue-950 font-mono text-[14px] font-bold">m</text>

            <line x1="385" y1="60" x2="360" y2="15" stroke="#059669" strokeWidth="2.5" />
            <text x="350" y="15" className="fill-emerald-700 font-mono text-[12px] font-bold">N</text>

            <line x1="385" y1="110" x2="385" y2="160" stroke="#e11d48" strokeWidth="2.5" />
            <text x="395" y="160" className="fill-rose-700 font-mono text-[12px] font-bold">mg</text>

            <text x="580" y="110" className="fill-slate-700 font-mono text-[13px] font-bold">
              &Sigma;F = ma &bull; F_net = mg sin(&theta;) - f_k
            </text>
          </svg>
        </div>
      );
    }

    if (cardIndex === 1) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 780 180" className="w-full max-w-[740px] h-auto select-none">
            <line x1="80" y1="90" x2="700" y2="90" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
            <path
              d="M 100 90 Q 180 20, 260 90 T 420 90 T 580 90 T 700 90"
              fill="none"
              stroke="#2563eb"
              strokeWidth="3.5"
            />
            <line x1="180" y1="30" x2="500" y2="30" stroke="#1e3a8a" strokeWidth="2" />
            <text x="340" y="24" textAnchor="middle" className="fill-blue-900 font-mono text-[14px] font-bold">
              Wavelength &lambda;
            </text>
            <text x="390" y="160" textAnchor="middle" className="fill-slate-700 font-sans text-[12px] font-bold">
              Wave Equation: y(x, t) = A sin(kx - &omega;t + &phi;)
            </text>
          </svg>
        </div>
      );
    }

    return (
      <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
        <svg viewBox="0 0 780 170" className="w-full max-w-[740px] h-auto select-none">
          {[
            { step: "1. Physical Law", sub: "Theoretical Axiom", x: 30 },
            { step: "2. Sensor Probe", sub: "Analog Acquisition", x: 225 },
            { step: "3. Error Bounds", sub: "Statistical Analysis", x: 420 },
            { step: "4. Law Proof", sub: "SI Unit Verification", x: 615 },
          ].map((stage, idx) => (
            <g key={idx}>
              <rect x={stage.x} y="45" width="145" height="80" rx="14" fill={idx === 3 ? "#dbeafe" : "#ffffff"} stroke="#1e3a8a" strokeWidth="3" />
              <text x={stage.x + 72} y="80" textAnchor="middle" className="fill-blue-950 font-sans text-[13px] font-bold">
                {stage.step}
              </text>
              <text x={stage.x + 72} y="102" textAnchor="middle" className="fill-blue-700 font-mono text-[11px] font-semibold">
                {stage.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // ==========================================
  // DOMAIN 5: THEORY OF COMPUTATION (TOC)
  // ==========================================
  if (domain === "TOC") {
    if (cardIndex === 0) {
      return (
        <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
          <svg viewBox="0 0 820 230" className="w-full max-w-[760px] h-auto select-none">
            <text x="64" y="142" textAnchor="middle" className="fill-slate-600 font-sans text-[18px]">start</text>
            <line x1="48" y1="168" x2="112" y2="168" stroke="#1d4ed8" strokeWidth="3.5" />

            <circle cx="166" cy="168" r="46" fill="#ffffff" stroke="#1e3a8a" strokeWidth="4" />
            <text x="166" y="176" textAnchor="middle" className="fill-[#1e3a8a] font-sans text-[24px] font-bold">q0</text>

            <text x="290" y="146" textAnchor="middle" className="fill-blue-700 font-sans text-[20px] font-medium">a</text>
            <line x1="212" y1="168" x2="358" y2="168" stroke="#1d4ed8" strokeWidth="3.5" />

            <circle cx="412" cy="168" r="46" fill="#ffffff" stroke="#1e3a8a" strokeWidth="4" />
            <text x="412" y="176" textAnchor="middle" className="fill-[#1e3a8a] font-sans text-[24px] font-bold">q1</text>

            <text x="536" y="146" textAnchor="middle" className="fill-blue-700 font-sans text-[20px] font-medium">b</text>
            <line x1="458" y1="168" x2="604" y2="168" stroke="#1d4ed8" strokeWidth="3.5" />

            <circle cx="658" cy="168" r="46" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="4" />
            <circle cx="658" cy="168" r="38" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="2.5" />
            <text x="658" y="176" textAnchor="middle" className="fill-[#1e3a8a] font-sans text-[24px] font-bold">q2</text>
          </svg>
        </div>
      );
    }
  }

  // ==========================================
  // DOMAIN 6: GENERAL SUBJECT FALLBACK
  // ==========================================
  return (
    <div className="w-full py-2 flex items-center justify-center overflow-x-auto">
      <svg viewBox="0 0 780 170" className="w-full max-w-[740px] h-auto select-none">
        {[
          { step: "1. Core Concept", sub: "Fundamental Axiom", x: 30 },
          { step: "2. Architecture", sub: "Modular Invariant", x: 225 },
          { step: "3. Execution Flow", sub: "Step-by-Step Logic", x: 420 },
          { step: "4. Output & Exam", sub: "Verified Application", x: 615 },
        ].map((stage, idx) => (
          <g key={idx}>
            <rect x={stage.x} y="45" width="145" height="80" rx="14" fill={idx === 3 ? "#dbeafe" : "#ffffff"} stroke="#1e3a8a" strokeWidth="3" />
            <text x={stage.x + 72} y="80" textAnchor="middle" className="fill-blue-950 font-sans text-[13px] font-bold">
              {stage.step}
            </text>
            <text x={stage.x + 72} y="102" textAnchor="middle" className="fill-blue-700 font-mono text-[11px] font-semibold">
              {stage.sub}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
