import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  onAddPress: () => void;
  filtered?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddPress, filtered }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={filtered ? 'search-outline' : 'receipt-outline'}
          size={36}
          color={colors.primary}
        />
      </View>
      <Text style={styles.title}>
        {filtered ? 'No matching loans found' : 'No loans recorded yet'}
      </Text>
      <Text style={styles.subtitle}>
        {filtered
          ? 'Try switching to another filter tab to view other loans.'
          : 'Keep track of the money you lend to friends with automated due date and repayment tracking.'}
      </Text>
      {!filtered && (
        <TouchableOpacity style={styles.button} onPress={onAddPress} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Add Your First Loan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
