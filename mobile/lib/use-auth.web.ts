import { useAuth0 as useWebAuth0 } from "@auth0/auth0-react";

export function useAuth0() {
  const { user, isLoading, loginWithRedirect, getAccessTokenSilently, logout } =
    useWebAuth0();

  return {
    user: user ?? null,
    isLoading,
    authorize: () => loginWithRedirect(),
    getCredentials: async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        return { accessToken };
      } catch {
        return null;
      }
    },
    clearSession: () =>
      logout({ logoutParams: { returnTo: window.location.origin } }),
  };
}
