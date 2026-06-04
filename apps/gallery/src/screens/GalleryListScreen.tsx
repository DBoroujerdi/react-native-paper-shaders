import { createElement } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { SHADERS } from "react-native-paper-shaders";
import type { RootStackParamList } from "./navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Gallery">;

const TILE_HEIGHT = 140;
const LIST_PADDING = 16;

export function GalleryListScreen({ navigation }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const tileWidth = windowWidth - LIST_PADDING * 2;

  return (
    <FlatList
      data={SHADERS}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate("Detail", { id: item.id })}
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        >
          <View style={styles.preview} pointerEvents="none">
            {createElement(item.component, {
              ...item.defaultProps,
              style: { width: tileWidth, height: TILE_HEIGHT },
            })}
          </View>
          <Text style={styles.title}>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: LIST_PADDING,
    gap: 12,
  },
  tile: {
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
  },
  tilePressed: {
    opacity: 0.7,
  },
  preview: {
    height: TILE_HEIGHT,
    backgroundColor: "#000",
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
