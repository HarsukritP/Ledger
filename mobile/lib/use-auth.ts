import { useContext } from "react";
import { AuthContext } from "./auth-provider";

export function useAuth0() {
  return useContext(AuthContext);
}
