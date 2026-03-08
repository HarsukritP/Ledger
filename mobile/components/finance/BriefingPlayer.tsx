import { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useTheme } from "../../lib/theme";

interface BriefingPlayerProps {
  audioUrl?: string;
  previewText: string;
  duration?: string;
}

export function BriefingPlayer({
  audioUrl,
  previewText,
  duration = "0:42",
}: BriefingPlayerProps) {
  const { colors } = useTheme();
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!audioUrl) return;

    if (playing) {
      await soundRef.current?.pauseAsync();
      setPlaying(false);
      return;
    }

    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
        }
      });
    } else {
      await soundRef.current.playAsync();
    }
    setPlaying(true);
  }, [audioUrl, playing]);

  return (
    <View
      style={{
        overflow: "hidden",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 20,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 3,
      }}
    >
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.gold, opacity: 0.05 }}
      />
      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={toggle}
          style={{
            height: 48, width: 48,
            alignItems: "center", justifyContent: "center",
            borderRadius: 24, backgroundColor: colors.gold,
          }}
        >
          <Feather name={playing ? "pause" : "play"} size={20} color="#000" />
        </Pressable>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <Feather name="volume-2" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textMuted }}>Weekly Briefing</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{duration}</Text>
          </View>
          <Text style={{ marginTop: 4, fontSize: 14, color: colors.textSecondary }} numberOfLines={2}>
            {previewText}
          </Text>
        </View>
      </View>
      {playing && (
        <View className="mt-3 flex-row items-end gap-0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <View
              key={i}
              style={{ width: 4, borderRadius: 2, backgroundColor: colors.gold + "66", height: 4 + ((i * 7) % 16) }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
