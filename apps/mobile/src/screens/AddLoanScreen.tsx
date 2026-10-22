import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/index';

type AddLoanNavProp = NativeStackNavigationProp<RootStackParamList, 'AddLoan'>;

interface Props {
  navigation: AddLoanNavProp;
}

export const AddLoanScreen: React.FC<Props> = ({ navigation }) => {
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');

  // Default due date to 7 days from today
  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [dueDateString, setDueDateString] = useState(defaultDueDate.toISOString().split('T')[0]);

  // Quick Due Date preset selection
  const [activePreset, setActivePreset] = useState<'3d' | '7d' | '14d' | '30d' | 'custom'>('7d');

  // Receipt bonus state
  const [receiptImage, setReceiptImage] = useState<{ uri: string; name: string; type: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setPresetDate = (days: number, preset: '3d' | '7d' | '14d' | '30d') => {
    setActivePreset(preset);
    const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setDueDateString(target.toISOString().split('T')[0]);
  };

  const pickReceiptImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow photo library access to attach a receipt.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || `receipt_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        setReceiptImage({
          uri: asset.uri,
          name: filename,
          type: mimeType,
        });
      }
    } catch (err) {
      console.warn('Image picker error', err);
      Alert.alert('Error', 'Could not open image library');
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    // Client-side validations
    if (!friendName.trim()) {
      setErrorMessage("Please enter your friend's name");
      return;
    }

    const numericAmount = parseFloat(amount.trim());
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid loan amount greater than ₹0');
      return;
    }

    if (!dueDateString || isNaN(Date.parse(dueDateString))) {
      setErrorMessage('Please enter a valid due date (YYYY-MM-DD)');
      return;
    }

    setIsLoading(true);
    try {
      let receiptUrl: string | null = null;
      let receiptOriginalName: string | null = null;

      // Upload receipt if selected (bonus feature)
      if (receiptImage) {
        try {
          const uploadRes = await api.upload.uploadReceipt(
            receiptImage.uri,
            receiptImage.name,
            receiptImage.type
          );
          if (uploadRes.success && uploadRes.data) {
            receiptUrl = uploadRes.data.fileUrl;
            receiptOriginalName = uploadRes.data.originalName;
          }
        } catch (uploadErr: any) {
          console.warn('Receipt upload failed, continuing with loan creation', uploadErr);
        }
      }

      // Create loan
      const res = await api.loans.create({
        friendName: friendName.trim(),
        amount: numericAmount,
        dueDate: dueDateString,
        receiptUrl,
        receiptOriginalName,
      });

      if (res.success) {
        navigation.goBack();
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save loan. Please check your network connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.centerWrapper}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add New Loan</Text>
            <View style={{ width: 40 }} />
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.overdue} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Friend Name */}
            <Text style={styles.fieldLabel}>Who are you lending to?</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.textMuted}
                value={friendName}
                onChangeText={(val) => {
                  setFriendName(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoFocus
              />
            </View>

            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount in INR (₹)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(val) => {
                  setAmount(val);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>

            {/* Due Date & Presets */}
            <Text style={styles.fieldLabel}>Repayment Due Date (YYYY-MM-DD)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={dueDateString}
                onChangeText={(val) => {
                  setDueDateString(val);
                  setActivePreset('custom');
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>

            {/* Due Date Presets */}
            <View style={styles.presetsRow}>
              {[
                { key: '3d', label: '+3 Days', days: 3 },
                { key: '7d', label: '+1 Week', days: 7 },
                { key: '14d', label: '+2 Weeks', days: 14 },
                { key: '30d', label: '+1 Month', days: 30 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.presetButton, activePreset === item.key && styles.presetButtonActive]}
                  onPress={() => setPresetDate(item.days, item.key as any)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetText, activePreset === item.key && styles.presetTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional Receipt Attachment (Bonus Feature) */}
            <Text style={styles.fieldLabel}>Receipt or Proof (Optional)</Text>
            {receiptImage ? (
              <View style={styles.receiptPreviewCard}>
                <Image source={{ uri: receiptImage.uri }} style={styles.receiptThumb} />
                <View style={styles.receiptMeta}>
                  <Text style={styles.receiptFilename} numberOfLines={1}>{receiptImage.name}</Text>
                  <Text style={styles.receiptBadge}>Ready to attach</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeReceiptBtn}
                  onPress={() => setReceiptImage(null)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.overdue} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickReceiptImage}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                <Text style={styles.uploadButtonText}>Attach Receipt Image</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveButtonText}>Record Loan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === 'web') {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>{content}</View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 480,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overdueSoft,
    borderWidth: 1,
    borderColor: colors.overdueBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: colors.overdue,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
      },
    }),
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  amountInput: {
    fontSize: 17,
    fontWeight: '600',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -8,
    marginBottom: 20,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  receiptPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 8,
  },
  receiptThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  receiptMeta: {
    flex: 1,
    marginLeft: 12,
  },
  receiptFilename: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  receiptBadge: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  removeReceiptBtn: {
    padding: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
