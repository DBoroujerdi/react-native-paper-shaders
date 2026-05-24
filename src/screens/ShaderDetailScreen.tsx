import { createElement } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { SHADERS } from "../shaders/registry";
import type { RootStackParamList } from "./navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Detail">;

export function ShaderDetailScreen({ route }: Props) {
  const { width, height } = useWindowDimensions();
  const entry = SHADERS.find((s) => s.id === route.params.id);

  if (!entry) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>
          Shader '{route.params.id}' not found.
        </Text>
      </View>
    );
  }

  // Render at full window size minus a small breathing margin.
  const w = width;
  const h = height - 100;

  return (
    <View style={styles.container}>
      {createElement(entry.component, {
        ...entry.defaultProps,
        style: { width: w, height: h, backgroundColor: "#000" },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  missingText: {
    color: "#f55",
    fontSize: 16,
  },
});
