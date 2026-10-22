import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Loan } from '../types/index';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface LoanCardProps {
  loan: Loan;
  onRepayPress: (loan: Loan) => void;
  onReceiptPress?: (loan: Loan) => void;
}

export const LoanCard: React.FC<LoanCardProps> = ({ loan, onRepayPress, onReceiptPress }) => {
  const isRepaid = loan.status === 'REPAID';
  const isOverdue = loan.isOverdue;

  // Format Due Date strictly by calendar parts to prevent timezone offsets
  let formattedDueDate = loan.dueDate;
  try {
    const datePart = loan.dueDate.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      formattedDueDate = `${day} ${monthNames[monthIdx] || parts[1]} ${year}`;
    }
  } catch {
    formattedDueDate = loan.dueDate;
  }

  const numericAmount = parseFloat(loan.amount || '0');
  const formattedAmount = isNaN(numericAmount)
    ? '₹0.00'
    : `₹${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Determine card styles based on status
  let cardBorderColor = colors.border;
  let cardBg = colors.surface;
  let badgeBg = colors.pendingSoft;
  let badgeTextColor = colors.pending;
  let badgeBorderColor = colors.pendingBorder;
  let badgeLabel = 'Pending';
  let badgeIcon: keyof typeof Ionicons.glyphMap = 'time-outline';

  if (isRepaid) {
    cardBorderColor = colors.repaidBorder;
    badgeBg = colors.repaidSoft;
    badgeTextColor = colors.repaid;
    badgeBorderColor = colors.repaidBorder;
    badgeLabel = 'Repaid';
    badgeIcon = 'checkmark-circle' as const;
  } else if (isOverdue) {
    cardBorderColor = colors.overdueBorder;
    cardBg = '#FFFDFD';
    badgeBg = colors.overdueSoft;
    badgeTextColor = colors.overdue;
    badgeBorderColor = colors.overdueBorder;
    badgeLabel = 'Overdue';
    badgeIcon = 'alert-circle' as const;
  }

  return (
    <View style={[styles.card, { borderColor: cardBorderColor, backgroundColor: cardBg }]}>
      <View style={styles.topRow}>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>
            {loan.friendName}
          </Text>
          <View style={styles.dueDateRow}>
            <Ionicons
              name="calendar-outline"
              size={13}
              color={isOverdue ? colors.overdue : colors.textMuted}
            />
            <Text
              style={[
                styles.dueDateText,
                isOverdue && { color: colors.overdue, fontWeight: '600' },
              ]}
            >
              Due {formattedDueDate}
            </Text>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amountText,
              isRepaid && styles.repaidAmount,
              isOverdue && styles.overdueAmount,
            ]}
          >
            {formattedAmount}
          </Text>
          <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorderColor }]}>
            <Ionicons name={badgeIcon} size={12} color={badgeTextColor} style={{ marginRight: 3 }} />
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footerRow}>
        {loan.receiptUrl ? (
          <TouchableOpacity
            style={styles.receiptButton}
            onPress={() => onReceiptPress && onReceiptPress(loan)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-attach-outline" size={15} color={colors.primary} />
            <Text style={styles.receiptButtonText}>View Receipt</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {!isRepaid ? (
          <TouchableOpacity
            style={styles.repayButton}
            onPress={() => onRepayPress(loan)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
            <Text style={styles.repayButtonText}>Mark as Repaid</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.repaidTimestamp}>
            <Ionicons name="checkmark-done-circle" size={15} color={colors.repaid} />
            <Text style={styles.repaidTimestampText}>
              Completed{' '}
              {loan.repaidAt
                ? new Date(loan.repaidAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })
                : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  friendInfo: {
    flex: 1,
    marginRight: 12,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  overdueAmount: {
    color: colors.overdue,
  },
  repaidAmount: {
    color: colors.repaid,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 12,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  receiptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  repayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  repayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  repaidTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repaidTimestampText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
