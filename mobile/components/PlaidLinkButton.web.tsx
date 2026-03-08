import { usePlaidLink } from "react-plaid-link";
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

export function PlaidLinkButton({
  token,
  onSuccess,
  onExit,
}: {
  token: string;
  onSuccess: (publicToken: string) => void;
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (public_token) => onSuccess(public_token),
    onExit,
  });

  return (
    <TouchableOpacity
      onPress={() => open()}
      disabled={!ready}
      accessibilityRole="button"
      style={{
        width: "100%",
        borderRadius: 12,
        backgroundColor: "#D4A853",
        paddingVertical: 16,
        alignItems: "center",
        opacity: ready ? 1 : 0.5,
      }}
    >
      {!ready ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="link" size={18} color="#000" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>
            Connect Bank Account
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
