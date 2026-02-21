// Stub type declarations for React Native modules (mobile app not active)
declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const TouchableOpacity: any;
  export const ScrollView: any;
  export const StyleSheet: any;
  export const Dimensions: any;
  export const Platform: any;
  export const StatusBar: any;
  export const Animated: any;
  export const Alert: any;
  export const ActivityIndicator: any;
  export const TextInput: any;
  export const FlatList: any;
  export const Image: any;
  export const Switch: any;
  export const RefreshControl: any;
  export const SafeAreaView: any;
  export const Modal: any;
  export const Pressable: any;
  export const KeyboardAvoidingView: any;
  export const Linking: any;
  export const AppState: any;
  export const Vibration: any;
}

declare module '@react-navigation/native' {
  export const NavigationContainer: any;
  export function useNavigation(): any;
  export function useRoute(): any;
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator(): any;
}

declare module '@react-navigation/stack' {
  export function createStackNavigator(): any;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: any;
  export default AsyncStorage;
}

declare module 'react-native-vector-icons/MaterialIcons' {
  const Icon: any;
  export default Icon;
}

declare module 'react-native-linear-gradient' {
  const LinearGradient: any;
  export default LinearGradient;
}

declare module '@react-native-blur/blur' {
  export const BlurView: any;
}

declare module 'react-native-push-notification' {
  const PushNotification: any;
  export default PushNotification;
}

declare module 'react-native-chart-kit' {
  export const LineChart: any;
  export const BarChart: any;
  export const PieChart: any;
}

declare module 'react-native-biometrics' {
  const ReactNativeBiometrics: any;
  export default ReactNativeBiometrics;
}

declare module '@react-native-netinfo/netinfo' {
  const NetInfo: any;
  export default NetInfo;
}
