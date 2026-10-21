// Entry point for the Better Auth CLI (npm run auth:generate), which expects an exported `auth`.
import { getAuth } from "./auth";

export const auth = getAuth();
