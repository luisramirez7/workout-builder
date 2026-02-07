import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Svg, { Line, Text as SvgText } from "react-native-svg";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Block, HitZone, StorageAdapter, TimelineScale, WorkoutTypePlugin } from "@workout-builder/core";
import { saveAndShare } from "./fileExport";
import { useEditorStore } from "./store";

const ZONE_LABELS = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"];

type BlockItemProps = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  blockType?: string;
  fillColor?: string;
  accentColor?: string;
  selected: boolean;
  pxPerSecond: number;
  timelineHeight: number;
  timelineWidth: number;
  onSelect: () => void;
  onReorder: (dropTime: number) => void;
  onResizeDuration: (deltaSeconds: number) => void;
  onResizeIntensity: (deltaIntensity: number) => void;
  hitTestZone: (point: { x: number; y: number }) => HitZone;
  onDelete: () => void;
  variant?: "default" | "interval_container";
  interactive?: boolean;
};

type PaletteItemProps = {
  label: string;
  onAdd: () => void;
};

const AnimatedView = Animated.createAnimatedComponent(View);

function BlockItem(props: BlockItemProps) {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const activeZone = useRef<HitZone>("body");
  const interactive = props.interactive !== false;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(dragX.value) }, { translateY: withTiming(dragY.value) }]
  }));

  return (
    <PanGestureHandler
      enabled={interactive}
      onBegan={(event: any) => {
        if (!interactive) return;
        const x = props.x + (event.nativeEvent.x ?? 0);
        const y = props.y + (event.nativeEvent.y ?? 0);
        activeZone.current = props.hitTestZone({ x, y });
      }}
      onGestureEvent={(event: any) => {
        if (!interactive) return;
        dragX.value = event.nativeEvent.translationX;
        dragY.value = event.nativeEvent.translationY;
      }}
      onEnded={(event: any) => {
        if (!interactive) return;
        const nextX = props.x + event.nativeEvent.translationX;
        const nextY = props.y + event.nativeEvent.translationY;
        if (nextX > props.timelineWidth - 96 && nextY > props.timelineHeight - 56) {
          props.onDelete();
        } else {
          if (activeZone.current === "resize_right") {
            props.onResizeDuration(event.nativeEvent.translationX / props.pxPerSecond);
          } else if (activeZone.current === "resize_intensity") {
            props.onResizeIntensity(-event.nativeEvent.translationY / 2);
          } else {
            const dropTime = Math.max(0, nextX / props.pxPerSecond);
            props.onReorder(dropTime);
          }
        }
        dragX.value = 0;
        dragY.value = 0;
      }}
    >
      <AnimatedView
        style={[
          styles.block,
          props.variant === "interval_container" ? styles.intervalContainer : null,
          {
            left: props.x,
            top: props.y,
            width: Math.max(24, props.width),
            height: Math.max(30, props.height),
            backgroundColor: props.fillColor ?? "#d8dde5",
            borderColor: props.accentColor ?? "#243247"
          },
          props.selected ? styles.blockSelected : null,
          animatedStyle
        ]}
      >
        <View style={[styles.blockTopBar, { backgroundColor: props.accentColor ?? "#243247" }]} pointerEvents="none" />
        <Pressable style={styles.blockBody} onPress={interactive ? props.onSelect : undefined}>
          <Text style={styles.blockLabel}>{props.title}</Text>
        </Pressable>
        {interactive ? <View style={styles.resizeHandleRight} pointerEvents="none" /> : null}
        {interactive ? <View style={styles.resizeHandleTop} pointerEvents="none" /> : null}
      </AnimatedView>
    </PanGestureHandler>
  );
}

function PaletteItem({ label, onAdd }: PaletteItemProps) {
  const dragX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(dragX.value) }]
  }));

  return (
    <PanGestureHandler
      onGestureEvent={(event: any) => {
        dragX.value = event.nativeEvent.translationX;
      }}
      onEnded={(event: any) => {
        if (event.nativeEvent.translationX < -60) {
          onAdd();
        }
        dragX.value = 0;
      }}
    >
      <AnimatedView style={animatedStyle}>
        <Pressable style={styles.paletteButton} onPress={onAdd}>
          <Text style={styles.paletteText}>{label}</Text>
        </Pressable>
      </AnimatedView>
    </PanGestureHandler>
  );
}

function secondsToClock(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function TagChip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tagChip, active ? styles.tagChipActive : null]}>
      <Text style={[styles.tagChipText, active ? styles.tagChipTextActive : null]}>{text}</Text>
    </Pressable>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function targetPercent(block: Block): number {
  if (block.type === "interval_set") {
    return Number(block.meta?.onTarget ?? block.target?.value ?? 100);
  }
  if (block.type === "warmup" || block.type === "cooldown" || block.type === "interval_ramp") {
    return Number(block.target?.end ?? block.target?.start ?? block.target?.value ?? 50);
  }
  return Number(block.target?.value ?? block.target?.start ?? 50);
}

function zoneColors(percent: number): { fill: string; accent: string } {
  if (percent < 55) return { fill: "#8b8b90", accent: "#6d6d72" }; // Z1
  if (percent < 75) return { fill: "#3a8fcb", accent: "#2a6792" }; // Z2
  if (percent < 90) return { fill: "#41bf6a", accent: "#2f8c4e" }; // Z3
  if (percent < 105) return { fill: "#f2c600", accent: "#bc9800" }; // Z4
  if (percent < 120) return { fill: "#f5642f", accent: "#bb4a20" }; // Z5
  return { fill: "#f10606", accent: "#b00000" }; // Z6
}

function blockColors(block: Block): { fill: string; accent: string } {
  if (block.type === "free_ride") return { fill: "#8a8a8f", accent: "#6f6f74" };
  if (block.type === "text_event") return { fill: "#2f3b4e", accent: "#1f2937" };
  if (block.type === "interval_set") return { fill: "rgba(233, 167, 139, 0.35)", accent: "#2a3b55" };
  return zoneColors(targetPercent(block));
}

export function EditorScreen({ plugin, adapter }: { plugin?: WorkoutTypePlugin; adapter?: StorageAdapter }) {
  const {
    plugin: activePlugin,
    setPlugin,
    engine,
    refreshKey,
    selectedBlockId,
    setWorkout,
    addBlock,
    reorderBlock,
    resizeBlock,
    removeBlock,
    updateMetadata,
    selectBlock,
    undo,
    redo
  } = useEditorStore();
  const { width } = useWindowDimensions();
  const [exportBody, setExportBody] = useState("");
  const [displayMetric, setDisplayMetric] = useState("WATTS");
  const [showPreview, setShowPreview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [selectedWatts, setSelectedWatts] = useState("");

  useEffect(() => {
    if (plugin) {
      setPlugin(plugin);
    }
  }, [plugin, setPlugin]);

  useEffect(() => {
    let cancelled = false;
    if (!adapter) {
      setHydrated(true);
      return;
    }

    (async () => {
      const saved = await adapter.listWorkouts();
      if (cancelled) return;
      if (saved.length > 0) {
        setWorkout(saved[0]);
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [adapter, setWorkout]);

  const workout = engine.getState().workout;
  const timelineWidth = Math.max(700, width - 220);
  const timelineHeight = 320;
  const plotTop = 40;
  const plotBottom = timelineHeight - 60;
  const plotHeight = plotBottom - plotTop;
  const totalDuration = Math.max(3600, workout.blocks.reduce((sum, block) => sum + block.duration, 0));
  const pxPerSecond = timelineWidth / totalDuration;
  const timelineScale: TimelineScale = useMemo(
    () => ({
      pxPerSecond,
      pxPerIntensity: 3,
      intensityMin: 0,
      intensityMax: 120
    }),
    [pxPerSecond]
  );

  const snapshot = useMemo(() => engine.snapshot(timelineScale), [engine, timelineScale, refreshKey]);

  const blockById = useMemo(() => Object.fromEntries(workout.blocks.map((block) => [block.id, block])), [workout.blocks]);
  const selectedBlock = selectedBlockId ? blockById[selectedBlockId] : null;
  const intervalContainers = workout.blocks.filter((block) => block.type === "interval_set");
  const layoutById = useMemo(() => Object.fromEntries(snapshot.layout.map((layout) => [layout.id, layout])), [snapshot.layout]);
  const virtualLayoutByParent = useMemo(
    () =>
      snapshot.layout.reduce<Record<string, typeof snapshot.layout>>((acc, layout) => {
        if (!layout.virtual || !layout.parentId) return acc;
        const prev = acc[layout.parentId] ?? [];
        acc[layout.parentId] = [...prev, layout];
        return acc;
      }, {}),
    [snapshot.layout]
  );

  const tags = ["Recovery", "Intervals", "FTP", "TT"];

  const clampBlockFrame = (layout: { height: number }) => {
    const height = Math.min(Math.max(20, layout.height), plotHeight);
    const y = Math.max(plotTop, plotBottom - height);
    return { y, height };
  };

  useEffect(() => {
    if (!adapter || !hydrated) return;
    const timer = setTimeout(() => {
      adapter.saveWorkout(workout).catch(() => {
        // Ignore persistence failures for MVP UI flow.
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [adapter, hydrated, workout]);

  useEffect(() => {
    if (!selectedBlock) {
      setSelectedWatts("");
      return;
    }
    const ftp = workout.ftp ?? 250;
    const pct = targetPercent(selectedBlock);
    setSelectedWatts(String(Math.round((pct / 100) * ftp)));
  }, [selectedBlock, workout.ftp]);

  const applySelectedWattage = () => {
    if (!selectedBlock) return;
    const watts = Number(selectedWatts);
    if (Number.isNaN(watts) || watts <= 0) return;
    const ftp = workout.ftp ?? 250;
    const pct = clamp((watts / ftp) * 100, 1, 200);

    if (selectedBlock.type === "interval_set") {
      resizeBlock(selectedBlock.id, { targetValue: pct, metaPatch: { onTarget: pct } });
      return;
    }

    const rampLike = selectedBlock.type === "warmup" || selectedBlock.type === "cooldown" || selectedBlock.type === "interval_ramp";
    if (rampLike) {
      resizeBlock(selectedBlock.id, { targetStart: pct, targetEnd: pct });
      return;
    }

    resizeBlock(selectedBlock.id, { targetValue: pct });
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.headerBand}>
        <TextInput
          style={styles.titleInput}
          value={workout.name}
          onChangeText={(name) => updateMetadata({ name })}
          placeholder="Workout name"
        />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaLeft}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput
            style={styles.descriptionInput}
            value={workout.description}
            onChangeText={(description) => updateMetadata({ description })}
            multiline
            placeholder="Description..."
          />
        </View>
        <View style={styles.metaRight}>
          <Text style={styles.fieldLabel}>AUTHOR</Text>
          <TextInput
            style={styles.simpleInput}
            value={workout.author}
            onChangeText={(author) => updateMetadata({ author })}
            placeholder="Author"
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>TAG YOUR WORKOUT</Text>
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <TagChip
                key={tag}
                text={tag}
                active={workout.tags.includes(tag)}
                onPress={() => {
                  const active = workout.tags.includes(tag);
                  updateMetadata({ tags: active ? workout.tags.filter((t) => t !== tag) : [...workout.tags, tag] });
                }}
              />
            ))}
          </View>
          <TextInput
            style={[styles.simpleInput, { marginTop: 10 }]}
            placeholder="#CustomTags"
            onSubmitEditing={(event) => {
              const tag = event.nativeEvent.text.trim();
              if (!tag) return;
              if (!workout.tags.includes(tag)) {
                updateMetadata({ tags: [...workout.tags, tag] });
              }
            }}
          />
        </View>
      </View>

      <View style={styles.editorRow}>
        <View style={[styles.timelinePanel, { width: timelineWidth }]}> 
          <View style={{ height: timelineHeight, position: "relative", overflow: "hidden" }}>
            <Svg width={timelineWidth} height={timelineHeight}>
              {Array.from({ length: 7 }).map((_, index) => {
                const y = 40 + (index * (timelineHeight - 80)) / 6;
                return <Line key={`line-${index}`} x1={0} y1={y} x2={timelineWidth} y2={y} stroke="#a8adb3" strokeWidth={1} />;
              })}
              {ZONE_LABELS.map((zone, index) => (
                <SvgText key={zone} x={8} y={timelineHeight - 80 - index * 40} fill="#525760" fontSize="13" fontWeight="700">
                  {zone}
                </SvgText>
              ))}
              {[0, 15, 30, 45, 60].map((minute) => (
                <SvgText
                  key={minute}
                  x={(minute * 60 * pxPerSecond) / (minute === 60 ? 1 : 1)}
                  y={timelineHeight - 10}
                  fill="#525760"
                  fontSize="13"
                  fontWeight="700"
                >
                  {`${Math.floor(minute)}:00`}
                </SvgText>
              ))}
            </Svg>

            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {snapshot.layout
              .filter((layout) => {
                if (layout.virtual) return false;
                const block = blockById[layout.id];
                return Boolean(block && block.type !== "interval_set");
              })
              .map((layout) => {
                const block = blockById[layout.id];
                if (!block) return null;
                const frame = clampBlockFrame(layout);
                const colors = blockColors(block);
                return (
                  <BlockItem
                    key={block.id}
                    id={block.id}
                    x={layout.x}
                    y={frame.y}
                    width={layout.width}
                    height={frame.height}
                    selected={selectedBlockId === block.id}
                    title={block.label || block.type}
                    blockType={block.type}
                    fillColor={colors.fill}
                    accentColor={colors.accent}
                    pxPerSecond={pxPerSecond}
                    timelineHeight={timelineHeight}
                    timelineWidth={timelineWidth}
                    onSelect={() => selectBlock(block.id)}
                    onReorder={(dropTime) => reorderBlock(block.id, dropTime)}
                    onResizeDuration={(deltaSeconds) => resizeBlock(block.id, { duration: block.duration + deltaSeconds })}
                    onResizeIntensity={(deltaIntensity) => {
                      const current = block.target?.value ?? block.target?.start ?? 50;
                      resizeBlock(block.id, { targetValue: current + deltaIntensity });
                    }}
                    hitTestZone={(point) => engine.hitTest(timelineScale, point).zone ?? "body"}
                    onDelete={() => removeBlock(block.id)}
                  />
                );
              })}

            {intervalContainers.map((container) => {
              const containerLayout = layoutById[container.id];
              if (!containerLayout) return null;
              const containerFrame = clampBlockFrame(containerLayout);
              const children = virtualLayoutByParent[container.id] ?? [];
              const containerColors = blockColors(container);
              return (
                <View key={`container-wrap-${container.id}`} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                  {children.map((child, index) => {
                    const childFrame = clampBlockFrame(child);
                    const isOn = child.blockType === "interval_steady";
                    return (
                      <View
                        key={child.id}
                        pointerEvents="none"
                        style={[
                          styles.intervalChild,
                          isOn ? styles.intervalOn : styles.intervalOff,
                          {
                            left: child.x,
                            top: childFrame.y,
                            width: Math.max(8, child.width),
                            height: childFrame.height
                          }
                        ]}
                      >
                        {index > 0 ? <View style={styles.intervalDivider} /> : null}
                      </View>
                    );
                  })}
                  <BlockItem
                    id={container.id}
                    x={containerLayout.x}
                    y={containerFrame.y}
                    width={containerLayout.width}
                    height={containerFrame.height}
                    selected={selectedBlockId === container.id}
                    title={container.label || "Intervals"}
                    blockType={container.type}
                    fillColor={containerColors.fill}
                    accentColor={containerColors.accent}
                    pxPerSecond={pxPerSecond}
                    timelineHeight={timelineHeight}
                    timelineWidth={timelineWidth}
                    onSelect={() => selectBlock(container.id)}
                    onReorder={(dropTime) => reorderBlock(container.id, dropTime)}
                    onResizeDuration={(deltaSeconds) => {
                      const nextDuration = Math.max(1, container.duration + deltaSeconds);
                      const reps = Math.max(1, Math.round(Number(container.meta?.reps ?? 3)));
                      const totalUnit = Number(container.meta?.onDuration ?? 60) + Number(container.meta?.offDuration ?? 60);
                      const scaleFactor = totalUnit > 0 ? nextDuration / (reps * totalUnit) : 1;
                      resizeBlock(container.id, {
                        duration: nextDuration,
                        metaPatch: {
                          onDuration: Math.max(1, Math.round(Number(container.meta?.onDuration ?? 60) * scaleFactor)),
                          offDuration: Math.max(1, Math.round(Number(container.meta?.offDuration ?? 60) * scaleFactor))
                        }
                      });
                    }}
                    onResizeIntensity={(deltaIntensity) => {
                      const current = Number(container.meta?.onTarget ?? container.target?.value ?? 105);
                      resizeBlock(container.id, { targetValue: current + deltaIntensity, metaPatch: { onTarget: current + deltaIntensity } });
                    }}
                    hitTestZone={(point) => engine.hitTest(timelineScale, point).zone ?? "body"}
                    onDelete={() => removeBlock(container.id)}
                    variant="interval_container"
                  />
                </View>
              );
            })}
            </View>

            <View style={styles.trashZone}>
              <Text style={styles.trashText}>TRASH</Text>
            </View>
          </View>

          <View style={styles.timelineFooter}>
            <Pressable style={styles.metricPill} onPress={() => setDisplayMetric((v) => (v === "WATTS" ? "%FTP" : "WATTS"))}>
              <Text style={styles.metricPillText}>DISPLAY {displayMetric}</Text>
            </Pressable>
            <Text style={styles.footerText}>Stress Points: {snapshot.summary.stressScoreApprox}</Text>
            <Text style={styles.footerText}>Workout Duration {secondsToClock(snapshot.summary.totalDuration)}</Text>
          </View>
        </View>

        <View style={styles.palette}>
          {activePlugin
            .blockCatalog()
            .filter((block) => ["warmup", "cooldown", "interval_set", "free_ride", "text_event", "cadence"].includes(block.type))
            .map((block) => (
              <PaletteItem key={block.type} label={block.label} onAdd={() => addBlock(block.type)} />
            ))}

          <Pressable style={styles.undoButton} onPress={undo}>
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
          <Pressable style={styles.undoButton} onPress={redo}>
            <Text style={styles.undoText}>Redo</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.quickEditPanel}>
        <Text style={styles.fieldLabel}>QUICK EDIT</Text>
        {selectedBlock ? (
          <View style={styles.quickEditRow}>
            <Text style={styles.quickEditLabel}>Selected: {selectedBlock.label || selectedBlock.type}</Text>
            <TextInput
              style={styles.quickEditInput}
              value={selectedWatts}
              onChangeText={setSelectedWatts}
              keyboardType="numeric"
              placeholder="Watts"
              onSubmitEditing={applySelectedWattage}
            />
            <Pressable style={styles.quickEditApply} onPress={applySelectedWattage}>
              <Text style={styles.quickEditApplyText}>Apply Watts</Text>
            </Pressable>
            <Text style={styles.quickEditHint}>FTP {workout.ftp ?? 250}w</Text>
          </View>
        ) : (
          <Text style={styles.quickEditHint}>Select a block, then drag to resize/raise or type target watts.</Text>
        )}
      </View>

      <View style={styles.exportRow}>
        {activePlugin.exporters.map((exporter) => (
          <Pressable
            key={exporter.id}
            style={styles.exportButton}
            onPress={async () => {
              const body = exporter.export(workout);
              const filename = `${workout.name || "workout"}${exporter.fileExtension}`;
              const mimeType = exporter.fileExtension === ".zwo" ? "application/xml" : "text/xml";
              await saveAndShare(filename, body, mimeType);
              setExportBody(body);
            }}
          >
            <Text style={styles.exportButtonText}>{exporter.label}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.undoButton} onPress={() => setShowPreview((value) => !value)}>
          <Text style={styles.undoText}>{showPreview ? "Hide Preview" : "Show Preview"}</Text>
        </Pressable>
      </View>
      {showPreview ? <TextInput style={styles.exportPreview} value={exportBody} editable={false} multiline /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 12,
    backgroundColor: "#eef0f2"
  },
  headerBand: {
    backgroundColor: "#20242b",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  titleInput: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center"
  },
  metaGrid: {
    flexDirection: "row",
    gap: 12
  },
  metaLeft: {
    flex: 1
  },
  metaRight: {
    width: 360
  },
  fieldLabel: {
    fontSize: 18,
    fontWeight: "900",
    color: "#10131a"
  },
  descriptionInput: {
    marginTop: 8,
    minHeight: 140,
    backgroundColor: "#dfe2e6",
    borderRadius: 12,
    padding: 12,
    fontSize: 20,
    fontWeight: "500"
  },
  simpleInput: {
    marginTop: 8,
    backgroundColor: "#dfe2e6",
    borderRadius: 12,
    padding: 10,
    fontSize: 20,
    fontWeight: "600"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  tagChip: {
    borderWidth: 1,
    borderColor: "#afb5bd",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  tagChipActive: {
    backgroundColor: "#ff6a1a",
    borderColor: "#ff6a1a"
  },
  tagChipText: {
    color: "#4a4e56",
    fontWeight: "700"
  },
  tagChipTextActive: {
    color: "#ffffff"
  },
  editorRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 12
  },
  timelinePanel: {
    backgroundColor: "#eceef0",
    borderWidth: 1,
    borderColor: "#a9aeb3",
    minHeight: 400,
    position: "relative"
  },
  block: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden"
  },
  blockTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6
  },
  intervalContainer: {
    borderWidth: 3,
    borderStyle: "solid",
    borderColor: "#0f4f3f",
    backgroundColor: "rgba(25,120,90,0.12)"
  },
  blockSelected: {
    borderColor: "#111827"
  },
  blockBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  blockLabel: {
    fontSize: 11,
    color: "#1c2028",
    fontWeight: "700"
  },
  resizeHandleRight: {
    position: "absolute",
    width: 10,
    right: -6,
    top: 0,
    bottom: 0,
    backgroundColor: "#253041"
  },
  resizeHandleTop: {
    position: "absolute",
    top: -6,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: "#253041"
  },
  palette: {
    width: 112,
    gap: 8
  },
  paletteButton: {
    backgroundColor: "#253041",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  paletteText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "700"
  },
  timelineFooter: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 8,
    paddingBottom: 8
  },
  metricPill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#8a9098",
    paddingVertical: 5,
    paddingHorizontal: 12
  },
  metricPillText: {
    fontWeight: "800",
    color: "#1f242d"
  },
  footerText: {
    fontWeight: "800",
    fontSize: 18,
    color: "#11131a"
  },
  trashZone: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 84,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#313842",
    justifyContent: "center",
    alignItems: "center"
  },
  trashText: {
    color: "#fff",
    fontWeight: "900"
  },
  undoButton: {
    borderRadius: 8,
    borderColor: "#293446",
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    backgroundColor: "#dbe0e5"
  },
  undoText: {
    textAlign: "center",
    color: "#1d2430",
    fontWeight: "800"
  },
  quickEditPanel: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#b2b7be",
    borderRadius: 10,
    backgroundColor: "#f6f7f8",
    padding: 10
  },
  quickEditRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap"
  },
  quickEditLabel: {
    fontWeight: "700",
    color: "#1f2733"
  },
  quickEditInput: {
    minWidth: 120,
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    fontWeight: "700"
  },
  quickEditApply: {
    backgroundColor: "#253041",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  quickEditApplyText: {
    color: "#fff",
    fontWeight: "800"
  },
  quickEditHint: {
    color: "#4b5563",
    fontWeight: "600"
  },
  intervalChild: {
    position: "absolute",
    borderRadius: 3
  },
  intervalOn: {
    backgroundColor: "rgba(57, 181, 74, 0.85)"
  },
  intervalOff: {
    backgroundColor: "rgba(123, 130, 142, 0.85)"
  },
  intervalDivider: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.8)"
  },
  exportRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8
  },
  exportButton: {
    backgroundColor: "#ff6418",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "800"
  },
  exportPreview: {
    marginTop: 10,
    minHeight: 180,
    borderRadius: 10,
    borderColor: "#adb3ba",
    borderWidth: 1,
    backgroundColor: "#fff",
    padding: 10,
    fontFamily: "Courier"
  }
});
