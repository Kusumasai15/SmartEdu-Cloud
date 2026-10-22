"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAcademicData } from "@/context/AcademicDataContext";
import { apiClient } from "@/lib/api-client";
import {
  User,
  Phone,
  Mail,
  Building2,
  GraduationCap,
  Award,
  Sparkles,
  CheckCircle2,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Camera,
  Save,
  Globe,
  Github,
  Linkedin,
  Key,
  Bell,
  Code2,
  FileCheck,
  Check,
  X,
  Calendar,
  Briefcase,
  Lock,
  ShieldAlert,
  Printer,
  Download,
  FileText,
  Copy,
  BookOpen,
  Layers,
  ScrollText,
  Smartphone,
  QrCode,
  Shield,
} from "lucide-react";
import {
  generateTotpSecret,
  getOtpauthUri,
  getTotpQrCodeUrl,
  verifyTotpToken,
} from "@/lib/totp";

export interface PublicationItem {
  id: string;
  title: string;
  journal: string;
  year: string;
  doi?: string;
  authors: string;
  citations?: number;
  indexedIn?: string;
}

export interface GrantItem {
  id: string;
  title: string;
  agency: string;
  amount: string;
  role: string;
  duration: string;
  status: "Ongoing" | "Completed";
}

interface SkillItem {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
}

interface ProjectItem {
  id: string;
  title: string;
  techStack?: string;
  description: string;
  link?: string;
}

interface CertificationItem {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

interface AchievementItem {
  id: string;
  title: string;
  category: "Academic" | "Competition" | "Research" | "Leadership";
  date: string;
  description: string;
}

interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rollNo: string;
  department: string;
  semester: string;
  designation?: string;
  officeNumber?: string;
  officeHours?: string;
  qualifications?: string;
  specialization?: string;
  bio: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  avatarUrl: string;
  skills: SkillItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  achievements: AchievementItem[];
  notifications: {
    grades: boolean;
    assignments: boolean;
    announcements: boolean;
    discussions: boolean;
  };
}

const defaultProfile: UserProfileData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  rollNo: "",
  department: "",
  semester: "",
  designation: "",
  officeNumber: "",
  officeHours: "",
  qualifications: "",
  specialization: "",
  bio: "",
  githubUrl: "",
  linkedinUrl: "",
  websiteUrl: "",
  avatarUrl: "",
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  notifications: {
    grades: true,
    assignments: true,
    announcements: true,
    discussions: true,
  },
};

const skillSuggestions = [
  "Python",
  "Java",
  "C++",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "SQL",
  "PostgreSQL",
  "Machine Learning",
  "Docker",
  "Kubernetes",
  "System Design",
  "Data Structures",
  "Algorithms",
  "Git",
];

const avatarPresets = [
  { id: "p1", bg: "bg-slate-900", label: "Violet" },
  { id: "p2", bg: "from-[#0284C7] to-[#38BDF8]", label: "Sky Blue" },
  { id: "p3", bg: "from-[#16A34A] to-[#4ADE80]", label: "Emerald" },
  { id: "p4", bg: "from-[#DB2777] to-[#F472B6]", label: "Rose Pink" },
  { id: "p5", bg: "from-[#D97706] to-[#FBBF24]", label: "Amber" },
];

const defaultFacultyPublications: PublicationItem[] = [];

const defaultFacultyGrants: GrantItem[] = [];

export default function SettingsPage() {
  const { user } = useAuth();
  const { users, courses } = useAcademicData();
  const roleName = user?.role?.name?.toLowerCase() || "student";
  const isAdminOrHod = ["admin", "administrator", "hod", "head of department", "vc", "vice chancellor"].includes(roleName);
  const isFacultyOrHod =
    user?.role?.name === "FACULTY" ||
    user?.role?.name === "HOD" ||
    roleName === "faculty" ||
    roleName === "hod";
  const isStudent = roleName === "student" && !isAdminOrHod && !isFacultyOrHod;

  const [activeTab, setActiveTab] = useState<
    "profile" | "skills" | "certifications" | "achievements" | "resume" | "publications" | "grants" | "teaching" | "cv" | "security"
  >("profile");
  const [copyResumeToast, setCopyResumeToast] = useState(false);
  const [copyCvToast, setCopyCvToast] = useState(false);

  // Two-Factor Authentication (2FA) State
  const [is2faEnabled, setIs2faEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartedu_2fa_enabled") === "true";
    }
    return false;
  });
  const [totpSecret, setTotpSecret] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartedu_2fa_secret") || generateTotpSecret();
    }
    return "JBSWY3DPEHPK3PXP";
  });
  const [totpInputCode, setTotpInputCode] = useState<string>("");
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpSuccess, setTotpSuccess] = useState<string | null>(null);
  const [isSettingUp2fa, setIsSettingUp2fa] = useState<boolean>(false);

  const handleStart2faSetup = () => {
    const newSec = generateTotpSecret();
    setTotpSecret(newSec);
    if (typeof window !== "undefined") {
      localStorage.setItem("smartedu_2fa_secret", newSec);
    }
    setIsSettingUp2fa(true);
    setTotpError(null);
    setTotpSuccess(null);
  };

  const handleVerifyAndEnable2fa = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyTotpToken(totpSecret, totpInputCode)) {
      setIs2faEnabled(true);
      if (typeof window !== "undefined") {
        const userKey = (user?.email || "").toLowerCase().trim();
        if (userKey) {
          localStorage.setItem(`smartedu_2fa_enabled_${userKey}`, "true");
          localStorage.setItem(`smartedu_2fa_secret_${userKey}`, totpSecret);
        }
        localStorage.removeItem("smartedu_2fa_enabled");
      }
      setTotpSuccess("✓ Microsoft Authenticator 2FA successfully activated for your account!");
      setIsSettingUp2fa(false);
      setTotpInputCode("");
      setTotpError(null);
    } else {
      setTotpError("Invalid 6-digit code. Please enter the current code shown in Microsoft Authenticator.");
    }
  };

  const handleDisable2fa = () => {
    setIs2faEnabled(false);
    if (typeof window !== "undefined") {
      const userKey = (user?.email || "").toLowerCase().trim();
      if (userKey) {
        localStorage.setItem(`smartedu_2fa_enabled_${userKey}`, "false");
        localStorage.removeItem(`smartedu_2fa_secret_${userKey}`);
      }
      localStorage.removeItem("smartedu_2fa_enabled");
    }
    setTotpSuccess("Two-factor authentication has been disabled.");
    setTotpError(null);
  };

  // Publications State for Faculty (Clean Zero Dummy Data)
  const [publications, setPublications] = useState<PublicationItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`SMARTEDU_FACULTY_PUBS_${user?.id || "default"}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Filter out any mock dummy items
            const filtered = parsed.filter(
              (p: PublicationItem) =>
                p.id !== "pub-1" &&
                p.id !== "pub-2" &&
                p.id !== "pub-3" &&
                !p.title?.includes("Optimized Task Scheduling") &&
                !p.title?.includes("Fault-Tolerant Consensus")
            );
            return filtered;
          }
        }
      } catch {}
    }
    return defaultFacultyPublications;
  });

  // Grants State for Faculty (Clean Zero Dummy Data)
  const [grants, setGrants] = useState<GrantItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`SMARTEDU_FACULTY_GRANTS_${user?.id || "default"}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Filter out any mock dummy items
            const filtered = parsed.filter(
              (g: GrantItem) =>
                g.id !== "grant-1" &&
                g.id !== "grant-2" &&
                !g.title?.includes("AI-Driven Autonomous") &&
                !g.title?.includes("Modernization of Distributed")
            );
            return filtered;
          }
        }
      } catch {}
    }
    return defaultFacultyGrants;
  });

  // Modals for adding Publication & Grant
  const [showPubModal, setShowPubModal] = useState(false);
  const [newPub, setNewPub] = useState<Omit<PublicationItem, "id">>({
    title: "",
    journal: "",
    year: "2024",
    doi: "",
    authors: "",
    citations: 0,
    indexedIn: "Scopus / SCI",
  });

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [newGrant, setNewGrant] = useState<Omit<GrantItem, "id">>({
    title: "",
    agency: "",
    amount: "",
    role: "Principal Investigator (PI)",
    duration: "2024 – 2027",
    status: "Ongoing",
  });

  const handleAddPublication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPub.title.trim() || !newPub.journal.trim()) return;
    const item: PublicationItem = {
      ...newPub,
      id: `pub-${Date.now()}`,
    };
    const updated = [item, ...publications];
    setPublications(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`SMARTEDU_FACULTY_PUBS_${user?.id || "default"}`, JSON.stringify(updated));
      } catch {}
    }
    setShowPubModal(false);
    setNewPub({
      title: "",
      journal: "",
      year: "2024",
      doi: "",
      authors: "",
      citations: 0,
      indexedIn: "Scopus / SCI",
    });
  };

  const handleRemovePublication = (id: string) => {
    const updated = publications.filter((p) => p.id !== id);
    setPublications(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`SMARTEDU_FACULTY_PUBS_${user?.id || "default"}`, JSON.stringify(updated));
      } catch {}
    }
  };

  const handleAddGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrant.title.trim() || !newGrant.agency.trim()) return;
    const item: GrantItem = {
      ...newGrant,
      id: `grant-${Date.now()}`,
    };
    const updated = [item, ...grants];
    setGrants(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`SMARTEDU_FACULTY_GRANTS_${user?.id || "default"}`, JSON.stringify(updated));
      } catch {}
    }
    setShowGrantModal(false);
    setNewGrant({
      title: "",
      agency: "",
      amount: "",
      role: "Principal Investigator (PI)",
      duration: "2024 – 2027",
      status: "Ongoing",
    });
  };

  const handleRemoveGrant = (id: string) => {
    const updated = grants.filter((g) => g.id !== id);
    setGrants(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`SMARTEDU_FACULTY_GRANTS_${user?.id || "default"}`, JSON.stringify(updated));
      } catch {}
    }
  };

  const [profile, setProfile] = useState<UserProfileData>(() => ({
    ...defaultProfile,
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    rollNo: user?.student_identifier || user?.faculty_identifier || "",
    department: (typeof user?.department === "string" ? user.department : user?.department?.name) || "",
  }));
  const [saveToast, setSaveToast] = useState(false);

  // New Skill Form State
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<"Beginner" | "Intermediate" | "Advanced" | "Expert">("Intermediate");

  // New Certification Form State
  const [showCertModal, setShowCertModal] = useState(false);
  const [newCert, setNewCert] = useState({
    title: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    credentialId: "",
    credentialUrl: "",
  });

  // New Achievement Form State
  const [showAchModal, setShowAchModal] = useState(false);
  const [newAch, setNewAch] = useState({
    title: "",
    category: "Academic" as const,
    date: "",
    description: "",
  });

  // Password State
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Load from Backend API & LocalStorage & AcademicDataContext
  useEffect(() => {
    async function loadBackendProfile() {
      const userCleanEmail = user?.email?.toLowerCase().trim() || "";
      const userCleanStuId = (user?.student_identifier || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const userCleanFacId = (user?.faculty_identifier || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const userCleanId = (user?.id || "").toLowerCase();

      // Find matching user from AcademicDataContext
      const contextUser = users.find((u) => {
        if (!u) return false;
        const uEmail = (u.email || "").toLowerCase().trim();
        const uStuId = (u.student_identifier || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const uFacId = (u.faculty_identifier || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const uId = (u.id || "").toLowerCase();

        return (
          (userCleanEmail && (uEmail === userCleanEmail || uEmail.startsWith(userCleanEmail))) ||
          (userCleanId && uId === userCleanId) ||
          (userCleanStuId && (uStuId === userCleanStuId || uStuId.includes(userCleanStuId) || userCleanStuId.includes(uStuId))) ||
          (userCleanFacId && (uFacId === userCleanFacId || uFacId.includes(userCleanFacId) || userCleanFacId.includes(uFacId)))
        );
      });

      const isStudent = user?.role?.name === "STUDENT" || contextUser?.role === "STUDENT";
      const defaultDesignation = "";
      const defaultOfficeNumber = "";
      const defaultOfficeHours = "";
      const defaultQualifications = "";

      try {
        const res = await apiClient.get<any>("/auth/me");
        if (res) {
          const userBackend = res;
          let loadedSkills: SkillItem[] = defaultProfile.skills;
          let loadedCerts: CertificationItem[] = defaultProfile.certifications;
          let loadedAchs: AchievementItem[] = defaultProfile.achievements;
          let loadedNotifs = defaultProfile.notifications;

          try {
            if (userBackend.skills) loadedSkills = JSON.parse(userBackend.skills);
          } catch {}
          try {
            if (userBackend.certifications) loadedCerts = JSON.parse(userBackend.certifications);
          } catch {}
          try {
            if (userBackend.achievements) loadedAchs = JSON.parse(userBackend.achievements);
          } catch {}
          try {
            if (userBackend.notification_preferences) loadedNotifs = JSON.parse(userBackend.notification_preferences);
          } catch {}

          // Check if /auth/me matches active logged-in session
          const isCurrentSessionMatch =
            (userCleanEmail && userBackend.email?.toLowerCase().trim() === userCleanEmail) ||
            (userCleanId && userBackend.id === userCleanId) ||
            (userCleanStuId && userBackend.student_identifier && userBackend.student_identifier.toLowerCase().replace(/[^a-z0-9]/g, "") === userCleanStuId);

          setProfile((prev) => ({
            ...prev,
            firstName: user?.first_name || contextUser?.first_name || (isCurrentSessionMatch ? userBackend.first_name : "") || prev.firstName,
            lastName: user?.last_name || contextUser?.last_name || (isCurrentSessionMatch ? userBackend.last_name : "") || prev.lastName || "",
            email: user?.email || contextUser?.email || (isCurrentSessionMatch ? userBackend.email : "") || prev.email,
            phone: user?.phone || contextUser?.phone || (isCurrentSessionMatch ? userBackend.phone : "") || prev.phone,
            rollNo: user?.student_identifier || user?.faculty_identifier || contextUser?.student_identifier || contextUser?.faculty_identifier || (isCurrentSessionMatch ? (userBackend.student_identifier || userBackend.faculty_identifier) : "") || prev.rollNo,
            department: (typeof user?.department === "string" ? user.department : user?.department?.name) || contextUser?.department || (isCurrentSessionMatch ? (userBackend.department?.name || userBackend.department) : "") || prev.department,
            designation: contextUser?.designation || (isCurrentSessionMatch ? userBackend.designation : "") || prev.designation || defaultDesignation,
            officeNumber: isStudent ? "" : (contextUser?.office_number || (isCurrentSessionMatch ? userBackend.office_number : "") || prev.officeNumber || defaultOfficeNumber),
            officeHours: isStudent ? "" : (contextUser?.office_hours || (isCurrentSessionMatch ? userBackend.office_hours : "") || prev.officeHours || defaultOfficeHours),
            qualifications: contextUser?.qualifications || (isCurrentSessionMatch ? userBackend.qualifications : "") || prev.qualifications || defaultQualifications,
            specialization: prev.specialization,
            bio: (isCurrentSessionMatch ? userBackend.bio : "") || contextUser?.bio || prev.bio,
            avatarUrl: (isCurrentSessionMatch ? userBackend.avatar_url : "") || contextUser?.avatar_url || (user?.id && typeof window !== "undefined" ? localStorage.getItem(`smartedu_avatar_${user.id}`) : null) || prev.avatarUrl,
            skills: loadedSkills.length > 0 ? loadedSkills : prev.skills,
            certifications: loadedCerts.length > 0 ? loadedCerts : prev.certifications,
            achievements: loadedAchs.length > 0 ? loadedAchs : prev.achievements,
            notifications: loadedNotifs,
            githubUrl: (isCurrentSessionMatch ? userBackend.github_url : "") || prev.githubUrl,
            linkedinUrl: (isCurrentSessionMatch ? userBackend.linkedin_url : "") || prev.linkedinUrl,
            websiteUrl: (isCurrentSessionMatch ? userBackend.website_url : "") || prev.websiteUrl,
          }));
          return;
        }
      } catch {
        setProfile((prev) => ({
          ...prev,
          firstName: user?.first_name || contextUser?.first_name || prev.firstName,
          lastName: user?.last_name || contextUser?.last_name || prev.lastName,
          email: user?.email || contextUser?.email || prev.email,
          rollNo: user?.student_identifier || user?.faculty_identifier || contextUser?.student_identifier || contextUser?.faculty_identifier || prev.rollNo,
          department: (typeof user?.department === "string" ? user.department : user?.department?.name) || contextUser?.department || prev.department,
          designation: contextUser?.designation || prev.designation,
          officeNumber: contextUser?.office_number || prev.officeNumber,
          officeHours: contextUser?.office_hours || prev.officeHours,
          qualifications: contextUser?.qualifications || prev.qualifications,
        }));
      }
    }

    loadBackendProfile();
  }, [user, users]);

  // Save changes to the authenticated backend.
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      // Persist directly to the backend database.
      await apiClient.put("/auth/me", {
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        bio: profile.bio,
        avatar_url: profile.avatarUrl,
        skills: JSON.stringify(profile.skills),
        certifications: JSON.stringify(profile.certifications),
        achievements: JSON.stringify(profile.achievements),
        notification_preferences: JSON.stringify(profile.notifications),
        github_url: profile.githubUrl,
        linkedin_url: profile.linkedinUrl,
        website_url: profile.websiteUrl,
      });

      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch {
      setSaveToast(false);
    }
  };

  // Add Skill
  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    const item: SkillItem = {
      id: "skill-" + Date.now(),
      name: newSkillName.trim(),
      level: newSkillLevel,
    };
    const updated = { ...profile, skills: [...profile.skills, item] };
    setProfile(updated);
    setNewSkillName("");
    try {
      await apiClient.put("/auth/me", { skills: JSON.stringify(updated.skills) });
    } catch {}
  };

  // Remove Skill
  const handleRemoveSkill = async (id: string) => {
    const updated = {
      ...profile,
      skills: profile.skills.filter((s) => s.id !== id),
    };
    setProfile(updated);
    try {
      await apiClient.put("/auth/me", { skills: JSON.stringify(updated.skills) });
    } catch {}
  };

  // Add Certification
  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCert.title.trim() || !newCert.issuer.trim()) return;
    const item: CertificationItem = {
      id: "cert-" + Date.now(),
      title: newCert.title.trim(),
      issuer: newCert.issuer.trim(),
      issueDate: newCert.issueDate || "2026",
      expiryDate: newCert.expiryDate,
      credentialId: newCert.credentialId,
      credentialUrl: newCert.credentialUrl,
    };
    const updated = {
      ...profile,
      certifications: [item, ...profile.certifications],
    };
    setProfile(updated);
    setNewCert({ title: "", issuer: "", issueDate: "", expiryDate: "", credentialId: "", credentialUrl: "" });
    setShowCertModal(false);
    try {
      await apiClient.put("/auth/me", { certifications: JSON.stringify(updated.certifications) });
    } catch {}
  };

  // Remove Certification
  const handleRemoveCert = async (id: string) => {
    const updated = {
      ...profile,
      certifications: profile.certifications.filter((c) => c.id !== id),
    };
    setProfile(updated);
    try {
      await apiClient.put("/auth/me", { certifications: JSON.stringify(updated.certifications) });
    } catch {}
  };

  // Add Achievement
  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAch.title.trim()) return;
    const item: AchievementItem = {
      id: "ach-" + Date.now(),
      title: newAch.title.trim(),
      category: newAch.category,
      date: newAch.date || "2026",
      description: newAch.description.trim(),
    };
    const updated = {
      ...profile,
      achievements: [item, ...profile.achievements],
    };
    setProfile(updated);
    setNewAch({ title: "", category: "Academic", date: "", description: "" });
    setShowAchModal(false);
    try {
      await apiClient.put("/auth/me", { achievements: JSON.stringify(updated.achievements) });
    } catch {}
  };

  // Remove Achievement
  const handleRemoveAchievement = async (id: string) => {
    const updated = {
      ...profile,
      achievements: profile.achievements.filter((a) => a.id !== id),
    };
    setProfile(updated);
    try {
      await apiClient.put("/auth/me", { achievements: JSON.stringify(updated.achievements) });
    } catch {}
  };

  // Handle Avatar Image Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Choose a JPEG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Profile images must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    // Instant local preview & persistent client fallback
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setProfile((current) => ({ ...current, avatarUrl: dataUrl }));
      if (typeof window !== "undefined") {
        try {
          if (user?.id) localStorage.setItem(`smartedu_avatar_${user.id}`, dataUrl);
          if (user?.email) localStorage.setItem(`smartedu_avatar_${user.email.toLowerCase().trim()}`, dataUrl);
          localStorage.removeItem("smartedu_user_avatar");
          window.dispatchEvent(new Event("user-avatar-updated"));
        } catch {}
      }

      // Upload to backend storage & update user record
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "avatars");

        const uploadRes = await apiClient.post<{ asset_url?: string; success?: boolean }>("/storage/direct-upload", formData);
        if (uploadRes?.asset_url) {
          await apiClient.put("/auth/me", { avatar_url: uploadRes.asset_url });
          setProfile((current) => ({ ...current, avatarUrl: uploadRes.asset_url || current.avatarUrl }));
          if (typeof window !== "undefined") {
            try {
              if (user?.id) localStorage.setItem(`smartedu_avatar_${user.id}`, uploadRes.asset_url);
              if (user?.email) localStorage.setItem(`smartedu_avatar_${user.email.toLowerCase().trim()}`, uploadRes.asset_url);
              localStorage.removeItem("smartedu_user_avatar");
              window.dispatchEvent(new Event("user-avatar-updated"));
            } catch {}
          }
        }
      } catch (uploadErr) {
        console.warn("Backend direct upload fallback:", uploadErr);
      }

      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3500);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordState.currentPassword || !passwordState.newPassword) return;
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      alert("New passwords do not match.");
      return;
    }
    try {
      await apiClient.post("/auth/change-password", {
        current_password: passwordState.currentPassword,
        new_password: passwordState.newPassword,
      });
      setPasswordSuccess(true);
      setPasswordState({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to change password. Please check your current password.");
    }
  };

  const userInitials = (profile.firstName?.[0] || "A").toUpperCase() + (profile.lastName?.[0] || "S").toUpperCase();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in font-sans">
            {/* Success Toast Notification */}
            {saveToast && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Profile and account settings saved successfully!</span>
                </div>
                <button onClick={() => setSaveToast(false)} className="text-emerald-600 hover:text-emerald-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Profile Overview Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#EAEFF5] dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Header Gradient Banner - UniFlow Royal Blue Theme */}
              <div className="h-28 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 dark:from-slate-900 dark:via-blue-950/70 dark:to-slate-900 border-b border-blue-400/30 dark:border-slate-800 relative p-6 flex items-end justify-between shadow-inner">
                <div className="flex items-center gap-2 text-white/95 text-xs font-bold tracking-wide">
                  <Sparkles className="h-4 w-4 text-blue-200" />
                  <span>UniFlow Academic Profile &amp; Verified Institutional Credentials</span>
                </div>
              </div>

              {/* Avatar & Key Info Section */}
              <div className="px-6 sm:px-8 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
                <div className="flex items-end gap-4">
                  {/* Avatar with Camera Overlay */}
                  <div className="relative group">
                    <div className="h-24 w-24 rounded-3xl bg-slate-900 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900 overflow-hidden bg-cover bg-center">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{userInitials}</span>
                      )}
                    </div>
                    <label
                      htmlFor="avatar-upload-input"
                      className="absolute bottom-1 right-1 p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#EAEFF5] dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Upload Profile Picture"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        id="avatar-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-1 pb-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white">
                        {profile.firstName} {profile.lastName}
                      </h1>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {roleName}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      {profile.rollNo} • {profile.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSaveProfile}
                    className="btn-saas-primary text-xs px-5 py-2.5 font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs Bar */}
              <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-8 border-t border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    activeTab === "profile"
                      ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                      : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>{isFacultyOrHod ? "Personal & Cabin Office" : "Personal Info"}</span>
                </button>

                {isFacultyOrHod ? (
                  <>
                    <button
                      onClick={() => setActiveTab("publications")}
                      className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeTab === "publications"
                          ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                          : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Research Publications</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {publications.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("grants")}
                      className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeTab === "grants"
                          ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                          : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                      }`}
                    >
                      <Award className="h-4 w-4" />
                      <span>Funded Grants &amp; Projects</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {grants.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("teaching")}
                      className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeTab === "teaching"
                          ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                          : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                      }`}
                    >
                      <Layers className="h-4 w-4" />
                      <span>Teaching Portfolio</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("cv")}
                      className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeTab === "cv"
                          ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                          : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Academic Dossier (CV)</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 border border-purple-200 font-mono font-bold">
                        Faculty Standard
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab("skills")}
                      className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeTab === "skills"
                          ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                          : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                      }`}
                    >
                      <Code2 className="h-4 w-4" />
                      <span>Skills &amp; Expertise</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {profile.skills.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("certifications")}
                      className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeTab === "certifications"
                          ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                          : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                      }`}
                    >
                      <FileCheck className="h-4 w-4" />
                      <span>Certifications</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {profile.certifications.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("achievements")}
                      className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeTab === "achievements"
                          ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                          : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                      }`}
                    >
                      <Award className="h-4 w-4" />
                      <span>Projects &amp; Honors</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {profile.achievements.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("resume")}
                      className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeTab === "resume"
                          ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                          : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Student Resume</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                        ATS Ivy
                      </span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setActiveTab("security")}
                  className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    activeTab === "security"
                      ? "border-slate-900 dark:border-white text-slate-900 dark:text-slate-100"
                      : "border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#1E2438] dark:hover:text-white"
                  }`}
                >
                  <Key className="h-4 w-4" />
                  <span>Security &amp; Password</span>
                </button>
              </div>
            </div>

            {/* TAB 1: PERSONAL & CONTACT INFORMATION */}
            {activeTab === "profile" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAEFF5] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">Personal &amp; Contact Details</h3>
                    <p className="text-xs text-[#64748B]">Manage your profile information and verified university records</p>
                  </div>
                  {!isAdminOrHod ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8FAFD] border border-[#E2E8F0] text-[11px] font-semibold text-[#64748B]">
                      <Lock className="h-3 w-3 text-[#94A3B8]" />
                      <span>Institutional fields locked for students</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                      <ShieldCheck className="h-3 w-3 text-slate-900 dark:text-slate-100" />
                      <span>Admin / HOD Edit Privileges</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Personal Details Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      {roleName === "student" ? "Student Details (Editable)" : "Faculty & Staff Details (Editable)"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#334155]">First Name</label>
                        <input
                          type="text"
                          value={profile.firstName}
                          onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#334155]">Last Name</label>
                        <input
                          type="text"
                          value={profile.lastName}
                          onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-[#334155]">Contact Phone Number</label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                          />
                          <Phone className="h-4 w-4 text-[#94A3B8] absolute left-3.5 top-3" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Faculty & Academic Office Details (Visible for Faculty, HOD, and Admin) */}
                  {(roleName === "faculty" || roleName === "hod" || isAdminOrHod) && (
                    <div className="p-5 rounded-2xl bg-[#F0F4FF] dark:bg-slate-800/80 border border-[#D0E0FF] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                          <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                            Faculty Cabin Office &amp; Consultation Information
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 bg-white px-2.5 py-0.5 rounded-md border border-[#D0E0FF]">
                          Visible to Enrolled Students
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#334155]">Academic Designation</label>
                          <input
                            type="text"
                            value={profile.designation || ""}
                            onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                            placeholder="e.g. Associate Professor & Program Chair"
                            className="w-full h-10 px-3.5 rounded-xl border border-[#D0E0FF] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#334155]">Faculty Office / Cabin Location</label>
                          <input
                            type="text"
                            value={profile.officeNumber || ""}
                            onChange={(e) => setProfile({ ...profile, officeNumber: e.target.value })}
                            placeholder="e.g. Cabin 304, Academic Block A"
                            className="w-full h-10 px-3.5 rounded-xl border border-[#D0E0FF] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#334155]">Student Consultation / Office Hours</label>
                          <input
                            type="text"
                            value={profile.officeHours || ""}
                            onChange={(e) => setProfile({ ...profile, officeHours: e.target.value })}
                            placeholder="e.g. Mon & Wed 03:00 PM – 05:00 PM"
                            className="w-full h-10 px-3.5 rounded-xl border border-[#D0E0FF] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#334155]">Highest Qualifications</label>
                          <input
                            type="text"
                            value={profile.qualifications || ""}
                            onChange={(e) => setProfile({ ...profile, qualifications: e.target.value })}
                            placeholder="e.g. Ph.D. in Computer Science (IIT Bombay)"
                            className="w-full h-10 px-3.5 rounded-xl border border-[#D0E0FF] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Institutional Records Section (Locked for Students) */}
                  <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                        <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                          Official Institutional Records
                        </h4>
                      </div>
                      {!isAdminOrHod && (
                        <span className="text-[10px] font-bold text-[#64748B] flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-md border border-[#E2E8F0]">
                          <Lock className="h-2.5 w-2.5 text-[#94A3B8]" />
                          Read Only (Admin/HOD Managed)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* College / Institutional Email */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#475569]">College Email Address</label>
                          {!isAdminOrHod && <Lock className="h-3 w-3 text-[#94A3B8]" />}
                        </div>
                        <div className="relative">
                          <input
                            type="email"
                            value={profile.email}
                            disabled={!isAdminOrHod}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            className={`w-full h-10 pl-10 pr-3.5 rounded-xl border text-xs font-medium ${
                              !isAdminOrHod
                                ? "border-[#E2E8F0] text-[#64748B] bg-[#EDF2F7]/80 cursor-not-allowed"
                                : "border-[#E2E8F0] text-[#1E2438] bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                            }`}
                          />
                          <Mail className="h-4 w-4 text-[#94A3B8] absolute left-3.5 top-3" />
                        </div>
                      </div>

                      {/* Roll Number / Student ID */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#475569]">
                            {roleName === "student" ? "Roll Number / Student ID" : "Faculty / Staff ID"}
                          </label>
                          {!isAdminOrHod && <Lock className="h-3 w-3 text-[#94A3B8]" />}
                        </div>
                        <input
                          type="text"
                          value={profile.rollNo}
                          disabled={!isAdminOrHod}
                          onChange={(e) => setProfile({ ...profile, rollNo: e.target.value })}
                          className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium ${
                            !isAdminOrHod
                              ? "border-[#E2E8F0] text-[#64748B] bg-[#EDF2F7]/80 cursor-not-allowed font-mono"
                              : "border-[#E2E8F0] text-[#1E2438] bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          }`}
                        />
                      </div>

                      {/* Department */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#475569]">Department</label>
                          {!isAdminOrHod && <Lock className="h-3 w-3 text-[#94A3B8]" />}
                        </div>
                        <input
                          type="text"
                          value={profile.department}
                          disabled={!isAdminOrHod}
                          onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                          className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium ${
                            !isAdminOrHod
                              ? "border-[#E2E8F0] text-[#64748B] bg-[#EDF2F7]/80 cursor-not-allowed"
                              : "border-[#E2E8F0] text-[#1E2438] bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          }`}
                        />
                      </div>

                      {/* Class / Academic Semester */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#475569]">
                            {roleName === "student" ? "Class & Semester" : "Academic Division"}
                          </label>
                          {!isAdminOrHod && <Lock className="h-3 w-3 text-[#94A3B8]" />}
                        </div>
                        <input
                          type="text"
                          value={profile.semester || (roleName === "student" ? "5th Semester (Fall 2026)" : "Faculty of Engineering")}
                          disabled={!isAdminOrHod}
                          onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                          className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium ${
                            !isAdminOrHod
                              ? "border-[#E2E8F0] text-[#64748B] bg-[#EDF2F7]/80 cursor-not-allowed"
                              : "border-[#E2E8F0] text-[#1E2438] bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          }`}
                        />
                      </div>
                    </div>

                    {!isAdminOrHod && (
                      <p className="text-[11px] text-[#64748B] pt-1">
                        🔒 To update your official department, roll number, class semester, or institutional email, please submit a request to the Academic Registrar or Head of Department.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#334155]">Academic Bio / Summary</label>
                    <textarea
                      rows={3}
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Share a short bio about your academic focus, projects, and career interests..."
                      className="w-full p-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                    />
                  </div>

                  {/* Social & Portfolio Links */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Portfolio &amp; Professional Links
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="relative">
                        <input
                          type="url"
                          value={profile.githubUrl}
                          onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                          placeholder="GitHub Profile URL"
                          className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                        />
                        <Github className="h-4 w-4 text-[#94A3B8] absolute left-3 top-3" />
                      </div>

                      <div className="relative">
                        <input
                          type="url"
                          value={profile.linkedinUrl}
                          onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                          placeholder="LinkedIn Profile URL"
                          className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                        />
                        <Linkedin className="h-4 w-4 text-[#94A3B8] absolute left-3 top-3" />
                      </div>

                      <div className="relative">
                        <input
                          type="url"
                          value={profile.websiteUrl}
                          onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })}
                          placeholder="Personal Website / Portfolio"
                          className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                        />
                        <Globe className="h-4 w-4 text-[#94A3B8] absolute left-3 top-3" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#EAEFF5]">
                    <button
                      type="submit"
                      className="btn-saas-primary text-xs px-6 py-2.5 font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Information</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: SKILLS & TECHNICAL PROFICIENCIES */}
            {activeTab === "skills" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Skills &amp; Technical Expertise</h3>
                  <p className="text-xs text-[#64748B]">Add programming languages, frameworks, and academic competencies</p>
                </div>

                {/* Add Skill Input Row */}
                <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF5] space-y-3">
                  <span className="text-xs font-bold text-[#0F172A] block">Add a New Skill</span>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="e.g. Python, Machine Learning, React, PostgreSQL..."
                      className="flex-1 h-10 px-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white w-full"
                    />

                    <select
                      value={newSkillLevel}
                      onChange={(e) => setNewSkillLevel(e.target.value as any)}
                      className="h-10 px-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E2438] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white w-full sm:w-40"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="btn-saas-primary text-xs px-5 h-10 font-bold flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Skill</span>
                    </button>
                  </div>

                  {/* Quick Suggestions Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-[#94A3B8] font-semibold mr-1">Suggestions:</span>
                    {skillSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewSkillName(s)}
                        className="px-2 py-0.5 rounded-lg bg-white border border-[#EAEFF5] hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-[10px] text-[#64748B] font-medium transition-colors cursor-pointer"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skills Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    My Added Skills ({profile.skills.length})
                  </h4>

                  {profile.skills.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94A3B8] border border-dashed border-[#CBD5E1] rounded-2xl">
                      No skills added yet. Use the input box above to add your first skill.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {profile.skills.map((skill) => (
                        <div
                          key={skill.id}
                          className="p-3.5 rounded-2xl bg-white border border-[#EAEFF5] shadow-2xs hover:border-[#CBD5E1] flex items-center justify-between group transition-all"
                        >
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-[#0F172A] block">{skill.name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                skill.level === "Expert"
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                  : skill.level === "Advanced"
                                  ? "bg-[#E0F2FE] text-[#0284C7]"
                                  : skill.level === "Intermediate"
                                  ? "bg-[#DCFCE7] text-[#16A34A]"
                                  : "bg-[#FEF3C7] text-[#D97706]"
                              }`}
                            >
                              {skill.level}
                            </span>
                          </div>

                          <button
                            onClick={() => handleRemoveSkill(skill.id)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                            title="Remove Skill"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CERTIFICATIONS & LICENSES */}
            {activeTab === "certifications" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">Certifications &amp; Credentials</h3>
                    <p className="text-xs text-[#64748B]">Showcase official certifications, courses, and digital badges</p>
                  </div>

                  <button
                    onClick={() => setShowCertModal(true)}
                    className="btn-saas-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Certificate</span>
                  </button>
                </div>

                {/* Add Certificate Modal / Form */}
                {showCertModal && (
                  <form onSubmit={handleAddCertification} className="p-5 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF5] space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-[#EAEFF5] pb-2">
                      <span className="text-xs font-bold text-[#0F172A]">Add New Certificate</span>
                      <button onClick={() => setShowCertModal(false)} type="button" className="text-[#94A3B8] hover:text-[#0F172A]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-[#334155]">Certificate Title *</label>
                        <input
                          type="text"
                          required
                          value={newCert.title}
                          onChange={(e) => setNewCert({ ...newCert, title: e.target.value })}
                          placeholder="e.g. AWS Certified Cloud Practitioner"
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#334155]">Issuing Organization *</label>
                        <input
                          type="text"
                          required
                          value={newCert.issuer}
                          onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                          placeholder="e.g. Amazon Web Services, Google, Coursera"
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#334155]">Issue Date</label>
                        <input
                          type="text"
                          value={newCert.issueDate}
                          onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
                          placeholder="e.g. Jan 2025"
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#334155]">Credential ID / Code</label>
                        <input
                          type="text"
                          value={newCert.credentialId}
                          onChange={(e) => setNewCert({ ...newCert, credentialId: e.target.value })}
                          placeholder="e.g. AWS-123456"
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-bold text-[#334155]">Certificate URL or Upload Document</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newCert.credentialUrl || ""}
                            onChange={(e) => setNewCert({ ...newCert, credentialUrl: e.target.value })}
                            placeholder="https://coursera.org/verify/... or attach file"
                            className="flex-1 h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 text-xs font-mono"
                          />
                          <label className="h-9 px-3 rounded-xl border border-[#CBD5E1] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0">
                            <Upload className="h-3.5 w-3.5" />
                            <span>Upload File</span>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setNewCert((prev) => ({ ...prev, credentialUrl: reader.result as string }));
                                  };
                                  reader.readAsDataURL(f);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCertModal(false)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Save Certificate
                      </button>
                    </div>
                  </form>
                )}

                {/* Certificates List */}
                <div className="space-y-3">
                  {profile.certifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94A3B8] border border-dashed border-[#CBD5E1] rounded-2xl">
                      No certifications added yet. Click "Add Certificate" above to upload your credentials.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.certifications.map((cert) => (
                        <div
                          key={cert.id}
                          className="p-4 rounded-2xl bg-white border border-[#EAEFF5] shadow-2xs hover:border-[#CBD5E1] flex items-start justify-between group transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                              <FileCheck className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-[#0F172A]">{cert.title}</h4>
                              <p className="text-[11px] text-[#64748B]">{cert.issuer}</p>
                              <div className="flex items-center gap-2 text-[10px] text-[#94A3B8]">
                                <span>Issued {cert.issueDate}</span>
                                {cert.credentialId && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">{cert.credentialId}</span>
                                  </>
                                )}
                                {cert.credentialUrl && (
                                  <>
                                    <span>•</span>
                                    <a
                                      href={cert.credentialUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-slate-900 dark:text-white underline font-semibold hover:text-blue-600"
                                    >
                                      View Credential
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveCert(cert.id)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: ACADEMIC ACHIEVEMENTS & AWARDS */}
            {activeTab === "achievements" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">Honors &amp; Academic Achievements</h3>
                    <p className="text-xs text-[#64748B]">Add hackathon wins, published papers, academic honors, and medals</p>
                  </div>

                  <button
                    onClick={() => setShowAchModal(true)}
                    className="btn-saas-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Achievement</span>
                  </button>
                </div>

                {/* Add Achievement Form Modal */}
                {showAchModal && (
                  <form onSubmit={handleAddAchievement} className="p-5 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF5] space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-[#EAEFF5] pb-2">
                      <span className="text-xs font-bold text-[#0F172A]">Add New Honor or Achievement</span>
                      <button onClick={() => setShowAchModal(false)} type="button" className="text-[#94A3B8] hover:text-[#0F172A]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="font-bold text-[#334155]">Award / Achievement Title *</label>
                        <input
                          type="text"
                          required
                          value={newAch.title}
                          onChange={(e) => setNewAch({ ...newAch, title: e.target.value })}
                          placeholder="e.g. 1st Place - University Hackathon 2025"
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#334155]">Category</label>
                        <select
                          value={newAch.category}
                          onChange={(e) => setNewAch({ ...newAch, category: e.target.value as any })}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="Academic">Academic</option>
                          <option value="Competition">Competition</option>
                          <option value="Research">Research</option>
                          <option value="Leadership">Leadership</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-[#334155]">Short Description</label>
                      <textarea
                        rows={2}
                        value={newAch.description}
                        onChange={(e) => setNewAch({ ...newAch, description: e.target.value })}
                        placeholder="Briefly describe what you achieved..."
                        className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAchModal(false)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-saas-primary text-xs px-5 py-2 font-bold cursor-pointer"
                      >
                        Save Achievement
                      </button>
                    </div>
                  </form>
                )}

                {/* Achievements Timeline List */}
                <div className="space-y-3">
                  {profile.achievements.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94A3B8] border border-dashed border-[#CBD5E1] rounded-2xl">
                      No achievements added yet. Click "Add Achievement" above.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profile.achievements.map((ach) => (
                        <div
                          key={ach.id}
                          className="p-4 rounded-2xl bg-white border border-[#EAEFF5] shadow-2xs hover:border-[#CBD5E1] flex items-start justify-between group transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold shrink-0 mt-0.5">
                              <Award className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-[#0F172A]">{ach.title}</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                  {ach.category}
                                </span>
                              </div>
                              <p className="text-xs text-[#64748B] leading-relaxed">{ach.description}</p>
                              <span className="text-[10px] text-[#94A3B8] block">{ach.date}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveAchievement(ach.id)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PREDEFINED STANDARD UNIVERSITY RESUME BUILDER */}
            {activeTab === "resume" && (
              <div className="space-y-6">
                {/* Control Action Bar */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#EAEFF5] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A]">Standard University Placement Resume</h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Institutional Format
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      ATS-compliant standard resume layout generated strictly from your verified profile information.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const skillsStr = profile.skills.length > 0 
                          ? profile.skills.map((s) => s.name).join(", ") 
                          : "No technical skills listed yet";

                        const certsStr = profile.certifications.length > 0
                          ? profile.certifications.map((c) => `• ${c.title} — ${c.issuer} (${c.issueDate})${c.credentialId ? ` [ID: ${c.credentialId}]` : ""}`).join("\n")
                          : "No certifications added yet";

                        const achStr = profile.achievements.length > 0
                          ? profile.achievements.map((a) => `• ${a.title} (${a.date}) — ${a.description}`).join("\n")
                          : "No honors or achievements added yet";

                        const projectsStr = (profile.projects && profile.projects.length > 0)
                          ? profile.projects.map((p) => `• ${p.title}${p.techStack ? ` (${p.techStack})` : ""}: ${p.description}`).join("\n")
                          : "No projects added yet in profile";

                        const resumeText = `
${profile.firstName.toUpperCase()} ${profile.lastName.toUpperCase()}
${profile.department || "Engineering & Technology"}
Email: ${profile.email}${profile.phone ? ` • Phone: ${profile.phone}` : ""}
${profile.githubUrl ? `GitHub: ${profile.githubUrl} • ` : ""}${profile.linkedinUrl ? `LinkedIn: ${profile.linkedinUrl} • ` : ""}${profile.websiteUrl ? `Portfolio: ${profile.websiteUrl}` : ""}

=======================================================
EDUCATION
=======================================================
SmartEdu Institute of Technology
Bachelor of Technology in ${profile.department || "Computer Science & Engineering"}
${profile.semester ? `Current Standing: ${profile.semester}` : ""}

=======================================================
TECHNICAL SKILLS
=======================================================
${skillsStr}

=======================================================
PROJECTS
=======================================================
${projectsStr}

=======================================================
CERTIFICATIONS & CREDENTIALS
=======================================================
${certsStr}

=======================================================
HONORS & ACHIEVEMENTS
=======================================================
${achStr}
                        `.trim();
                        navigator.clipboard.writeText(resumeText);
                        setCopyResumeToast(true);
                        setTimeout(() => setCopyResumeToast(false), 3000);
                      }}
                      className="btn-saas-outline text-xs px-4 py-2 font-bold flex items-center gap-1.5"
                    >
                      {copyResumeToast ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-600">Copied to Clipboard</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 text-[#64748B]" />
                          <span>Copy Plaintext</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn-saas-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print / Save PDF</span>
                    </button>
                  </div>
                </div>

                {/* Printable ATS-Compliant Standard Ivy Resume Sheet */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#EAEFF5] dark:border-slate-800 shadow-md p-8 sm:p-12 max-w-4xl mx-auto space-y-6 text-[#1E2438] dark:text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
                  {/* Institutional Header - Clean, ATS Compliant, NO Roll No */}
                  <div className="text-center border-b-2 border-[#1E2438] pb-4 space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] uppercase">
                      {profile.firstName || "STUDENT"} {profile.lastName || "SCHOLAR"}
                    </h1>
                    <div className="text-xs font-semibold text-[#475569] flex items-center justify-center flex-wrap gap-x-3 gap-y-1">
                      <span>{profile.department || "Computer Science & Engineering"}</span>
                      <span>•</span>
                      <span>{profile.email || "student@smartedu.edu"}</span>
                      {profile.phone && (
                        <>
                          <span>•</span>
                          <span>{profile.phone}</span>
                        </>
                      )}
                      {profile.linkedinUrl && (
                        <>
                          <span>•</span>
                          <span className="text-slate-900 dark:text-slate-100">{profile.linkedinUrl.replace(/^https?:\/\//, "")}</span>
                        </>
                      )}
                      {profile.githubUrl && (
                        <>
                          <span>•</span>
                          <span className="text-slate-900 dark:text-slate-100">{profile.githubUrl.replace(/^https?:\/\//, "")}</span>
                        </>
                      )}
                      {profile.websiteUrl && (
                        <>
                          <span>•</span>
                          <span className="text-slate-900 dark:text-slate-100">{profile.websiteUrl.replace(/^https?:\/\//, "")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 1. Education Section */}
                  <div className="space-y-2">
                    <div className="border-b border-[#CBD5E1] pb-1 flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Education
                      </h2>
                      <span className="text-[11px] font-bold text-[#64748B]">2023 – 2027</span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-[#0F172A]">
                        <span>SmartEdu Institute of Technology &amp; Science</span>
                        <span className="font-mono text-slate-900 dark:text-slate-100">{profile.semester || "Semester 5"}</span>
                      </div>
                      <p className="text-[#475569] font-medium">
                        Bachelor of Technology in {profile.department || "Computer Science & Engineering"}
                      </p>
                    </div>
                  </div>

                  {/* 2. Technical Skills Section */}
                  <div className="space-y-2">
                    <div className="border-b border-[#CBD5E1] pb-1">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Technical Skills
                      </h2>
                    </div>

                    <div className="text-xs">
                      {profile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((s) => (
                            <span
                              key={s.id}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800 text-xs"
                            >
                              {s.name} ({s.level})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#94A3B8] italic">No skills listed yet. Add skills in the Skills tab.</p>
                      )}
                    </div>
                  </div>

                  {/* 3. Academic Projects */}
                  {(profile.projects && profile.projects.length > 0) && (
                    <div className="space-y-3">
                      <div className="border-b border-[#CBD5E1] pb-1">
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                          Projects &amp; Systems
                        </h2>
                      </div>

                      <div className="space-y-3 text-xs">
                        {profile.projects.map((p) => (
                          <div key={p.id} className="space-y-1">
                            <div className="flex items-center justify-between font-bold text-[#0F172A]">
                              <span>{p.title}</span>
                              {p.techStack && <span className="text-[11px] font-mono text-[#64748B]">{p.techStack}</span>}
                            </div>
                            <p className="text-[#475569] leading-relaxed">{p.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Certifications & Credentials */}
                  <div className="space-y-2">
                    <div className="border-b border-[#CBD5E1] pb-1">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Certifications &amp; Credentials
                      </h2>
                    </div>

                    <div className="text-xs space-y-1.5">
                      {profile.certifications.length > 0 ? (
                        profile.certifications.map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-[#475569]">
                            <div>
                              <strong className="text-[#0F172A]">{c.title}</strong> — {c.issuer}
                              {c.credentialId && <span className="text-[10px] font-mono text-[#64748B] ml-1.5">({c.credentialId})</span>}
                            </div>
                            <span className="font-mono text-[11px] text-[#64748B]">{c.issueDate}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#94A3B8] italic">No certifications added yet.</p>
                      )}
                    </div>
                  </div>

                  {/* 5. Honors & Achievements */}
                  <div className="space-y-2">
                    <div className="border-b border-[#CBD5E1] pb-1">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Honors &amp; Achievements
                      </h2>
                    </div>

                    <div className="text-xs space-y-1.5">
                      {profile.achievements.length > 0 ? (
                        profile.achievements.map((a) => (
                          <div key={a.id} className="flex items-start justify-between text-[#475569] gap-4">
                            <div>
                              <strong className="text-[#0F172A]">{a.title}</strong>: {a.description}
                            </div>
                            <span className="font-mono text-[11px] text-[#64748B] shrink-0">{a.date}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#94A3B8] italic">No achievements recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: RESEARCH PUBLICATIONS & PAPERS (FACULTY & HOD) */}
            {activeTab === "publications" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEFF5] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                      <h3 className="text-base font-bold text-[#0F172A]">Research Publications &amp; Scholarly Works</h3>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Peer-reviewed journal papers, IEEE/ACM conference proceedings, book chapters, and indexed articles.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPubModal(true)}
                    className="btn-saas-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Publication</span>
                  </button>
                </div>

                {/* Add Publication Modal */}
                {showPubModal && (
                  <form onSubmit={handleAddPublication} className="p-5 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF5] space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-[#EAEFF5] pb-2">
                      <span className="text-xs font-bold text-[#0F172A]">Add New Scholarly Publication</span>
                      <button onClick={() => setShowPubModal(false)} type="button" className="text-[#94A3B8] hover:text-[#0F172A]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-[#334155]">Paper / Article Title *</label>
                        <input
                          type="text"
                          required
                          value={newPub.title}
                          onChange={(e) => setNewPub({ ...newPub, title: e.target.value })}
                          placeholder="e.g. Distributed Consensus in Edge Computing Environments"
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Journal or Conference Name *</label>
                          <input
                            type="text"
                            required
                            value={newPub.journal}
                            onChange={(e) => setNewPub({ ...newPub, journal: e.target.value })}
                            placeholder="e.g. IEEE Transactions on Cloud Computing"
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Publication Year *</label>
                          <input
                            type="text"
                            required
                            value={newPub.year}
                            onChange={(e) => setNewPub({ ...newPub, year: e.target.value })}
                            placeholder="e.g. 2024"
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Authors *</label>
                          <input
                            type="text"
                            required
                            value={newPub.authors}
                            onChange={(e) => setNewPub({ ...newPub, authors: e.target.value })}
                            placeholder="e.g. Dr. Vivek M, Rajesh E, et al."
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">DOI / Permanent URL</label>
                          <input
                            type="text"
                            value={newPub.doi || ""}
                            onChange={(e) => setNewPub({ ...newPub, doi: e.target.value })}
                            placeholder="e.g. 10.1109/TCC.2024.123456"
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Indexing Standard</label>
                          <input
                            type="text"
                            value={newPub.indexedIn || ""}
                            onChange={(e) => setNewPub({ ...newPub, indexedIn: e.target.value })}
                            placeholder="e.g. Scopus Q1, SCI, Web of Science"
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Citation Count</label>
                          <input
                            type="number"
                            value={newPub.citations || 0}
                            onChange={(e) => setNewPub({ ...newPub, citations: Number(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#EAEFF5]">
                      <button
                        type="button"
                        onClick={() => setShowPubModal(false)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-saas-primary text-xs px-5 py-2 font-bold cursor-pointer"
                      >
                        Save Publication
                      </button>
                    </div>
                  </form>
                )}

                {/* Publications List */}
                <div className="space-y-3">
                  {publications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94A3B8] border border-dashed border-[#CBD5E1] rounded-2xl">
                      No research publications recorded yet. Click "Add Publication" to list your published work.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {publications.map((pub) => (
                        <div
                          key={pub.id}
                          className="p-4 rounded-2xl bg-white border border-[#EAEFF5] shadow-2xs hover:border-[#CBD5E1] flex items-start justify-between gap-4 group transition-all"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                {pub.year}
                              </span>
                              {pub.indexedIn && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {pub.indexedIn}
                                </span>
                              )}
                              {pub.citations !== undefined && pub.citations > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                  {pub.citations} Citations
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-bold text-[#0F172A] leading-snug">
                              {pub.title}
                            </h4>

                            <p className="text-[11px] text-[#475569] font-medium">
                              {pub.journal}
                            </p>

                            <p className="text-[11px] text-[#64748B]">
                              Authors: {pub.authors}
                            </p>

                            {pub.doi && (
                              <p className="text-[10px] text-slate-900 dark:text-slate-100 font-mono">
                                DOI: {pub.doi}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePublication(pub.id)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer shrink-0"
                            title="Remove Publication"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: FUNDED RESEARCH GRANTS & SPONSORED PROJECTS */}
            {activeTab === "grants" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEFF5] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                      <h3 className="text-base font-bold text-[#0F172A]">Funded Research Grants &amp; Sponsored Projects</h3>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Government agencies (DST, SERB, AICTE, ISRO) and sponsored industrial R&amp;D grant portfolios.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGrantModal(true)}
                    className="btn-saas-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Research Grant</span>
                  </button>
                </div>

                {/* Add Grant Modal */}
                {showGrantModal && (
                  <form onSubmit={handleAddGrant} className="p-5 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF5] space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-[#EAEFF5] pb-2">
                      <span className="text-xs font-bold text-[#0F172A]">Add New Funded Grant / Project</span>
                      <button onClick={() => setShowGrantModal(false)} type="button" className="text-[#94A3B8] hover:text-[#0F172A]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-[#334155]">Project / Grant Title *</label>
                        <input
                          type="text"
                          required
                          value={newGrant.title}
                          onChange={(e) => setNewGrant({ ...newGrant, title: e.target.value })}
                          placeholder="e.g. Scalable AI-Driven Resource Provisioning in Heterogeneous Clouds"
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Sponsoring Agency *</label>
                          <input
                            type="text"
                            required
                            value={newGrant.agency}
                            onChange={(e) => setNewGrant({ ...newGrant, agency: e.target.value })}
                            placeholder="e.g. DST-SERB, Govt. of India / AICTE"
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Sanctioned Grant Amount *</label>
                          <input
                            type="text"
                            required
                            value={newGrant.amount}
                            onChange={(e) => setNewGrant({ ...newGrant, amount: e.target.value })}
                            placeholder="e.g. ₹28,50,000"
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Investigator Role *</label>
                          <select
                            value={newGrant.role}
                            onChange={(e) => setNewGrant({ ...newGrant, role: e.target.value })}
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          >
                            <option value="Principal Investigator (PI)">Principal Investigator (PI)</option>
                            <option value="Co-Principal Investigator (Co-PI)">Co-Principal Investigator (Co-PI)</option>
                            <option value="Lead Academic Consultant">Lead Academic Consultant</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Duration &amp; Timeline</label>
                          <input
                            type="text"
                            value={newGrant.duration}
                            onChange={(e) => setNewGrant({ ...newGrant, duration: e.target.value })}
                            placeholder="e.g. 2023 – 2026"
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#334155]">Project Status</label>
                          <select
                            value={newGrant.status}
                            onChange={(e) => setNewGrant({ ...newGrant, status: e.target.value as any })}
                            className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          >
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#EAEFF5]">
                      <button
                        type="button"
                        onClick={() => setShowGrantModal(false)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-saas-primary text-xs px-5 py-2 font-bold cursor-pointer"
                      >
                        Save Grant Record
                      </button>
                    </div>
                  </form>
                )}

                {/* Grants List */}
                <div className="space-y-3">
                  {grants.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94A3B8] border border-dashed border-[#CBD5E1] rounded-2xl">
                      No research grants recorded yet. Click "Add Research Grant" to register your sponsored projects.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {grants.map((grant) => (
                        <div
                          key={grant.id}
                          className="p-5 rounded-2xl bg-white border border-[#EAEFF5] shadow-2xs hover:border-[#CBD5E1] flex items-start justify-between gap-4 group transition-all"
                        >
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                                {grant.amount}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  grant.status === "Ongoing"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {grant.status}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                {grant.role}
                              </span>
                              <span className="text-[11px] font-mono text-[#64748B]">
                                {grant.duration}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-[#0F172A] leading-snug">
                              {grant.title}
                            </h4>

                            <p className="text-[11px] text-[#475569] font-medium flex items-center gap-1.5">
                              <span>Sponsoring Agency:</span>
                              <strong className="text-[#0F172A]">{grant.agency}</strong>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveGrant(grant.id)}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer shrink-0"
                            title="Remove Grant"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TEACHING PORTFOLIO & COURSES HANDLED */}
            {activeTab === "teaching" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-6">
                <div className="border-b border-[#EAEFF5] pb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                    <h3 className="text-base font-bold text-[#0F172A]">Teaching Portfolio &amp; Curriculum Deliveries</h3>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Official courses, student cohorts, lecture delivery schedules, and academic credits mapped to your faculty profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses
                    .filter((c) => {
                      const userFullName = `${profile.firstName} ${profile.lastName}`.toLowerCase().trim();
                      const instLower = (c.instructor || "").toLowerCase();
                      const deptLower = (profile.department || "").toLowerCase();
                      const cDeptLower = (c.department || "").toLowerCase();
                      return instLower.includes(userFullName) || (userFullName && instLower.includes(profile.lastName.toLowerCase())) || (deptLower && cDeptLower.includes(deptLower));
                    })
                    .slice(0, 6)
                    .map((course) => (
                      <div
                        key={course.id || course.code}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-slate-400 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                            {course.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {course.credits} Credits &bull; {course.type}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {course.name}
                        </h4>

                        <div className="text-[11px] text-slate-600 space-y-1">
                          <p>Department: <span className="font-semibold text-slate-800">{course.department}</span></p>
                          <p>Classes Assigned: <span className="font-semibold text-purple-700">
                            {course.assignedClasses && course.assignedClasses.length > 0 
                              ? course.assignedClasses.join(", ") 
                              : "CSE - Semester 1 (Sec A)"}
                          </span></p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: FACULTY ACADEMIC DOSSIER / CURRICULUM VITAE (CV) */}
            {activeTab === "cv" && (
              <div className="space-y-6">
                {/* Control Action Bar */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#EAEFF5] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A]">Faculty Academic Dossier &amp; Curriculum Vitae</h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        Academic Standard
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      Official university-standard faculty CV format featuring scholarly publications, funded research grants, degrees, and academic services.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const pubsStr = publications.map((p, idx) => `[${idx + 1}] ${p.authors} (${p.year}). "${p.title}." ${p.journal}.${p.doi ? ` DOI: ${p.doi}` : ""}`).join("\n\n");
                        const grantsStr = grants.map((g) => `• ${g.title} | ${g.agency} | Sanctioned: ${g.amount} | Role: ${g.role} (${g.duration})`).join("\n");
                        const cvText = `
FACULTY CURRICULUM VITAE
Dr. ${profile.firstName} ${profile.lastName}
${profile.designation || "Associate Professor"}
Department of ${profile.department || "Computer Science & Engineering"}
SmartEdu Institute of Technology

CONTACT & ACADEMIC IDS:
Email: ${profile.email}${profile.phone ? ` • Phone: ${profile.phone}` : ""}
Cabin Office: ${profile.officeNumber || "Room 304, Academic Block"}
Consultation Hours: ${profile.officeHours || "Mon & Wed 2:00 PM – 4:00 PM"}
${profile.linkedinUrl ? `LinkedIn: ${profile.linkedinUrl} • ` : ""}${profile.websiteUrl ? `Website: ${profile.websiteUrl}` : ""}

=======================================================
ACADEMIC QUALIFICATIONS
=======================================================
• ${profile.qualifications || "Ph.D. in Computer Science & Engineering (IIT Bombay, 2016)"}
• Research Specialization: ${profile.specialization || "Distributed Cloud Systems, High Performance Computing"}

=======================================================
PEER-REVIEWED RESEARCH PUBLICATIONS (${publications.length})
=======================================================
${pubsStr}

=======================================================
FUNDED RESEARCH GRANTS & SPONSORED PROJECTS (${grants.length})
=======================================================
${grantsStr}
                        `.trim();
                        navigator.clipboard.writeText(cvText);
                        setCopyCvToast(true);
                        setTimeout(() => setCopyCvToast(false), 3000);
                      }}
                      className="btn-saas-outline text-xs px-4 py-2 font-bold flex items-center gap-1.5"
                    >
                      {copyCvToast ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-600">Copied CV</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 text-[#64748B]" />
                          <span>Copy Plaintext CV</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn-saas-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print / Save PDF (Faculty CV)</span>
                    </button>
                  </div>
                </div>

                {/* Printable Academic Faculty Dossier CV Sheet */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#EAEFF5] dark:border-slate-800 shadow-md p-8 sm:p-12 max-w-4xl mx-auto space-y-6 text-[#1E2438] dark:text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
                  {/* Institutional Header */}
                  <div className="text-center border-b-2 border-[#1E2438] pb-4 space-y-1.5">
                    <span className="text-[11px] font-bold tracking-widest text-slate-900 dark:text-slate-100 uppercase block">
                      SmartEdu Institute of Technology &bull; Faculty Dossier
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] uppercase">
                      Prof. {profile.firstName} {profile.lastName}
                    </h1>
                    <p className="text-xs font-bold text-[#334155]">
                      {profile.designation || "Professor & Academic Researcher"} &bull; Department of {profile.department || "Computer Science & Engineering"}
                    </p>
                    <div className="text-xs font-semibold text-[#475569] flex items-center justify-center flex-wrap gap-x-3 gap-y-1">
                      <span>{profile.email}</span>
                      {profile.phone && (
                        <>
                          <span>•</span>
                          <span>{profile.phone}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Cabin: {profile.officeNumber || "Cabin 304, Academic Block"}</span>
                      <span>•</span>
                      <span>Hours: {profile.officeHours || "Mon & Wed 2:00 PM – 4:00 PM"}</span>
                    </div>
                  </div>

                  {/* 1. Academic Qualifications Section */}
                  <div className="space-y-2">
                    <div className="border-b border-[#CBD5E1] pb-1 flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Academic Qualifications &amp; Credentials
                      </h2>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <div className="font-bold text-[#0F172A]">
                        {profile.qualifications || "Ph.D. in Computer Science & Engineering (IIT Bombay, 2016)"}
                      </div>
                      <p className="text-[#475569]">
                        <strong>Research Specialization:</strong> {profile.specialization || "Distributed Cloud Architecture, High Performance Computing, Edge Networks"}
                      </p>
                    </div>
                  </div>

                  {/* 2. Research Focus & Statement */}
                  <div className="space-y-2">
                    <div className="border-b border-[#CBD5E1] pb-1">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Research Focus &amp; Scholarly Statement
                      </h2>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed">
                      {profile.bio || "Dedicated faculty researcher investigating advanced distributed systems, fault-tolerant cluster architectures, and latency-sensitive scheduling mechanisms. Leading sponsored research initiatives and mentoring graduate scholars."}
                    </p>
                  </div>

                  {/* 3. Peer-Reviewed Publications */}
                  <div className="space-y-3">
                    <div className="border-b border-[#CBD5E1] pb-1 flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Peer-Reviewed Publications &amp; Articles ({publications.length})
                      </h2>
                      <span className="text-[11px] font-mono text-[#64748B]">Scopus / SCI Indexed</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {publications.map((pub, idx) => (
                        <div key={pub.id} className="space-y-0.5">
                          <div className="font-bold text-[#0F172A]">
                            [{idx + 1}] {pub.authors} ({pub.year}). &quot;{pub.title}.&quot;
                          </div>
                          <p className="text-[#475569] italic">
                            {pub.journal} {pub.doi ? `• DOI: ${pub.doi}` : ""}
                            {pub.citations ? ` • ${pub.citations} Citations` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Funded Research Grants */}
                  <div className="space-y-3">
                    <div className="border-b border-[#CBD5E1] pb-1 flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Sponsored Research Grants &amp; Projects ({grants.length})
                      </h2>
                      <span className="text-[11px] font-mono text-[#64748B]">Sanctioned Funding</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {grants.map((grant) => (
                        <div key={grant.id} className="space-y-0.5">
                          <div className="flex items-center justify-between font-bold text-[#0F172A]">
                            <span>{grant.title}</span>
                            <span className="font-mono text-slate-900 dark:text-slate-100">{grant.amount}</span>
                          </div>
                          <p className="text-[#475569]">
                            {grant.agency} &bull; Role: <strong>{grant.role}</strong> &bull; Timeline: {grant.duration} ({grant.status})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. Teaching Portfolio */}
                  <div className="space-y-2">
                    <div className="border-b border-[#CBD5E1] pb-1">
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                        Teaching Portfolio &amp; Academic Instruction
                      </h2>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-bold text-[#0F172A]">
                        Department of {profile.department || "Alliance School of Advanced Computing"}
                      </p>
                      <p className="text-[#475569]">
                        Core Curriculum: Computer Networks (E1CSA 212), Data Structures &amp; Algorithms Lab (E1CSA 304), Advanced AI &amp; Distributed Systems.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SECURITY & NOTIFICATIONS */}
            {activeTab === "security" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Two-Factor Authentication Card with Microsoft Authenticator */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Two-Factor Authentication (2FA)</h3>
                          {is2faEnabled ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                              ✓ Protected (Microsoft Authenticator)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                              Inactive (Recommended)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B] dark:text-slate-400">
                          Secure your university portal login with Microsoft Authenticator or Google Authenticator (RFC 6238 TOTP).
                        </p>
                      </div>
                    </div>

                    {!is2faEnabled && !isSettingUp2fa && (
                      <button
                        type="button"
                        onClick={handleStart2faSetup}
                        className="btn-saas-primary text-xs px-4 py-2 font-bold flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Enable Microsoft Authenticator</span>
                      </button>
                    )}

                    {is2faEnabled && (
                      <button
                        type="button"
                        onClick={handleDisable2fa}
                        className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Disable 2FA
                      </button>
                    )}
                  </div>

                  {totpSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{totpSuccess}</span>
                      </div>
                      <button onClick={() => setTotpSuccess(null)} className="text-emerald-600 hover:text-emerald-800">×</button>
                    </div>
                  )}

                  {totpError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{totpError}</span>
                      </div>
                      <button onClick={() => setTotpError(null)} className="text-rose-600 hover:text-rose-800">×</button>
                    </div>
                  )}

                  {isSettingUp2fa && (
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                        {/* Step 1: QR Code */}
                        <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getTotpQrCodeUrl(getOtpauthUri({ accountName: user?.email || "student@smartedu.com", secret: totpSecret }))}
                            alt="Scan with Microsoft Authenticator"
                            className="w-44 h-44 rounded-xl"
                          />
                          <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                            Scan via Microsoft Authenticator
                          </p>
                        </div>

                        {/* Step 2: Instructions & Secret Key */}
                        <div className="space-y-3 md:col-span-2">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                              Step 1: Scan QR or enter Secret Key
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              Open the <strong>Microsoft Authenticator</strong> app on your mobile phone, tap <strong>Add Account (+) &gt; Work or School or Other</strong>, and scan the QR code.
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Manual Secret Key (if camera unavailable)
                            </span>
                            <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400 tracking-widest select-all">
                              {totpSecret.match(/.{1,4}/g)?.join(" ") || totpSecret}
                            </span>
                          </div>

                          {/* Step 3: Verify Token */}
                          <form onSubmit={handleVerifyAndEnable2fa} className="space-y-3 pt-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              Step 2: Enter the 6-digit verification code from your app
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                required
                                maxLength={6}
                                value={totpInputCode}
                                onChange={(e) => setTotpInputCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="123456"
                                className="h-11 w-44 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-lg font-bold text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-900"
                              />
                              <button
                                type="submit"
                                className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                                <span>Verify &amp; Activate 2FA</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsSettingUp2fa(false)}
                                className="h-11 px-3 rounded-xl text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change Password Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">Change Password</h3>
                    <p className="text-xs text-[#64748B]">Ensure your account uses a strong, secure password</p>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Password changed successfully!</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-[#334155]">Current Password</label>
                      <input
                        type="password"
                        required
                        value={passwordState.currentPassword}
                        onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#334155]">New Password</label>
                      <input
                        type="password"
                        required
                        value={passwordState.newPassword}
                        onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#334155]">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={passwordState.confirmPassword}
                        onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-[#F8FAFD]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-saas-primary text-xs px-5 py-2.5 font-bold flex items-center gap-2 cursor-pointer mt-2"
                    >
                      <Key className="h-4 w-4" />
                      <span>Update Password</span>
                    </button>
                  </form>
                </div>

                {/* Notification Preferences Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#EAEFF5] dark:border-slate-800 shadow-xs space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">Notification Alerts</h3>
                    <p className="text-xs text-[#64748B]">Choose which academic updates you receive</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF5]">
                      <div>
                        <p className="font-bold text-[#0F172A]">Assignment &amp; Lab Grades</p>
                        <p className="text-[11px] text-[#64748B]">Receive notifications when marks are published</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.notifications.grades}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            notifications: { ...profile.notifications, grades: e.target.checked },
                          })
                        }
                        className="h-4 w-4 text-slate-900 dark:text-slate-100 rounded accent-slate-900 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF5]">
                      <div>
                        <p className="font-bold text-[#0F172A]">Campus Announcements</p>
                        <p className="text-[11px] text-[#64748B]">Important exam notices and holiday schedules</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.notifications.announcements}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            notifications: { ...profile.notifications, announcements: e.target.checked },
                          })
                        }
                        className="h-4 w-4 text-slate-900 dark:text-slate-100 rounded accent-slate-900 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF5]">
                      <div>
                        <p className="font-bold text-[#0F172A]">Course Discussions</p>
                        <p className="text-[11px] text-[#64748B]">Replies to your doubts and question threads</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.notifications.discussions}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            notifications: { ...profile.notifications, discussions: e.target.checked },
                          })
                        }
                        className="h-4 w-4 text-slate-900 dark:text-slate-100 rounded accent-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveProfile}
                      className="btn-saas-primary text-xs px-5 py-2.5 font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
    </div>
  );
}
