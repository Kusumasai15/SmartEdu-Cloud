export interface ScalableStudentCandidate {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  semester: string;
  department: string;
  section: string;
  cohort: string;
  attendancePct: number | null;
  eligibilityStatus: "ELIGIBLE" | "CONDONATION" | "DETAINED" | "PENDING";
  hallTicketId: string;
  assignedHall: string;
  assignedDesk: string;
  photoUrl?: string;
}

export interface SectionDefinition {
  id: string;
  name: string;
  department: string;
  semester: string;
  sectionCode: string;
  totalStudents: number;
}

// These collections intentionally contain no defaults. Examination rooms and
// cohorts must come from saved institutional records.
export const INSTITUTIONAL_SECTIONS: SectionDefinition[] = [];
export const INSTITUTIONAL_EXAM_HALLS: Array<{
  roomNumber: string;
  building: string;
  capacity: number;
  deskPrefix: string;
}> = [];

export function generateInstitutionalCandidatePool(realUsers: any[] = []): ScalableStudentCandidate[] {
  return realUsers
    .filter((user) => user.role === "STUDENT" || user?.role?.name === "STUDENT")
    .map((student) => {
      const cohort = student.className || student.class_name || "";
      const semesterMatch = cohort.match(/semester\s*(\d+)/i);
      const persistedAttendance = Number(student.attendance_percentage ?? student.attendancePct);
      const attendancePct = Number.isFinite(persistedAttendance) ? persistedAttendance : null;
      const persistedEligibility = String(student.exam_eligibility || student.eligibilityStatus || "").toUpperCase();
      const eligibilityStatus = ["ELIGIBLE", "CONDONATION", "DETAINED"].includes(persistedEligibility)
        ? persistedEligibility as ScalableStudentCandidate["eligibilityStatus"]
        : "PENDING";

      return {
        id: String(student.id),
        rollNo: student.student_identifier || student.rollNo || student.roll_number || "",
        name: `${student.first_name || ""} ${student.last_name || ""}`.trim() || student.email,
        email: student.email || "",
        semester: semesterMatch ? `Semester ${semesterMatch[1]}` : "",
        department: student.department || student.department_name || "",
        section: cohort,
        cohort,
        attendancePct,
        eligibilityStatus,
        hallTicketId: student.hall_ticket_id || "",
        assignedHall: student.assigned_exam_hall || "",
        assignedDesk: student.assigned_exam_desk || "",
        photoUrl: student.avatar_url || student.avatar,
      };
    });
}
