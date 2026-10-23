import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/index';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

export const OtpScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phoneNumber, devOtp } = route.params;
  const { login } = useAuth();

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(30);

  const inputRef = useRef<any>(null);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    let interval: any;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerify = async (codeToVerify?: string) => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    setErrorMessage(null);

    const targetCode = (codeToVerify || otp).trim().replace(/\D/g, '');
    if (targetCode.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.verifyOtp(phoneNumber, targetCode);
      if (res.success && res.token && res.user) {
        // Authenticating automatically switches React Navigation stack to Dashboard
        await login(res.token, res.user);
      }
    } catch (err: any) {
      const msg = err?.message;
      if (typeof msg === 'string') {
        setErrorMessage(msg);
      } else if (msg && typeof msg === 'object') {
        setErrorMessage(msg.message || JSON.stringify(msg));
      } else {
        setErrorMessage('Verification failed. Please check the code and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setErrorMessage(null);
    setIsResending(true);

    try {
      const res = await api.auth.requestOtp(phoneNumber);
      if (res.success) {
        setResendCooldown(30);
        setOtp('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleAutofillDevOtp = (code: string) => {
    setOtp(code);
    handleVerify(code);
  };

  const content = (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.centerWrapper}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit verification code for{'\n'}
              <Text style={styles.phoneHighlight}>{phoneNumber}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.overdue} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Quick Autofill banner if devOtp was provided */}
            {devOtp && (
              <TouchableOpacity
                style={styles.devAutofillPill}
                onPress={() => handleAutofillDevOtp(devOtp)}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={16} color={colors.primary} />
                <Text style={styles.devAutofillText}>
                  Dev Mode: Click to Auto-fill <Text style={{ fontWeight: '800' }}>{devOtp}</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* OTP Input Display with full click overlay */}
            <View style={styles.otpInputContainer}>
              <View style={styles.otpBoxesRow}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = otp[index] || '';
                  const isFocused = otp.length === index;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        digit ? styles.otpBoxFilled : null,
                        isFocused ? styles.otpBoxFocused : null,
                      ]}
                    >
                      <Text style={styles.otpDigit}>{digit}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Full overlay input so clicking anywhere captures input */}
              <TextInput
                ref={inputRef}
                style={styles.otpOverlayInput}
                value={otp}
                onChangeText={(text) => {
                  const filtered = text.replace(/\D/g, '').slice(0, 6);
                  setOtp(filtered);
                  if (errorMessage) setErrorMessage(null);
                  if (filtered.length === 6) {
                    handleVerify(filtered);
                  }
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                caretHidden
              />
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (otp.length !== 6 || isLoading) && styles.disabledButton,
              ]}
              onPress={() => handleVerify()}
              disabled={otp.length !== 6 || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
              )}
            </TouchableOpacity>

            {/* Resend Cooldown */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn't receive code? </Text>
              {resendCooldown > 0 ? (
                <Text style={styles.cooldownText}>Resend in {resendCooldown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={isResending}>
                  {isResending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.resendButtonText}>Resend Code</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.devConsoleNote}>
              <Ionicons name="terminal-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.devConsoleText}>
                Mock OTP is also printed in your Express server terminal.
              </Text>
            </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 440,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
      },
    }),
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
  devAutofillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 18,
    gap: 8,
    justifyContent: 'center',
  },
  devAutofillText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  otpInputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    width: 46,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  otpBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  otpOverlayInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 24,
    ...Platform.select({
      web: {
        cursor: 'text',
      } as any,
    }),
  },
  verifyButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendPrompt: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cooldownText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  devConsoleNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  devConsoleText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
});
