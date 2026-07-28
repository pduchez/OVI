"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  findUserByUsername,
  verifyPassword,
  signSession,
} from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";

export async function loginAction(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) {
    return { error: "Ingresa usuario y contraseña." };
  }
  try {
    await ensureBootstrap();
  } catch {
    return {
      error:
        "No hay base de datos conectada. Configura DATABASE_URL (ver README).",
    };
  }
  const user = await findUserByUsername(username);
  if (!user || !user.activo || !verifyPassword(password, user.passwordHash)) {
    return { error: "Usuario o contraseña incorrectos." };
  }
  cookies().set(AUTH_COOKIE, signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/");
}

export async function logoutAction() {
  cookies().delete(AUTH_COOKIE);
  redirect("/login");
}
