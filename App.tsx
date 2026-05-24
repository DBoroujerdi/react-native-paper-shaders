import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import { GalleryListScreen } from "./src/screens/GalleryListScreen";
import { ShaderDetailScreen } from "./src/screens/ShaderDetailScreen";
import { SHADERS } from "./src/shaders/registry";
import type { RootStackParamList } from "./src/screens/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#000" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#000" },
        }}
      >
        <Stack.Screen
          name="Gallery"
          component={GalleryListScreen}
          options={{ title: "Paper Shaders" }}
        />
        <Stack.Screen
          name="Detail"
          component={ShaderDetailScreen}
          options={({ route }) => ({
            title: SHADERS.find((s) => s.id === route.params.id)?.name ?? "",
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
