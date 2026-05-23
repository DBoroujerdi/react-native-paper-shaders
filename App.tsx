import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import { Dithering } from "./src/Dithering";

// Paper-design snippet, adapted to React Native conventions:
//   - width/height as numbers (no 'px' suffix)
//   - 'outline' replaced with borderWidth + borderColor
// Original snippet (https://app.paper.design):
//   <Dithering speed={0.25} shape="warp" type="4x4" size={4} scale={1}
//     frame={5929.724999967142} colorBack="#00000000" colorFront="#99CDFC"
//     style={{ backgroundColor: '#E2ECF6', height: '319px', outline: '1px solid #B0D4F5', width: '511px' }} />
export default function App() {
  return (
    <View style={styles.container}>
      <Dithering
        speed={0.25}
        shape="warp"
        type="4x4"
        size={4}
        scale={1}
        frame={5929.724999967142}
        colorBack="#00000000"
        colorFront="#99CDFC"
        style={{
          backgroundColor: "#E2ECF6",
          width: 511,
          height: 319,
          borderWidth: 1,
          borderColor: "#B0D4F5",
        }}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
});
