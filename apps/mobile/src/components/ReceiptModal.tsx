import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { getActiveBaseUrl } from '../config/api';
import { storage } from '../services/storage';

interface ReceiptModalProps {
  visible: boolean;
  receiptUrl: string | null;
  friendName: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  receiptUrl,
  friendName,
  onClose,
}) => {
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function resolveUrl() {
      if (!receiptUrl) return;
      setLoading(true);
      setError(false);
      try {
        const baseUrl = await getActiveBaseUrl();
        const storedToken = await storage.getToken();
        if (isMounted) {
          setToken(storedToken);
          // If already absolute URL, keep it, else prefix with baseUrl
          const resolved = receiptUrl.startsWith('http')
            ? receiptUrl
            : `${baseUrl.replace(/\/+$/, '')}${receiptUrl.startsWith('/') ? receiptUrl : `/${receiptUrl}`}`;
          setFullUrl(resolved);
        }
      } catch {
        if (isMounted) setError(true);
      }
    }
    if (visible && receiptUrl) {
      resolveUrl();
    }
    return () => {
      isMounted = false;
    };
  }, [visible, receiptUrl]);

  if (!receiptUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>Receipt for {friendName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.imageContainer}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading receipt...</Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={40} color={colors.overdue} />
                <Text style={styles.errorText}>Unable to load receipt image</Text>
              </View>
            ) : (
              fullUrl && (
                <Image
                  source={{
                    uri: fullUrl,
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoadEnd={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError(true);
                  }}
                />
              )
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    height: '75%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 14,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 14,
  },
});
