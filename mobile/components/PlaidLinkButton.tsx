import { View, Text } from "react-native";

export function PlaidLinkButton(_props: {
  token: string;
  onSuccess: (publicToken: string) => void;
  onExit: () => void;
}) {
  return (
    <View style={{ paddingVertical: 16 }}>
      <Text style={{ color: "#71717A", textAlign: "center", fontSize: 13, lineHeight: 20 }}>
        Bank linking is available in the native app build.
      </Text>
    </View>
  );
}
