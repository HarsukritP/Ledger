import { useAuth0 as useWebAuth0 } from "@auth0/auth0-react";

const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const audience = `https://${domain}/api/v2/`;

export function useAuth0() {
  const { user, isLoading, loginWithRedirect, getAccessTokenSilently, logout } =
    useWebAuth0();

  return {
    user: user ?? null,
    isLoading,
    authorize: () => loginWithRedirect(),
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
