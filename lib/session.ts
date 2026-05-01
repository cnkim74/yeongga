import type { SessionOptions } from "iron-session";

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "member";
};

export type SessionData = {
  user?: SessionUser;
};

const FALLBACK_SECRET =
  "YEONGGA_DEV_SECRET_CHANGE_ME_____________32chars_minimum";

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? FALLBACK_SECRET,
  cookieName: "yeongga_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30일
  },
};
