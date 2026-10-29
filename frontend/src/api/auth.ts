import api from "./client";

export async function requestPasswordReset(identifier: string): Promise<void> {
  await api.post("/auth/request-password-reset", { identifier });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/auth/reset-password", {
    token,
    new_password: newPassword,
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}
