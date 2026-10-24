import { useUser } from "@clerk/react";

export function useDisplayName() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const stored = userId ? localStorage.getItem(`sushruth_display_name_${userId}`) : null;
  const storedParsed = stored ? JSON.parse(stored) as { firstName: string; lastName: string } : null;

  const firstName = user?.firstName || storedParsed?.firstName || "";
  const lastName = user?.lastName || storedParsed?.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  return { firstName, lastName, fullName };
}

export function saveDisplayName(userId: string, firstName: string, lastName: string) {
  localStorage.setItem(
    `sushruth_display_name_${userId}`,
    JSON.stringify({ firstName, lastName }),
  );
}
