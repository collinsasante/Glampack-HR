import { signInWithPopup } from "firebase/auth";
import { firebaseAuth, googleAuthProvider } from "./firebase";
import { getMe, type Employee } from "./api/employees";
import { signUp } from "./api/auth";
import { ApiError } from "./apiClient";

// Google accounts are always email_verified in Firebase, so a popup sign-in can go
// straight to the API — no separate verification step like the password sign-up flow.
export async function continueWithGoogle(): Promise<Employee> {
  const credential = await signInWithPopup(firebaseAuth, googleAuthProvider);
  const user = credential.user;

  try {
    return await getMe();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // First time this Google account has signed in — auto-provision the Employee
      // record, matching the old app's "create at signup" behavior. Department/job
      // title can be filled in later from the Profile page.
      return await signUp({ fullName: user.displayName || user.email!.split("@")[0] });
    }
    throw err;
  }
}
