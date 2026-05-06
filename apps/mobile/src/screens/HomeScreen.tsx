import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMockAuth } from '../features/auth/context/MockAuthProvider';

/** Placeholder shell after mock sign-in; replace with real tabs when routing expands. */
export function HomeScreen() {
  const { signOut, user } = useMockAuth();

  if (!user) {
    return null;
  }

  return <SafeAreaView edges={['top', 'left', 'right']}></SafeAreaView>;
}

const styles = StyleSheet.create({});
