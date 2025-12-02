import jwt from "jsonwebtoken";
import { Buffer } from "buffer"; // Ensure Buffer is imported if used explicitly

const JWT_SECRET_STRING: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_SECRET: Buffer | string = Buffer.from(JWT_SECRET_STRING); // Use Buffer for signing/verifying

export interface AuthToken {
  userId: string;
  email: string;
  role: "teacher" | "student" | "admin";
  iat: number;
  exp: number;
}

export function generateToken(userId: string, email: string, role: string, expiresIn = "24h"): string {
  console.log("[Auth] Generating token for user:", userId, role); // Debugging
  // @ts-ignore: Suppress type error for jwt.sign due to persistent overload issues
  return jwt.sign(
    {
      userId,
      email,
      role,
    },
    JWT_SECRET,
    { expiresIn },
  );
}

export function verifyToken(token: string): AuthToken | null {
  try {
    console.log("[Auth] Verifying token..."); // Debugging
    // @ts-ignore: Suppress type error for jwt.verify due to persistent overload issues
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
    console.log("[Auth] Token decoded successfully:", decoded.userId, decoded.role); // Debugging
    return decoded;
  } catch (error) {
    console.error("[Auth] Token verification failed:", error); // Debugging
    return null;
  }
}

export function getTokenFromCookies(cookies: string): string | null {
  const cookieArray = cookies.split(";")
  for (const cookie of cookieArray) {
    const [name, value] = cookie.trim().split("=")
    if (name === "auth_token") {
      return decodeURIComponent(value)
    }
  }
  return null
}
