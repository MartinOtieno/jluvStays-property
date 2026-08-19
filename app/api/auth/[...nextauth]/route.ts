import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

interface Permissions {
  bookings: boolean;
  viewings: boolean;
  rooms: boolean;
  users: boolean;
  staff: boolean;
  reports: boolean;
}

interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  photo: string;
  permissions: Permissions;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("MISSING_CREDENTIALS");
        }

        try {
          await connectDB();
        } catch {
          throw new Error("DB_CONNECTION_FAILED");
        }

        const user = await User.findOne({
          email: credentials.email,
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("INVALID_PASSWORD");
        }

        // ─────────────────────────────────────────────
        // ADMIN GETS ALL PERMISSIONS
        // ─────────────────────────────────────────────

        const permissions: Permissions =
          user.role === "admin"
            ? {
                bookings: true,
                viewings: true,
                rooms: true,
                users: true,
                staff: true,
                reports: true,
              }
            : {
                bookings: user.permissions?.bookings ?? false,
                viewings: user.permissions?.viewings ?? false,
                rooms: user.permissions?.rooms ?? false,
                users: user.permissions?.users ?? false,
                staff: user.permissions?.staff ?? false,
                reports: user.permissions?.reports ?? false,
              };

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          photo: user.photo ?? "",
          permissions,
        };
      },
    }),
  ],

  callbacks: {
    // ─────────────────────────────────────────────
    // JWT
    // ─────────────────────────────────────────────

    async jwt({ token, user }) {
      if (user) {
        const extendedUser = user as ExtendedUser;

        token.id = extendedUser.id;
        token.role = extendedUser.role;
        token.photo = extendedUser.photo;
        token.permissions = extendedUser.permissions;
      }

      return token;
    },

    // ─────────────────────────────────────────────
    // SESSION
    // ─────────────────────────────────────────────

    async session({ session, token }) {
      if (session.user) {
        const extendedSessionUser = session.user as ExtendedUser;

        extendedSessionUser.id = token.id as string;
        extendedSessionUser.role = token.role as string;
        extendedSessionUser.photo = token.photo as string;

        extendedSessionUser.permissions =
          (token.permissions as Permissions) ?? {
            bookings: false,
            viewings: false,
            rooms: false,
            users: false,
            staff: false,
            reports: false,
          };
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };