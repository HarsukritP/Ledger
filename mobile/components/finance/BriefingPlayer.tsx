import { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";

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
    <View className="overflow-hidden rounded-2xl border border-border bg-surface p-5">
      <View
        className="absolute inset-0 opacity-5"
        style={{ backgroundColor: "#D4A853" }}
      />
      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={toggle}
          className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold"
        >
          <Feather
            name={playing ? "pause" : "play"}
            size={20}
            color="#000"
          />
        </Pressable>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <Feather name="volume-2" size={14} color="#71717A" />
            <Text className="text-xs font-medium text-text-muted">
              Weekly Briefing
            </Text>
            <Text className="text-xs text-text-muted">{duration}</Text>
          </View>
          <Text
            className="mt-1 text-sm text-text-secondary"
            numberOfLines={2}
          >
            {previewText}
          </Text>
        </View>
      </View>
      {playing && (
        <View className="mt-3 flex-row items-end gap-0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <View
              key={i}
              className="w-1 rounded-full bg-gold/40"
              style={{ height: 4 + ((i * 7) % 16) }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
