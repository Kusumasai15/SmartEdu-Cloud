// ==============================================================================
// SMARTEDU CLOUD — COMPREHENSIVE TYPESCRIPT DEFINITIONS
// ==============================================================================

export type RoleName = "STUDENT" | "FACULTY" | "HOD" | "VC" | "ADMINISTRATOR" | "EXAMINATION";
export type UserRole = RoleName;

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
}
export type ApiResponse<T = any> = APIResponse<T>;

export interface Role {
  id: string;
  name: RoleName;
  description?: string;
  is_system_role: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  faculty_count?: number;
  student_count?: number;
  course_count?: number;
}

export interface LeadershipOverview {
  departments: Array<{
    id: string;
    name: string;
    code: string;
    school?: string;
    students: number;
    faculty: number;
    courses: number;
    enrollments: number;
    pending_result_courses: number;
  }>;
  result_courses: Array<{
    course_id: string;
    semester_id: string;
    status: "SUBMITTED" | "APPROVED" | "PUBLISHED";
    course_code: string;
    course_name: string;
    department_id: string;
    student_count: number;
    average_gpa: number;
    pass_rate: number;
  }>;
  totals: {
    departments: number;
    students: number;
    faculty: number;
    courses: number;
    enrollments: number;
    pending_result_courses: number;
  };
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  department?: Department | null;
  department_id?: string | null;
  student_identifier?: string | null;
  faculty_identifier?: string | null;
  className?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
}

export type UserProfile = User;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Semester {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current?: boolean;
  academic_year?: string;
  courses_count?: number;
}

export interface Topic {
  id: string;
  module_id: string;
  title: string;
  description?: string | null;
  display_order: number;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  display_order: number;
  topics: Topic[];
}

export interface CourseInstructor {
  id: string;
  course_id: string;
  faculty_id: string;
  faculty_name: string;
  faculty_email: string;
  faculty_identifier?: string | null;
  is_primary: boolean;
}

export interface Course {
  id: string;
  course_code: string;
  name: string;
  description?: string | null;
  credits: number;
  department_id: string;
  department_name?: string | null;
  department_code?: string | null;
  semester_id: string;
  semester_name?: string | null;
  is_active: boolean;
  instructors: CourseInstructor[];
  module_count: number;
  enrolled_count: number;
  level?: string;
}

export type FacultyCourse = Course;

export interface CourseStructure {
  id?: string;
  course_code?: string;
  name?: string;
  credits?: number;
  course?: Course;
  modules: CourseModule[];
}

export interface StudentEnrollment {
  id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  department_code: string;
  semester_name: string;
  status: string;
  enrolled_at: string;
}

export interface EnrolledStudent {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_identifier?: string | null;
  status: string;
  enrolled_at: string;
}

export interface FacultyCourseAnalytics {
  course_id: string;
  total_enrolled: number;
  total_modules: number;
  total_topics: number;
  total_contents: number;
  average_progress_percentage: number;
}

export interface CatalogCourse {
  id: string;
  course_code: string;
  name: string;
  description?: string | null;
  credits: number;
  department_code: string;
  instructors: string[];
  is_enrolled: boolean;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  faculty_count: number;
  student_count: number;
  course_count: number;
}

export interface HODDashboardSummary {
  department: DepartmentSummary;
  total_courses: number;
  total_modules: number;
  total_topics: number;
  total_faculty: number;
  total_students: number;
  total_enrollments: number;
}

export interface InstitutionStats {
  total_departments: number;
  total_active_semesters: number;
  total_courses: number;
  total_faculty: number;
  total_students: number;
  total_enrollments: number;
}

export interface DepartmentMetric {
  id: string;
  name: string;
  code: string;
  faculty_count: number;
  student_count: number;
  course_count: number;
  enrollment_count: number;
}

export interface VCDashboardMetrics {
  institution: InstitutionStats;
  departments: DepartmentMetric[];
}

// LMS Content Types
export type ContentType = "VIDEO" | "PDF" | "TEXT" | "TEXT_CONTENT" | "SLIDES" | "EXTERNAL_LINK" | "DOCUMENT" | "PRESENTATION";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface LearningContent {
  id: string;
  topic_id: string;
  title: string;
  content_type: ContentType;
  description?: string | null;
  content_url?: string | null;
  body_text?: string | null;
  text_content?: string | null;
  duration_minutes?: number | null;
  display_order: number;
  status: ContentStatus;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentWithProgress extends LearningContent {
  is_completed?: boolean;
  progress?: {
    status: ProgressStatus;
    completed_at?: string | null;
    last_position_seconds: number;
    completion_percentage: number;
  } | null;
}

export interface TopicLearningNode {
  id: string;
  module_id: string;
  title: string;
  description?: string | null;
  display_order: number;
  is_topic_completed?: boolean;
  contents: ContentWithProgress[];
}

export interface ModuleLearningNode {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  display_order: number;
  module_progress_percentage?: number;
  completed_contents_count?: number;
  topics: TopicLearningNode[];
}

export interface CourseLearningTree {
  course_id: string;
  course_name: string;
  course_code: string;
  title?: string;
  course_title?: string;
  total_contents: number;
  completed_contents: number;
  total_completed_contents?: number;
  total_published_contents?: number;
  overall_progress_percentage: number;
  course_progress_percentage?: number;
  instructor_name?: string | null;
  instructor_designation?: string | null;
  modules: ModuleLearningNode[];
}

export type CourseLearningView = CourseLearningTree;
export type ModuleLearningView = ModuleLearningNode;
export type TopicLearningView = TopicLearningNode;
export type LearningContentViewWithProgress = ContentWithProgress;

// Assignment Types
export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
export type SubmissionStatus = "SUBMITTED" | "GRADED" | "RESUBMITTED" | "RETURNED";

export interface Assignment {
  id: string;
  course_id: string;
  module_id?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  attachment_url?: string | null;
  max_points: number;
  passing_points: number;
  due_date: string;
  allow_late_submission: boolean;
  status: AssignmentStatus;
  results_published: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text?: string | null;
  attachment_url?: string | null;
  submitted_at: string;
  is_late: boolean;
  score?: number | null;
  feedback?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentSubmissionView {
  assignment: Assignment;
  submission?: AssignmentSubmission | null;
  is_submitted: boolean;
  is_graded: boolean;
  is_past_due: boolean;
}

export interface FacultySubmissionRosterRow {
  submission_id?: string | null;
  student_id: string;
  student_name: string;
  student_email: string;
  student_identifier?: string | null;
  submitted_at?: string | null;
  is_submitted: boolean;
  is_late: boolean;
  score?: number | null;
  feedback?: string | null;
  status: string;
}

export interface AssignmentGradingDashboard {
  assignment: Assignment;
  total_enrolled: number;
  total_submitted: number;
  total_graded: number;
  average_score?: number | null;
  highest_score?: number | null;
  lowest_score?: number | null;
  submissions: FacultySubmissionRosterRow[];
}

// ==============================================================================
// PHASE 07 ASSESSMENT, EXAM & PROCTORING TYPES
// ==============================================================================

export type QuestionType = "MCQ_SINGLE" | "MCQ_MULTIPLE" | "TRUE_FALSE" | "SHORT_ANSWER";
export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
export type ExamType = "QUIZ" | "MIDTERM" | "ENDTERM" | "PRACTICE";
export type ProctoringMode = "NONE" | "BASIC_PROCTORED" | "STANDARD_PROCTORED" | "STRICT_PROCTORED";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "EXPIRED" | "EVALUATED";
export type ReviewStatus = "NOT_REVIEWED" | "REVIEW_REQUIRED" | "CLEARED" | "VIOLATION_CONFIRMED";
export type EventSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

export interface QuestionOptionStudentView {
  id: string;
  option_text: string;
  display_order: number;
}

export interface Question {
  id: string;
  course_id: string;
  module_id?: string | null;
  topic_id?: string | null;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  question_text: string;
  points: number;
  negative_points: number;
  explanation?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  options: QuestionOption[];
}

export interface QuestionStudentView {
  id: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  question_text: string;
  points: number;
  display_order: number;
  options: QuestionOptionStudentView[];
}

export interface ProctoringPolicy {
  id: string;
  exam_id: string;
  proctoring_mode: ProctoringMode;
  fullscreen_required: boolean;
  camera_required: boolean;
  microphone_required: boolean;
  screen_share_required: boolean;
  tab_switch_detection: boolean;
  window_blur_detection: boolean;
  copy_paste_prevention: boolean;
  context_menu_disabled: boolean;
  keyboard_shortcut_detection: boolean;
  auto_submit_on_expiry: boolean;
  max_violations_warning: number;
}

export interface Exam {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  exam_type: ExamType;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  start_time?: string | null;
  end_time?: string | null;
  max_attempts: number;
  is_published: boolean;
  results_published: boolean;
  allow_review: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  questions_count: number;
  proctoring_policy?: ProctoringPolicy | null;
}

export interface ExamAttemptStartData {
  attempt_id: string;
  exam_id: string;
  title: string;
  instructions?: string | null;
  duration_minutes: number;
  started_at: string;
  expires_at: string;
  server_time: string;
  questions: QuestionStudentView[];
  saved_answers: Record<string, { selected_option_ids?: string[]; text_answer?: string; saved_at?: string }>;
  proctoring_policy?: ProctoringPolicy | null;
}

export interface ExamAttemptSummary {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at?: string | null;
  status: AttemptStatus;
  score?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  integrity_score: number;
  review_status: ReviewStatus;
  total_marks: number;
  passing_marks: number;
  results_published: boolean;
}

export interface ProctoringEvent {
  id: string;
  attempt_id: string;
  event_type: string;
  severity: EventSeverity;
  timestamp: string;
  duration_seconds?: number | null;
  metadata_json?: string | null;
}

export interface StudentAttemptRosterRow {
  attempt_id?: string | null;
  student_id: string;
  student_name: string;
  student_email: string;
  student_identifier?: string | null;
  attempt_number: number;
  started_at?: string | null;
  submitted_at?: string | null;
  status: string;
  score?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  integrity_score: number;
  review_status: string;
  total_violations_count: number;
  high_violations_count: number;
}

export interface FacultyProctoringDashboard {
  exam: Exam;
  total_enrolled: number;
  total_started: number;
  total_submitted: number;
  total_flagged_for_review: number;
  average_integrity_score: number;
  average_score?: number | null;
  roster: StudentAttemptRosterRow[];
}

// -------------------------------------------------------------
// PHASE 08: TIMETABLE, ATTENDANCE & ENGAGEMENT TYPES
// -------------------------------------------------------------
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
export type ScheduleStatus = "ACTIVE" | "CANCELLED" | "COMPLETED";

export interface ClassSchedule {
  id: string;
  course_id: string;
  course_code?: string | null;
  course_name?: string | null;
  faculty_id: string;
  faculty_name?: string | null;
  section_name?: string | null;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room: string;
  building?: string | null;
  academic_period: string;
  status: ScheduleStatus;
  created_at: string;
}

export type AttendanceSessionStatus = "OPEN" | "CLOSED" | "CANCELLED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name?: string | null;
  student_email?: string | null;
  student_identifier?: string | null;
  status: AttendanceStatus;
  minutes_late: number;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  course_id: string;
  course_code?: string | null;
  course_name?: string | null;
  faculty_id: string;
  faculty_name?: string | null;
  schedule_id?: string | null;
  session_date: string;
  start_time?: string | null;
  end_time?: string | null;
  topic_covered?: string | null;
  status: AttendanceSessionStatus;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  created_at: string;
  updated_at: string;
  records?: AttendanceRecord[];
}

export interface AttendanceCorrection {
  id: string;
  record_id: string;
  session_id?: string | null;
  session_date?: string | null;
  course_code?: string | null;
  course_name?: string | null;
  student_id?: string | null;
  student_name?: string | null;
  original_status: AttendanceStatus;
  requested_status: AttendanceStatus;
  reason: string;
  requested_by: string;
  requester_name?: string | null;
  requested_at?: string | null;
  reviewed_by?: string | null;
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  approval_status: CorrectionStatus;
  created_at: string;
}

export interface CourseAttendanceSummary {
  course_id: string;
  course_code: string;
  course_name: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
  threshold_status: "GOOD" | "WARNING" | "CRITICAL";
  alert_message?: string | null;
}

export interface StudentAttendanceDashboard {
  student_id: string;
  student_name: string;
  overall_percentage: number;
  overall_status: "GOOD" | "WARNING" | "CRITICAL";
  total_sessions: number;
  total_present: number;
  total_absent: number;
  total_late: number;
  total_excused: number;
  courses: CourseAttendanceSummary[];
}

export interface FacultyAttendanceAnalytics {
  course_id: string;
  course_name: string;
  course_code: string;
  total_sessions_conducted: number;
  total_enrolled_students: number;
  average_attendance_percentage: number;
  students_below_warning: number;
  students_below_critical: number;
}

export interface HODDepartmentAttendanceAnalytics {
  department_id: string;
  department_name: string;
  total_courses: number;
  total_students: number;
  average_attendance_percentage: number;
  total_below_warning: number;
  total_below_critical: number;
  pending_corrections_count: number;
  courses_summary: FacultyAttendanceAnalytics[];
}

export interface VCInstitutionAttendanceAnalytics {
  institution_average_percentage: number;
  total_departments: number;
  total_students: number;
  total_below_threshold: number;
  total_sessions_conducted: number;
  department_breakdown: Array<{
    department_id: string;
    department_name: string;
    department_code: string;
    average_attendance: number;
    total_courses: number;
  }>;
}

export interface AcademicEngagementScore {
  student_id: string;
  student_name: string;
  engagement_percentage: number;
  attendance_rate: number;
  assignment_rate: number;
  exam_participation_rate: number;
  rating: "HIGH" | "MODERATE" | "NEEDS_ATTENTION";
}

// -------------------------------------------------------------
// PHASE 09: RESULTS, GRADEBOOK, GPA & TRANSCRIPTS
// -------------------------------------------------------------
export type ResultStatus = "DRAFT" | "CALCULATED" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "LOCKED";
export type AcademicStatus = "PASS" | "FAIL" | "INCOMPLETE" | "WITHHELD" | "ABSENT";
export type CorrectionRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AssessmentComponentType = "ASSIGNMENT" | "QUIZ" | "MIDTERM" | "FINAL_EXAM" | "PROJECT" | "PRESENTATION" | "LAB" | "ATTENDANCE" | "OTHER";

export interface GradeScaleItem {
  id?: string;
  grade: string;
  minimum_percentage: number;
  maximum_percentage: number;
  grade_point: number;
  is_passing: boolean;
  description?: string | null;
}

export interface GradeScale {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  is_default: boolean;
  items: GradeScaleItem[];
}

export interface CourseAssessmentWeight {
  id: string;
  course_id: string;
  semester_id: string;
  component_type: AssessmentComponentType;
  weight_percentage: number;
  minimum_passing_percentage: number;
  is_mandatory: boolean;
}

export interface ResultComponentScore {
  id: string;
  component_type: AssessmentComponentType;
  raw_score: number;
  max_score: number;
  percentage: number;
  weight_percentage: number;
  weighted_score: number;
  is_missing: boolean;
  notes?: string | null;
}

export interface StudentGradebookRow {
  student_id: string;
  student_name: string;
  student_email: string;
  student_identifier?: string | null;
  components: ResultComponentScore[];
  final_percentage: number;
  letter_grade: string;
  grade_point: number;
  credits_earned: number;
  status: ResultStatus;
  academic_status: AcademicStatus;
  missing_components_count: number;
  result_id?: string | null;
}

export interface CourseGradebook {
  course_id: string;
  course_code: string;
  course_name: string;
  semester_id: string;
  semester_name: string;
  total_enrolled: number;
  configured_weights: CourseAssessmentWeight[];
  roster: StudentGradebookRow[];
  overall_status: ResultStatus;
  total_missing_marks: number;
}

export interface CourseResult {
  id: string;
  student_id: string;
  student_name?: string | null;
  student_identifier?: string | null;
  course_id: string;
  course_code?: string | null;
  course_name?: string | null;
  semester_id: string;
  semester_name?: string | null;
  final_percentage: number;
  letter_grade: string;
  grade_point: number;
  credits_earned: number;
  status: ResultStatus;
  academic_status: AcademicStatus;
  submitted_by?: string | null;
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  review_notes?: string | null;
  component_scores?: ResultComponentScore[];
  created_at: string;
}

export interface ResultCorrectionRequest {
  id: string;
  result_id: string;
  student_id: string;
  student_name?: string | null;
  student_identifier?: string | null;
  course_id: string;
  course_code?: string | null;
  course_name?: string | null;
  original_grade: string;
  original_percentage: number;
  requested_grade: string;
  requested_percentage: number;
  reason: string;
  requested_by: string;
  requester_name?: string | null;
  requested_at: string;
  reviewed_by?: string | null;
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  status: CorrectionRequestStatus;
  review_notes?: string | null;
  created_at: string;
}

export interface SemesterTranscriptSection {
  semester_id: string;
  semester_name: string;
  academic_year: string;
  total_credits_registered: number;
  total_credits_earned: number;
  semester_gpa: number;
  courses: CourseResult[];
}

export interface OfficialStudentTranscript {
  student_id: string;
  student_name: string;
  student_email: string;
  student_identifier?: string | null;
  department_name?: string | null;
  program: string;
  cumulative_gpa: number;
  total_credits_registered: number;
  total_credits_earned: number;
  total_courses_passed: number;
  total_courses_failed: number;
  academic_standing: "GOOD_STANDING" | "PROBATION" | "DEAN_LIST" | string;
  semesters: SemesterTranscriptSection[];
  issued_at: string;
}

export interface CourseResultAnalytics {
  course_id: string;
  course_name: string;
  course_code: string;
  total_students: number;
  pass_percentage: number;
  fail_percentage: number;
  average_percentage: number;
  average_gpa: number;
  grade_distribution: Record<string, number>;
  at_risk_students_count: number;
}

export interface DepartmentResultAnalytics {
  department_id: string;
  department_name: string;
  total_students: number;
  total_courses: number;
  department_average_gpa: number;
  department_pass_rate: number;
  pending_approvals_count: number;
  courses_analytics: CourseResultAnalytics[];
}

export interface VCInstitutionResultAnalytics {
  institution_average_gpa: number;
  institution_pass_rate: number;
  total_students_evaluated: number;
  total_courses_completed: number;
  total_at_risk_students: number;
  department_rankings: Array<{
    department_id: string;
    department_name: string;
    department_code: string;
    average_gpa: number;
    pass_rate: number;
    total_courses: number;
  }>;
  grade_distribution_overall: Record<string, number>;
}

// -------------------------------------------------------------
// PHASE 10: ACADEMIC INTELLIGENCE & EARLY-WARNING SYSTEM
// -------------------------------------------------------------
export type AcademicRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PerformanceTrendDirection = "IMPROVING" | "STABLE" | "DECLINING";
export type CourseHealthStatus = "HEALTHY" | "WATCH" | "AT_RISK";

export interface RiskFactorItem {
  factor_name: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  reason: string;
  metric_value: string;
}

export interface StudentPerformanceProfile {
  student_id: string;
  student_name: string;
  student_identifier?: string | null;
  department_name?: string | null;
  current_gpa: number;
  cumulative_gpa: number;
  attendance_percentage: number;
  assignment_completion_rate: number;
  exam_average_percentage: number;
  total_courses_registered: number;
  total_courses_passed: number;
  failed_courses_count: number;
  performance_trend: PerformanceTrendDirection;
  trend_description: string;
  risk_score: number;
  risk_level: AcademicRiskLevel;
  primary_risk_factors: RiskFactorItem[];
  academic_standing: string;
  snapshot_date: string;
}

export interface ActionableRecommendation {
  priority: number;
  title: string;
  recommendation: string;
  category: "ATTENDANCE" | "ASSIGNMENT" | "EXAM" | "COURSEWORK" | string;
  course_code?: string | null;
  target_metric?: string | null;
}

export interface StudentIntelligenceResponse {
  profile: StudentPerformanceProfile;
  recommendations: ActionableRecommendation[];
  ai_study_insights?: string | null;
  is_ai_generated: boolean;
  generated_at: string;
}

export interface DifficultTopicInsight {
  topic_or_module: string;
  assessment_type: string;
  average_score_percentage: number;
  failure_rate_percentage: number;
  difficulty_level: "EASY" | "MODERATE" | "DIFFICULT" | string;
  recommendation: string;
}

export interface CourseHealthIntelligence {
  course_id: string;
  course_code: string;
  course_name: string;
  semester_name: string;
  total_enrolled: number;
  health_status: CourseHealthStatus;
  health_score: number;
  health_reasons: string[];
  class_average_percentage: number;
  average_gpa: number;
  pass_rate: number;
  average_attendance: number;
  assignment_completion_rate: number;
  at_risk_students_count: number;
  difficult_topics: DifficultTopicInsight[];
  ai_course_summary?: string | null;
  is_ai_generated: boolean;
}

export interface AtRiskStudentRosterItem {
  student_id: string;
  student_name: string;
  student_identifier?: string | null;
  risk_level: AcademicRiskLevel;
  risk_score: number;
  current_gpa: number;
  attendance_percentage: number;
  primary_reasons: string[];
}

export interface DepartmentIntelligenceResponse {
  department_id: string;
  department_name: string;
  total_students: number;
  total_courses: number;
  department_average_gpa: number;
  department_pass_rate: number;
  department_average_attendance: number;
  at_risk_students_count: number;
  critical_risk_count: number;
  high_risk_count: number;
  at_risk_roster: AtRiskStudentRosterItem[];
  courses_health: CourseHealthIntelligence[];
}

export interface VCInstitutionalIntelligenceResponse {
  institution_average_gpa: number;
  institution_pass_rate: number;
  institution_average_attendance: number;
  total_students: number;
  total_at_risk_students: number;
  risk_distribution: Record<string, number>;
  department_health_rankings: Array<{
    department_id: string;
    department_name: string;
    department_code: string;
    average_gpa: number;
    pass_rate: number;
    average_attendance: number;
    at_risk_count: number;
    total_courses: number;
  }>;
  institutional_trends: Record<string, any>;
}

// -------------------------------------------------------------
// PHASE 11: ADVANCED COMMUNICATION, NOTIFICATIONS & MESSAGING
// -------------------------------------------------------------
export type NotificationCategory =
  | "ACADEMIC"
  | "ASSIGNMENT"
  | "QUIZ"
  | "EXAM"
  | "RESULT"
  | "ATTENDANCE"
  | "ANNOUNCEMENT"
  | "WORKFLOW"
  | "SYSTEM"
  | "SECURITY"
  | "AI_INSIGHT";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export interface NotificationItem {
  id: string;
  recipient_id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  source_type?: string | null;
  source_id?: string | null;
  action_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationPreference {
  user_id: string;
  email_enabled: boolean;
  academic_alerts: boolean;
  assignment_reminders: boolean;
  exam_notifications: boolean;
  result_notifications: boolean;
  announcements_enabled: boolean;
  ai_insights_enabled: boolean;
}

export interface UnreadCounts {
  unread_notifications_count: number;
  unread_messages_count: number;
}

export type AnnouncementScope = "INSTITUTION" | "DEPARTMENT" | "COURSE" | "INDIVIDUAL";
export type AnnouncementPriority = "NORMAL" | "IMPORTANT" | "CRITICAL";
export type AnnouncementStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "EXPIRED" | "ARCHIVED";

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author_role: string;
  scope_type: AnnouncementScope;
  scope_id?: string | null;
  scope_name?: string | null;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  is_acknowledgement_required: boolean;
  is_acknowledged: boolean;
  total_acknowledgements: number;
  publish_at: string;
  expires_at?: string | null;
  created_at: string;
}

export interface AIDraftResponse {
  draft_title: string;
  draft_content: string;
  is_ai_generated: boolean;
  safety_disclaimer: string;
}

export type ConversationType = "DIRECT" | "COURSE_THREAD" | "DEPARTMENT_THREAD" | "ADVISING";

export interface DirectMessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  body: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface ConversationParticipantItem {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  last_read_at: string;
}

export interface ConversationItem {
  id: string;
  title?: string | null;
  conversation_type: ConversationType;
  course_id?: string | null;
  course_name?: string | null;
  created_by: string;
  participants: ConversationParticipantItem[];
  last_message?: DirectMessageItem | null;
  unread_messages_count: number;
  updated_at: string;
}

// -------------------------------------------------------------
// PHASE 12: ACADEMIC CALENDAR, ROOMS, LEAVE & WORKLOAD TYPES
// -------------------------------------------------------------
export type CalendarEventType =
  | "SEMESTER_START"
  | "SEMESTER_END"
  | "HOLIDAY"
  | "WORKING_DAY"
  | "EXAM_PERIOD"
  | "RESULT_PERIOD"
  | "REGISTRATION"
  | "ACADEMIC_EVENT";

export interface CalendarEventItem {
  id: string;
  event_type: CalendarEventType;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  semester_id?: string | null;
  semester_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  is_instructional_day: boolean;
  created_by?: string | null;
  created_at: string;
}

export type RoomType = "CLASSROOM" | "LAB" | "SEMINAR_ROOM" | "AUDITORIUM" | "OTHER";

export interface AcademicRoomItem {
  id: string;
  building: string;
  room_number: string;
  capacity: number;
  room_type: RoomType;
  has_projector: boolean;
  has_recording: boolean;
  is_active: boolean;
}

export type LeaveType = "MEDICAL" | "ON_DUTY" | "PERSONAL" | "EMERGENCY";
export type LeaveStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface StudentLeaveItem {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  department_name?: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface FacultyWorkloadItem {
  faculty_id: string;
  faculty_name: string;
  department_name?: string | null;
  total_assigned_courses: number;
  weekly_teaching_hours: number;
  total_weekly_sessions: number;
  lecture_hours: number;
  lab_hours: number;
  tutorial_hours: number;
  status: "NORMAL" | "HIGH" | "OVERLOADED";
}

export interface CourseAttendanceShortageItem {
  course_id: string;
  course_code: string;
  course_name: string;
  total_sessions_conducted: number;
  sessions_attended: number;
  current_attendance_pct: number;
  is_shortage: boolean;
  required_threshold_pct: number;
  estimated_remaining_sessions: number;
  minimum_sessions_to_attend: number;
  recovery_possible: boolean;
  recovery_guidance: string;
}

export interface StudentAttendanceShortageReportItem {
  student_id: string;
  student_name: string;
  overall_attendance_pct: number;
  has_any_shortage: boolean;
  shortage_courses: CourseAttendanceShortageItem[];
}

// -------------------------------------------------------------
// PHASE 14: ADMINISTRATION, GOVERNANCE & SECURITY TYPES
// -------------------------------------------------------------
export interface AdminDashboardStats {
  total_students: number;
  total_faculty: number;
  total_hods: number;
  total_administrators: number;
  total_courses: number;
  total_departments: number;
  active_academic_year: string;
  active_semester_name: string;
  active_exams_count: number;
  pending_governance_count: number;
  failed_logins_count: number;
  active_sessions_count: number;
  system_health_status: "HEALTHY" | "DEGRADED" | "DOWN";
}

export interface AdminUserItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role_name: string;
  department_id?: string | null;
  department_name?: string | null;
  student_identifier?: string | null;
  faculty_identifier?: string | null;
  is_active: boolean;
  account_status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LOCKED";
  created_at: string;
  active_sessions_count: number;
}

export interface AdminAuditEventItem {
  id: string;
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  scope?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}

export interface SecurityEventItem {
  id: string;
  event_type: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  user_id?: string | null;
  user_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: string | null;
  created_at: string;
}

export interface ActiveSessionItem {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role_name: string;
  created_at: string;
  expires_at: string;
  is_revoked: boolean;
}

export interface PolicyVersionItem {
  id: string;
  version: string;
  policy_value: Record<string, any>;
  change_reason?: string | null;
  changed_by_name?: string | null;
  created_at: string;
}

export interface SystemPolicyItem {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  category: "ATTENDANCE" | "EXAMINATION" | "GRADING" | "AI_GOVERNANCE" | "SECURITY" | "NOTIFICATIONS" | "GENERAL";
  current_version: string;
  policy_value: Record<string, any>;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
  effective_from: string;
  versions: PolicyVersionItem[];
}

export interface GovernanceSummary {
  pending_result_approvals: number;
  pending_result_corrections: number;
  pending_leave_requests: number;
  recent_schedule_changes: number;
  total_actionable_requests: number;
}

export interface GovernanceRequestItem {
  id: string;
  module: "RESULTS" | "LEAVE" | "TIMETABLE" | "ACADEMIC";
  request_type: string;
  requester_name: string;
  requester_role: string;
  department_name?: string | null;
  submitted_at: string;
  status: string;
  details: string;
}

export interface ServiceHealthItem {
  service_name: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latency_ms?: number | null;
  message?: string | null;
}

export interface SystemHealthResponse {
  overall_status: "HEALTHY" | "DEGRADED" | "DOWN";
  checked_at: string;
  services: ServiceHealthItem[];
}

export interface AIAdminStatusResponse {
  is_configured: boolean;
  model_name: string;
  total_draft_requests: number;
  total_summaries_generated: number;
  total_fallbacks_triggered: number;
  total_errors: number;
  human_review_enforced: boolean;
  safety_disclaimer: string;
}

