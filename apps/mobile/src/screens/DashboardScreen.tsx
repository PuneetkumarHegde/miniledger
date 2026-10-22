import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../services/api';
import { Loan, LoanSummary } from '../types/index';
import { useAuth } from '../context/AuthContext';
import { SummaryCard } from '../components/SummaryCard';
import { LoanCard } from '../components/LoanCard';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { EmptyState } from '../components/EmptyState';
import { ServerConfigModal } from '../components/ServerConfigModal';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/index';

type DashboardNavProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardNavProp;
}

type FilterTab = 'ALL' | 'PENDING' | 'OVERDUE' | 'REPAID';

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const [summary, setSummary] = useState<LoanSummary>({
    totalLent: '0.00',
    totalRepaid: '0.00',
    overdueAmount: '0.00',
    currency: 'INR',
    timezonePolicy: '',
  });
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Repayment confirmation state
  const [selectedLoanForRepayment, setSelectedLoanForRepayment] = useState<Loan | null>(null);
  const [isRepaying, setIsRepaying] = useState(false);

  // Receipt preview state
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string; friend: string } | null>(null);

  // Settings modal
  const [serverModalVisible, setServerModalVisible] = useState(false);

  const fetchData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const [summaryRes, loansRes] = await Promise.all([
        api.loans.getSummary(),
        api.loans.getAll(),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
      if (loansRes.success && loansRes.data) {
        setLoans(loansRes.data);
      }
    } catch (err: any) {
      console.error('Dashboard fetch error', err);
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Unable to connect to MiniLedger backend.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch when screen mounts or comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  const handleConfirmRepayment = async () => {
    if (!selectedLoanForRepayment) return;

    setIsRepaying(true);
    try {
      const res = await api.loans.repay(selectedLoanForRepayment.id);
      if (res.success && res.data) {
        // Optimistically update loan list and refresh summary
        setLoans((prev) =>
          prev.map((l) => (l.id === res.data.id ? { ...l, ...res.data } : l))
        );
        setSelectedLoanForRepayment(null);
        // Refresh summary metrics from backend
        const sumRes = await api.loans.getSummary();
        if (sumRes.success && sumRes.data) {
          setSummary(sumRes.data);
        }
      }
    } catch (err: any) {
      Alert.alert(
        'Repayment Failed',
        err instanceof ApiError ? err.message : 'Failed to mark loan as repaid.'
      );
    } finally {
      setIsRepaying(false);
    }
  };

  const filteredLoans = loans.filter((loan) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return loan.status === 'PENDING' && !loan.isOverdue;
    if (activeTab === 'OVERDUE') return loan.status === 'PENDING' && loan.isOverdue;
    if (activeTab === 'REPAID') return loan.status === 'REPAID';
    return true;
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* User profile & actions row */}
      <View style={styles.profileRow}>
        <View style={styles.profileLeft}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.phoneText}>{user?.phoneNumber || 'User'}</Text>
          </View>
        </View>

        <View style={styles.profileRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setServerModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { marginLeft: 8 }]}
            onPress={logout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.overdue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3 Summary Cards */}
      <Text style={styles.sectionHeaderTitle}>Overview</Text>
      <View style={styles.summaryCardsRow}>
        <SummaryCard title="Total Lent" amount={summary.totalLent} type="lent" />
        <SummaryCard title="Total Repaid" amount={summary.totalRepaid} type="repaid" />
        <SummaryCard title="Overdue" amount={summary.overdueAmount} type="overdue" />
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={18} color={colors.overdue} />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.loansSectionHeader}>
        <Text style={styles.sectionHeaderTitle}>Loans ({loans.length})</Text>
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => navigation.navigate('AddLoan')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.headerAddBtnText}>Add Loan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        {(['ALL', 'PENDING', 'OVERDUE', 'REPAID'] as FilterTab[]).map((tab) => {
          const isActive = activeTab === tab;
          let label = 'All';
          if (tab === 'PENDING') label = 'Pending';
          if (tab === 'OVERDUE') label = 'Overdue';
          if (tab === 'REPAID') label = 'Repaid';

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading && !isRefreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your ledger...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLoans}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <LoanCard
              loan={item}
              onRepayPress={(loan) => setSelectedLoanForRepayment(loan)}
              onReceiptPress={(loan) => {
                if (loan.receiptUrl) {
                  setSelectedReceipt({ url: loan.receiptUrl, friend: loan.friendName });
                }
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              onAddPress={() => navigation.navigate('AddLoan')}
              filtered={loans.length > 0 && filteredLoans.length === 0}
            />
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchData(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddLoan')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Repayment Confirmation Modal */}
      <ConfirmationModal
        visible={!!selectedLoanForRepayment}
        friendName={selectedLoanForRepayment?.friendName || ''}
        amount={selectedLoanForRepayment?.amount || '0'}
        isLoading={isRepaying}
        onConfirm={handleConfirmRepayment}
        onCancel={() => setSelectedLoanForRepayment(null)}
      />

      {/* Receipt Preview Modal */}
      <ReceiptModal
        visible={!!selectedReceipt}
        receiptUrl={selectedReceipt?.url || null}
        friendName={selectedReceipt?.friend || ''}
        onClose={() => setSelectedReceipt(null)}
      />

      {/* Server Config Modal */}
      <ServerConfigModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 96,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerContainer: {
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  phoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summaryCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overdueSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.overdueBorder,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.overdue,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.overdue,
  },
  loansSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
      },
    }),
  },
});
