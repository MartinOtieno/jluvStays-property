import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

interface ExtendedUser {
  id:    string;
  name:  string;
  email: string;
  role:  string;
  photo: string; // ← added
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
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

        const user = await User.findOne({ email: credentials.email });

        if (!user) throw new Error("USER_NOT_FOUND");

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) throw new Error("INVALID_PASSWORD");

        // ← photo included in returned object
        return {
          id:    user._id.toString(),
          name:  user.name,
          email: user.email,
          role:  user.role,
          photo: user.photo ?? "",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id    = (user as ExtendedUser).id;
        token.role  = (user as ExtendedUser).role;
        token.photo = (user as ExtendedUser).photo; // ← added
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as ExtendedUser).id    = token.id    as string;
        (session.user as ExtendedUser).role  = token.role  as string;
        (session.user as ExtendedUser).photo = token.photo as string; // ← added
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