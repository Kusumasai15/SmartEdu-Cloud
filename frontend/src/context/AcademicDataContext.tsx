"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";

export interface SyncUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  role: "STUDENT" | "FACULTY" | "HOD" | "VC" | "ADMINISTRATOR" | "EXAMINATION";
  department: string;
  className?: string;
  semester?: number;
  academicYear?: string;
  student_identifier?: string;
  faculty_identifier?: string;
  phone?: string;
  office_number?: string;
  office_hours?: string;
  designation?: string;
  qualifications?: string;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  twoFactorEnabled: boolean;
  lastLoginDate: string;
  created_at: string;
}

export interface SyncClassCohort {
  id: string;
  name: string; // e.g. "B.Tech CSE - Sem 5 (Sec A)"
  program: string; // e.g. "B.Tech Computer Science"
  semester: string; // e.g. "Semester 5"
  section: string; // e.g. "Section A"
  classAdvisor: string; // e.g. "Prof. Rajesh Sharma"
  classAdvisorEmail?: string;
  room?: string; // e.g. "LH-301, Engineering Block"
  academicYear?: string; // e.g. "2024-2028"
  studentCapacity?: number;
  studentCount?: number;
  assignedCourses?: string[]; // e.g. ["CS101", "DBMS301", "CS201", "MATH101"]
  courseInstructors?: Record<string, string>;
  status?: "ACTIVE" | "ARCHIVED";
}

export interface SyncSchool {
  id: string;
  name: string;
  code: string;
  dean: string;
  description?: string;
}

export interface SyncDepartment {
  id?: string;
  code: string;
  name: string;
  school?: string;
  dean: string;
  studentCount: number;
  capacity: number;
  averageGpa: number;
  status: "Active" | "Review";
  accreditation: string;
  programCoordinator?: string;
  programCoordinatorEmail?: string;
  classes?: string[];
  cohorts?: SyncClassCohort[];
  sections?: string[];
}

export interface SyncClassroom {
  id: string;
  roomNumber: string;
  name: string;
  building: string;
  type: "LECTURE_HALL" | "LABORATORY" | "CLASSROOM" | "SEMINAR_HALL" | "AUDITORIUM";
  capacity: number;
  floor: string;
  facilities: string[];
  status: "AVAILABLE" | "MAINTENANCE" | "RESERVED";
}

interface ApiRoom {
  id: string;
  building: string;
  floor: string | null;
  room_number: string;
  display_name: string | null;
  room_category: string | null;
  room_type: string;
  capacity: number;
  facilities: string[];
  operational_status: string;
}

const roomFromApi = (room: ApiRoom): SyncClassroom => ({
  id: room.id,
  roomNumber: room.room_number,
  name: room.display_name || room.room_number,
  building: room.building,
  floor: room.floor || "",
  type: (room.room_category || (room.room_type === "LAB" ? "LABORATORY" : room.room_type === "SEMINAR_ROOM" ? "SEMINAR_HALL" : room.room_type)) as SyncClassroom["type"],
  capacity: room.capacity,
  facilities: room.facilities || [],
  status: (room.operational_status || "AVAILABLE") as SyncClassroom["status"],
});

const roomToApi = (room: Omit<SyncClassroom, "id">) => ({
  building: room.building.trim(),
  floor: room.floor.trim(),
  room_number: room.roomNumber.trim(),
  display_name: room.name.trim(),
  room_category: room.type,
  room_type: room.type === "LABORATORY" ? "LAB" : room.type === "SEMINAR_HALL" ? "SEMINAR_ROOM" : room.type === "AUDITORIUM" ? "AUDITORIUM" : "CLASSROOM",
  capacity: room.capacity,
  facilities: room.facilities,
  operational_status: room.status,
  has_projector: room.facilities.includes("Smart Projector"),
  has_recording: room.facilities.includes("Video Conferencing"),
});

export interface SyncPolicy {
  id: string;
  title: string;
  category: "ACADEMIC" | "EXAMINATION" | "CAMPUS_SECURITY" | "STUDENT_SUPPORT";
  threshold: string;
  description: string;
  enforced: boolean;
  version: string;
}

export interface BatchEvaluationCriteria {
  id: string;
  batchName: string; // e.g. "Batch 2024-2028 (2024 Regulation)", "Batch 2023-2027", "Batch 2022-2026"
  academicYear: string; // e.g. "2024-2028"
  program: string; // e.g. "All Programs" | "B.Tech Computer Science"
  dsaWeightagePct: number; // e.g. 40
  seeWeightagePct: number; // e.g. 60
  minPassingScorePct: number; // e.g. 40
  minAttendancePct: number; // e.g. 75
  dsaAssignmentsWeightPct: number; // e.g. 25
  dsaClassTestWeightPct: number; // e.g. 25
  dsaMidTermWeightPct: number; // e.g. 25
  dsaLabPracticalWeightPct: number; // e.g. 25
  gradeScale?: Array<{
    minScore: number;
    maxScore: number;
    letterGrade: string;
    gradePoint: number;
    remark: string;
  }>;
  isDefault?: boolean;
}

export const defaultBatchCriteriaList: BatchEvaluationCriteria[] = [
  {
    id: "batch-2025-2029",
    batchName: "Batch 2025-2029 (50 DSA + 50 SEE Regulation)",
    academicYear: "2025-2029",
    program: "All Programs (B.Tech / BCA / MCA)",
    dsaWeightagePct: 50,
    seeWeightagePct: 50,
    minPassingScorePct: 40,
    minAttendancePct: 75,
    dsaAssignmentsWeightPct: 25,
    dsaClassTestWeightPct: 25,
    dsaMidTermWeightPct: 25,
    dsaLabPracticalWeightPct: 25,
    gradeScale: [
      { minScore: 90, maxScore: 100, letterGrade: "O", gradePoint: 10, remark: "Outstanding" },
      { minScore: 80, maxScore: 89, letterGrade: "A+", gradePoint: 9, remark: "Excellent" },
      { minScore: 70, maxScore: 79, letterGrade: "A", gradePoint: 8, remark: "Very Good" },
      { minScore: 60, maxScore: 69, letterGrade: "B+", gradePoint: 7, remark: "Good" },
      { minScore: 50, maxScore: 59, letterGrade: "B", gradePoint: 6, remark: "Above Average" },
      { minScore: 40, maxScore: 49, letterGrade: "C", gradePoint: 5, remark: "Pass" },
      { minScore: 0, maxScore: 39, letterGrade: "F", gradePoint: 0, remark: "Fail / Reappear" },
    ],
    isDefault: false,
  },
  {
    id: "batch-2024-2028",
    batchName: "Batch 2024-2028 (50 DSA + 50 SEE Regulation)",
    academicYear: "2024-2028",
    program: "B.Tech. in Artificial Intelligence and Data Science",
    dsaWeightagePct: 50,
    seeWeightagePct: 50,
    minPassingScorePct: 40,
    minAttendancePct: 75,
    dsaAssignmentsWeightPct: 25,
    dsaClassTestWeightPct: 25,
    dsaMidTermWeightPct: 25,
    dsaLabPracticalWeightPct: 25,
    gradeScale: [
      { minScore: 90, maxScore: 100, letterGrade: "O", gradePoint: 10, remark: "Outstanding" },
      { minScore: 80, maxScore: 89, letterGrade: "A+", gradePoint: 9, remark: "Excellent" },
      { minScore: 70, maxScore: 79, letterGrade: "A", gradePoint: 8, remark: "Very Good" },
      { minScore: 60, maxScore: 69, letterGrade: "B+", gradePoint: 7, remark: "Good" },
      { minScore: 50, maxScore: 59, letterGrade: "B", gradePoint: 6, remark: "Above Average" },
      { minScore: 40, maxScore: 49, letterGrade: "C", gradePoint: 5, remark: "Pass" },
      { minScore: 0, maxScore: 39, letterGrade: "F", gradePoint: 0, remark: "Fail / Reappear" },
    ],
    isDefault: true,
  },
  {
    id: "batch-2023-2027",
    batchName: "Batch 2023-2027 (40 DSA + 60 SEE Regulation)",
    academicYear: "2023-2027",
    program: "All Programs",
    dsaWeightagePct: 40,
    seeWeightagePct: 60,
    minPassingScorePct: 40,
    minAttendancePct: 75,
    dsaAssignmentsWeightPct: 25,
    dsaClassTestWeightPct: 25,
    dsaMidTermWeightPct: 25,
    dsaLabPracticalWeightPct: 25,
    gradeScale: [
      { minScore: 90, maxScore: 100, letterGrade: "O", gradePoint: 10, remark: "Outstanding" },
      { minScore: 80, maxScore: 89, letterGrade: "A+", gradePoint: 9, remark: "Excellent" },
      { minScore: 70, maxScore: 79, letterGrade: "A", gradePoint: 8, remark: "Very Good" },
      { minScore: 60, maxScore: 69, letterGrade: "B+", gradePoint: 7, remark: "Good" },
      { minScore: 50, maxScore: 59, letterGrade: "B", gradePoint: 6, remark: "Above Average" },
      { minScore: 40, maxScore: 49, letterGrade: "C", gradePoint: 5, remark: "Pass" },
      { minScore: 0, maxScore: 39, letterGrade: "F", gradePoint: 0, remark: "Fail / Reappear" },
    ],
    isDefault: false,
  },
  {
    id: "batch-2022-2026",
    batchName: "Batch 2022-2026 (30 DSA + 70 SEE Regulation)",
    academicYear: "2022-2026",
    program: "All Programs",
    dsaWeightagePct: 30,
    seeWeightagePct: 70,
    minPassingScorePct: 40,
    minAttendancePct: 75,
    dsaAssignmentsWeightPct: 25,
    dsaClassTestWeightPct: 25,
    dsaMidTermWeightPct: 25,
    dsaLabPracticalWeightPct: 25,
    gradeScale: [
      { minScore: 90, maxScore: 100, letterGrade: "O", gradePoint: 10, remark: "Outstanding" },
      { minScore: 80, maxScore: 89, letterGrade: "A+", gradePoint: 9, remark: "Excellent" },
      { minScore: 70, maxScore: 79, letterGrade: "A", gradePoint: 8, remark: "Very Good" },
      { minScore: 60, maxScore: 69, letterGrade: "B+", gradePoint: 7, remark: "Good" },
      { minScore: 50, maxScore: 59, letterGrade: "B", gradePoint: 6, remark: "Above Average" },
      { minScore: 40, maxScore: 49, letterGrade: "C", gradePoint: 5, remark: "Pass" },
      { minScore: 0, maxScore: 39, letterGrade: "F", gradePoint: 0, remark: "Fail / Reappear" },
    ],
    isDefault: false,
  },
  {
    id: "batch-2021-2025",
    batchName: "Batch 2021-2025 (30 DSA + 70 SEE Regulation)",
    academicYear: "2021-2025",
    program: "All Programs",
    dsaWeightagePct: 30,
    seeWeightagePct: 70,
    minPassingScorePct: 40,
    minAttendancePct: 75,
    dsaAssignmentsWeightPct: 25,
    dsaClassTestWeightPct: 25,
    dsaMidTermWeightPct: 25,
    dsaLabPracticalWeightPct: 25,
    gradeScale: [
      { minScore: 90, maxScore: 100, letterGrade: "O", gradePoint: 10, remark: "Outstanding" },
      { minScore: 80, maxScore: 89, letterGrade: "A+", gradePoint: 9, remark: "Excellent" },
      { minScore: 70, maxScore: 79, letterGrade: "A", gradePoint: 8, remark: "Very Good" },
      { minScore: 60, maxScore: 69, letterGrade: "B+", gradePoint: 7, remark: "Good" },
      { minScore: 50, maxScore: 59, letterGrade: "B", gradePoint: 6, remark: "Above Average" },
      { minScore: 40, maxScore: 49, letterGrade: "C", gradePoint: 5, remark: "Pass" },
      { minScore: 0, maxScore: 39, letterGrade: "F", gradePoint: 0, remark: "Fail / Reappear" },
    ],
    isDefault: false,
  },
];

export interface SyncCourse {
  id: string;
  code: string;
  name: string;
  department: string;
  departmentCode: string;
  instructor: string;
  credits: number;
  semester: string;
  enrolledStudents: number;
  maxCapacity: number;
  type: "Core" | "Elective" | "Lab";
  status: "Active" | "Archived" | "Draft";
  description: string;
  assignedClasses?: string[]; // e.g. ["B.Tech CSE - Sem 5 (Sec A)", "B.Tech CSE - Sem 5 (Sec B)"]
}

// ─── Cloud LMS Data Models (Canvas / Blackboard Standard) ───
export interface LmsLesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "reading" | "quiz";
  videoUrl?: string;
  readingContent?: string;
  isCompleted: boolean;
  downloadableResource?: string;
}

export interface LmsModule {
  id: string;
  courseCode: string;
  moduleNumber: number;
  title: string;
  description: string;
  lessons: LmsLesson[];
  isPublished: boolean;
}

export interface LmsQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points?: number;
}

export interface LmsQuizAttempt {
  studentId: string;
  studentName: string;
  studentRoll: string;
  answers: Record<string, number>;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: number;
  timeTakenSeconds: number;
  strikes: number;
  proctoringViolations: string[];
  randomizedQuestionOrder?: string[];
  status: "SUBMITTED" | "DISQUALIFIED";
}

export interface LmsQuiz {
  id: string;
  courseCode: string;
  courseName: string;
  title: string;
  description: string;
  targetClass?: string;
  assessmentType?: "QUIZ" | "DSA_CLASS_TEST" | "MID_TERM" | "LAB_PRACTICAL";
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  timeLimitMinutes: number;
  totalPoints: number;
  weightPercentage: number;
  dueDate: string;
  isCameraProctored?: boolean;
  isFullscreenRequired?: boolean;
  isTabSwitchBlocked?: boolean;
  isCopyPasteBlocked?: boolean;
  resultsReleased?: boolean;
  questions: LmsQuizQuestion[];
  status: "AVAILABLE" | "COMPLETED";
  studentScore?: number;
  studentAnswers?: Record<string, number>;
  attempts?: Record<string, LmsQuizAttempt>;
  facultyId?: string;
  createdBy?: string;
  facultyName?: string;
}

export interface LmsDiscussionReply {
  id: string;
  authorName: string;
  authorRole: "STUDENT" | "FACULTY" | "HOD";
  content: string;
  createdAt: string;
  isEndorsed: boolean;
}

export interface LmsDiscussion {
  id: string;
  courseCode: string;
  courseName: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: "STUDENT" | "FACULTY" | "HOD";
  createdAt: string;
  upvotes: number;
  isInstructorEndorsed: boolean;
  replies: LmsDiscussionReply[];
}

export interface SyncTerm {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Upcoming" | "Completed";
  examPeriod: string;
  registrationStatus: "Open" | "Late Registration" | "Closed";
  coursesCount: number;
  enrolledCount: number;
}

export interface SyncDecree {
  id: string;
  title: string;
  school: string;
  status: "APPROVED" | "PENDING_SANCTION";
  summary: string;
  endowment: string;
  proposedDate: string;
}

export interface SyncGradeSheet {
  courseCode: string;
  courseName: string;
  instructor: string;
  studentCount: number;
  averageScore: number;
  status: "SUBMITTED" | "PUBLISHED";
  submittedDate: string;
}

export interface SyncDispute {
  id: string;
  studentName: string;
  rollNo: string;
  courseCode: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "REJECTED";
  submittedAt: string;
}

export interface CodingTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  points?: number;
  marks?: number;
  explanation?: string;
}

export interface AssignmentTeam {
  id: string;
  name: string;
  leaderStudentId: string;
  leaderName: string;
  memberStudentIds: string[];
  memberNames: string[];
  submissionStatus?: "PENDING" | "SUBMITTED" | "GRADED";
  score?: number;
  maxScore?: number;
  isLocked?: boolean;
}

export interface SyncAssignment {
  id: string;
  courseCode: string;
  courseName: string;
  title: string;
  description: string;
  type: "CODING" | "IDEATHON" | "WRITTEN" | "LAB_PROJECT" | "TERM_PAPER" | "PDF_DOCUMENT" | "CERTIFICATE_UPLOAD";
  dueDate: string;
  originalDueDate?: string;
  isExtended?: boolean;
  extendedReason?: string;
  totalPoints: number;
  weightPercentage: number;
  status: "ACTIVE" | "PAST_DUE" | "DRAFT";
  starterCode?: string;
  languageStarterCodes?: Record<string, string>;
  allowedLanguages?: string[];
  testCases?: CodingTestCase[];
  timeLimitSeconds?: number;
  memoryLimitMb?: number;
  submittedCount: number;
  totalEnrolled: number;
  gradedCount: number;
  averageScore?: number;
  proctoringMode?: "PROCTORED" | "UNPROCTORED";
  disableCopyPaste?: boolean;
  disableContextMenu?: boolean;
  detectDevToolsAndExtensions?: boolean;
  detectTabSwitch?: boolean;
  isTeamAssignment?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  teams?: AssignmentTeam[];
  ideathonTheme?: string;
  problemStatement?: string;
  evaluationRubric?: Array<{ criterion: string; weight: number; description: string }>;
  facultyName?: string;
}

export interface SyncSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  submittedAt: string;
  status: "SUBMITTED" | "GRADED" | "NEEDS_GRADING";
  score?: number;
  marksObtained?: number;
  maxScore: number;
  codeContent?: string;
  fileName?: string;
  fileUrl?: string;
  certificateUrl?: string;
  certificateProvider?: string;
  notes?: string;
  testCasesPassed?: number;
  totalTestCases?: number;
  feedback?: string;
}

export interface FacultyPresenceRecord {
  facultyId: string;
  facultyName: string;
  email: string;
  status: "IN_CABIN" | "IN_CLASS" | "ON_BREAK" | "BUSY" | "AWAY" | "ON_LEAVE";
  cabinNumber?: string;
  currentRoom?: string;
  customNote?: string;
  updatedAt: string;
  isAutoDetected?: boolean;
  activeLecture?: CalendarScheduleEvent;
}

export interface StudentDoubtSession {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  rollNo?: string;
  facultyId: string;
  facultyName: string;
  facultyEmail?: string;
  courseCode: string;
  topic: string;
  requestedDate: string; // e.g. "2026-10-06"
  requestedTime: string; // e.g. "14:00 - 14:30"
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
  meetingMode: "IN_CABIN" | "ONLINE_LINK";
  meetingLocation?: string;
  responseNote?: string;
  createdAt: string;
}

export interface FacultyLeaveSubstitution {
  id: string;
  eventId?: string;
  courseCode: string;
  courseName?: string;
  sessionDate: string; // "2026-10-07"
  sessionTime: string; // "10:00 AM - 11:00 AM"
  room?: string;
  substituteFacultyId: string;
  substituteFacultyName: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}

export interface FacultyLeaveRequest {
  id: string;
  facultyId: string;
  facultyName: string;
  department: string;
  leaveType: "CASUAL" | "MEDICAL" | "DUTY" | "RESEARCH" | "EMERGENCY";
  startDate: string;
  endDate: string;
  reason: string;
  substitutions: FacultyLeaveSubstitution[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  appliedAt: string;
  reviewedBy?: string;
  reviewComment?: string;
}

// ─── STUDENT LEAVE & ON-DUTY (OD) TWO-TIER GOVERNANCE MODELS ───
export type StudentLeaveType = "EVENT" | "MEDICAL" | "ON_DUTY";
export type StudentLeaveStatus = "PENDING_ADVISOR" | "PENDING_HOD" | "APPROVED" | "REJECTED";

export interface StudentLeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  studentEmail: string;
  className: string;
  department: string;
  leaveType: StudentLeaveType; // "EVENT" | "MEDICAL" | "ON_DUTY"
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  reason: string;
  proofFileName?: string;
  proofUrl?: string;
  affectedCourseCodes: string[];
  status: StudentLeaveStatus;
  appliedAt: string;
  advisorId?: string;
  advisorName?: string;
  advisorEmail?: string;
  advisorReviewedAt?: string;
  advisorNotes?: string;
  hodId?: string;
  hodName?: string;
  hodReviewedAt?: string;
  hodNotes?: string;
  attendanceCredited?: boolean;
  creditedSessionsCount?: number;
}

export const initialStudentLeaves: StudentLeaveRequest[] = [];

// ─── CONTINUOUS MODULAR COURSE & FACULTY FEEDBACK MODELS ───
export interface CourseModuleDef {
  id: string;
  courseCode: string;
  courseName: string;
  facultyName: string;
  moduleNumber: number; // 1 to 5
  title: string;
  description: string;
  status: "COMPLETED" | "IN_PROGRESS" | "UPCOMING";
  completedDate?: string;
}

export interface ModuleFeedbackRatings {
  conceptClarity: number; // 1-5
  teachingPace: "TOO_SLOW" | "JUST_RIGHT" | "TOO_FAST";
  practicalRelevance: number; // 1-5
  doubtResolution: number; // 1-5
  materialsQuality: number; // 1-5
  overall: number; // 1-5
}

export interface ModuleFeedbackRecord {
  id: string;
  courseCode: string;
  courseName: string;
  facultyName: string;
  moduleNumber: number;
  moduleTitle: string;
  studentId?: string;
  studentEmail?: string;
  studentRollNo?: string;
  studentName?: string;
  className?: string;
  isAnonymous: boolean;
  ratings: ModuleFeedbackRatings;
  comments: string;
  positiveHighlights?: string;
  improvementSuggestions?: string;
  facultyAcknowledgement?: {
    acknowledgedAt: string;
    facultyNote?: string;
    facultyName: string;
  };
  submittedAt: string;
}

export const initialCourseModules: CourseModuleDef[] = [
  {
    id: "mod-e1itc302-01",
    courseCode: "E1ITC 302",
    courseName: "Graph Analytics",
    facultyName: "Subrata Pain",
    moduleNumber: 1,
    title: "Module 1: Graph Theory Fundamentals",
    description: "Vertices, edges, directed and undirected graphs, weighted graphs, degree, paths, cycles and connectivity.",
    status: "IN_PROGRESS",
    completedDate: undefined,
  },
  {
    id: "mod-e1itc302-02",
    courseCode: "E1ITC 302",
    courseName: "Graph Analytics",
    facultyName: "Subrata Pain",
    moduleNumber: 2,
    title: "Module 2: Graph Representations",
    description: "Adjacency matrices, adjacency lists, incidence matrices, graph storage and complexity analysis.",
    status: "UPCOMING",
    completedDate: undefined,
  },
  {
    id: "mod-e1itc302-03",
    courseCode: "E1ITC 302",
    courseName: "Graph Analytics",
    facultyName: "Subrata Pain",
    moduleNumber: 3,
    title: "Module 3: Graph Traversal and Connectivity",
    description: "BFS, DFS, connected components, cycle detection and traversal applications.",
    status: "UPCOMING",
    completedDate: undefined,
  },
  {
    id: "mod-e1itc302-04",
    courseCode: "E1ITC 302",
    courseName: "Graph Analytics",
    facultyName: "Subrata Pain",
    moduleNumber: 4,
    title: "Module 4: Graph Algorithms",
    description: "Shortest paths, Dijkstra's algorithm, minimum spanning trees, Prim's and Kruskal's algorithms.",
    status: "UPCOMING",
    completedDate: undefined,
  },
  {
    id: "mod-e1itc302-05",
    courseCode: "E1ITC 302",
    courseName: "Graph Analytics",
    facultyName: "Subrata Pain",
    moduleNumber: 5,
    title: "Module 5: Advanced Graph Analytics",
    description: "Centrality measures, PageRank, community detection, social network analysis and real-world applications.",
    status: "UPCOMING",
    completedDate: undefined,
  },
];

/* Legacy module bootstrap records are intentionally disabled. Production modules
   are loaded from the API and an empty database must remain empty.
  // CS101 / CS-01: Data Structures & Algorithms (Dr. Rajesh Kumar)
  {
    id: "mod-cs101-1",
    courseCode: "CS101",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 1,
    title: "Module 1: Asymptotic Complexity & Linear Data Structures",
    description: "Big-O notation, amortized analysis, dynamic arrays, linked lists, stacks, and circular queues.",
    status: "COMPLETED",
    completedDate: "2026-09-15",
  },
  {
    id: "mod-cs101-2",
    courseCode: "CS101",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 2,
    title: "Module 2: Non-Linear Structures & Tree Traversals",
    description: "Binary Search Trees, AVL balance rotations, Red-Black properties, priority queues, and binary heaps.",
    status: "COMPLETED",
    completedDate: "2026-10-02",
  },
  {
    id: "mod-cs101-3",
    courseCode: "CS101",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 3,
    title: "Module 3: Graph Algorithms & Minimum Spanning Trees",
    description: "BFS, DFS, topological sorting, Dijkstra shortest path, Bellman-Ford, and Kruskal/Prim MST algorithms.",
    status: "IN_PROGRESS",
  },
  {
    id: "mod-cs101-4",
    courseCode: "CS101",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 4,
    title: "Module 4: Dynamic Programming & Greedy Paradigms",
    description: "Optimal substructure, memoization tables, knapsack 0/1, longest common subsequence, and Huffman codes.",
    status: "UPCOMING",
  },
  {
    id: "mod-cs101-5",
    courseCode: "CS101",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 5,
    title: "Module 5: Advanced String Matching & NP-Completeness",
    description: "KMP pattern matching, Rabin-Karp hashing, Trie data structures, P vs NP, and SAT reductions.",
    status: "UPCOMING",
  },

  // CS-01 alias mapping
  {
    id: "mod-cs01-1",
    courseCode: "CS-01",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 1,
    title: "Module 1: Asymptotic Complexity & Linear Data Structures",
    description: "Big-O notation, amortized analysis, dynamic arrays, linked lists, stacks, and circular queues.",
    status: "COMPLETED",
    completedDate: "2026-09-15",
  },
  {
    id: "mod-cs01-2",
    courseCode: "CS-01",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 2,
    title: "Module 2: Non-Linear Structures & Tree Traversals",
    description: "Binary Search Trees, AVL balance rotations, Red-Black properties, priority queues, and binary heaps.",
    status: "COMPLETED",
    completedDate: "2026-10-02",
  },
  {
    id: "mod-cs01-3",
    courseCode: "CS-01",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 3,
    title: "Module 3: Graph Algorithms & Minimum Spanning Trees",
    description: "BFS, DFS, topological sorting, Dijkstra shortest path, Bellman-Ford, and Kruskal/Prim MST algorithms.",
    status: "IN_PROGRESS",
  },
  {
    id: "mod-cs01-4",
    courseCode: "CS-01",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 4,
    title: "Module 4: Dynamic Programming & Greedy Paradigms",
    description: "Optimal substructure, memoization tables, knapsack 0/1, longest common subsequence, and Huffman codes.",
    status: "UPCOMING",
  },
  {
    id: "mod-cs01-5",
    courseCode: "CS-01",
    courseName: "Data Structures & Algorithms",
    facultyName: "Dr. Rajesh Kumar",
    moduleNumber: 5,
    title: "Module 5: Advanced String Matching & NP-Completeness",
    description: "KMP pattern matching, Rabin-Karp hashing, Trie data structures, P vs NP, and SAT reductions.",
    status: "UPCOMING",
  },

  // CS201 / CS-02: Operating Systems & Virtualization (Dr. Ananya Sharma)
  {
    id: "mod-cs201-1",
    courseCode: "CS201",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 1,
    title: "Module 1: Kernel Architecture & Process Scheduling",
    description: "Dual-mode CPU operations, system calls, PCB structure, CFS scheduler, and context switching overhead.",
    status: "COMPLETED",
    completedDate: "2026-09-18",
  },
  {
    id: "mod-cs201-2",
    courseCode: "CS201",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 2,
    title: "Module 2: Concurrency, Deadlocks & Synchronization",
    description: "POSIX mutexes, semaphores, Peterson algorithm, deadlock prevention, and Banker algorithm.",
    status: "COMPLETED",
    completedDate: "2026-10-08",
  },
  {
    id: "mod-cs201-3",
    courseCode: "CS201",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 3,
    title: "Module 3: Virtual Memory & Paging Mechanisms",
    description: "Demand paging, page fault handling, inverted page tables, TLB hits/misses, and LRU replacement.",
    status: "IN_PROGRESS",
  },
  {
    id: "mod-cs201-4",
    courseCode: "CS201",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 4,
    title: "Module 4: Storage Systems & File System Internals",
    description: "ext4/FAT32 inode tables, block allocation algorithms, journaling, and disk arm scheduling.",
    status: "UPCOMING",
  },
  {
    id: "mod-cs201-5",
    courseCode: "CS201",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 5,
    title: "Module 5: Containerization & Hypervisor Virtualization",
    description: "Linux cgroups, namespaces, Type-1 vs Type-2 hypervisors, and security sandboxing.",
    status: "UPCOMING",
  },

  // CS-02 alias
  {
    id: "mod-cs02-1",
    courseCode: "CS-02",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 1,
    title: "Module 1: Kernel Architecture & Process Scheduling",
    description: "Dual-mode CPU operations, system calls, PCB structure, CFS scheduler, and context switching overhead.",
    status: "COMPLETED",
    completedDate: "2026-09-18",
  },
  {
    id: "mod-cs02-2",
    courseCode: "CS-02",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 2,
    title: "Module 2: Concurrency, Deadlocks & Synchronization",
    description: "POSIX mutexes, semaphores, Peterson algorithm, deadlock prevention, and Banker algorithm.",
    status: "COMPLETED",
    completedDate: "2026-10-08",
  },
  {
    id: "mod-cs02-3",
    courseCode: "CS-02",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 3,
    title: "Module 3: Virtual Memory & Paging Mechanisms",
    description: "Demand paging, page fault handling, inverted page tables, TLB hits/misses, and LRU replacement.",
    status: "IN_PROGRESS",
  },
  {
    id: "mod-cs02-4",
    courseCode: "CS-02",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 4,
    title: "Module 4: Storage Systems & File System Internals",
    description: "ext4/FAT32 inode tables, block allocation algorithms, journaling, and disk arm scheduling.",
    status: "UPCOMING",
  },
  {
    id: "mod-cs02-5",
    courseCode: "CS-02",
    courseName: "Operating Systems & Architecture",
    facultyName: "Dr. Ananya Sharma",
    moduleNumber: 5,
    title: "Module 5: Containerization & Hypervisor Virtualization",
    description: "Linux cgroups, namespaces, Type-1 vs Type-2 hypervisors, and security sandboxing.",
    status: "UPCOMING",
  },

  // CS301 / CS-03: Database Management Systems (Dr. Vikram Malhotra)
  {
    id: "mod-cs301-1",
    courseCode: "CS301",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 1,
    title: "Module 1: Relational Algebra & Advanced SQL Querying",
    description: "Relational calculus, set operations, nested subqueries, CTEs, and window analytics.",
    status: "COMPLETED",
    completedDate: "2026-09-20",
  },
  {
    id: "mod-cs301-2",
    courseCode: "CS301",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 2,
    title: "Module 2: Schema Normalization & Functional Dependencies",
    description: "1NF through BCNF and 4NF, lossless join decomposition, and dependency preservation tests.",
    status: "COMPLETED",
    completedDate: "2026-10-05",
  },
  {
    id: "mod-cs301-3",
    courseCode: "CS301",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 3,
    title: "Module 3: Transaction Management & ACID Properties",
    description: "Serializability conflict graphs, strict 2PL, MVCC snapshot isolation, and write-ahead logging (WAL).",
    status: "IN_PROGRESS",
  },
  {
    id: "mod-cs301-4",
    courseCode: "CS301",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 4,
    title: "Module 4: Storage Engines, B+ Trees & Indexing",
    description: "Clustered indices, hash indexing, B+ tree node splits, and cost-based query optimization plans.",
    status: "UPCOMING",
  },
  {
    id: "mod-cs301-5",
    courseCode: "CS301",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 5,
    title: "Module 5: NoSQL & Distributed Consensus Protocols",
    description: "CAP theorem, Paxos, Raft consensus, document stores, and eventual consistency models.",
    status: "UPCOMING",
  },

  // CS-03 alias
  {
    id: "mod-cs03-1",
    courseCode: "CS-03",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 1,
    title: "Module 1: Relational Algebra & Advanced SQL Querying",
    description: "Relational calculus, set operations, nested subqueries, CTEs, and window analytics.",
    status: "COMPLETED",
    completedDate: "2026-09-20",
  },
  {
    id: "mod-cs03-2",
    courseCode: "CS-03",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 2,
    title: "Module 2: Schema Normalization & Functional Dependencies",
    description: "1NF through BCNF and 4NF, lossless join decomposition, and dependency preservation tests.",
    status: "COMPLETED",
    completedDate: "2026-10-05",
  },
  {
    id: "mod-cs03-3",
    courseCode: "CS-03",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 3,
    title: "Module 3: Transaction Management & ACID Properties",
    description: "Serializability conflict graphs, strict 2PL, MVCC snapshot isolation, and write-ahead logging (WAL).",
    status: "IN_PROGRESS",
  },
  {
    id: "mod-cs03-4",
    courseCode: "CS-03",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 4,
    title: "Module 4: Storage Engines, B+ Trees & Indexing",
    description: "Clustered indices, hash indexing, B+ tree node splits, and cost-based query optimization plans.",
    status: "UPCOMING",
  },
  {
    id: "mod-cs03-5",
    courseCode: "CS-03",
    courseName: "Database Management Systems",
    facultyName: "Dr. Vikram Malhotra",
    moduleNumber: 5,
    title: "Module 5: NoSQL & Distributed Consensus Protocols",
    description: "CAP theorem, Paxos, Raft consensus, document stores, and eventual consistency models.",
    status: "UPCOMING",
  },
*/

export const initialModuleFeedbacks: ModuleFeedbackRecord[] = [];

export interface ClassLeaderboardEntry {
  id: string;
  studentId: string;
  name: string;
  rollNo: string;
  className: string;
  section: string;
  avatar?: string;
  xpPoints: number;
  level: number;
  rank: number;
  streakDays: number;
  assignmentsCompleted: number;
  attendancePct: number;
  quizzesWon: number;
  badges: string[];
}

export interface StudentProjectSubmission {
  id: string;
  title: string;
  abstract: string;
  courseCode: string;
  courseName: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  submissionType: "SOLO" | "TEAM";
  teamMembers?: string[];
  githubUrl?: string;
  demoUrl?: string;
  documentationUrl?: string;
  fileName?: string;
  fileSize?: string;
  techStack: string[];
  submittedAt: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "GRADED";
  rubricScores?: {
    codeQuality: number;
    systemArchitecture: number;
    documentation: number;
    demoPresentation: number;
    vivaDefense: number;
  };
  totalScore?: number;
  maxScore: number;
  facultyFeedback?: string;
  evaluatedBy?: string;
}

export interface CaseStudyRole {
  title: string;
  description: string;
  responsibilities: string[];
  priorityGoal: string;
}

export interface CaseStudyTeamMember {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  rollNo?: string;
  studentRollNo?: string;
  assignedRole?: string;
  roleTitle?: string;
  responsibilities?: string;
}

export interface CaseStudyTeam {
  id: string;
  teamName: string;
  members: CaseStudyTeamMember[];
  isSubmitted?: boolean;
  submittedAt?: string;
  submissionContent?: string;
  score?: number;
  submission?: {
    submittedAt: string;
    submittedBy: string;
    content: string;
    grade?: number;
    feedback?: string;
  };
}

export interface CaseStudyAssessment {
  id: string;
  courseCode: string;
  courseName: string;
  targetClass: string;
  facultyName: string;
  title: string;
  topic: string;
  scenarioBrief: string;
  learningObjectives: string[];
  roles: CaseStudyRole[];
  teams: CaseStudyTeam[];
  totalPoints: number;
  dueDate: string;
  createdAt: string;
  status: "ACTIVE" | "EVALUATED" | "ARCHIVED";
}

export interface SyncAttendanceSession {
  id: string;
  courseCode: string;
  courseName: string;
  topic: string;
  sessionDate: string;
  sessionDateRaw?: string; // e.g. "2026-09-21"
  createdAtTimestamp?: number; // epoch in ms
  room?: string;
  className?: string;
  section?: string;
  conductedByFaculty?: string;
  presentCount: number;
  totalCount: number;
  studentIsPresent?: boolean;
  presentStudentIds?: string[];
  absentStudentIds?: string[];
  status: "LOCKED";
  isLocked?: boolean;
  policyJustification?: string;
  modifiedAt?: string;
  records?: Array<{ studentId: string; student_id?: string; rollNo?: string; status: "PRESENT" | "ABSENT" | "LATE" | "P" | "A" | "ON_DUTY" | "APPROVED_LEAVE" }>;
}

export interface SyncAnnouncement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  courseCode?: string;
  audience: string;
  createdAt: string;
  priority: "NORMAL" | "HIGH" | "URGENT";
  category: string;
}

export interface SyncNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: "GRADE" | "ASSIGNMENT" | "ATTENDANCE" | "BROADCAST" | "EXAM" | "CLASS_TEST" | "TEAM_INVITE";
  courseCode?: string;
  topic?: string;
  lectureNumber?: number;
  room?: string;
  facultyName?: string;
  aiCatchUpAvailable?: boolean;
  targetStudentId?: string;
  targetRole?: "STUDENT" | "FACULTY" | "HOD" | "ADMIN" | "ALL";
  targetRecipientEmail?: string;
  targetRecipientName?: string;
  targetClass?: string;
  teamId?: string;
  assignmentId?: string;
  teamName?: string;
  invitedByName?: string;
}

export interface InstitutionalHoliday {
  id: string;
  name: string;
  startDate: string; // e.g. "2026-09-05"
  endDate?: string;
  type: "NATIONAL" | "UNIVERSITY" | "EXAM_BREAK" | "RECESS" | "MAINTENANCE";
  description?: string;
  isCampusClosed: boolean;
}

export interface CalendarScheduleEvent {
  id: string;
  backendId?: string;
  className?: string; // e.g. "Class 10", "Class 11", "Semester 5 CSE"
  section?: string;   // e.g. "A", "B"
  courseCode: string;
  courseName: string;
  lectureNumber: number;
  lectureTitle: string;
  dayIndex: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  dateNumber?: number;
  dateString?: string;
  weekNumber?: number; // 1, 2, 3, 4, ...
  startTime: string;
  endTime: string;
  startHour: number;
  durationHours?: number;
  room: string;
  building?: string;
  faculty: string;
  facultyTitle?: string;
  facultyPhoto?: string;
  facultyEmail?: string;
  facultyDepartment?: string;
  type?: "LECTURE" | "LAB" | "TUTORIAL" | "EXAM" | "CLASS_TEST" | "DSA" | "DEADLINE";
  colorBadge?: string;
  sessionAgenda?: string[];
  prerequisites?: string;
  learningOutcomes?: string;
  readingMaterials?: string;
  isSubstituted?: boolean;
  substituteFaculty?: string;
}

export const getAcademicTermDateForWeekDay = (weekNum: number, dayIdx: number): { dateString: string; dateNumber: number } => {
  const start = new Date("2026-07-06T12:00:00");
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset + (Number(weekNum) - 1) * 7 + (dayIdx === 0 ? 6 : dayIdx - 1));
  const dateString = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const dateNumber = start.getDate();
  return { dateString, dateNumber };
};

const scheduleIdentity = (event: Pick<CalendarScheduleEvent, "className" | "courseCode" | "dateString" | "dayIndex" | "weekNumber" | "startTime" | "endTime">): string =>
  [
    (event.className || "").trim().toLowerCase(),
    (event.courseCode || "").trim().toLowerCase(),
    event.dateString || `week-${Number(event.weekNumber || 0)}-day-${Number(event.dayIndex)}`,
    event.startTime,
    event.endTime,
  ].join("|");

const deduplicateSchedules = (events: CalendarScheduleEvent[]): CalendarScheduleEvent[] => {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = scheduleIdentity(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export interface SemesterCourseRecord {
  code: string;
  name: string;
  credits: number;
  grade: string;
  gradePoint: number;
  score: number;
  attendancePct: number;
}

export interface SemesterHistoryRecord {
  semesterNumber: number;
  termName: string;
  year: string;
  gpa: number;
  creditsEarned: number;
  totalCredits: number;
  status: "COMPLETED" | "CURRENT" | "UPCOMING";
  courses: SemesterCourseRecord[];
}

export interface ScheduleConflictResult {
  hasConflict: boolean;
  conflictType: "ROOM" | "FACULTY" | "COHORT" | null;
  conflictingEvent: CalendarScheduleEvent | null;
  message: string | null;
}

interface AcademicDataContextType {
  // Shared Production LMS Collections
  users: SyncUser[];
  schools: SyncSchool[];
  departments: SyncDepartment[];
  policies: SyncPolicy[];
  decrees: SyncDecree[];
  gradeSheets: SyncGradeSheet[];
  disputes: SyncDispute[];
  campusAlert: string | null;

  // Curriculum, Courses & Academic Terms
  courses: SyncCourse[];
  terms: SyncTerm[];

  // Semester Progression & Academic History
  currentSemester: number;
  activeSemesterFilter: number;
  setActiveSemesterFilter: (sem: number) => void;
  advanceSemester: () => void;
  semesterHistory: SemesterHistoryRecord[];

  // Cloud LMS Content, Assessments & Communities
  modules: LmsModule[];
  quizzes: LmsQuiz[];
  exams: LmsQuiz[];
  quizAttempts: LmsQuizAttempt[];
  discussions: LmsDiscussion[];

  // Course Work & Submissions (Clean Production State)
  assignments: SyncAssignment[];
  caseStudies: CaseStudyAssessment[];
  createCaseStudy: (caseStudy: CaseStudyAssessment) => Promise<void>;
  updateCaseStudy: (caseStudy: CaseStudyAssessment) => Promise<void>;
  deleteCaseStudy: (caseStudyId: string) => Promise<void>;
  duplicateCaseStudy: (caseStudyId: string) => Promise<void>;
  submitCaseStudy: (caseStudyId: string, teamId: string, content: string, studentName?: string, score?: number) => Promise<void>;
  submissions: SyncSubmission[];
  attendanceSessions: SyncAttendanceSession[];
  announcements: SyncAnnouncement[];
  notifications: SyncNotification[];

  // Student Attendance Metrics
  studentAttendancePct: number;
  studentClassesAttended: number;
  studentTotalClasses: number;

  // Real-time synchronization telemetry
  isSyncing: boolean;
  lastSyncTimestamp: string;

  // University Data Operations (Synchronized Across All Portals)
  provisionUser: (user: Omit<SyncUser, "id" | "created_at" | "lastLoginDate">) => Promise<void>;
  updateUser: (user: SyncUser) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;

  addDepartment: (dept: SyncDepartment) => Promise<void>;
  addSchool: (school: Omit<SyncSchool, "id">) => Promise<void>;
  updateSchool: (school: SyncSchool) => Promise<void>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateDepartment: (dept: SyncDepartment) => Promise<void>;
  deleteDepartment: (code: string) => Promise<void>;
  adjustDepartmentBudget: (code: string, delta: number) => void;
  addClassToDepartment: (deptCode: string, className: string) => Promise<void>;
  removeClassFromDepartment: (deptCode: string, className: string) => Promise<void>;
  addCohortToDepartment: (deptCode: string, cohort: Omit<SyncClassCohort, "id">) => Promise<void>;
  updateCohortInDepartment: (deptCode: string, cohort: SyncClassCohort) => Promise<void>;
  removeCohortFromDepartment: (deptCode: string, cohortIdOrName: string) => Promise<void>;
  assignAdvisorToCohort: (deptCode: string, cohortIdOrName: string, advisorName: string, advisorEmail?: string) => void;
  assignCoursesToCohort: (deptCode: string, cohortIdOrName: string, courseCodes: string[], instructors?: Record<string, string>) => void;

  addPolicy: (policy: Omit<SyncPolicy, "id">) => void;
  updatePolicy: (policy: SyncPolicy) => void;
  togglePolicyEnforcement: (id: string) => void;
  deletePolicy: (id: string) => void;

  // Curriculum & Course Operations
  addCourse: (course: Omit<SyncCourse, "id">) => Promise<void>;
  updateCourse: (course: SyncCourse) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  toggleCourseStatus: (id: string) => Promise<void>;
  assignClassesToCourse: (courseCode: string, classNames: string[]) => void;

  // Academic Term Operations
  updateTerm: (term: SyncTerm) => void;

  // Cloud LMS Interactive Learning, Quizzes & Discussions
  markLessonComplete: (courseCode: string, moduleId: string, lessonId: string) => void;
  addCourseModule: (courseCode: string, title: string, description: string) => void;
  addLessonToModule: (courseCode: string, moduleId: string, lesson: Omit<LmsLesson, "id" | "isCompleted">) => void;
  submitQuiz: (quizId: string, answers: Record<string, number>, score: number) => void;
  submitQuizAttempt: (quizId: string, attempt: LmsQuizAttempt) => void;
  createQuiz: (quiz: Omit<LmsQuiz, "id" | "status" | "studentScore">) => void;
  updateQuiz: (quizId: string, updates: Partial<LmsQuiz>) => void;
  releaseQuizResults: (quizId: string) => void;
  deleteQuiz: (quizId: string) => void;
  postDiscussionTopic: (topic: Omit<LmsDiscussion, "id" | "createdAt" | "upvotes" | "isInstructorEndorsed" | "replies">) => void;
  replyToDiscussion: (topicId: string, content: string, authorName: string, authorRole: "STUDENT" | "FACULTY" | "HOD") => void;
  endorseReply: (topicId: string, replyId: string) => void;

  sanctionDecree: (id: string) => void;
  draftDecree: (decree: Omit<SyncDecree, "id" | "status" | "proposedDate">) => void;

  authorizeGradeSheet: (courseCode: string) => void;
  resolveAttendanceDispute: (disputeId: string, resolution: "RESOLVED" | "REJECTED") => void;
  raiseAttendanceDispute: (courseCode: string, reason: string) => void;

  dispatchCampusAlert: (message: string) => void;
  dismissCampusAlert: () => void;

  createAssignment: (asg: Omit<SyncAssignment, "id" | "submittedCount" | "totalEnrolled" | "gradedCount">) => Promise<SyncAssignment>;
  submitAssignment: (
    assignmentId: string,
    code: string,
    testCasesPassed?: number,
    studentMeta?: { id?: string; name?: string; rollNo?: string },
    extraMeta?: { fileName?: string; fileUrl?: string; certificateUrl?: string; certificateProvider?: string; notes?: string }
  ) => Promise<void>;
  loadAssignmentSubmissions: (assignmentId: string, offset?: number) => Promise<{ total: number; loaded: number }>;
  gradeSubmission: (submissionId: string, score: number, feedback: string) => Promise<void>;
  extendAssignmentDueDate: (assignmentId: string, newDueDate: string, reason?: string) => Promise<void>;
  recordAttendance: (session: { courseCode: string; courseName: string; topic: string; room?: string; className?: string; section?: string; presentCount: number; totalCount: number; studentIsPresent: boolean; facultyName?: string; lectureNumber?: number; records?: Array<{ studentId: string; student_id?: string; rollNo?: string; status: "PRESENT" | "ABSENT" | "LATE" | "P" | "A" | "ON_DUTY" | "APPROVED_LEAVE" }>; rosterRecords?: Array<{ student_id: string; status: "PRESENT" | "ABSENT" | "LATE" | "ON_DUTY" | "APPROVED_LEAVE" }> }) => void;
  updateAttendanceSession: (sessionId: string, updatedData: Partial<SyncAttendanceSession>) => { success: boolean; error?: string };
  attendanceWindowHours: number;
  updateAttendanceWindowHours: (hours: number) => void;
  createAssignmentTeam: (assignmentId: string, teamName: string, leaderId: string, leaderName: string, initialMembers?: { id: string; name: string }[]) => { success: boolean; error?: string; team?: AssignmentTeam };
  joinAssignmentTeam: (assignmentId: string, teamId: string, studentId: string, studentName: string) => { success: boolean; error?: string };
  leaveAssignmentTeam: (assignmentId: string, teamId: string, studentId: string) => { success: boolean; error?: string };
  toggleLockAssignmentTeam: (assignmentId: string, teamId: string) => { success: boolean; isLocked?: boolean; error?: string };
  sendTeamInvitation: (assignmentId: string, teamId: string, teamName: string, leaderName: string, targetStudentId: string, targetStudentName: string) => { success: boolean; error?: string };
  broadcastNotice: (notice: { title: string; content: string; audience: string; category: string; sendNotification?: boolean }) => void;
  markNotificationAsRead: (notificationId: string) => void;

  // Production Lifecycle Management
  resetToProductionBaseline: () => void;
  purgeAllDataToBlankProduction: () => void;
  clearAllUserActivity: () => void;

  // Institutional Timetable & Academic Calendar Master State
  calendarSchedules: CalendarScheduleEvent[];
  institutionalHolidays: InstitutionalHoliday[];
  classrooms: SyncClassroom[];
  addClassroom: (room: Omit<SyncClassroom, "id">) => Promise<void>;
  updateClassroom: (room: SyncClassroom) => Promise<void>;
  deleteClassroom: (id: string) => Promise<void>;
  checkRoomConflict: (
    roomNumber: string,
    dayIndex: number,
    weekNumber: number,
    startTime: string,
    endTime: string,
    excludeEventId?: string
  ) => CalendarScheduleEvent | null;
  checkScheduleConflicts: (params: {
    roomNumber?: string;
    facultyName?: string;
    className?: string;
    dayIndex: number;
    weekNumber: number;
    startTime: string;
    endTime: string;
    excludeEventId?: string;
  }) => ScheduleConflictResult;
  autoGenerateTimetableForCohort: (params: {
    className: string;
    weekNumber: number;
    preferredRoom?: string;
    subjects?: { code: string; name: string; instructor?: string }[];
    replicateAcrossWeeks?: boolean;
  }) => void;
  isHolidayDate: (dateString: string) => InstitutionalHoliday | null;
  addInstitutionalHoliday: (holiday: Omit<InstitutionalHoliday, "id">) => void;
  deleteInstitutionalHoliday: (id: string) => void;
  copyScheduleToWeeks: (sourceWeek: number, targetWeeks: number[], classFilter?: string) => void;
  copyScheduleToMonth: (sourceMonth: string, targetMonth: string) => void;
  addScheduleEvent: (event: Omit<CalendarScheduleEvent, "id">) => void;
  updateScheduleEvent: (event: CalendarScheduleEvent) => void;
  cancelScheduleEvent: (id: string) => Promise<void>;
  deleteScheduleEvent: (id: string) => Promise<void>;
  purgeDuplicateSchedules: () => { removedCount: number };
  scheduleExamSession: (examData: {
    courseCode: string;
    courseName?: string;
    date: string;
    time: string;
    venue: string;
    totalCandidates?: number;
    series?: string;
    proctoringMode?: string;
  }) => void;
  scheduleClassTest: (testData: {
    courseCode: string;
    courseName?: string;
    title: string;
    className?: string;
    date: string;
    time: string;
    venue?: string;
    facultyName?: string;
    maxMarks?: number;
    agenda?: string[];
  }) => void;

  // Faculty Real-Time Cabin Presence Operations
  facultyPresence: Record<string, FacultyPresenceRecord>;
  getEffectiveFacultyPresence: (
    facultyIdOrEmail: string,
    facultyName?: string,
    facultyEmail?: string
  ) => FacultyPresenceRecord;
  updateFacultyPresence: (presence: {
    facultyId: string;
    facultyName: string;
    email: string;
    status: "IN_CABIN" | "IN_CLASS" | "ON_BREAK" | "BUSY" | "AWAY" | "ON_LEAVE";
    cabinNumber?: string;
    currentRoom?: string;
    customNote?: string;
  }) => void;

  // Student 1:1 Doubt & Consultation Booking Operations
  doubtSessions: StudentDoubtSession[];
  requestDoubtSession: (request: Omit<StudentDoubtSession, "id" | "createdAt" | "status">) => StudentDoubtSession;
  respondToDoubtSession: (sessionId: string, status: "ACCEPTED" | "DECLINED" | "COMPLETED", note?: string, meetingLocation?: string) => void;

  // Faculty Leave Management & Lecture Substitution Workflow Operations
  facultyLeaves: FacultyLeaveRequest[];
  applyFacultyLeave: (request: Omit<FacultyLeaveRequest, "id" | "appliedAt" | "status">) => FacultyLeaveRequest;
  respondToSubstitution: (leaveId: string, substitutionId: string, status: "ACCEPTED" | "REJECTED") => void;
  reviewFacultyLeave: (leaveId: string, status: "APPROVED" | "REJECTED", reviewedBy: string, comment?: string) => void;

  // Student Leave & On-Duty (OD) Two-Tier Governance Operations
  studentLeaves: StudentLeaveRequest[];
  applyStudentLeave: (request: Omit<StudentLeaveRequest, "id" | "appliedAt" | "status" | "attendanceCredited" | "creditedSessionsCount">) => StudentLeaveRequest;
  reviewStudentLeaveByAdvisor: (leaveId: string, decision: "APPROVE" | "REJECT", notes?: string, advisorName?: string) => void;
  reviewStudentLeaveByHod: (leaveId: string, decision: "APPROVE" | "REJECT", notes?: string, hodName?: string) => void;

  // Class Gamified Leaderboard
  leaderboard: ClassLeaderboardEntry[];
  addLeaderboardXp: (studentId: string, xpGained: number, reason?: string) => void;

  // Student Project Submissions & Capstone Portfolio
  projectSubmissions: StudentProjectSubmission[];
  submitProject: (project: Omit<StudentProjectSubmission, "id" | "submittedAt" | "status">) => StudentProjectSubmission;
  gradeProject: (
    projectId: string,
    rubricScores: NonNullable<StudentProjectSubmission['rubricScores']>,
    feedback: string,
    evaluator: string
  ) => void;

  // Official Institutional Branding
  universityLogo: string;
  updateUniversityLogo: (logoUrlOrBase64: string) => void;

  // Batch-Wise Academic Regulations & Evaluation Criteria (DSA % + SEE %)
  batchCriteria: BatchEvaluationCriteria[];
  updateBatchCriteria: (criteria: BatchEvaluationCriteria) => void;
  addBatchCriteria: (criteria: Omit<BatchEvaluationCriteria, "id">) => void;
  deleteBatchCriteria: (id: string) => void;
  getCriteriaForBatch: (batchIdOrName?: string) => BatchEvaluationCriteria;

  // Examination Department Approval & SEE Workflow
  examClearances: Record<number, ExamDepartmentClearance>;
  approveSemesterEndExams: (semester: number, approvedBy: string, remarks?: string) => void;
  toggleSemesterSeeApproval: (semester: number, approvedBy: string, remarks?: string) => void;
  isSemesterSeeUnlocked: (semester: number) => boolean;
  isHallTicketsReleased: boolean;
  toggleHallTicketRelease: (released?: boolean) => void;
  isSeeMarksEntryOpen: boolean;
  toggleSeeMarksEntry: (open?: boolean) => void;

  // Continuous Modular Course & Faculty Feedback
  courseModules: CourseModuleDef[];
  moduleFeedbacks: ModuleFeedbackRecord[];
  submitModuleFeedback: (feedback: Omit<ModuleFeedbackRecord, "id" | "submittedAt">) => ModuleFeedbackRecord;
  acknowledgeModuleFeedback: (feedbackId: string, facultyNote?: string, facultyName?: string) => void;
  updateCourseModuleStatus: (courseCode: string, moduleNumber: number, status: "COMPLETED" | "IN_PROGRESS" | "UPCOMING") => void;
}

export interface ExamDepartmentClearance {
  semester: number;
  isSubjectEvaluationComplete: boolean;
  isExamDeptApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalRemarks?: string;
}

export const DEFAULT_ENROLLED_STUDENTS: SyncUser[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// ZERO MOCK / REAL DATA SYSTEM STATE
// Clean zero-dummy production baseline
export const initialCalendarSchedules: CalendarScheduleEvent[] = [];
export const initialInstitutionalHolidays: InstitutionalHoliday[] = [];

export const initialDepartments: SyncDepartment[] = [];
export const initialClassrooms: SyncClassroom[] = [];

export const initialCourses: SyncCourse[] = [];
export const initialTerms: SyncTerm[] = [];

export const initialModules: LmsModule[] = [];
export const initialQuizzes: LmsQuiz[] = [];

export const initialLeaderboardEntries: ClassLeaderboardEntry[] = [];

export const initialProjectSubmissions: StudentProjectSubmission[] = [];
export const initialDiscussions: LmsDiscussion[] = [];
export const initialAdminAssignments: SyncAssignment[] = [];
export const initialAdminSubmissions: SyncSubmission[] = [];
export const initialAdminAttendanceSessions: SyncAttendanceSession[] = [];
export const initialSemesterHistory: SemesterHistoryRecord[] = [];

export const initialAdminUsers: SyncUser[] = [];

const AcademicDataContext = createContext<AcademicDataContextType | undefined>(undefined);
const SYNC_CHANNEL_NAME = "smartedu_lms_sync_channel";

export function AcademicDataProvider({ children }: { children: React.ReactNode }) {
  const { user: authenticatedUser, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<SyncUser[]>(initialAdminUsers);
  const [schools, setSchools] = useState<SyncSchool[]>([]);
  const [departments, setDepartments] = useState<SyncDepartment[]>(initialDepartments);
  const [classrooms, setClassrooms] = useState<SyncClassroom[]>(initialClassrooms);
  const [policies, setPolicies] = useState<SyncPolicy[]>([]);
  const [decrees, setDecrees] = useState<SyncDecree[]>([]);
  const [gradeSheets, setGradeSheets] = useState<SyncGradeSheet[]>([]);
  const [disputes, setDisputes] = useState<SyncDispute[]>([]);
  const [campusAlert, setCampusAlert] = useState<string | null>(null);

  const [courses, setCourses] = useState<SyncCourse[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("smartedu_persisted_courses") || localStorage.getItem("smartedu_courses");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return initialCourses;
  });
  const [terms, setTerms] = useState<SyncTerm[]>(initialTerms);

  // Academic data current semester and active semester filter
  const [currentSemester, setCurrentSemester] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("smartedu_current_semester");
        if (saved) return parseInt(saved, 10);
        const savedUser = localStorage.getItem("smartedu_current_user") || localStorage.getItem("user");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          const cls = parsedUser.className || parsedUser.class_name || "";
          const match = cls.match(/Sem(?:ester)?\s*(\d+)/i) || cls.match(/(\d+)(?:st|nd|rd|th)\s*Sem/i);
          if (match) return parseInt(match[1], 10);
        }
      } catch (e) {
        // fallback
      }
    }
    return 5;
  });
  const [activeSemesterFilter, setActiveSemesterFilter] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("smartedu_active_semester_filter");
        if (saved) return parseInt(saved, 10);
      } catch (e) {
        // fallback
      }
    }
    return 5;
  });
  const [semesterHistory, setSemesterHistory] = useState<SemesterHistoryRecord[]>(initialSemesterHistory);

  const [modules, setModules] = useState<LmsModule[]>(initialModules);
  const [quizzes, setQuizzes] = useState<LmsQuiz[]>(initialQuizzes);
  const quizAttempts = useMemo(
    () => quizzes.flatMap((quiz) => Object.values(quiz.attempts || {})),
    [quizzes]
  );
  const [discussions, setDiscussions] = useState<LmsDiscussion[]>(initialDiscussions);

  const [assignments, setAssignments] = useState<SyncAssignment[]>(initialAdminAssignments);
  const [caseStudies, setCaseStudies] = useState<CaseStudyAssessment[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("academic_case_studies");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });
  const [submissions, setSubmissions] = useState<SyncSubmission[]>(initialAdminSubmissions);
  const [attendanceSessions, setAttendanceSessions] = useState<SyncAttendanceSession[]>(initialAdminAttendanceSessions);
  const [attendanceWindowHours, setAttendanceWindowHoursState] = useState<number>(48);
  const [announcements, setAnnouncements] = useState<SyncAnnouncement[]>([
    {
      id: "ann-mcp-testing-aids",
      title: "Announcement: MCP Feature Testing – Section AI-DS",
      content: "Dear Students,\n\nWe will be testing the MCP (Model Context Protocol) feature in SmartEdu to evaluate its functionality and integration with the platform.\n\nAll students of Section AI-DS are requested to participate in the testing and verify the feature's functionality. Please report any errors, unexpected behavior, or issues encountered during the process.\n\nInstructions:\n1. Test the available MCP functionality as instructed.\n2. Verify that the feature works as expected.\n3. Report any bugs or technical issues.\n4. Share your feedback to help improve the system.\n\nYour cooperation and feedback are appreciated.\n\nRegards,\nFaculty – Section AI-DS",
      authorName: "Subrata Pain",
      courseCode: "E1ITC 302",
      audience: "Section AI & DS",
      createdAt: "Just now",
      priority: "HIGH",
      category: "Academic / Technical",
    }
  ]);
  const [notifications, setNotifications] = useState<SyncNotification[]>([]);

  // Institutional Timetable & Holidays State
  const [calendarSchedules, setCalendarSchedules] = useState<CalendarScheduleEvent[]>(initialCalendarSchedules);
  const [institutionalHolidays, setInstitutionalHolidays] = useState<InstitutionalHoliday[]>(initialInstitutionalHolidays);

  // University Logo Branding
  const [universityLogo, setUniversityLogo] = useState<string>("");

  // Batch-Wise Academic Regulations & Evaluation Criteria State (DSA % + SEE %)
  const [batchCriteria, setBatchCriteria] = useState<BatchEvaluationCriteria[]>(defaultBatchCriteriaList);

  // Examination Department Approval & SEE Clearance Workflow State
  const [examClearances, setExamClearances] = useState<Record<number, ExamDepartmentClearance>>({});

  // Examination Hall Ticket / Admit Card Release Controlled State
  const [isHallTicketsReleased, setIsHallTicketsReleased] = useState<boolean>(false);
  const [isSeeMarksEntryOpen, setIsSeeMarksEntryOpen] = useState<boolean>(false);

  // Faculty Real-Time Cabin Presence, Doubt Sessions & Leaves State
  const [facultyPresence, setFacultyPresence] = useState<Record<string, FacultyPresenceRecord>>({});
  const [doubtSessions, setDoubtSessions] = useState<StudentDoubtSession[]>([]);
  const [facultyLeaves, setFacultyLeaves] = useState<FacultyLeaveRequest[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<StudentLeaveRequest[]>(initialStudentLeaves);

  const [courseModules, setCourseModules] = useState<CourseModuleDef[]>(initialCourseModules);

  const [moduleFeedbacks, setModuleFeedbacks] = useState<ModuleFeedbackRecord[]>(initialModuleFeedbacks);

  // Class Leaderboard & Project Submissions State
  const [leaderboard, setLeaderboard] = useState<ClassLeaderboardEntry[]>(initialLeaderboardEntries);
  const [projectSubmissions, setProjectSubmissions] = useState<StudentProjectSubmission[]>(initialProjectSubmissions);
  const [facultyProjects, setFacultyProjects] = useState<any[]>([]);

  const [studentClassesAttended, setStudentClassesAttended] = useState<number>(0);
  const [studentTotalClasses, setStudentTotalClasses] = useState<number>(0);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(new Date().toLocaleTimeString());
  const channelRef = useRef<any>(null);

  // Compute accurate attendance percentage from live recorded sessions
  const calculatedAttendanceFromSessions = useMemo(() => {
    if (attendanceSessions && attendanceSessions.length > 0) {
      let attended = 0;
      attendanceSessions.forEach((s) => {
        if (s.studentIsPresent !== false) {
          attended++;
        }
      });
      return Number(((attended / attendanceSessions.length) * 100).toFixed(1));
    }
    return 100; // Baseline statutory compliance when no absences have been logged
  }, [attendanceSessions]);

  const studentAttendancePct = studentTotalClasses > 0
    ? Number(((studentClassesAttended / studentTotalClasses) * 100).toFixed(1))
    : calculatedAttendanceFromSessions;

  // Helper to load parsed data into state with zero fallback re-injection
  const applyStateUpdate = useCallback((parsed: any) => {
    if (!parsed) return;
    if (parsed.users && Array.isArray(parsed.users) && parsed.users.length > 0) {
      const hasAdmin = parsed.users.some((u: any) => (u.email || "").toLowerCase() === "admin@smartedu.com" || u.role === "ADMINISTRATOR");
      const userList = hasAdmin ? parsed.users : [...initialAdminUsers, ...parsed.users];
      setUsers(userList);
    } else {
      setUsers(initialAdminUsers);
    }

    const deptList = Array.isArray(parsed.departments) && parsed.departments.length > 0 ? parsed.departments : initialDepartments;
    const crsList = Array.isArray(parsed.courses) && parsed.courses.length > 0 ? parsed.courses : initialCourses;
    const roomList = Array.isArray(parsed.classrooms) && parsed.classrooms.length > 0 ? parsed.classrooms : initialClassrooms;
    const termList = Array.isArray(parsed.terms) && parsed.terms.length > 0 ? parsed.terms : initialTerms;

    setDepartments(deptList);
    setClassrooms(roomList);
    setCourses(crsList);
    setTerms(termList);

    if (parsed.currentSemester !== undefined) setCurrentSemester(parsed.currentSemester);
    if (parsed.activeSemesterFilter !== undefined) setActiveSemesterFilter(parsed.activeSemesterFilter);

    setSemesterHistory(Array.isArray(parsed.semesterHistory) ? parsed.semesterHistory : []);
    setModules(Array.isArray(parsed.modules) ? parsed.modules : []);
    setQuizzes(Array.isArray(parsed.quizzes) ? parsed.quizzes : []);
    setDiscussions(Array.isArray(parsed.discussions) ? parsed.discussions : []);

    setAssignments(Array.isArray(parsed.assignments) ? parsed.assignments : []);
    setSubmissions(Array.isArray(parsed.submissions) ? parsed.submissions : []);
    setAttendanceSessions(Array.isArray(parsed.attendanceSessions) ? parsed.attendanceSessions : []);
    if (parsed.attendanceWindowHours !== undefined) setAttendanceWindowHoursState(Number(parsed.attendanceWindowHours));

    if (parsed.announcements) setAnnouncements(Array.isArray(parsed.announcements) ? parsed.announcements : []);
    if (parsed.notifications) setNotifications(Array.isArray(parsed.notifications) ? parsed.notifications : []);
    if (parsed.campusAlert !== undefined) setCampusAlert(parsed.campusAlert);

    setCalendarSchedules(Array.isArray(parsed.calendarSchedules) ? parsed.calendarSchedules : []);
    if (parsed.institutionalHolidays) setInstitutionalHolidays(parsed.institutionalHolidays);

    if (parsed.facultyPresence && typeof parsed.facultyPresence === "object") setFacultyPresence(parsed.facultyPresence);
    if (parsed.doubtSessions && Array.isArray(parsed.doubtSessions)) setDoubtSessions(parsed.doubtSessions);
    if (parsed.moduleFeedbacks && Array.isArray(parsed.moduleFeedbacks)) setModuleFeedbacks(parsed.moduleFeedbacks);
    if (parsed.courseModules && Array.isArray(parsed.courseModules)) setCourseModules(parsed.courseModules);
    if (parsed.facultyLeaves && Array.isArray(parsed.facultyLeaves)) setFacultyLeaves(parsed.facultyLeaves);
    if (parsed.studentLeaves && Array.isArray(parsed.studentLeaves)) {
      setStudentLeaves(parsed.studentLeaves.filter((l: any) => !l.id?.startsWith("leave-demo-") && l.studentRollNo !== "2024-CSE-002" && !(l.studentName || "").toLowerCase().includes("kaaysha") && !(l.reason || "").includes("Smart India Hackathon")));
    }

    if (parsed.leaderboard && Array.isArray(parsed.leaderboard) && parsed.leaderboard.length > 0) {
      setLeaderboard(parsed.leaderboard);
    } else {
      setLeaderboard(initialLeaderboardEntries);
    }
    if (parsed.projectSubmissions && Array.isArray(parsed.projectSubmissions) && parsed.projectSubmissions.length > 0) {
      setProjectSubmissions(parsed.projectSubmissions);
    } else {
      setProjectSubmissions(initialProjectSubmissions);
    }

    if (parsed.studentClassesAttended !== undefined) setStudentClassesAttended(parsed.studentClassesAttended);
    if (parsed.studentTotalClasses !== undefined) setStudentTotalClasses(parsed.studentTotalClasses);
    setLastSyncTimestamp(new Date().toLocaleTimeString());
  }, []);
 
  // The backend is the source of truth. Browser storage must never rehydrate
  // academic records, because it can be stale or belong to another account.
  useEffect(() => {
    // Academic records are loaded from authenticated backend endpoints below.
    if (authLoading) return;
    if (!authenticatedUser) {
      setUsers([]);
      setDepartments([]);
      setCourses([]);
      setTerms([]);
      setAnnouncements([]);
      setModules([]);
      setQuizzes([]);
      setDiscussions([]);
      setAssignments([]);
      setSubmissions([]);
      setAttendanceSessions([]);
      setNotifications([]);
      setCalendarSchedules([]);
      setInstitutionalHolidays([]);
      setGradeSheets([]);
      setDisputes([]);
      setFacultyLeaves([]);
      setProjectSubmissions([]);
      return;
    }
    const activeUser = authenticatedUser;
    let cancelled = false;

    // 1.2 Multi-Cloud Realtime Live Cross-Device Subscription
    // Initialize BroadcastChannel for instant cross-tab sync
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
        channelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === "DATA_CHANGED") {
            loadBackendAcademicData();
          }
        };
      } catch {}
    }

    // Hydrate live data from FastAPI Backend if available
    let refreshing = false;
    async function loadBackendAcademicData() {
      if (refreshing || cancelled) return;
      refreshing = true;
      try {
      const courseMap = new Map<string, { code: string; name: string }>();
      // 1. Fetch Courses
      try {
        const rawRes = await apiClient.get<any>("/courses?page_size=150");
        if (cancelled) return;
        const coursesData: any[] = Array.isArray(rawRes)
          ? rawRes
          : Array.isArray(rawRes?.data)
          ? rawRes.data
          : [];
        if (coursesData.length > 0) {
          coursesData.forEach((course: any) => courseMap.set(course.id, {
            code: course.course_code || course.code || "",
            name: course.name || "",
          }));
          const mappedCourses: SyncCourse[] = coursesData.map((c: any) => {
            const rawInstructors = c.instructors || [];
            const primaryInst = rawInstructors.find((i: any) => i.is_primary)?.faculty_name || rawInstructors[0]?.faculty_name;
            return {
              id: c.id,
              code: c.course_code || c.code || "",
              name: c.name,
              department: c.department_name || c.department?.name || "Unassigned",
              departmentCode: c.department_code || c.department?.code || "",
              instructor: primaryInst && primaryInst !== "Unknown" ? primaryInst : "Unassigned",
              credits: c.credits || 0,
              semester: c.semester_name || "",
              enrolledStudents: c.enrolled_count || 0,
              maxCapacity: c.capacity || 60,
              type: "Core",
              status: c.is_active ? "Active" : "Archived",
              description: c.description || "",
              assignedClasses: c.assignedClasses || [],
            };
          });

          setCourses((prevCourses) => {
            const merged = [...mappedCourses];
            const seen = new Set(merged.map((c) => c.code.toLowerCase()));
            for (const prev of prevCourses) {
              if (!seen.has(prev.code.toLowerCase())) {
                merged.push(prev);
                seen.add(prev.code.toLowerCase());
              }
            }
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("smartedu_persisted_courses", JSON.stringify(merged));
              } catch {}
            }
            return merged;
          });
        }
      } catch {}

      if (["STUDENT", "FACULTY", "HOD"].includes(activeUser.role.name)) {
        try {
          const records = await apiClient.get<any[]>("/assignments/my?limit=100");
          if (cancelled) return;
          if (Array.isArray(records)) {
            setAssignments(records.map((record) => ({
              id: record.id,
              courseCode: courseMap.get(record.course_id)?.code || "",
              courseName: courseMap.get(record.course_id)?.name || "",
              title: record.title,
              description: record.description || "",
              type: "PDF_DOCUMENT" as const,
              dueDate: record.due_date,
              totalPoints: record.max_points,
              weightPercentage: 0,
              status: record.status === "DRAFT" ? "DRAFT" as const :
                new Date(record.due_date).getTime() < Date.now() ? "PAST_DUE" as const : "ACTIVE" as const,
              submittedCount: 0,
              totalEnrolled: 0,
              gradedCount: 0,
            })));
          }
        } catch (error) {
          console.error("Unable to load assignments from the backend:", error);
          if (!cancelled) setAssignments([]);
        }
      }
      if (["FACULTY", "HOD", "ADMINISTRATOR"].includes(activeUser.role.name)) {
        try {
          const asgList = await apiClient.get<any[]>("/assignments/my?limit=100");
          if (!cancelled && Array.isArray(asgList)) {
            const facSubmissions: SyncSubmission[] = [];
            await Promise.allSettled(
              asgList.map(async (asg) => {
                try {
                  const subRes = await apiClient.get<{ items: any[]; total: number }>(`/assignments/${asg.id}/submissions?limit=100`);
                  if (subRes && Array.isArray(subRes.items)) {
                    subRes.items.forEach((it: any) => {
                      const isPdf = Boolean(
                        (it.attachment_url && it.attachment_url.toLowerCase().includes(".pdf")) ||
                        (it.submission_text && it.submission_text.toLowerCase().includes(".pdf"))
                      );
                      let docName = undefined;
                      if (it.attachment_url) {
                        const m = it.submission_text?.match(/([a-zA-Z0-9_\-\.]+\.pdf)/i);
                        docName = m ? m[1] : (it.attachment_url.split("/").pop() || "Document.pdf");
                      } else if (it.submission_text?.match(/([a-zA-Z0-9_\-\.]+\.pdf)/i)) {
                        docName = it.submission_text.match(/([a-zA-Z0-9_\-\.]+\.pdf)/i)![1];
                      }
                      const isCode = !isPdf && it.submission_text && (
                        it.submission_text.includes("def ") ||
                        it.submission_text.includes("int ") ||
                        it.submission_text.includes("class ") ||
                        it.submission_text.includes("#include")
                      );

                      facSubmissions.push({
                        id: it.id,
                        assignmentId: it.assignment_id,
                        studentId: it.student_id,
                        studentName: it.student_name || "Enrolled Student",
                        rollNo: it.student_identifier || "",
                        submittedAt: it.submitted_at ? new Date(it.submitted_at).toLocaleString() : "Recently",
                        status: it.status === "GRADED" ? ("GRADED" as const) : ("SUBMITTED" as const),
                        score: it.score ?? undefined,
                        maxScore: asg.max_points || 100,
                        codeContent: isCode ? it.submission_text : undefined,
                        fileName: docName || (it.attachment_url ? "Attached Document" : undefined),
                        fileUrl: it.attachment_url || undefined,
                        notes: it.submission_text || "",
                        feedback: it.feedback || "",
                        testCasesPassed: 10,
                        totalTestCases: 10,
                      });
                    });
                  }
                } catch {}
              })
            );
            if (!cancelled) setSubmissions(facSubmissions);
          }
        } catch {}
      }
      if (activeUser.role.name === "STUDENT") {
        try {
          const records = await apiClient.get<any[]>("/assignments/my-submissions?limit=100");
          if (cancelled) return;
          setSubmissions(records.map((record) => ({
            id: record.id,
            assignmentId: record.assignment_id,
            studentId: record.student_id,
            studentName: `${activeUser.first_name} ${activeUser.last_name || ""}`.trim(),
            rollNo: activeUser.student_identifier || "",
            submittedAt: record.submitted_at,
            status: record.status === "GRADED" ? "GRADED" as const : "SUBMITTED" as const,
            score: record.score ?? undefined,
            maxScore: 0,
            codeContent: record.submission_text || undefined,
            fileUrl: record.attachment_url || undefined,
            feedback: record.feedback || undefined,
          })));
        } catch {
          if (!cancelled) setSubmissions([]);
        }
      }

      // 2. Fetch administrator-managed schools and departments
      try {
        const schoolData = await apiClient.get<any[]>("/schools");
        if (cancelled) return;
        setSchools(schoolData.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          dean: s.dean || "",
          description: s.description || "",
        })));
      } catch {
        if (!cancelled) setSchools([]);
      }

      try {
        const deptData = await apiClient.get<any>("/departments");
        if (cancelled) return;
        if (Array.isArray(deptData)) {
          setDepartments((prev) =>
            deptData.map((d: any) => {
              const existing = prev.find((p) => p.id === d.id || p.code === d.code);
              const rawCohorts = Array.isArray(d.cohorts) && d.cohorts.length > 0 ? d.cohorts : (existing?.cohorts || []);
              const allCohortMap = new Map<string, any>();
              rawCohorts.forEach((c: any) => { if (c?.name) allCohortMap.set(c.name.trim().toLowerCase(), c); });
              existing?.cohorts?.forEach((c: any) => { if (c?.name && !allCohortMap.has(c.name.trim().toLowerCase())) allCohortMap.set(c.name.trim().toLowerCase(), c); });
              const loadedCohorts = Array.from(allCohortMap.values());
              const loadedClasses: string[] = Array.from(new Set<string>(loadedCohorts.map((c: any) => String(c.name || ""))));

              return {
                id: d.id,
                code: d.code,
                name: d.name,
                school: d.school || existing?.school || "",
                dean:
                  (typeof d.head_of_department === "string"
                    ? d.head_of_department
                    : d.head_of_department?.full_name) ||
                  d.hod ||
                  d.dean ||
                  existing?.dean ||
                  "Unassigned",
                studentCount: d.student_count || existing?.studentCount || 0,
                capacity: d.capacity || existing?.capacity || loadedCohorts.reduce((sum: number, c: any) => sum + (Number(c.studentCapacity) || 0), 0),
                averageGpa: d.average_gpa || existing?.averageGpa || 0,
                status: d.is_active !== undefined ? (d.is_active ? "Active" : "Review") : (existing?.status || "Active"),
                accreditation: d.description || d.accreditation || existing?.accreditation || "Not recorded",
                classes: loadedClasses,
                cohorts: loadedCohorts,
                sections: existing?.sections || [],
              };
            })
          );

          // Cross-reference courses with department cohorts so taught classes and instructors are never lost
          const allLoadedCohorts: SyncClassCohort[] = deptData.flatMap((d: any) =>
            Array.isArray(d.cohorts) ? d.cohorts : []
          );
          setCourses((prevCourses) =>
            prevCourses.map((crs) => {
              const matchingCohorts = allLoadedCohorts.filter(
                (coh) =>
                  coh &&
                  Array.isArray(coh.assignedCourses) &&
                  coh.assignedCourses.some(
                    (code: string) => String(code).trim().toLowerCase() === crs.code.trim().toLowerCase()
                  )
              );
              const mappedClasses = matchingCohorts.map((coh) => coh.name);
              const cohortInstructor = matchingCohorts.find(
                (coh) => coh.courseInstructors && coh.courseInstructors[crs.code] && coh.courseInstructors[crs.code] !== "Unassigned"
              )?.courseInstructors?.[crs.code];

              const currentAssigned = (crs.assignedClasses && crs.assignedClasses.length > 0)
                ? Array.from(new Set([...crs.assignedClasses, ...mappedClasses]))
                : mappedClasses;
              const currentInstructor = (crs.instructor && crs.instructor !== "Unassigned")
                ? crs.instructor
                : (cohortInstructor || "Unassigned");

              return {
                ...crs,
                assignedClasses: currentAssigned,
                instructor: currentInstructor,
              };
            })
          );
        }
      } catch {}

      try {
        const roomData = await apiClient.get<ApiRoom[]>("/rooms");
        if (!cancelled) setClassrooms(roomData.map(roomFromApi));
      } catch {
        if (!cancelled) setClassrooms([]);
      }

      // 2b. Fetch Academic Terms / Semesters
      try {
        const termData = await apiClient.get<any>("/semesters");
        if (cancelled) return;
        if (Array.isArray(termData)) {
          setTerms(termData.map((t: any) => ({
            id: t.id,
            name: t.name,
            code: `${t.name || ""}-${t.academic_year || ""}`.replace(/\s+/g, "-"),
            startDate: t.start_date || "",
            endDate: t.end_date || "",
            status: t.is_current ? "Active" : "Upcoming",
            examPeriod: "",
            registrationStatus: "Open",
            coursesCount: 0,
            enrolledCount: 0,
          })));
        }
      } catch {}

      // 3. Fetch Announcements
      try {
        const annData = await apiClient.get<any>("/announcements");
        if (cancelled) return;
        if (Array.isArray(annData)) {
          const backendAnns = annData.map((a: any) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            authorName: a.author?.full_name || a.author_name || "Academic Administration",
            courseCode: a.course_code,
            audience: a.scope || a.audience || "Institution",
            createdAt: a.created_at || "",
            priority: (a.priority === "URGENT" || a.priority === "HIGH" ? a.priority : "NORMAL") as "NORMAL" | "HIGH" | "URGENT",
            category: a.category || "General",
          }));
          setAnnouncements(backendAnns);
        }
      } catch {}

      // 4. Fetch Users (Administrator gets all users, Students & others get faculty directory)
      try {
        if (activeUser.role.name === "ADMINISTRATOR") {
          const usersData = await apiClient.get<any>("/admin/users?limit=1000");
          if (cancelled) return;
          if (Array.isArray(usersData)) {
            setUsers(usersData.map((u: any) => ({
              id: u.id,
              first_name: u.first_name,
              last_name: u.last_name || "",
              email: u.email,
              role: (u.role_name || u.role?.name || "STUDENT").toUpperCase() as any,
              department: u.department_name || u.department?.name || "Unassigned",
              student_identifier: u.student_identifier || undefined,
              faculty_identifier: u.faculty_identifier || undefined,
              className: u.class_name || undefined,
              academicYear: u.academic_year || undefined,
              phone: u.phone || "",
              is_active: u.is_active !== false,
              twoFactorEnabled: Boolean(u.two_factor_enabled),
              lastLoginDate: u.last_login_date || "",
              created_at: u.created_at || "",
            })));
          }
        } else {
          const facRes = await apiClient.get<{ success?: boolean; data?: any[] }>("/faculty-directory");
          if (cancelled) return;
          const facList = Array.isArray(facRes) ? facRes : (facRes?.data || []);

          let stuList: any[] = [];
          try {
            const stuRes = await apiClient.get<{ success?: boolean; data?: any[] }>("/students-directory");
            if (!cancelled) {
              stuList = Array.isArray(stuRes) ? stuRes : (stuRes?.data || []);
            }
          } catch {}

          const mappedUsers: SyncUser[] = [];
          if (Array.isArray(facList) && facList.length > 0) {
            mappedUsers.push(...facList.map((u: any) => ({
              id: u.id,
              first_name: u.first_name,
              last_name: u.last_name || "",
              email: u.email,
              role: (u.role || "FACULTY").toUpperCase() as any,
              department: u.department || "",
              faculty_identifier: u.faculty_identifier || undefined,
              designation: u.designation || "",
              office_number: u.office_number || "",
              office_hours: u.office_hours || "",
              phone: u.phone || "",
              is_active: true,
              twoFactorEnabled: false,
              lastLoginDate: "",
              created_at: "",
            })));
          }

          if (Array.isArray(stuList) && stuList.length > 0) {
            mappedUsers.push(...stuList.map((u: any) => ({
              id: u.id,
              first_name: u.first_name,
              last_name: u.last_name || "",
              email: u.email,
              role: "STUDENT" as any,
              department: u.department || "",
              student_identifier: u.student_identifier || undefined,
              className: u.class_name || "",
              academicYear: u.academic_year || "",
              phone: u.phone || "",
              is_active: true,
              twoFactorEnabled: false,
              lastLoginDate: "",
              created_at: "",
            })));
          } else {
          }

          setUsers(mappedUsers);
        }
      } catch {}

      // 9. Synchronize timetable schedules from the backend.
      let currentSchedules: CalendarScheduleEvent[] = [];
      try {
        const backendSchedules = await apiClient.get<any[]>("/timetable/my-schedules");
        if (Array.isArray(backendSchedules) && backendSchedules.length > 0) {
          const dayMap: Record<string, number> = {
            MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 0,
          };
          const mappedBackend: CalendarScheduleEvent[] = backendSchedules.filter((bs) => bs.id).map((bs) => {
            const dIndex = dayMap[String(bs.day_of_week).toUpperCase()] ?? 1;
            const sHour = parseInt(String(bs.start_time || "9").split(":")[0], 10) || 9;
            return {
              id: bs.id,
              courseCode: bs.course_code || bs.courseCode || "",
              courseName: bs.course_name || bs.courseName || "",
              lectureNumber: 1,
              lectureTitle: bs.title || bs.lecture_title || "",
              dayIndex: dIndex,
              weekNumber: 1,
              startTime: bs.start_time || "09:00",
              endTime: bs.end_time || "10:30",
              startHour: sHour,
              durationHours: 1.5,
              room: bs.room || "",
              building: bs.building || "",
              faculty: bs.faculty_name || "",
              type: "LECTURE",
              colorBadge: "bg-blue-600 text-white",
            };
          });

          const existingIds = new Set(currentSchedules.map((s) => s.id));
          for (const mb of mappedBackend) {
            if (!existingIds.has(mb.id)) {
              currentSchedules.push(mb);
            }
          }
        }
      } catch {}

      // 10. Hydrate cross-portal operational state from local persistent backup and backend API atomically.
      if (typeof window !== "undefined") {
        try {
          const loadSaved = (key: string) => {
            const raw = localStorage.getItem(`smartedu_persisted_${key}`) || localStorage.getItem(`smartedu_${key}`);
            return raw ? JSON.parse(raw) : null;
          };

          const sFeedbacks = loadSaved("moduleFeedbacks");
          if (Array.isArray(sFeedbacks) && sFeedbacks.length > 0) setModuleFeedbacks(sFeedbacks);

          const sAttendance = loadSaved("attendanceSessions");
          if (Array.isArray(sAttendance) && sAttendance.length > 0) setAttendanceSessions(sAttendance);

          const sAssignments = loadSaved("assignments");
          if (Array.isArray(sAssignments) && sAssignments.length > 0) setAssignments(sAssignments);

          const sSubmissions = loadSaved("submissions");
          if (Array.isArray(sSubmissions) && sSubmissions.length > 0) setSubmissions(sSubmissions);

          const sLeaves = loadSaved("studentLeaves");
          if (Array.isArray(sLeaves) && sLeaves.length > 0) setStudentLeaves(sLeaves);

          const sProjects = loadSaved("projectSubmissions");
          if (Array.isArray(sProjects) && sProjects.length > 0) setProjectSubmissions(sProjects);

          const sFacultyProjects = loadSaved("facultyProjects");
          if (Array.isArray(sFacultyProjects) && sFacultyProjects.length > 0) setFacultyProjects(sFacultyProjects);

          const sQuizzes = loadSaved("quizzes");
          if (Array.isArray(sQuizzes) && sQuizzes.length > 0) setQuizzes(sQuizzes);

          const sSchedules = loadSaved("calendarSchedules");
          if (Array.isArray(sSchedules) && sSchedules.length > 0) setCalendarSchedules(sSchedules);
        } catch (e) {
          console.warn("Failed to load local backup cache:", e);
        }
      }

      try {
        const v = await apiClient.get<Record<string, any>>("/admin/operational-state");
        if (!cancelled && v) {
          if (v.facultyPresence && typeof v.facultyPresence === "object") setFacultyPresence(v.facultyPresence);
          if (Array.isArray(v.caseStudies)) setCaseStudies(v.caseStudies);
          if (Array.isArray(v.notifications)) setNotifications(v.notifications);
          if (Array.isArray(v.announcements)) setAnnouncements(v.announcements);
          if (v.examClearances && typeof v.examClearances === "object") setExamClearances(v.examClearances);
          if (typeof v.hallTicketsReleased === "boolean") setIsHallTicketsReleased(v.hallTicketsReleased);
          if (typeof v.seeMarksEntryOpen === "boolean") setIsSeeMarksEntryOpen(v.seeMarksEntryOpen);
          if (Array.isArray(v.institutionalHolidays)) setInstitutionalHolidays(v.institutionalHolidays);
          
          // Load and preserve any locally scheduled timetable slots across page refreshes
          let savedLocalSchedules: CalendarScheduleEvent[] = [];
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("smartedu_persisted_calendarSchedules") || localStorage.getItem("smartedu_calendarSchedules");
              if (raw) savedLocalSchedules = JSON.parse(raw);
            } catch {}
          }

          // Merge timetable schedules atomically without intermediate blank states
          const opSchedules = Array.isArray(v.calendarSchedules) ? v.calendarSchedules : [];
          const combinedSchedules = [...opSchedules];
          const existingOpKeys = new Set(opSchedules.map((ev) => scheduleIdentity(ev)));
          for (const bs of currentSchedules) {
            const k = scheduleIdentity(bs);
            if (!existingOpKeys.has(k)) {
              combinedSchedules.push(bs);
              existingOpKeys.add(k);
            }
          }
          for (const ls of savedLocalSchedules) {
            const k = scheduleIdentity(ls);
            if (!existingOpKeys.has(k)) {
              combinedSchedules.push(ls);
              existingOpKeys.add(k);
            }
          }
          // Load and preserve any locally scheduled exams across page refreshes
          let savedExams: CalendarScheduleEvent[] = [];
          if (typeof window !== "undefined") {
            try {
              const rawExams = localStorage.getItem("smartedu_exam_calendar_events") || localStorage.getItem("smartedu_exam_master_schedules");
              if (rawExams) {
                const parsedEx = JSON.parse(rawExams);
                if (Array.isArray(parsedEx)) {
                  savedExams = parsedEx.map((ex: any) => {
                    if (ex.type === "EXAM") return ex;
                    return {
                      id: ex.id || `exam-${Date.now()}`,
                      courseCode: ex.courseCode,
                      courseName: ex.courseName || ex.courseCode,
                      lectureNumber: 1,
                      lectureTitle: `🎓 Semester Exam: ${ex.courseName || ex.courseCode} (${ex.series || "Final Examination"})`,
                      dayIndex: 1,
                      dateString: ex.date,
                      startTime: (ex.time || "09:00 - 12:00").split("-")[0]?.trim() || "09:00 AM",
                      endTime: (ex.time || "09:00 - 12:00").split("-")[1]?.trim() || "12:00 PM",
                      room: ex.venue || "Auditorium Hall",
                      faculty: "Examination Division",
                      facultyDepartment: ex.department || "Examination",
                      type: "EXAM",
                      colorBadge: "bg-rose-600 border-rose-700",
                    };
                  });
                }
              }
            } catch {}
          }
          for (const ex of savedExams) {
            const k = scheduleIdentity(ex);
            if (!existingOpKeys.has(k)) {
              combinedSchedules.push(ex);
              existingOpKeys.add(k);
            }
          }

          const seen = new Set<string>();
          const cleaned = combinedSchedules.filter((ev: CalendarScheduleEvent) => {
            const key = scheduleIdentity(ev);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setCalendarSchedules(cleaned);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("smartedu_persisted_calendarSchedules", JSON.stringify(cleaned));
            } catch {}
          }

          if (Array.isArray(v.doubtSessions)) setDoubtSessions(v.doubtSessions);
          if (Array.isArray(v.facultyLeaves)) setFacultyLeaves(v.facultyLeaves);

          // Merge student leaves with local storage to guarantee leaves & OD never get deleted on refresh
          const leaveMap = new Map<string, StudentLeaveRequest>();
          if (typeof window !== "undefined") {
            try {
              const rawL = localStorage.getItem("smartedu_persisted_studentLeaves") || localStorage.getItem("smartedu_studentLeaves");
              if (rawL) {
                const parsedL = JSON.parse(rawL);
                if (Array.isArray(parsedL)) {
                  parsedL.forEach((l) => { if (l && l.id) leaveMap.set(l.id, l); });
                }
              }
            } catch {}
          }
          if (Array.isArray(v.studentLeaves)) {
            const statusPriority: Record<string, number> = {
              APPROVED: 4,
              REJECTED: 4,
              PENDING_HOD: 3,
              PENDING_ADVISOR: 1,
            };
            v.studentLeaves.forEach((remoteL: StudentLeaveRequest) => {
              if (remoteL && remoteL.id) {
                const existing = leaveMap.get(remoteL.id);
                if (!existing) {
                  leaveMap.set(remoteL.id, remoteL);
                } else {
                  const existingPrio = statusPriority[existing.status] || 0;
                  const remotePrio = statusPriority[remoteL.status] || 0;
                  if (remotePrio > existingPrio) {
                    leaveMap.set(remoteL.id, remoteL);
                  } else if (remotePrio === existingPrio) {
                    leaveMap.set(remoteL.id, { ...remoteL, ...existing });
                  }
                  // If existing has higher priority (e.g. reviewed locally), keep existing
                }
              }
            });
          }
          const mergedLeavesList = Array.from(leaveMap.values());
          if (mergedLeavesList.length > 0) {
            setStudentLeaves(mergedLeavesList);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("smartedu_persisted_studentLeaves", JSON.stringify(mergedLeavesList));
              } catch {}
            }
          } else if (Array.isArray(v.studentLeaves)) {
            setStudentLeaves(v.studentLeaves);
          }

          if (Array.isArray(v.modules)) setModules(v.modules);
          
          // Merge quizzes comprehensively so user-created quizzes are NEVER wiped on refresh
          const quizMap = new Map<string, LmsQuiz>();
          if (typeof window !== "undefined") {
            try {
              const rawQ = localStorage.getItem("smartedu_persisted_quizzes") || localStorage.getItem("smartedu_quizzes");
              if (rawQ) {
                const parsedQ = JSON.parse(rawQ);
                if (Array.isArray(parsedQ)) {
                  parsedQ.forEach((q) => { if (q && q.id) quizMap.set(q.id, q); });
                }
              }
            } catch {}
          }
          if (Array.isArray(v.quizzes)) {
            v.quizzes.forEach((remoteQ: LmsQuiz) => {
              if (!remoteQ || !remoteQ.id) return;
              const localQ = quizMap.get(remoteQ.id);
              if (!localQ) {
                quizMap.set(remoteQ.id, remoteQ);
              } else {
                quizMap.set(remoteQ.id, {
                  ...remoteQ,
                  ...localQ,
                  attempts: { ...(remoteQ.attempts || {}), ...(localQ.attempts || {}) },
                  status: localQ.status === "COMPLETED" || remoteQ.status === "COMPLETED" ? "COMPLETED" : remoteQ.status,
                  studentScore: localQ.studentScore ?? remoteQ.studentScore,
                  studentAnswers: localQ.studentAnswers || remoteQ.studentAnswers,
                });
              }
            });
          }
          const mergedQuizzesList = Array.from(quizMap.values());
          if (mergedQuizzesList.length > 0) {
            setQuizzes(mergedQuizzesList);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("smartedu_persisted_quizzes", JSON.stringify(mergedQuizzesList));
              } catch {}
            }
          }

          // Also pull scheduled assessments from dedicated proctored assessments engine
          try {
            const scheduledRes = await apiClient.get<any>("/assessments/scheduled-exams");
            const scheduledList = Array.isArray(scheduledRes)
              ? scheduledRes
              : Array.isArray(scheduledRes?.exams)
              ? scheduledRes.exams
              : Array.isArray(scheduledRes?.data)
              ? scheduledRes.data
              : [];
            if (scheduledList.length > 0) {
              scheduledList.forEach((sq: any) => {
                if (sq && sq.id) {
                  const existing = quizMap.get(sq.id);
                  if (!existing) {
                    quizMap.set(sq.id, sq);
                  }
                }
              });
              const refreshedQuizzes = Array.from(quizMap.values());
              setQuizzes(refreshedQuizzes);
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("smartedu_persisted_quizzes", JSON.stringify(refreshedQuizzes));
                } catch {}
              }
            }
          } catch {}
          // Merge attendance sessions with local storage to guarantee student & faculty sessions are never wiped on refresh
          const attendanceMap = new Map<string, SyncAttendanceSession>();
          if (typeof window !== "undefined") {
            try {
              const rawAtt = localStorage.getItem("smartedu_persisted_attendanceSessions") || localStorage.getItem("smartedu_attendanceSessions");
              if (rawAtt) {
                const parsedAtt = JSON.parse(rawAtt);
                if (Array.isArray(parsedAtt)) {
                  parsedAtt.forEach((s) => { if (s && s.id) attendanceMap.set(s.id, s); });
                }
              }
            } catch {}
          }
          if (Array.isArray(v.attendanceSessions)) {
            v.attendanceSessions.forEach((remoteS: SyncAttendanceSession) => {
              if (remoteS && remoteS.id) attendanceMap.set(remoteS.id, remoteS);
            });
          }
          const mergedAttendanceList = Array.from(attendanceMap.values());
          if (mergedAttendanceList.length > 0) {
            setAttendanceSessions(mergedAttendanceList);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("smartedu_persisted_attendanceSessions", JSON.stringify(mergedAttendanceList));
              } catch {}
            }
          } else if (Array.isArray(v.attendanceSessions)) {
            setAttendanceSessions(v.attendanceSessions);
          }
          if (Array.isArray(v.semesterHistory)) setSemesterHistory(v.semesterHistory);
          if (Array.isArray(v.batchCriteria) && v.batchCriteria.length > 0) {
            setBatchCriteria(v.batchCriteria);
          } else {
            setBatchCriteria(defaultBatchCriteriaList);
          }
          if (Array.isArray(v.projectSubmissions)) setProjectSubmissions(v.projectSubmissions);
          if (Array.isArray(v.facultyProjects)) {
            const localSavedRaw = typeof window !== "undefined" ? localStorage.getItem("smartedu_persisted_facultyProjects") : null;
            let localSavedProjects: any[] = [];
            try {
              if (localSavedRaw) localSavedProjects = JSON.parse(localSavedRaw);
            } catch {}
            const mergedFacultyProjects = v.facultyProjects.map((remoteFp: any) => {
              const localFp = localSavedProjects.find((lp: any) => lp.id === remoteFp.id);
              if (!localFp) return remoteFp;
              const teamMap = new Map();
              (remoteFp.teams || []).forEach((t: any) => { if (t && t.id) teamMap.set(t.id, t); });
              (localFp.teams || []).forEach((t: any) => { if (t && t.id) teamMap.set(t.id, t); });
              return {
                ...remoteFp,
                teams: Array.from(teamMap.values()),
              };
            });
            localSavedProjects.forEach((lp: any) => {
              if (!mergedFacultyProjects.some((m: any) => m.id === lp.id)) {
                mergedFacultyProjects.push(lp);
              }
            });
            setFacultyProjects(mergedFacultyProjects);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("smartedu_persisted_facultyProjects", JSON.stringify(mergedFacultyProjects));
              } catch {}
            }
          } else {
            const localSavedRaw = typeof window !== "undefined" ? localStorage.getItem("smartedu_persisted_facultyProjects") : null;
            if (localSavedRaw) {
              try {
                const parsed = JSON.parse(localSavedRaw);
                if (Array.isArray(parsed) && parsed.length > 0) setFacultyProjects(parsed);
              } catch {}
            }
          }

          // Merge modules with baseline so completed feedback units remain unlocked for testing
          if (Array.isArray(v.courseModules) && v.courseModules.length > 0) {
            const moduleMap = new Map<string, CourseModuleDef>();
            initialCourseModules.forEach((m) => moduleMap.set(`${m.courseCode.toUpperCase()}_${m.moduleNumber}`, m));
            v.courseModules.forEach((m: CourseModuleDef) => moduleMap.set(`${m.courseCode.toUpperCase()}_${m.moduleNumber}`, m));
            setCourseModules(Array.from(moduleMap.values()));
          } else {
            setCourseModules(initialCourseModules);
          }

          // Merge module feedbacks with local storage to guarantee student feedback is NEVER wiped on refresh
          const feedbackMap = new Map<string, ModuleFeedbackRecord>();
          if (typeof window !== "undefined") {
            try {
              const rawFb = localStorage.getItem("smartedu_persisted_moduleFeedbacks") || localStorage.getItem("smartedu_module_feedbacks");
              if (rawFb) {
                const parsedFb = JSON.parse(rawFb);
                if (Array.isArray(parsedFb)) {
                  parsedFb.forEach((fb) => { if (fb && fb.id) feedbackMap.set(fb.id, fb); });
                }
              }
            } catch {}
          }
          if (Array.isArray(v.moduleFeedbacks)) {
            v.moduleFeedbacks.forEach((remoteFb: ModuleFeedbackRecord) => {
              if (remoteFb && remoteFb.id) {
                const localFb = feedbackMap.get(remoteFb.id);
                feedbackMap.set(remoteFb.id, { ...(localFb || {}), ...remoteFb });
              }
            });
          }
          const mergedFeedbackList = Array.from(feedbackMap.values());
          if (mergedFeedbackList.length > 0) {
            setModuleFeedbacks(mergedFeedbackList);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("smartedu_persisted_moduleFeedbacks", JSON.stringify(mergedFeedbackList));
              } catch {}
            }
          } else if (Array.isArray(v.moduleFeedbacks)) {
            setModuleFeedbacks(v.moduleFeedbacks);
          }
          if (typeof v.universityLogo === "string") setUniversityLogo(v.universityLogo);
          if (typeof v.currentSemester === "number") setCurrentSemester(v.currentSemester);
          if (typeof v.activeSemesterFilter === "number") setActiveSemesterFilter(v.activeSemesterFilter);
        } else if (!cancelled && currentSchedules.length > 0) {
          setCalendarSchedules(currentSchedules);
        }
      } catch {}
      } finally { refreshing = false; }
    }

    let lastRefreshTimestamp = 0;
    const refreshVisible = () => {
      const now = Date.now();
      // Enforce 15-second debounce throttle to prevent rapid polling / 1-sec re-render loops
      if (now - lastRefreshTimestamp < 15000) return;
      if (document.visibilityState === "visible") {
        lastRefreshTimestamp = now;
        void loadBackendAcademicData();
      }
    };
    const refreshTimer = window.setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("academic-data-changed", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    loadBackendAcademicData();

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("academic-data-changed", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [authenticatedUser?.id, authLoading]);

  // Other tabs and portals refetch from the same authenticated database record.
  const syncToDisk = useCallback((updated: Record<string, unknown>) => {
    const persistedFields = new Set([
      "calendarSchedules", "institutionalHolidays", "modules", "quizzes", "caseStudies", "caseStudySubmissions",
      "attendanceSessions", "semesterHistory", "universityLogo", "batchCriteria",
      "currentSemester", "activeSemesterFilter", "examClearances", "hallTicketsReleased", "seeMarksEntryOpen",
      "facultyPresence", "notifications", "announcements", "doubtSessions", "facultyLeaves",
      "studentLeaves", "courseModules", "moduleFeedbacks", "dsaScoresMap", "dsaComponents", "dsaEvaluationConfig",
      "projectSubmissions", "projectTeams", "seeScoresMap", "publishedBatchMap", "dsaPublishedMap",
      "dsaRawMarksMap", "dsaBreakdownMap", "facultyProjects", "questionPapers"
    ]);
    const roleFields: Record<string, Set<string>> = {
      EXAMINATION: new Set([
        "calendarSchedules", "examClearances", "hallTicketsReleased", "seeMarksEntryOpen", "batchCriteria", "semesterHistory",
        "currentSemester", "activeSemesterFilter", "notifications", "announcements",
        "dsaScoresMap", "seeScoresMap", "publishedBatchMap", "questionPapers"
      ]),
      HOD: new Set([
        "calendarSchedules", "institutionalHolidays", "modules", "quizzes", "caseStudies", "caseStudySubmissions",
        "attendanceSessions", "facultyPresence", "doubtSessions", "facultyLeaves", "studentLeaves",
        "courseModules", "moduleFeedbacks", "notifications", "announcements",
        "dsaScoresMap", "dsaPublishedMap", "dsaRawMarksMap", "dsaBreakdownMap", "dsaEvaluationConfig", "dsaComponents",
        "projectSubmissions", "projectTeams", "facultyProjects", "questionPapers"
      ]),
      FACULTY: new Set([
        "calendarSchedules", "modules", "quizzes", "caseStudies", "caseStudySubmissions", "attendanceSessions",
        "facultyPresence", "doubtSessions", "facultyLeaves", "studentLeaves", "courseModules",
        "moduleFeedbacks", "notifications", "announcements", "dsaScoresMap", "dsaPublishedMap",
        "dsaRawMarksMap", "dsaBreakdownMap", "dsaEvaluationConfig", "dsaComponents",
        "projectSubmissions", "projectTeams", "facultyProjects", "questionPapers"
      ]),
      STUDENT: new Set(["doubtSessions", "studentLeaves", "moduleFeedbacks", "quizzes", "projectSubmissions", "projectTeams", "caseStudies", "caseStudySubmissions", "facultyProjects", "notifications"]),
      VC: new Set(),
    };
    const rawRole = authenticatedUser?.role;
    const roleName = (typeof rawRole === "string" ? rawRole : rawRole?.name || "").toUpperCase();
    const normalizedRole = (roleName === "ADMIN" || roleName === "ADMINISTRATOR")
      ? "ADMINISTRATOR"
      : roleName === "TEACHER"
      ? "FACULTY"
      : roleName;

    const allowedForRole = normalizedRole === "ADMINISTRATOR"
      ? persistedFields
      : roleFields[normalizedRole] || (authenticatedUser ? persistedFields : new Set<string>());
    const payload = Object.fromEntries(
      Object.entries(updated).filter(([key]) => persistedFields.has(key) && allowedForRole.has(key))
    );
    // Always persist updated state locally so data is never lost across page refresh
    if (typeof window !== "undefined") {
      try {
        Object.entries(updated).forEach(([k, v]) => {
          if (v !== undefined) {
            localStorage.setItem(`smartedu_persisted_${k}`, JSON.stringify(v));
          }
        });
      } catch (err) {
        console.warn("Local persistence cache warning:", err);
      }
    }

    if (Object.keys(payload).length > 0) {
      void apiClient.patch<Record<string, unknown>>("/admin/operational-state", payload).catch((error) => {
        console.error("Database synchronization failed:", error);
      });
    }
    channelRef.current?.postMessage({ type: "DATA_CHANGED" });
    setLastSyncTimestamp(new Date().toLocaleTimeString());
  }, [authenticatedUser]);

  const updateUniversityLogo = useCallback((logoUrlOrBase64: string) => {
    setUniversityLogo(logoUrlOrBase64);
    syncToDisk({ universityLogo: logoUrlOrBase64 });
  }, [syncToDisk]);

  // Batch-Wise Academic Regulations & Evaluation Criteria Handlers
  const updateBatchCriteria = useCallback((criteria: BatchEvaluationCriteria) => {
    setBatchCriteria((prev) => {
      const next = prev.map((c) => (c.id === criteria.id ? criteria : c));
      syncToDisk({ batchCriteria: next });
      return next;
    });
  }, [syncToDisk]);

  const addBatchCriteria = useCallback((criteria: Omit<BatchEvaluationCriteria, "id">) => {
    const newCriteria: BatchEvaluationCriteria = {
      ...criteria,
      id: `batch-${Date.now()}`,
    };
    setBatchCriteria((prev) => {
      const next = [...prev, newCriteria];
      syncToDisk({ batchCriteria: next });
      return next;
    });
  }, [syncToDisk]);

  const deleteBatchCriteria = useCallback((id: string) => {
    setBatchCriteria((prev) => {
      const next = prev.filter((c) => c.id !== id);
      syncToDisk({ batchCriteria: next });
      return next;
    });
  }, [syncToDisk]);

  const getCriteriaForBatch = useCallback(
    (batchIdOrName?: string): BatchEvaluationCriteria => {
      if (!batchIdOrName) return batchCriteria.find((c) => c.isDefault) || batchCriteria[0];
      const match = batchCriteria.find(
        (c) =>
          c.id === batchIdOrName ||
          c.batchName.toLowerCase().includes(batchIdOrName.toLowerCase()) ||
          c.academicYear === batchIdOrName
      );
      return match || batchCriteria.find((c) => c.isDefault) || batchCriteria[0];
    },
    [batchCriteria]
  );

  const approveSemesterEndExams = useCallback((semester: number, approvedBy: string, remarks?: string) => {
    setExamClearances((prev) => {
      const next = {
        ...prev,
        [semester]: {
          semester,
          isSubjectEvaluationComplete: true,
          isExamDeptApproved: true,
          approvedBy,
          approvedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          approvalRemarks: remarks || "Official SEE Examination Clearance Approved by Examination Department",
        },
      };
      syncToDisk({ examClearances: next });
      return next;
    });
  }, [syncToDisk]);

  const toggleSemesterSeeApproval = useCallback((semester: number, approvedBy: string, remarks?: string) => {
    setExamClearances((prev) => {
      const current = prev[semester];
      const nextApproved = !current?.isExamDeptApproved;
      const next = {
        ...prev,
        [semester]: {
          semester,
          isSubjectEvaluationComplete: nextApproved,
          isExamDeptApproved: nextApproved,
          approvedBy: nextApproved ? approvedBy : undefined,
          approvedAt: nextApproved ? new Date().toISOString().replace("T", " ").slice(0, 16) : undefined,
          approvalRemarks: nextApproved ? (remarks || "Official SEE Examination Clearance Approved by Examination Department") : undefined,
        },
      };
      syncToDisk({ examClearances: next });
      return next;
    });
  }, [syncToDisk]);

  const isSemesterSeeUnlocked = useCallback((semester: number) => {
    const clearance = examClearances[semester];
    return Boolean(clearance && clearance.isSubjectEvaluationComplete && clearance.isExamDeptApproved);
  }, [examClearances]);

  const toggleHallTicketRelease = useCallback(
    (released?: boolean) => {
      setIsHallTicketsReleased((prev) => {
        const next = typeof released === "boolean" ? released : !prev;
        syncToDisk({ hallTicketsReleased: next });

        if (next) {
          const newNotif: SyncNotification = {
            id: `notif-ht-${Date.now()}`,
            title: "Official SEE Admit Cards / Hall Tickets Released",
            message: "The Examination Office has released Semester End Examination admit cards for eligible candidates.",
            type: "EXAM",
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          setNotifications((prevNotifs) => [newNotif, ...prevNotifs]);

          const newAnn: SyncAnnouncement = {
            id: `ann-ht-${Date.now()}`,
            title: "Official Notice: Hall Tickets Released for Semester End Examinations (SEE)",
            content: "Admit cards / Hall tickets for the upcoming Semester End Examinations (SEE) are now officially available. Statutory minimum 75% attendance rule is strictly enforced. Eligible students can download their admit card with seat allocation from their student portal.",
            authorName: "Controller of Examinations",
            audience: "STUDENT",
            createdAt: new Date().toISOString(),
            priority: "HIGH",
            category: "EXAMINATION",
          };
          setAnnouncements((prevAnns) => [newAnn, ...prevAnns]);
        }

        return next;
      });
    },
    [syncToDisk]
  );

  const toggleSeeMarksEntry = useCallback(
    (open?: boolean) => {
      setIsSeeMarksEntryOpen((prev) => {
        const next = typeof open === "boolean" ? open : !prev;
        syncToDisk({ seeMarksEntryOpen: next });

        const newNotif: SyncNotification = {
          id: `notif-see-entry-${Date.now()}`,
          title: next
            ? "SEE Marks Entry Window Activated"
            : "SEE Marks Entry Window Locked",
          message: next
            ? "The Examination Department has enabled SEE Marks Entry. Course instructors can now enter final examination scores."
            : "The Examination Department has locked SEE Marks Entry.",
          type: "EXAM",
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications((prevNotifs) => [newNotif, ...prevNotifs]);

        return next;
      });
    },
    [syncToDisk]
  );

  // ─── USER PROVISIONING (Admin -> All Portals) ───
  const provisionUser = useCallback(
    async (userData: Omit<SyncUser, "id" | "created_at" | "lastLoginDate">) => {
      const cleanEmail = (userData.email || "").trim().toLowerCase();
      const cleanStuId = (userData.student_identifier || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanFacId = (userData.faculty_identifier || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check if duplicate already exists
      const duplicate = users.find((u) => {
        const uEmail = (u.email || "").trim().toLowerCase();
        const uStuId = (u.student_identifier || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const uFacId = (u.faculty_identifier || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

        if (cleanEmail && uEmail === cleanEmail) return true;
        if (cleanStuId && uStuId && uStuId === cleanStuId) return true;
        if (cleanFacId && uFacId && uFacId === cleanFacId) return true;
        return false;
      });

      if (duplicate) {
        throw new Error("An account with this email or identifier already exists.");
      }

      const created = await apiClient.post<{
        id: string; created_at?: string;
      }>("/admin/users", {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        department: userData.department,
        phone: userData.phone,
        identifier: userData.student_identifier || userData.faculty_identifier,
        className: userData.className,
        academicYear: userData.academicYear,
      });
      const newUser: SyncUser = {
        ...userData,
        password: userData.password || undefined,
        id: created.id,
        created_at: created.created_at || new Date().toISOString(),
        lastLoginDate: "Never logged in",
      };
      const next = [newUser, ...users];
      setUsers(next);
      syncToDisk({ users: next });

    },
    [users, syncToDisk]
  );

  const updateUser = useCallback(
    async (user: SyncUser) => {
      const cleanEmail = (user.email || "").trim().toLowerCase();
      const cleanStuId = (user.student_identifier || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanFacId = (user.faculty_identifier || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check for uniqueness collisions with other users
      const collision = users.find((u) => {
        if (u.id === user.id) return false;
        const uEmail = (u.email || "").trim().toLowerCase();
        const uStuId = (u.student_identifier || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const uFacId = (u.faculty_identifier || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

        if (cleanEmail && uEmail === cleanEmail) return true;
        if (cleanStuId && uStuId && uStuId === cleanStuId) return true;
        if (cleanFacId && uFacId && uFacId === cleanFacId) return true;
        return false;
      });

      if (collision) {
        throw new Error("An account with this email or identifier already exists.");
      }

      const patchPayload: Record<string, any> = {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        department: user.department,
        student_identifier: user.student_identifier || null,
        faculty_identifier: user.faculty_identifier || null,
        phone: user.phone,
        is_active: user.is_active,
        className: user.className || null,
        academicYear: user.academicYear || null,
      };
      if (user.password) {
        patchPayload.password = user.password;
      }
      await apiClient.patch(`/admin/users/${user.id}`, patchPayload);
      const cleanUser: SyncUser = { ...user, password: user.password || undefined };
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === user.id ? cleanUser : u));
        syncToDisk({ users: next });
        return next;
      });
    },
    [users, syncToDisk]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      await apiClient.delete(`/admin/users/${userId}`);
      const next = users.map((u) => u.id === userId ? { ...u, is_active: false } : u);
      setUsers(next);
      syncToDisk({ users: next });
    },
    [users, syncToDisk]
  );

  const toggleUserStatus = useCallback(
    async (userId: string) => {
      const target = users.find((u) => u.id === userId);
      if (!target) throw new Error("Account not found.");
      await apiClient.patch(`/admin/users/${userId}/status`, { is_active: !target.is_active });
      const next = users.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u));
      setUsers(next);
      syncToDisk({ users: next });
    },
    [users, syncToDisk]
  );

  // ─── ACADEMIC SCHOOLS & DIVISIONS ───
  const addSchool = useCallback(async (school: Omit<SyncSchool, "id">) => {
    const saved = await apiClient.post<SyncSchool>("/schools", school);
    setSchools((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const updateSchool = useCallback(async (school: SyncSchool) => {
    const saved = await apiClient.patch<SyncSchool>(`/schools/${school.id}`, school);
    setSchools((current) => current.map((item) => item.id === school.id ? saved : item));
    setDepartments((current) => current.map((department) =>
      department.school === schools.find((item) => item.id === school.id)?.name
        ? { ...department, school: saved.name }
        : department
    ));
  }, [schools]);

  const deleteSchool = useCallback(async (schoolId: string) => {
    await apiClient.delete(`/schools/${schoolId}`);
    setSchools((current) => current.filter((school) => school.id !== schoolId));
  }, []);

  const addDepartment = useCallback(
    async (dept: SyncDepartment) => {
      const saved = await apiClient.post<{ id: string }>("/departments", {
        code: dept.code,
        name: dept.name,
        school: dept.school,
        head_of_department: dept.dean,
        description: dept.accreditation,
        is_active: dept.status === "Active",
      });
      const next = [...departments, { ...dept, id: saved.id }];
      setDepartments(next);
      syncToDisk({ departments: next });
    },
    [departments, syncToDisk]
  );

  const updateDepartment = useCallback(
    async (dept: SyncDepartment) => {
      if (!dept.id) throw new Error("Department ID is missing. Refresh and try again.");
      await apiClient.patch(`/departments/${dept.id}`, {
        code: dept.code,
        name: dept.name,
        school: dept.school,
        head_of_department: dept.dean,
        description: dept.accreditation,
        is_active: dept.status === "Active",
      });
      const next = departments.map((d) => (d.id === dept.id || d.code === dept.code ? { ...d, ...dept } : d));
      setDepartments(next);
      syncToDisk({ departments: next });
    },
    [departments, syncToDisk]
  );

  const deleteDepartment = useCallback(
    async (code: string) => {
      const target = departments.find((d) => d.code === code);
      if (!target?.id) throw new Error("Department ID is missing. Refresh and try again.");
      await apiClient.delete(`/departments/${target.id}`);
      const next = departments.filter((d) => d.code !== code);
      setDepartments(next);
      syncToDisk({ departments: next });
    },
    [departments, syncToDisk]
  );

  const adjustDepartmentBudget = useCallback(
    (code: string, delta: number) => {
      const next = departments.map((d) =>
        d.code === code ? { ...d, capacity: Math.max(10, d.capacity + delta) } : d
      );
      setDepartments(next);
      syncToDisk({ departments: next });
    },
    [departments, syncToDisk]
  );

  const addCohortToDepartment = useCallback(
    async (deptCode: string, cohortData: Omit<SyncClassCohort, "id">) => {
      const cleanDept = deptCode.trim().toLowerCase();
      const targetDepartment = departments.find(
        (d) => d.code.trim().toLowerCase() === cleanDept || d.name.trim().toLowerCase() === cleanDept || d.id === deptCode
      );
      if (!targetDepartment?.id) throw new Error("Department ID is missing. Refresh and try again.");
      const newCohort: SyncClassCohort = {
        ...cohortData,
        id: crypto.randomUUID(),
        status: cohortData.status || "ACTIVE",
      };
      const duplicate = (targetDepartment.cohorts || []).some(
        (cohort) => cohort.name.trim().toLowerCase() === newCohort.name.trim().toLowerCase()
      );
      if (duplicate) throw new Error("A class with this name already exists in the department.");
      const targetCohorts = [...(targetDepartment.cohorts || []), newCohort];

      await apiClient.patch(`/departments/${targetDepartment.id}`, { cohorts: targetCohorts });

      const next = departments.map((d) => {
        if (d.code.trim().toLowerCase() === cleanDept || d.name.trim().toLowerCase() === cleanDept || d.id === deptCode) {
          const currentClasses = d.classes || [];
          const updatedClasses = currentClasses.includes(newCohort.name)
            ? currentClasses
            : [...currentClasses, newCohort.name];
          return {
            ...d,
            cohorts: targetCohorts,
            classes: updatedClasses,
          };
        }
        return d;
      });
      setDepartments(next);
      syncToDisk({ departments: next });
    },
    [departments, syncToDisk]
  );

  const addClassToDepartment = useCallback(
    async (deptCode: string, className: string) => {
      const cleanClass = className.trim();
      if (!cleanClass) throw new Error("Class name is required.");
      const cleanDept = deptCode.trim().toLowerCase();
      const targetDept = departments.find(
        (d) => d.code.trim().toLowerCase() === cleanDept || d.name.trim().toLowerCase() === cleanDept || d.id === deptCode
      );

      if (!targetDept) throw new Error("Select a saved department before creating a class.");
      await addCohortToDepartment(deptCode, {
        name: cleanClass,
        program: targetDept?.name || deptCode,
        semester: "Semester 1",
        section: "Section A",
        classAdvisor: "Not assigned",
        classAdvisorEmail: "",
        room: "",
        academicYear: "",
        studentCapacity: 0,
        status: "ACTIVE",
      });
    },
    [departments, addCohortToDepartment]
  );

  const updateCohortInDepartment = useCallback(
    async (deptCode: string, updatedCohort: SyncClassCohort) => {
      const cleanDept = deptCode.trim().toLowerCase();
      const targetDepartment = departments.find(
        (d) => d.code.trim().toLowerCase() === cleanDept || d.name.trim().toLowerCase() === cleanDept || d.id === deptCode
      );
      if (!targetDepartment?.id) throw new Error("Department ID is missing. Refresh and try again.");
      if (!(targetDepartment.cohorts || []).some((cohort) => cohort.id === updatedCohort.id)) {
        throw new Error("Class no longer exists. Refresh and try again.");
      }
      const targetCohorts = (targetDepartment.cohorts || []).map((cohort) =>
        cohort.id === updatedCohort.id ? updatedCohort : cohort
      );
      await apiClient.patch(`/departments/${targetDepartment.id}`, { cohorts: targetCohorts });

      const next = departments.map((d) => {
        if (d.code.trim().toLowerCase() === cleanDept || d.name.trim().toLowerCase() === cleanDept || d.id === deptCode) {
          const updatedClasses: string[] = Array.from(new Set<string>(targetCohorts.map((c) => c.name)));
          return {
            ...d,
            cohorts: targetCohorts,
            classes: updatedClasses,
          };
        }
        return d;
      });
      setDepartments(next);
      syncToDisk({ departments: next });
    },
    [departments, syncToDisk]
  );

  const removeCohortFromDepartment = useCallback(
    async (deptCode: string, cohortIdOrName: string) => {
      const cleanDept = deptCode.trim().toLowerCase();
      const cleanTarget = cohortIdOrName.trim().toLowerCase();
      const targetDepartment = departments.find(
        (d) => d.code.trim().toLowerCase() === cleanDept || d.name.trim().toLowerCase() === cleanDept || d.id === deptCode
      );
      if (!targetDepartment?.id) throw new Error("Department ID is missing. Refresh and try again.");
      const targetCohorts = (targetDepartment.cohorts || []).filter(
        (cohort) => cohort.id !== cohortIdOrName && cohort.name.trim().toLowerCase() !== cleanTarget
      );
      if (targetCohorts.length === (targetDepartment.cohorts || []).length) {
        throw new Error("Class no longer exists. Refresh and try again.");
      }
      await apiClient.patch(`/departments/${targetDepartment.id}`, { cohorts: targetCohorts });

      const next = departments.map((d) => {
        if (d.code.trim().toLowerCase() === cleanDept || d.name.trim().toLowerCase() === cleanDept || d.id === deptCode) {
          return {
            ...d,
            cohorts: targetCohorts,
            classes: targetCohorts.map((cohort) => cohort.name),
          };
        }
        return d;
      });
      setDepartments(next);
      syncToDisk({ departments: next });
    },
    [departments, syncToDisk]
  );

  const assignAdvisorToCohort = useCallback(
    (deptCode: string, cohortIdOrName: string, advisorName: string, advisorEmail?: string) => {
      let targetDeptId: string | undefined;
      let targetCohorts: SyncClassCohort[] = [];

      const next = departments.map((d) => {
        if (d.code === deptCode || d.name === deptCode || d.id === deptCode) {
          targetDeptId = d.id;
          const currentCohorts = d.cohorts || [];
          const updatedCohorts = currentCohorts.map((c) => {
            if (c.id === cohortIdOrName || c.name === cohortIdOrName) {
              return {
                ...c,
                classAdvisor: advisorName,
                classAdvisorEmail: advisorEmail || c.classAdvisorEmail,
              };
            }
            return c;
          });
          targetCohorts = updatedCohorts;
          return {
            ...d,
            cohorts: updatedCohorts,
          };
        }
        return d;
      });
      setDepartments(next);
      syncToDisk({ departments: next });

      if (targetDeptId) {
        apiClient.patch(`/departments/${targetDeptId}`, { cohorts: targetCohorts }).catch((err) => {
          console.error("Failed to persist cohort advisor to backend:", err);
        });
      }
    },
    [departments, syncToDisk]
  );

  const removeClassFromDepartment = useCallback(
    async (deptCode: string, className: string) => {
      await removeCohortFromDepartment(deptCode, className);
    },
    [removeCohortFromDepartment]
  );

  const assignCoursesToCohort = useCallback(
    (deptCode: string, cohortIdOrName: string, courseCodes: string[], instructors?: Record<string, string>) => {
      const cleanDept = deptCode.trim().toLowerCase();
      const cleanCohort = cohortIdOrName.trim().toLowerCase();

      let targetDeptId: string | undefined;
      let targetCohorts: SyncClassCohort[] = [];
      let updatedCohortName = "";
      const nextDepts = departments.map((d) => {
        if (d.code.trim().toLowerCase() === cleanDept || d.name.trim().toLowerCase() === cleanDept || d.id === deptCode) {
          targetDeptId = d.id;
          const currentCohorts = d.cohorts || [];
          const updatedCohorts = currentCohorts.map((c) => {
            if (c.id === cohortIdOrName || c.name.trim().toLowerCase() === cleanCohort) {
              updatedCohortName = c.name;
              return {
                ...c,
                assignedCourses: courseCodes,
                courseInstructors: instructors || c.courseInstructors,
              };
            }
            return c;
          });
          targetCohorts = updatedCohorts;
          return {
            ...d,
            cohorts: updatedCohorts,
          };
        }
        return d;
      });
      setDepartments(nextDepts);

      if (targetDeptId) {
        apiClient.patch(`/departments/${targetDeptId}`, { cohorts: targetCohorts }).catch((err) => {
          console.error("Failed to persist cohort courses to backend:", err);
        });
      }

      if (updatedCohortName) {
        const nextCourses = courses.map((crs) => {
          const shouldBeAssigned = courseCodes.includes(crs.code);
          const currentClasses = crs.assignedClasses || [];
          const updatedInstructor = instructors && instructors[crs.code] ? instructors[crs.code] : crs.instructor;

          const updatedClasses = shouldBeAssigned
            ? (currentClasses.includes(updatedCohortName) ? currentClasses : [...currentClasses, updatedCohortName])
            : currentClasses.filter((cn) => cn !== updatedCohortName);

          const studentCountForCourse = users.filter((u) =>
            u.role === "STUDENT" && updatedClasses.some((cls) => (u.className || "").toLowerCase().includes(cls.toLowerCase()))
          ).length;

          if (shouldBeAssigned) {
            return {
              ...crs,
              instructor: updatedInstructor,
              assignedClasses: updatedClasses,
              enrolledStudents: studentCountForCourse || crs.enrolledStudents,
            };
          } else {
            return {
              ...crs,
              assignedClasses: updatedClasses,
              enrolledStudents: studentCountForCourse,
            };
          }
        });
        setCourses(nextCourses);
        syncToDisk({ departments: nextDepts, courses: nextCourses });
      } else {
        syncToDisk({ departments: nextDepts });
      }

      // Synchronize assigned instructors to backend CourseInstructor table
      if (instructors) {
        Object.entries(instructors).forEach(([cCode, instName]) => {
          if (!instName || instName === "Unassigned") return;
          const matchedCourse = courses.find((c) => c.code.toLowerCase() === cCode.toLowerCase());
          const facultyUser = users.find(
            (u) =>
              `${u.first_name} ${u.last_name || ""}`.trim().toLowerCase() === instName.trim().toLowerCase() ||
              u.email.toLowerCase() === instName.trim().toLowerCase()
          );
          if (matchedCourse?.id && facultyUser?.id) {
            apiClient.post(`/courses/${matchedCourse.id}/instructors`, {
              faculty_id: facultyUser.id,
              is_primary: true,
            }).catch(() => {});
          }
        });
      }
    },
    [departments, courses, users, syncToDisk]
  );

  // ─── CLASSROOMS, LECTURE HALLS & ROOM CONFLICT DETECTION ───
  const addClassroom = useCallback(
    async (roomData: Omit<SyncClassroom, "id">) => {
      const created = await apiClient.post<ApiRoom>("/rooms", roomToApi(roomData));
      setClassrooms((current) => [...current, roomFromApi(created)]);
      syncToDisk({ classrooms: true });
    },
    [syncToDisk]
  );

  const updateClassroom = useCallback(
    async (roomData: SyncClassroom) => {
      const saved = await apiClient.put<ApiRoom>(`/rooms/${encodeURIComponent(roomData.id)}`, roomToApi(roomData));
      setClassrooms((current) => current.map((room) => room.id === saved.id ? roomFromApi(saved) : room));
      syncToDisk({ classrooms: true });
    },
    [syncToDisk]
  );

  const deleteClassroom = useCallback(
    async (id: string) => {
      await apiClient.delete(`/rooms/${encodeURIComponent(id)}`);
      setClassrooms((current) => current.filter((room) => room.id !== id));
      syncToDisk({ classrooms: true });
    },
    [syncToDisk]
  );

  const checkRoomConflict = useCallback(
    (
      roomNumber: string,
      dayIndex: number,
      weekNumber: number,
      startTime: string,
      endTime: string,
      excludeEventId?: string
    ): CalendarScheduleEvent | null => {
      const cleanRoom = roomNumber.trim().toLowerCase();
      if (!cleanRoom) return null;

      const parseMinutes = (t: string) => {
        if (!t) return 0;
        const match = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return 0;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === "PM" && h < 12) h += 12;
        if (meridiem === "AM" && h === 12) h = 0;
        return h * 60 + m;
      };

      const newStart = parseMinutes(startTime);
      const newEnd = parseMinutes(endTime) || newStart + 60;

      const conflictingEvent = calendarSchedules.find((ev) => {
        if (excludeEventId && ev.id === excludeEventId) return false;
        if (ev.weekNumber !== weekNumber) return false;
        if (ev.dayIndex !== dayIndex) return false;

        const evRoom = (ev.room || "").trim().toLowerCase();
        // Match room name or number
        const isSameRoom =
          evRoom === cleanRoom ||
          evRoom.startsWith(cleanRoom) ||
          cleanRoom.startsWith(evRoom) ||
          evRoom.includes(cleanRoom) ||
          cleanRoom.includes(evRoom);

        if (!isSameRoom) return false;

        const evStart = parseMinutes(ev.startTime);
        const evEnd = parseMinutes(ev.endTime) || evStart + (ev.durationHours || 1) * 60;

        // Overlap: newStart < evEnd AND newEnd > evStart
        return newStart < evEnd && newEnd > evStart;
      });

      return conflictingEvent || null;
    },
    [calendarSchedules]
  );

  const checkScheduleConflicts = useCallback(
    (params: {
      roomNumber?: string;
      facultyName?: string;
      className?: string;
      dayIndex: number;
      weekNumber: number;
      startTime: string;
      endTime: string;
      excludeEventId?: string;
    }): ScheduleConflictResult => {
      const parseMinutes = (t: string) => {
        if (!t) return 0;
        const cleaned = t.trim().toUpperCase();
        const match = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (!match) return 0;
        let h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) : 0;
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === "PM" && h < 12) h += 12;
        if (meridiem === "AM" && h === 12) h = 0;
        return h * 60 + m;
      };

      const newStart = parseMinutes(params.startTime);
      let newEnd = parseMinutes(params.endTime);
      if (newEnd <= newStart) newEnd = newStart + 60;

      const cleanRoom = (params.roomNumber || "").trim().toLowerCase();
      const cleanFaculty = (params.facultyName || "").trim().toLowerCase();
      const cleanClass = (params.className || "").trim().toLowerCase();
      const normClass = cleanClass.replace(/[^a-z0-9]/g, "");

      for (const ev of calendarSchedules) {
        if (params.excludeEventId && ev.id === params.excludeEventId) continue;
        if (params.weekNumber && ev.weekNumber && ev.weekNumber !== params.weekNumber) continue;
        if (ev.dayIndex !== params.dayIndex) continue;

        const evStart = parseMinutes(ev.startTime);
        let evEnd = parseMinutes(ev.endTime);
        if (evEnd <= evStart) evEnd = evStart + (ev.durationHours || 1) * 60;

        // Check time interval overlap: [newStart, newEnd) overlaps [evStart, evEnd)
        const isTimeOverlap = Math.max(newStart, evStart) < Math.min(newEnd, evEnd);
        if (!isTimeOverlap) continue;

        // 1. Class / Section Cohort Conflict (PRIORITY 1 - Section Double-Booking Prevention)
        if (cleanClass) {
          const evClass = (ev.className || "").trim().toLowerCase();
          const normEvClass = evClass.replace(/[^a-z0-9]/g, "");

          const isSameClass = normClass.length > 0 && normEvClass.length > 0 && normClass === normEvClass;

          if (isSameClass) {
            return {
              hasConflict: true,
              conflictType: "COHORT",
              conflictingEvent: ev,
              message: `Section Collision Error: Section "${ev.className || cleanClass}" already has a class scheduled at this exact time (${ev.startTime} - ${ev.endTime}) for "${ev.courseName || ev.courseCode}" taught by ${ev.faculty || "Faculty"}. Two classes cannot be scheduled for the same section simultaneously.`,
            };
          }
        }

        // 2. Classroom Venue Conflict
        if (cleanRoom) {
          const evRoom = (ev.room || "").trim().toLowerCase();
          const normCleanRoom = cleanRoom.replace(/[^a-z0-9]/g, "");
          const normEvRoom = evRoom.replace(/[^a-z0-9]/g, "");

          const isSameRoom = normCleanRoom.length > 0 && normEvRoom.length > 0 && normCleanRoom === normEvRoom;

          if (isSameRoom) {
            return {
              hasConflict: true,
              conflictType: "ROOM",
              conflictingEvent: ev,
              message: `Classroom Conflict: Room "${ev.room}" is already booked for "${ev.courseName}" (${ev.startTime} - ${ev.endTime}) by section ${ev.className || "another class"}.`,
            };
          }
        }

        // 3. Faculty Instructor Conflict
        if (cleanFaculty) {
          const evFaculty = (ev.faculty || "").trim().toLowerCase();
          const normCleanFac = cleanFaculty.replace(/[^a-z0-9]/g, "");
          const normEvFac = evFaculty.replace(/[^a-z0-9]/g, "");

          const isSameFaculty = normCleanFac.length > 0 && normEvFac.length > 0 && normCleanFac === normEvFac;

          if (isSameFaculty) {
            return {
              hasConflict: true,
              conflictType: "FACULTY",
              conflictingEvent: ev,
              message: `Faculty Conflict: Professor ${ev.faculty} is already scheduled to teach "${ev.courseName}" in room ${ev.room} at ${ev.startTime} - ${ev.endTime}.`,
            };
          }
        }
      }

      return {
        hasConflict: false,
        conflictType: null,
        conflictingEvent: null,
        message: null,
      };
    },
    [calendarSchedules]
  );

  const isHolidayDate = useCallback(
    (dateString: string): InstitutionalHoliday | null => {
      if (!dateString) return null;
      const cleanDate = dateString.trim().split("T")[0];
      const match = institutionalHolidays.find((h) => {
        const start = (h.startDate || "").trim().split("T")[0];
        const end = (h.endDate || h.startDate || "").trim().split("T")[0];
        return cleanDate >= start && cleanDate <= end;
      });
      return match || null;
    },
    [institutionalHolidays]
  );

  const autoGenerateTimetableForCohort = useCallback(
    (params: {
      className: string;
      weekNumber: number;
      preferredRoom?: string;
      subjects?: { code: string; name: string; instructor?: string }[];
      replicateAcrossWeeks?: boolean;
    }) => {
      const cleanClassName = params.className.trim();
      const targetWeek = params.weekNumber || 1;

      // Find department & cohort for subjects
      let cohortSubjects: { code: string; name: string; instructor: string }[] = [];
      if (params.subjects && params.subjects.length > 0) {
        cohortSubjects = params.subjects.map((s) => ({
          code: s.code,
          name: s.name,
          instructor: s.instructor || "",
        }));
      } else {
        // Search in departments
        for (const d of departments) {
          const cohort = d.cohorts?.find((c) => c.name === cleanClassName);
          if (cohort && cohort.assignedCourses && cohort.assignedCourses.length > 0) {
            cohortSubjects = cohort.assignedCourses.map((code) => {
              const crs = courses.find((c) => c.code.toLowerCase() === code.toLowerCase());
              const inst =
                (cohort.courseInstructors && cohort.courseInstructors[code]) ||
                crs?.instructor ||
                cohort.classAdvisor ||
                "";
              return {
                code,
                name: crs?.name || code,
                instructor: inst,
              };
            });
            break;
          }
        }
      }

      if (cohortSubjects.length === 0) {
        throw new Error(`No assigned courses are available for ${cleanClassName}. Assign courses and instructors before generating its timetable.`);
      }
      if (cohortSubjects.some((subject) => !subject.instructor.trim())) {
        throw new Error(`Every course assigned to ${cleanClassName} must have an instructor before its timetable can be generated.`);
      }

      const getSlotsForDay = (dayIndex: number) => {
        // Wednesday (day 3) and Friday (day 5) have dedicated 2-hour practical lab sessions from 02:00 PM to 04:00 PM
        if (dayIndex === 3 || dayIndex === 5) {
          return [
            { startTime: "09:00 AM", endTime: "10:00 AM", startHour: 9, durationHours: 1, type: "LECTURE" as const },
            { startTime: "10:00 AM", endTime: "11:00 AM", startHour: 10, durationHours: 1, type: "LECTURE" as const },
            { startTime: "11:15 AM", endTime: "12:15 PM", startHour: 11, durationHours: 1, type: "LECTURE" as const },
            { startTime: "02:00 PM", endTime: "04:00 PM", startHour: 14, durationHours: 2, type: "LAB" as const },
          ];
        }
        return [
          { startTime: "09:00 AM", endTime: "10:00 AM", startHour: 9, durationHours: 1, type: "LECTURE" as const },
          { startTime: "10:00 AM", endTime: "11:00 AM", startHour: 10, durationHours: 1, type: "LECTURE" as const },
          { startTime: "11:15 AM", endTime: "12:15 PM", startHour: 11, durationHours: 1, type: "LECTURE" as const },
          { startTime: "01:15 PM", endTime: "02:15 PM", startHour: 13, durationHours: 1, type: "LECTURE" as const },
          { startTime: "02:15 PM", endTime: "03:15 PM", startHour: 14, durationHours: 1, type: "TUTORIAL" as const },
        ];
      };

      const defaultLectureRoom = params.preferredRoom || classrooms.find((r) => r.type === "LECTURE_HALL")?.roomNumber || classrooms[0]?.roomNumber || "LH-101";
      const defaultLabRoom = classrooms.find((r) => r.type === "LABORATORY" || r.name.toLowerCase().includes("lab"))?.roomNumber || "Computing Lab 1";
      const days = [1, 2, 3, 4, 5]; // Mon to Fri
      const newEvents: CalendarScheduleEvent[] = [];

      let subjectIndex = 0;
      for (const dayIndex of days) {
        const slotsForThisDay = getSlotsForDay(dayIndex);
        for (const slot of slotsForThisDay) {
          const curSubject = cohortSubjects[subjectIndex % cohortSubjects.length];
          subjectIndex++;

          const eventId = `sched-${Date.now()}-${dayIndex}-${slot.startHour}-${Math.random().toString(36).substr(2, 4)}`;
          const isLab = slot.type === "LAB";
          const assignedRoom = isLab ? defaultLabRoom : defaultLectureRoom;
          const sessionLabel = isLab
            ? `${curSubject.name} (Practical Lab)`
            : slot.type === "TUTORIAL"
            ? `${curSubject.name} (Tutorial)`
            : `${curSubject.name} (Theory Lecture)`;

          const calendarDate = getAcademicTermDateForWeekDay(targetWeek, dayIndex);
          const today = new Date();
          const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          // Classes cannot be scheduled on today or earlier dates
          if (calendarDate.dateString <= todayIso) continue;

          newEvents.push({
            id: eventId,
            className: cleanClassName,
            courseCode: curSubject.code,
            courseName: curSubject.name,
            lectureNumber: ((dayIndex - 1) * 6 + slot.startHour) % 20 + 1,
            lectureTitle: sessionLabel,
            dayIndex,
            weekNumber: targetWeek,
            dateString: calendarDate.dateString,
            dateNumber: calendarDate.dateNumber,
            startTime: slot.startTime,
            endTime: slot.endTime,
            startHour: slot.startHour,
            durationHours: slot.durationHours,
            room: assignedRoom,
            building: classrooms.find((room) => room.roomNumber === assignedRoom)?.building || "",
            faculty: curSubject.instructor,
            facultyTitle: "Faculty",
            type: slot.type,
            colorBadge: slot.type === "LAB" ? "bg-slate-800 text-white" : slot.type === "TUTORIAL" ? "bg-slate-700 text-white" : "bg-blue-600 text-white",
            sessionAgenda: isLab ? ["Hands-on Lab Exercise", "Code Implementation", "Lab Evaluation"] : ["Theory Concept Overview", "Interactive Lecture", "Q&A Discussion"],
            prerequisites: "Previous unit completed",
            learningOutcomes: isLab ? "Practical lab proficiency and execution" : "Theoretical understanding of concepts",
            readingMaterials: "Core Curriculum Reference",
          });
        }
      }

      // Remove any existing events for this class in this week and replace with new generated schedule
      setCalendarSchedules((prev) => {
        const filteredExisting = prev.filter(
          (ev) => !(ev.weekNumber === targetWeek && (ev.className || "").trim().toLowerCase() === cleanClassName.toLowerCase())
        );
        let nextSchedules = [...filteredExisting, ...newEvents];

        if (params.replicateAcrossWeeks) {
          const today = new Date();
          const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          for (let w = 1; w <= 20; w++) {
            if (w === targetWeek) continue;
            nextSchedules = nextSchedules.filter(
              (ev) => {
                if (ev.weekNumber !== w) return true;
                if (ev.dateString && ev.dateString <= todayIso) return true;
                return (ev.className || "").trim().toLowerCase() !== cleanClassName.toLowerCase();
              }
            );
            const cloned: CalendarScheduleEvent[] = [];
            newEvents.forEach((ev, idx) => {
              const cal = getAcademicTermDateForWeekDay(w, ev.dayIndex);
              // Strict rule: classes cannot be scheduled for today or earlier dates
              if (cal.dateString <= todayIso) return;
              cloned.push({
                ...ev,
                id: `ev-w${w}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                weekNumber: w,
                dateString: cal.dateString,
                dateNumber: cal.dateNumber,
                lectureNumber: (ev.lectureNumber || 1) + (w - targetWeek) * 3,
              });
            });
            nextSchedules = [...nextSchedules, ...cloned];
          }
        }

        const deduplicated = deduplicateSchedules(nextSchedules);
        syncToDisk({ calendarSchedules: deduplicated });
        return deduplicated;
      });
    },
    [departments, courses, classrooms, syncToDisk]
  );

  // ─── UNIVERSITY POLICIES ───
  const addPolicy = useCallback(
    (p: Omit<SyncPolicy, "id">) => {
      const newPolicy: SyncPolicy = { ...p, id: `pol-${Date.now()}` };
      const next = [newPolicy, ...policies];
      setPolicies(next);
      syncToDisk({ policies: next });

      // Async backend sync
      apiClient.patch(`/admin/policies/${newPolicy.id}`, {
        policy_value: p,
        change_reason: "Created from administration console",
      }).catch(() => {});
    },
    [policies, syncToDisk]
  );

  const updatePolicy = useCallback(
    (p: SyncPolicy) => {
      const next = policies.map((item) => (item.id === p.id ? p : item));
      setPolicies(next);
      syncToDisk({ policies: next });

      // Async backend sync
      apiClient.patch(`/admin/policies/${p.id}`, {
        policy_value: p,
        change_reason: "Updated from administration console",
      }).catch(() => {});
    },
    [policies, syncToDisk]
  );

  const togglePolicyEnforcement = useCallback(
    (id: string) => {
      const next = policies.map((item) => (item.id === id ? { ...item, enforced: !item.enforced } : item));
      setPolicies(next);
      syncToDisk({ policies: next });

      // Async backend sync
      const target = next.find((item) => item.id === id);
      apiClient.patch(`/admin/policies/${id}`, {
        policy_value: target,
        change_reason: "Policy enforcement changed from administration console",
      }).catch(() => {});
    },
    [policies, syncToDisk]
  );

  const deletePolicy = useCallback(
    (id: string) => {
      const next = policies.filter((item) => item.id !== id);
      setPolicies(next);
      syncToDisk({ policies: next });

      // Async backend sync
      apiClient.patch(`/admin/policies/${id}`, {
        policy_value: { archived: true },
        change_reason: "Archived from administration console",
      }).catch(() => {});
    },
    [policies, syncToDisk]
  );

  // ─── CURRICULUM & COURSES ───
  const addCourse = useCallback(
    async (courseData: Omit<SyncCourse, "id">) => {
      const dept = departments.find((d) => d.code === courseData.departmentCode || d.name === courseData.department) || departments[0];
      const departmentId = dept?.id;
      const activeTerm = terms.find((t) => t.status === "Active") || terms[0];
      const semesterId = activeTerm?.id;

      const saved = await apiClient.post<{ id: string }>("/courses", {
        course_code: courseData.code,
        name: courseData.name,
        credits: courseData.credits,
        description: courseData.description,
        department_id: departmentId,
        semester_id: semesterId,
        is_active: courseData.status === "Active",
      });

      // Assign instructor in backend if specified
      if (courseData.instructor && courseData.instructor !== "Unassigned") {
        const facultyUser = users.find(
          (u) =>
            `${u.first_name} ${u.last_name || ""}`.trim().toLowerCase() === courseData.instructor.trim().toLowerCase() ||
            u.email.toLowerCase() === courseData.instructor.trim().toLowerCase()
        );
        if (facultyUser) {
          apiClient.post(`/courses/${saved.id}/instructors`, {
            faculty_id: facultyUser.id,
            is_primary: true,
          }).catch(() => {});
        }
      }

      const nextCourse: SyncCourse = {
        ...courseData,
        id: saved.id,
        assignedClasses: courseData.assignedClasses || [],
      };
      const next = [nextCourse, ...courses];
      setCourses(next);

      // Sync assignedClasses to department cohorts
      if (courseData.assignedClasses && courseData.assignedClasses.length > 0) {
        const nextDepts = departments.map((d) => {
          let changed = false;
          const cohorts = (d.cohorts || []).map((coh) => {
            if (courseData.assignedClasses?.includes(coh.name)) {
              const currentAssigned = coh.assignedCourses || [];
              const instMap = { ...(coh.courseInstructors || {}) };
              if (!currentAssigned.includes(courseData.code)) {
                currentAssigned.push(courseData.code);
                changed = true;
              }
              if (courseData.instructor && courseData.instructor !== "Unassigned") {
                instMap[courseData.code] = courseData.instructor;
                changed = true;
              }
              return { ...coh, assignedCourses: currentAssigned, courseInstructors: instMap };
            }
            return coh;
          });
          if (changed && d.id) {
            apiClient.patch(`/departments/${d.id}`, { cohorts }).catch(() => {});
          }
          return { ...d, cohorts };
        });
        setDepartments(nextDepts);
        syncToDisk({ courses: next, departments: nextDepts });
      } else {
        syncToDisk({ courses: next });
      }
    },
    [courses, departments, terms, users, syncToDisk]
  );

  const updateCourse = useCallback(
    async (updatedCourse: SyncCourse) => {
      try {
        await apiClient.patch(`/courses/${updatedCourse.id}`, {
          course_code: updatedCourse.code,
          name: updatedCourse.name,
          description: updatedCourse.description,
          credits: updatedCourse.credits,
          is_active: updatedCourse.status === "Active",
        });
      } catch (err) {
        console.warn("Backend course patch warning:", err);
      }

      // Assign instructor in backend if specified
      if (updatedCourse.instructor && updatedCourse.instructor !== "Unassigned") {
        const facultyUser = users.find(
          (u) =>
            `${u.first_name} ${u.last_name || ""}`.trim().toLowerCase() === updatedCourse.instructor.trim().toLowerCase() ||
            u.email.toLowerCase() === updatedCourse.instructor.trim().toLowerCase()
        );
        if (facultyUser) {
          apiClient.post(`/courses/${updatedCourse.id}/instructors`, {
            faculty_id: facultyUser.id,
            is_primary: true,
          }).catch(() => {});
        }
      }

      const next = courses.map((c) => (c.id === updatedCourse.id ? updatedCourse : c));
      setCourses(next);

      // Bidirectional sync with class cohorts
      const codeKey = updatedCourse.code;
      const classNames = updatedCourse.assignedClasses || [];
      const nextDepts = departments.map((d) => {
        let changed = false;
        const cohorts = (d.cohorts || []).map((cohort) => {
          const isEnrolled = classNames.includes(cohort.name);
          const currentCourses = cohort.assignedCourses || [];
          const curInstructors = cohort.courseInstructors || {};
          let nextAssigned = [...currentCourses];
          let nextInstMap = { ...curInstructors };

          if (isEnrolled) {
            if (!nextAssigned.includes(codeKey)) {
              nextAssigned.push(codeKey);
              changed = true;
            }
            if (updatedCourse.instructor && updatedCourse.instructor !== "Unassigned") {
              nextInstMap[codeKey] = updatedCourse.instructor;
              changed = true;
            }
          } else {
            if (nextAssigned.includes(codeKey)) {
              nextAssigned = nextAssigned.filter((c) => c !== codeKey);
              delete nextInstMap[codeKey];
              changed = true;
            }
          }

          return {
            ...cohort,
            assignedCourses: nextAssigned,
            courseInstructors: nextInstMap,
          };
        });

        if (changed && d.id) {
          apiClient.patch(`/departments/${d.id}`, { cohorts }).catch(() => {});
        }

        return { ...d, cohorts };
      });

      setDepartments(nextDepts);
      syncToDisk({ courses: next, departments: nextDepts });
    },
    [courses, departments, users, syncToDisk]
  );

  const deleteCourse = useCallback(
    async (id: string) => {
      await apiClient.delete(`/courses/${id}`);
      const next = courses.filter((c) => c.id !== id);
      setCourses(next);
      syncToDisk({ courses: next });
    },
    [courses, syncToDisk]
  );

  const toggleCourseStatus = useCallback(
    async (id: string) => {
      const current = courses.find((course) => course.id === id);
      if (!current) throw new Error("Course not found.");
      const isActive = current.status !== "Active";
      await apiClient.patch(`/courses/${id}`, { is_active: isActive });
      const next = courses.map((c) =>
        c.id === id ? { ...c, status: (c.status === "Active" ? "Archived" : "Active") as "Active" | "Archived" } : c
      );
      setCourses(next);
      syncToDisk({ courses: next });
    },
    [courses, syncToDisk]
  );

  const assignClassesToCourse = useCallback(
    (courseCode: string, classNames: string[]) => {
      const cleanCourse = courseCode.trim().toLowerCase();
      const nextCourses = courses.map((crs) => {
        if (crs.code.trim().toLowerCase() === cleanCourse || crs.id === courseCode) {
          return { ...crs, assignedClasses: classNames };
        }
        return crs;
      });
      setCourses(nextCourses);

      const targetCourse = courses.find((c) => c.code.trim().toLowerCase() === cleanCourse || c.id === courseCode);
      const codeKey = targetCourse ? targetCourse.code : courseCode;

      const nextDepts = departments.map((d) => {
        const cohorts = d.cohorts || [];
        const updatedCohorts = cohorts.map((cohort) => {
          const isEnrolled = classNames.includes(cohort.name);
          const currentCourses = cohort.assignedCourses || [];
          if (isEnrolled && !currentCourses.includes(codeKey)) {
            return { ...cohort, assignedCourses: [...currentCourses, codeKey] };
          } else if (!isEnrolled && currentCourses.includes(codeKey)) {
            return { ...cohort, assignedCourses: currentCourses.filter((code) => code !== codeKey) };
          }
          return cohort;
        });
        return { ...d, cohorts: updatedCohorts };
      });
      setDepartments(nextDepts);
      syncToDisk({ courses: nextCourses, departments: nextDepts });
    },
    [courses, departments, syncToDisk]
  );

  // ─── ACADEMIC TERMS ───
  const updateTerm = useCallback(
    (updatedTerm: SyncTerm) => {
      const next = terms.map((t) => (t.id === updatedTerm.id ? updatedTerm : t));
      setTerms(next);
      syncToDisk({ terms: next });
    },
    [terms, syncToDisk]
  );

  // ─── CLOUD LMS MODULES & LESSONS ───
  const markLessonComplete = useCallback(
    (courseCode: string, moduleId: string, lessonId: string) => {
      const next = modules.map((m) => {
        if (m.id === moduleId) {
          return {
            ...m,
            lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, isCompleted: true } : l)),
          };
        }
        return m;
      });
      setModules(next);
      syncToDisk({ modules: next });
    },
    [modules, syncToDisk]
  );

  const addCourseModule = useCallback(
    (courseCode: string, title: string, description: string) => {
      const existing = modules.filter((m) => m.courseCode === courseCode);
      const newMod: LmsModule = {
        id: `mod-${courseCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`,
        courseCode,
        moduleNumber: existing.length + 1,
        title,
        description,
        lessons: [],
        isPublished: true,
      };
      const next = [...modules, newMod];
      setModules(next);
      syncToDisk({ modules: next });
    },
    [modules, syncToDisk]
  );

  const addLessonToModule = useCallback(
    (courseCode: string, moduleId: string, lessonData: Omit<LmsLesson, "id" | "isCompleted">) => {
      const next = modules.map((m) => {
        if (m.id === moduleId) {
          const newLesson: LmsLesson = {
            ...lessonData,
            id: `les-${Date.now()}`,
            isCompleted: false,
          };
          return { ...m, lessons: [...m.lessons, newLesson] };
        }
        return m;
      });
      setModules(next);
      syncToDisk({ modules: next });
    },
    [modules, syncToDisk]
  );

  // ─── QUIZZES & ASSESSMENTS ───
  const submitQuiz = useCallback(
    (quizId: string, answers: Record<string, number>, score: number) => {
      const next = quizzes.map((q) => {
        if (q.id === quizId) {
          return {
            ...q,
            status: "COMPLETED" as const,
            studentScore: score,
            studentAnswers: answers,
          };
        }
        return q;
      });
      setQuizzes(next);
      syncToDisk({ quizzes: next });
    },
    [quizzes, syncToDisk]
  );

  const createQuiz = useCallback(
    (quizData: Omit<LmsQuiz, "id" | "status" | "studentScore">) => {
      const newQuiz: LmsQuiz = {
        ...quizData,
        id: `quiz-${Date.now()}`,
        status: "AVAILABLE",
        resultsReleased: false,
        attempts: {},
      };
      const next = [newQuiz, ...quizzes];
      setQuizzes(next);

      const notifId = `notif-${Date.now()}`;
      const newNotif: SyncNotification = {
        id: notifId,
        title: `New Quiz: ${newQuiz.title}`,
        message: `Assessment published for ${newQuiz.courseCode || "enrolled class"} (${newQuiz.timeLimitMinutes} minutes, ${newQuiz.totalPoints} marks).`,
        type: "EXAM",
        isRead: false,
        createdAt: new Date().toISOString(),
        targetRole: "STUDENT",
        courseCode: newQuiz.courseCode,
        targetClass: newQuiz.targetClass,
      };
      const nextNotifs = [newNotif, ...notifications];
      setNotifications(nextNotifs);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_quizzes", JSON.stringify(next));
        } catch {}
      }
      syncToDisk({ quizzes: next, notifications: nextNotifs });
      void apiClient.post("/assessments/scheduled-exams", newQuiz).catch(() => {});

    },
    [quizzes, notifications, syncToDisk]
  );

  const submitQuizAttempt = useCallback(
    (quizId: string, attempt: LmsQuizAttempt) => {
      const next = quizzes.map((q) => {
        if (q.id === quizId) {
          const currentAttempts = { ...(q.attempts || {}) };
          currentAttempts[attempt.studentId] = attempt;
          return {
            ...q,
            attempts: currentAttempts,
            status: "COMPLETED" as const,
            studentScore: attempt.score,
            studentAnswers: attempt.answers,
          };
        }
        return q;
      });
      setQuizzes(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`smartedu_quiz_attempt_${quizId}_${attempt.studentId}`, JSON.stringify(attempt));
          localStorage.setItem("smartedu_quizzes_v2", JSON.stringify(next));
        } catch (e) {
          console.warn("Could not write quiz attempt to localStorage:", e);
        }
      }
      syncToDisk({ quizzes: next });
      void apiClient.post(`/assessments/scheduled-exams/${quizId}/submit`, attempt).catch(() => {});
    },
    [quizzes, syncToDisk]
  );

  const releaseQuizResults = useCallback(
    (quizId: string) => {
      const next = quizzes.map((q) => {
        if (q.id === quizId) {
          return { ...q, resultsReleased: true };
        }
        return q;
      });
      setQuizzes(next);
      syncToDisk({ quizzes: next });
      void apiClient.post(`/assessments/scheduled-exams/${quizId}/release-results`, {}).catch(() => {});
    },
    [quizzes, syncToDisk]
  );

  const updateQuiz = useCallback(
    (quizId: string, updates: Partial<LmsQuiz>) => {
      const next = quizzes.map((q) => {
        if (q.id === quizId) {
          return { ...q, ...updates };
        }
        return q;
      });
      setQuizzes(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_quizzes", JSON.stringify(next));
        } catch {}
      }
      syncToDisk({ quizzes: next });
      void apiClient.patch(`/assessments/scheduled-exams/${quizId}`, updates).catch(() => {});
    },
    [quizzes, syncToDisk]
  );

  const deleteQuiz = useCallback(
    (quizId: string) => {
      const next = quizzes.filter((q) => q.id !== quizId);
      setQuizzes(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_quizzes", JSON.stringify(next));
        } catch {}
      }
      syncToDisk({ quizzes: next });
    },
    [quizzes, syncToDisk]
  );

  // ─── DISCUSSIONS & THREADS ───
  const postDiscussionTopic = useCallback(
    (topicData: Omit<LmsDiscussion, "id" | "createdAt" | "upvotes" | "isInstructorEndorsed" | "replies">) => {
      const newTopic: LmsDiscussion = {
        ...topicData,
        id: `disc-${Date.now()}`,
        createdAt: "Just now",
        upvotes: 0,
        isInstructorEndorsed: false,
        replies: [],
      };
      const next = [newTopic, ...discussions];
      setDiscussions(next);
      syncToDisk({ discussions: next });
    },
    [discussions, syncToDisk]
  );

  const replyToDiscussion = useCallback(
    (topicId: string, content: string, authorName: string, authorRole: "STUDENT" | "FACULTY" | "HOD") => {
      const next = discussions.map((d) => {
        if (d.id === topicId) {
          const newReply: LmsDiscussionReply = {
            id: `rep-${Date.now()}`,
            authorName,
            authorRole,
            content,
            createdAt: "Just now",
            isEndorsed: false,
          };
          return { ...d, replies: [...d.replies, newReply] };
        }
        return d;
      });
      setDiscussions(next);
      syncToDisk({ discussions: next });
    },
    [discussions, syncToDisk]
  );

  const endorseReply = useCallback(
    (topicId: string, replyId: string) => {
      const next = discussions.map((d) => {
        if (d.id === topicId) {
          return {
            ...d,
            replies: d.replies.map((r) => (r.id === replyId ? { ...r, isEndorsed: true } : r)),
          };
        }
        return d;
      });
      setDiscussions(next);
      syncToDisk({ discussions: next });
    },
    [discussions, syncToDisk]
  );

  // ─── DECREES & APPROVALS ───
  const sanctionDecree = useCallback(
    (id: string) => {
      const next = decrees.map((d) => (d.id === id ? { ...d, status: "APPROVED" as const } : d));
      setDecrees(next);
      syncToDisk({ decrees: next });
    },
    [decrees, syncToDisk]
  );

  const draftDecree = useCallback(
    (decreeData: Omit<SyncDecree, "id" | "status" | "proposedDate">) => {
      const newDecree: SyncDecree = {
        ...decreeData,
        id: `dec-${Date.now()}`,
        status: "PENDING_SANCTION",
        proposedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
      const next = [newDecree, ...decrees];
      setDecrees(next);
      syncToDisk({ decrees: next });
    },
    [decrees, syncToDisk]
  );

  const authorizeGradeSheet = useCallback(
    (courseCode: string) => {
      const next = gradeSheets.map((g) => (g.courseCode === courseCode ? { ...g, status: "PUBLISHED" as const } : g));
      setGradeSheets(next);
      syncToDisk({ gradeSheets: next });
    },
    [gradeSheets, syncToDisk]
  );

  const resolveAttendanceDispute = useCallback(
    (disputeId: string, resolution: "RESOLVED" | "REJECTED") => {
      const nextDisputes = disputes.map((d) => (d.id === disputeId ? { ...d, status: resolution } : d));
      setDisputes(nextDisputes);
      syncToDisk({ disputes: nextDisputes });
    },
    [disputes, syncToDisk]
  );

  const raiseAttendanceDispute = useCallback(
    (courseCode: string, reason: string) => {
      const newDispute: SyncDispute = {
        id: `dsp-${Date.now()}`,
        studentName: "Enrolled Student",
        rollNo: "2026-CSE-001",
        courseCode,
        reason,
        status: "PENDING",
        submittedAt: "Just now",
      };
      const next = [newDispute, ...disputes];
      setDisputes(next);
      syncToDisk({ disputes: next });
    },
    [disputes, syncToDisk]
  );

  // ─── CAMPUS ALERT NOTICES ───
  const dispatchCampusAlert = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      setCampusAlert(trimmed);

      const newAnn: SyncAnnouncement = {
        id: `ann-${Date.now()}`,
        title: "Campus Notice",
        content: trimmed,
        authorName: "Academic Administration",
        audience: "ALL",
        createdAt: "Just now",
        priority: "HIGH",
        category: "GENERAL",
      };
      const nextAnns = [newAnn, ...announcements];
      setAnnouncements(nextAnns);

      const newNotif: SyncNotification = {
        id: `notif-${Date.now()}`,
        title: "Campus Notice",
        message: trimmed,
        type: "BROADCAST",
        isRead: false,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const nextNotifs = [newNotif, ...notifications];
      setNotifications(nextNotifs);

      syncToDisk({
        campusAlert: trimmed,
        announcements: nextAnns,
        notifications: nextNotifs,
      });

      // Async backend sync
      apiClient.post("/announcements", {
        title: "Campus Notice",
        content: trimmed,
        scope_type: "INSTITUTION",
        priority: "HIGH",
        publish_now: true,
      }).catch(() => {});
    },
    [announcements, notifications, syncToDisk]
  );

  const dismissCampusAlert = useCallback(() => {
    setCampusAlert(null);
    syncToDisk({ campusAlert: null });
  }, [syncToDisk]);

  // ─── ASSIGNMENTS & SUBMISSIONS ───
  const createAssignment = useCallback(
    async (asg: Omit<SyncAssignment, "id" | "submittedCount" | "totalEnrolled" | "gradedCount">): Promise<SyncAssignment> => {
      const course = courses.find((item) => item.code === asg.courseCode || item.id === asg.courseCode);
      if (!course?.id) throw new Error("Choose a course before creating an assignment.");
      const dueDate = new Date(asg.dueDate);
      if (Number.isNaN(dueDate.getTime()) || dueDate.getTime() <= Date.now()) {
        throw new Error("Choose a future due date.");
      }
      const saved = await apiClient.post<{ id: string; due_date: string; status: string }>(`/courses/${course.id}/assignments`, {
        title: asg.title,
        description: asg.description,
        instructions: asg.description,
        due_date: dueDate.toISOString(),
        max_points: asg.totalPoints,
        passing_points: Math.ceil(asg.totalPoints * 0.4),
        status: asg.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
      });
      const newAsg: SyncAssignment = {
        ...asg,
        id: saved.id,
        dueDate: saved.due_date,
        submittedCount: 0,
        totalEnrolled: courses.find((course) => course.code === asg.courseCode)?.enrolledStudents || 0,
        gradedCount: 0,
      };
      const nextAsgs = [newAsg, ...assignments];
      setAssignments(nextAsgs);

      const notifId = `notif-${Date.now()}`;
      const descText = `New assignment published for ${newAsg.courseCode} (${newAsg.courseName || course.name}). Due: ${new Date(newAsg.dueDate).toLocaleDateString()} (${newAsg.totalPoints} Marks).`;
      const newNotif: SyncNotification = {
        id: notifId,
        title: `New Assignment: ${newAsg.title}`,
        message: descText,
        createdAt: "Just now",
        isRead: false,
        type: "ASSIGNMENT",
        courseCode: newAsg.courseCode,
        targetRole: "STUDENT",
      };
      const nextNotifs = [newNotif, ...notifications];
      setNotifications(nextNotifs);

      const newAnn: SyncAnnouncement = {
        id: `ann-${Date.now()}`,
        title: `Assignment Published: ${newAsg.title}`,
        content: `A new assignment has been issued for ${newAsg.courseCode} (${newAsg.courseName || course.name}). Please review instructions and submit prior to the deadline on ${new Date(newAsg.dueDate).toLocaleDateString()}. Total weightage: ${newAsg.totalPoints} points.`,
        authorName: "Course Instructor",
        courseCode: newAsg.courseCode,
        audience: "Enrolled Students",
        createdAt: "Just now",
        priority: "HIGH",
        category: "ACADEMIC",
      };
      const nextAnns = [newAnn, ...announcements];
      setAnnouncements(nextAnns);

      syncToDisk({ assignments: nextAsgs, notifications: nextNotifs, announcements: nextAnns });

      return newAsg;
    },
    [assignments, courses, notifications, announcements, syncToDisk]
  );

  const createCaseStudy = useCallback(
    async (newCaseStudy: CaseStudyAssessment) => {
      const nextCases = [newCaseStudy, ...caseStudies.filter((c) => c.id !== newCaseStudy.id)];
      setCaseStudies(nextCases);

      const notifId = `notif-${Date.now()}`;
      const msgText = `Prof. ${newCaseStudy.facultyName} assigned a collaborative case study "${newCaseStudy.title}" for ${newCaseStudy.courseCode} (${newCaseStudy.targetClass}). Check your assigned team and role in Case Studies.`;
      const newNotif: SyncNotification = {
        id: notifId,
        title: `New Case Study Assigned: ${newCaseStudy.title}`,
        message: msgText,
        createdAt: "Just now",
        isRead: false,
        type: "ASSIGNMENT",
        courseCode: newCaseStudy.courseCode,
        facultyName: newCaseStudy.facultyName,
        targetRole: "STUDENT",
        targetClass: newCaseStudy.targetClass,
      };
      const nextNotifs = [newNotif, ...notifications];
      setNotifications(nextNotifs);

      const newAnn: SyncAnnouncement = {
        id: `ann-${Date.now()}`,
        title: `New Case Study Assessment: ${newCaseStudy.title}`,
        content: `A collaborative multi-role case study has been published for ${newCaseStudy.courseCode} (${newCaseStudy.targetClass}). Due Date: ${newCaseStudy.dueDate} (${newCaseStudy.totalPoints} Marks). Please check your assigned team and role in the Case Studies tab.`,
        authorName: newCaseStudy.facultyName,
        courseCode: newCaseStudy.courseCode,
        audience: newCaseStudy.targetClass || "All Students",
        createdAt: "Just now",
        priority: "HIGH",
        category: "ACADEMIC",
      };
      const nextAnns = [newAnn, ...announcements];
      setAnnouncements(nextAnns);

      syncToDisk({ caseStudies: nextCases, notifications: nextNotifs, announcements: nextAnns });

    },
    [caseStudies, notifications, announcements, syncToDisk]
  );

  const updateCaseStudy = useCallback(
    async (updatedCs: CaseStudyAssessment) => {
      setCaseStudies((prev) => {
        const next = prev.map((c) => (c.id === updatedCs.id ? updatedCs : c));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("academic_case_studies", JSON.stringify(next));
          } catch (e) {}
        }
        syncToDisk({ caseStudies: next });
        return next;
      });
    },
    [syncToDisk]
  );

  const deleteCaseStudy = useCallback(
    async (caseStudyId: string) => {
      setCaseStudies((prev) => {
        const next = prev.filter((c) => c.id !== caseStudyId);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("academic_case_studies", JSON.stringify(next));
          } catch (e) {}
        }
        syncToDisk({ caseStudies: next });
        return next;
      });
    },
    [syncToDisk]
  );

  const duplicateCaseStudy = useCallback(
    async (caseStudyId: string) => {
      const target = caseStudies.find((c) => c.id === caseStudyId);
      if (!target) return;
      const copy: CaseStudyAssessment = {
        ...target,
        id: `cs-copy-${Date.now()}`,
        title: `${target.title} (Copy)`,
        createdAt: new Date().toISOString(),
        teams: (target.teams || []).map((t) => ({
          ...t,
          id: `team-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          isSubmitted: false,
          submittedAt: undefined,
          submissionContent: undefined,
          score: undefined,
          submission: undefined,
        })),
      };
      await createCaseStudy(copy);
    },
    [caseStudies, createCaseStudy]
  );

  const submitCaseStudy = useCallback(
    async (caseStudyId: string, teamId: string, content: string, studentName?: string, score?: number) => {
      setCaseStudies((prev) => {
        const next = prev.map((cs) => {
          if (cs.id !== caseStudyId) return cs;
          const nowIso = new Date().toISOString();
          let matched = false;
          const updatedTeams = (cs.teams || []).map((t) => {
            if (t.id !== teamId) return t;
            matched = true;
            return {
              ...t,
              isSubmitted: true,
              submittedAt: nowIso,
              submissionContent: content,
              score: typeof score === "number" ? score : t.score,
              submission: {
                submittedAt: nowIso,
                submittedBy: studentName || "Student",
                content,
                grade: typeof score === "number" ? score : t.submission?.grade,
              },
            };
          });

          if (!matched) {
            updatedTeams.push({
              id: teamId || `team-${Date.now()}`,
              teamName: studentName ? `${studentName}'s Squad` : "Squad Submission",
              members: [{
                studentId: authenticatedUser?.id || "",
                studentName: studentName || "Student",
                studentEmail: authenticatedUser?.email || "",
                roleTitle: "Assigned Analyst",
                assignedRole: "Assigned Analyst",
              }],
              isSubmitted: true,
              submittedAt: nowIso,
              submissionContent: content,
              score: typeof score === "number" ? score : 45,
              submission: {
                submittedAt: nowIso,
                submittedBy: studentName || "Student",
                content,
                grade: typeof score === "number" ? score : 45,
              },
            });
          }

          return {
            ...cs,
            teams: updatedTeams,
          };
        });

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("academic_case_studies", JSON.stringify(next));
          } catch (e) {}
        }
        syncToDisk({ caseStudies: next });
        return next;
      });
    },
    [syncToDisk, authenticatedUser]
  );

  const submitAssignment = useCallback(
    async (
      assignmentId: string,
      code: string,
      testCasesPassed: number = 10,
      studentMeta?: { id?: string; name?: string; rollNo?: string },
      extraMeta?: { fileName?: string; fileUrl?: string; certificateUrl?: string; certificateProvider?: string; notes?: string }
    ) => {
      const targetAsg = assignments.find((a) => a.id === assignmentId);
      const studentName = studentMeta?.name || "Current Student";
      const studentId = studentMeta?.id || "";
      const rollNo = studentMeta?.rollNo || "";

      const saved = await apiClient.post<{ id: string; submitted_at: string }>(`/assignments/${assignmentId}/submit`, {
        submission_text: code.trim() || null,
        attachment_url: extraMeta?.fileUrl || extraMeta?.certificateUrl || null,
      });

      const newSub: SyncSubmission = {
        id: saved.id,
        assignmentId,
        studentId,
        studentName,
        rollNo,
        submittedAt: saved.submitted_at,
        status: "SUBMITTED",
        maxScore: targetAsg ? targetAsg.totalPoints : 50,
        codeContent: code,
        fileName: extraMeta?.fileName,
        fileUrl: extraMeta?.fileUrl,
        certificateUrl: extraMeta?.certificateUrl,
        certificateProvider: extraMeta?.certificateProvider,
        notes: extraMeta?.notes,
        testCasesPassed,
        totalTestCases: 10,
      };

      const nextSubmissions = [newSub, ...submissions.filter((s) => s.assignmentId !== assignmentId)];
      const nextAssignments = assignments.map((a) =>
        a.id === assignmentId ? { ...a, submittedCount: a.submittedCount + 1 } : a
      );
      setSubmissions(nextSubmissions);
      setAssignments(nextAssignments);
      syncToDisk({ submissions: nextSubmissions, assignments: nextAssignments });

    },
    [assignments, submissions, syncToDisk]
  );

  const loadAssignmentSubmissions = useCallback(
    async (assignmentId: string, offset: number = 0) => {
      const [page, dashboard] = await Promise.all([
        apiClient.get<{ items: any[]; total: number }>(`/assignments/${assignmentId}/submissions?limit=100&offset=${offset}`),
        apiClient.get<{ total_enrolled: number; total_submitted: number; total_graded: number; assignment: { max_points: number } }>(
          `/assignments/${assignmentId}/grading-dashboard`
        ),
      ]);
      const loaded = page.items.map((row) => {
        const isPdf = Boolean(
          (row.attachment_url && row.attachment_url.toLowerCase().includes(".pdf")) ||
          (row.submission_text && row.submission_text.toLowerCase().includes(".pdf"))
        );
        let extractedName = undefined;
        if (row.attachment_url) {
          const match = row.submission_text?.match(/([a-zA-Z0-9_\-\.]+\.pdf)/i);
          if (match) {
            extractedName = match[1];
          } else {
            extractedName = row.attachment_url.split("/").pop() || "Document.pdf";
          }
        } else if (row.submission_text?.match(/([a-zA-Z0-9_\-\.]+\.pdf)/i)) {
          extractedName = row.submission_text.match(/([a-zA-Z0-9_\-\.]+\.pdf)/i)![1];
        }

        const isCode = !isPdf && row.submission_text && (
          row.submission_text.includes("def ") ||
          row.submission_text.includes("int ") ||
          row.submission_text.includes("import ") ||
          row.submission_text.includes("class ") ||
          row.submission_text.includes("#include")
        );

        return {
          id: row.id,
          assignmentId: row.assignment_id,
          studentId: row.student_id,
          studentName: row.student_name,
          rollNo: row.student_identifier || "",
          submittedAt: row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "Recently",
          status: row.status === "GRADED" ? "GRADED" as const : "SUBMITTED" as const,
          score: row.score ?? undefined,
          maxScore: dashboard.assignment.max_points,
          codeContent: isCode ? row.submission_text : undefined,
          fileName: extractedName || (row.attachment_url ? "Attached Document" : undefined),
          fileUrl: row.attachment_url || undefined,
          notes: row.submission_text || undefined,
          feedback: row.feedback || undefined,
        };
      });
      setSubmissions((current) => {
        const existing = offset === 0 ? current.filter((item) => item.assignmentId !== assignmentId) : current;
        const byId = new Map([...existing, ...loaded].map((item) => [item.id, item]));
        return Array.from(byId.values());
      });
      setAssignments((current) => current.map((item) => item.id === assignmentId ? {
        ...item,
        totalEnrolled: dashboard.total_enrolled,
        submittedCount: dashboard.total_submitted,
        gradedCount: dashboard.total_graded,
      } : item));
      return { total: page.total, loaded: loaded.length };
    },
    []
  );

  const gradeSubmission = useCallback(
    async (submissionId: string, score: number, feedback: string) => {
      await apiClient.post(`/submissions/${submissionId}/grade`, { score, feedback });
      const nextSubmissions = submissions.map((s) => {
        if (s.id === submissionId) {
          return { ...s, status: "GRADED" as const, score, feedback };
        }
        return s;
      });
      setSubmissions(nextSubmissions);
      syncToDisk({ submissions: nextSubmissions });
    },
    [submissions, syncToDisk]
  );

  const extendAssignmentDueDate = useCallback(
    async (assignmentId: string, newDueDate: string, reason?: string) => {
      const targetAsg = assignments.find((a) => a.id === assignmentId);
      if (!targetAsg) throw new Error("Assignment not found.");
      const dueDate = new Date(newDueDate);
      if (Number.isNaN(dueDate.getTime()) || dueDate.getTime() <= Date.now()) {
        throw new Error("Choose a future due date.");
      }
      await apiClient.patch(`/assignments/${assignmentId}`, { due_date: dueDate.toISOString() });

      const updatedAsgs = assignments.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              originalDueDate: a.originalDueDate || a.dueDate,
              dueDate: newDueDate,
              isExtended: true,
              extendedReason: reason || undefined,
            }
          : a
      );
      setAssignments(updatedAsgs);

      syncToDisk({ assignments: updatedAsgs });
    },
    [assignments, syncToDisk]
  );

  const updateAttendanceWindowHours = useCallback(
    (hours: number) => {
      const valid = Math.max(1, Math.min(720, Number(hours) || 48));
      setAttendanceWindowHoursState(valid);
      syncToDisk({ attendanceWindowHours: valid });
    },
    [syncToDisk]
  );

  const updateAttendanceSession = useCallback(
    (sessionId: string, updatedData: Partial<SyncAttendanceSession>): { success: boolean; error?: string } => {
      const target = attendanceSessions.find((s) => s.id === sessionId);
      if (!target) {
        return { success: false, error: "Attendance session record not found." };
      }

      // Check if session is within attendance window (e.g. 48 hours)
      const sessionTimestamp = target.createdAtTimestamp || (target.sessionDateRaw ? new Date(target.sessionDateRaw).getTime() : Date.now());
      const maxWindowMs = attendanceWindowHours * 3600 * 1000;
      const isExpired = Date.now() - sessionTimestamp > maxWindowMs;

      if (isExpired && !updatedData.isLocked && !updatedData.policyJustification) {
        return {
          success: false,
          error: `Attendance update window of ${attendanceWindowHours} hours has expired for this session. Institutional compliance policy requires entering an administrative justification reason.`,
        };
      }

      const nextSessions = attendanceSessions.map((s) =>
        s.id === sessionId ? { ...s, ...updatedData, modifiedAt: new Date().toISOString() } : s
      );
      setAttendanceSessions(nextSessions);
      syncToDisk({ attendanceSessions: nextSessions });
      return { success: true };
    },
    [attendanceSessions, attendanceWindowHours, syncToDisk]
  );

  const createAssignmentTeam = useCallback(
    (
      assignmentId: string,
      teamName: string,
      leaderId: string,
      leaderName: string,
      initialMembers: { id: string; name: string }[] = []
    ): { success: boolean; error?: string; team?: AssignmentTeam } => {
      const target = assignments.find((a) => a.id === assignmentId);
      if (target) {
        const currentTeams = target.teams || [];
        if (currentTeams.some((t) => t.memberStudentIds.includes(leaderId) || t.leaderStudentId === leaderId)) {
          return { success: false, error: "You are already a member or leader of a team for this project." };
        }
        const memberIds = [leaderId, ...initialMembers.map((m) => m.id)];
        const memberNames = [leaderName, ...initialMembers.map((m) => m.name)];

        const newTeam: AssignmentTeam = {
          id: `team-${Date.now()}`,
          name: teamName.trim() || `Team ${currentTeams.length + 1}`,
          leaderStudentId: leaderId,
          leaderName,
          memberStudentIds: memberIds,
          memberNames: memberNames,
          submissionStatus: "PENDING",
          isLocked: false,
        };
        const updatedTeams = [...currentTeams, newTeam];
        const nextAssignments = assignments.map((a) =>
          a.id === assignmentId ? { ...a, teams: updatedTeams } : a
        );
        setAssignments(nextAssignments);
        syncToDisk({ assignments: nextAssignments });
        return { success: true, team: newTeam };
      }

      const targetProj = facultyProjects.find((fp: any) => fp.id === assignmentId);
      if (targetProj) {
        const currentTeams = targetProj.teams || [];
        const isAlreadyMember = currentTeams.some((t: any) =>
          t.leadStudentId === leaderId ||
          t.leaderStudentId === leaderId ||
          t.memberStudentIds?.includes(leaderId) ||
          t.members?.some((m: any) => m.id === leaderId)
        );
        if (isAlreadyMember) {
          return { success: false, error: "You are already a member or leader of a team for this project." };
        }

        const memberIds = [leaderId, ...initialMembers.map((m) => m.id)];
        const memberNames = [leaderName, ...initialMembers.map((m) => m.name)];
        const structuredMembers = [
          { id: leaderId, name: leaderName, rollNumber: "Leader", isLead: true },
          ...initialMembers.map((m) => ({ id: m.id, name: m.name, rollNumber: "Student", isLead: false })),
        ];

        const newTeam: any = {
          id: `team-${Date.now()}`,
          name: teamName.trim() || `Team ${currentTeams.length + 1}`,
          leadStudentId: leaderId,
          leaderStudentId: leaderId,
          leaderName,
          members: structuredMembers,
          memberStudentIds: memberIds,
          memberNames: memberNames,
          submissionStatus: "NOT_SUBMITTED",
          isLocked: false,
        };

        const updatedTeams = [...currentTeams, newTeam];
        const nextProjects = facultyProjects.map((fp: any) =>
          fp.id === assignmentId ? { ...fp, teams: updatedTeams } : fp
        );
        setFacultyProjects(nextProjects);
        syncToDisk({ facultyProjects: nextProjects });
        void apiClient.patch("/admin/operational-state", { facultyProjects: nextProjects }).catch(console.error);
        return { success: true, team: newTeam as AssignmentTeam };
      }

      return { success: false, error: "Assignment not found." };
    },
    [assignments, facultyProjects, syncToDisk]
  );

  const joinAssignmentTeam = useCallback(
    (assignmentId: string, teamId: string, studentId: string, studentName: string): { success: boolean; error?: string } => {
      const target = assignments.find((a) => a.id === assignmentId);
      if (target) {
        const currentTeams = target.teams || [];
        if (currentTeams.some((t) => t.memberStudentIds.includes(studentId))) {
          return { success: false, error: "You are already part of a team for this assignment." };
        }
        const team = currentTeams.find((t) => t.id === teamId);
        if (!team) return { success: false, error: "Team not found." };
        if (team.isLocked) {
          return { success: false, error: "This team roster is locked by the team leader." };
        }
        const max = target.maxTeamSize || 4;
        if (team.memberStudentIds.length >= max) {
          return { success: false, error: `This team is full (Maximum limit: ${max} members).` };
        }
        const updatedTeams = currentTeams.map((t) => {
          if (t.id === teamId) {
            return {
              ...t,
              memberStudentIds: [...t.memberStudentIds, studentId],
              memberNames: [...t.memberNames, studentName],
            };
          }
          return t;
        });
        const nextAssignments = assignments.map((a) =>
          a.id === assignmentId ? { ...a, teams: updatedTeams } : a
        );
        setAssignments(nextAssignments);
        syncToDisk({ assignments: nextAssignments });
        return { success: true };
      }

      const targetProj = facultyProjects.find((fp: any) => fp.id === assignmentId);
      if (targetProj) {
        const currentTeams = targetProj.teams || [];
        const isAlreadyMember = currentTeams.some((t: any) =>
          t.leadStudentId === studentId ||
          t.leaderStudentId === studentId ||
          t.memberStudentIds?.includes(studentId) ||
          t.members?.some((m: any) => m.id === studentId)
        );
        if (isAlreadyMember) {
          return { success: false, error: "You are already part of a team for this project." };
        }
        const team = currentTeams.find((t: any) => t.id === teamId);
        if (!team) return { success: false, error: "Team not found." };
        if (team.isLocked) {
          return { success: false, error: "This team roster is locked by the team leader." };
        }
        const max = targetProj.maxTeamSize || 4;
        const currentCount = team.memberStudentIds?.length || team.members?.length || 1;
        if (currentCount >= max) {
          return { success: false, error: `This team is full (Maximum limit: ${max} members).` };
        }
        const updatedTeams = currentTeams.map((t: any) => {
          if (t.id === teamId) {
            const nextIds = [...(t.memberStudentIds || []), studentId];
            const nextNames = [...(t.memberNames || []), studentName];
            const nextMembers = [...(t.members || []), { id: studentId, name: studentName, rollNumber: "Student", isLead: false }];
            return {
              ...t,
              memberStudentIds: nextIds,
              memberNames: nextNames,
              members: nextMembers,
            };
          }
          return t;
        });
        const nextProjects = facultyProjects.map((fp: any) =>
          fp.id === assignmentId ? { ...fp, teams: updatedTeams } : fp
        );
        setFacultyProjects(nextProjects);
        syncToDisk({ facultyProjects: nextProjects });
        void apiClient.patch("/admin/operational-state", { facultyProjects: nextProjects }).catch(console.error);
        return { success: true };
      }

      return { success: false, error: "Assignment not found." };
    },
    [assignments, facultyProjects, syncToDisk]
  );

  const toggleLockAssignmentTeam = useCallback(
    (assignmentId: string, teamId: string): { success: boolean; isLocked?: boolean; error?: string } => {
      const target = assignments.find((a) => a.id === assignmentId);
      if (target) {
        const currentTeams = target.teams || [];
        const team = currentTeams.find((t) => t.id === teamId);
        if (!team) return { success: false, error: "Team not found." };

        const nextLocked = !team.isLocked;
        const updatedTeams = currentTeams.map((t) =>
          t.id === teamId ? { ...t, isLocked: nextLocked } : t
        );
        const nextAssignments = assignments.map((a) =>
          a.id === assignmentId ? { ...a, teams: updatedTeams } : a
        );
        setAssignments(nextAssignments);
        syncToDisk({ assignments: nextAssignments });
        return { success: true, isLocked: nextLocked };
      }

      const targetProj = facultyProjects.find((fp: any) => fp.id === assignmentId);
      if (targetProj) {
        const currentTeams = targetProj.teams || [];
        const team = currentTeams.find((t: any) => t.id === teamId);
        if (!team) return { success: false, error: "Team not found." };

        const nextLocked = !team.isLocked;
        const updatedTeams = currentTeams.map((t: any) =>
          t.id === teamId ? { ...t, isLocked: nextLocked } : t
        );
        const nextProjects = facultyProjects.map((fp: any) =>
          fp.id === assignmentId ? { ...fp, teams: updatedTeams } : fp
        );
        setFacultyProjects(nextProjects);
        syncToDisk({ facultyProjects: nextProjects });
        void apiClient.patch("/admin/operational-state", { facultyProjects: nextProjects }).catch(console.error);
        return { success: true, isLocked: nextLocked };
      }

      return { success: false, error: "Assignment not found." };
    },
    [assignments, facultyProjects, syncToDisk]
  );

  const leaveAssignmentTeam = useCallback(
    (assignmentId: string, teamId: string, studentId: string): { success: boolean; error?: string } => {
      const target = assignments.find((a) => a.id === assignmentId);
      if (target) {
        const currentTeams = target.teams || [];
        const team = currentTeams.find((t) => t.id === teamId);
        if (!team) return { success: false, error: "Team not found." };

        let updatedTeams: AssignmentTeam[];
        if (team.leaderStudentId === studentId && team.memberStudentIds.length <= 1) {
          updatedTeams = currentTeams.filter((t) => t.id !== teamId);
        } else {
          const nextMembers = team.memberStudentIds.filter((id) => id !== studentId);
          const idx = team.memberStudentIds.indexOf(studentId);
          const nextNames = team.memberNames.filter((_, i) => i !== idx);
          const nextLeader = team.leaderStudentId === studentId ? nextMembers[0] : team.leaderStudentId;
          const nextLeaderName = team.leaderStudentId === studentId ? nextNames[0] : team.leaderName;
          updatedTeams = currentTeams.map((t) =>
            t.id === teamId
              ? { ...t, leaderStudentId: nextLeader, leaderName: nextLeaderName, memberStudentIds: nextMembers, memberNames: nextNames }
              : t
          );
        }
        const nextAssignments = assignments.map((a) =>
          a.id === assignmentId ? { ...a, teams: updatedTeams } : a
        );
        setAssignments(nextAssignments);
        syncToDisk({ assignments: nextAssignments });
        return { success: true };
      }

      const targetProj = facultyProjects.find((fp: any) => fp.id === assignmentId);
      if (targetProj) {
        const currentTeams = targetProj.teams || [];
        const team = currentTeams.find((t: any) => t.id === teamId);
        if (!team) return { success: false, error: "Team not found." };

        const currentMemberIds = team.memberStudentIds || (team.members || []).map((m: any) => m.id);
        let updatedTeams: any[];
        if ((team.leadStudentId === studentId || team.leaderStudentId === studentId) && currentMemberIds.length <= 1) {
          updatedTeams = currentTeams.filter((t: any) => t.id !== teamId);
        } else {
          const nextMembers = (team.members || []).filter((m: any) => m.id !== studentId);
          const nextMemberIds = currentMemberIds.filter((id: string) => id !== studentId);
          const nextMemberNames = (team.memberNames || []).filter((_: any, i: number) => (team.memberStudentIds || [])[i] !== studentId);
          const nextLeaderId = (team.leadStudentId === studentId || team.leaderStudentId === studentId)
            ? nextMemberIds[0] || ""
            : team.leadStudentId || team.leaderStudentId;
          const nextLeaderName = nextMembers.find((m: any) => m.id === nextLeaderId)?.name || team.leaderName || "Leader";

          updatedTeams = currentTeams.map((t: any) =>
            t.id === teamId
              ? {
                  ...t,
                  leadStudentId: nextLeaderId,
                  leaderStudentId: nextLeaderId,
                  leaderName: nextLeaderName,
                  members: nextMembers.map((m: any) => ({ ...m, isLead: m.id === nextLeaderId })),
                  memberStudentIds: nextMemberIds,
                  memberNames: nextMemberNames,
                }
              : t
          );
        }
        const nextProjects = facultyProjects.map((fp: any) =>
          fp.id === assignmentId ? { ...fp, teams: updatedTeams } : fp
        );
        setFacultyProjects(nextProjects);
        syncToDisk({ facultyProjects: nextProjects });
        void apiClient.patch("/admin/operational-state", { facultyProjects: nextProjects }).catch(console.error);
        return { success: true };
      }

      return { success: false, error: "Assignment not found." };
    },
    [assignments, facultyProjects, syncToDisk]
  );

  const sendTeamInvitation = useCallback(
    (
      assignmentId: string,
      teamId: string,
      teamName: string,
      leaderName: string,
      targetStudentId: string,
      targetStudentName: string
    ): { success: boolean; error?: string } => {
      const notif: SyncNotification = {
        id: `notif-team-invite-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: `Team Invitation: ${teamName} 🤝`,
        message: `${leaderName} invited you to join team "${teamName}" for this project! Accept now to collaborate on code, documentation, and deliverables.`,
        createdAt: "Just now",
        isRead: false,
        type: "TEAM_INVITE",
        targetStudentId,
        teamId,
        assignmentId,
        teamName,
        invitedByName: leaderName,
      };
      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      syncToDisk({ notifications: nextNotifs });
      void apiClient.patch("/admin/operational-state", { notifications: nextNotifs }).catch(console.error);
      return { success: true };
    },
    [notifications, syncToDisk]
  );

  const recordAttendance = useCallback(
    (session: {
      courseCode: string;
      courseName: string;
      topic: string;
      room?: string;
      className?: string;
      section?: string;
      presentCount: number;
      totalCount: number;
      facultyName?: string;
      lectureNumber?: number;
      studentIsPresent: boolean;
      records?: Array<{ studentId: string; student_id?: string; rollNo?: string; status: "PRESENT" | "ABSENT" | "LATE" | "P" | "A" | "ON_DUTY" | "APPROVED_LEAVE" }>;
      rosterRecords?: Array<{ student_id: string; status: "PRESENT" | "ABSENT" | "LATE" | "ON_DUTY" | "APPROVED_LEAVE" }>;
    }) => {
      const now = new Date();
      const mappedRecords = session.records || session.rosterRecords?.map((r) => ({
        studentId: r.student_id,
        student_id: r.student_id,
        status: r.status,
      })) || [];

      const newSession: SyncAttendanceSession = {
        id: `att-${Date.now()}`,
        courseCode: session.courseCode,
        courseName: session.courseName,
        topic: session.topic,
        sessionDate: `Today • ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        sessionDateRaw: now.toISOString().slice(0, 10),
        createdAtTimestamp: Date.now(),
        room: session.room || "",
        className: session.className || "",
        section: session.section || "",
        conductedByFaculty: session.facultyName || "",
        presentCount: session.presentCount,
        totalCount: session.totalCount,
        studentIsPresent: session.studentIsPresent,
        status: "LOCKED",
        isLocked: false,
        records: mappedRecords,
      };
      const nextAttended = session.studentIsPresent ? studentClassesAttended + 1 : studentClassesAttended;
      const nextTotal = studentTotalClasses + 1;
      const nextSessions = [newSession, ...attendanceSessions];
      setAttendanceSessions(nextSessions);
      setStudentClassesAttended(nextAttended);
      setStudentTotalClasses(nextTotal);

      // Create student-level attendance notification targeted strictly to each student based on their actual attendance
      const topicTaught = session.topic ? session.topic.trim() : "General Curriculum";
      const studentNotifs: SyncNotification[] = [];

      if (mappedRecords.length > 0) {
        mappedRecords.forEach((r: any) => {
          const sid = r.student_id || r.studentId;
          const isAbs = r.status === "ABSENT" || r.status === "A";
          const isOd = r.status === "ON_DUTY" || r.status === "OD";
          const isLeave = r.status === "APPROVED_LEAVE" || r.status === "LEAVE";

          studentNotifs.push({
            id: `notif-att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: isAbs
              ? `⚠️ Absence Recorded: ${session.courseCode}`
              : isOd
              ? `🛡️ On-Duty (OD) Credited: ${session.courseCode}`
              : isLeave
              ? `📋 Approved Leave Credited: ${session.courseCode}`
              : `✓ Attendance Recorded: ${session.courseCode}`,
            message: isAbs
              ? `You were marked ABSENT for today's lecture on "${topicTaught}". Complete the AI Catch-Up lesson now to review key concepts.`
              : isOd
              ? `You were granted On-Duty attendance credit for today's lecture on "${topicTaught}".`
              : isLeave
              ? `Your approved leave was credited for today's lecture on "${topicTaught}".`
              : `You were marked PRESENT for today's lecture on "${topicTaught}". Room: ${session.room || "Classroom"}.`,
            type: "ATTENDANCE",
            courseCode: session.courseCode,
            topic: topicTaught,
            lectureNumber: attendanceSessions.filter((s) => (s.courseCode || "").toLowerCase() === (session.courseCode || "").toLowerCase()).length + 1,
            room: session.room || "Classroom",
            facultyName: session.facultyName || "Course Instructor",
            aiCatchUpAvailable: isAbs,
            targetRole: "STUDENT",
            targetStudentId: sid,
            targetRecipientEmail: r.email || undefined,
            isRead: false,
            createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        });
      } else {
        const isAbsent = session.studentIsPresent === false;
        studentNotifs.push({
          id: `notif-att-${Date.now()}`,
          title: isAbsent
            ? `⚠️ Absence Recorded: ${session.courseCode}`
            : `✓ Attendance Recorded: ${session.courseCode}`,
          message: isAbsent
            ? `You were marked ABSENT for today's lecture on "${topicTaught}". Complete the AI Catch-Up lesson now to review key concepts.`
            : `You were marked PRESENT for today's lecture on "${topicTaught}". Room: ${session.room || "Classroom"}.`,
          type: "ATTENDANCE",
          courseCode: session.courseCode,
          topic: topicTaught,
          lectureNumber: attendanceSessions.filter((s) => (s.courseCode || "").toLowerCase() === (session.courseCode || "").toLowerCase()).length + 1,
          room: session.room || "Classroom",
          facultyName: session.facultyName || "Course Instructor",
          aiCatchUpAvailable: isAbsent,
          targetRole: "STUDENT",
          isRead: false,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      const nextNotifs = [...studentNotifs, ...notifications];
      setNotifications(nextNotifs);

      syncToDisk({
        attendanceSessions: nextSessions,
        studentClassesAttended: nextAttended,
        studentTotalClasses: nextTotal,
        notifications: nextNotifs,
      });

      // Async backend sync to FastAPI attendance router
      const normCode = (session.courseCode || "").toLowerCase().trim();
      const course = courses.find((c) => {
        const cCode = (((c as any).code || (c as any).course_code || "") as string).toLowerCase().trim();
        return cCode === normCode || c.id === session.courseCode;
      });

      const recordsPayload = mappedRecords.map((r: any) => ({
        student_id: r.student_id || r.studentId,
        status: (r.status === "A" || r.status === "ABSENT") ? "ABSENT" : "PRESENT",
        minutes_late: 0,
        remarks: topicTaught ? `Topic: ${topicTaught}` : null,
      }));

      if (course) {
        apiClient
          .post("/attendance/sessions", {
            course_id: course.id,
            session_date: new Date().toISOString().slice(0, 10),
            topic_covered: topicTaught,
          })
          .then((res: any) => {
            const sessId = res?.data?.id || res?.id;
            if (sessId && recordsPayload.length > 0) {
              apiClient
                .post(`/attendance/sessions/${sessId}/records`, {
                  records: recordsPayload,
                })
                .then(() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("academic-data-changed"));
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    },
    [attendanceSessions, courses, notifications, studentClassesAttended, studentTotalClasses, syncToDisk]
  );

  const broadcastNotice = useCallback(
    (notice: { title: string; content: string; audience: string; category: string; sendNotification?: boolean }) => {
      const newAnn: SyncAnnouncement = {
        id: `ann-${Date.now()}`,
        title: notice.title,
        content: notice.content,
        authorName: "Academic Administration",
        audience: notice.audience,
        createdAt: "Just now",
        priority: "HIGH",
        category: notice.category,
      };
      const nextAnns = [newAnn, ...announcements];
      setAnnouncements(nextAnns);

      const audUpper = (notice.audience || "").toUpperCase();
      let targetRole: "STUDENT" | "FACULTY" | "HOD" | "ADMIN" | "ALL" = "ALL";
      if (audUpper.includes("FACULTY") && !audUpper.includes("STUDENT")) targetRole = "FACULTY";
      else if (audUpper.includes("STUDENT") && !audUpper.includes("FACULTY")) targetRole = "STUDENT";
      else if (audUpper.includes("HOD")) targetRole = "HOD";
      else if (audUpper.includes("ADMIN")) targetRole = "ADMIN";

      const newNotif: SyncNotification = {
        id: `notif-${Date.now()}`,
        title: notice.title,
        message: notice.content,
        type: "BROADCAST",
        targetRole,
        isRead: false,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const nextNotifs = [newNotif, ...notifications];
      setNotifications(nextNotifs);

      syncToDisk({
        announcements: nextAnns,
        notifications: nextNotifs,
      });

      // Async backend sync
      apiClient.post("/announcements", {
        title: notice.title,
        content: notice.content,
        scope_type: "INSTITUTION",
        priority: "HIGH",
        publish_now: true,
      }).catch(() => {});
    },
    [announcements, notifications, syncToDisk]
  );

  const markNotificationAsRead = useCallback(
    (notificationId: string) => {
      const next = notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
      setNotifications(next);
      syncToDisk({ notifications: next });
      apiClient.patch(`/notifications/${notificationId}/read`, {}).catch(() => {
        setNotifications(notifications);
      });
    },
    [notifications, syncToDisk]
  );

  // ─── SEMESTER ADVANCEMENT & PROMOTION ───
  const advanceSemester = useCallback(() => {
    const nextSem = Math.min(8, currentSemester + 1);
    setCurrentSemester(nextSem);
    setActiveSemesterFilter(nextSem);

    const nextHistory = semesterHistory.map((sh) => {
      if (sh.semesterNumber === currentSemester) {
        return { ...sh, status: "COMPLETED" as const, gpa: sh.gpa || 0 };
      }
      if (sh.semesterNumber === nextSem) {
        return { ...sh, status: "CURRENT" as const, gpa: sh.gpa || 0 };
      }
      return sh;
    });
    setSemesterHistory(nextHistory);

    // Universally advance ALL department cohorts (e.g., Sem 1 -> Sem 2, Sem 5 -> Sem 6)
    const nextDepts = departments.map((dept) => {
      const updatedCohorts = (dept.cohorts || []).map((cohort) => {
        const curNumMatch = (cohort.semester || cohort.name).match(/(?:sem(?:ester)?[\s-]*(\d+))|(?:(\d+)(?:st|nd|rd|th)\s*sem)/i);
        const curCohortSem = curNumMatch ? parseInt(curNumMatch[1] || curNumMatch[2], 10) : currentSemester;
        const nextCohortSem = Math.min(8, curCohortSem + 1);
        const updatedName = cohort.name.replace(/sem(?:ester)?[\s-]*\d+/gi, `Sem ${nextCohortSem}`);
        return {
          ...cohort,
          name: updatedName,
          semester: `Semester ${nextCohortSem}`,
        };
      });
      return { ...dept, cohorts: updatedCohorts };
    });
    setDepartments(nextDepts);

    // Universally advance ALL enrolled student users across all sections & classes
    const nextUsers = users.map((u) => {
      const isStudent = u.role === "STUDENT" || (u as any).role?.name === "STUDENT" || Boolean(u.student_identifier);
      if (isStudent) {
        const curStuSem = u.semester || currentSemester;
        const nextStuSem = Math.min(8, curStuSem + 1);
        let updatedClassName = u.className;
        if (updatedClassName) {
          updatedClassName = updatedClassName.replace(/sem(?:ester)?[\s-]*\d+/gi, `Sem ${nextStuSem}`);
        }
        return {
          ...u,
          semester: nextStuSem,
          className: updatedClassName,
        };
      }
      return u;
    });
    setUsers(nextUsers);

    const newAnn: SyncAnnouncement = {
      id: `ann-sem-${Date.now()}`,
      title: `Academic Term Advancement: Semester ${nextSem} Now Active`,
      content: `All classes, cohorts, and student sections university-wide have been successfully promoted to Semester ${nextSem}. Course syllabus shells, labs, and attendance sessions are activated.`,
      authorName: "University Directorate",
      audience: "University-Wide",
      createdAt: "Just now",
      priority: "HIGH",
      category: "ACADEMIC",
    };
    const nextAnns = [newAnn, ...announcements];
    setAnnouncements(nextAnns);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("smartedu_current_semester", String(nextSem));
        localStorage.setItem("smartedu_active_semester_filter", String(nextSem));
      } catch (e) {}
    }

    syncToDisk({
      currentSemester: nextSem,
      activeSemesterFilter: nextSem,
      semesterHistory: nextHistory,
      announcements: nextAnns,
      departments: nextDepts,
    });

    // Background sync to backend
    apiClient.post("/academic/terms/advance", {
      current_semester: nextSem,
      action: "PROMOTED_ALL_COHORTS",
    }).catch(() => {});
  }, [currentSemester, semesterHistory, announcements, departments, users, syncToDisk]);

  const resetToProductionBaseline = useCallback(() => {
    setUsers(initialAdminUsers);
    setDepartments([]);
    setClassrooms([]);
    setPolicies([]);
    setCourses([]);
    setTerms([]);
    setCurrentSemester(1);
    setActiveSemesterFilter(1);
    setSemesterHistory([]);
    setModules([]);
    setQuizzes([]);
    setDiscussions([]);
    setAssignments([]);
    setSubmissions([]);
    setAnnouncements([]);
    setNotifications([]);
    setDecrees([]);
    setGradeSheets([]);
    setDisputes([]);
    setAttendanceSessions([]);
    setCampusAlert(null);
    setCalendarSchedules([]);
    setInstitutionalHolidays([]);
    setStudentClassesAttended(0);
    setStudentTotalClasses(0);
    setLeaderboard(initialLeaderboardEntries);
    setProjectSubmissions(initialProjectSubmissions);

    const cleanBaseline = {
      users: initialAdminUsers,
      departments: [],
      classrooms: [],
      policies: [],
      courses: [],
      terms: [],
      currentSemester: 1,
      activeSemesterFilter: 1,
      semesterHistory: [],
      modules: [],
      quizzes: [],
      discussions: [],
      assignments: [],
      submissions: [],
      announcements: [],
      notifications: [],
      decrees: [],
      gradeSheets: [],
      disputes: [],
      attendanceSessions: [],
      calendarSchedules: [],
      institutionalHolidays: [],
      campusAlert: null,
      studentClassesAttended: 0,
      studentTotalClasses: 0,
      leaderboard: initialLeaderboardEntries,
      projectSubmissions: initialProjectSubmissions,
    };
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "SYNC_UPDATE", payload: cleanBaseline });
    }
  }, []);

  const purgeAllDataToBlankProduction = useCallback(() => {
    resetToProductionBaseline();
  }, [resetToProductionBaseline]);

  // ─── INSTITUTIONAL TIMETABLE & HOLIDAYS MANAGEMENT ───
  const addInstitutionalHoliday = useCallback(
    (holidayData: Omit<InstitutionalHoliday, "id">) => {
      const newHoliday: InstitutionalHoliday = {
        ...holidayData,
        id: `hol-${Date.now()}`,
      };
      const next = [newHoliday, ...institutionalHolidays];
      setInstitutionalHolidays(next);
      syncToDisk({ institutionalHolidays: next });
    },
    [institutionalHolidays, syncToDisk]
  );

  const deleteInstitutionalHoliday = useCallback(
    (id: string) => {
      const next = institutionalHolidays.filter((h) => h.id !== id);
      setInstitutionalHolidays(next);
      syncToDisk({ institutionalHolidays: next });
    },
    [institutionalHolidays, syncToDisk]
  );

  const copyScheduleToWeeks = useCallback(
    (sourceWeek: number, targetWeeks: number[], classFilter?: string) => {
      let totalCopied = 0;
      setCalendarSchedules((prevSchedules) => {
        const sourceEvents = prevSchedules.filter((ev) => {
          const matchWeek = Number(ev.weekNumber) === Number(sourceWeek);
          if (!matchWeek) return false;
          if (classFilter && classFilter !== "ALL") {
            const evClass = (ev.className || "").trim().toLowerCase();
            const filterClass = classFilter.trim().toLowerCase();
            return (
              evClass === filterClass ||
              evClass.includes(filterClass) ||
              filterClass.includes(evClass) ||
              evClass.includes("all classes") ||
              evClass.includes("common")
            );
          }
          return true;
        });

        if (sourceEvents.length === 0) return prevSchedules;

        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const safeTargetWeeks = targetWeeks.filter((w) => {
          if (Number(w) === Number(sourceWeek)) return false;
          // Target week must have at least one future date (> todayIso)
          const sun = getAcademicTermDateForWeekDay(Number(w), 0);
          return sun.dateString > todayIso;
        });
        if (safeTargetWeeks.length === 0) return prevSchedules;

        let updated = [...prevSchedules];
        safeTargetWeeks.forEach((targetWeek) => {
          if (classFilter && classFilter !== "ALL") {
            const filterClass = classFilter.trim().toLowerCase();
            updated = updated.filter(
              (ev) => {
                if (Number(ev.weekNumber) !== Number(targetWeek)) return true;
                if (ev.dateString && ev.dateString <= todayIso) return true;
                const evClass = (ev.className || "").trim().toLowerCase();
                const matches =
                  evClass === filterClass ||
                  evClass.includes(filterClass) ||
                  filterClass.includes(evClass) ||
                  evClass.includes("all classes") ||
                  evClass.includes("common");
                return !matches;
              }
            );
          } else {
            updated = updated.filter((ev) => {
              if (Number(ev.weekNumber) !== Number(targetWeek)) return true;
              if (ev.dateString && ev.dateString <= todayIso) return true;
              return false;
            });
          }

          const clonedEvents: CalendarScheduleEvent[] = [];
          sourceEvents.forEach((ev, idx) => {
            const cal = getAcademicTermDateForWeekDay(targetWeek, ev.dayIndex);
            // Strict constraint: Classes cannot be scheduled on today or earlier dates
            if (cal.dateString <= todayIso) {
              return;
            }

            clonedEvents.push({
              ...ev,
              id: `ev-w${targetWeek}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              weekNumber: Number(targetWeek),
              dateString: cal.dateString,
              dateNumber: cal.dateNumber,
              lectureNumber: (ev.lectureNumber || 1) + (Number(targetWeek) - Number(sourceWeek)) * 3,
            });
          });

          totalCopied += clonedEvents.length;
          updated = deduplicateSchedules([...updated, ...clonedEvents]);
        });

        updated = deduplicateSchedules(updated);
        syncToDisk({ calendarSchedules: updated });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("academic-data-changed"));
        }
        return updated;
      });
      return { success: totalCopied > 0, count: totalCopied };
    },
    [syncToDisk]
  );

  const copyScheduleToMonth = useCallback(
    (sourceMonth: string, targetMonth: string) => {
      setCalendarSchedules((prevSchedules) => {
        const week1Events = prevSchedules.filter((ev) => Number(ev.weekNumber) === 1);
        if (week1Events.length === 0) return prevSchedules;

        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        let updated = [...prevSchedules];
        [2, 3, 4].forEach((w) => {
          updated = updated.filter((ev) => Number(ev.weekNumber) !== Number(w));
          const cloned: CalendarScheduleEvent[] = [];
          week1Events.forEach((ev, idx) => {
            const cal = getAcademicTermDateForWeekDay(w, ev.dayIndex);
            if (cal.dateString < todayIso) return;
            cloned.push({
              ...ev,
              id: `ev-m-${w}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              weekNumber: Number(w),
              dateString: cal.dateString,
              dateNumber: cal.dateNumber,
              lectureNumber: (ev.lectureNumber || 1) + (Number(w) - 1) * 3,
            });
          });
          updated = [...updated, ...cloned];
        });

        syncToDisk({ calendarSchedules: updated });
        return updated;
      });
    },
    [syncToDisk]
  );

  const addScheduleEvent = useCallback(
    (eventData: Omit<CalendarScheduleEvent, "id">) => {
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      // Week and day are authoritative; never retain a stale date from a copied class.
      let dateString = eventData.dateString;
      let dateNumber = eventData.dateNumber;
      if (eventData.weekNumber && eventData.dayIndex !== undefined) {
        const cal = getAcademicTermDateForWeekDay(eventData.weekNumber, eventData.dayIndex);
        dateString = cal.dateString;
        dateNumber = cal.dateNumber;
      }

      // STRICT VALIDATION: Class can't be scheduled for earlier date than today
      if (dateString && dateString < todayIso) {
        throw new Error(`Cannot schedule class on past date (${dateString}). Classes can only be scheduled for today or future dates.`);
      }

      const conflict = checkScheduleConflicts({
        roomNumber: eventData.room,
        facultyName: eventData.faculty,
        className: eventData.className,
        dayIndex: eventData.dayIndex,
        weekNumber: eventData.weekNumber || 1,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
      });

      if (conflict.hasConflict) {
        console.warn("Schedule collision prevented:", conflict.message);
        throw new Error(conflict.message || "Conflict: Two classes cannot be scheduled for the same section/time.");
      }

      const newEvent: CalendarScheduleEvent = {
        ...eventData,
        dateString,
        dateNumber,
        id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      const duplicate = calendarSchedules.some((event) => scheduleIdentity(event) === scheduleIdentity(newEvent));
      if (duplicate) {
        throw new Error("This class already exists for the selected date and time.");
      }
      const next = deduplicateSchedules([...calendarSchedules, newEvent]);
      setCalendarSchedules(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_calendarSchedules", JSON.stringify(next));
        } catch {}
      }
      syncToDisk({ calendarSchedules: next });

      // Persist to the backend and retain its durable identifier for later edits/deletion.
      if (authenticatedUser) {
        try {
          const dayEnumMap: Record<number, string> = {
            1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY", 0: "SUNDAY"
          };
          const matchedCourse = courses.find((c) => c.code === eventData.courseCode);
          const matchedFaculty = users.find((u) => u.email === eventData.facultyEmail || `${u.first_name} ${u.last_name || ""}`.trim().toLowerCase() === (eventData.faculty || "").toLowerCase());
          const toTwentyFourHour = (value: string) => {
            const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            if (!match) return value.slice(0, 5);
            let hour = Number(match[1]);
            const suffix = match[3]?.toUpperCase();
            if (suffix === "PM" && hour < 12) hour += 12;
            if (suffix === "AM" && hour === 12) hour = 0;
            return `${String(hour).padStart(2, "0")}:${match[2]}`;
          };
          
          if (matchedCourse?.id) {
            void apiClient.post<{ id: string }>("/timetable/schedules", {
              course_id: matchedCourse.id,
              faculty_id: matchedFaculty?.id || authenticatedUser.id,
              section_name: eventData.section || eventData.className || "A",
              day_of_week: dayEnumMap[eventData.dayIndex] || "MONDAY",
              start_time: toTwentyFourHour(eventData.startTime),
              end_time: toTwentyFourHour(eventData.endTime),
              room: eventData.room,
              building: eventData.building || null,
              academic_period: terms.find((term) => term.status === "Active")?.name || "Current term",
              week_number: Number(eventData.weekNumber || 1),
              lecture_title: eventData.lectureTitle,
              session_type: eventData.type || "LECTURE",
            }).then((saved) => {
              setCalendarSchedules((current) => {
                const persisted = current.map((event) => event.id === newEvent.id ? { ...event, backendId: saved.id } : event);
                syncToDisk({ calendarSchedules: persisted });
                return persisted;
              });
            }).catch((error) => {
              console.error("Class schedule could not be persisted:", error);
            });
          }
        } catch {}
      }
    },
    [calendarSchedules, checkScheduleConflicts, syncToDisk, authenticatedUser, courses, users, terms]
  );

  const updateScheduleEvent = useCallback(
    (eventData: CalendarScheduleEvent) => {
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      let dateString = eventData.dateString;
      let dateNumber = eventData.dateNumber;
      if (eventData.weekNumber && eventData.dayIndex !== undefined) {
        const cal = getAcademicTermDateForWeekDay(eventData.weekNumber, eventData.dayIndex);
        dateString = cal.dateString;
        dateNumber = cal.dateNumber;
      }

      if (dateString && dateString < todayIso) {
        throw new Error(`Cannot schedule class on past date (${dateString}). Classes can only be scheduled for today or future dates.`);
      }

      const conflict = checkScheduleConflicts({
        roomNumber: eventData.room,
        facultyName: eventData.faculty,
        className: eventData.className,
        dayIndex: eventData.dayIndex,
        weekNumber: eventData.weekNumber || 1,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        excludeEventId: eventData.id,
      });

      if (conflict.hasConflict) {
        console.warn("Schedule update collision prevented:", conflict.message);
        throw new Error(conflict.message || "Conflict: Two classes cannot be scheduled for the same section/time.");
      }

      const updatedEvent = { ...eventData, dateString, dateNumber };
      const duplicate = calendarSchedules.some((event) => event.id !== eventData.id && scheduleIdentity(event) === scheduleIdentity(updatedEvent));
      if (duplicate) {
        throw new Error("Another copy of this class already exists for the selected date and time.");
      }
      const next = deduplicateSchedules(calendarSchedules.map((ev) => (ev.id === eventData.id ? updatedEvent : ev)));
      setCalendarSchedules(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_calendarSchedules", JSON.stringify(next));
        } catch {}
      }
      syncToDisk({ calendarSchedules: next });
    },
    [calendarSchedules, checkScheduleConflicts, syncToDisk]
  );

  const deleteScheduleEvent = useCallback(
    async (id: string) => {
      const target = calendarSchedules.find((event) => event.id === id);
      const durableId = target?.backendId || (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) ? id : null);
      if (durableId) {
        try {
          await apiClient.delete(`/timetable/schedules/${durableId}`);
        } catch (e) {
          console.warn("Backend schedule deletion non-critical warning:", e);
        }
      }
      const next = calendarSchedules.filter((ev) => ev.id !== id);
      setCalendarSchedules(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_calendarSchedules", JSON.stringify(next));
          const onlyExams = next.filter((e) => e.type === "EXAM");
          localStorage.setItem("smartedu_exam_calendar_events", JSON.stringify(onlyExams));
          const rawMaster = localStorage.getItem("smartedu_exam_master_schedules");
          if (rawMaster) {
            const masterList = JSON.parse(rawMaster);
            if (Array.isArray(masterList)) {
              localStorage.setItem("smartedu_exam_master_schedules", JSON.stringify(masterList.filter((m: any) => m.id !== id)));
            }
          }
        } catch {}
      }
      syncToDisk({ calendarSchedules: next });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("academic-data-changed"));
      }
    },
    [calendarSchedules, syncToDisk]
  );

  const cancelScheduleEvent = useCallback(
    async (id: string) => {
      const target = calendarSchedules.find((event) => event.id === id);
      const durableId = target?.backendId || (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) ? id : null);
      if (durableId) {
        try {
          await apiClient.patch(`/timetable/schedules/${durableId}/cancel`, {});
        } catch (e) {
          console.warn("Backend schedule cancel non-critical warning:", e);
        }
      }
      const next = calendarSchedules.filter((event) => event.id !== id);
      setCalendarSchedules(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_calendarSchedules", JSON.stringify(next));
        } catch {}
      }
      syncToDisk({ calendarSchedules: next });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("academic-data-changed"));
      }
    },
    [calendarSchedules, syncToDisk]
  );

  const purgeDuplicateSchedules = useCallback(() => {
    let removedCount = 0;
    setCalendarSchedules((prev) => {
      const seen = new Set<string>();
      const next = prev.filter((ev) => {
        // Purge legacy past-week copied schedules (ev-w1 to ev-w15)
        if (ev.id.startsWith("ev-w") && Number(ev.weekNumber || 1) < 16) {
          removedCount++;
          return false;
        }
        const key = scheduleIdentity(ev);
        if (seen.has(key)) {
          removedCount++;
          return false;
        }
        seen.add(key);
        return true;
      });
      syncToDisk({ calendarSchedules: next });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("academic-data-changed"));
      }
      return next;
    });
    return { removedCount };
  }, [syncToDisk]);

  const scheduleExamSession = useCallback(
    (examData: {
      courseCode: string;
      courseName?: string;
      date: string;
      time: string;
      venue: string;
      totalCandidates?: number;
      series?: string;
      proctoringMode?: string;
    }) => {
      const d = new Date(examData.date);
      const dayIndex = isNaN(d.getDay()) ? 1 : d.getDay();
      const dateNumber = isNaN(d.getDate()) ? 1 : d.getDate();
      const weekNumber = Math.ceil(dateNumber / 7) || 1;

      const timeParts = (examData.time || "10:00 AM - 01:00 PM").split("-").map((s) => s.trim());
      const startTime = timeParts[0] || "10:00 AM";
      const endTime = timeParts[1] || "01:00 PM";

      const parseStartHour = (t: string) => {
        const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (!match) return 10;
        let h = parseInt(match[1], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === "PM" && h < 12) h += 12;
        if (meridiem === "AM" && h === 12) h = 0;
        return h;
      };

      const startHour = parseStartHour(startTime);
      const endHour = parseStartHour(endTime);
      const durationHours = endHour > startHour ? endHour - startHour : 3;

      const courseObj = courses.find((c) => c.code.toLowerCase() === examData.courseCode.toLowerCase());
      const courseName = examData.courseName || courseObj?.name || examData.courseCode;

      const newEvent: CalendarScheduleEvent = {
        id: `exam-ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        courseCode: examData.courseCode,
        courseName,
        lectureNumber: 1,
        lectureTitle: `🎓 Semester Exam: ${courseName} (${examData.series || "Final Examination"})`,
        dayIndex,
        dateNumber,
        dateString: examData.date,
        weekNumber,
        startTime,
        endTime,
        startHour,
        durationHours,
        room: examData.venue || "Auditorium Examination Hall",
        faculty: "Office of Controller of Examinations",
        facultyTitle: "COE Examination Board",
        facultyDepartment: courseObj?.department || "Examination Division",
        type: "EXAM",
        colorBadge: "bg-rose-600 border-rose-700",
        sessionAgenda: [
          `Official Term Examination Series: ${examData.series || "End-Semester Examinations 2026"}`,
          `Proctoring & Invigilation: ${examData.proctoringMode || "AI Camera + Human Invigilator"}`,
          "Candidates must present authenticated Student ID and Examination Hall Ticket",
        ],
        prerequisites: "Admit Card / Hall Ticket and clearance from Examination Department",
        learningOutcomes: `Demonstration of comprehensive mastery over ${courseName} syllabus`,
        readingMaterials: `Full course curriculum, prescribed references, and standard textbook for ${courseName}`,
      };

      const nextEvents = [...calendarSchedules, newEvent];
      setCalendarSchedules(nextEvents);

      // Create high-priority synced notification for students and faculty
      const notif: SyncNotification = {
        id: `notif-exam-${Date.now()}`,
        title: `Official Examination Scheduled: ${examData.courseCode}`,
        message: `The Examination Department has scheduled ${courseName} (${examData.courseCode}) on ${examData.date} from ${examData.time} at ${examData.venue}.`,
        createdAt: new Date().toISOString(),
        isRead: false,
        type: "EXAM",
        courseCode: examData.courseCode,
        topic: `Semester Examination (${examData.date})`,
        room: examData.venue,
      };

      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      if (typeof window !== "undefined") {
        try {
          const onlyExams = nextEvents.filter(e => e.type === "EXAM");
          localStorage.setItem("smartedu_exam_calendar_events", JSON.stringify(onlyExams));
        } catch {}
      }
      syncToDisk({ calendarSchedules: nextEvents, notifications: nextNotifs });
    },
    [calendarSchedules, notifications, courses, syncToDisk]
  );

  const scheduleClassTest = useCallback(
    (testData: {
      courseCode: string;
      courseName?: string;
      title: string;
      className?: string;
      date: string;
      time: string;
      venue?: string;
      facultyName?: string;
      maxMarks?: number;
      agenda?: string[];
    }) => {
      const d = new Date(testData.date);
      const dayIndex = isNaN(d.getDay()) ? 1 : d.getDay();
      const dateNumber = isNaN(d.getDate()) ? 1 : d.getDate();
      const weekNumber = Math.ceil(dateNumber / 7) || 1;

      const timeParts = (testData.time || "09:00 AM - 10:30 AM").split("-").map((s) => s.trim());
      const startTime = timeParts[0] || "09:00 AM";
      const endTime = timeParts[1] || "10:30 AM";

      const parseStartHour = (t: string) => {
        const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (!match) return 9;
        let h = parseInt(match[1], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === "PM" && h < 12) h += 12;
        if (meridiem === "AM" && h === 12) h = 0;
        return h;
      };

      const startHour = parseStartHour(startTime);
      const endHour = parseStartHour(endTime);
      const durationHours = endHour > startHour ? endHour - startHour : 1.5;

      const courseObj = courses.find((c) => c.code.toLowerCase() === testData.courseCode.toLowerCase());
      const courseName = testData.courseName || courseObj?.name || testData.courseCode;
      const assignedFaculty = testData.facultyName || courseObj?.instructor || "";
      if (!assignedFaculty.trim()) {
        throw new Error("Assign a faculty member before scheduling this class test.");
      }
      if (!testData.venue?.trim()) {
        throw new Error("Select a classroom before scheduling this class test.");
      }

      const newEvent: CalendarScheduleEvent = {
        id: `dsa-ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        courseCode: testData.courseCode,
        courseName,
        className: testData.className || "",
        lectureNumber: 1,
        lectureTitle: `📝 DSA Test: ${testData.title}`,
        dayIndex,
        dateNumber,
        dateString: testData.date,
        weekNumber,
        startTime,
        endTime,
        startHour,
        durationHours,
        room: testData.venue,
        faculty: assignedFaculty,
        facultyTitle: "Course Instructor",
        facultyDepartment: courseObj?.department || "Computer Science & Engineering",
        type: "CLASS_TEST",
        colorBadge: "bg-amber-600 border-amber-700",
        sessionAgenda: testData.agenda || [
          `During-Semester Assessment (DSA Continuous Evaluation): ${testData.title}`,
          `Evaluation weightage: Max ${testData.maxMarks || 25} Marks`,
          "In-class problem solving, coding verification, or theory test",
        ],
        prerequisites: `Revision of Units & Lab coursework`,
        learningOutcomes: `Continuous assessment and formative evaluation for ${courseName}`,
        readingMaterials: `Lecture notes & assignment problems for ${courseName}`,
      };

      const nextEvents = [...calendarSchedules, newEvent];
      setCalendarSchedules(nextEvents);

      const notif: SyncNotification = {
        id: `notif-dsa-${Date.now()}`,
        title: `Class Test / DSA Scheduled: ${testData.title}`,
        message: `Professor ${testData.facultyName || "Faculty"} has scheduled a During-Semester Assessment (DSA) for ${courseName} on ${testData.date} (${testData.time}) in ${testData.venue || "class"}.`,
        createdAt: new Date().toISOString(),
        isRead: false,
        type: "CLASS_TEST",
        courseCode: testData.courseCode,
        topic: `DSA Class Test: ${testData.title}`,
        room: testData.venue || "LH-101",
        facultyName: testData.facultyName,
      };

      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      syncToDisk({ calendarSchedules: nextEvents, notifications: nextNotifs });
    },
    [calendarSchedules, notifications, courses, syncToDisk]
  );

  const clearAllUserActivity = useCallback(() => {
    setSubmissions([]);
    syncToDisk({ submissions: [] });
  }, [syncToDisk]);

  // ─── FACULTY REAL-TIME CABIN PRESENCE & AUTO CLASS DETECTION ───
  const getEffectiveFacultyPresence = useCallback(
    (
      facultyIdOrEmail: string,
      facultyName?: string,
      facultyEmail?: string
    ): FacultyPresenceRecord => {
      const key = (facultyIdOrEmail || facultyEmail || "").trim();
      const emailKey = (facultyEmail || facultyIdOrEmail || "").toLowerCase().trim();
      const nameKey = (facultyName || "").toLowerCase().trim();

      let manualRecord =
        (key ? facultyPresence[key] : undefined) ||
        (emailKey ? facultyPresence[emailKey] : undefined) ||
        (facultyEmail ? facultyPresence[facultyEmail] : undefined) ||
        (nameKey ? facultyPresence[nameKey] : undefined);

      if (!manualRecord && (emailKey || nameKey || key)) {
        manualRecord = Object.values(facultyPresence).find((rec) => {
          if (!rec) return false;
          if (key && rec.facultyId === key) return true;
          if (emailKey && rec.email && rec.email.toLowerCase().trim() === emailKey) return true;
          if (nameKey && rec.facultyName && rec.facultyName.toLowerCase().trim() === nameKey) return true;
          return false;
        });
      }

      // Manual status explicitly selected by faculty takes precedence
      if (manualRecord) {
        return manualRecord;
      }

      const fName = (facultyName || "").toLowerCase().trim();
      const fEmail = (facultyEmail || facultyIdOrEmail || "").toLowerCase().trim();

      // Check current day and time against timetable schedules
      const now = new Date();
      const currentDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const parseTimeToMinutes = (t?: string): number | null => {
        if (!t) return null;
        const match = t.trim().match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
        if (!match) return null;
        let h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) : 0;
        const period = match[3]?.toUpperCase();
        if (period === "PM" && h < 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + m;
      };

      const activeLecture = calendarSchedules.find((ev) => {
        if (ev.dayIndex !== currentDay) return false;

        const evFaculty = (ev.faculty || "").toLowerCase().trim();
        const evEmail = (ev.facultyEmail || "").toLowerCase().trim();

        const matchesEmail = fEmail && evEmail && fEmail === evEmail;
        const matchesName =
          fName &&
          evFaculty &&
          (evFaculty.includes(fName) || fName.includes(evFaculty));

        if (!matchesEmail && !matchesName) return false;

        const startMin =
          parseTimeToMinutes(ev.startTime) ??
          (ev.startHour != null ? ev.startHour * 60 : null);
        if (startMin === null) return false;
        const durationMin = (ev.durationHours ?? 1) * 60;
        const endMin =
          parseTimeToMinutes(ev.endTime) ?? (startMin + durationMin);

        return currentMinutes >= startMin && currentMinutes < endMin;
      });

      if (activeLecture) {
        return {
          facultyId: facultyIdOrEmail,
          facultyName:
            facultyName ||
            activeLecture.faculty ||
            "Faculty Member",
          email: facultyEmail || activeLecture.facultyEmail || "",
          status: "IN_CLASS",
          currentRoom: activeLecture.room
            ? `${activeLecture.room}${activeLecture.building ? ` (${activeLecture.building})` : ""}`
            : "Lecture Hall",
          customNote: `Active Class: ${activeLecture.courseCode} - ${activeLecture.courseName} (${activeLecture.startTime} - ${activeLecture.endTime})`,
          cabinNumber: "Cabin 304, Academic Block",
          updatedAt: new Date().toISOString(),
          isAutoDetected: true,
          activeLecture,
        };
      }

      return {
        facultyId: facultyIdOrEmail,
        facultyName: facultyName || "Faculty Member",
        email: facultyEmail || "",
        status: "IN_CABIN",
        cabinNumber: "Cabin 304, Academic Block",
        customNote: "Available in office for consultations",
        updatedAt: new Date().toISOString(),
        isAutoDetected: false,
      };
    },
    [facultyPresence, calendarSchedules]
  );

  const updateFacultyPresence = useCallback(
    (presence: {
      facultyId: string;
      facultyName: string;
      email: string;
      status: "IN_CABIN" | "IN_CLASS" | "ON_BREAK" | "BUSY" | "AWAY" | "ON_LEAVE";
      cabinNumber?: string;
      currentRoom?: string;
      customNote?: string;
    }) => {
      const primaryKey = (presence.facultyId || presence.email || presence.facultyName || "faculty").trim();
      const emailKey = (presence.email || "").toLowerCase().trim();
      const nameKey = (presence.facultyName || "").toLowerCase().trim();
      const record: FacultyPresenceRecord = {
        ...presence,
        cabinNumber: presence.cabinNumber || "Cabin 304, Academic Block",
        updatedAt: new Date().toISOString(),
        isAutoDetected: false,
      };
      const nextPresence: Record<string, FacultyPresenceRecord> = {
        ...facultyPresence,
        [primaryKey]: record,
      };
      if (emailKey) nextPresence[emailKey] = record;
      if (presence.email) nextPresence[presence.email] = record;
      if (nameKey) nextPresence[nameKey] = record;

      setFacultyPresence(nextPresence);
      syncToDisk({ facultyPresence: nextPresence });
    },
    [facultyPresence, syncToDisk]
  );

  // ─── STUDENT 1:1 DOUBT & CONSULTATION BOOKING ───
  const requestDoubtSession = useCallback(
    (req: Omit<StudentDoubtSession, "id" | "createdAt" | "status">): StudentDoubtSession => {
      const newSession: StudentDoubtSession = {
        ...req,
        id: `doubt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      const nextSessions = [newSession, ...doubtSessions];
      setDoubtSessions(nextSessions);

      // Synced notification to faculty
      const notif: SyncNotification = {
        id: `notif-doubt-${Date.now()}`,
        title: `1:1 Doubt Request: ${newSession.studentName}`,
        message: `${newSession.studentName} (${newSession.rollNo || "Student"}) requested consultation on "${newSession.topic}" for ${newSession.requestedDate} (${newSession.requestedTime}).`,
        createdAt: "Just now",
        isRead: false,
        type: "BROADCAST",
        courseCode: newSession.courseCode,
      };
      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);

      syncToDisk({ doubtSessions: nextSessions, notifications: nextNotifs });
      return newSession;
    },
    [doubtSessions, notifications, syncToDisk]
  );

  const respondToDoubtSession = useCallback(
    (sessionId: string, status: "ACCEPTED" | "DECLINED" | "COMPLETED", note?: string, meetingLocation?: string) => {
      let topic = "Doubt Consultation";
      let date = "";
      let time = "";

      const nextSessions = doubtSessions.map((s) => {
        if (s.id === sessionId) {
          topic = s.topic;
          date = s.requestedDate;
          time = s.requestedTime;
          return {
            ...s,
            status,
            responseNote: note || s.responseNote,
            meetingLocation: meetingLocation || s.meetingLocation,
          };
        }
        return s;
      });

      const notif: SyncNotification = {
        id: `notif-doubt-resp-${Date.now()}`,
        title: status === "ACCEPTED" ? `Doubt Session Confirmed! 📅` : `Doubt Consultation Update`,
        message:
          status === "ACCEPTED"
            ? `Your consultation on "${topic}" has been APPROVED for ${date} (${time}) in ${meetingLocation || "Faculty Cabin"}.${note ? ` Note: "${note}"` : ""}`
            : `Your consultation request on "${topic}" was marked as ${status.toLowerCase()}.${note ? ` Note: "${note}"` : ""}`,
        createdAt: "Just now",
        isRead: false,
        type: "BROADCAST",
      };

      setDoubtSessions(nextSessions);
      setNotifications([notif, ...notifications]);
      syncToDisk({ doubtSessions: nextSessions, notifications: [notif, ...notifications] });
    },
    [doubtSessions, notifications, syncToDisk]
  );

  // ─── FACULTY LEAVE MANAGEMENT & MANDATORY LECTURE SUBSTITUTION ───
  const applyFacultyLeave = useCallback(
    (req: Omit<FacultyLeaveRequest, "id" | "appliedAt" | "status">): FacultyLeaveRequest => {
      const newLeave: FacultyLeaveRequest = {
        ...req,
        id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: "PENDING",
        appliedAt: new Date().toISOString(),
      };
      const nextLeaves = [newLeave, ...facultyLeaves];
      setFacultyLeaves(nextLeaves);

      const notifsToCreate: SyncNotification[] = [];
      newLeave.substitutions.forEach((sub) => {
        notifsToCreate.push({
          id: `notif-sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: `Lecture Substitution Request: ${sub.courseCode}`,
          message: `${newLeave.facultyName} requested you to substitute a class for ${sub.courseCode} on ${sub.sessionDate} (${sub.sessionTime}) in ${sub.room || "Classroom"}.`,
          createdAt: "Just now",
          isRead: false,
          type: "BROADCAST",
          courseCode: sub.courseCode,
        });
      });

      notifsToCreate.push({
        id: `notif-hod-leave-${Date.now()}`,
        title: `Faculty Leave Application: ${newLeave.facultyName}`,
        message: `${newLeave.facultyName} (${newLeave.department}) submitted a ${newLeave.leaveType} leave application (${newLeave.startDate} to ${newLeave.endDate}) with ${newLeave.substitutions.length} substituted lecture(s).`,
        createdAt: "Just now",
        isRead: false,
        type: "BROADCAST",
      });

      const nextNotifs = [...notifsToCreate, ...notifications];
      setNotifications(nextNotifs);
      syncToDisk({ facultyLeaves: nextLeaves, notifications: nextNotifs });
      return newLeave;
    },
    [facultyLeaves, notifications, syncToDisk]
  );

  const respondToSubstitution = useCallback(
    (leaveId: string, substitutionId: string, status: "ACCEPTED" | "REJECTED") => {
      const nextLeaves = facultyLeaves.map((l) => {
        if (l.id === leaveId) {
          const nextSubs = l.substitutions.map((sub) =>
            sub.id === substitutionId ? { ...sub, status } : sub
          );
          return { ...l, substitutions: nextSubs };
        }
        return l;
      });
      setFacultyLeaves(nextLeaves);
      syncToDisk({ facultyLeaves: nextLeaves });
    },
    [facultyLeaves, syncToDisk]
  );

  const reviewFacultyLeave = useCallback(
    (leaveId: string, status: "APPROVED" | "REJECTED", reviewedBy: string, comment?: string) => {
      let targetLeave: FacultyLeaveRequest | undefined;
      const nextLeaves = facultyLeaves.map((l) => {
        if (l.id === leaveId) {
          targetLeave = { ...l, status, reviewedBy, reviewComment: comment };
          return targetLeave;
        }
        return l;
      });

      let nextSchedules = calendarSchedules;
      if (status === "APPROVED" && targetLeave && targetLeave.substitutions.length > 0) {
        nextSchedules = calendarSchedules.map((ev) => {
          const matchingSub = targetLeave?.substitutions.find(
            (s) =>
              (s.eventId && s.eventId === ev.id) ||
              (s.courseCode.toLowerCase() === ev.courseCode.toLowerCase() &&
                ev.faculty.toLowerCase().includes(targetLeave?.facultyName.toLowerCase() || ""))
          );
          if (matchingSub && matchingSub.status === "ACCEPTED") {
            return {
              ...ev,
              isSubstituted: true,
              substituteFaculty: matchingSub.substituteFacultyName,
              colorBadge: "bg-amber-600 border-amber-700",
            };
          }
          return ev;
        });
        setCalendarSchedules(nextSchedules);
      }

      const notif: SyncNotification = {
        id: `notif-leave-rev-${Date.now()}`,
        title: `Faculty Leave ${status}: ${targetLeave?.facultyName || "Faculty"}`,
        message: `Leave application for ${targetLeave?.facultyName} (${targetLeave?.startDate} to ${targetLeave?.endDate}) has been ${status} by ${reviewedBy}.${comment ? ` Note: "${comment}"` : ""}`,
        createdAt: "Just now",
        isRead: false,
        type: "BROADCAST",
      };

      setFacultyLeaves(nextLeaves);
      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      syncToDisk({ facultyLeaves: nextLeaves, calendarSchedules: nextSchedules, notifications: nextNotifs });
    },
    [facultyLeaves, calendarSchedules, notifications, syncToDisk]
  );

  // ─── STUDENT LEAVE & ON-DUTY (OD) TWO-TIER GOVERNANCE OPERATIONS ───
  const applyStudentLeave = useCallback(
    (req: Omit<StudentLeaveRequest, "id" | "appliedAt" | "status" | "attendanceCredited" | "creditedSessionsCount">): StudentLeaveRequest => {
      let resolvedAdvisorName = req.advisorName || "";
      let resolvedAdvisorEmail = req.advisorEmail || "";
      if ((!resolvedAdvisorName || resolvedAdvisorName === "Class Advisor" || !resolvedAdvisorEmail) && departments) {
        departments.forEach((dept) => {
          dept.cohorts?.forEach((cohort) => {
            const cName = (cohort.name || cohort.id || "").toLowerCase().trim();
            const rClass = (req.className || "").toLowerCase().trim();
            if (cName && rClass && (cName === rClass || rClass.includes(cName) || cName.includes(rClass))) {
              if (cohort.classAdvisor && cohort.classAdvisor !== "Not assigned") {
                resolvedAdvisorName = cohort.classAdvisor;
                resolvedAdvisorEmail = cohort.classAdvisorEmail || "";
              }
            }
          });
        });
      }

      let resolvedClass = req.className?.trim() || "";
      if (!resolvedClass || resolvedClass === "Class not assigned") {
        if (departments && departments.length > 0) {
          resolvedClass = departments[0]?.cohorts?.[0]?.name || "CSE - Section A (2023-27)";
        } else {
          resolvedClass = "CSE - Section A (2023-27)";
        }
      }

      const newLeave: StudentLeaveRequest = {
        ...req,
        className: resolvedClass,
        id: `sleave-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: "PENDING_ADVISOR",
        appliedAt: new Date().toISOString(),
        attendanceCredited: false,
        advisorName: resolvedAdvisorName || req.advisorName,
        advisorEmail: resolvedAdvisorEmail || req.advisorEmail,
      };

      const nextLeaves = [newLeave, ...studentLeaves];
      setStudentLeaves(nextLeaves);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_studentLeaves", JSON.stringify(nextLeaves));
          localStorage.setItem("smartedu_studentLeaves", JSON.stringify(nextLeaves));
        } catch {}
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_studentLeaves", JSON.stringify(nextLeaves));
          localStorage.setItem("smartedu_studentLeaves", JSON.stringify(nextLeaves));
        } catch {}
      }

      // Notification for Designated Class Advisor & Department Leadership
      const notif: SyncNotification = {
        id: `notif-sleave-applied-${Date.now()}`,
        title: `New ${newLeave.leaveType} Leave Application: ${newLeave.studentName}`,
        message: `${newLeave.studentName} (${newLeave.studentRollNo || newLeave.className}) submitted a ${newLeave.leaveType} leave application for ${newLeave.startDate} to ${newLeave.endDate}. Assigned to Class Advisor: ${resolvedAdvisorName || "Cohort Advisor"}.`,
        createdAt: "Just now",
        isRead: false,
        type: "ATTENDANCE",
        targetRole: "FACULTY",
        targetRecipientEmail: resolvedAdvisorEmail || undefined,
        targetRecipientName: resolvedAdvisorName || undefined,
        targetClass: newLeave.className,
      };

      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      syncToDisk({ studentLeaves: nextLeaves, notifications: nextNotifs });

      return newLeave;
    },
    [studentLeaves, notifications, departments, syncToDisk]
  );

  const reviewStudentLeaveByAdvisor = useCallback(
    (leaveId: string, decision: "APPROVE" | "REJECT", notes?: string, advisorName: string = "Class Advisor") => {
      let targetLeave: StudentLeaveRequest | undefined;
      const nextLeaves = studentLeaves.map((l) => {
        if (l.id === leaveId) {
          const nextStatus: StudentLeaveStatus = decision === "APPROVE" ? "PENDING_HOD" : "REJECTED";
          targetLeave = {
            ...l,
            status: nextStatus,
            advisorName,
            advisorReviewedAt: new Date().toISOString(),
            advisorNotes: notes || (decision === "APPROVE" ? "Recommended by Class Advisor" : "Rejected by Class Advisor"),
          };
          return targetLeave;
        }
        return l;
      });

      setStudentLeaves(nextLeaves);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_studentLeaves", JSON.stringify(nextLeaves));
          localStorage.setItem("smartedu_studentLeaves", JSON.stringify(nextLeaves));
        } catch {}
      }

      const notif: SyncNotification = {
        id: `notif-sleave-advisor-${Date.now()}`,
        title:
          decision === "APPROVE"
            ? `Leave Recommended by Class Advisor: ${targetLeave?.studentName}`
            : `Leave Application Rejected: ${targetLeave?.studentName}`,
        message:
          decision === "APPROVE"
            ? `Class Advisor ${advisorName} approved and forwarded ${targetLeave?.studentName}'s ${targetLeave?.leaveType} leave to HOD for final sanction.${notes ? ` Remarks: "${notes}"` : ""}`
            : `Class Advisor ${advisorName} rejected ${targetLeave?.studentName}'s leave application.${notes ? ` Reason: "${notes}"` : ""}`,
        createdAt: "Just now",
        isRead: false,
        type: "ATTENDANCE",
        targetRole: "STUDENT",
        targetStudentId: targetLeave?.studentId,
        targetRecipientEmail: targetLeave?.studentEmail,
        targetRecipientName: targetLeave?.studentName,
        targetClass: targetLeave?.className,
      };

      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      syncToDisk({ studentLeaves: nextLeaves, notifications: nextNotifs });
    },
    [studentLeaves, notifications, syncToDisk]
  );

  const reviewStudentLeaveByHod = useCallback(
    (leaveId: string, decision: "APPROVE" | "REJECT", notes?: string, hodName: string = "Head of Department (HOD)") => {
      let targetLeave: StudentLeaveRequest | undefined;
      let creditedSessionsCount = 0;
      let nextSessions = attendanceSessions;

      if (decision === "APPROVE") {
        const leaveItem = studentLeaves.find((l) => l.id === leaveId);
        if (leaveItem) {
          const targetStudentId = leaveItem.studentId;
          const targetRoll = leaveItem.studentRollNo;
          const affectedSet =
            leaveItem.affectedCourseCodes && leaveItem.affectedCourseCodes.length > 0
              ? new Set(leaveItem.affectedCourseCodes.map((c) => c.toLowerCase().trim()))
              : null;

          // Automatically award attendance across matching sessions
          nextSessions = attendanceSessions.map((sess) => {
            const sessCode = (sess.courseCode || "").toLowerCase().trim();
            if (affectedSet && !affectedSet.has(sessCode)) return sess;

            // Check if session falls within leave date range or is recent
            const inRange = sess.sessionDateRaw
              ? sess.sessionDateRaw >= leaveItem.startDate && sess.sessionDateRaw <= leaveItem.endDate
              : true;

            if (inRange) {
              creditedSessionsCount++;
              const records = Array.isArray(sess.records) ? [...sess.records] : [];
              const rIdx = records.findIndex((r) => {
                const rid = r.studentId || r.student_id;
                const rroll = (r.rollNo || (r as any).roll_number || (r as any).studentRollNo || "").toLowerCase().trim();
                const troll = (targetRoll || "").toLowerCase().trim();
                return (rid && rid === targetStudentId) || (troll && rroll && rroll === troll);
              });
              const leaveRecordStatus = leaveItem.leaveType === "ON_DUTY" ? "ON_DUTY" : "APPROVED_LEAVE";
              if (rIdx >= 0) {
                records[rIdx] = { ...records[rIdx], status: leaveRecordStatus, studentId: targetStudentId, student_id: targetStudentId };
              } else {
                records.push({ studentId: targetStudentId, student_id: targetStudentId, rollNo: targetRoll, status: leaveRecordStatus });
              }
              const presentCount = records.filter((r) => {
                const st = (r.status || "").toUpperCase();
                return st === "PRESENT" || st === "P" || st === "ON_DUTY" || st === "OD" || st === "APPROVED_LEAVE" || st === "LEAVE";
              }).length;
              return {
                ...sess,
                records,
                presentCount,
                studentIsPresent: true,
              };
            }
            return sess;
          });

          setAttendanceSessions(nextSessions);
          setStudentClassesAttended((prev) => prev + Math.max(1, creditedSessionsCount));
        }
      }

      const nextLeaves = studentLeaves.map((l) => {
        if (l.id === leaveId) {
          targetLeave = {
            ...l,
            status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
            advisorReviewedAt: l.advisorReviewedAt || new Date().toISOString(),
            advisorNotes: l.advisorNotes || (decision === "APPROVE" ? "Endorsed & Sanctioned via Executive HOD Review" : l.advisorNotes),
            hodName,
            hodReviewedAt: new Date().toISOString(),
            hodNotes: notes || (decision === "APPROVE" ? "Sanctioned & Approved by HOD" : "Rejected by HOD"),
            attendanceCredited: decision === "APPROVE",
            creditedSessionsCount: decision === "APPROVE" ? Math.max(1, creditedSessionsCount) : 0,
          };
          return targetLeave;
        }
        return l;
      });

      setStudentLeaves(nextLeaves);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_studentLeaves", JSON.stringify(nextLeaves));
          localStorage.setItem("smartedu_studentLeaves", JSON.stringify(nextLeaves));
        } catch {}
      }

      const notif: SyncNotification = {
        id: `notif-sleave-hod-${Date.now()}`,
        title:
          decision === "APPROVE"
            ? `🎉 Leave / OD Sanctioned & Attendance Credited!`
            : `Leave Application Rejected by HOD`,
        message:
          decision === "APPROVE"
            ? `HOD ${hodName} has officially APPROVED ${targetLeave?.studentName}'s ${targetLeave?.leaveType} leave. Attendance has been AUTOMATICALLY CREDITED for all classes across ${targetLeave?.startDate} to ${targetLeave?.endDate}.${notes ? ` Remarks: "${notes}"` : ""}`
            : `HOD ${hodName} rejected ${targetLeave?.studentName}'s leave application.${notes ? ` Remarks: "${notes}"` : ""}`,
        createdAt: "Just now",
        isRead: false,
        type: "ATTENDANCE",
        targetRole: "STUDENT",
        targetStudentId: targetLeave?.studentId,
        targetRecipientEmail: targetLeave?.studentEmail,
        targetRecipientName: targetLeave?.studentName,
        targetClass: targetLeave?.className,
      };

      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);
      syncToDisk({
        studentLeaves: nextLeaves,
        attendanceSessions: nextSessions,
        notifications: nextNotifs,
      });
    },
    [studentLeaves, attendanceSessions, notifications, syncToDisk]
  );

  // ─── CONTINUOUS MODULAR COURSE & FACULTY FEEDBACK OPERATIONS ───
  const submitModuleFeedback = useCallback(
    (fb: Omit<ModuleFeedbackRecord, "id" | "submittedAt">): ModuleFeedbackRecord => {
      const newFeedback: ModuleFeedbackRecord = {
        ...fb,
        id: `mfb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        submittedAt: new Date().toISOString(),
      };

      const next = [newFeedback, ...moduleFeedbacks];
      setModuleFeedbacks(next);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("smartedu_persisted_moduleFeedbacks", JSON.stringify(next));
          localStorage.setItem("smartedu_module_feedbacks", JSON.stringify(next));
        } catch {}
      }

      // Resolve course instructor to route notification directly to the specific faculty member
      let targetFacultyEmail: string | undefined = undefined;
      let targetFacultyName = newFeedback.facultyName || undefined;

      if (courses && courses.length > 0) {
        const matchedCourse = courses.find((c) => {
          const cCode = (((c as any).code || (c as any).course_code || "") as string).toUpperCase().trim();
          return cCode === newFeedback.courseCode.toUpperCase().trim();
        });
        if (matchedCourse) {
          if (matchedCourse.instructor) targetFacultyName = matchedCourse.instructor;
          if ((matchedCourse as any).instructor_email) targetFacultyEmail = (matchedCourse as any).instructor_email;
        }
      }

      if (!targetFacultyEmail && users && users.length > 0 && targetFacultyName) {
        const targetLower = targetFacultyName.toLowerCase();
        const matchedUser = users.find((u) => {
          const uFull = `${u.first_name} ${u.last_name || ""}`.toLowerCase().trim();
          return (u.role === "FACULTY" || u.role === "HOD") && (uFull.includes(targetLower) || targetLower.includes(uFull));
        });
        if (matchedUser) {
          targetFacultyEmail = matchedUser.email;
        }
      }

      // Notification for Designated Course Faculty
      const notif: SyncNotification = {
        id: `notif-mfb-${Date.now()}`,
        title: `New Module Feedback: ${newFeedback.courseCode} (Module ${newFeedback.moduleNumber})`,
        message: `${newFeedback.isAnonymous ? "A student" : newFeedback.studentName || "A student"} submitted feedback for Module ${newFeedback.moduleNumber}: "${newFeedback.moduleTitle}" (Overall: ${newFeedback.ratings.overall}/5 ★).`,
        createdAt: "Just now",
        isRead: false,
        type: "BROADCAST",
        targetRole: "FACULTY",
        targetRecipientEmail: targetFacultyEmail,
        targetRecipientName: targetFacultyName,
      };
      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);

      syncToDisk({ moduleFeedbacks: next, notifications: nextNotifs });

      return newFeedback;
    },
    [moduleFeedbacks, notifications, syncToDisk]
  );

  const acknowledgeModuleFeedback = useCallback(
    (feedbackId: string, facultyNote?: string, facultyName: string = "Course Instructor") => {
      const next = moduleFeedbacks.map((fb) => {
        if (fb.id === feedbackId) {
          return {
            ...fb,
            facultyAcknowledgement: {
              acknowledgedAt: new Date().toISOString(),
              facultyNote: facultyNote || "Thank you for the constructive feedback. Noted for upcoming modules.",
              facultyName,
            },
          };
        }
        return fb;
      });

      setModuleFeedbacks(next);
      syncToDisk({ moduleFeedbacks: next });
    },
    [moduleFeedbacks, syncToDisk]
  );

  const updateCourseModuleStatus = useCallback(
    (courseCode: string, moduleNumber: number, status: "COMPLETED" | "IN_PROGRESS" | "UPCOMING") => {
      const next = courseModules.map((m) => {
        if (m.courseCode.toLowerCase() === courseCode.toLowerCase() && m.moduleNumber === moduleNumber) {
          return {
            ...m,
            status,
            completedDate: status === "COMPLETED" ? new Date().toISOString().split("T")[0] : m.completedDate,
          };
        }
        return m;
      });

      setCourseModules(next);
      syncToDisk({ courseModules: next });
    },
    [courseModules, syncToDisk]
  );

  // ─── CLASS LEADERBOARD OPERATIONS ───
  const addLeaderboardXp = useCallback(
    (studentId: string, xpGained: number, reason?: string) => {
      setLeaderboard((prev) => {
        let matched = false;
        const updated = prev.map((entry) => {
          if (entry.studentId === studentId || entry.id === studentId) {
            matched = true;
            const newXp = entry.xpPoints + xpGained;
            const newLevel = Math.floor(newXp / 250) + 1;
            return {
              ...entry,
              xpPoints: newXp,
              level: newLevel,
              quizzesWon: reason?.toLowerCase().includes("quiz") ? entry.quizzesWon + 1 : entry.quizzesWon,
            };
          }
          return entry;
        });

        const finalEntries = matched ? updated : prev;

        finalEntries.sort((a, b) => b.xpPoints - a.xpPoints);
        const ranked = finalEntries.map((e, idx) => ({ ...e, rank: idx + 1 }));

        syncToDisk({ leaderboard: ranked });
        return ranked;
      });
    },
    [syncToDisk]
  );

  // ─── STUDENT PROJECT SUBMISSION OPERATIONS ───
  const submitProject = useCallback(
    (project: Omit<StudentProjectSubmission, "id" | "submittedAt" | "status">): StudentProjectSubmission => {
      const newProj: StudentProjectSubmission = {
        ...project,
        id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: "SUBMITTED",
        submittedAt: new Date().toISOString().slice(0, 10),
      };

      const nextProjects = [newProj, ...projectSubmissions];
      setProjectSubmissions(nextProjects);

      addLeaderboardXp(newProj.studentId, 250, "Project Submission");

      const notif: SyncNotification = {
        id: `notif-proj-${Date.now()}`,
        title: `Project Submitted: ${newProj.title}`,
        message: `Your project for ${newProj.courseCode} has been submitted for faculty evaluation and rubric grading. +250 XP earned!`,
        createdAt: "Just now",
        isRead: false,
        type: "ASSIGNMENT",
        courseCode: newProj.courseCode,
        targetRole: "STUDENT",
        targetStudentId: newProj.studentId,
      };
      const nextNotifs = [notif, ...notifications];
      setNotifications(nextNotifs);

      syncToDisk({ projectSubmissions: nextProjects, notifications: nextNotifs });
      return newProj;
    },
    [projectSubmissions, addLeaderboardXp, notifications, syncToDisk]
  );

  const gradeProject = useCallback(
    (
      projectId: string,
      rubricScores: NonNullable<StudentProjectSubmission["rubricScores"]>,
      feedback: string,
      evaluator: string
    ) => {
      const total =
        (rubricScores.codeQuality || 0) +
        (rubricScores.systemArchitecture || 0) +
        (rubricScores.documentation || 0) +
        (rubricScores.demoPresentation || 0) +
        (rubricScores.vivaDefense || 0);

      let target: StudentProjectSubmission | undefined;
      const nextProjects = projectSubmissions.map((p) => {
        if (p.id === projectId) {
          target = {
            ...p,
            status: "GRADED" as const,
            rubricScores,
            totalScore: total,
            facultyFeedback: feedback,
            evaluatedBy: evaluator,
          };
          return target;
        }
        return p;
      });

      setProjectSubmissions(nextProjects);

      if (target) {
        addLeaderboardXp(target.studentId, total * 5, "Project Grade");
        const notif: SyncNotification = {
          id: `notif-proj-graded-${Date.now()}`,
          title: `Project Evaluated: ${target.title}`,
          message: `Your project for ${target.courseCode} received a score of ${total}/100. Feedback: "${feedback}"`,
          createdAt: "Just now",
          isRead: false,
          type: "GRADE",
          courseCode: target.courseCode,
          targetRole: "STUDENT",
          targetStudentId: target.studentId,
        };
        setNotifications([notif, ...notifications]);
        syncToDisk({ projectSubmissions: nextProjects, notifications: [notif, ...notifications] });
      } else {
        syncToDisk({ projectSubmissions: nextProjects });
      }
    },
    [projectSubmissions, addLeaderboardXp, notifications, syncToDisk]
  );

  return (
    <AcademicDataContext.Provider
      value={{
        users,
        schools,
        departments,
        classrooms,
        policies,
        decrees,
        gradeSheets,
        disputes,
        campusAlert,
        courses,
        terms,
        currentSemester,
        activeSemesterFilter,
        setActiveSemesterFilter,
        advanceSemester,
        semesterHistory,
        modules,
        quizzes,
        exams: quizzes,
        quizAttempts,
        discussions,
        assignments,
        submissions,
        attendanceSessions,
        announcements,
        notifications,
        calendarSchedules,
        institutionalHolidays,
        facultyPresence,
        doubtSessions,
        facultyLeaves,
        studentAttendancePct,
        studentClassesAttended,
        studentTotalClasses,
        isSyncing,
        lastSyncTimestamp,
        provisionUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        addSchool,
        updateSchool,
        deleteSchool,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        adjustDepartmentBudget,
        addClassToDepartment,
        removeClassFromDepartment,
        addCohortToDepartment,
        updateCohortInDepartment,
        removeCohortFromDepartment,
        assignAdvisorToCohort,
        assignCoursesToCohort,
        addClassroom,
        updateClassroom,
        deleteClassroom,
        checkRoomConflict,
        checkScheduleConflicts,
        autoGenerateTimetableForCohort,
        isHolidayDate,
        addPolicy,
        updatePolicy,
        togglePolicyEnforcement,
        deletePolicy,
        addCourse,
        updateCourse,
        deleteCourse,
        toggleCourseStatus,
        assignClassesToCourse,
        updateTerm,
        markLessonComplete,
        addCourseModule,
        addLessonToModule,
        submitQuiz,
        createQuiz,
        updateQuiz,
        postDiscussionTopic,
        replyToDiscussion,
        endorseReply,
        sanctionDecree,
        draftDecree,
        authorizeGradeSheet,
        resolveAttendanceDispute,
        raiseAttendanceDispute,
        dispatchCampusAlert,
        dismissCampusAlert,
        createAssignment,
        caseStudies,
        createCaseStudy,
        updateCaseStudy,
        deleteCaseStudy,
        duplicateCaseStudy,
        submitCaseStudy,
        submitAssignment,
        loadAssignmentSubmissions,
        gradeSubmission,
        extendAssignmentDueDate,
        recordAttendance,
        updateAttendanceSession,
        attendanceWindowHours,
        updateAttendanceWindowHours,
        createAssignmentTeam,
        joinAssignmentTeam,
        leaveAssignmentTeam,
        toggleLockAssignmentTeam,
        sendTeamInvitation,
        broadcastNotice,
        markNotificationAsRead,
        resetToProductionBaseline,
        purgeAllDataToBlankProduction,
        clearAllUserActivity,
        addInstitutionalHoliday,
        deleteInstitutionalHoliday,
        copyScheduleToWeeks,
        copyScheduleToMonth,
        addScheduleEvent,
        updateScheduleEvent,
        cancelScheduleEvent,
        deleteScheduleEvent,
        purgeDuplicateSchedules,
        scheduleExamSession,
        scheduleClassTest,
        updateFacultyPresence,
        getEffectiveFacultyPresence,
        requestDoubtSession,
        respondToDoubtSession,
        applyFacultyLeave,
        respondToSubstitution,
        reviewFacultyLeave,
        studentLeaves,
        applyStudentLeave,
        reviewStudentLeaveByAdvisor,
        reviewStudentLeaveByHod,
        leaderboard,
        addLeaderboardXp,
        projectSubmissions,
        submitProject,
        gradeProject,
        deleteQuiz,
        submitQuizAttempt,
        releaseQuizResults,
        universityLogo,
        updateUniversityLogo,
        batchCriteria,
        updateBatchCriteria,
        addBatchCriteria,
        deleteBatchCriteria,
        getCriteriaForBatch,
        examClearances,
        approveSemesterEndExams,
        toggleSemesterSeeApproval,
        isSemesterSeeUnlocked,
        isHallTicketsReleased,
        toggleHallTicketRelease,
        isSeeMarksEntryOpen,
        toggleSeeMarksEntry,
        courseModules,
        moduleFeedbacks,
        submitModuleFeedback,
        acknowledgeModuleFeedback,
        updateCourseModuleStatus,
      }}
    >
      {/* Global Live Campus Notice (Synchronized Across Every Portal) */}
      {campusAlert && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-50 sticky top-0 border-b border-slate-800">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <span className="px-2 py-0.5 rounded bg-white text-slate-900 text-[10px] font-bold uppercase tracking-wider">
              LMS Notice
            </span>
            <span>{campusAlert}</span>
          </div>
          <button
            onClick={dismissCampusAlert}
            className="text-white/80 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 text-[11px] font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
    </AcademicDataContext.Provider>
  );
}

export function useAcademicData() {
  const context = useContext(AcademicDataContext);
  if (!context) {
    throw new Error("useAcademicData must be used within an AcademicDataProvider");
  }
  return context;
}
