import { DefaultSession } from "next-auth";

interface StaffPermissions {
  bookings: boolean;
  viewings: boolean;
  rooms: boolean;
  users: boolean;
  staff: boolean;
  reports: boolean;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      photo: string;
      permissions: StaffPermissions;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    photo: string;
    permissions: StaffPermissions;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    photo: string;
    permissions: StaffPermissions;
  }
}