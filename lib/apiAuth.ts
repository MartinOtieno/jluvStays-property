import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

export async function requireRole(...roles: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (!roles.includes(session.user.role)) return null;
  return session;
}