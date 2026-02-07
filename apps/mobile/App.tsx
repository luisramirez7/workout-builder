import React from "react";
import { SafeAreaView } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { EditorScreen } from "@workout-builder/app";
import { cyclingStructuredPlugin } from "@workout-builder/plugins-cycling-structured";
import { AsyncStorageAdapter } from "./src/asyncStorageAdapter";

const adapter = new AsyncStorageAdapter();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <EditorScreen plugin={cyclingStructuredPlugin} adapter={adapter} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
