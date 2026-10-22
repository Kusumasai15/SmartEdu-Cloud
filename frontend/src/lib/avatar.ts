// Production-ready University Profile Avatar System
// If a user has not uploaded any photo, defaults to standard clean university silhouette profile photo.

export const DEFAULT_USER_AVATAR = "/default-avatar.jpg";
export const DEFAULT_USER_AVATAR_REMOTE =
  "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg";

// No external placeholder photos - all fresh accounts use official university default avatar
const STUDENT_PHOTOS: Record<string, string> = {};

export function getUserAvatarUrl(user: any): string {
  if (!user) {
    return DEFAULT_USER_AVATAR;
  }

  // 1. Custom uploaded or stored avatar in object or localStorage
  if (user?.avatar_url && typeof user.avatar_url === "string" && user.avatar_url.trim().length > 0) {
    return user.avatar_url;
  }
  if (user?.avatar && typeof user.avatar === "string" && user.avatar.trim().length > 0) {
    return user.avatar;
  }
  if (typeof window !== "undefined") {
    if (user?.id) {
      const userSpecific = localStorage.getItem(`smartedu_avatar_${user.id}`);
      if (userSpecific && userSpecific.trim().length > 0) {
        return userSpecific;
      }
    }
    const emailKey = (user.email || "").toLowerCase().trim();
    if (emailKey) {
      const emailSpecific = localStorage.getItem(`smartedu_avatar_${emailKey}`);
      if (emailSpecific && emailSpecific.trim().length > 0) {
        return emailSpecific;
      }
    }
  }

  // 2. User did not upload any photo -> Use official clean default silhouette avatar
  return DEFAULT_USER_AVATAR;
}
