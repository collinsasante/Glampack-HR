import type { SignUpInput } from "@glampack/shared";
import { apiPost } from "../apiClient";
import type { Employee } from "./employees";

export const signUp = (data: SignUpInput) => apiPost<Employee>("/auth/signup", data);
