"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Copy,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  BookOpen,
  CalendarDays,
  Sparkles,
  Sun,
  Shield,
  Layers,
  ArrowRight,
  Filter,
  Check,
  X,
  Building,
  GraduationCap,
  AlertTriangle,
  Zap,
  Info,
  DoorOpen,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useAcademicData,
  CalendarScheduleEvent,
  InstitutionalHoliday,
} from "@/context/AcademicDataContext";

export function TimetableCalendarAdminView() {
  const {
    calendarSchedules,
    institutionalHolidays,
    addInstitutionalHoliday,
    deleteInstitutionalHoliday,
    copyScheduleToWeeks,
    addScheduleEvent,
    updateScheduleEvent,
    cancelScheduleEvent,
    deleteScheduleEvent,
    purgeDuplicateSchedules,
    courses,
    terms,
    departments,
    classrooms,
    checkScheduleConflicts,
    autoGenerateTimetableForCohort,
    isHolidayDate,
    users,
    addClassToDepartment,
  } = useAcademicData();

  // Active Sub-Tab: "TIMETABLE" | "FACULTY_TIMETABLE" | "ROOM_OCCUPANCY" | "HOLIDAYS" | "REPLICATION"
  const [activeTab, setActiveTab] = useState<"TIMETABLE" | "FACULTY_TIMETABLE" | "ROOM_OCCUPANCY" | "HOLIDAYS">("TIMETABLE");
  const [selectedTermId, setSelectedTermId] = useState<string>("CURRENT_SEMESTER");
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedFacultyEmail, setSelectedFacultyEmail] = useState<string>("");
  const [facultySearchInput, setFacultySearchInput] = useState<string>("");
  const [isFacultySearchOpen, setIsFacultySearchOpen] = useState<boolean>(false);
  const [isBookConsultationModalOpen, setIsBookConsultationModalOpen] = useState<boolean>(false);
  const [consultationDay, setConsultationDay] = useState<number>(1);
  const [consultationTime, setConsultationTime] = useState<string>("11:00 AM - 12:00 PM");
  const [consultationPurpose, setConsultationPurpose] = useState<string>("Academic Advising & Consultation");
  const [selectedRoomOccupancyDay, setSelectedRoomOccupancyDay] = useState<number>(1);
  const [selectedRoomBuildingFilter, setSelectedRoomBuildingFilter] = useState<string>("ALL");

  // Department & Class Selection Filters
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  // High-Scale 100-Section Aggregation & View-By Mode
  const [timetableDisplayMode, setTimetableDisplayMode] = useState<"SECTION_TIMETABLE" | "CAMPUS_AGGREGATION">("SECTION_TIMETABLE");
  const [semesterFilterChip, setSemesterFilterChip] = useState<string>("ALL");
  const [slotDrilldownModal, setSlotDrilldownModal] = useState<{ time: string; dayIndex: number; dayName: string; events: CalendarScheduleEvent[] } | null>(null);

  const [classSearchFilter, setClassSearchFilter] = useState<string>("");
  const [newClassDept, setNewClassDept] = useState<string>("CSE");
  const hasInitializedWeek = React.useRef(false);

  // Dynamic Class Creation state
  const [isAddingNewClass, setIsAddingNewClass] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState("");

  // Modals state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isAddHolidayModalOpen, setIsAddHolidayModalOpen] = useState(false);
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<CalendarScheduleEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-generator modal state
  const [autoGenCohort, setAutoGenCohort] = useState<string>("");
  const [autoGenWeek, setAutoGenWeek] = useState<number>(1);
  const [autoGenRoom, setAutoGenRoom] = useState<string>("");
  const [autoGenApplyAllWeeks, setAutoGenApplyAllWeeks] = useState(true);

  // Copy schedule form state
  const [sourceWeek, setSourceWeek] = useState<number>(1);
  const [copyTargetMode, setCopyTargetMode] = useState<"NEXT_WEEK" | "CUSTOM_WEEKS" | "ENTIRE_MONTH" | "FULL_SEMESTER">("NEXT_WEEK");
  const [selectedCustomWeeks, setSelectedCustomWeeks] = useState<number[]>([2, 3, 4]);
  const [copyScope, setCopyScope] = useState<"ALL" | "SELECTED">("ALL");

  // Holiday form state
  const [holidayName, setHolidayName] = useState("");
  const [holidayStartDate, setHolidayStartDate] = useState("");
  const [holidayEndDate, setHolidayEndDate] = useState("");
  const [holidayType, setHolidayType] = useState<"NATIONAL" | "UNIVERSITY" | "EXAM_BREAK" | "RECESS" | "MAINTENANCE">("NATIONAL");
  const [holidayDesc, setHolidayDesc] = useState("");
  const [isCampusClosed, setIsCampusClosed] = useState(true);

  // Add / Edit Class Slot form state
  const [slotDept, setSlotDept] = useState("");
  const [slotClassName, setSlotClassName] = useState("");
  const [slotCourseCode, setSlotCourseCode] = useState("");
  const [slotCourseName, setSlotCourseName] = useState("");
  const [slotLectureTitle, setSlotLectureTitle] = useState("");
  const [slotLectureNumber, setSlotLectureNumber] = useState(1);
  const [slotDayIndex, setSlotDayIndex] = useState(1); // 1 = Monday
  const [slotStartTime, setSlotStartTime] = useState("09:00 AM");
  const [slotEndTime, setSlotEndTime] = useState("10:00 AM");
  const [slotRoom, setSlotRoom] = useState("");
  const [slotBuilding, setSlotBuilding] = useState("");
  const [slotFaculty, setSlotFaculty] = useState("");
  const [slotType, setSlotType] = useState<"LECTURE" | "LAB" | "TUTORIAL" | "EXAM">("LECTURE");
  const [slotTopics, setSlotTopics] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const daysOfWeek = [
    { index: 1, name: "Monday", short: "Mon" },
    { index: 2, name: "Tuesday", short: "Tue" },
    { index: 3, name: "Wednesday", short: "Wed" },
    { index: 4, name: "Thursday", short: "Thu" },
    { index: 5, name: "Friday", short: "Fri" },
    { index: 6, name: "Saturday", short: "Sat" },
    { index: 0, name: "Sunday", short: "Sun" },
  ];

  // Faculty list from onboarded users
  const facultyList = users.filter((u) => u.role === "FACULTY" || u.role === "HOD");
  const activeFaculty = facultyList.find((f) => f.email === selectedFacultyEmail) || facultyList[0];
  const activeFacultyName = activeFaculty ? `${activeFaculty.first_name} ${activeFaculty.last_name || ""}`.trim() : "";

  // Aggregate registered classes across departments and existing timetable schedules
  const allClasses = useMemo(() => {
    const classSet = new Set<string>();
    departments.forEach((d) => {
      d.cohorts?.forEach((c) => {
        if (c && c.name && c.name.trim()) classSet.add(c.name.trim());
      });
      d.classes?.forEach((c) => {
        if (c && c.trim()) classSet.add(c.trim());
      });
    });
    calendarSchedules.forEach((ev) => {
      if (ev.className && ev.className.trim() && ev.className !== "All Classes (Common Lecture)") {
        classSet.add(ev.className.trim());
      }
    });
    return Array.from(classSet);
  }, [departments, calendarSchedules]);

  // Filter classes by active department
  const visibleClasses = useMemo(() => {
    if (selectedDept === "ALL") return allClasses;
    const matched = departments.find((d) => d.name === selectedDept || d.code === selectedDept);
    if (!matched) return allClasses;
    const deptClasses = new Set<string>();
    matched.cohorts?.forEach((c) => {
      if (c && c.name && c.name.trim()) deptClasses.add(c.name.trim());
    });
    matched.classes?.forEach((c) => {
      if (c && c.trim()) deptClasses.add(c.trim());
    });
    calendarSchedules.forEach((ev) => {
      if (ev.facultyDepartment === matched.name || ev.facultyDepartment === matched.code) {
        if (ev.className && ev.className.trim()) deptClasses.add(ev.className.trim());
      }
    });
    return Array.from(deptClasses);
  }, [selectedDept, departments, allClasses, calendarSchedules]);

  // Filter schedules by selected week, department, and class
  const weekEvents = useMemo(() => {
    return calendarSchedules.filter((ev) => {
      const matchesWeek = ev.weekNumber === selectedWeek;
      if (!matchesWeek) return false;

      const matchesDept =
        selectedDept === "ALL" ||
        ev.facultyDepartment === selectedDept ||
        courses.some((c) => c.code === ev.courseCode && (c.department === selectedDept || c.departmentCode === selectedDept));

      const matchesClass =
        selectedClass === "ALL" ||
        ev.className === selectedClass ||
        (ev.className || "").trim().toLowerCase() === (selectedClass || "").trim().toLowerCase() ||
        (ev.className || "").includes("Common") ||
        (ev.className || "").includes("All Classes");

      return matchesDept && matchesClass;
    });
  }, [calendarSchedules, selectedWeek, selectedDept, selectedClass, courses]);

  // Map timetable weeks to calendar dates based on selected academic semester/term
  const getEstimatedDateForWeekDay = (weekNum: number, dayIdx: number) => {
    let start: Date;
    if (selectedTermId === "SPRING_2026") {
      start = new Date("2026-01-05T12:00:00");
    } else if (selectedTermId === "CURRENT_SEMESTER") {
      // Current Autumn / Academic Cycle Semester (July to December 2026)
      start = new Date("2026-07-06T12:00:00");
    } else {
      const customTerm = terms.find((t) => t.id === selectedTermId);
      if (customTerm?.startDate && !Number.isNaN(new Date(`${customTerm.startDate.slice(0, 10)}T12:00:00`).getTime())) {
        start = new Date(`${customTerm.startDate.slice(0, 10)}T12:00:00`);
      } else {
        start = new Date("2026-07-06T12:00:00");
      }
    }
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset + (weekNum - 1) * 7 + (dayIdx === 0 ? 6 : dayIdx - 1));
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const currentWeekNumber = useMemo(() => {
    for (let w = 1; w <= 20; w++) {
      const mon = getEstimatedDateForWeekDay(w, 1);
      const sun = getEstimatedDateForWeekDay(w, 0);
      if (mon && sun && todayIso >= mon && todayIso <= sun) {
        return w;
      }
    }
    return 1;
  }, [todayIso, selectedTermId, terms]);

  // Search-filtered classes
  const filteredVisibleClasses = useMemo(() => {
    if (!classSearchFilter.trim()) return visibleClasses;
    const q = classSearchFilter.toLowerCase();
    return visibleClasses.filter((c) => c.toLowerCase().includes(q));
  }, [visibleClasses, classSearchFilter]);

  // Default selectedWeek to currentWeekNumber on initial mount
  React.useEffect(() => {
    if (!hasInitializedWeek.current && currentWeekNumber > 0) {
      setSelectedWeek(currentWeekNumber);
      hasInitializedWeek.current = true;
    }
  }, [currentWeekNumber]);

  const getWeekRangeLabel = (weekNum: number) => {
    const monStr = getEstimatedDateForWeekDay(weekNum, 1);
    const sunStr = getEstimatedDateForWeekDay(weekNum, 0);
    if (!monStr || !sunStr) return `Week ${weekNum}`;
    const mon = new Date(`${monStr}T12:00:00`);
    const sun = new Date(`${sunStr}T12:00:00`);
    const monFmt = mon.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sunFmt = sun.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${monFmt} – ${sunFmt}`;
  };

  // Check holiday for slot day
  const getHolidayForDay = (weekNum: number, dayIdx: number): InstitutionalHoliday | null => {
    const dateStr = getEstimatedDateForWeekDay(weekNum, dayIdx);
    if (!dateStr) return null;
    const byHelper = isHolidayDate(dateStr);
    if (byHelper) return byHelper;
    return (
      institutionalHolidays.find((h) => {
        const start = (h.startDate || "").split("T")[0];
        const end = (h.endDate || h.startDate || "").split("T")[0];
        return dateStr >= start && dateStr <= end;
      }) || null
    );
  };

  // Handle adding a custom class to the active department
  const handleAddNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassNameInput.trim()) return;
    const cleanName = newClassNameInput.trim();

    const targetDeptCode = selectedDept !== "ALL" ? selectedDept : newClassDept;
    if (!targetDeptCode) {
      showToast("Select a saved department before creating a class.");
      return;
    }
    try {
      await addClassToDepartment(targetDeptCode, cleanName);
      setSelectedClass(cleanName);
      setNewClassNameInput("");
      setIsAddingNewClass(false);
      showToast(`Class group "${cleanName}" added.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Class could not be created.");
    }
  };

  // Open Auto-Generate Modal
  const handleOpenAutoGenerate = () => {
    const targetClass = selectedClass !== "ALL" ? selectedClass : visibleClasses[0] || "";
    if (!targetClass) {
      showToast("Create or select a class before generating a timetable.");
      return;
    }
    setAutoGenCohort(targetClass);
    setAutoGenWeek(Math.max(currentWeekNumber, selectedWeek));
    setAutoGenRoom(classrooms[0]?.roomNumber || "");
    setAutoGenApplyAllWeeks(true);
    setIsAutoGenerateModalOpen(true);
  };

  // Execute Auto-Generate Timetable
  const handleExecuteAutoGenerate = () => {
    if (!autoGenCohort) return;

    // Generate for baseline week and replicate across all 16 semester weeks in one atomic update
    autoGenerateTimetableForCohort({
      className: autoGenCohort,
      weekNumber: autoGenWeek,
      preferredRoom: autoGenRoom,
      replicateAcrossWeeks: autoGenApplyAllWeeks,
    });

    if (autoGenApplyAllWeeks) {
      showToast(`✓ Complete weekly timetable generated for "${autoGenCohort}" and replicated across all 16 semester weeks!`);
    } else {
      showToast(`✓ Timetable auto-generated for "${autoGenCohort}" in Week ${autoGenWeek} with zero schedule conflicts.`);
    }

    setSelectedClass(autoGenCohort);
    setIsAutoGenerateModalOpen(false);
  };

  // Open Add Slot Modal
  const handleOpenAddSlot = (dayIdx?: number) => {
    setEditingSlot(null);
    const targetDay = dayIdx !== undefined ? dayIdx : 1;
    const targetClass = selectedClass !== "ALL" ? selectedClass : visibleClasses[0] || allClasses[0] || "CSE - Semester 1 (Sec A)";
    const targetDept = selectedDept !== "ALL" ? selectedDept : departments[0]?.name || "Computer Science & Engineering";

    // Auto-pick first available course in that dept
    const deptCourse = courses.find((c) => c.department === targetDept || c.departmentCode === targetDept) || courses[0];

    // Standard time slots sequence
    const standardSlots = [
      { start: "09:00 AM", end: "10:00 AM" },
      { start: "10:00 AM", end: "11:00 AM" },
      { start: "11:15 AM", end: "12:15 PM" },
      { start: "01:15 PM", end: "02:15 PM" },
      { start: "02:15 PM", end: "03:15 PM" },
      { start: "03:30 PM", end: "04:30 PM" },
    ];

    const existingOnDay = calendarSchedules.filter((ev) => ev.weekNumber === selectedWeek && ev.dayIndex === targetDay);
    const nextSlotIndex = existingOnDay.length % standardSlots.length;
    const chosenSlot = standardSlots[nextSlotIndex] || standardSlots[0];

    setSlotDept(targetDept);
    setSlotClassName(targetClass);
    setSlotCourseCode(deptCourse?.code || "");
    setSlotCourseName(deptCourse?.name || "");
    setSlotLectureTitle("");
    setSlotLectureNumber(existingOnDay.length + 1);
    setSlotDayIndex(targetDay);
    setSlotStartTime(chosenSlot.start);
    setSlotEndTime(chosenSlot.end);
    setSlotRoom(classrooms[0]?.roomNumber || "");
    setSlotBuilding(classrooms[0]?.building || "");
    setSlotFaculty(
      deptCourse?.instructor ||
        (facultyList[0]?.first_name ? `${facultyList[0].first_name} ${facultyList[0].last_name || ""}`.trim() : "")
    );
    setSlotType("LECTURE");
    setSlotTopics("");
    setIsAddSlotModalOpen(true);
  };

  // Open Edit Slot Modal
  const handleOpenEditSlot = (ev: CalendarScheduleEvent) => {
    setEditingSlot(ev);
    setSlotDept(ev.facultyDepartment || departments[0]?.name || "");
    setSlotClassName(ev.className || (selectedClass !== "ALL" ? selectedClass : ""));
    setSlotCourseCode(ev.courseCode);
    setSlotCourseName(ev.courseName);
    setSlotLectureTitle(ev.lectureTitle);
    setSlotLectureNumber(ev.lectureNumber);
    setSlotDayIndex(ev.dayIndex);
    setSlotStartTime(ev.startTime);
    setSlotEndTime(ev.endTime);
    setSlotRoom(ev.room);
    setSlotBuilding(ev.building || "");
    setSlotFaculty(ev.faculty);
    setSlotType(ev.type as any);
    setSlotTopics(ev.sessionAgenda?.join("\n") || ev.readingMaterials || "");
    setIsAddSlotModalOpen(true);
  };

  // When a course is picked from dropdown
  const handleCourseSelectionChange = (courseCode: string) => {
    const selected = courses.find((c) => c.code === courseCode);
    if (selected) {
      setSlotCourseCode(selected.code);
      setSlotCourseName(selected.name);

      // Check if teacher is assigned to this course in this class
      let assignedTeacher = "";
      for (const d of departments) {
        for (const coh of d.cohorts || []) {
          const matchClass =
            coh.name?.trim().toLowerCase() === slotClassName.trim().toLowerCase() ||
            slotClassName.trim().toLowerCase().includes(coh.name?.trim().toLowerCase() || "");
          if (matchClass && coh.courseInstructors && coh.courseInstructors[selected.code]) {
            const inst = coh.courseInstructors[selected.code];
            if (inst && inst !== "Unassigned") {
              assignedTeacher = inst;
              break;
            }
          }
        }
        if (assignedTeacher) break;
      }

      if (assignedTeacher) {
        setSlotFaculty(assignedTeacher);
      } else if (selected.instructor && selected.instructor !== "Unassigned") {
        setSlotFaculty(selected.instructor);
      }
    } else {
      setSlotCourseCode(courseCode);
    }
  };

  // Multi-Vector Conflict Engine (Room, Faculty & Cohort)
  const activeConflict = useMemo(() => {
    return checkScheduleConflicts({
      roomNumber: slotRoom,
      facultyName: slotFaculty,
      className: slotClassName,
      dayIndex: slotDayIndex,
      weekNumber: selectedWeek,
      startTime: slotStartTime,
      endTime: slotEndTime,
      excludeEventId: editingSlot?.id,
    });
  }, [
    checkScheduleConflicts,
    slotRoom,
    slotFaculty,
    slotClassName,
    slotDayIndex,
    selectedWeek,
    slotStartTime,
    slotEndTime,
    editingSlot,
  ]);

  // Save Slot (Add or Update)
  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotClassName.trim() || !slotCourseCode.trim() || !slotFaculty.trim() || !slotRoom.trim()) {
      showToast("Please select a class group, course, faculty member, and room venue.");
      return;
    }

    const targetSlotDateStr = getEstimatedDateForWeekDay(selectedWeek, slotDayIndex);
    const targetSlotDateNum = new Date(`${targetSlotDateStr}T12:00:00`).getDate();

    if (targetSlotDateStr < todayIso) {
      showToast(`⚠️ Classes cannot be scheduled on past dates (${targetSlotDateStr}). Classes must be scheduled for today or future dates only.`);
      return;
    }

    if (activeConflict.hasConflict) {
      showToast(`⚠️ Schedule Conflict Detected: ${activeConflict.message}`);
      return;
    }

    const agendaList = slotTopics
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    const cleanTitle = slotCourseName.trim()
      ? `${slotCourseName.trim()} (${slotType === "LAB" ? "Lab" : slotType === "TUTORIAL" ? "Tutorial" : slotType === "EXAM" ? "Exam" : "Lecture"})`
      : (slotLectureTitle && slotLectureTitle.trim() && slotLectureTitle.trim() !== "object" ? slotLectureTitle.trim() : "Scheduled Class");
    const cleanLectureNumber = 1;

    try {
      if (editingSlot) {
        // Update existing slot
        updateScheduleEvent({
          ...editingSlot,
          className: slotClassName,
          courseCode: slotCourseCode.trim(),
          courseName: slotCourseName.trim(),
          lectureNumber: cleanLectureNumber,
          lectureTitle: cleanTitle,
          dayIndex: slotDayIndex,
          weekNumber: selectedWeek,
          dateNumber: targetSlotDateNum,
          dateString: targetSlotDateStr,
          startTime: slotStartTime.trim(),
          endTime: slotEndTime.trim(),
          room: slotRoom.trim(),
          building: slotBuilding.trim(),
          faculty: slotFaculty.trim(),
          facultyDepartment: slotDept || slotClassName,
          type: slotType,
          sessionAgenda: agendaList,
          readingMaterials: slotTopics.trim() || "",
        });
        showToast(`✓ Updated class slot "${cleanTitle}".`);
      } else {
        // Create new slot
        addScheduleEvent({
          className: slotClassName,
          courseCode: slotCourseCode.trim(),
          courseName: slotCourseName.trim(),
          lectureNumber: cleanLectureNumber,
          lectureTitle: cleanTitle,
          dayIndex: slotDayIndex,
          weekNumber: selectedWeek,
          dateNumber: targetSlotDateNum,
          dateString: targetSlotDateStr,
          startTime: slotStartTime.trim(),
          endTime: slotEndTime.trim(),
          startHour: parseInt(slotStartTime) || 9,
          durationHours: 1.0,
          room: slotRoom.trim(),
          building: slotBuilding.trim(),
          faculty: slotFaculty.trim(),
          facultyTitle: "",
          facultyPhoto: "",
          facultyEmail: facultyList.find((f) => `${f.first_name} ${f.last_name || ""}`.trim() === slotFaculty.trim())?.email || "",
          facultyDepartment: slotDept || slotClassName,
          type: slotType,
          colorBadge:
            slotType === "LAB"
              ? "bg-slate-800 text-white"
              : slotType === "EXAM"
              ? "bg-slate-900 text-white"
              : slotType === "TUTORIAL"
              ? "bg-slate-700 text-white"
              : "bg-blue-600 text-white",
          sessionAgenda: agendaList,
          prerequisites: "",
          learningOutcomes: "",
          readingMaterials: slotTopics.trim(),
        });
        showToast(`✓ Scheduled "${cleanTitle}" for ${slotClassName} on ${targetSlotDateStr}.`);
      }

      setIsAddSlotModalOpen(false);
      setEditingSlot(null);
    } catch (err: any) {
      showToast(`⚠️ ${err?.message || "Could not save slot."}`);
    }
  };

  // Execute schedule duplication (Strictly future target weeks only)
  const handleExecuteCopySchedule = () => {
    let targetWeeks: number[] = [];
    if (copyTargetMode === "NEXT_WEEK") {
      const nextW = Math.max(currentWeekNumber + 1, sourceWeek + 1);
      if (nextW > 20) {
        showToast("⚠️ All 20 semester weeks have passed. Choose custom future weeks.");
        return;
      }
      targetWeeks = [nextW];
    } else if (copyTargetMode === "CUSTOM_WEEKS") {
      targetWeeks = selectedCustomWeeks.filter((w) => w !== sourceWeek && w > currentWeekNumber);
    } else if (copyTargetMode === "ENTIRE_MONTH") {
      const startW = Math.max(currentWeekNumber + 1, sourceWeek + 1);
      targetWeeks = Array.from({ length: 4 }, (_, i) => startW + i).filter((w) => w <= 20 && w !== sourceWeek && w > currentWeekNumber);
      if (targetWeeks.length === 0) {
        targetWeeks = Array.from({ length: 20 }, (_, i) => i + 1).filter((w) => w > currentWeekNumber && w !== sourceWeek);
      }
    } else if (copyTargetMode === "FULL_SEMESTER") {
      targetWeeks = Array.from({ length: 20 }, (_, i) => i + 1).filter((w) => w > currentWeekNumber && w !== sourceWeek);
    }

    if (targetWeeks.length === 0) {
      showToast("⚠️ Please select at least one future target week. Classes cannot be scheduled on today or earlier dates.");
      return;
    }

    const activeClassFilter = copyScope === "SELECTED" && selectedClass !== "ALL" ? selectedClass : undefined;

    // Check how many slots exist in source week
    const sourceCount = calendarSchedules.filter((ev) => {
      if (Number(ev.weekNumber) !== Number(sourceWeek)) return false;
      if (activeClassFilter) {
        const evClass = (ev.className || "").trim().toLowerCase();
        const fClass = activeClassFilter.trim().toLowerCase();
        return evClass === fClass || evClass.includes(fClass) || fClass.includes(evClass) || evClass.includes("all classes") || evClass.includes("common");
      }
      return true;
    }).length;

    if (sourceCount === 0) {
      showToast(`⚠️ No scheduled classes found in Week ${sourceWeek}${activeClassFilter ? ` for "${activeClassFilter}"` : ""} to replicate.`);
      return;
    }

    copyScheduleToWeeks(sourceWeek, targetWeeks, activeClassFilter);
    setIsCopyModalOpen(false);
    showToast(`✓ Successfully replicated ${sourceCount} class slot(s) from Week ${sourceWeek} across future week(s) ${targetWeeks.join(", ")}!`);
  };

  // Execute clean duplicates and past-week copies
  const handleCleanDuplicates = () => {
    const res = purgeDuplicateSchedules();
    if (res.removedCount > 0) {
      showToast(`✓ Cleaned and removed ${res.removedCount} duplicate / legacy copied class slot(s)!`);
    } else {
      showToast("✓ Schedule is already completely clean! Zero duplicate slots found.");
    }
  };

  // Execute add holiday
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim()) return;

    addInstitutionalHoliday({
      name: holidayName.trim(),
      startDate: holidayStartDate,
      endDate: holidayEndDate,
      type: holidayType,
      description: holidayDesc.trim() || undefined,
      isCampusClosed,
    });

    setHolidayName("");
    setHolidayDesc("");
    setIsAddHolidayModalOpen(false);
    showToast(`✓ Official holiday "${holidayName}" added to Academic Calendar.`);
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-5 inset-x-4 sm:left-auto sm:right-5 sm:max-w-md z-50 bg-white text-slate-800 px-4 py-3 rounded-lg shadow-lg border border-emerald-200 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </motion.div>
      )}

      {/* Header & Master Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
              <CalendarDays className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Class Timetable &amp; Master Calendar
            </h2>

          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage class groups, lessons, faculty, and rooms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => { setActiveTab("TIMETABLE"); setIsAddingNewClass(true); document.getElementById("timetable-class-filter")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-1.5 hover:border-blue-500"
          >
            <Plus className="h-4 w-4" /> Add class group
          </button>
          <button
            onClick={() => {
              setSourceWeek(selectedWeek);
              setCopyScope(selectedClass !== "ALL" ? "SELECTED" : "ALL");
              setIsCopyModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy / Replicate</span>
          </button>

          <button
            onClick={handleCleanDuplicates}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Clean duplicate and past-week copied class slots"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Clean Duplicates</span>
          </button>

          <button
            onClick={() => setIsAddHolidayModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Add Holiday</span>
          </button>

          <button
            onClick={() => handleOpenAddSlot()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add lesson</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap">
        {[
          { id: "TIMETABLE", label: `Weekly Timetable (${selectedClass === "ALL" ? "All Classes" : selectedClass})`, count: weekEvents.length },
          { id: "FACULTY_TIMETABLE", label: "Faculty Timetable Inspector", count: facultyList.length },
          { id: "ROOM_OCCUPANCY", label: "Room Occupancy Matrix", count: classrooms.length },
          { id: "HOLIDAYS", label: "Holidays & Campus Recess", count: institutionalHolidays.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  isActive ? "bg-blue-700 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WEEKLY TIMETABLE MATRIX WITH DEPARTMENT & CLASS SELECTOR */}
      {/* ========================================================================= */}
      {activeTab === "TIMETABLE" && (
        <div className="space-y-4">
          {/* Department & Class Filter Bar */}
          <div id="timetable-class-filter" className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Department Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-blue-600 shrink-0" />
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department:</label>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedClass("ALL");
                  }}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Selector with Search Bar and All Option Dropdown */}
              <div className="flex items-center gap-2 flex-wrap pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Class:</span>
                </div>

                <div className="relative flex items-center gap-1.5">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={classSearchFilter}
                      onChange={(e) => setClassSearchFilter(e.target.value)}
                      placeholder="Search class / section..."
                      className="h-8 pl-8 pr-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs w-36 sm:w-44 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {classSearchFilter && (
                      <button
                        onClick={() => setClassSearchFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown with All Classes option */}
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    aria-label="Filter class group"
                    className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold max-w-[210px] truncate"
                  >
                    <option value="ALL">All Classes ({visibleClasses.length})</option>
                    {filteredVisibleClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Inline Add Class Button */}
                {isAddingNewClass ? (
                  <form onSubmit={handleAddNewClass} className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto p-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-blue-400 shadow-sm">
                    {selectedDept === "ALL" && (
                      <select
                        value={newClassDept}
                        onChange={(e) => setNewClassDept(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      >
                        {departments.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      autoFocus
                      value={newClassNameInput}
                      onChange={(e) => setNewClassNameInput(e.target.value)}
                      placeholder="e.g. B.Tech CSE - Sem 5 (Sec B)"
                      className="h-8 min-w-0 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none"
                    />
                    <button type="submit" className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewClass(false)}
                      className="h-8 px-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingNewClass(true)}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Class</span>
                  </button>
                )}
              </div>
            </div>

            {/* Semester / Term & Week Selector Chips & Jump to Today Button */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Academic Term / Semester Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">Semester:</span>
                <select
                  value={selectedTermId}
                  onChange={(event) => {
                    setSelectedTermId(event.target.value);
                  }}
                  aria-label="Academic semester term"
                  className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="CURRENT_SEMESTER">Current Term (Jul – Dec 2026)</option>
                  <option value="SPRING_2026">Spring Semester (Jan – Jun 2026)</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWeek(currentWeekNumber)}
                className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                  selectedWeek === currentWeekNumber
                    ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/50"
                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100"
                }`}
                title="Jump directly to current week containing today"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
                <span>Today: {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Date Range:</span>
                <select
                  value={selectedWeek}
                  onChange={(event) => setSelectedWeek(Number(event.target.value))}
                  aria-label="Timetable date range"
                  className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {Array.from({ length: 20 }, (_, index) => index + 1).map((week) => (
                    <option key={week} value={week}>
                      {getWeekRangeLabel(week)} {week === currentWeekNumber ? " • (Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

                    {/* ─── DATE-WISE CONTROLS & TIMETABLE VIEW TOGGLE ─── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Date-Wise Navigation & Jump-to-Date */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Previous Date Range"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-bold text-xs text-slate-800 dark:text-slate-200 font-mono">
                  {getWeekRangeLabel(selectedWeek)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedWeek((w) => Math.min(20, w + 1))}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Next Date Range"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500">Jump to Date:</span>
                <input
                  type="date"
                  value={getEstimatedDateForWeekDay(selectedWeek, 1) || todayIso}
                  onChange={(e) => {
                    const pickedDate = e.target.value;
                    if (!pickedDate) return;
                    for (let w = 1; w <= 20; w++) {
                      const start = getEstimatedDateForWeekDay(w, 1);
                      const end = getEstimatedDateForWeekDay(w, 0);
                      if (pickedDate >= start && pickedDate <= end) {
                        setSelectedWeek(w);
                        break;
                      }
                    }
                  }}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                />
              </div>
            </div>

            {/* View Mode Toggle: Cohort Schedule Grid vs Time-Slot Matrix */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">View:</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setTimetableDisplayMode("SECTION_TIMETABLE")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    timetableDisplayMode === "SECTION_TIMETABLE"
                      ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Weekly Schedule Grid
                </button>
                <button
                  type="button"
                  onClick={() => setTimetableDisplayMode("CAMPUS_AGGREGATION")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    timetableDisplayMode === "CAMPUS_AGGREGATION"
                      ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Time-Slot Matrix
                </button>
              </div>
            </div>
          </div>

                    {/* ─── CAMPUS TIME-SLOT AGGREGATION MATRIX VIEW ─── */}
          {timetableDisplayMode === "CAMPUS_AGGREGATION" && (() => {
            const standardPeriods = [
              "08:30 AM - 09:30 AM",
              "09:30 AM - 10:30 AM",
              "10:45 AM - 11:45 AM",
              "11:45 AM - 12:45 PM",
              "01:30 PM - 02:30 PM",
              "02:30 PM - 03:30 PM",
              "03:30 PM - 04:30 PM",
              "04:30 PM - 05:30 PM",
            ];

            return (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Campus Time-Slot Aggregation &amp; Room Throughput Matrix
                    </h4>
                    <p className="text-xs text-slate-500">
                      Aggregates all running classes across 100 sections by time period. Click any slot to drill into classes.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600">
                    Week {selectedWeek} Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 w-40 border-r border-slate-200 dark:border-slate-700">Period Slot</th>
                        {daysOfWeek.filter((d) => d.index !== 0).map((d) => (
                          <th key={d.index} className="p-3 text-center border-r border-slate-200 dark:border-slate-700">
                            {d.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {standardPeriods.map((period) => (
                        <tr key={period} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                            {period}
                          </td>
                          {daysOfWeek.filter((d) => d.index !== 0).map((d) => {
                            const matchingEvents = weekEvents.filter((ev) => {
                              const matchesDay = ev.dayIndex === d.index;
                              const evStart = (ev.startTime || "").trim().slice(0, 5);
                              const periodStart = period.split("-")[0].trim().slice(0, 5);
                              const matchesTime = evStart === periodStart || period.includes(evStart);
                              return matchesDay && matchesTime;
                            });
                            const slotCount = matchingEvents.length;
                            const totalCampusRooms = classrooms.length > 0 ? classrooms.length : 113;
                            const roomCapPct = slotCount > 0 ? Math.min(100, Math.round((slotCount / totalCampusRooms) * 100)) : 0;

                            return (
                              <td key={d.index} className="p-2.5 text-center border-r border-slate-200 dark:border-slate-700">
                                {slotCount === 0 ? (
                                  <div className="w-full p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-3 text-slate-400">
                                    <span className="text-[11px] font-medium text-slate-400 block">Vacant</span>
                                    <span className="text-[10px] text-slate-400 font-mono">0 Classes</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSlotDrilldownModal({
                                        time: period,
                                        dayIndex: d.index,
                                        dayName: d.name,
                                        events: matchingEvents,
                                      });
                                    }}
                                    className="w-full p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 hover:border-blue-400 transition-all text-left space-y-1 cursor-pointer group shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-blue-900 dark:text-blue-200 group-hover:text-blue-600">
                                        {slotCount} {slotCount === 1 ? "Class" : "Classes"}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-emerald-600">
                                        {roomCapPct}% Rooms
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${roomCapPct}%` }} />
                                    </div>
                                    <span className="text-[10px] text-slate-400 block pt-0.5 truncate">
                                      Click to inspect classes &rarr;
                                    </span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Timetable Grid View (Monday to Sunday) */}
          {timetableDisplayMode === "SECTION_TIMETABLE" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
              {daysOfWeek.map((day) => {
                const dayEvents = weekEvents.filter((ev) => ev.dayIndex === day.index);
                const dayHoliday = getHolidayForDay(selectedWeek, day.index);
                const dayDateStr = getEstimatedDateForWeekDay(selectedWeek, day.index);
                const isToday = dayDateStr === todayIso;
                const isPastDay = dayDateStr < todayIso;
                const formattedDate = dayDateStr
                  ? new Date(`${dayDateStr}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "";

                return (
                  <div
                    key={day.index}
                    className={`min-h-[440px] flex flex-col transition-all relative ${
                      isToday
                        ? "ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50/20 dark:bg-blue-950/25 z-10 shadow-md"
                        : dayHoliday?.isCampusClosed
                        ? "bg-amber-50/20 dark:bg-amber-950/10"
                        : isPastDay
                        ? "bg-slate-50/40 dark:bg-slate-900/60 opacity-90"
                        : ""
                    }`}
                  >
                    {/* Day Column Header with Quick Add Button */}
                    <div
                      className={`p-2.5 px-3 border-b flex items-center justify-between ${
                        isToday
                          ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-600 shadow-xs"
                          : dayHoliday
                          ? "bg-amber-100/70 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60"
                          : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-black block tracking-tight ${
                              isToday ? "text-white" : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {day.short}, {formattedDate || dayDateStr}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
                              TODAY
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            isToday ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {day.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (isPastDay) {
                            showToast(`⚠️ Classes cannot be scheduled on past dates (${dayDateStr}). Classes must be scheduled for today or future dates only.`);
                            return;
                          }
                          handleOpenAddSlot(day.index);
                        }}
                        title={isPastDay ? "Date passed (Scheduling disabled)" : `Add class to ${day.name}`}
                        className={`p-1 rounded-lg border transition-colors shadow-2xs ${
                          isPastDay
                            ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                            : isToday
                            ? "bg-white/20 hover:bg-white text-white hover:text-blue-700 border-white/30 cursor-pointer"
                            : "bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 cursor-pointer"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Holiday Suspension Notice if Day is an Institutional Holiday */}
                    {dayHoliday && (
                      <div className="m-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                          <Sun className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{dayHoliday.name}</span>
                        </div>
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
                          {dayHoliday.isCampusClosed
                            ? "Campus Closed • Regular Classes Suspended"
                            : "Institutional Recess • Open Study"}
                        </p>
                      </div>
                    )}

                    {/* Classes in this Day */}
                    <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto">
                      {dayEvents.length === 0 ? (
                        <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                          <p className="text-[11px] text-slate-400">
                            {dayHoliday?.isCampusClosed ? "No classes on holiday" : isPastDay ? "No class recorded on this date" : "No session scheduled"}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (isPastDay) {
                                showToast(`⚠️ Classes cannot be scheduled on past dates (${dayDateStr}). Classes must be scheduled for today or future dates only.`);
                                return;
                              }
                              handleOpenAddSlot(day.index);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 ${
                              isPastDay
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                : "bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 cursor-pointer"
                            }`}
                          >
                            <Plus className="h-3 w-3" />
                            <span>{isPastDay ? "Date Passed" : "Add Slot"}</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          {dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              onClick={() => handleOpenEditSlot(ev)}
                              className={`p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:shadow-md hover:border-blue-300 transition-all relative group cursor-pointer ${
                                dayHoliday?.isCampusClosed ? "opacity-75" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                  {ev.className ? `${ev.className} • ${ev.courseCode}` : ev.courseCode}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditSlot(ev);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                    title="Edit Slot"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await deleteScheduleEvent(ev.id);
                                        showToast(`Deleted slot "${ev.lectureTitle}".`);
                                      } catch (error) {
                                        showToast(error instanceof Error ? error.message : "Class could not be deleted.");
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Delete Slot"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                                  {ev.lectureTitle}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{ev.courseName}</p>
                              </div>

                              <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-1 font-mono">
                                  <Clock className="h-3 w-3 text-blue-600 shrink-0" />
                                  <span>{ev.startTime} - {ev.endTime}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{ev.faculty}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{ev.room}</span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Persistent Add Another Class Button for this Day */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isPastDay) {
                                showToast(`⚠️ Classes cannot be scheduled on past dates (${dayDateStr}). Classes must be scheduled for today or future dates only.`);
                                return;
                              }
                              handleOpenAddSlot(day.index);
                            }}
                            className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-2 ${
                              isPastDay
                                ? "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                                : "border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            }`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{isPastDay ? "Date Passed (View Only)" : `Add Class to ${day.name}`}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}

      {/* TAB: FACULTY TIMETABLE INSPECTOR */}
      {/* ========================================================================= */}
      {activeTab === "FACULTY_TIMETABLE" && (() => {
        const activeFaculty = facultyList.find((f) => f.email === selectedFacultyEmail) || facultyList[0];
        const activeFacultyName = activeFaculty ? `${activeFaculty.first_name} ${activeFaculty.last_name || ""}`.trim() : "";
        
        const facultyScheduleEvents = calendarSchedules.filter((ev) => {
          if (!activeFacultyName) return false;
          const evFac = (ev.faculty || "").toLowerCase();
          const targetFac = activeFacultyName.toLowerCase();
          return evFac.includes(targetFac) || targetFac.includes(evFac);
        });

        const weekFacultyEvents = facultyScheduleEvents.filter((ev) => ev.weekNumber === selectedWeek);
        const assignedCoursesForFaculty = courses.filter((c) => {
          if (!activeFacultyName) return false;
          return c.instructor && (c.instructor.toLowerCase().includes(activeFacultyName.toLowerCase()) || activeFacultyName.toLowerCase().includes(c.instructor.toLowerCase()));
        });

        const searchedFacultyList = facultySearchInput.trim()
          ? facultyList.filter(
              (f) =>
                `${f.first_name} ${f.last_name || ""}`.toLowerCase().includes(facultySearchInput.toLowerCase()) ||
                (f.department || "").toLowerCase().includes(facultySearchInput.toLowerCase()) ||
                (f.email || "").toLowerCase().includes(facultySearchInput.toLowerCase()) ||
                (f.designation || "").toLowerCase().includes(facultySearchInput.toLowerCase())
            )
          : facultyList;

        return (
          <div className="space-y-4">
            {/* Faculty Selector & Profile Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {activeFaculty ? `${activeFaculty.first_name[0]}${activeFaculty.last_name?.[0] || ""}` : "F"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {activeFacultyName || "Select Faculty"}
                    </h3>
                    {activeFaculty && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50">
                        {activeFaculty.designation || activeFaculty.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{activeFaculty?.department || "Academic Department"}</span>
                    <span>•</span>
                    <span className="font-mono">{activeFaculty?.email || "No email"}</span>
                    {activeFaculty?.office_number && (
                      <>
                        <span>•</span>
                        <span>Office: {activeFaculty.office_number}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Searchable Faculty Picker */}
                <div className="relative">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={facultySearchInput}
                      onChange={(e) => {
                        setFacultySearchInput(e.target.value);
                        setIsFacultySearchOpen(true);
                      }}
                      onFocus={() => setIsFacultySearchOpen(true)}
                      placeholder={activeFacultyName ? `Current: ${activeFacultyName}` : "Search 50+ faculty..."}
                      className="w-48 sm:w-60 text-xs font-bold bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />
                    {facultySearchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setFacultySearchInput("");
                          setIsFacultySearchOpen(false);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {isFacultySearchOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-80 max-h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto z-50 p-1.5 space-y-1 animate-fade-in">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>Faculty Directory</span>
                        <span className="font-mono">{searchedFacultyList.length} instructors</span>
                      </div>
                      {searchedFacultyList.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">No matching faculty found</div>
                      ) : (
                        searchedFacultyList.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setSelectedFacultyEmail(f.email);
                              setFacultySearchInput(`${f.first_name} ${f.last_name || ""}`.trim());
                              setIsFacultySearchOpen(false);
                            }}
                            className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                              f.email === activeFaculty?.email ? "bg-blue-50 dark:bg-blue-950/60" : ""
                            }`}
                          >
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                {f.first_name} {f.last_name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {f.department || "Academic Dept"} • {f.email}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                              {f.designation || "Faculty"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Book Slot Action */}
                <button
                  type="button"
                  onClick={() => setIsBookConsultationModalOpen(true)}
                  className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Book Slot</span>
                </button>

                {/* Week Selector */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeek(w)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        selectedWeek === w
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      W{w}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Weekly Lectures</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                  {weekFacultyEvents.length} <span className="text-xs font-normal text-slate-400">hours / week</span>
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Courses</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                  {assignedCoursesForFaculty.length} <span className="text-xs font-normal text-slate-400">courses</span>
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Academic Load</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {weekFacultyEvents.length >= 12 ? "Full Load (100%)" : `${Math.round((weekFacultyEvents.length / 14) * 100)}% Capacity`}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Office Hours</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2 block truncate">
                  {activeFaculty?.office_hours || "Mon - Thu: 3:00 PM - 5:00 PM"}
                </span>
              </div>
            </div>

            {/* Weekly Timetable Grid for Selected Faculty */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                {daysOfWeek.filter((d) => d.index !== 0).map((day) => {
                  const dayEvents = weekFacultyEvents.filter((ev) => ev.dayIndex === day.index);
                  const dayHoliday = getHolidayForDay(selectedWeek, day.index);

                  return (
                    <div key={day.index} className="min-h-[360px] flex flex-col bg-slate-50/30 dark:bg-slate-900">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                          {day.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {dayEvents.length} class{dayEvents.length !== 1 ? "es" : ""}
                        </span>
                      </div>

                      <div className="p-2 space-y-2 flex-1">
                        {dayHoliday ? (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl text-center">
                            <Sun className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">{dayHoliday.name}</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">Campus Closed</span>
                          </div>
                        ) : dayEvents.length === 0 ? (
                          <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-emerald-200 dark:border-emerald-950/60 rounded-xl space-y-1.5 bg-emerald-50/20 dark:bg-emerald-950/10">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">🟢 Available / Free</span>
                            <span className="text-[9px] text-slate-400">No lecture scheduled</span>
                            <button
                              type="button"
                              onClick={() => {
                                setConsultationDay(day.index);
                                setIsBookConsultationModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                              + Book Slot
                            </button>
                          </div>
                        ) : (
                          dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-blue-700 dark:text-blue-300 font-mono">
                                  {ev.courseCode}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {ev.type}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                                {ev.courseName}
                              </h4>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>{ev.startTime} - {ev.endTime}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                                <span className="flex items-center gap-1 font-semibold">
                                  <MapPin className="h-3 w-3 text-emerald-500" />
                                  <span>{ev.room}</span>
                                </span>
                                <span className="truncate max-w-[90px]">{ev.className}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB: LIVE ROOM OCCUPANCY MATRIX */}
      {/* ========================================================================= */}
      {activeTab === "ROOM_OCCUPANCY" && (() => {
        const standardSlots = [
          { label: "09:00 - 10:00 AM", start: "09:00 AM", end: "10:00 AM" },
          { label: "10:00 - 11:00 AM", start: "10:00 AM", end: "11:00 AM" },
          { label: "11:15 - 12:15 PM", start: "11:15 AM", end: "12:15 PM" },
          { label: "01:15 - 02:15 PM", start: "01:15 PM", end: "02:15 PM" },
          { label: "02:15 - 03:15 PM", start: "02:15 PM", end: "03:15 PM" },
          { label: "03:30 - 04:30 PM", start: "03:30 PM", end: "04:30 PM" },
        ];

        const dayHoliday = getHolidayForDay(selectedWeek, selectedRoomOccupancyDay);
        const dayEvents = calendarSchedules.filter(
          (ev) => ev.weekNumber === selectedWeek && ev.dayIndex === selectedRoomOccupancyDay
        );

        const filteredClassrooms = classrooms.filter((r) => {
          if (selectedRoomBuildingFilter === "ALL") return true;
          return r.building === selectedRoomBuildingFilter;
        });

        const allBuildings = Array.from(new Set(classrooms.map((r) => r.building))).filter(Boolean);

        let totalSlotsPossible = filteredClassrooms.length * standardSlots.length;
        let totalBookedSlots = 0;

        filteredClassrooms.forEach((r) => {
          standardSlots.forEach((slot) => {
            const isOccupied = dayEvents.some((ev) => {
              const rMatch = (ev.room || "").trim().toLowerCase() === r.roomNumber.trim().toLowerCase();
              return rMatch && ev.startTime === slot.start;
            });
            if (isOccupied) totalBookedSlots++;
          });
        });

        const occupancyRate = totalSlotsPossible > 0 ? Math.round((totalBookedSlots / totalSlotsPossible) * 100) : 0;

        return (
          <div className="space-y-4">
            {/* Control Bar: Day, Week, Building */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Live Room Occupancy &amp; Booking Matrix
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Live Booking Grid
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Inspect which lecture hall or lab is booked at what time, or discover free slots for ad-hoc scheduling.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Day Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {daysOfWeek.filter((d) => d.index !== 0).map((d) => (
                    <button
                      key={d.index}
                      onClick={() => setSelectedRoomOccupancyDay(d.index)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        selectedRoomOccupancyDay === d.index
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>

                {/* Week Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeek(w)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        selectedWeek === w
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      W{w}
                    </button>
                  ))}
                </div>

                {/* Building Filter */}
                <select
                  value={selectedRoomBuildingFilter}
                  onChange={(e) => setSelectedRoomBuildingFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Buildings ({classrooms.length} Rooms)</option>
                  {allBuildings.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Rooms</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {filteredClassrooms.length} <span className="text-xs font-normal text-slate-400">facilities</span>
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Booked Slots</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                  {totalBookedSlots} <span className="text-xs font-normal text-slate-400">hours</span>
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Free Slots</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {totalSlotsPossible - totalBookedSlots} <span className="text-xs font-normal text-slate-400">available</span>
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Day Utilization</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                  {occupancyRate}% <span className="text-xs font-normal text-slate-400">occupied</span>
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <th className="p-3.5 w-48">Room &amp; Capacity</th>
                    {standardSlots.map((slot) => (
                      <th key={slot.start} className="p-3.5 text-center">
                        {slot.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredClassrooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <DoorOpen className="h-3.5 w-3.5 text-blue-600" />
                          <span>{room.roomNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {room.building} • Cap: {room.capacity}
                        </div>
                      </td>

                      {standardSlots.map((slot) => {
                        const matchingEvent = dayEvents.find((ev) => {
                          const rMatch = (ev.room || "").trim().toLowerCase() === room.roomNumber.trim().toLowerCase();
                          return rMatch && ev.startTime === slot.start;
                        });

                        return (
                          <td key={slot.start} className="p-2 text-center align-top">
                            {matchingEvent ? (
                              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-left space-y-0.5 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[11px] text-blue-700 dark:text-blue-300 font-mono">
                                    {matchingEvent.courseCode}
                                  </span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                                    BOOKED
                                  </span>
                                </div>
                                <div className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                  {matchingEvent.faculty}
                                </div>
                                <div className="text-[9px] text-slate-500 truncate">
                                  {matchingEvent.className}
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-center">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                                  ● FREE
                                </span>
                                <span className="text-[9px] text-slate-400">Avail</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 2: INSTITUTIONAL HOLIDAYS & BREAKS REGISTRY */}
      {/* ========================================================================= */}
      {activeTab === "HOLIDAYS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Official Institutional Non-Instructional Days &amp; Holidays
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled non-instructional periods automatically suspend classroom lectures on student &amp; faculty timetables.
              </p>
            </div>
            <button
              onClick={() => setIsAddHolidayModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Declare New Holiday</span>
            </button>
          </div>

          {institutionalHolidays.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <Sun className="h-10 w-10 text-amber-500 mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Holidays Declared Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You can add national holidays, exam preparation breaks, or term recesses that will be reflected on all schedules.
              </p>
              <button
                onClick={() => setIsAddHolidayModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Declare First Holiday</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {institutionalHolidays.map((hol) => (
                <div
                  key={hol.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        hol.type === "NATIONAL"
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                          : hol.type === "RECESS"
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                          : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                      }`}
                    >
                      {hol.type.replace("_", " ")}
                    </span>
                    <button
                      onClick={() => {
                        deleteInstitutionalHoliday(hol.id);
                        showToast(`Removed holiday "${hol.name}".`);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{hol.name}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1">
                      <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span>
                        {hol.startDate} {hol.endDate && hol.endDate !== hol.startDate ? `to ${hol.endDate}` : ""}
                      </span>
                    </div>
                  </div>

                  {hol.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {hol.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Campus Status:</span>
                    <span
                      className={`font-semibold ${
                        hol.isCampusClosed ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {hol.isCampusClosed ? "Closed / Suspended" : "Open for Study"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TERM BATCH REPLICATION MATRIX */}
      

      {/* ========================================================================= */}
      {/* ─── MODAL 0: 1-CLICK AUTO-GENERATE TIMETABLE ─── */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAutoGenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans"
            >
              <div className="px-6 py-4 bg-blue-50 text-slate-900 border-b border-blue-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h3 className="font-bold text-sm">Timetable Scheduler</h3>
                </div>
                <button
                  onClick={() => setIsAutoGenerateModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-blue-100 text-slate-500 hover:text-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Automatic Balanced Schedule Engine</p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                      Distributes lectures, tutorials, and lab sessions evenly across Monday through Friday with assigned faculty and designated classrooms, guaranteeing zero time-slot collisions.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Target Class Cohort:
                  </label>
                  <select
                    value={autoGenCohort}
                    onChange={(e) => setAutoGenCohort(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {allClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Primary Classroom / Hall:
                    </label>
                    <select
                      value={autoGenRoom}
                      onChange={(e) => setAutoGenRoom(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {classrooms.map((r) => (
                        <option key={r.id} value={r.roomNumber}>
                          {r.roomNumber} ({r.capacity} Seats - {r.building})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Baseline Week:
                    </label>
                    <select
                      value={autoGenWeek}
                      onChange={(e) => setAutoGenWeek(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w}>
                          Week {w} ({getWeekRangeLabel(w)}){w === currentWeekNumber ? " • (CURRENT)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenApplyAllWeeks}
                    onChange={(e) => setAutoGenApplyAllWeeks(e.target.checked)}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Deploy across all 16 semester weeks
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Replicates this balanced schedule across the entire academic term.
                    </span>
                  </div>
                </label>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setIsAutoGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteAutoGenerate}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Generate Full Timetable</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ─── MODAL 1: COPY / REPLICATE SCHEDULE ─── */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCopyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans"
            >
              <div className="px-6 py-4 bg-blue-50 text-slate-900 border-b border-blue-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-blue-400" />
                  <h3 className="font-bold text-sm">Copy &amp; Replicate Timetable Schedule</h3>
                </div>
                <button
                  onClick={() => setIsCopyModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-blue-100 text-slate-500 hover:text-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* 1. Source Week */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Source Week to Copy From:
                    </label>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {calendarSchedules.filter((ev) => Number(ev.weekNumber) === Number(sourceWeek)).length} classes in Week {sourceWeek}
                    </span>
                  </div>
                  <select
                    value={sourceWeek}
                    onChange={(e) => setSourceWeek(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => {
                      const count = calendarSchedules.filter((ev) => Number(ev.weekNumber) === w).length;
                      return (
                        <option key={w} value={w}>
                          Week {w} — {count} scheduled class{count === 1 ? "" : "es"}{w === selectedWeek ? " (Currently Viewing)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Class Scope (All vs Selected Class) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Class Scope to Replicate:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCopyScope("ALL")}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                        copyScope === "ALL"
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="block font-bold">All Classes in Week {sourceWeek}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {calendarSchedules.filter((ev) => Number(ev.weekNumber) === Number(sourceWeek)).length} total slots
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCopyScope("SELECTED")}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                        copyScope === "SELECTED"
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="block font-bold truncate">
                        {selectedClass !== "ALL" ? `Only ${selectedClass}` : "Only Active Class Filter"}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {selectedClass !== "ALL"
                          ? `${calendarSchedules.filter((ev) => Number(ev.weekNumber) === Number(sourceWeek) && ((ev.className || "").toLowerCase().includes(selectedClass.toLowerCase()) || selectedClass.toLowerCase().includes((ev.className || "").toLowerCase()))).length} class slots`
                          : "Filters to active class"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Destination Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Replication Destination Mode:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: "NEXT_WEEK", label: `Next Week (Week ${Math.min(20, Math.max(currentWeekNumber + 1, sourceWeek + 1))})`, desc: "Copies to immediate next upcoming week" },
                      { id: "ENTIRE_MONTH", label: `Upcoming Month (Weeks ${Math.max(currentWeekNumber + 1, sourceWeek + 1)}–${Math.min(20, Math.max(currentWeekNumber + 1, sourceWeek + 1) + 3)})`, desc: "Deploys 4-week upcoming block" },
                      { id: "FULL_SEMESTER", label: `Upcoming Semester (Weeks ${currentWeekNumber + 1} to 20)`, desc: "Deploys across all remaining future weeks" },
                      { id: "CUSTOM_WEEKS", label: "Custom Target Weeks", desc: "Handpick individual future weeks" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setCopyTargetMode(mode.id as any)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                          copyTargetMode === mode.id
                            ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold ring-1 ring-blue-500"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="block font-bold">{mode.label}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Target Weeks Checklist */}
                {copyTargetMode === "CUSTOM_WEEKS" && (
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between pb-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Select Target Destination Weeks (Upcoming Only):
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomWeeks(Array.from({ length: 20 }, (_, i) => i + 1).filter((w) => w !== sourceWeek && w > currentWeekNumber))}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Select All Future
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomWeeks([])}
                          className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Array.from({ length: 20 }, (_, i) => i + 1)
                        .filter((w) => w !== sourceWeek)
                        .map((w) => {
                          const isChecked = selectedCustomWeeks.includes(w);
                          const isPast = w <= currentWeekNumber;
                          return (
                            <button
                              key={w}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                if (isPast) return;
                                setSelectedCustomWeeks((prev) =>
                                  isChecked ? prev.filter((item) => item !== w) : [...prev, w]
                                );
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                isPast
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed"
                                  : isChecked
                                  ? "bg-blue-600 text-white shadow-xs cursor-pointer"
                                  : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-blue-400 cursor-pointer"
                              }`}
                            >
                              W{w}{isPast ? " (Current/Past)" : ""}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Live Preview Summary Card */}
                {(() => {
                  let targetWeeksCount = 0;
                  if (copyTargetMode === "NEXT_WEEK") {
                    targetWeeksCount = Math.max(currentWeekNumber + 1, sourceWeek + 1) <= 20 ? 1 : 0;
                  } else if (copyTargetMode === "CUSTOM_WEEKS") {
                    targetWeeksCount = selectedCustomWeeks.filter((w) => w !== sourceWeek && w > currentWeekNumber).length;
                  } else if (copyTargetMode === "ENTIRE_MONTH") {
                    const startW = Math.max(currentWeekNumber + 1, sourceWeek + 1);
                    targetWeeksCount = Array.from({ length: 4 }, (_, i) => startW + i).filter((w) => w <= 20 && w !== sourceWeek && w > currentWeekNumber).length;
                  } else if (copyTargetMode === "FULL_SEMESTER") {
                    targetWeeksCount = Array.from({ length: 20 }, (_, i) => i + 1).filter((w) => w > currentWeekNumber && w !== sourceWeek).length;
                  }

                  const activeClassFilter = copyScope === "SELECTED" && selectedClass !== "ALL" ? selectedClass : undefined;
                  const sourceCount = calendarSchedules.filter((ev) => {
                    if (Number(ev.weekNumber) !== Number(sourceWeek)) return false;
                    if (activeClassFilter) {
                      const evClass = (ev.className || "").trim().toLowerCase();
                      const fClass = activeClassFilter.trim().toLowerCase();
                      return evClass === fClass || evClass.includes(fClass) || fClass.includes(evClass) || evClass.includes("all classes") || evClass.includes("common");
                    }
                    return true;
                  }).length;

                  if (sourceCount === 0) {
                    return (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
                        ⚠️ <strong>Source Week {sourceWeek} has no scheduled class slots</strong> to copy. Choose another source week above.
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-xs space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span>Replication Preview:</span>
                        <span className="font-mono text-blue-700 dark:text-blue-300">{sourceCount * targetWeeksCount} total slots</span>
                      </div>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        Will replicate <strong>{sourceCount} class slot{sourceCount === 1 ? "" : "s"}</strong> from Week {sourceWeek} across <strong>{targetWeeksCount} target week{targetWeeksCount === 1 ? "" : "s"}</strong>. Existing schedules in those weeks for this scope will be refreshed.
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteCopySchedule}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Execute Schedule Replication
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ─── MODAL 2: ADD OFFICIAL HOLIDAY ─── */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddHolidayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans"
            >
              <div className="px-6 py-4 bg-blue-50 text-slate-900 border-b border-blue-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-400" />
                  <h3 className="font-bold text-sm">Declare Holiday / Recess</h3>
                </div>
                <button
                  onClick={() => setIsAddHolidayModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-blue-100 text-slate-500 hover:text-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddHoliday} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Holiday Name / Occasion:
                    </label>
                    <input
                      type="text"
                      required
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      placeholder="e.g. National Day, Mid-Term Study Recess"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Date:</label>
                      <input
                        type="date"
                        required
                        value={holidayStartDate}
                        onChange={(e) => setHolidayStartDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Date:</label>
                      <input
                        type="date"
                        required
                        value={holidayEndDate}
                        onChange={(e) => setHolidayEndDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Holiday Category:</label>
                    <select
                      value={holidayType}
                      onChange={(e) => setHolidayType(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="NATIONAL">Statutory National Holiday</option>
                      <option value="RECESS">Academic Reading Recess</option>
                      <option value="UNIVERSITY">University Ceremony / Event</option>
                      <option value="EXAM_BREAK">Pre-Exam Study Break</option>
                      <option value="MAINTENANCE">Campus Maintenance Day</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description / Directive:</label>
                    <textarea
                      rows={2}
                      value={holidayDesc}
                      onChange={(e) => setHolidayDesc(e.target.value)}
                      placeholder="Instructions for students and faculty..."
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isCampusClosed}
                      onChange={(e) => setIsCampusClosed(e.target.checked)}
                      className="rounded text-blue-600 h-4 w-4"
                    />
                    <span>Suspend all classroom lectures &amp; lab sessions on this date</span>
                  </label>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddHolidayModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                  >
                    Declare Holiday
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ─── MODAL 3: SCHEDULE / EDIT CLASS SLOT ─── */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddSlotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans"
            >
              <div className="px-6 py-4 bg-blue-50 text-slate-900 border-b border-blue-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {editingSlot ? <Edit2 className="h-4 w-4 text-blue-400" /> : <Plus className="h-4 w-4 text-blue-400" />}
                  <h3 className="font-bold text-sm">
                    {editingSlot ? `Edit Class Slot (${editingSlot.lectureTitle})` : `Schedule Class Slot for Week ${selectedWeek}`}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsAddSlotModalOpen(false);
                    setEditingSlot(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSlot} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-6 space-y-3.5 overflow-y-auto flex-1">
                {/* Past Date Warning Banner */}
                {(() => {
                  const targetSlotDateStr = getEstimatedDateForWeekDay(selectedWeek, slotDayIndex);
                  const isPast = targetSlotDateStr < todayIso;
                  if (!isPast) return null;
                  return (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        <strong>Scheduling Restricted:</strong> The selected date (<strong>{targetSlotDateStr}</strong>) has already passed. Classes can only be scheduled for today or future dates.
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department:</label>
                    <select
                      value={slotDept}
                      onChange={(e) => setSlotDept(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      {departments.map((d) => (
                        <option key={d.code} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Class / Section:</span>
                      {activeConflict.conflictType === "COHORT" && (
                        <span className="text-[10px] text-rose-600 font-bold">Conflict</span>
                      )}
                    </label>
                    <select
                      value={slotClassName}
                      onChange={(e) => setSlotClassName(e.target.value)}
                      className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold ${
                        activeConflict.conflictType === "COHORT"
                          ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/30"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <option value="">-- Select Class / Section --</option>
                      <option value="All Classes (Common Lecture)">All Classes (Common / Combined Lecture)</option>
                      {allClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Course Selection (Dropdown from Created Courses + Custom Input) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Select Course / Subject:</span>
                    <span className="text-[10px] text-blue-600 font-normal">Choose from chartered subjects or enter below</span>
                  </label>
                  {courses.length > 0 && (
                    <select
                      onChange={(e) => handleCourseSelectionChange(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold mb-1"
                    >
                      <option value="">-- Pick an Existing Course (e.g. Python, Java, DBMS) --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code} - {c.name} ({c.department})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Code:</label>
                      <span className="text-[10px] text-slate-500 font-medium">Auto-derived</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={slotCourseCode}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed select-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Name:</label>
                      <span className="text-[10px] text-slate-500 font-medium">Auto-derived</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={slotCourseName}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Day:</label>
                    <select
                      value={slotDayIndex}
                      onChange={(e) => setSlotDayIndex(Number(e.target.value))}
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      {daysOfWeek.map((d) => (
                        <option key={d.index} value={d.index}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Time:</label>
                    <input
                      type="text"
                      value={slotStartTime}
                      onChange={(e) => setSlotStartTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Time:</label>
                    <input
                      type="text"
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      placeholder="10:00 AM"
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Type:</label>
                    <select
                      value={slotType}
                      onChange={(e) => setSlotType(e.target.value as any)}
                      className="w-full h-9 px-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="LECTURE">Lecture</option>
                      <option value="LAB">Lab</option>
                      <option value="TUTORIAL">Tutorial</option>
                      <option value="EXAM">Exam</option>
                    </select>
                  </div>
                </div>

                {/* Quick Preset Time Slot Chips */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">Quick Standard Periods:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "09:00 - 10:00 AM", start: "09:00 AM", end: "10:00 AM" },
                      { label: "10:00 - 11:00 AM", start: "10:00 AM", end: "11:00 AM" },
                      { label: "11:15 - 12:15 PM", start: "11:15 AM", end: "12:15 PM" },
                      { label: "01:15 - 02:15 PM", start: "01:15 PM", end: "02:15 PM" },
                      { label: "02:15 - 03:15 PM", start: "02:15 PM", end: "03:15 PM" },
                      { label: "03:30 - 04:30 PM", start: "03:30 PM", end: "04:30 PM" },
                    ].map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSlotStartTime(slot.start);
                          setSlotEndTime(slot.end);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer border ${
                          slotStartTime === slot.start && slotEndTime === slot.end
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-2xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Faculty Instructor:</span>
                      {activeConflict.conflictType === "FACULTY" ? (
                        <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Busy
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Free
                        </span>
                      )}
                    </label>
                    {facultyList.length > 0 ? (
                      <select
                        value={slotFaculty}
                        onChange={(e) => setSlotFaculty(e.target.value)}
                        className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold ${
                          activeConflict.conflictType === "FACULTY"
                            ? "border-rose-400 bg-rose-50/50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {facultyList.map((f) => {
                          const fullName = `${f.first_name} ${f.last_name || ""}`.trim();
                          return (
                            <option key={f.id} value={fullName}>
                              {fullName} ({f.department || "Faculty"})
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={slotFaculty}
                        onChange={(e) => setSlotFaculty(e.target.value)}
                        placeholder="e.g. Dr. Sarah Jenkins"
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Room / Venue:</span>
                      {activeConflict.conflictType === "ROOM" ? (
                        <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Occupied
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Available
                        </span>
                      )}
                    </label>

                    {classrooms.length > 0 ? (
                      <select
                        value={slotRoom}
                        onChange={(e) => {
                          const pickedRoom = e.target.value;
                          setSlotRoom(pickedRoom);
                          const matched = classrooms.find(
                            (r) => r.roomNumber === pickedRoom || r.name === pickedRoom
                          );
                          if (matched) {
                            setSlotBuilding(matched.building);
                          }
                        }}
                        className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold ${
                          activeConflict.conflictType === "ROOM"
                            ? "border-rose-400 bg-rose-50/50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {classrooms.map((r) => (
                          <option key={r.id} value={r.roomNumber}>
                            {r.roomNumber} - {r.building} ({r.capacity} Seats - {r.type.replace("_", " ")})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={slotRoom}
                        onChange={(e) => setSlotRoom(e.target.value)}
                        placeholder="e.g. LH-301, Lab 4"
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Multi-Vector Conflict Alert Banner */}
                {activeConflict.hasConflict && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>
                        {activeConflict.conflictType === "ROOM"
                          ? `Classroom Conflict: ${slotRoom} is occupied!`
                          : activeConflict.conflictType === "FACULTY"
                          ? `Faculty Conflict: ${slotFaculty} is already teaching!`
                          : `Class Conflict: ${slotClassName} already has a scheduled session!`}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300/90">
                      {activeConflict.message} Please change the room, faculty, or time slot to prevent double-booking.
                    </p>
                  </div>
                )}

                {/* Pre-Lecture Notes & Session Agenda */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Curriculum Topics &amp; Pre-Lecture Notes (1 topic per line):
                  </label>
                  <textarea
                    rows={2}
                    value={slotTopics}
                    onChange={(e) => setSlotTopics(e.target.value)}
                    placeholder="Key concepts, practice exercises, and reading references for this class slot..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                  {editingSlot ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await cancelScheduleEvent(editingSlot.id);
                            setIsAddSlotModalOpen(false);
                            setEditingSlot(null);
                            showToast(`Cancelled class "${editingSlot.lectureTitle}".`);
                          } catch (error) {
                            showToast(error instanceof Error ? error.message : "Class could not be cancelled.");
                          }
                        }}
                        className="px-3.5 py-2 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold"
                      >
                        Cancel Class
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteScheduleEvent(editingSlot.id);
                            setIsAddSlotModalOpen(false);
                            setEditingSlot(null);
                            showToast(`Deleted slot "${editingSlot.lectureTitle}".`);
                          } catch (error) {
                            showToast(error instanceof Error ? error.message : "Class could not be deleted.");
                          }
                        }}
                        className="px-3.5 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddSlotModalOpen(false);
                        setEditingSlot(null);
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={activeConflict.hasConflict || getEstimatedDateForWeekDay(selectedWeek, slotDayIndex) < todayIso}
                    className={`px-5 py-2 rounded-lg text-xs font-bold shadow-xs transition-colors ${
                      activeConflict.hasConflict || getEstimatedDateForWeekDay(selectedWeek, slotDayIndex) < todayIso
                        ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    {editingSlot ? "Update Session" : "Save & Schedule Slot"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── BOOK FACULTY CONSULTATION & MEETING SLOT MODAL ─── */}
      <AnimatePresence>
        {isBookConsultationModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                    <CalendarIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule Faculty Slot</h3>
                    <p className="text-[11px] text-slate-500">With {activeFacultyName || "Faculty Instructor"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookConsultationModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Day of Week</label>
                  <select
                    value={consultationDay}
                    onChange={(e) => setConsultationDay(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {[
                      { index: 1, name: "Monday" },
                      { index: 2, name: "Tuesday" },
                      { index: 3, name: "Wednesday" },
                      { index: 4, name: "Thursday" },
                      { index: 5, name: "Friday" },
                      { index: 6, name: "Saturday" },
                    ].map((d) => (
                      <option key={d.index} value={d.index}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Time Range</label>
                    <input
                      type="text"
                      value={consultationTime}
                      onChange={(e) => setConsultationTime(e.target.value)}
                      placeholder="e.g. 11:00 AM - 12:00 PM"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Venue / Room</label>
                    <input
                      type="text"
                      defaultValue={activeFaculty?.office_number ? `Cabin ${activeFaculty.office_number}` : "Faculty Office"}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Agenda / Meeting Purpose</label>
                  <textarea
                    rows={2}
                    value={consultationPurpose}
                    onChange={(e) => setConsultationPurpose(e.target.value)}
                    placeholder="e.g. Syllabus progress review, doubt consultation, class test coordination..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookConsultationModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const times = consultationTime.split("-");
                    const startHour = parseInt(times[0]?.trim()) || 11;
                    addScheduleEvent({
                      courseCode: "MEET",
                      courseName: consultationPurpose,
                      lectureTitle: `Booked Slot: ${consultationPurpose}`,
                      lectureNumber: 1,
                      className: "Academic Meeting",
                      dayIndex: consultationDay,
                      startHour,
                      startTime: times[0]?.trim() || "11:00 AM",
                      endTime: times[1]?.trim() || "12:00 PM",
                      room: activeFaculty?.office_number ? `Cabin ${activeFaculty.office_number}` : "Faculty Office",
                      building: "Academic Block",
                      faculty: activeFacultyName || "Faculty",
                      facultyEmail: activeFaculty?.email,
                      type: "TUTORIAL",
                      weekNumber: selectedWeek,
                    });
                    showToast(`✓ Slot booked with ${activeFacultyName || "Faculty"} on Week ${selectedWeek}!`);
                    setIsBookConsultationModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirm &amp; Schedule Slot
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
