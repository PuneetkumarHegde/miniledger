import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface SummaryCardProps {
  title: string;
  amount: string;
  type: 'lent' | 'repaid' | 'overdue';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, type }) => {
  const getCardStyle = () => {
    switch (type) {
      case 'repaid':
        return {
          iconName: 'checkmark-circle' as const,
          iconColor: colors.repaid,
          accentBg: colors.repaidSoft,
          accentBorder: colors.repaidBorder,
          badgeColor: colors.repaid,
        };
      case 'overdue':
        return {
          iconName: 'alert-circle' as const,
          iconColor: colors.overdue,
          accentBg: colors.overdueSoft,
          accentBorder: colors.overdueBorder,
          badgeColor: colors.overdue,
        };
      case 'lent':
      default:
        return {
          iconName: 'wallet' as const,
          iconColor: colors.primary,
          accentBg: colors.primarySoft,
          accentBorder: colors.primaryBorder,
          badgeColor: colors.primary,
        };
    }
  };

  const themeConfig = getCardStyle();
  const numericVal = parseFloat(amount || '0');
  const formattedAmount = isNaN(numericVal) ? '₹0.00' : `₹${numericVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={[styles.card, { borderColor: themeConfig.accentBorder }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrapper, { backgroundColor: themeConfig.accentBg }]}>
          <Ionicons name={themeConfig.iconName} size={18} color={themeConfig.iconColor} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      <Text style={[styles.amount, { color: themeConfig.badgeColor }]} numberOfLines={1}>
        {formattedAmount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
});
