"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Building,
  DoorOpen,
  Plus,
  Search,
  Filter,
  Users,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPin,
  Monitor,
  Wifi,
  Sparkles,
  Volume2,
  Tv,
  X,
  Clock,
  BookOpen,
  Info,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcademicData, SyncClassroom } from "@/context/AcademicDataContext";
import { PaginationControls } from "@/components/ui/PaginationControls";

const availableFacilitiesList = [
  "Smart Projector",
  "Interactive Screen",
  "Central AC",
  "WiFi 6",
  "Surround Audio",
  "Wireless Microphones",
  "High-Spec Workstations",
  "Whiteboard",
  "Video Conferencing",
  "Stage Lighting",
];

export interface TimeSlotDef {
  id: string;
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export const TIME_SLOTS: TimeSlotDef[] = [
  { id: "slot-1", label: "09:00 AM - 10:00 AM", startHour: 9, startMinute: 0, endHour: 10, endMinute: 0 },
  { id: "slot-2", label: "10:00 AM - 11:00 AM", startHour: 10, startMinute: 0, endHour: 11, endMinute: 0 },
  { id: "slot-3", label: "11:15 AM - 12:15 PM", startHour: 11, startMinute: 15, endHour: 12, endMinute: 15 },
  { id: "slot-4", label: "12:15 PM - 01:15 PM", startHour: 12, startMinute: 15, endHour: 13, endMinute: 15 },
  { id: "slot-5", label: "02:00 PM - 03:00 PM", startHour: 14, startMinute: 0, endHour: 15, endMinute: 0 },
  { id: "slot-6", label: "03:00 PM - 04:00 PM", startHour: 15, startMinute: 0, endHour: 16, endMinute: 0 },
  { id: "slot-7", label: "04:00 PM - 05:00 PM", startHour: 16, startMinute: 0, endHour: 17, endMinute: 0 },
];

export const WEEK_DAYS = [
  { dayIndex: 1, label: "Monday", short: "Mon" },
  { dayIndex: 2, label: "Tuesday", short: "Tue" },
  { dayIndex: 3, label: "Wednesday", short: "Wed" },
  { dayIndex: 4, label: "Thursday", short: "Thu" },
  { dayIndex: 5, label: "Friday", short: "Fri" },
  { dayIndex: 6, label: "Saturday", short: "Sat" },
];

export function ClassroomManagementView() {
  const router = useRouter();
  const {
    classrooms,
    departments,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    calendarSchedules,
    courses,
    users,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
  } = useAcademicData();

  // View Mode: Real-Time Vacancy Checker vs Traditional Inventory
  const [viewMode, setViewMode] = useState<"VACANCY_CHECKER" | "INVENTORY">("VACANCY_CHECKER");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay();
    return today === 0 ? 1 : today;
  });

  // Calculate upcoming 7 days starting from Monday of current week for date selection
  const weekDatesList = useMemo(() => {
    const now = new Date();
    const curDay = now.getDay() === 0 ? 7 : now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (curDay - 1));
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const short = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const dayIndex = i + 1; // 1 = Monday to 6 = Saturday
      return { iso, short, dayIndex };
    });
  }, []);

  const handleSelectDate = (dateIso: string, dayIdx?: number) => {
    setSelectedDate(dateIso);
    if (dayIdx !== undefined) {
      setSelectedDay(dayIdx);
    } else {
      const d = new Date(`${dateIso}T12:00:00`);
      const calcDay = d.getDay() === 0 ? 7 : d.getDay();
      setSelectedDay(Math.min(6, Math.max(1, calcDay)));
    }
  };

  const availableSectionList = useMemo(() => {
    const set = new Set<string>();
    (departments || []).forEach((d) => {
      (d.classes || []).forEach((c) => set.add(c));
      (d.sections || []).forEach((s) => set.add(s));
    });
    calendarSchedules.forEach((ev) => {
      if (ev.className) set.add(ev.className);
    });
    [
      "CSE - Semester 5 (Section A)",
      "CSE - Semester 5 (Section B)",
      "CSE - Semester 3 (Section A)",
      "IT - Semester 5 (Section A)",
      "AI&DS - Semester 5 (Section A)",
      "Section A",
      "Section B",
      "Section C",
    ].forEach((s) => set.add(s));
    return Array.from(set).sort();
  }, [departments, calendarSchedules]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("slot-1");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | "FREE_ONLY" | "OCCUPIED_ONLY">("ALL");
  const [vacancyBuildingFilter, setVacancyBuildingFilter] = useState<string>("ALL");
  const [vacancySearch, setVacancySearch] = useState<string>("");

  // Quick allocation modal state
  const [bookingRoom, setBookingRoom] = useState<SyncClassroom | null>(null);
  const [bookingCourseCode, setBookingCourseCode] = useState<string>("");
  const [bookingFaculty, setBookingFaculty] = useState<string>("");
  const [bookingSection, setBookingSection] = useState<string>("");
  const [bookingSessionType, setBookingSessionType] = useState<string>("REMEDIAL");
  const [bookingTopic, setBookingTopic] = useState<string>("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [buildingFilter, setBuildingFilter] = useState<string>("ALL");
  const [floorFilter, setFloorFilter] = useState<string>("ALL");
  const [minCapacityFilter, setMinCapacityFilter] = useState<number>(0);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<SyncClassroom | null>(null);
  const [viewingRoomSchedule, setViewingRoomSchedule] = useState<SyncClassroom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<SyncClassroom | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<SyncClassroom, "id">>({
    roomNumber: "",
    name: "",
    building: "",
    type: "LECTURE_HALL" as SyncClassroom["type"],
    capacity: 60,
    floor: "",
    facilities: [],
    status: "AVAILABLE" as SyncClassroom["status"],
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Buildings list (both from existing rooms and newly registered campus buildings)
  const [customBuildings, setCustomBuildings] = useState<string[]>([]);
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");

  const buildings = useMemo(() => {
    const fromRooms = classrooms.map((room) => room.building.trim()).filter(Boolean);
    return [...new Set([...fromRooms, ...customBuildings])].sort();
  }, [classrooms, customBuildings]);

  const floors = useMemo(() => [...new Set(classrooms.filter((room) => buildingFilter === "ALL" || room.building === buildingFilter).map((room) => room.floor.trim()).filter(Boolean))].sort(), [classrooms, buildingFilter]);
  const roomHierarchy = useMemo(() => buildings.map((building) => ({
    building,
    floors: [...new Set(classrooms.filter((room) => room.building === building).map((room) => room.floor.trim() || "Unspecified floor"))].sort().map((floor) => ({
      floor,
      rooms: classrooms.filter((room) => room.building === building && (room.floor.trim() || "Unspecified floor") === floor).length,
    })),
  })), [buildings, classrooms]);

  // Filtered Classrooms
  const filteredRooms = useMemo(() => {
    return classrooms.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        r.roomNumber.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        r.floor.toLowerCase().includes(q);

      const matchesType = typeFilter === "ALL" || r.type === typeFilter;
      const matchesBuilding = buildingFilter === "ALL" || r.building === buildingFilter;
      const matchesFloor = floorFilter === "ALL" || (r.floor.trim() || "Unspecified floor") === floorFilter;
      const matchesCapacity = r.capacity >= minCapacityFilter;

      return matchesSearch && matchesType && matchesBuilding && matchesFloor && matchesCapacity;
    });
  }, [classrooms, search, typeFilter, buildingFilter, floorFilter, minCapacityFilter]);

  // Room Inventory Pagination
  const [roomPage, setRoomPage] = useState(1);
  const [roomPageSize, setRoomPageSize] = useState(12);

  const totalRoomPages = Math.max(1, Math.ceil(filteredRooms.length / roomPageSize));
  const paginatedRooms = useMemo(() => {
    const start = (roomPage - 1) * roomPageSize;
    return filteredRooms.slice(start, start + roomPageSize);
  }, [filteredRooms, roomPage, roomPageSize]);

  // Overall Facility Metrics
  const totalCapacity = useMemo(
    () => classrooms.reduce((acc, r) => acc + (r.capacity || 0), 0),
    [classrooms]
  );
  const totalLectureHalls = useMemo(
    () => classrooms.filter((r) => r.type === "LECTURE_HALL" || r.type === "AUDITORIUM").length,
    [classrooms]
  );
  const totalLabs = useMemo(
    () => classrooms.filter((r) => r.type === "LABORATORY").length,
    [classrooms]
  );

  // Current Selected Slot Object
  const currentSlot = useMemo(
    () => TIME_SLOTS.find((s) => s.id === selectedSlotId) || TIME_SLOTS[0],
    [selectedSlotId]
  );

  const selectedDayInfo = useMemo(
    () => WEEK_DAYS.find((d) => d.dayIndex === selectedDay) || WEEK_DAYS[0],
    [selectedDay]
  );

  // Match live clock hour
  const handleMatchLiveClock = () => {
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 1 : now.getDay();
    setSelectedDay(currentDay);

    const currentHour = now.getHours();
    const matchingSlot =
      TIME_SLOTS.find((s) => currentHour >= s.startHour && currentHour < s.endHour) ||
      TIME_SLOTS[0];

    setSelectedSlotId(matchingSlot.id);
    showToast(`Synced to live schedule: ${matchingSlot.label} on ${WEEK_DAYS.find(d => d.dayIndex === currentDay)?.label}`);
  };

  // Evaluate room occupancy at selected (day, slot)
  const roomAvailabilityList = useMemo(() => {
    const slotStart = currentSlot.startHour * 60 + currentSlot.startMinute;
    const slotEnd = currentSlot.endHour * 60 + currentSlot.endMinute;

    return classrooms.map((room) => {
      const roomNum = (room.roomNumber || "").trim().toLowerCase();
      const roomName = (room.name || "").trim().toLowerCase();

      // Check calendarSchedules
      const event = calendarSchedules.find((ev) => {
        if (ev.dayIndex !== selectedDay) return false;
        const evRoom = (ev.room || "").trim().toLowerCase();
        if (!evRoom) return false;

        const isRoomMatch =
          evRoom === roomNum ||
          evRoom === roomName ||
          evRoom.includes(roomNum) ||
          roomNum.includes(evRoom);

        if (!isRoomMatch) return false;

        // Parse ev times
        let evStart = ev.startHour ? ev.startHour * 60 : 0;
        if (!evStart && ev.startTime) {
          const match = ev.startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            if (match[3]?.toUpperCase() === "PM" && h < 12) h += 12;
            if (match[3]?.toUpperCase() === "AM" && h === 12) h = 0;
            evStart = h * 60 + m;
          }
        }
        let evEnd = evStart + 60;
        if (ev.endTime) {
          const match = ev.endTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            if (match[3]?.toUpperCase() === "PM" && h < 12) h += 12;
            if (match[3]?.toUpperCase() === "AM" && h === 12) h = 0;
            evEnd = h * 60 + m;
          }
        }

        return evStart < slotEnd && evEnd > slotStart;
      });

      return {
        room,
        isOccupied: !!event,
        activeEvent: event || null,
      };
    });
  }, [classrooms, calendarSchedules, selectedDay, currentSlot]);

  // Filtered vacancy list
  const filteredAvailabilityList = useMemo(() => {
    return roomAvailabilityList.filter(({ room, isOccupied }) => {
      if (availabilityFilter === "FREE_ONLY" && isOccupied) return false;
      if (availabilityFilter === "OCCUPIED_ONLY" && !isOccupied) return false;
      if (vacancyBuildingFilter !== "ALL" && room.building !== vacancyBuildingFilter) return false;
      if (vacancySearch.trim()) {
        const q = vacancySearch.toLowerCase();
        const matchesRoom =
          room.roomNumber.toLowerCase().includes(q) ||
          room.name.toLowerCase().includes(q) ||
          room.building.toLowerCase().includes(q) ||
          room.floor.toLowerCase().includes(q);
        return matchesRoom;
      }
      return true;
    });
  }, [roomAvailabilityList, availabilityFilter, vacancyBuildingFilter, vacancySearch]);

  // Vacancy Checker Pagination
  const [vacancyPage, setVacancyPage] = useState(1);
  const [vacancyPageSize, setVacancyPageSize] = useState(12);

  const totalVacancyPages = Math.max(1, Math.ceil(filteredAvailabilityList.length / vacancyPageSize));
  const paginatedAvailabilityList = useMemo(() => {
    const start = (vacancyPage - 1) * vacancyPageSize;
    return filteredAvailabilityList.slice(start, start + vacancyPageSize);
  }, [filteredAvailabilityList, vacancyPage, vacancyPageSize]);

  useEffect(() => {
    setVacancyPage(1);
  }, [selectedSlotId, selectedDay, availabilityFilter, vacancyBuildingFilter, vacancySearch]);


  const totalEvaluatedRooms = roomAvailabilityList.length;
  const freeRoomsCount = roomAvailabilityList.filter((r) => !r.isOccupied).length;
  const occupiedRoomsCount = roomAvailabilityList.filter((r) => r.isOccupied).length;
  const freePercentage = totalEvaluatedRooms > 0 ? Math.round((freeRoomsCount / totalEvaluatedRooms) * 100) : 0;
  const totalVacantSeats = roomAvailabilityList
    .filter((r) => !r.isOccupied)
    .reduce((acc, r) => acc + (r.room.capacity || 40), 0);

  // Quick Allocate Handler
  const handleConfirmQuickBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingRoom) return;

    try {
      const times = currentSlot.label.split(" - ");
      addScheduleEvent({
        room: bookingRoom.roomNumber,
        building: bookingRoom.building,
        dayIndex: selectedDay,
        weekNumber: 1,
        startTime: times[0] || "09:00 AM",
        endTime: times[1] || "10:00 AM",
        startHour: currentSlot.startHour,
        courseCode: bookingCourseCode || "SPEC-01",
        courseName: bookingTopic.trim() || "Remedial / Extra Lecture",
        faculty: bookingFaculty || "Assigned Faculty",
        className: "Cohort",
        section: bookingSection || "A",
        lectureNumber: 1,
        lectureTitle: bookingTopic.trim() || "Academic Lecture",
        type: (bookingSessionType as any) || "LECTURE",
      });

      showToast(`Room ${bookingRoom.roomNumber} allocated for ${currentSlot.label} on ${selectedDayInfo.label}!`);
      setBookingRoom(null);
      setBookingTopic("");
    } catch (err: any) {
      showToast(err.message || "Failed to allocate room.");
    }
  };

  // Check double-booking conflicts across the entire calendar with automatic alternative suggestions
  const roomConflicts = useMemo(() => {
    const parseMinutes = (t: string) => {
      if (!t) return 0;
      const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3]?.toUpperCase();
      if (meridiem === "PM" && h < 12) h += 12;
      if (meridiem === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };

    const conflicts: {
      id: string;
      room: string;
      dayIndex: number;
      startTime: string;
      endTime: string;
      event1: any;
      event2: any;
      alternatives: SyncClassroom[];
    }[] = [];

    const seenPairs = new Set<string>();

    for (let i = 0; i < calendarSchedules.length; i++) {
      for (let j = i + 1; j < calendarSchedules.length; j++) {
        const e1 = calendarSchedules[i];
        const e2 = calendarSchedules[j];
        if (e1.id === e2.id) continue;
        if (e1.weekNumber === e2.weekNumber && e1.dayIndex === e2.dayIndex) {
          const r1 = (e1.room || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          const r2 = (e2.room || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          if (r1 && r2 && r1 === r2) {
            const s1 = parseMinutes(e1.startTime);
            const end1 = parseMinutes(e1.endTime) || s1 + 60;
            const s2 = parseMinutes(e2.startTime);
            const end2 = parseMinutes(e2.endTime) || s2 + 60;
            if (s1 < end2 && end1 > s2) {
              const pairKey = [e1.id || `ev-${i}`, e2.id || `ev-${j}`].sort().join("___");
              if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);

                // Find alternative free classrooms during this slot
                const altRooms = classrooms.filter((rm) => {
                  const normRm = (rm.roomNumber || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
                  if (normRm === r1) return false;
                  if (rm.status === "MAINTENANCE") return false;

                  const hasOverlap = calendarSchedules.some((other) => {
                    if (other.id === e1.id || other.id === e2.id) return false;
                    if (other.weekNumber !== e2.weekNumber || other.dayIndex !== e2.dayIndex) return false;
                    const normOtherRm = (other.room || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
                    if (normOtherRm !== normRm) return false;
                    const oStart = parseMinutes(other.startTime);
                    const oEnd = parseMinutes(other.endTime) || oStart + 60;
                    return oStart < end2 && oEnd > s2;
                  });

                  return !hasOverlap;
                });

                // Sort alternatives by capacity descending
                altRooms.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));

                conflicts.push({
                  id: pairKey,
                  room: e1.room || e2.room,
                  dayIndex: e1.dayIndex,
                  startTime: e1.startTime,
                  endTime: e1.endTime || e2.endTime,
                  event1: e1,
                  event2: e2,
                  alternatives: altRooms,
                });
              }
            }
          }
        }
      }
    }
    return conflicts;
  }, [calendarSchedules, classrooms]);

  // Reassign conflicting session to an alternative classroom in 1 click
  const handleReassignAlternative = (eventToMove: any, targetRoom: SyncClassroom) => {
    try {
      updateScheduleEvent({
        ...eventToMove,
        room: targetRoom.roomNumber,
        building: targetRoom.building,
      });
      showToast(`🎉 Reassigned "${eventToMove.courseName}" to Room ${targetRoom.roomNumber} (${targetRoom.building})! Conflict resolved.`);
    } catch (err: any) {
      showToast(err.message || "Failed to reassign classroom.");
    }
  };

  // 1-Click Auto-Resolve all detected room conflicts
  const handleAutoResolveAllConflicts = () => {
    if (roomConflicts.length === 0) return;
    let resolvedCount = 0;
    const reservedRooms = new Set<string>();

    roomConflicts.forEach((conflict) => {
      const candidate = conflict.alternatives.find(
        (alt) => !reservedRooms.has(alt.roomNumber.toLowerCase())
      ) || conflict.alternatives[0];

      if (candidate) {
        try {
          updateScheduleEvent({
            ...conflict.event2,
            room: candidate.roomNumber,
            building: candidate.building,
          });
          reservedRooms.add(candidate.roomNumber.toLowerCase());
          resolvedCount++;
        } catch (e) {
          console.warn("Auto-resolve failed for", conflict.event2.courseName, e);
        }
      }
    });

    if (resolvedCount > 0) {
      showToast(`⚡ Successfully auto-resolved ${resolvedCount} classroom conflict(s)! Alternative rooms assigned.`);
    } else {
      showToast("No alternative classrooms available for auto-assignment.");
    }
  };

  // Remove duplicate/unwanted scheduled session in 1 click
  const handleDismissDuplicate = async (eventId: string) => {
    try {
      await deleteScheduleEvent(eventId);
      showToast("Duplicate scheduled session removed.");
    } catch (err: any) {
      showToast(err.message || "Failed to remove session.");
    }
  };

  // Open Create Modal
  const handleOpenAdd = () => {
    setFormData({
      roomNumber: "",
      name: "",
      building: buildingFilter === "ALL" ? "" : buildingFilter,
      type: "CLASSROOM",
      capacity: 40,
      floor: floorFilter === "ALL" ? "" : floorFilter,
      facilities: [],
      status: "AVAILABLE",
    });
    setIsAddOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (room: SyncClassroom) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      name: room.name,
      building: room.building,
      type: room.type,
      capacity: room.capacity,
      floor: room.floor,
      facilities: room.facilities || [],
      status: room.status,
    });
  };

  // Submit Create
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomNumber.trim() || !formData.building.trim() || !formData.floor.trim()) {
      showToast("Enter a building, floor, and room number.");
      return;
    }
    if (classrooms.some((room) => room.building.trim().toLowerCase() === formData.building.trim().toLowerCase() && room.roomNumber.trim().toLowerCase() === formData.roomNumber.trim().toLowerCase())) {
      showToast("That room number already exists in this building.");
      return;
    }

    try {
      await addClassroom({
        roomNumber: formData.roomNumber.trim().toUpperCase(),
        name: formData.name.trim() || formData.roomNumber.trim(),
        building: formData.building.trim(),
        type: formData.type,
        capacity: Number(formData.capacity) || 40,
        floor: formData.floor.trim(),
        facilities: formData.facilities,
        status: formData.status,
      });
      setIsAddOpen(false);
      showToast(`Room ${formData.roomNumber} added.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not add the room.");
    }
  };

  // Submit Edit
  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    try {
      await updateClassroom({
      ...editingRoom,
      roomNumber: formData.roomNumber.trim().toUpperCase(),
      name: formData.name.trim() || formData.roomNumber.trim(),
      building: formData.building.trim(),
      type: formData.type,
      capacity: Number(formData.capacity) || 40,
      floor: formData.floor.trim(),
      facilities: formData.facilities,
      status: formData.status,
      });
      setEditingRoom(null);
      showToast(`Room ${formData.roomNumber} updated.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update the room.");
    }
  };

  // Delete Room
  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;
    try {
      await deleteClassroom(deletingRoom.id);
      showToast(`Room ${deletingRoom.roomNumber} deleted.`);
      setDeletingRoom(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete the room.");
    }
  };

  const toggleFacility = (facility: string) => {
    if (formData.facilities.includes(facility)) {
      setFormData({
        ...formData,
        facilities: formData.facilities.filter((f) => f !== facility),
      });
    } else {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, facility],
      });
    }
  };

  const getTypeBadgeColor = (type: SyncClassroom["type"]) => {
    switch (type) {
      case "LECTURE_HALL":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900";
      case "LABORATORY":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900";
      case "CLASSROOM":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900";
      case "SEMINAR_HALL":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900";
      case "AUDITORIUM":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const formatTypeName = (type: SyncClassroom["type"]) => {
    switch (type) {
      case "LECTURE_HALL":
        return "Lecture Hall";
      case "LABORATORY":
        return "Computer / Science Lab";
      case "CLASSROOM":
        return "Standard Classroom";
      case "SEMINAR_HALL":
        return "Seminar Hall";
      case "AUDITORIUM":
        return "Grand Auditorium";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <datalist id="campus-buildings">
        {buildings.map((building) => <option key={building} value={building} />)}
      </datalist>
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-white text-slate-800 text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-emerald-200 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* ─── VIEW SWITCHER HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode("VACANCY_CHECKER")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "VACANCY_CHECKER"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>⚡ Real-Time Free / Occupied Slot Checker</span>
          </button>

          <button
            onClick={() => setViewMode("INVENTORY")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "INVENTORY"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <DoorOpen className="h-3.5 w-3.5" />
            <span>Classroom &amp; Hall Inventory</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 text-xs">
          <span className="text-slate-500 font-medium">Slot Telemetry:</span>
          <span className="font-bold text-emerald-600 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
            {freeRoomsCount} FREE
          </span>
          <span className="font-bold text-rose-600 font-mono bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
            {occupiedRoomsCount} OCCUPIED
          </span>
        </div>
      </div>

      {/* ─── DOUBLE-BOOKING CONFLICT & 1-CLICK ALTERNATIVE ROOM RESOLVER ─── */}
      {roomConflicts.length > 0 && (
        <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                  <span>⚠️ {roomConflicts.length} Room Scheduling Conflict(s) Detected!</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-200 text-[10px] font-mono font-bold border border-rose-500/30">
                    Action Required
                  </span>
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Two or more classes are scheduled simultaneously in the same room. Assign available alternative classrooms below in 1-click or auto-resolve all conflicts.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleAutoResolveAllConflicts}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Zap className="h-4 w-4" />
              <span>⚡ Auto-Resolve All ({roomConflicts.length}) in 1-Click</span>
            </Button>
          </div>

          <div className="space-y-3 pt-1">
            {roomConflicts.map((c) => {
              const dayLabel = WEEK_DAYS.find((d) => d.dayIndex === c.dayIndex)?.label || `Day ${c.dayIndex}`;
              return (
                <div
                  key={c.id}
                  className="bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        Room {c.room}
                      </span>
                      <span className="text-slate-500">
                        {dayLabel} • {c.startTime} - {c.endTime}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDismissDuplicate(c.event2.id)}
                      className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove duplicate session</span>
                    </button>
                  </div>

                  {/* Conflicting Pair comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Primary Session (Keep in {c.room})
                      </span>
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {c.event1.courseCode} — {c.event1.courseName}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Faculty: {c.event1.faculty} • {c.event1.className || "Cohort"} ({c.event1.section || "A"})
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 dark:text-rose-400">
                        Conflicting Session (Needs Alternative Room)
                      </span>
                      <div className="font-bold text-rose-950 dark:text-rose-100 truncate">
                        {c.event2.courseCode} — {c.event2.courseName}
                      </div>
                      <div className="text-[11px] text-rose-800 dark:text-rose-300">
                        Faculty: {c.event2.faculty} • {c.event2.className || "Cohort"} ({c.event2.section || "A"})
                      </div>
                    </div>
                  </div>

                  {/* Alternative Free Classrooms Row */}
                  <div className="pt-1">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Available Alternative Classrooms at this time (1-Click Reassign):</span>
                    </div>

                    {c.alternatives.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {c.alternatives.slice(0, 4).map((alt) => (
                          <button
                            key={alt.id}
                            type="button"
                            onClick={() => handleReassignAlternative(c.event2, alt)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs hover:scale-102 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>
                              Assign {alt.roomNumber} ({alt.building}, Cap: {alt.capacity})
                            </span>
                          </button>
                        ))}
                        {c.alternatives.length > 4 && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            +{c.alternatives.length - 4} more free rooms
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                        No other vacant rooms available during this exact slot. Please adjust schedule timing.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MODE 1: REAL-TIME FREE / OCCUPIED SLOT CHECKER ─── */}
      {viewMode === "VACANCY_CHECKER" && (
        <div className="space-y-6">
          {/* Day & Time Slot Control Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>Select Date &amp; Time Slot to Check Classroom Availability</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time occupancy cross-referenced against the master timetable database.
                </p>
              </div>

              <button
                onClick={handleMatchLiveClock}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>Sync with Live Clock 🕒</span>
              </button>
            </div>

            {/* Date Selector (Date-Wise Operation) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1. Select Date (Date-Wise Availability)
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Pick Calendar Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleSelectDate(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {weekDatesList.map((item) => {
                  const isSelected = selectedDate === item.iso || (selectedDay === item.dayIndex && !weekDatesList.some(w => w.iso === selectedDate));
                  return (
                    <button
                      key={item.iso}
                      type="button"
                      onClick={() => handleSelectDate(item.iso, item.dayIndex)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs shadow-blue-500/25 ring-1 ring-blue-500 font-bold"
                          : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      {item.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Selector */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                2. Select Academic Period / Hour
              </span>
              <div className="flex flex-wrap gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs shadow-blue-500/25 ring-1 ring-blue-500"
                          : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <Clock className={`h-3 w-3 ${isSelected ? "text-white" : "text-slate-400"}`} />
                      <span>{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real-time Telemetry Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Free Classrooms
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {freeRoomsCount}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                  {freePercentage}% Vacant
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Ready for instant allocation</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Occupied Classrooms
                </span>
                <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {occupiedRoomsCount}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60">
                  {100 - freePercentage}% In Session
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Lectures currently active</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Vacant Desk Capacity
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white block">
                {totalVacantSeats.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-400">Unoccupied student seats</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Active Slot Window
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
                {currentSlot.label}
              </span>
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                {selectedDayInfo.label} Schedule
              </p>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setAvailabilityFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  availabilityFilter === "ALL"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                }`}
              >
                All Rooms ({totalEvaluatedRooms})
              </button>
              <button
                onClick={() => setAvailabilityFilter("FREE_ONLY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  availabilityFilter === "FREE_ONLY"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Free / Vacant ({freeRoomsCount})</span>
              </button>
              <button
                onClick={() => setAvailabilityFilter("OCCUPIED_ONLY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  availabilityFilter === "OCCUPIED_ONLY"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Occupied ({occupiedRoomsCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={vacancyBuildingFilter}
                onChange={(e) => setVacancyBuildingFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="ALL">All Buildings</option>
                {buildings.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter room #..."
                  value={vacancySearch}
                  onChange={(e) => setVacancySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Classrooms Vacancy Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedAvailabilityList.map(({ room, isOccupied, activeEvent }) => (
              <div
                key={room.id}
                className={`rounded-2xl border p-5 shadow-2xs transition-all flex flex-col justify-between ${
                  isOccupied
                    ? "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Status & Room Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                      {room.roomNumber}
                    </span>

                    {isOccupied ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>In Session</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>Available</span>
                      </span>
                    )}
                  </div>

                  {/* Room Details */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {room.name || room.roomNumber}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                      <span>{room.building} • Floor {room.floor || "G"}</span>
                    </p>
                  </div>

                  {/* Capacity & Type */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {room.capacity} Desks
                    </span>
                    <span>•</span>
                    <span className="truncate">{formatTypeName(room.type)}</span>
                  </div>

                  {/* Occupied State Info */}
                  {isOccupied && activeEvent && (
                    <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/40 text-xs space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {activeEvent.courseCode} — {activeEvent.courseName}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        Prof: {activeEvent.faculty}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {activeEvent.className || "Cohort"} ({activeEvent.section || "A"}) • {activeEvent.startTime} - {activeEvent.endTime}
                      </p>
                    </div>
                  )}

                  {/* Free State Features */}
                  {!isOccupied && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(room.facilities || ["Projector", "WiFi"]).slice(0, 3).map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-medium"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {!isOccupied ? (
                    <button
                      onClick={() => setBookingRoom(room)}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      <span>Allocate / Reserve Room</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block text-center py-1">
                      In Session until period ends
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredAvailabilityList.length === 0 && (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-sm">No classrooms matching the filter criteria.</p>
            </div>
          )}

          <PaginationControls
            currentPage={vacancyPage}
            totalPages={totalVacancyPages}
            totalItems={filteredAvailabilityList.length}
            pageSize={vacancyPageSize}
            onPageChange={setVacancyPage}
            onPageSizeChange={setVacancyPageSize}
            pageSizeOptions={[12, 24, 48]}
            itemLabel="classrooms"
          />
        </div>
      )}

      {/* ─── MODE 2: CLASSROOM INVENTORY & ARCHITECTURE ─── */}
      {viewMode === "INVENTORY" && (
        <div className="space-y-6">
          {/* ─── SUMMARY STATS GRID ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-[22px] border-[#E8EAF1] dark:border-slate-800 p-4 bg-white dark:bg-[#181C2B] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#737A90]">Total Rooms &amp; Halls</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <DoorOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#171A2B] dark:text-white">
            {classrooms.length}
          </div>
          <p className="text-[11px] text-[#737A90] mt-0.5">Campus instructional spaces</p>
        </Card>

        <Card className="rounded-[22px] border-[#E8EAF1] dark:border-slate-800 p-4 bg-white dark:bg-[#181C2B] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#737A90]">Total Seating Capacity</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#171A2B] dark:text-white">
            {totalCapacity.toLocaleString()}
          </div>
          <p className="text-[11px] text-[#737A90] mt-0.5">Enrolled student desk capacity</p>
        </Card>

        <Card className="rounded-[22px] border-[#E8EAF1] dark:border-slate-800 p-4 bg-white dark:bg-[#181C2B] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#737A90]">Lecture Halls &amp; Theatres</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#171A2B] dark:text-white">
            {totalLectureHalls}
          </div>
          <p className="text-[11px] text-[#737A90] mt-0.5">Tiered lecture facilities</p>
        </Card>

        <Card className="rounded-[22px] border-[#E8EAF1] dark:border-slate-800 p-4 bg-white dark:bg-[#181C2B] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#737A90]">Computing &amp; Science Labs</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <Monitor className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#171A2B] dark:text-white">
            {totalLabs}
          </div>
          <p className="text-[11px] text-[#737A90] mt-0.5">High-speed practical lab units</p>
        </Card>
      </div>


      {/* ─── MAIN CLASSROOM LIST & MANAGEMENT CARD ─── */}
      <Card className="rounded-[24px] border-[#E8EAF1] dark:border-slate-800 bg-white dark:bg-[#181C2B] shadow-xs">
        <CardHeader className="p-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-[#171A2B] dark:text-white flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-slate-900 dark:text-slate-100" />
              <span>Classrooms, Lecture Halls &amp; Laboratory Inventory</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#737A90] mt-1">
              Organize rooms by building and floor, then assign them in the timetable.
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <Button
              onClick={() => router.push("/admin?tab=timetable")}
              variant="outline"
              className="text-xs font-bold px-3 py-2 flex items-center gap-1.5 border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>Live Occupancy Matrix</span>
            </Button>

            <Button
              onClick={() => {
                setNewBuildingName("");
                setIsAddBuildingOpen(true);
              }}
              variant="outline"
              className="text-xs font-bold px-3 py-2 flex items-center gap-1.5 border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
            >
              <Building className="h-3.5 w-3.5 text-purple-600" />
              <span>+ Add Building</span>
            </Button>

            <Button
              onClick={handleOpenAdd}
              className="btn-saas-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Classroom / Hall</span>
            </Button>
          </div>
        </CardHeader>

        {/* Search and Filters Bar */}
        <div className="px-6 pb-4 flex flex-col md:flex-row items-center justify-between gap-3 border-b border-[#E8EAF1] dark:border-slate-800">
          <div className="relative w-full md:w-80">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737A90]" />
            <Input
              placeholder="Search by room no, hall name, building..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs font-bold border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white"
            >
              <option value="ALL">All Space Types</option>
              <option value="LECTURE_HALL">Lecture Halls</option>
              <option value="LABORATORY">Computer &amp; Practical Labs</option>
              <option value="CLASSROOM">Standard Classrooms</option>
              <option value="SEMINAR_HALL">Seminar Halls</option>
              <option value="AUDITORIUM">Auditoriums</option>
            </select>

            {/* Building Filter */}
            <select
              value={buildingFilter}
              onChange={(e) => { setBuildingFilter(e.target.value); setFloorFilter("ALL"); }}
              className="h-9 px-3 rounded-xl text-xs font-bold border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white"
            >
              <option value="ALL">All Campus Buildings</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              aria-label="Filter by floor"
            >
              <option value="ALL">All floors</option>
              {floors.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
            </select>

            {/* Minimum Capacity Filter */}
            <select
              value={minCapacityFilter}
              onChange={(e) => setMinCapacityFilter(Number(e.target.value))}
              className="h-9 px-3 rounded-xl text-xs font-bold border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 text-[#171A2B] dark:text-white"
            >
              <option value={0}>Any Capacity</option>
              <option value={40}>40+ Seats</option>
              <option value={60}>60+ Seats</option>
              <option value={100}>100+ Seats</option>
              <option value={200}>200+ Seats</option>
            </select>
          </div>
        </div>

        {roomHierarchy.length > 0 && (
          <div className="px-6 pb-4 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Building className="h-4 w-4" /> Buildings and floors
            </div>
            <div className="flex flex-wrap gap-2">
              {roomHierarchy.map(({ building, floors: buildingFloors }) => (
                <div key={building} className="min-w-0 border-l-2 border-blue-500 pl-3 pr-2 py-1">
                  <button type="button" onClick={() => { setBuildingFilter(building); setFloorFilter("ALL"); }} className="text-left text-xs font-semibold text-slate-900 dark:text-white hover:text-blue-600">
                    {building}
                  </button>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {buildingFloors.map(({ floor, rooms }) => (
                      <button key={floor} type="button" onClick={() => { setBuildingFilter(building); setFloorFilter(floor); }} className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-600 dark:text-slate-300">
                        {floor} <span className="text-slate-400">({rooms})</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classrooms Grid / Cards */}
        <div className="p-6">
          {filteredRooms.length === 0 ? (
            <div className="py-12 text-center text-[#737A90] space-y-2">
              <DoorOpen className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold">No classrooms or halls match your filter.</p>
              <p className="text-xs">Click &quot;+ Add Classroom / Hall&quot; to register a new instructional space.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedRooms.map((room) => {
                // Count scheduled sessions in this room
                const assignedSessions = calendarSchedules.filter((ev) => {
                  const evRoom = (ev.room || "").trim().toLowerCase();
                  const target = room.roomNumber.trim().toLowerCase();
                  return evRoom === target || evRoom.includes(target) || target.includes(evRoom);
                });

                return (
                  <div
                    key={room.id}
                    className="p-4 rounded-2xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC]/60 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      {/* Top Bar: Room No, Badge & Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                              {room.roomNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTypeBadgeColor(
                                room.type
                              )}`}
                            >
                              {formatTypeName(room.type)}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#171A2B] dark:text-slate-200 mt-0.5 line-clamp-1">
                            {room.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(room)}
                            className="p-1.5 rounded-lg border border-[#E8EAF1] dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer"
                            title="Edit Room Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingRoom(room)}
                            className="p-1.5 rounded-lg border border-[#E8EAF1] dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Delete Room"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Location & Capacity Metrics */}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-[#E8EAF1] dark:border-slate-800">
                          <span className="text-[10px] text-[#737A90] block flex items-center gap-1">
                            <Users className="h-3 w-3 text-emerald-500" />
                            <span>Capacity</span>
                          </span>
                          <strong className="text-xs font-mono font-bold text-[#171A2B] dark:text-white">
                            {room.capacity} Desks
                          </strong>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-[#E8EAF1] dark:border-slate-800">
                          <span className="text-[10px] text-[#737A90] block flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-500" />
                            <span>Location</span>
                          </span>
                          <strong className="text-xs font-bold text-[#171A2B] dark:text-white truncate block">
                            {room.building}
                          </strong>
                          <span className="text-[10px] text-[#737A90]">{room.floor}</span>
                        </div>
                      </div>

                      {/* Facilities Tags */}
                      {room.facilities && room.facilities.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {room.facilities.map((fac) => (
                            <span
                              key={fac}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-900 text-[#737A90] dark:text-slate-400 border border-[#E8EAF1] dark:border-slate-800"
                            >
                              ✓ {fac}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action: Timetable Utilization */}
                    <div className="pt-2 border-t border-[#E8EAF1] dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#737A90] flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-900 dark:text-slate-100" />
                        <span>
                          <strong>{assignedSessions.length}</strong> weekly lecture sessions
                        </span>
                      </span>

                      <button
                        onClick={() => setViewingRoomSchedule(room)}
                        className="text-[11px] font-bold text-slate-900 dark:text-slate-100 hover:underline cursor-pointer"
                      >
                        View Timetable →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <PaginationControls
          currentPage={roomPage}
          totalPages={totalRoomPages}
          totalItems={filteredRooms.length}
          pageSize={roomPageSize}
          onPageChange={setRoomPage}
          onPageSizeChange={setRoomPageSize}
          pageSizeOptions={[12, 24, 48]}
          itemLabel="rooms"
        />
      </Card>
        </div>
      )}

      {/* ─── ADD ROOM MODAL ─── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full max-h-[88vh] flex flex-col space-y-4 shadow-xl animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">
                  Add New Classroom / Lecture Hall
                </h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-[#737A90] hover:text-[#171A2B] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Room No. / Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                    placeholder="e.g. LH-301, Lab-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Seating Capacity (Desks) *
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={1000}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  placeholder="e.g. Main Engineering Lecture Hall 301"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Facility Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as SyncClassroom["type"] })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    <option value="LECTURE_HALL">Lecture Hall (Tiered)</option>
                    <option value="LABORATORY">Computer / Science Lab</option>
                    <option value="CLASSROOM">Standard Classroom</option>
                    <option value="SEMINAR_HALL">Seminar Hall</option>
                    <option value="AUDITORIUM">Grand Auditorium</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Campus Building *
                  </label>
                  <div className="space-y-1.5">
                    {buildings.length > 0 ? (
                      <select
                        value={buildings.includes(formData.building) ? formData.building : formData.building ? "__custom__" : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "__custom__") {
                            setFormData({ ...formData, building: val });
                          }
                        }}
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold text-xs"
                      >
                        <option value="">-- Select Registered Building --</option>
                        {buildings.map((b) => (
                          <option key={b} value={b}>
                            🏢 {b}
                          </option>
                        ))}
                        <option value="__custom__">✎ Enter New / Other Building...</option>
                      </select>
                    ) : null}
                    <input
                      type="text"
                      required
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium text-xs"
                      list="campus-buildings"
                      placeholder="Or type building name (e.g. Ramanujan Science Block)"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Floor / Wing
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                    placeholder="e.g. 3rd Floor, West Wing"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as SyncClassroom["status"] })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  >
                    <option value="AVAILABLE">Available &amp; Operational</option>
                    <option value="MAINTENANCE">Under Maintenance</option>
                    <option value="RESERVED">Reserved / Special Use</option>
                  </select>
                </div>
              </div>

              {/* Facilities Checklist */}
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1.5">
                  Available Equipment &amp; Amenities
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-[#F7F8FC] dark:bg-slate-800/80 border border-[#E8EAF1] dark:border-slate-800">
                  {availableFacilitiesList.map((fac) => {
                    const isChecked = formData.facilities.includes(fac);
                    return (
                      <label
                        key={fac}
                        className="flex items-center gap-2 text-[11px] p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFacility(fac)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span className={isChecked ? "font-bold text-blue-700 dark:text-blue-300" : "text-[#737A90]"}>
                          {fac}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-[#181C2B] flex justify-end gap-2 pt-3 pb-1 border-t border-[#E8EAF1] dark:border-slate-800 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold cursor-pointer">
                  Create Room
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT ROOM MODAL ─── */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-lg w-full max-h-[88vh] flex flex-col space-y-4 shadow-xl animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">
                  Edit Room: {editingRoom.roomNumber}
                </h3>
              </div>
              <button
                onClick={() => setEditingRoom(null)}
                className="text-[#737A90] hover:text-[#171A2B] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="space-y-3 text-xs flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Room No. / Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Seating Capacity (Desks) *
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={1000}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Facility Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as SyncClassroom["type"] })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold"
                  >
                    <option value="LECTURE_HALL">Lecture Hall (Tiered)</option>
                    <option value="LABORATORY">Computer / Science Lab</option>
                    <option value="CLASSROOM">Standard Classroom</option>
                    <option value="SEMINAR_HALL">Seminar Hall</option>
                    <option value="AUDITORIUM">Grand Auditorium</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Campus Building *
                  </label>
                  <div className="space-y-1.5">
                    {buildings.length > 0 ? (
                      <select
                        value={buildings.includes(formData.building) ? formData.building : formData.building ? "__custom__" : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "__custom__") {
                            setFormData({ ...formData, building: val });
                          }
                        }}
                        className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold text-xs"
                      >
                        <option value="">-- Select Registered Building --</option>
                        {buildings.map((b) => (
                          <option key={b} value={b}>
                            🏢 {b}
                          </option>
                        ))}
                        <option value="__custom__">✎ Enter New / Other Building...</option>
                      </select>
                    ) : null}
                    <input
                      type="text"
                      required
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium text-xs"
                      list="campus-buildings"
                      placeholder="Or type building name (e.g. Ramanujan Science Block)"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Floor / Wing
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as SyncClassroom["status"] })
                    }
                    className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-medium"
                  >
                    <option value="AVAILABLE">Available &amp; Operational</option>
                    <option value="MAINTENANCE">Under Maintenance</option>
                    <option value="RESERVED">Reserved / Special Use</option>
                  </select>
                </div>
              </div>

              {/* Facilities Checklist */}
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1.5">
                  Available Equipment &amp; Amenities
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-[#F7F8FC] dark:bg-slate-800/80 border border-[#E8EAF1] dark:border-slate-800">
                  {availableFacilitiesList.map((fac) => {
                    const isChecked = formData.facilities.includes(fac);
                    return (
                      <label
                        key={fac}
                        className="flex items-center gap-2 text-[11px] p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFacility(fac)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span className={isChecked ? "font-bold text-blue-700 dark:text-blue-300" : "text-[#737A90]"}>
                          {fac}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-[#181C2B] flex justify-end gap-2 pt-3 pb-1 border-t border-[#E8EAF1] dark:border-slate-800 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingRoom(null)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" className="btn-saas-primary text-xs px-5 font-bold cursor-pointer">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ROOM TIMETABLE INSPECTOR MODAL ─── */}
      {viewingRoomSchedule && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-2xl w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                <div>
                  <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">
                    Live Schedule for Room {viewingRoomSchedule.roomNumber}
                  </h3>
                  <span className="text-[11px] text-[#737A90]">
                    {viewingRoomSchedule.name} • {viewingRoomSchedule.building} ({viewingRoomSchedule.capacity} Seats)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingRoomSchedule(null)}
                className="text-[#737A90] hover:text-[#171A2B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Timetable List for this Room */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {(() => {
                const roomEvents = calendarSchedules.filter((ev) => {
                  const evRoom = (ev.room || "").trim().toLowerCase();
                  const target = viewingRoomSchedule.roomNumber.trim().toLowerCase();
                  return evRoom === target || evRoom.includes(target) || target.includes(evRoom);
                });

                if (roomEvents.length === 0) {
                  return (
                    <div className="p-8 text-center text-[#737A90] space-y-1">
                      <DoorOpen className="h-6 w-6 mx-auto text-emerald-500" />
                      <p className="font-bold text-xs">This room is completely free with no assigned lectures.</p>
                      <p className="text-[11px]">You can safely assign this room to any course in the Timetable Tab.</p>
                    </div>
                  );
                }

                const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

                return roomEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-[#F7F8FC] dark:bg-slate-800 border border-[#E8EAF1] dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
                          {dayNames[ev.dayIndex] || "Scheduled Day"}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {ev.startTime} - {ev.endTime}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          (Week {ev.weekNumber})
                        </span>
                      </div>
                      <strong className="text-xs font-bold text-[#171A2B] dark:text-white block">
                        {ev.courseCode}: {ev.courseName}
                      </strong>
                      <span className="text-[11px] text-[#737A90]">
                        Class: {ev.className || "Standard Degree"} • Faculty: {ev.faculty}
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      ✓ Reserved
                    </span>
                  </div>
                ));
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
              <Button
                onClick={() => setViewingRoomSchedule(null)}
                className="btn-saas-primary text-xs px-4 font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── IN-APP DELETE MODAL ─── */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-100 dark:border-rose-900">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">
                  Delete Room {deletingRoom.roomNumber}?
                </h3>
                <p className="text-xs text-[#737A90]">
                  This will remove {deletingRoom.name} from the campus room inventory.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <strong>Location:</strong> {deletingRoom.building} ({deletingRoom.floor})<br />
              <strong>Capacity:</strong> {deletingRoom.capacity} Seats
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setDeletingRoom(null)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 cursor-pointer"
              >
                Yes, Delete Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE CAMPUS BUILDING MODAL ─── */}
      {isAddBuildingOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181C2B] rounded-[24px] border border-[#E8EAF1] dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8EAF1] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#171A2B] dark:text-white">
                    Register Campus Building
                  </h3>
                  <p className="text-[11px] text-[#737A90]">
                    Create a building entity first, then add rooms and labs inside it.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddBuildingOpen(false)}
                className="text-[#737A90] hover:text-[#171A2B] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanName = newBuildingName.trim();
                if (!cleanName) {
                  showToast("Please enter a valid building name.");
                  return;
                }
                if (buildings.map((b) => b.toLowerCase()).includes(cleanName.toLowerCase())) {
                  showToast("This building is already registered.");
                  return;
                }
                setCustomBuildings((prev) => [...prev, cleanName]);
                setIsAddBuildingOpen(false);
                setNewBuildingName("");
                showToast(`✓ Building "${cleanName}" registered successfully.`);
                // Pre-select for room creation
                setFormData((prev) => ({ ...prev, building: cleanName }));
                setIsAddOpen(true);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-[#171A2B] dark:text-slate-300 block mb-1">
                  Building Name / Facility Complex *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Ramanujan Science Block, Aryabhata Engineering Center"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8EAF1] dark:border-slate-800 bg-[#F7F8FC] dark:bg-slate-800 font-bold text-xs"
                />
              </div>

              {buildings.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Existing Buildings ({buildings.length}):</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {buildings.map((b) => (
                      <span key={b} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                        🏢 {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAF1] dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddBuildingOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="btn-saas-primary text-xs px-4 font-bold cursor-pointer"
                >
                  Save Building &amp; Add Rooms
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── QUICK ALLOCATE FREE ROOM MODAL ─── */}
      {bookingRoom && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Allocate Room: {bookingRoom.roomNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {currentSlot.label} on {selectedDayInfo.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookingRoom(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Session Type
                </label>
                <select
                  value={bookingSessionType}
                  onChange={(e) => setBookingSessionType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="REMEDIAL">Remedial / Doubt Clearing Session</option>
                  <option value="LECTURE">Regular Lecture Class</option>
                  <option value="LAB">Laboratory Practical Evaluation</option>
                  <option value="GUEST_LECTURE">Guest Lecture / Seminar</option>
                  <option value="EXAM">Viva / Mid-Term Assessment</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Session Topic / Course Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems: Process Synchronization"
                  value={bookingTopic}
                  onChange={(e) => setBookingTopic(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Course Code
                  </label>
                  <select
                    value={bookingCourseCode}
                    onChange={(e) => setBookingCourseCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-semibold"
                  >
                    <option value="">Select a published course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Student Section
                  </label>
                  <select
                    value={bookingSection}
                    onChange={(e) => setBookingSection(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    <option value="">Select student section</option>
                    {availableSectionList.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                    {bookingSection && !availableSectionList.includes(bookingSection) && (
                      <option value={bookingSection}>{bookingSection}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Faculty Instructor
                </label>
                <input
                  type="text"
                  value={bookingFaculty}
                  onChange={(e) => setBookingFaculty(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingRoom(null)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 cursor-pointer"
                >
                  Confirm Allocation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
