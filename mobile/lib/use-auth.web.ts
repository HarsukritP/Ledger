import { useAuth0 as useWebAuth0 } from "@auth0/auth0-react";

const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const audience = `https://${domain}/api/v2/`;

export function useAuth0() {
  const { user, isLoading, loginWithPopup, getAccessTokenSilently, logout } =
    useWebAuth0();

  return {
    user: user ?? null,
    isLoading,
    authorize: () => {
      // Open the popup window synchronously, directly from the user-gesture
      // call stack. iOS Safari blocks window.open() called asynchronously, so
      // we pre-open it here and hand it to loginWithPopup — this way the main
      // page never navigates away and Safari's browser chrome never reappears.
      const popup =
        typeof window !== "undefined"
          ? window.open(
              "",
              "auth0:authorize:popup",
              "left=100,top=100,width=400,height=600,resizable,scrollbars=yes,status=1"
            )
          : undefined;
      return loginWithPopup({}, { popup: popup ?? undefined });
    },
    getCredentials: async () => {
      try {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: { audience },
        });
        return { accessToken };
      } catch (e) {
        console.error("[AUTH] getAccessTokenSilently failed:", e);
        return null;
      }
    },
    clearSession: () =>
      logout({ logoutParams: { returnTo: window.location.origin } }),
  };
}
