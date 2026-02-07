import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Block } from "@workout-builder/core";

type InspectorPatch = Partial<Block>;

export function parseClock(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length === 1) {
    const seconds = Number(parts[0]);
    if (Number.isNaN(seconds)) return null;
    return Math.max(1, Math.round(seconds));
  }
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
    return Math.max(1, Math.round(minutes * 60 + seconds));
  }
  return null;
}

export function formatClock(secondsInput: number): string {
  const seconds = Math.max(1, Math.round(secondsInput));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function numOrNull(value: string): number | null {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function Inspector({ block, onChange, onDelete }: { block: Block; onChange: (patch: InspectorPatch) => void; onDelete: () => void }) {
  const [label, setLabel] = useState(block.label ?? "");
  const [duration, setDuration] = useState(formatClock(block.duration));
  const [value, setValue] = useState(String(block.target?.value ?? ""));
  const [start, setStart] = useState(String(block.target?.start ?? ""));
  const [end, setEnd] = useState(String(block.target?.end ?? ""));
  const [rpm, setRpm] = useState(String(block.meta?.rpm ?? ""));
  const [repeat, setRepeat] = useState(String(block.meta?.repeat ?? ""));

  useEffect(() => {
    setLabel(block.label ?? "");
    setDuration(formatClock(block.duration));
    setValue(String(block.target?.value ?? ""));
    setStart(String(block.target?.start ?? ""));
    setEnd(String(block.target?.end ?? ""));
    setRpm(String(block.meta?.rpm ?? ""));
    setRepeat(String(block.meta?.repeat ?? ""));
  }, [block]);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>INSPECTOR</Text>

      <Text style={styles.label}>Label</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        onEndEditing={() => onChange({ label: label.trim() || block.label || block.type })}
      />

      <Text style={styles.label}>Duration (mm:ss)</Text>
      <TextInput
        style={styles.input}
        value={duration}
        onChangeText={setDuration}
        onEndEditing={() => {
          const parsed = parseClock(duration);
          if (parsed !== null) {
            onChange({ duration: Math.max(1, parsed) });
            setDuration(formatClock(parsed));
          } else {
            setDuration(formatClock(block.duration));
          }
        }}
      />

      {block.type === "interval_steady" || block.type === "cadence" ? (
        <>
          <Text style={styles.label}>Intensity (%)</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            onEndEditing={() => {
              const parsed = numOrNull(value);
              if (parsed !== null) {
                onChange({ target: { metric: block.target?.metric ?? "none", ...block.target, value: clamp(parsed, 1, 200) } });
              } else {
                setValue(String(block.target?.value ?? ""));
              }
            }}
          />
        </>
      ) : null}

      {block.type === "warmup" || block.type === "cooldown" || block.type === "interval_ramp" ? (
        <>
          <Text style={styles.label}>Start (%)</Text>
          <TextInput
            style={styles.input}
            value={start}
            onChangeText={setStart}
            onEndEditing={() => {
              const parsed = numOrNull(start);
              if (parsed !== null) {
                onChange({ target: { metric: block.target?.metric ?? "none", ...block.target, start: clamp(parsed, 1, 200) } });
              } else {
                setStart(String(block.target?.start ?? ""));
              }
            }}
          />
          <Text style={styles.label}>End (%)</Text>
          <TextInput
            style={styles.input}
            value={end}
            onChangeText={setEnd}
            onEndEditing={() => {
              const parsed = numOrNull(end);
              if (parsed !== null) {
                onChange({ target: { metric: block.target?.metric ?? "none", ...block.target, end: clamp(parsed, 1, 200) } });
              } else {
                setEnd(String(block.target?.end ?? ""));
              }
            }}
          />
        </>
      ) : null}

      {block.type === "cadence" ? (
        <>
          <Text style={styles.label}>Cadence RPM</Text>
          <TextInput
            style={styles.input}
            value={rpm}
            onChangeText={setRpm}
            onEndEditing={() => {
              const parsed = numOrNull(rpm);
              if (parsed !== null) {
                onChange({ meta: { ...block.meta, rpm: Math.max(1, Math.round(parsed)) } });
              } else {
                setRpm(String(block.meta?.rpm ?? ""));
              }
            }}
          />
        </>
      ) : null}

      {block.type === "repeat" ? (
        <>
          <Text style={styles.label}>Repeat Count</Text>
          <TextInput
            style={styles.input}
            value={repeat}
            onChangeText={setRepeat}
            onEndEditing={() => {
              const parsed = numOrNull(repeat);
              if (parsed !== null) {
                onChange({ meta: { ...block.meta, repeat: Math.max(1, Math.round(parsed)) } });
              } else {
                setRepeat(String(block.meta?.repeat ?? ""));
              }
            }}
          />
        </>
      ) : null}

      <Pressable style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteText}>Delete Block</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#b2b7be",
    borderRadius: 10,
    backgroundColor: "#f6f7f8",
    padding: 10
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#10131a"
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    color: "#1b2430",
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#b6bcc4",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: "#b22a24",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  deleteText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800"
  }
});
