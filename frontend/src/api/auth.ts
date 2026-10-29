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
