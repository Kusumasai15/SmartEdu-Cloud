// ==============================================================================
// SMARTEDU ACADEMIC SESSION PLAN (LESSON DELIVERY PLAN) DATA TYPES & HELPERS
// ==============================================================================

export type MethodologyType = "Lecture" | "Practical" | "Tutorial" | "Seminar" | "Case Study";
export type CourseOutcomeType = "CO1" | "CO2" | "CO3" | "CO4" | "CO5";
export type BloomsLevelType = "Remembering" | "Understanding" | "Applying" | "Analyzing" | "Evaluating" | "Creating";

export interface SessionPlanLecture {
  id: string;
  lectureNo: number;
  moduleNumber: number;
  moduleTitle: string;
  proposedDate: string; // DD/MM/YYYY or YYYY-MM-DD
  topic: string;
  methodology: MethodologyType;
  courseOutcome: CourseOutcomeType;
  bloomsLevel: BloomsLevelType;
  studyMaterialRef: string;
  conductedDate?: string | null;
  conductedNotes?: string;
  isConducted?: boolean;
}

export interface SessionPlanModule {
  moduleNumber: number;
  title: string;
  description?: string;
  lectures: SessionPlanLecture[];
}

export interface CourseSessionPlan {
  courseCode: string;
  courseName: string;
  academicYear: string;
  semester: string;
  totalModules: number;
  modules: SessionPlanModule[];
  createdAt: string;
  updatedAt: string;
}

// ─── DEFAULT REALISTIC CURRICULUM SESSION PLANS ───
export const generateDefaultSessionPlan = (courseCode: string, courseName: string): CourseSessionPlan => {
  const isPython = courseCode.toUpperCase().includes("001") || courseName.toLowerCase().includes("python");
  const isCompiler = courseCode.toUpperCase().includes("002") || courseName.toLowerCase().includes("compiler");

  if (isPython) {
    return {
      courseCode: courseCode || "CS001",
      courseName: courseName || "Introduction to Python & Data Analysis",
      academicYear: "2026-2027",
      semester: "Semester 1",
      totalModules: 5,
      createdAt: "2026-08-01",
      updatedAt: "2026-08-01",
      modules: [
        {
          moduleNumber: 1,
          title: "Foundations of Python, Syntax, and Data Structures",
          description: "Core syntax, variables, conditionals, collections, list comprehensions, and functional paradigms.",
          lectures: [
            {
              id: "lec-1-1",
              lectureNo: 1,
              moduleNumber: 1,
              moduleTitle: "Foundations of Python, Syntax, and Data Structures",
              proposedDate: "03/08/2026",
              topic: "Python Architecture, Interpreter Internals, and Development Environment Setup",
              methodology: "Lecture",
              courseOutcome: "CO1",
              bloomsLevel: "Understanding",
              studyMaterialRef: "Unit 1 Lecture Slides (Slides 1-24)",
              conductedDate: "03/08/2026",
              isConducted: true,
            },
            {
              id: "lec-1-2",
              lectureNo: 2,
              moduleNumber: 1,
              moduleTitle: "Foundations of Python, Syntax, and Data Structures",
              proposedDate: "05/08/2026",
              topic: "Data Types, Dynamic Typing, Memory Allocation, and Control Flow Statements",
              methodology: "Lecture",
              courseOutcome: "CO1",
              bloomsLevel: "Understanding",
              studyMaterialRef: "Unit 1 Notes, Textbook Ch. 2",
              conductedDate: "05/08/2026",
              isConducted: true,
            },
            {
              id: "lec-1-3",
              lectureNo: 3,
              moduleNumber: 1,
              moduleTitle: "Foundations of Python, Syntax, and Data Structures",
              proposedDate: "07/08/2026",
              topic: "Lists, Tuples, Dictionaries, Sets, and Memory Mutation Behaviors",
              methodology: "Lecture",
              courseOutcome: "CO1",
              bloomsLevel: "Applying",
              studyMaterialRef: "Unit 1 Python Structures Reference",
              conductedDate: "07/08/2026",
              isConducted: true,
            },
            {
              id: "lec-1-4",
              lectureNo: 4,
              moduleNumber: 1,
              moduleTitle: "Foundations of Python, Syntax, and Data Structures",
              proposedDate: "10/08/2026",
              topic: "Hands-on Lab: Implementing Custom Data Structures and Sequence Manipulation",
              methodology: "Practical",
              courseOutcome: "CO1",
              bloomsLevel: "Applying",
              studyMaterialRef: "Lab Manual Exercise 1.1",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-1-5",
              lectureNo: 5,
              moduleNumber: 1,
              moduleTitle: "Foundations of Python, Syntax, and Data Structures",
              proposedDate: "12/08/2026",
              topic: "List Comprehensions, Generator Expressions, and Iterator Protocol",
              methodology: "Lecture",
              courseOutcome: "CO1",
              bloomsLevel: "Applying",
              studyMaterialRef: "Unit 1 Advanced Constructs PDF",
              conductedDate: null,
              isConducted: false,
            },
          ],
        },
        {
          moduleNumber: 2,
          title: "Object-Oriented Programming & Modular Engineering",
          description: "Classes, inheritance, polymorphism, abstract classes, dunder methods, and module packaging.",
          lectures: [
            {
              id: "lec-2-1",
              lectureNo: 6,
              moduleNumber: 2,
              moduleTitle: "Object-Oriented Programming & Modular Engineering",
              proposedDate: "14/08/2026",
              topic: "Class Design, Constructors, Encapsulation, and Instance vs Class Variables",
              methodology: "Lecture",
              courseOutcome: "CO2",
              bloomsLevel: "Applying",
              studyMaterialRef: "Unit 2 OOP Slides (Deck 01)",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-2-2",
              lectureNo: 7,
              moduleNumber: 2,
              moduleTitle: "Object-Oriented Programming & Modular Engineering",
              proposedDate: "17/08/2026",
              topic: "Multiple Inheritance, MRO (Method Resolution Order), and Super Call Semantics",
              methodology: "Lecture",
              courseOutcome: "CO2",
              bloomsLevel: "Analyzing",
              studyMaterialRef: "Unit 2 Inheritance & MRO Guide",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-2-3",
              lectureNo: 8,
              moduleNumber: 2,
              moduleTitle: "Object-Oriented Programming & Modular Engineering",
              proposedDate: "19/08/2026",
              topic: "Laboratory Drill: Designing a University Entity Hierarchy with Abstract Base Classes",
              methodology: "Practical",
              courseOutcome: "CO2",
              bloomsLevel: "Applying",
              studyMaterialRef: "Lab Manual Exercise 2.1",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-2-4",
              lectureNo: 9,
              moduleNumber: 2,
              moduleTitle: "Object-Oriented Programming & Modular Engineering",
              proposedDate: "21/08/2026",
              topic: "Exception Handling Hierarchies, Context Managers (with-statement), and Decorators",
              methodology: "Lecture",
              courseOutcome: "CO2",
              bloomsLevel: "Applying",
              studyMaterialRef: "Unit 2 Exception Handling Notes",
              conductedDate: null,
              isConducted: false,
            },
          ],
        },
        {
          moduleNumber: 3,
          title: "Scientific Computing with NumPy & Vectorized Operations",
          description: "N-dimensional arrays, broadcasting, vectorization, matrix decompositions, and performance benchmarking.",
          lectures: [
            {
              id: "lec-3-1",
              lectureNo: 10,
              moduleNumber: 3,
              moduleTitle: "Scientific Computing with NumPy & Vectorized Operations",
              proposedDate: "24/08/2026",
              topic: "NumPy Ndarray Memory Layout, Strides, Array Creation, and Slicing",
              methodology: "Lecture",
              courseOutcome: "CO3",
              bloomsLevel: "Understanding",
              studyMaterialRef: "Unit 3 NumPy Primer (Slides 1-30)",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-3-2",
              lectureNo: 11,
              moduleNumber: 3,
              moduleTitle: "Scientific Computing with NumPy & Vectorized Operations",
              proposedDate: "26/08/2026",
              topic: "Vectorized Arithmetic, Broadcasting Rules, and Mathematical Aggregations",
              methodology: "Lecture",
              courseOutcome: "CO3",
              bloomsLevel: "Applying",
              studyMaterialRef: "NumPy Broadcasting Cheat Sheet",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-3-3",
              lectureNo: 12,
              moduleNumber: 3,
              moduleTitle: "Scientific Computing with NumPy & Vectorized Operations",
              proposedDate: "28/08/2026",
              topic: "Linear Algebra Subroutines, Matrix Inverses, Eigenvalues, and SVD Operations",
              methodology: "Lecture",
              courseOutcome: "CO3",
              bloomsLevel: "Analyzing",
              studyMaterialRef: "Linear Algebra with Python Notes",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-3-4",
              lectureNo: 13,
              moduleNumber: 3,
              moduleTitle: "Scientific Computing with NumPy & Vectorized Operations",
              proposedDate: "31/08/2026",
              topic: "Practical Lab: Fast Matrix Multiplication & Vectorized Algorithm Profiling",
              methodology: "Practical",
              courseOutcome: "CO3",
              bloomsLevel: "Applying",
              studyMaterialRef: "Lab Manual Exercise 3.2",
              conductedDate: null,
              isConducted: false,
            },
          ],
        },
        {
          moduleNumber: 4,
          title: "Data Manipulation & Analytics with Pandas",
          description: "DataFrames, Series, time series indexing, missing value imputation, group-by aggregations, and merge joins.",
          lectures: [
            {
              id: "lec-4-1",
              lectureNo: 14,
              moduleNumber: 4,
              moduleTitle: "Data Manipulation & Analytics with Pandas",
              proposedDate: "02/09/2026",
              topic: "Pandas Data Structures: Series, DataFrame, Indexing with loc and iloc",
              methodology: "Lecture",
              courseOutcome: "CO4",
              bloomsLevel: "Understanding",
              studyMaterialRef: "Unit 4 Pandas Foundation Slides",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-4-2",
              lectureNo: 15,
              moduleNumber: 4,
              moduleTitle: "Data Manipulation & Analytics with Pandas",
              proposedDate: "04/09/2026",
              topic: "Data Cleaning, Handling Missing Values, Outlier Detection, and Type Casting",
              methodology: "Lecture",
              courseOutcome: "CO4",
              bloomsLevel: "Applying",
              studyMaterialRef: "Data Cleaning Handbook",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-4-3",
              lectureNo: 16,
              moduleNumber: 4,
              moduleTitle: "Data Manipulation & Analytics with Pandas",
              proposedDate: "07/09/2026",
              topic: "Split-Apply-Combine Strategy: GroupBy Aggregations, Pivot Tables, and Melt",
              methodology: "Lecture",
              courseOutcome: "CO4",
              bloomsLevel: "Analyzing",
              studyMaterialRef: "Pandas Advanced Reshaping Notes",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-4-4",
              lectureNo: 17,
              moduleNumber: 4,
              moduleTitle: "Data Manipulation & Analytics with Pandas",
              proposedDate: "09/09/2026",
              topic: "Practical Lab: Real-world Dataset Wrangling, Joining, and Statistical Reporting",
              methodology: "Practical",
              courseOutcome: "CO4",
              bloomsLevel: "Applying",
              studyMaterialRef: "Lab Manual Exercise 4.1",
              conductedDate: null,
              isConducted: false,
            },
          ],
        },
        {
          moduleNumber: 5,
          title: "Data Visualization, Statistical Modeling & Capstone Projects",
          description: "Matplotlib, Seaborn, interactive dashboards, regression modeling, and end-to-end analytical pipelines.",
          lectures: [
            {
              id: "lec-5-1",
              lectureNo: 18,
              moduleNumber: 5,
              moduleTitle: "Data Visualization, Statistical Modeling & Capstone Projects",
              proposedDate: "11/09/2026",
              topic: "Visual Analytics: Matplotlib Figure/Axes Anatomy, Multi-Plot Grids, and Custom Styling",
              methodology: "Lecture",
              courseOutcome: "CO5",
              bloomsLevel: "Applying",
              studyMaterialRef: "Unit 5 Visualization Slides",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-5-2",
              lectureNo: 19,
              moduleNumber: 5,
              moduleTitle: "Data Visualization, Statistical Modeling & Capstone Projects",
              proposedDate: "14/09/2026",
              topic: "Statistical Charting with Seaborn: Distributions, Correlation Heatmaps, and Categorical Plots",
              methodology: "Lecture",
              courseOutcome: "CO5",
              bloomsLevel: "Analyzing",
              studyMaterialRef: "Seaborn Visual Reference Guide",
              conductedDate: null,
              isConducted: false,
            },
            {
              id: "lec-5-3",
              lectureNo: 20,
              moduleNumber: 5,
              moduleTitle: "Data Visualization, Statistical Modeling & Capstone Projects",
              proposedDate: "16/09/2026",
              topic: "Capstone Lab: Building an End-to-End Analytics Pipeline and Project Defense",
              methodology: "Practical",
              courseOutcome: "CO5",
              bloomsLevel: "Evaluating",
              studyMaterialRef: "Capstone Project Rubric & Guidelines",
              conductedDate: null,
              isConducted: false,
            },
          ],
        },
      ],
    };
  }

  // Generic 5-Module Syllabus for Text Mining / Compiler / Other Engineering Courses
  return {
    courseCode: courseCode || "CS002",
    courseName: courseName || "Core Engineering Course",
    academicYear: "2026-2027",
    semester: "Semester 1",
    totalModules: 5,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
    modules: [
      {
        moduleNumber: 1,
        title: "Foundations & Architectural Strategy",
        description: "Introduction to domain concepts, standard lifecycles, environment setup, and data reading.",
        lectures: [
          {
            id: "lec-g1-1",
            lectureNo: 1,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "03/08/2026",
            topic: "Domain Overview, Core Paradigms, and Industry Application Architecture",
            methodology: "Lecture",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Unit 1 Deck (Slides 1-28)",
            conductedDate: "04/08/2026",
            isConducted: true,
          },
          {
            id: "lec-g1-2",
            lectureNo: 2,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "04/08/2026",
            topic: "Execution Lifecycle, Standard Phases, and Pipeline Strategies",
            methodology: "Lecture",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Textbook Chapter 1 & Lecture Notes",
            conductedDate: "18/08/2026",
            isConducted: true,
          },
          {
            id: "lec-g1-3",
            lectureNo: 3,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "04/08/2026",
            topic: "Business Understanding, Problem Formulation, and Target Scope Definition",
            methodology: "Lecture",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Unit 1 Case Study Handout",
            conductedDate: "04/08/2026",
            isConducted: true,
          },
          {
            id: "lec-g1-4",
            lectureNo: 4,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "04/08/2026",
            topic: "Data Preparation, Modeling Strategy, Evaluation, and Deployment Protocols",
            methodology: "Lecture",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Unit 1 Methodology Reference",
            conductedDate: "04/08/2026",
            isConducted: true,
          },
          {
            id: "lec-g1-5",
            lectureNo: 5,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "06/08/2026",
            topic: "Operational Nodes, Processing Elements, and Architecture Models",
            methodology: "Lecture",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Architecture Diagram Pack",
            conductedDate: "18/08/2026",
            isConducted: true,
          },
          {
            id: "lec-g1-6",
            lectureNo: 6,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "10/08/2026",
            topic: "Step-by-Step Practical Demonstration & Lab Environment Configuration",
            methodology: "Practical",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Lab Manual Exercise 1",
            conductedDate: "18/08/2026",
            isConducted: true,
          },
          {
            id: "lec-g1-7",
            lectureNo: 7,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "11/08/2026",
            topic: "Practical Exercise: Ingestion and Pipeline Execution on Standard Datasets",
            methodology: "Practical",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Dataset Package A",
            conductedDate: "25/08/2026",
            isConducted: true,
          },
          {
            id: "lec-g1-8",
            lectureNo: 8,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "11/08/2026",
            topic: "Multi-Source File Ingestion & Parsing Infrastructure",
            methodology: "Practical",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Ingestion Reference Manual",
            conductedDate: "25/08/2026",
            isConducted: true,
          },
          {
            id: "lec-g1-9",
            lectureNo: 9,
            moduleNumber: 1,
            moduleTitle: "Foundations & Architectural Strategy",
            proposedDate: "11/08/2026",
            topic: "Inspection Utilities, Log Viewers, and Document Parsing Subsystems",
            methodology: "Lecture",
            courseOutcome: "CO1",
            bloomsLevel: "Understanding",
            studyMaterialRef: "Unit 1 Summary Guide",
            conductedDate: "25/08/2026",
            isConducted: true,
          },
        ],
      },
      {
        moduleNumber: 2,
        title: "Linguistic Analysis, Preprocessing & Concept Modeling",
        description: "Tokenization, lexical parsing, feature extraction, entity recognition, and rule hierarchies.",
        lectures: [
          {
            id: "lec-g2-10",
            lectureNo: 10,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "13/08/2026",
            topic: "Web Feed & RSS Connector Subsystems; Structural HTML Ingestion",
            methodology: "Lecture",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Unit 2 Slides (Deck A)",
            conductedDate: "01/09/2026",
            isConducted: true,
          },
          {
            id: "lec-g2-11",
            lectureNo: 11,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "17/08/2026",
            topic: "Practical Exercise: Extracting Unstructured Feeds into Normalized Formats",
            methodology: "Practical",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Lab Manual Exercise 2",
            conductedDate: "01/09/2026",
            isConducted: true,
          },
          {
            id: "lec-g2-12",
            lectureNo: 12,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "18/08/2026",
            topic: "Linguistic Analysis Elements, Parts-of-Speech Tagging, and Morphological Analysis",
            methodology: "Lecture",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Textbook Chapter 3",
            conductedDate: "08/09/2026",
            isConducted: true,
          },
          {
            id: "lec-g2-13",
            lectureNo: 13,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "18/08/2026",
            topic: "Extractor Component Workflow, Stopword Filtering, and Text Normalization",
            methodology: "Lecture",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Unit 2 Preprocessing Handout",
            conductedDate: "08/09/2026",
            isConducted: true,
          },
          {
            id: "lec-g2-14",
            lectureNo: 14,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "18/08/2026",
            topic: "Candidate Terms, Equivalence Classes, Forcing, and Excluding Semantics",
            methodology: "Lecture",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Unit 2 Terminology Spec",
            conductedDate: "08/09/2026",
            isConducted: true,
          },
          {
            id: "lec-g2-15",
            lectureNo: 15,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "20/08/2026",
            topic: "Type Assignment and Categorization of Extracted Entities",
            methodology: "Lecture",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Entity Categorization Guidelines",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g2-16",
            lectureNo: 16,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "24/08/2026",
            topic: "Libraries, Resource Templates, TAPs, and Cross-Resource Relationships",
            methodology: "Lecture",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Unit 2 Reference Deck",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g2-17",
            lectureNo: 17,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "25/08/2026",
            topic: "Practical Lab: Concept Model Creation & Model Tuning Options",
            methodology: "Practical",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Lab Manual Exercise 3",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g2-18",
            lectureNo: 18,
            moduleNumber: 2,
            moduleTitle: "Linguistic Analysis, Preprocessing & Concept Modeling",
            proposedDate: "25/08/2026",
            topic: "Resource Templates and Advanced Expert Tab Configuration",
            methodology: "Lecture",
            courseOutcome: "CO2",
            bloomsLevel: "Applying",
            studyMaterialRef: "Expert Tuning Notes",
            conductedDate: null,
            isConducted: false,
          },
        ],
      },
      {
        moduleNumber: 3,
        title: "Semantic Analysis, Taxonomies & Feature Extraction",
        description: "Clustering algorithms, semantic similarity metrics, taxonomy generation, and feature extraction.",
        lectures: [
          {
            id: "lec-g3-19",
            lectureNo: 19,
            moduleNumber: 3,
            moduleTitle: "Semantic Analysis, Taxonomies & Feature Extraction",
            proposedDate: "27/08/2026",
            topic: "Semantic Relationships, Synonymy, Hypernymy, and Ontological Mapping",
            methodology: "Lecture",
            courseOutcome: "CO3",
            bloomsLevel: "Analyzing",
            studyMaterialRef: "Unit 3 Semantic Models PDF",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g3-20",
            lectureNo: 20,
            moduleNumber: 3,
            moduleTitle: "Semantic Analysis, Taxonomies & Feature Extraction",
            proposedDate: "31/08/2026",
            topic: "Vector Space Models, Term Frequency-Inverse Document Frequency (TF-IDF)",
            methodology: "Lecture",
            courseOutcome: "CO3",
            bloomsLevel: "Analyzing",
            studyMaterialRef: "Vector Spaces Handbook",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g3-21",
            lectureNo: 21,
            moduleNumber: 3,
            moduleTitle: "Semantic Analysis, Taxonomies & Feature Extraction",
            proposedDate: "02/09/2026",
            topic: "Practical Lab: Building Hierarchical Cluster Graphs and Taxonomy Trees",
            methodology: "Practical",
            courseOutcome: "CO3",
            bloomsLevel: "Analyzing",
            studyMaterialRef: "Lab Manual Exercise 4",
            conductedDate: null,
            isConducted: false,
          },
        ],
      },
      {
        moduleNumber: 4,
        title: "Model Optimization, Classification & Inference",
        description: "Supervised classifiers, neural representations, fine-tuning hyperparameters, and cross-validation.",
        lectures: [
          {
            id: "lec-g4-22",
            lectureNo: 22,
            moduleNumber: 4,
            moduleTitle: "Model Optimization, Classification & Inference",
            proposedDate: "04/09/2026",
            topic: "Classification Algorithms, Decision Boundaries, and Precision/Recall Optimization",
            methodology: "Lecture",
            courseOutcome: "CO4",
            bloomsLevel: "Evaluating",
            studyMaterialRef: "Unit 4 Machine Learning Slides",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g4-23",
            lectureNo: 23,
            moduleNumber: 4,
            moduleTitle: "Model Optimization, Classification & Inference",
            proposedDate: "08/09/2026",
            topic: "Ensemble Models, Gradient Boosting, and Validation Strategies",
            methodology: "Lecture",
            courseOutcome: "CO4",
            bloomsLevel: "Evaluating",
            studyMaterialRef: "Ensemble Techniques Guide",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g4-24",
            lectureNo: 24,
            moduleNumber: 4,
            moduleTitle: "Model Optimization, Classification & Inference",
            proposedDate: "10/09/2026",
            topic: "Practical Lab: Model Evaluation, ROC-AUC Metrics, and Confusion Matrix Diagnostics",
            methodology: "Practical",
            courseOutcome: "CO4",
            bloomsLevel: "Evaluating",
            studyMaterialRef: "Lab Manual Exercise 5",
            conductedDate: null,
            isConducted: false,
          },
        ],
      },
      {
        moduleNumber: 5,
        title: "Deployment, Governance & Project Defense",
        description: "Model serving, latency optimization, ethical AI governance, audit trails, and student project evaluation.",
        lectures: [
          {
            id: "lec-g5-25",
            lectureNo: 25,
            moduleNumber: 5,
            moduleTitle: "Deployment, Governance & Project Defense",
            proposedDate: "14/09/2026",
            topic: "Production Deployment Strategies, Microservice APIs, and Latency Constraints",
            methodology: "Lecture",
            courseOutcome: "CO5",
            bloomsLevel: "Creating",
            studyMaterialRef: "Unit 5 Deployment Slides",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g5-26",
            lectureNo: 26,
            moduleNumber: 5,
            moduleTitle: "Deployment, Governance & Project Defense",
            proposedDate: "16/09/2026",
            topic: "Ethical Considerations, Compliance Auditing, and Reproducibility Standards",
            methodology: "Lecture",
            courseOutcome: "CO5",
            bloomsLevel: "Creating",
            studyMaterialRef: "Institutional AI Ethics Policy",
            conductedDate: null,
            isConducted: false,
          },
          {
            id: "lec-g5-27",
            lectureNo: 27,
            moduleNumber: 27,
            moduleTitle: "Deployment, Governance & Project Defense",
            proposedDate: "18/09/2026",
            topic: "Capstone Course Project Demonstrations, Peer Review & Final Evaluation",
            methodology: "Practical",
            courseOutcome: "CO5",
            bloomsLevel: "Creating",
            studyMaterialRef: "Capstone Evaluation Rubric",
            conductedDate: null,
            isConducted: false,
          },
        ],
      },
    ],
  };
};

// ─── CSV EXPORT & TEMPLATE GENERATOR ───
export const generateSampleSessionPlanCsv = (courseCode: string, courseName: string): string => {
  const plan = generateDefaultSessionPlan(courseCode, courseName);
  const rows = [
    ["Lecture No.", "Proposed Date", "Topic (Points to Cover)", "Methodology/Activity", "Course Outcome Mapping", "Bloom's Level", "Study Material Ref.", "Conducted Date", "Module No.", "Module Title"].join(","),
  ];

  plan.modules.forEach((mod) => {
    mod.lectures.forEach((lec) => {
      const escapedTopic = `"${lec.topic.replace(/"/g, '""')}"`;
      const escapedMaterial = `"${lec.studyMaterialRef.replace(/"/g, '""')}"`;
      const escapedModTitle = `"${mod.title.replace(/"/g, '""')}"`;
      rows.push([
        lec.lectureNo,
        lec.proposedDate,
        escapedTopic,
        lec.methodology,
        lec.courseOutcome,
        lec.bloomsLevel,
        escapedMaterial,
        lec.conductedDate || "",
        mod.moduleNumber,
        escapedModTitle,
      ].join(","));
    });
  });

  return rows.join("\n");
};

// ─── CSV PARSER HELPER ───
export const parseSessionPlanCsv = (csvText: string, courseCode: string, courseName: string): CourseSessionPlan => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV file is empty or missing data rows.");

  const modulesMap: Record<number, { title: string; lectures: SessionPlanLecture[] }> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Regex to handle quoted CSV tokens
    const tokens: string[] = [];
    let insideQuote = false;
    let currentToken = "";

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        if (insideQuote && line[charIndex + 1] === '"') {
          currentToken += '"';
          charIndex++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === "," && !insideQuote) {
        tokens.push(currentToken.trim());
        currentToken = "";
      } else {
        currentToken += char;
      }
    }
    tokens.push(currentToken.trim());

    if (tokens.length >= 3) {
      const lectureNo = parseInt(tokens[0], 10) || i;
      const proposedDate = tokens[1] || `2026-08-${String(i).padStart(2, "0")}`;
      const topic = tokens[2] || `Lecture ${lectureNo}`;
      const methodology = (tokens[3] as MethodologyType) || "Lecture";
      const courseOutcome = (tokens[4] as CourseOutcomeType) || "CO1";
      const bloomsLevel = (tokens[5] as BloomsLevelType) || "Understanding";
      const studyMaterialRef = tokens[6] || `Unit Material`;
      const conductedDate = tokens[7] || null;
      const modNo = parseInt(tokens[8], 10) || Math.ceil(i / 5);
      const modTitle = tokens[9] || `Module ${modNo}: Core Curriculum`;

      if (!modulesMap[modNo]) {
        modulesMap[modNo] = { title: modTitle, lectures: [] };
      }

      modulesMap[modNo].lectures.push({
        id: `imported-lec-${i}`,
        lectureNo,
        moduleNumber: modNo,
        moduleTitle: modTitle,
        proposedDate,
        topic,
        methodology,
        courseOutcome,
        bloomsLevel,
        studyMaterialRef,
        conductedDate,
        isConducted: !!conductedDate,
      });
    }
  }

  const sortedModuleKeys = Object.keys(modulesMap).map(Number).sort((a, b) => a - b);
  const modules: SessionPlanModule[] = sortedModuleKeys.map((k) => ({
    moduleNumber: k,
    title: modulesMap[k].title,
    lectures: modulesMap[k].lectures,
  }));

  return {
    courseCode,
    courseName,
    academicYear: "2026-2027",
    semester: "Semester 1",
    totalModules: modules.length,
    modules,
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
  };
};
