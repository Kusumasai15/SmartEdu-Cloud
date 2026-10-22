"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, CheckCircle2, X } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";
import { fetchApi } from "@/lib/api-client";
import {
  FacultyCourse,
  CourseGradebook,
  CourseHealthIntelligence,
  AnnouncementItem,
} from "@/types";

// Modular Faculty Components
import { FacultyOverviewTab } from "@/components/faculty/FacultyOverviewTab";
import { FacultyAssignmentsTab } from "@/components/faculty/FacultyAssignmentsTab";
import { FacultyProjectsIdeathonsView } from "@/components/faculty/FacultyProjectsIdeathonsView";
import { FacultyCreateAssignmentModal, CreatedAssignmentData } from "@/components/faculty/FacultyCreateAssignmentModal";
import { FacultyBroadcastModal } from "@/components/faculty/FacultyBroadcastModal";
import { FacultyAttendanceTab, AttendanceSessionRecord } from "@/components/faculty/FacultyAttendanceTab";
import { FacultyExamsTab, LiveExamTelemetryRecord } from "@/components/faculty/FacultyExamsTab";
import { FacultyRosterModal } from "@/components/faculty/FacultyRosterModal";
import { FacultyContentUploadModal } from "@/components/faculty/FacultyContentUploadModal";
import { FacultyAttendanceModal } from "@/components/faculty/FacultyAttendanceModal";
import { FacultyTelemetryModal } from "@/components/faculty/FacultyTelemetryModal";
import { FacultyCreateExamModal } from "@/components/faculty/FacultyCreateExamModal";
import { FacultyAiGeneratorModal } from "@/components/faculty/FacultyAiGeneratorModal";
import { FacultyPresenceSwitcher } from "@/components/faculty/FacultyPresenceSwitcher";
import { FacultyQuestionPaperVaultModal } from "@/components/faculty/FacultyQuestionPaperVaultModal";
import { FacultyCreateCaseStudyModal } from "@/components/faculty/FacultyCreateCaseStudyModal";
import { FacultyDoubtAppointmentsTab } from "@/components/faculty/FacultyDoubtAppointmentsTab";
import { FacultyStudentLeaveApprovals } from "@/components/faculty/FacultyStudentLeaveApprovals";

// Shared Views
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardGridSkeleton } from "@/components/smartedu/LoadingSkeleton";
import { AnnouncementComposerModal } from "@/components/communication/AnnouncementComposerModal";

const tabLoader = () => <CardGridSkeleton count={3} />;
const FacultyGradebookView = dynamic(() => import("@/components/results/FacultyGradebookView").then((module) => module.FacultyGradebookView), { loading: tabLoader });
const CourseHealthCard = dynamic(() => import("@/components/intelligence/CourseHealthCard").then((module) => module.CourseHealthCard), { loading: tabLoader });
const FacultyWorkloadView = dynamic(() => import("@/components/scheduling/FacultyWorkloadView").then((module) => module.FacultyWorkloadView), { loading: tabLoader });
const LmsModuleBuilder = dynamic(() => import("@/components/lms/LmsModuleBuilder").then((module) => module.LmsModuleBuilder), { loading: tabLoader });
const LmsSpeedGrader = dynamic(() => import("@/components/lms/LmsSpeedGrader").then((module) => module.LmsSpeedGrader), { loading: tabLoader });
const LmsDiscussionBoard = dynamic(() => import("@/components/lms/LmsDiscussionBoard").then((module) => module.LmsDiscussionBoard), { loading: tabLoader });
const FacultyModuleFeedbackView = dynamic(() => import("@/components/faculty/FacultyModuleFeedbackView").then((module) => module.FacultyModuleFeedbackView), { loading: tabLoader });
const PredictiveAtRiskInterventionView = dynamic(() => import("@/components/intelligence/PredictiveAtRiskInterventionView").then((module) => module.PredictiveAtRiskInterventionView), { loading: tabLoader });
const LiveInteractiveQuizView = dynamic(() => import("@/components/assessment/LiveInteractiveQuizView").then((module) => module.LiveInteractiveQuizView), { loading: tabLoader });
const SemesterResultView = dynamic(() => import("@/components/results/SemesterResultView").then((module) => module.SemesterResultView), { loading: tabLoader });

const defaultFacultyCourses: FacultyCourse[] = [];
const initialAttendanceSessions: AttendanceSessionRecord[] = [];
const initialLiveTelemetry: LiveExamTelemetryRecord[] = [];


function FacultyDashboardContent() {
  const { user } = useAuth();
  const { courses: syncCourses, users, departments, calendarSchedules, attendanceSessions: syncAttendanceSessions, scheduleClassTest, isSemesterSeeUnlocked } = useAcademicData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState<FacultyCourse[]>(defaultFacultyCourses);
  const [selectedCourse, setSelectedCourse] = useState<FacultyCourse | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);


  // Gradebook State
  const [gradebook, setGradebook] = useState<CourseGradebook | null>(null);
  const [gradebookLoading, setGradebookLoading] = useState<boolean>(false);

  // Attendance State
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSessionRecord[]>(initialAttendanceSessions);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);
  const [selectedAttendanceCourseId, setSelectedAttendanceCourseId] = useState<string>("");

  // Roster Modal State
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);

  // Content Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadTargetCourseId, setUploadTargetCourseId] = useState<string>("");

  // Assignment Modal State
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState<boolean>(false);

  // AI Generator Modal State
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState<boolean>(false);
  const [isCaseStudyModalOpen, setIsCaseStudyModalOpen] = useState<boolean>(false);

  // Broadcast & Notification Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);

  // Telemetry & Exam State
  const [telemetryRecords, setTelemetryRecords] = useState<LiveExamTelemetryRecord[]>(initialLiveTelemetry);
  const [selectedTelemetryStudent, setSelectedTelemetryStudent] = useState<LiveExamTelemetryRecord | null>(null);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState<boolean>(false);
  const [isQuestionPaperModalOpen, setIsQuestionPaperModalOpen] = useState<boolean>(false);

  // Global Notification Banner
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const activeTab = searchParams.get("tab") || "overview";

  // Load Gradebook dynamically with real students
  const loadGradebook = useCallback(async (course: FacultyCourse | null) => {
    if (!course) {
      setGradebook(null);
      return;
    }
    setGradebookLoading(true);

    try {
      const res = await fetchApi<CourseGradebook>(`/results/courses/${course.id}/gradebook`);
      if (res.success && res.data) {
        setGradebook(res.data);
      }
    } catch (error) {
      setNotificationMsg(error instanceof Error ? error.message : "Gradebook could not be loaded.");
    } finally {
      setGradebookLoading(false);
    }
  }, []);

  const selectedCourseId = selectedCourse?.id;
  useEffect(() => {
    if ((activeTab === "gradebook" || activeTab === "dsa-book") && selectedCourse) {
      loadGradebook(selectedCourse);
    }
  }, [activeTab, selectedCourseId, loadGradebook]);

  const handleCalculateGradebook = async () => {
    if (!selectedCourse) return;
    try {
      await fetchApi(`/results/courses/${selectedCourse.id}/calculate`, { method: "POST" });
      await loadGradebook(selectedCourse);
    } catch (error) {
      setNotificationMsg(error instanceof Error ? error.message : "Results could not be calculated.");
      throw error;
    }
  };

  const handleSubmitGradebook = async () => {
    if (!selectedCourse) return;
    try {
      await fetchApi(`/results/courses/${selectedCourse.id}/submit`, { method: "POST" });
      await loadGradebook(selectedCourse);
      setNotificationMsg(`Results for ${selectedCourse.course_code} submitted for review.`);
    } catch (error) {
      setNotificationMsg(error instanceof Error ? error.message : "Results could not be submitted.");
      throw error;
    }
  };

  const handleRequestCorrection = (resultId: string, studentName: string) => {
    alert(`Correction request submitted to Dean for ${studentName} (${resultId}).`);
  };

  const [realUniqueStudentsCount, setRealUniqueStudentsCount] = useState<number>(0);

  // Redirect from SEE tab to DSA Gradebook if SEE examination has not been toggled on by Examination Dept
  useEffect(() => {
    if ((activeTab === "semester-results" || activeTab === "results") && !isSemesterSeeUnlocked(3)) {
      router.replace("/faculty?tab=gradebook");
    }
  }, [activeTab, isSemesterSeeUnlocked, router]);

  // Load Baseline Data
  const loadFacultyData = useCallback(async () => {
    try {
      const [coursesRes, annRes] = await Promise.allSettled([
        fetchApi<FacultyCourse[]>("/courses"),
        fetchApi<AnnouncementItem[]>("/announcements?limit=10"),
      ]);

      if (coursesRes.status === "fulfilled" && coursesRes.value.success && coursesRes.value.data) {
        const rawCourses = coursesRes.value.data;

        const userFullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim().toLowerCase();
        const userFirstName = (user?.first_name || "").trim().toLowerCase();
        const userEmail = (user?.email || "").toLowerCase();
        const userId = user?.id;

        // 1. Collect all course codes assigned to this faculty via department cohorts
        const cohortAssignedCodes = new Set<string>();
        departments.forEach((dept) => {
          dept.cohorts?.forEach((cohort) => {
            const advisorName = (cohort.classAdvisor || "").toLowerCase();
            const advisorEmail = (cohort.classAdvisorEmail || "").toLowerCase();
            const isAdvisor = (advisorEmail && advisorEmail === userEmail) || (advisorName && (advisorName === userFullName || advisorName.includes(userFullName) || userFullName.includes(advisorName)));

            if (cohort.courseInstructors) {
              Object.entries(cohort.courseInstructors).forEach(([cCode, inst]) => {
                const iLower = (inst || "").toLowerCase();
                if (iLower && (iLower === userFullName || iLower.includes(userFullName) || userFullName.includes(iLower) || (userFirstName.length >= 3 && iLower.includes(userFirstName)) || iLower === userEmail)) {
                  cohortAssignedCodes.add(cCode.toLowerCase().trim());
                }
              });
            }

            if (isAdvisor && cohort.assignedCourses) {
              cohort.assignedCourses.forEach((cCode) => cohortAssignedCodes.add(cCode.toLowerCase().trim()));
            }
          });
        });

        // 2. Collect all course codes scheduled for this faculty in calendarSchedules
        calendarSchedules.forEach((ev) => {
          const evFac = (ev.faculty || "").toLowerCase();
          const evEmail = (ev.facultyEmail || "").toLowerCase();
          if (
            (evEmail && evEmail === userEmail) ||
            (evFac && (evFac === userFullName || evFac.includes(userFullName) || userFullName.includes(evFac) || (userFirstName.length >= 3 && evFac.includes(userFirstName))))
          ) {
            if (ev.courseCode) cohortAssignedCodes.add(ev.courseCode.toLowerCase().trim());
          }
        });

        // 3. Filter backend courses
        const myAssignedCourses = rawCourses.filter((c) => {
          const cCode = (c.course_code || (c as any).code || "").toLowerCase().trim();
          if (cohortAssignedCodes.has(cCode)) return true;

          if (Array.isArray(c.instructors) && c.instructors.length > 0) {
            return c.instructors.some((inst: any) => {
              const iId = inst.faculty_id || inst.id;
              const iEmail = (inst.faculty_email || inst.email || "").toLowerCase();
              const iName = (inst.faculty_name || inst.name || "").toLowerCase();
              return (
                (iId && iId === userId) ||
                (iEmail && iEmail === userEmail) ||
                (iName && (iName.includes(userFullName) || userFullName.includes(iName) || (userFirstName.length >= 3 && iName.includes(userFirstName))))
              );
            });
          }
          const instField = ((c as any).instructor || "").toLowerCase();
          if (instField && (instField.includes(userFullName) || userFullName.includes(instField) || (userFirstName.length >= 3 && instField.includes(userFirstName)))) {
            return true;
          }
          return false;
        });

        // 4. Also incorporate any assigned course from syncCourses that isn't already present in rawCourses
        const combinedCourses = [...myAssignedCourses];
        syncCourses.forEach((sc) => {
          const scCode = sc.code.toLowerCase().trim();
          const scInst = (sc.instructor || "").toLowerCase();
          const isTaughtInSync = (scInst && (scInst.includes(userFullName) || userFullName.includes(scInst) || (userFirstName.length >= 3 && scInst.includes(userFirstName)))) || cohortAssignedCodes.has(scCode);

          if (isTaughtInSync) {
            const alreadyIn = combinedCourses.some((c) => (c.course_code || (c as any).code || "").toLowerCase().trim() === scCode);
            if (!alreadyIn) {
              combinedCourses.push({
                id: sc.id || `sync-course-${sc.code}`,
                course_code: sc.code,
                name: sc.name,
                description: sc.description || "",
                credits: sc.credits || 3,
                department_id: sc.departmentCode || "dept",
                department_name: sc.department,
                department_code: sc.departmentCode,
                semester_id: "sem-current",
                semester_name: sc.semester || "Semester 1",
                is_active: sc.status === "Active",
                instructors: [
                  {
                    id: userId || "fac-1",
                    course_id: sc.id || `sync-course-${sc.code}`,
                    faculty_id: userId || "fac-1",
                    faculty_name: user ? `${user.first_name} ${user.last_name || ""}`.trim() : "Faculty Member",
                    faculty_email: user?.email || "",
                    is_primary: true,
                  },
                ],
                module_count: 0,
                enrolled_count: sc.enrolledStudents || 0,
                level: sc.type,
              });
            }
          }
        });

        // A timetable may reference an existing backend course before its instructor relation is refreshed.
        if (combinedCourses.length === 0) {
          calendarSchedules.forEach((ev) => {
            const evFac = (ev.faculty || "").toLowerCase();
            const evEmail = (ev.facultyEmail || "").toLowerCase();
            const isMatch = (evEmail && evEmail === userEmail) || (evFac && (evFac === userFullName || evFac.includes(userFullName) || userFullName.includes(evFac) || (userFirstName.length >= 3 && evFac.includes(userFirstName))));
            if (isMatch && ev.courseCode) {
              const matchedRaw = rawCourses.find((rc) => (rc.course_code || (rc as any).code || "").toLowerCase().trim() === ev.courseCode.toLowerCase().trim());
              const codeClean = ev.courseCode.trim();
              if (matchedRaw) {
                if (!combinedCourses.some((c) => c.id === matchedRaw.id)) combinedCourses.push(matchedRaw);
              }
            }
          });
        }

        // Use filtered courses strictly for this faculty
        const facCourses = combinedCourses;
        setCourses(facCourses);
        const updatedCourses = facCourses;
        setSelectedCourse((previous) => {
          if (previous && updatedCourses.some((c) => c.id === previous.id)) {
            return previous;
          }
          return updatedCourses[0] || null;
        });

        // Fetch live course enrollments and compute DISTINCT/UNIQUE students
        try {
          const studentSet = new Set<string>();
          await Promise.all(
            facCourses.map(async (c) => {
              try {
                const enrRes = await fetchApi<{ items: any[] } | any[]>(`/courses/${c.id}/enrollments`);
                if (enrRes.success && enrRes.data) {
                  const items = Array.isArray(enrRes.data) ? enrRes.data : (enrRes.data as any)?.items || [];
                  items.forEach((item: any) => {
                    const sid = item.student_id || item.id;
                    if (sid) studentSet.add(sid);
                  });
                }
              } catch {}
            })
          );
          if (studentSet.size > 0) {
            setRealUniqueStudentsCount(studentSet.size);
          }
        } catch {}
      }

      if (annRes.status === "fulfilled" && annRes.value.success && annRes.value.data) {
        setAnnouncements(annRes.value.data);
      }
    } catch (error) {
      setCourses([]);
      setSelectedCourse(null);
      setNotificationMsg(error instanceof Error ? error.message : "Faculty data could not be loaded.");
    }
  }, [user, syncCourses, departments, calendarSchedules]);

  useEffect(() => {
    loadFacultyData();
    const refreshVisible = () => { if (document.visibilityState === "visible") void loadFacultyData(); };
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("academic-data-changed", refreshVisible);
    return () => {
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("academic-data-changed", refreshVisible);
    };
  }, [loadFacultyData]);

  // Handle Attendance Submission
  const handleAttendanceSubmitted = (sessionData: {
    courseId: string;
    courseCode: string;
    courseName: string;
    topic: string;
    presentCount: number;
    totalCount: number;
  }) => {
    const newSession: AttendanceSessionRecord = {
      id: `att-${Date.now()}`,
      course_id: sessionData.courseId,
      course_code: sessionData.courseCode,
      course_name: sessionData.courseName,
      session_date: "Just Now (Live Logged)",
      topic: sessionData.topic,
      present_count: sessionData.presentCount,
      total_count: sessionData.totalCount,
      status: "CLOSED",
    };
    setAttendanceSessions([newSession, ...attendanceSessions]);
    setNotificationMsg(`✓ Attendance register for ${sessionData.courseCode} successfully synchronized (${sessionData.presentCount}/${sessionData.totalCount} present).`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  // Handle Content Upload Success
  const handleContentUploadSuccess = (meta: { courseCode: string; title: string; type: string }) => {
    setNotificationMsg(`✓ New curriculum material "${meta.title}" published to ${meta.courseCode} student portal!`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  // Handle Create Exam & During-Semester Assessment (DSA)
  const handleCreateExam = (examData: {
    title: string;
    courseCode: string;
    durationMinutes: number;
    date?: string;
    timeSlot?: string;
    venue?: string;
    maxMarks?: number;
    assessmentType?: string;
    targetClass?: string;
  }) => {
    const facultyName = user ? `${user.first_name} ${user.last_name || ""}`.trim() : "Faculty";
    const matchedCourse = courses.find((c) => c.course_code === examData.courseCode);
    const courseName = matchedCourse?.name || examData.courseCode;

    try {
      scheduleClassTest({
        courseCode: examData.courseCode,
        courseName,
        title: examData.title,
        className: examData.targetClass || "CSE - Semester 1 (Sec A)",
        date: examData.date || new Date().toISOString().split("T")[0],
        time: examData.timeSlot || "15:00 - 17:00",
        venue: examData.venue || "Online / Computer Lab 3",
        facultyName,
        maxMarks: examData.maxMarks || 25,
        agenda: [
          `During-Semester Assessment (DSA): ${examData.title}`,
          `Duration: ${examData.durationMinutes} Minutes`,
          `Target Class: ${examData.targetClass || "CSE - Semester 1 (Sec A)"}`,
          `Weightage component: Continuous Internal Assessment (Max ${examData.maxMarks || 25} Marks)`,
        ],
      });
    } catch (err) {
      console.warn("Class test schedule sync note:", err);
    }

    setNotificationMsg(`✓ Assessment / DSA "${examData.title}" (${examData.courseCode}) scheduled and synchronized to student & faculty timetables.`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  // Waive Strikes
  const handleWaiveStrikes = (studentId: string) => {
    setTelemetryRecords((prev) =>
      prev.map((r) =>
        r.id === studentId ? { ...r, strikeCount: 0, status: "CLEAN", lastViolation: "Strikes Waived by Faculty" } : r
      )
    );
    setNotificationMsg("Warnings cleared for this student.");
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const rawFacultyName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const facultyName = rawFacultyName
    ? (rawFacultyName.toLowerCase().startsWith("dr") || rawFacultyName.toLowerCase().startsWith("prof")
        ? rawFacultyName
        : `Prof. ${rawFacultyName}`)
    : "Faculty Member";

  // Distinct unique students taught by this faculty (avoids duplicate counting when teaching multiple subjects to the same students)
  const uniqueStudentsCount = useMemo(() => {
    if (realUniqueStudentsCount > 0) return realUniqueStudentsCount;

    const assignedClassesAll = Array.from(new Set(syncCourses.flatMap((c) => c.assignedClasses || []))).filter(Boolean);
    const allStudents = users.filter((u) => u.role === "STUDENT");
    if (assignedClassesAll.length === 0) return allStudents.length;

    const matchedUnique = allStudents.filter((st) => {
      const stClass = (st.className || "").trim().toLowerCase();
      return assignedClassesAll.some((cls) => stClass.includes(cls.toLowerCase()) || cls.toLowerCase().includes(stClass));
    });

    return matchedUnique.length > 0 ? matchedUnique.length : allStudents.length;
  }, [realUniqueStudentsCount, syncCourses, users]);

  return (
    <RoleGuard allowedRoles={["FACULTY"]}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-8 pb-16 w-full"
      >
        {/* ─── FACULTY LIVE CABIN PRESENCE & BREADCRUMB BAR ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          {activeTab !== "overview" ? (
            <Link
              href="/faculty"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shadow-sm transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Faculty Dashboard</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                Faculty Academic Control Hub
              </span>
            </div>
          )}

          {/* Global TopHeader already features FacultyPresenceSwitcher */}
        </div>

        {/* Global Notification */}
        {notificationMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{notificationMsg}</span>
            </div>
            <button onClick={() => setNotificationMsg(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ─── 1. OVERVIEW TAB ─── */}
        {activeTab === "overview" && (
          <FacultyOverviewTab
            facultyName={facultyName}
            courses={courses}
            totalCourses={courses.length}
            totalStudents={uniqueStudentsCount}
            avgAttendance="0%"
            announcements={announcements}
            onOpenRosterModal={() => setIsRosterModalOpen(true)}
            onOpenAttendanceModal={(cId) => {
              router.push(cId ? `/faculty/attendance/take?courseId=${cId}` : "/faculty/attendance/take");
            }}
            onOpenUploadModal={(cId) => {
              if (cId) setUploadTargetCourseId(cId);
              setIsUploadModalOpen(true);
            }}
            onOpenCreateAssignmentModal={() => setIsCreateAssignmentOpen(true)}
            onOpenAiGeneratorModal={() => setIsAiGeneratorOpen(true)}
            onOpenCaseStudyModal={() => setIsCaseStudyModalOpen(true)}
            onOpenQuestionPaperModal={() => setIsQuestionPaperModalOpen(true)}
            onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
            onOpenComposerModal={() => setIsComposerOpen(true)}
            onSelectCourseForGradebook={(c) => {
              setSelectedCourse(c);
              router.push("/faculty?tab=gradebook");
            }}
          />
        )}

        {/* ─── CLOUD LMS MODULE AUTHORING STUDIO ─── */}
        {activeTab === "modules" && (
          <div className="space-y-6 animate-fade-in">
            <LmsModuleBuilder />
          </div>
        )}

        {/* ─── CONTINUOUS MODULAR COURSE FEEDBACK ANALYTICS & REVIEWS ─── */}
        {(activeTab === "module-feedback" || activeTab === "feedback") && (
          <div className="space-y-6 animate-fade-in">
            <FacultyModuleFeedbackView
              courses={courses}
              defaultCourseCode={selectedCourse?.course_code}
            />
          </div>
        )}

        {/* ─── CLOUD LMS SPEEDGRADER™ SUBMISSION EVALUATION ─── */}
        {activeTab === "speedgrader" && (
          <div className="space-y-6 animate-fade-in">
            <LmsSpeedGrader />
          </div>
        )}

        {/* ─── CLOUD LMS COURSE DISCUSSIONS MODERATION ─── */}
        {activeTab === "discussions" && (
          <div className="space-y-6 animate-fade-in">
            <LmsDiscussionBoard />
          </div>
        )}

        {/* ─── 1:1 STUDENT DOUBT & CONSULTATION APPOINTMENTS ─── */}
        {(activeTab === "consultations" || activeTab === "doubt-appointments") && (
          <div className="space-y-6 animate-fade-in">
            <FacultyDoubtAppointmentsTab />
          </div>
        )}

        {/* ─── 2a. DEDICATED PROJECTS & IDEATHONS VIEW (TEAM COLLABORATION) ─── */}
        {(activeTab === "projects" || activeTab === "ideathons" || activeTab === "team-projects") && (
          <FacultyProjectsIdeathonsView courses={courses} />
        )}

        {/* ─── 2b. INDIVIDUAL ASSIGNMENTS / QUIZZES / CASE STUDIES TAB ─── */}
        {(activeTab === "assignments" || activeTab === "quizzes" || activeTab === "case-studies" || activeTab === "quiz-analytics") && (
          <FacultyAssignmentsTab
            courses={courses}
            activeTabKey={activeTab}
            onOpenCaseStudyModal={() => setIsCaseStudyModalOpen(true)}
          />
        )}

        {/* ─── 3. DSA BOOK TAB (DURING-SEMESTER ASSESSMENT) ─── */}
        {(activeTab === "gradebook" || activeTab === "dsa-book") && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <SectionHeader
                title="DSA Book (During-Semester Assessment)"
                description="Input component marks (Assignments, Class Tests, Mid-Terms, Labs), import Excel, and calculate totals"
              />

              {/* Course Switcher Pills */}
              <div className="flex items-center gap-2 p-1.5 bg-[#F7F8FC] dark:bg-slate-800/80 rounded-2xl overflow-x-auto max-w-full">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourse(c)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      selectedCourse?.id === c.id
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-[#E8EAF1] dark:border-slate-700"
                        : "text-[#737A90] hover:text-[#171A2B] dark:hover:text-white"
                    }`}
                  >
                    <span className="font-mono font-extrabold">{c.course_code || (c as any).code || "Course"}</span>
                    <span className="hidden md:inline font-medium text-[#737A90] text-[11px]">• {(c.name || "Curriculum").split("&")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <FacultyGradebookView
              gradebook={gradebook || (selectedCourse ? {
                course_id: selectedCourse.id,
                course_code: selectedCourse.course_code || (selectedCourse as any).code || "CS-02",
                course_name: selectedCourse.name || "Course Curriculum",
                semester_name: selectedCourse.semester_name || "Semester 5",
                overall_status: "DRAFT",
                roster: [],
              } as any : (courses[0] ? {
                course_id: courses[0].id,
                course_code: courses[0].course_code || (courses[0] as any).code || "CS-02",
                course_name: courses[0].name || "Course Curriculum",
                semester_name: courses[0].semester_name || "Semester 5",
                overall_status: "DRAFT",
                roster: [],
              } as any : null))}
              loading={gradebookLoading}
              onCalculate={handleCalculateGradebook}
              onSubmit={handleSubmitGradebook}
              onRequestCorrection={handleRequestCorrection}
            />
          </div>
        )}

        {/* ─── 3b. SEMESTER END EXAMINATION + DSA RESULTS TAB ─── */}
        {(activeTab === "semester-results" || activeTab === "results") && isSemesterSeeUnlocked(3) && (
          <div className="space-y-6 animate-fade-in">
            <SemesterResultView />
          </div>
        )}

        {/* ─── 4. ATTENDANCE TAB (IN-PAGE WORKSPACE) ─── */}
        {activeTab === "attendance" && (
          <FacultyAttendanceTab courses={courses} />
        )}

        {/* ─── 5. EXAMS & PROCTORING TAB ─── */}
        {activeTab === "exams" && (
          <FacultyExamsTab
            courses={courses}
            telemetryRecords={telemetryRecords}
            onOpenCreateExamModal={() => setIsCreateExamModalOpen(true)}
            onSelectTelemetryStudent={(s) => setSelectedTelemetryStudent(s)}
          />
        )}

        {/* ─── 6. COURSE PERFORMANCE & ANALYTICS TAB ─── */}
        {activeTab === "intelligence" && (
          <div className="space-y-6 animate-fade-in">
            <SectionHeader
              title="Course Performance & Analytics Overview"
              description="Student progress, class attendance averages, and syllabus completion overview"
            />
            <CourseHealthCard
              data={{
                course_id: selectedCourse?.id || "",
                course_code: selectedCourse?.course_code || "No Course",
                course_name: selectedCourse?.name || "No course assigned",
                semester_name: "Current Term",
                total_enrolled: selectedCourse?.enrolled_count || 0,
                health_status: "UNKNOWN",
                health_score: 0,
                health_reasons: selectedCourse ? [] : ["Assign a course to view performance analytics."],
                class_average_percentage: 0,
                average_gpa: 0,
                pass_rate: 0,
                average_attendance: 0,
                assignment_completion_rate: 0,
                at_risk_students_count: 0,
                difficult_topics: [],
                is_ai_generated: false,
              } as unknown as CourseHealthIntelligence}
            />
          </div>
        )}

        {/* ─── 7. SCHEDULE TAB ─── */}
        {(activeTab === "timetable" || activeTab === "schedule") && (
          <div className="space-y-6 animate-fade-in">
            <FacultyWorkloadView />
          </div>
        )}

        {/* ─── 8. LIVE INTERACTIVE QUIZ HOST TAB ─── */}
        {(activeTab === "live-quiz" || activeTab === "live-assessment") && (
          <div className="space-y-6 animate-fade-in">
            <LiveInteractiveQuizView initialRole="FACULTY" />
          </div>
        )}

        {/* ─── 9. PREDICTIVE AT-RISK EARLY WARNING TAB ─── */}
        {activeTab === "at-risk" && (
          <div className="space-y-6 animate-fade-in">
            <PredictiveAtRiskInterventionView />
          </div>
        )}

        {/* ─── 10. STUDENT LEAVES & ON-DUTY (OD) APPROVALS TAB ─── */}
        {(activeTab === "student-leaves" || activeTab === "leaves" || activeTab === "od-leaves") && (
          <div className="space-y-6 animate-fade-in">
            <FacultyStudentLeaveApprovals />
          </div>
        )}

        {/* ─── MODALS ─── */}
        {/* 1. Full-Screen Roster Modal */}
        <FacultyRosterModal
          isOpen={isRosterModalOpen}
          onClose={() => setIsRosterModalOpen(false)}
        />

        {/* 2. Lecture Content Upload Modal */}
        <FacultyContentUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          courses={courses}
          initialCourseId={uploadTargetCourseId}
          onUploadSuccess={handleContentUploadSuccess}
        />

        {/* 3. Create Assignment Modal */}
        <FacultyCreateAssignmentModal
          isOpen={isCreateAssignmentOpen}
          onClose={() => setIsCreateAssignmentOpen(false)}
          courses={courses}
          onCreateAssignment={(asg) => {
            setNotificationMsg(`✓ Assignment "${asg.title}" (${asg.courseCode}) published to student dashboards.`);
            setTimeout(() => setNotificationMsg(null), 5000);
          }}
        />

        {/* 4. Faculty notice modal */}
        <FacultyBroadcastModal
          isOpen={isBroadcastModalOpen}
          onClose={() => setIsBroadcastModalOpen(false)}
          courses={courses}
          onBroadcastSuccess={(meta) => {
            setNotificationMsg(`Notice "${meta.title}" sent to ${meta.audience} by ${meta.channel}.`);
            setTimeout(() => setNotificationMsg(null), 5000);
          }}
        />

        {/* 5. Live Attendance Roll-Call Modal */}
        <FacultyAttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          courses={courses}
          initialCourseId={selectedAttendanceCourseId}
          onSubmitSession={handleAttendanceSubmitted}
        />

        {/* 6. Live Telemetry Review Modal */}
        <FacultyTelemetryModal
          student={selectedTelemetryStudent}
          isOpen={!!selectedTelemetryStudent}
          onClose={() => setSelectedTelemetryStudent(null)}
          onWaiveStrikes={handleWaiveStrikes}
        />

        {/* 7. Create Proctored Exam Modal */}
        <FacultyCreateExamModal
          isOpen={isCreateExamModalOpen}
          onClose={() => setIsCreateExamModalOpen(false)}
          courses={courses}
          onCreateExam={handleCreateExam}
        />

        {/* 8. AI MCQ & Assignment Generator Modal */}
        <FacultyAiGeneratorModal
          isOpen={isAiGeneratorOpen}
          onClose={() => setIsAiGeneratorOpen(false)}
          defaultCourseCode={selectedCourse?.course_code || ""}
        />

        {/* 8b. Confidential Question Paper Vault Modal */}
        <FacultyQuestionPaperVaultModal
          isOpen={isQuestionPaperModalOpen}
          onClose={() => setIsQuestionPaperModalOpen(false)}
          defaultCourseCode={selectedCourse?.course_code || ""}
        />

        {/* 8c. AI Collaborative Case Study Assessment Modal */}
        <FacultyCreateCaseStudyModal
          isOpen={isCaseStudyModalOpen}
          onClose={() => setIsCaseStudyModalOpen(false)}
          courses={courses}
        />

        {/* 9. Announcement Composer Modal */}
        {isComposerOpen && (
          <AnnouncementComposerModal
            isOpen={isComposerOpen}
            onClose={() => setIsComposerOpen(false)}
            userRole={user?.role?.name || "FACULTY"}
            onSuccess={() => {
              setIsComposerOpen(false);
              loadFacultyData();
            }}
          />
        )}
      </motion.div>
    </RoleGuard>
  );
}

export default function FacultyDashboardPage() {
  return (
    <React.Suspense fallback={<CardGridSkeleton count={4} />}>
      <FacultyDashboardContent />
    </React.Suspense>
  );
}
