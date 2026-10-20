import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
});