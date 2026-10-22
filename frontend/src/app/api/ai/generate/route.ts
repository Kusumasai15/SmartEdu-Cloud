import { NextRequest, NextResponse } from "next/server";
import { buildAiCacheKey, getCachedAiGeneration, setCachedAiGeneration, getAllCachedAiGenerations } from "@/lib/aiCache";

export const runtime = "nodejs";

type GenerationMode = "QUIZ" | "ASSIGNMENT" | "LESSON" | "CASE_STUDY" | "FLASHCARDS" | "IDEATHON_PROBLEM" | "IDEATHON_EVALUATE" | "CASE_STUDY_EVALUATE";

interface GeneratePayload {
  mode: GenerationMode;
  courseCode: string;
  topic: string;
  prompt?: string;
  count?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  assignmentType?: "CODING" | "WRITTEN" | "LAB_PROJECT";
  points?: number;
  submissionText?: string;
  problemStatement?: string;
  caseStudyTitle?: string;
  scenarioBrief?: string;
  roleTitle?: string;
  roleResponsibilities?: string;
  questionNumber?: number;
  questionText?: string;
  studentAnswer?: string;
}

const MODES: GenerationMode[] = [
  "QUIZ",
  "ASSIGNMENT",
  "LESSON",
  "CASE_STUDY",
  "FLASHCARDS",
  "IDEATHON_PROBLEM",
  "IDEATHON_EVALUATE",
  "CASE_STUDY_EVALUATE",
];

function buildPrompt(payload: GeneratePayload) {
  const count = Math.min(Math.max(payload.count || 5, 1), 20);
  const difficulty = payload.difficulty || "MEDIUM";
  const common = `You are an expert university professor and examination board subject matter authority in ${payload.courseCode}.
Course: ${payload.courseCode}
Topic: ${payload.topic}
Difficulty: ${difficulty}
Academic Requirements:
- Generate rigorous, academically authentic questions strictly tailored to the university curriculum syllabus of "${payload.courseCode}: ${payload.topic}".
- DO NOT use generic or placeholder text. Every single question must test core domain concepts, algorithms, data structures, runtime complexities, memory layouts, theorems, protocols, or practical code semantics corresponding to this exact topic.
- Ensure all 4 options are technically plausible, distinct, and unambiguous. Exactly one option must be unequivocally correct.
- Provide a clear, educational explanation citing the precise technical rationale.
- Return strictly valid JSON conforming to the schema below without markdown formatting or commentary.`;

  switch (payload.mode) {
    case "QUIZ":
      return `${common}\nCreate ${count} authoritative multiple-choice questions. Schema: {"title":string,"description":string,"timeLimitMinutes":number,"totalPoints":number,"questions":[{"prompt":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string}]}`;
    case "ASSIGNMENT":
      return `${common}\nCreate one ${payload.assignmentType || "WRITTEN"} assignment worth ${Math.min(Math.max(payload.points || 50, 1), 500)} points. Schema: {"title":string,"description":string,"type":string,"totalPoints":number,"starterCode":string,"rubric":[{"criteria":string,"points":number}]}`;
    case "CASE_STUDY":
      return `${common}\nCreate an academic case study. Schema: {"title":string,"category":string,"difficulty":string,"durationMinutes":number,"scenarioBrief":string,"learningObjectives":[string],"roles":[{"title":string,"description":string,"responsibilities":[string],"priorityGoal":string}]}`;
    case "FLASHCARDS":
      return `${common}\nCreate ${Math.min(count, 10)} factual study cards. Schema: {"topicTitle":string,"cards":[{"card_index":number,"total_cards":number,"card_category":string,"question_title":string,"title":string,"lead_summary":string,"definition":string,"construction":string,"olap_or_key_concepts":string,"example":string}]}`;
    case "LESSON":
      return `${common}\nCreate structured lesson notes. Schema: {"title":string,"type":"reading","readingContent":string,"summary":string}`;
    case "IDEATHON_PROBLEM":
      return `${common}\nCreate an in-depth subjective problem statement for an Ideathon or Algorithmic / Architectural Challenge. Include clear real-world problem constraints, data structures, or system bottlenecks. Schema: {"title":string,"description":string,"problemStatement":string,"constraints":string,"expectedApproach":string,"totalMarks":number,"starterRepoUrl":string}`;
    case "IDEATHON_EVALUATE":
      return `${common}\nEvaluate this subjective student ideathon submission against the problem statement.\nProblem Statement: ${payload.problemStatement || payload.topic}\nStudent Submission: ${payload.submissionText || payload.prompt || "No submission text provided"}\nMax Marks: ${payload.points || 100}.\nGrade rigorously and objectively. Schema: {"score":number,"maxScore":number,"percentage":number,"feedback":string,"rubricScores":{"architecture":number,"codeQuality":number,"demoAndPitch":number}}`;
    case "CASE_STUDY_EVALUATE":
      return `You are a strict, authoritative university professor evaluating a student's answer in a formal role-based Case Study Examination.
Course: ${payload.courseCode}
Case Study Title: ${payload.caseStudyTitle || payload.topic}
Scenario Brief: ${payload.scenarioBrief || "Operational Case Scenario"}
Student Assigned Role: ${payload.roleTitle || "Technical Specialist"} (${payload.roleResponsibilities || "Role responsibilities"})
Question ${payload.questionNumber || 1} of 5:
"${payload.questionText || payload.prompt}"

Student's Answer:
"${payload.studentAnswer || payload.submissionText || payload.prompt || ""}"

Evaluation Directives:
1. Objectively evaluate the answer based on academic rigor, domain technical accuracy in ${payload.courseCode}, and alignment with the assigned role.
2. CRITICAL - Low-Effort & Nonsense Detection:
   If the student submitted a trivial, vague, generic, or nonsense answer (e.g. "yes that is correct", "ok", "i agree", "test", single incomplete sentences, or generic non-answers):
   - You MUST flag it as insufficient and evasive.
   - DO NOT praise or flatter trivial answers.
   - Explain strictly why the answer lacks engineering depth, missing architecture, risk mitigation, or failure recovery.
   - Award a low score: between 0 and 3 out of 10.
   - Set "isSubstantive": false.
3. Substantive & Technical Answers:
   If the student provided a genuine technical explanation:
   - Provide a professional, concise evaluator critique (2-3 sentences) evaluating their architectural decisions and trade-offs.
   - Award an honest score: between 4 and 10 out of 10.
   - Set "isSubstantive": true.
4. Schema: Return strictly valid JSON conforming to:
{"critique":string,"score":number,"maxScore":10,"isSubstantive":boolean,"suggestions":string}`;
  }
}

/**
 * Robust JSON repair and extraction helper
 */
function extractJson(text: string, mode: GenerationMode, payload: GeneratePayload): any {
  if (!text || typeof text !== "string") return null;

  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf("]");
    if (lastBracket !== -1) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with repair attempts
  }

  // 2. Fix unescaped backslashes (LaTeX, file paths, e.g. \O, \t, \alpha)
  try {
    const sanitized = cleaned
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\")
      .replace(/,\s*([}\]])/g, "$1"); // remove trailing commas
    return JSON.parse(sanitized);
  } catch {
    // Continue
  }

  // 3. Fix unescaped newlines/tabs inside string literals
  try {
    const cleanedControls = cleaned
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
        if (c === "\n") return "\\n";
        if (c === "\r") return "\\r";
        if (c === "\t") return "\\t";
        return "";
      })
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\")
      .replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleanedControls);
  } catch {
    // Continue to regex-based extraction
  }

  // 4. Regex fallback extraction for QUIZ
  if (mode === "QUIZ") {
    try {
      const questions: Array<{ prompt: string; options: string[]; correctIndex: number; explanation: string }> = [];
      const qRegex = /"prompt"\s*:\s*"([^"]+)"[\s\S]*?"options"\s*:\s*\[([^\]]+)\][\s\S]*?"correctIndex"\s*:\s*(\d+)[\s\S]*?"explanation"\s*:\s*"([^"]+)"/g;
      let match: RegExpExecArray | null;

      while ((match = qRegex.exec(cleaned)) !== null) {
        const prompt = match[1];
        const rawOptions = match[2];
        const correctIndex = parseInt(match[3], 10) || 0;
        const explanation = match[4];

        const options = (rawOptions.match(/"([^"]+)"/g) || []).map((o) => o.replace(/^"|"$/g, ""));
        if (options.length >= 2) {
          questions.push({
            prompt,
            options: options.slice(0, 4),
            correctIndex: Math.min(Math.max(correctIndex, 0), options.length - 1),
            explanation,
          });
        }
      }

      if (questions.length > 0) {
        return {
          title: `${payload.courseCode}: ${payload.topic} Examination`,
          description: `Academically rigorous assessment covering core concepts of ${payload.topic}`,
          timeLimitMinutes: Math.max(15, questions.length * 3),
          totalPoints: questions.length * 5,
          questions,
        };
      }
    } catch {
      // Continue
    }
  }

  // 5. Regex fallback extraction for FLASHCARDS
  if (mode === "FLASHCARDS") {
    try {
      const cards: any[] = [];
      const cardRegex = /"title"\s*:\s*"([^"]+)"[\s\S]*?"definition"\s*:\s*"([^"]+)"/g;
      let cMatch: RegExpExecArray | null;
      let idx = 1;

      while ((cMatch = cardRegex.exec(cleaned)) !== null) {
        cards.push({
          card_index: idx,
          total_cards: 10,
          card_category: payload.courseCode,
          question_title: `Understanding ${cMatch[1]}`,
          title: cMatch[1],
          lead_summary: `Core principles and architecture of ${cMatch[1]}`,
          definition: cMatch[2],
          construction: `Standard implementation details and lifecycle invariants for ${cMatch[1]}`,
          olap_or_key_concepts: `Runtime complexity, memory tradeoffs, and edge cases in ${payload.courseCode}`,
          example: `Production application and test-case pattern for ${cMatch[1]}`,
        });
        idx++;
      }

      if (cards.length > 0) {
        return {
          topicTitle: `${payload.courseCode}: ${payload.topic}`,
          cards,
        };
      }
    } catch {
      // Continue
    }
  }

  // 6. Regex fallback extraction for CASE_STUDY_EVALUATE
  if (mode === "CASE_STUDY_EVALUATE") {
    try {
      const critiqueMatch = cleaned.match(/"critique"\s*:\s*"([^"]+)"/i);
      const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/i);
      const substantiveMatch = cleaned.match(/"isSubstantive"\s*:\s*(true|false)/i);
      const suggestionsMatch = cleaned.match(/"suggestions"\s*:\s*"([^"]+)"/i);

      if (critiqueMatch) {
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : 7;
        return {
          critique: critiqueMatch[1],
          score: Math.min(10, Math.max(0, score)),
          maxScore: 10,
          isSubstantive: substantiveMatch ? substantiveMatch[1] === "true" : score >= 5,
          suggestions: suggestionsMatch ? suggestionsMatch[1] : "",
        };
      }
    } catch {
      // Continue
    }
  }

  return null;
}

function generateCurriculumFallback(payload: GeneratePayload): any {
  const { mode, courseCode, topic } = payload;
  const cleanTopic = topic.trim();
  const lowerTopic = cleanTopic.toLowerCase();
  const lowerCourse = courseCode.toLowerCase();

  if (mode === "FLASHCARDS") {
    const isJava = lowerTopic.includes("java") || lowerCourse.includes("java") || lowerCourse.includes("cs-03") || lowerTopic.includes("jvm") || lowerTopic.includes("oop");
    const isPython = lowerTopic.includes("python") || lowerCourse.includes("python") || lowerCourse.includes("cs-02");
    const isDsa = lowerTopic.includes("data structure") || lowerTopic.includes("algorithm") || lowerTopic.includes("tree") || lowerTopic.includes("graph") || lowerTopic.includes("sorting") || lowerCourse.includes("cs101") || lowerCourse.includes("cs201");
    const isOs = lowerTopic.includes("os") || lowerTopic.includes("operating system") || lowerTopic.includes("process") || lowerTopic.includes("thread") || lowerTopic.includes("memory") || lowerTopic.includes("paging");
    const isDb = lowerTopic.includes("db") || lowerTopic.includes("database") || lowerTopic.includes("sql") || lowerTopic.includes("relational") || lowerTopic.includes("transaction");

    if (isJava) {
      return {
        topicTitle: `${courseCode}: ${cleanTopic}`,
        cards: [
          {
            card_index: 1,
            total_cards: 6,
            card_category: courseCode,
            question_title: "What is the Java Virtual Machine (JVM) Architecture?",
            title: "JVM Architecture & Memory Runtime",
            lead_summary: "Execution engine translating Java bytecode into host CPU instructions with memory isolation.",
            definition: "The Java Virtual Machine (JVM) provides a hardware-independent runtime execution environment comprising the ClassLoader subsystem, Runtime Data Areas (Heap, Stack, Method Area/Metaspace, Program Counter, Native Method Stacks), and the JIT Execution Engine.",
            construction: "Source code (.java) is compiled by javac into platform-neutral bytecode (.class), verified by bytecode verifiers, and loaded dynamically into Metaspace and Heap memory segments.",
            olap_or_key_concepts: "Platform independence: 'Write Once, Run Anywhere' (WORA). Garbage collection manages heap allocation dynamically.",
            example: "java -Xms512m -Xmx2048m -XX:+UseG1GC ApplicationMain",
          },
          {
            card_index: 2,
            total_cards: 6,
            card_category: courseCode,
            question_title: "How does Encapsulation enforce Data Hiding in OOP?",
            title: "Encapsulation & Access Modifiers",
            lead_summary: "Binding object state and behaviors together while shielding internal state invariants from direct external mutation.",
            definition: "Encapsulation restricts direct field manipulation by declaring variables private or protected and exposing controlled public getters, setters, and operational methods that validate class invariants.",
            construction: "Declare state fields private, enforce defensive copying on mutable references, and provide immutable constructors or builder patterns.",
            olap_or_key_concepts: "Information hiding minimizes system coupling and protects internal invariants against corrupted runtime states.",
            example: "public final class BankAccount { private double balance; public synchronized void deposit(double amt) { if (amt > 0) balance += amt; } }",
          },
          {
            card_index: 3,
            total_cards: 6,
            card_category: courseCode,
            question_title: "What is Polymorphism and Dynamic Method Dispatch?",
            title: "Polymorphism & Runtime Dynamic Dispatch",
            lead_summary: "Executing overridden subclass implementations via superclass or interface references at runtime.",
            definition: "Dynamic method dispatch is Java's mechanism where an overridden method call is resolved at runtime based on the actual object instance on the heap, using virtual method tables (vtables), rather than the reference type.",
            construction: "Define a base class or interface with abstract/virtual methods. Implement subclasses overriding those methods using the @Override annotation.",
            olap_or_key_concepts: "Compile-time polymorphism uses method overloading; runtime polymorphism uses method overriding and vtable lookups.",
            example: "List<String> items = new ArrayList<>(); // Invokes ArrayList's overridden methods polymorphically",
          },
          {
            card_index: 4,
            total_cards: 6,
            card_category: courseCode,
            question_title: "How do Abstract Classes differ from Interfaces in modern Java?",
            title: "Abstract Classes vs Interfaces",
            lead_summary: "Contractual interface specifications versus shared hierarchical state inheritance.",
            definition: "Interfaces define pure behavioural contracts with public static final constants and default/static methods. Abstract classes can maintain mutable instance state, constructors, and partially implemented common template methods.",
            construction: "A Java class can extend only one abstract superclass (single inheritance) but may implement multiple interfaces simultaneously.",
            olap_or_key_concepts: "Favor composition and interfaces over deep class inheritance hierarchies to decouple system components.",
            example: "public class PriorityQueue<E> extends AbstractQueue<E> implements Serializable { ... }",
          },
          {
            card_index: 5,
            total_cards: 6,
            card_category: courseCode,
            question_title: "How does the Java Collections Framework manage Type Safety?",
            title: "Java Collections Framework & Generics",
            lead_summary: "Standardized generic data structures for linear sequences, key-value mappings, and unique element sets.",
            definition: "The Collections Framework standardizes core algorithmic structures (List, Set, Queue, Deque, Map). Java Generics ensure compile-time type safety through type erasure, eliminating hazardous runtime ClassCastExceptions.",
            construction: "ArrayList utilizes amortized dynamic resizing arrays; HashMap relies on an array of hash buckets with linked-list to red-black tree collision resolution.",
            olap_or_key_concepts: "HashMap lookup has average O(1) time complexity; worst-case treeified buckets degrade gracefully to O(log n).",
            example: "Map<String, List<Integer>> index = new ConcurrentHashMap<>();",
          },
          {
            card_index: 6,
            total_cards: 6,
            card_category: courseCode,
            question_title: "How does Java handle Multithreading and Concurrency?",
            title: "Concurrency, Threads & Memory Visibility",
            lead_summary: "Coordinating parallel execution threads with synchronized locks, volatile memory barriers, and Executor pools.",
            definition: "Java threads run concurrently within a shared process address space. Synchronization enforces mutual exclusion, while volatile variables establish happens-before memory visibility guarantees across CPU caches.",
            construction: "Manage tasks via java.util.concurrent.ExecutorService pools instead of raw Thread objects to prevent resource exhaustion.",
            olap_or_key_concepts: "Deadlock requires four simultaneous conditions: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.",
            example: "ExecutorService pool = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());",
          },
        ],
      };
    }

    if (isPython) {
      return {
        topicTitle: `${courseCode}: ${cleanTopic}`,
        cards: [
          {
            card_index: 1,
            total_cards: 6,
            card_category: courseCode,
            question_title: "What is the Python Data Model and Memory Management?",
            title: "Python Memory Model & Reference Counting",
            lead_summary: "Object allocation, automatic reference counting, and cyclic garbage collection.",
            definition: "Everything in Python is an object allocated on the private heap. Python uses reference counting augmented with a generational cyclic garbage collector (gc) to reclaim circular object graphs.",
            construction: "Each PyObject maintains a type pointer (ob_type) and a reference counter (ob_refcnt). Mutability determines if identity is preserved under modification.",
            olap_or_key_concepts: "Immutable types (int, float, str, tuple) cannot be mutated in place; mutable containers (list, dict, set) mutate by reference.",
            example: "import sys; x = [1, 2, 3]; print(sys.getrefcount(x))",
          },
          {
            card_index: 2,
            total_cards: 6,
            card_category: courseCode,
            question_title: "How do Decorators and Closures function in Python?",
            title: "First-Class Functions, Closures & Decorators",
            lead_summary: "Higher-order functional wrappers modifying function execution semantics non-invasively.",
            definition: "Python functions are first-class citizens. A closure captures free variables in its enclosing lexical scope. A decorator is syntactic sugar (@decorator) for passing a function into a higher-order callable returning a wrapped function.",
            construction: "Defines an outer decorator function taking func as argument, nesting an inner (*args, **kwargs) wrapper that adds cross-cutting concerns (logging, timing, auth).",
            olap_or_key_concepts: "Use functools.wraps(func) on wrapper functions to preserve docstrings, function signatures, and __name__ metadata.",
            example: "def timer(f):\n    @functools.wraps(f)\n    def wrapper(*a, **kw):\n        return f(*a, **kw)\n    return wrapper",
          },
          {
            card_index: 3,
            total_cards: 6,
            card_category: courseCode,
            question_title: "How do Python Generators provide Memory Efficiency?",
            title: "Iterators, Generators & Lazy Evaluation",
            lead_summary: "Stream processing sequences on demand without loading full collections into memory.",
            definition: "Generators are specialized functions using the 'yield' statement to produce values lazily. They implement the iterator protocol (__iter__ and __next__) while suspending stack frame execution state between yields.",
            construction: "Calling a generator function returns a generator iterator object with O(1) space complexity regardless of stream size.",
            olap_or_key_concepts: "Lazy evaluation prevents out-of-memory (OOM) errors when processing gigabyte-scale datasets or infinite sequences.",
            example: "def fibonacci():\n    a, b = 0, 1\n    while True:\n        yield a\n        a, b = b, a + b",
          },
          {
            card_index: 4,
            total_cards: 6,
            card_category: courseCode,
            question_title: "How do Context Managers guarantee Resource Cleanup?",
            title: "Context Managers & RAII with 'with' Statements",
            lead_summary: "Deterministic acquisition and release of operating system resources.",
            definition: "Context managers guarantee deterministic cleanup (closing file descriptors, releasing locks, terminating database connections) even if unhandled exceptions are raised during execution.",
            construction: "Objects implement __enter__() returning the managed resource and __exit__(exc_type, exc_val, exc_tb) performing teardown.",
            olap_or_key_concepts: "Always use context managers over manual try-finally blocks to avoid resource and memory leaks.",
            example: "with open('data.csv', 'r') as f:\n    content = f.read()",
          },
          {
            card_index: 5,
            total_cards: 6,
            card_category: courseCode,
            question_title: "What is the Global Interpreter Lock (GIL)?",
            title: "The Python GIL & Concurrency Architecture",
            lead_summary: "Mutual exclusion lock protecting CPython internal memory management from race conditions.",
            definition: "The Global Interpreter Lock (GIL) is a mutex in CPython that permits only one OS thread to execute Python bytecode at a time, preventing multi-threaded CPU-bound parallelism across multiple processor cores.",
            construction: "I/O-bound workloads benefit from standard threading; CPU-bound parallel workloads must use multiprocessing or C-extension bindings.",
            olap_or_key_concepts: "Use multiprocessing.Pool or concurrent.futures.ProcessPoolExecutor for CPU-intensive data transformations.",
            example: "from concurrent.futures import ProcessPoolExecutor\nwith ProcessPoolExecutor() as ex: results = list(ex.map(calc, data))",
          },
          {
            card_index: 6,
            total_cards: 6,
            card_category: courseCode,
            question_title: "How do Python Dunder Methods enable Operator Overloading?",
            title: "Special 'Dunder' Methods & Class Customization",
            lead_summary: "Emulating native Python behaviors via standardized double-underscore protocols.",
            definition: "Dunder (double-underscore) methods allow custom classes to integrate with Python language operators (__getitem__, __len__, __eq__, __add__, __repr__).",
            construction: "Implement __repr__ for developer debugging and __str__ for end-user string representation.",
            olap_or_key_concepts: "Adhering to Python's protocols enables custom types to work seamlessly with built-in functions like len(), sorted(), and in.",
            example: "class Vector:\n    def __init__(self, x, y): self.x, self.y = x, y\n    def __add__(self, o): return Vector(self.x + o.x, self.y + o.y)",
          },
        ],
      };
    }

    // Universal high-yield academic syllabus deck for any course/topic
    return {
      topicTitle: `${courseCode}: ${cleanTopic}`,
      cards: [
        {
          card_index: 1,
          total_cards: 6,
          card_category: courseCode,
          question_title: `What is the foundational theoretical model of ${cleanTopic}?`,
          title: `${cleanTopic}: Core Principles & Architecture`,
          lead_summary: `Authoritative formal definition, operational semantics, and system boundary for ${cleanTopic}.`,
          definition: `${cleanTopic} establishes core architectural invariants, algorithmic invariants, and operational abstractions required for rigorous problem solving in ${courseCode}.`,
          construction: `Formulated through formal state invariants, rigorous modular decomposition, and deterministic input-output mappings across system boundaries.`,
          olap_or_key_concepts: `Theoretical foundation, fundamental theorems, and core structural invariants of ${cleanTopic}.`,
          example: `Canonical textbook benchmark and architectural layout for ${cleanTopic}.`,
        },
        {
          card_index: 2,
          total_cards: 6,
          card_category: courseCode,
          question_title: `What are the structural components and invariants of ${cleanTopic}?`,
          title: `${cleanTopic}: Structural Mechanics`,
          lead_summary: `Internal state representation, data structures, and memory layouts governing execution.`,
          definition: `The structural architecture of ${cleanTopic} isolates components into distinct operational layers, ensuring low coupling and high cohesion across all execution phases.`,
          construction: `Constructed via hierarchical abstractions, memory layouts, and verification routines verifying pre- and post-conditions.`,
          olap_or_key_concepts: `Component interaction, dependency direction, state transitions, and encapsulation boundaries.`,
          example: `Representative implementation pattern and memory verification test in ${courseCode}.`,
        },
        {
          card_index: 3,
          total_cards: 6,
          card_category: courseCode,
          question_title: `How is ${cleanTopic} executed and evaluated algorithmically?`,
          title: `${cleanTopic}: Execution Mechanics & Runtime`,
          lead_summary: `Step-by-step operational lifecycle, instruction flow, and transformation pipeline.`,
          definition: `During runtime execution, ${cleanTopic} processes inputs sequentially or concurrently, traversing deterministic states while preserving system invariants.`,
          construction: `Implemented via modular subroutines, pipeline stages, or event dispatchers with rigorous boundary condition checking.`,
          olap_or_key_concepts: `Execution pipeline, stack/heap allocation, state preservation, and control flow transitions.`,
          example: `Step-by-step trace of state evolution under nominal operational loads.`,
        },
        {
          card_index: 4,
          total_cards: 6,
          card_category: courseCode,
          question_title: `What are the computational complexity bounds and trade-offs of ${cleanTopic}?`,
          title: `${cleanTopic}: Complexity & Performance Invariants`,
          lead_summary: `Asymptotic analysis, worst-case latency bounds, and space-time trade-off optimizations.`,
          definition: `Evaluating ${cleanTopic} requires quantifying time complexity O(f(n)), space complexity O(g(n)), cache locality, and throughput under heavy system loads.`,
          construction: `Optimized by choosing appropriate data representations, eliminating redundant passes, and bounding worst-case execution branches.`,
          olap_or_key_concepts: `Amortized vs worst-case bounds, memory overhead, concurrency locks, and cache line alignment.`,
          example: `Comparative analysis of nominal O(n log n) throughput versus worst-case quadratic degradation.`,
        },
        {
          card_index: 5,
          total_cards: 6,
          card_category: courseCode,
          question_title: `What are the common failure modes and anti-patterns in ${cleanTopic}?`,
          title: `${cleanTopic}: Failure Modes & Boundary Edge Cases`,
          lead_summary: `Preventing race conditions, resource leaks, edge condition failures, and degenerate inputs.`,
          definition: `Production systems utilizing ${cleanTopic} must defend against null dereferences, index out-of-bounds, unhandled exceptions, and deadlocks in concurrent environments.`,
          construction: `Guarded through comprehensive defensive assertions, boundary condition tests, timeout mechanisms, and graceful recovery fallbacks.`,
          olap_or_key_concepts: `Graceful degradation, fail-fast validations, fault tolerance, and invariant preservation.`,
          example: `Unit tests validating null, empty, max-value, and adversarial boundary cases.`,
        },
        {
          card_index: 6,
          total_cards: 6,
          card_category: courseCode,
          question_title: `How is ${cleanTopic} applied in university examinations and industry?`,
          title: `${cleanTopic}: Academic & Industry Synthesis`,
          lead_summary: `Synthesis problem solving, examination question patterns, and production architectural best practices.`,
          definition: `Mastery of ${cleanTopic} requires synthesizing core theoretical concepts into end-to-end architectures that satisfy rigorous functional and non-functional requirements.`,
          construction: `Synthesize modular components into coherent systems, incorporating logging, monitoring, and automated test coverage.`,
          olap_or_key_concepts: `End-to-end integration, examination grading criteria, and production design patterns.`,
          example: `Standard university final examination scenario and optimal architectural solution.`,
        },
      ],
    };
  }

  if (mode === "QUIZ") {
    return {
      title: `${courseCode}: ${cleanTopic} Assessment`,
      description: `Rigorous academic assessment evaluating key principles and mechanics of ${cleanTopic}.`,
      timeLimitMinutes: 15,
      totalPoints: 25,
      questions: [
        {
          prompt: `Which of the following statements most accurately defines the primary architectural principle of ${cleanTopic}?`,
          options: [
            `It enforces strict separation of concerns and guarantees deterministic state invariants.`,
            `It completely eliminates the need for computational complexity analysis.`,
            `It is only applicable to interpreted programming environments without hardware interaction.`,
            `It replaces all database indexing structures with flat sequential arrays.`,
          ],
          correctIndex: 0,
          explanation: `In ${courseCode}, ${cleanTopic} is architected to isolate system concerns, ensuring reproducible, deterministic behavior and verifiable invariants across execution phases.`,
        },
        {
          prompt: `Under worst-case operational constraints, how does ${cleanTopic} guarantee system stability?`,
          options: [
            `By silently discarding state modifications without alerting the caller.`,
            `Through bounded resource utilization, defensive boundary assertions, and controlled exception recovery.`,
            `By switching all execution pipelines to synchronous polling loops.`,
            `By bypassing memory allocation limits entirely.`,
          ],
          correctIndex: 1,
          explanation: `System stability in ${cleanTopic} relies on bounded resource allocation, invariant assertion checks, and controlled failure handling to prevent cascading failures.`,
        },
        {
          prompt: `What is the primary runtime trade-off when optimizing the performance of ${cleanTopic}?`,
          options: [
            `Increasing disk thrashing to decrease instruction cache misses.`,
            `Trading additional memory space or pre-computation to achieve lower latency and amortized time complexity.`,
            `Eliminating compile-time type safety checks in favor of dynamic runtime exceptions.`,
            `Restricting execution to single-byte character sets only.`,
          ],
          correctIndex: 1,
          explanation: `Algorithmic optimizations typically leverage space-time trade-offs (e.g. memoization, caching, indexing) to reduce asymptotic runtime at the expense of higher auxiliary space.`,
        },
        {
          prompt: `Which edge case must always be addressed when implementing routines for ${cleanTopic}?`,
          options: [
            `Empty collections, boundary limits, and unexpected concurrent mutations.`,
            `Network sockets remaining permanently open without timeouts.`,
            `Hardware interrupts occurring only on leap days.`,
            `Using only prime numbers for variable identifiers.`,
          ],
          correctIndex: 0,
          explanation: `Defensive programming requires handling degenerate inputs (empty sets, null pointers, zero values) and race conditions when multiple threads access shared state.`,
        },
        {
          prompt: `In an authoritative university examination on ${courseCode}, what is the key criterion for a complete solution regarding ${cleanTopic}?`,
          options: [
            `Writing maximum lines of code without comments or structure.`,
            `Providing formal mathematical or architectural proof of correctness alongside asymptotic runtime analysis.`,
            `Relying exclusively on proprietary vendor-specific libraries.`,
            `Omitting error handling and boundary condition verification.`,
          ],
          correctIndex: 1,
          explanation: `Academic rigor demands provable correctness, clear documentation of system assumptions, and precise asymptotic complexity bounds for both time and auxiliary space.`,
        },
      ],
    };
  }

  if (mode === "LESSON") {
    return {
      title: `${courseCode}: ${cleanTopic} Lecture Notes`,
      type: "reading",
      readingContent: `# ${courseCode}: ${cleanTopic}\n\n## 1. Overview and Core Motivation\n${cleanTopic} is a cornerstone concept in ${courseCode}. Understanding its theoretical foundation and practical execution mechanics is critical for building robust, scalable software architectures.\n\n## 2. Key Architectural Invariants\n- **Formal Definitions**: Precise mathematical and structural properties governing system state.\n- **Execution Pipeline**: The step-by-step transformation lifecycle from input ingestion to validated output.\n- **Error Boundaries**: Controlled failure recovery mechanisms preventing cascading state corruption.\n\n## 3. Practical Implementation & Code Semantics\nWhen implementing ${cleanTopic}, engineers must adhere to clean modularization, defensive parameter validation, and proper resource deallocation.\n\n## 4. Complexity & Performance Analysis\nAlways evaluate asymptotic behavior across Best, Average, and Worst-case scenarios to guarantee predictable latency under production workloads.`,
      summary: `Comprehensive syllabus summary for ${cleanTopic} covering architectural theory, execution mechanics, and complexity trade-offs in ${courseCode}.`,
    };
  }

  // Generic fallback for other modes
  return {
    topicTitle: `${courseCode}: ${cleanTopic}`,
    summary: `Structured academic material for ${courseCode} covering ${cleanTopic}.`,
    content: `Core curriculum syllabus principles for ${cleanTopic} in ${courseCode}.`,
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: GeneratePayload;
    try {
      const rawText = await request.text();
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request payload." }, { status: 400 });
    }

    if (!MODES.includes(body.mode) || !body.courseCode?.trim() || !body.topic?.trim()) {
      return NextResponse.json({ success: false, error: "Mode, course code, and topic are required." }, { status: 400 });
    }

    // Check EC2 persistent AI generation cache first (instant return)
    const cacheKey = buildAiCacheKey(body.courseCode, body.mode, body.topic, body.prompt);
    const cached = await getCachedAiGeneration(cacheKey);
    if (cached && cached.data) {
      return NextResponse.json({
        success: true,
        isAi: true,
        fromCache: true,
        source: cached.source || "CACHE",
        data: cached.data,
      });
    }

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

    const candidateModels = [
      process.env.GEMINI_MODEL || "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
    ];

    let lastError: any = null;

    if (apiKey) {
      for (const model of candidateModels) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${buildPrompt(body)}\nAdditional instructions: ${body.prompt?.trim() || "None"}` }] }],
              generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errBody = await response.text().catch(() => "");
            console.warn(`Gemini generation rejected by ${model} (${response.status}):`, errBody);
            lastError = new Error(`Model ${model} returned status ${response.status}`);
            continue;
          }

          const providerResult = await response.json();
          const parts = providerResult?.candidates?.[0]?.content?.parts || [];
          const textPart = parts.find((p: any) => !p.thought && typeof p.text === "string" && p.text.trim()) || parts[0];
          const raw = textPart?.text;

          if (typeof raw !== "string" || !raw.trim()) {
            lastError = new Error(`Model ${model} returned empty content`);
            continue;
          }

          const data = extractJson(raw, body.mode, body);
          if (data) {
            await setCachedAiGeneration(cacheKey, data, {
              courseCode: body.courseCode,
              topic: body.topic,
              mode: body.mode,
              source: "GEMINI",
            });
            return NextResponse.json({ success: true, isAi: true, fromCache: false, data, modelUsed: model });
          } else {
            lastError = new Error(`Model ${model} generated content could not be parsed`);
          }
        } catch (err) {
          console.warn(`Generation attempt with ${model} failed:`, err);
          lastError = err;
        } finally {
          clearTimeout(timeout);
        }
      }
    }

    console.warn("AI generation models failed or unavailable:", lastError);

    return NextResponse.json(
      { success: false, error: "Content generation is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Content generation failed", error);
    return NextResponse.json({ success: false, error: "Content generation is temporarily unavailable." }, { status: 500 });
  }
}
