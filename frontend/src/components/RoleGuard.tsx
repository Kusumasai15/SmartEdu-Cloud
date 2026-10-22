"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Administrator, Vice Chancellor, and Department Head (HOD) have platform/department supervisory access
  const userRole = (user?.role?.name || (user as any)?.role || "").toUpperCase();
  const isAuthorized =
    Boolean(user) &&
    (userRole === "ADMINISTRATOR" ||
      userRole === "VC" ||
      allowedRoles.includes(userRole as UserRole) ||
      (userRole === "HOD" && (allowedRoles.includes("FACULTY") || allowedRoles.includes("HOD"))));

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!isAuthorized) {
        router.push("/unauthorized");
      }
    }
  }, [user, isLoading, isAuthorized, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
