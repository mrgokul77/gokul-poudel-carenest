import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DefaultTheme, NavigationContainer, createNavigationContainerRef, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import {
  Animated,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Easing } from 'react-native';

const API_BASE_URL = 'https://gokul-poudel-carenest.onrender.com/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const AUTH_TOKEN_KEY = 'carenest_auth_token';
const AUTH_USER_KEY = 'carenest_auth_user';
const JWT_TOKEN_KEY = 'jwt_token';
const USER_ROLE_KEY = 'user_role';
const API_TIMEOUT_MS = 30000;
const AUTH_UNAUTHORIZED_CODE = 'AUTH_UNAUTHORIZED';

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completion_requested: 'Awaiting Confirmation',
  awaiting_confirmation: 'Awaiting Confirmation',
  completed: 'Completed',
  rejected: 'Declined',
  expired: 'Expired',
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#0f766e',
  in_progress: '#22c55e',
  completion_requested: '#f59e0b',
  awaiting_confirmation: '#f59e0b',
  completed: '#64748b',
  rejected: '#dc2626',
  expired: '#94a3b8',
};

function getStatusLabel(status?: string | null) {
  const normalizedStatus = status ?? 'pending';
  return BOOKING_STATUS_LABELS[normalizedStatus] ?? normalizedStatus.replace(/_/g, ' ');
}

function getStatusColor(status?: string | null) {
  const normalizedStatus = status ?? 'pending';
  return BOOKING_STATUS_COLORS[normalizedStatus] ?? '#64748b';
}

function getBookingServiceType(booking: AssignedBooking) {
  return booking.service_type ?? booking.service_name ?? 'General Care Support';
}

function getBookingDateTimeLabel(booking: AssignedBooking) {
  const dateLabel = booking.date ? new Date(booking.date).toLocaleDateString() : 'Date pending';
  const timeLabel = booking.start_time ?? 'Time pending';
  return `${dateLabel} at ${timeLabel}`;
}

function getRoleDisplayLabel(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === 'caregiver' ? 'Caregiver' : 'Careseeker';
}

function getBookingTimestamp(booking: AssignedBooking) {
  if (booking.date) {
    const candidate = booking.start_time ? `${booking.date}T${booking.start_time}` : booking.date;
    const parsed = new Date(candidate).getTime();
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  if (booking.created_at) {
    const parsed = new Date(booking.created_at).getTime();
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return booking.id;
}

function getMostRecentBooking(bookings: AssignedBooking[]) {
  if (!bookings.length) return null;

  return [...bookings].sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a))[0];
}

function getBookingPriceLabel(booking: AssignedBooking) {
  const amount = booking.total_amount;

  if (typeof amount === 'number') {
    return `Rs ${amount.toLocaleString('en-IN')}`;
  }

  if (typeof amount === 'string' && amount.trim()) {
    const numeric = Number(amount);
    if (!Number.isNaN(numeric)) {
      return `Rs ${numeric.toLocaleString('en-IN')}`;
    }
    return amount;
  }

  return 'Price N/A';
}

/**
 * Wrapper for fetch with timeout handling and logging
 */
async function apiCall(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUT_MS
) {
  // Log the API call
  console.log(`[API] ${options.method || 'GET'} ${url}`);
  if (options.body) {
    try {
      const bodyObj = JSON.parse(options.body as string);
      console.log(`[API] Request body:`, bodyObj);
    } catch {
      console.log(`[API] Request body:`, options.body);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Log response
    console.log(`[API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await parseError(response);
      throw new Error(errorData);
    }

    const data = await response.json();
    console.log(`[API] Response data:`, data);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`[API] Timeout after ${timeoutMs}ms`);
        throw new Error('Cannot connect to server (timeout). Please check your connection and try again.');
      }
      throw error;
    }
    throw new Error('Network request failed');
  }
}

type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  OTPVerification: { email: string };
  Main: undefined;
};

type MainTabParamList = {
  Home: undefined;
  'Booking Requests': undefined;
  Notifications: undefined;
};

type CaregiverHomeStackParamList = {
  Dashboard: undefined;
  BookingDetail: { bookingId: number };
};

type CareseekerTabParamList = {
  Home: undefined;
  'My Bookings': undefined;
  Notifications: undefined;
};

type AuthUser = {
  email: string;
  name: string;
  role: string;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
};

type ServiceNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type AttendanceEntry = {
  id: string;
  action: 'Check-In' | 'Check-Out';
  timestamp: string;
  latitude: number;
  longitude: number;
};

type AssignedBooking = {
  id: number;
  caregiver?: number;
  has_review?: boolean;
  review_rating?: number | null;
  created_at?: string;
  family_name?: string;
  caregiver_name?: string;
  person_name?: string;
  service_type?: string;
  service_name?: string;
  emergency_contact_phone?: string;
  date?: string;
  start_time?: string;
  duration_hours?: number;
  service_address?: string;
  status: string;
  total_amount?: string | number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  proof_image?: string | null;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type CaregiverLocationResponse = {
  latitude: number | null;
  longitude: number | null;
  updated_at: string | null;
  is_available: boolean;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const AuthContext = createContext<AuthContextType | null>(null);
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const CaregiverHomeStack = createNativeStackNavigator<CaregiverHomeStackParamList>();
const CareseekerHomeStack = createNativeStackNavigator<CaregiverHomeStackParamList>();
const CareseekerTab = createBottomTabNavigator<CareseekerTabParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f0fdf4',
  },
};

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function normalizeRole(role: unknown): string {
  const value = typeof role === 'string' ? role.toLowerCase() : '';
  if (value === 'caregiver') return 'caregiver';
  if (value === 'careseeker' || value === 'care_seeker' || value === 'client' || value === 'family') {
    return 'careseeker';
  }
  return value;
}

async function persistAuthState(token: string, role: string, authUser: AuthUser) {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [JWT_TOKEN_KEY, token],
    [AUTH_USER_KEY, JSON.stringify(authUser)],
    [USER_ROLE_KEY, role],
  ]);
}

async function clearPersistedAuthState() {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY, JWT_TOKEN_KEY, USER_ROLE_KEY]);
}

function makeUnauthorizedError() {
  return new Error(AUTH_UNAUTHORIZED_CODE);
}

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === AUTH_UNAUTHORIZED_CODE;
}

async function parseError(response: Response) {
  const fallback = `Request failed (${response.status})`;
  try {
    const data = await response.json();
    if (typeof data?.error === 'string') return data.error;
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.detail === 'string') return data.detail;
    return fallback;
  } catch {
    return fallback;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function addMobileClientHeader(headers: Record<string, string> = {}) {
  return {
    ...headers,
    'X-Client-Source': 'mobile',
  };
}

async function postMobileActivity(
  activityType: string,
  token?: string | null,
  bookingId?: number | null,
) {
  const authToken = token || (await AsyncStorage.getItem(AUTH_TOKEN_KEY));
  if (!authToken) return;

  try {
    await fetchWithTimeout(`${API_BASE_URL}/user/activity/`, {
      method: 'POST',
      headers: addMobileClientHeader({
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        activity_type: activityType,
        booking_id: bookingId ?? null,
      }),
    });
  } catch {
    // best-effort logging only
  }
}

async function triggerEmergency(token: string, bookingId?: number | null) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/emergency/`, {
    method: 'POST',
    headers: addMobileClientHeader({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ booking_id: bookingId ?? null }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

function promptEmergencyConfirmation(onConfirm: () => void) {
  Alert.alert(
    'Emergency Alert',
    'Are you sure you want to send an emergency alert?\n\nThis will notify your caregiver and admin immediately',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Send Alert', style: 'destructive', onPress: onConfirm },
    ],
  );
}

async function fetchUserProfile(token: string) {
  const url = `${API_BASE_URL}/user/profile/`;
  console.log(`[API] GET ${url}`);

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      throw makeUnauthorizedError();
    }

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = await response.json();
    console.log(`[API] Response:`, data);
    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Cannot connect to server. Please check your connection.');
      }
      throw error;
    }
    throw new Error('Failed to fetch user profile');
  }
}

function getBookingStartDateTime(booking: AssignedBooking) {
  if (!booking.date || !booking.start_time) {
    return null;
  }

  const start = new Date(`${booking.date}T${booking.start_time}`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  return start;
}

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCareseekerBookingStatusText(booking: AssignedBooking) {
  const status = (booking.status || '').toLowerCase();
  if (status === 'pending') return 'Waiting for caregiver response';
  if (status === 'accepted') {
    return `Caregiver accepted - service on ${booking.date ? new Date(booking.date).toLocaleDateString() : 'scheduled date'}`;
  }
  if (status === 'in_progress') return '● Service in progress - Tap to track';
  if (status === 'completed') return 'Service completed - Tap to rate';
  if (status === 'rejected') return 'Booking rejected';
  return 'Booking status updated';
}

function getUpdatedAgoLabel(updatedAt: string | null, nowMs: number) {
  if (!updatedAt) {
    return 'Updated just now';
  }

  const updatedTime = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedTime)) {
    return 'Updated just now';
  }

  const secondsAgo = Math.max(0, Math.floor((nowMs - updatedTime) / 1000));
  return `Updated ${secondsAgo} seconds ago`;
}

function isValidCoordinatePair(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

function resolveProofImageUrl(proofImage?: string | null) {
  const value = typeof proofImage === 'string' ? proofImage.trim() : '';
  if (!value || value.toLowerCase() === 'null') {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/${value}`;
}

function EmergencyAlertButton({
  subtitle,
  onPress,
  disabled = false,
}: {
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.03,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.sosContainer}>
      <Animated.View style={[styles.sosPulseWrap, { transform: [{ scale: pulse }] }]}>
        <Pressable
          style={({ pressed }) => [
            styles.sosButton,
            pressed && styles.sosButtonPressed,
            disabled && styles.sosButtonDisabled,
          ]}
          onPress={onPress}
          disabled={disabled}
        >
          <View style={styles.sosButtonRow}>
            <Ionicons name="warning" size={22} color="#ffffff" />
            <Text style={styles.sosButtonText}>SOS EMERGENCY</Text>
          </View>
        </Pressable>
      </Animated.View>
      <Text style={styles.sosSubtitle}>{subtitle}</Text>
    </View>
  );
}

function PulsingDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.25,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return <Animated.View style={[styles.pulsingDot, { transform: [{ scale: pulse }] }]} />;
}

async function fetchAssignedBookings(token: string): Promise<AssignedBooking[]> {
  const url = `${API_BASE_URL}/bookings/assigned/`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    throw makeUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function fetchCareseekerBookings(token: string): Promise<AssignedBooking[]> {
  const url = `${API_BASE_URL}/careseeker/bookings/`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: addMobileClientHeader({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
  });

  if (response.status === 401) {
    throw makeUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function fetchCareseekerBooking(token: string, bookingId: number): Promise<AssignedBooking> {
  const url = `${API_BASE_URL}/careseeker/bookings/${bookingId}/`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: addMobileClientHeader({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
  });

  if (response.status === 401) {
    throw makeUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function updateBookingStatus(
  token: string,
  bookingId: number,
  nextStatus: 'accepted' | 'rejected' | 'in_progress' | 'awaiting_confirmation' | 'completed',
  includeTimestamp: boolean = true,
) {
  const url = `${API_BASE_URL}/bookings/${bookingId}/update-status/`;
  const bodyPayload: Record<string, string> = { status: nextStatus };
  if (includeTimestamp) {
    bodyPayload.timestamp = new Date().toISOString();
  }

  const response = await fetchWithTimeout(url, {
    method: 'PATCH',
    headers: addMobileClientHeader({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function sendCaregiverLocation(
  token: string,
  bookingId: number,
  coords: Coordinates,
): Promise<CaregiverLocationResponse> {
  const url = `${API_BASE_URL}/bookings/${bookingId}/update-location/`;
  const response = await fetchWithTimeout(url, {
    method: 'PATCH',
    headers: addMobileClientHeader({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function fetchCaregiverLocation(
  token: string,
  bookingId: number,
): Promise<CaregiverLocationResponse> {
  const url = `${API_BASE_URL}/bookings/${bookingId}/caregiver-location/`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: addMobileClientHeader({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function confirmCareseekerCompletion(token: string, bookingId: number) {
  const url = `${API_BASE_URL}/bookings/${bookingId}/confirm-completion/`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: addMobileClientHeader({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function fetchReviewBookingStatus(token: string, bookingId: number): Promise<{ has_review: boolean; review_id?: number | null }> {
  const url = `${API_BASE_URL}/reviews/booking/${bookingId}/status/`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: addMobileClientHeader({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
  });

  if (response.status === 401) {
    throw makeUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function registerDevicePushToken(token: string, role?: string) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole !== 'caregiver' && normalizedRole !== 'careseeker') {
    return;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();

    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    const configuredProjectId =
      Constants.expoConfig?.extra?.eas?.projectId || '863b16bc-e7f8-4f76-ba42-efc1e8254895';
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: configuredProjectId,
    });
    const pushToken = tokenData.data;

    console.log('[PUSH] Token:', pushToken);

    if (pushToken) {
      await fetchWithTimeout(
        `${API_BASE_URL}/user/save-push-token/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ push_token: pushToken }),
        }
      );
      console.log('[PUSH] Saved successfully');
    }
  } catch (error) {
    console.log('[PUSH] Error:', error);
  }
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [savedToken, savedRole, savedUser] = await Promise.all([
          AsyncStorage.getItem(JWT_TOKEN_KEY),
          AsyncStorage.getItem(USER_ROLE_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (savedToken && savedRole) {
          const parsedUser = savedUser ? JSON.parse(savedUser) : null;
          const normalizedRole = normalizeRole(savedRole);

          try {
            // Validate stored token before entering the authenticated app.
            await fetchUserProfile(savedToken);
          } catch (error) {
            if (isUnauthorizedError(error)) {
              await clearPersistedAuthState();
              return;
            }
          }

          setToken(savedToken);
          setUser({
            email: parsedUser?.email ?? '',
            name: parsedUser?.name ?? 'User',
            role: normalizedRole,
          });
        } else {
          const fallbackToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
          const fallbackUser = await AsyncStorage.getItem(AUTH_USER_KEY);
          if (fallbackToken && fallbackUser) {
            try {
              await fetchUserProfile(fallbackToken);
              setToken(fallbackToken);
              setUser(JSON.parse(fallbackUser));
            } catch (error) {
              if (isUnauthorizedError(error)) {
                await clearPersistedAuthState();
                return;
              }

              setToken(fallbackToken);
              setUser(JSON.parse(fallbackUser));
            }
          }
        }
      } catch {
        await clearPersistedAuthState();
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const syncPushToken = async () => {
      if (!token || !user) {
        return;
      }

      try {
        await registerDevicePushToken(token, user.role);
      } catch (error) {
        console.log('Push token registration failed', error);
      }
    };

    syncPushToken();
  }, [token, user]);

  const login = useCallback(async (email: string, password: string) => {
    const url = `${API_BASE_URL}/user/login/`;
    const body = { email, password };

    console.log(`[API] POST ${url}`);
    console.log(`[API] Request body:`, body);

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: addMobileClientHeader({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      console.log(`[API] Login successful:`, { email, role: data?.role });

      const role = normalizeRole(data?.role ?? data?.user?.role);
      if (role !== 'caregiver' && role !== 'careseeker') {
        throw new Error('This mobile app currently supports caregiver and careseeker accounts only.');
      }

      const accessToken = data?.token?.access ?? data?.token ?? data?.access ?? data?.access_token;
      if (!accessToken) {
        throw new Error('Authentication token missing from login response.');
      }

      const profile = await fetchUserProfile(accessToken);
      const authUser: AuthUser = {
        email: data?.email ?? email,
        name: data?.name ?? profile?.username ?? email.split('@')[0],
        role,
      };

      await persistAuthState(accessToken, role, authUser);

      setToken(accessToken);
      setUser(authUser);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Cannot connect to server. Please check your connection.');
        }
      }
      throw error;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, role: string) => {
    const url = `${API_BASE_URL}/user/register/`;
    const body = {
      username: name,
      email,
      password,
      role: normalizeRole(role) || 'careseeker',
    };

    console.log(`[API] POST ${url}`);
    console.log(`[API] Request body:`, body);

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      console.log(`[API] Signup successful`, data);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Cannot connect to server. Please check your connection.');
        }
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearPersistedAuthState();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, isBootstrapping, login, signup, logout }),
    [isBootstrapping, login, logout, signup, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AuthScreen({ mode, onSubmit, onSignupSuccess, onSwitch }: {
  mode: 'login' | 'signup';
  onSubmit: (values: { name?: string; email: string; password: string; role?: string }) => Promise<void>;
  onSignupSuccess?: (email: string) => void;
  onSwitch: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('careseeker');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = mode === 'signup';

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (isSignup && !name.trim())) {
      Alert.alert('Missing fields', 'Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name, email, password, role });
      if (isSignup) {
        if (onSignupSuccess) {
          onSignupSuccess(email.trim());
        } else {
          Alert.alert(
            'Signup complete',
            'Account created. If OTP verification is enabled, verify your email then login.',
          );
          setName('');
          setEmail('');
          setPassword('');
          setRole('careseeker');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.authBackground} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <Image
            source={require('./assets/carenest-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.divider} />
        </View>

        <View style={styles.authCard}>
          <Text style={styles.authTitle}>
            {isSignup ? 'Create an account' : 'Welcome Back'}
          </Text>
          <Text style={styles.authSubtitle}>
            {isSignup ? 'Welcome to CareNest' : 'Log in to your account'}
          </Text>

          {isSignup ? (
            <View style={styles.authFieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                placeholder="Enter your username"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholderTextColor="#94a3b8"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField((prev) => (prev === 'name' ? null : prev))}
              />
            </View>
          ) : null}

          <View style={styles.authFieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, focusedField === 'email' && styles.inputFocused]}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField((prev) => (prev === 'email' ? null : prev))}
            />
          </View>

          <View style={styles.authFieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.passwordContainer, focusedField === 'password' && styles.inputFocused]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#94a3b8"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField((prev) => (prev === 'password' ? null : prev))}
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
          </View>

          {!isSignup ? (
            <Pressable style={styles.forgotPasswordWrap}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </Pressable>
          ) : null}

          {isSignup ? (
            <View style={styles.authFieldGroup}>
              <Text style={styles.fieldLabel}>Role</Text>
              <View style={[styles.pickerContainer, focusedField === 'role' && styles.inputFocused]}>
                <Picker
                  selectedValue={role}
                  onValueChange={setRole}
                  style={styles.picker}
                  onFocus={() => setFocusedField('role')}
                >
                  <Picker.Item label="Careseeker" value="careseeker" />
                  <Picker.Item label="Caregiver" value="caregiver" />
                </Picker>
              </View>
            </View>
          ) : null}

          <Pressable
            style={[styles.authSubmitButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignup ? 'Sign Up' : 'Log In'}
              </Text>
            )}
          </Pressable>

          <Pressable style={styles.authSwitchWrap} onPress={onSwitch}>
            {isSignup ? (
              <Text style={styles.authSwitchText}>
                Already have an account? <Text style={styles.authSwitchAction}>Log In</Text>
              </Text>
            ) : (
              <Text style={styles.authSwitchText}>
                Don&apos;t have an account? <Text style={styles.authSwitchAction}>Sign Up</Text>
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  return (
    <AuthScreen
      mode="login"
      onSubmit={({ email, password }) => login(email, password)}
      onSwitch={() => navigation.navigate('Signup')}
    />
  );
}

function SignupScreen({ navigation }: any) {
  const { signup } = useAuth();
  return (
    <AuthScreen
      mode="signup"
      onSubmit={({ name, email, password, role }) => signup(name ?? '', email, password, role ?? 'careseeker')}
      onSignupSuccess={(email) => navigation.navigate('OTPVerification', { email })}
      onSwitch={() => navigation.navigate('Login')}
    />
  );
}

function OTPVerificationScreen({ route, navigation }: any) {
  const email = route.params?.email ?? '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim() || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the OTP sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/user/verify-otp/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp }),
        }
      );

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      Alert.alert(
        'Verified!',
        'Your account has been verified. Please login.',
        [{ text: 'Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/user/resend-otp/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      Alert.alert('OTP Sent', 'A new OTP has been sent to your email.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not resend OTP.';
      Alert.alert('Error', message);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.authBackground}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('./assets/carenest-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.divider} />
        </View>

        <View style={styles.authCard}>
          <Text style={styles.authTitle}>Verify Your Email</Text>
          <Text style={styles.authSubtitle}>
            Enter the OTP sent to {email}
          </Text>

          <TextInput
            style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
            placeholder="000000"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholderTextColor="#cbd5e1"
          />

          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={styles.primaryButtonText}>Verify OTP</Text>
            }
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={handleResend}
            disabled={resending}
          >
            <Text style={styles.linkText}>
              {resending ? 'Sending...' : 'Resend OTP'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Back to Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CaregiverDashboardScreen({ navigation }: any) {
  const { logout, user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AssignedBooking[]>([]);

  const loadBookings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAssignedBookings(token);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await logout();
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to load bookings';
      setLoadError(message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadBookings();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadBookings]);

  const stats = useMemo(() => {
    const activeBookings = bookings.filter((booking) => (
      booking.status === 'accepted' ||
      booking.status === 'in_progress' ||
      booking.status === 'awaiting_confirmation' ||
      booking.status === 'completion_requested'
    )).length;

    const pendingRequests = bookings.filter((booking) => booking.status === 'pending').length;
    const completedServices = bookings.filter((booking) => booking.status === 'completed').length;

    return [
      { label: 'Active Bookings', value: activeBookings, icon: 'briefcase-outline' as const, iconColor: '#3b82f6' },
      { label: 'Pending Requests', value: pendingRequests, icon: 'time-outline' as const, iconColor: '#f97316' },
      { label: 'Completed Services', value: completedServices, icon: 'checkmark-done-outline' as const, iconColor: '#16a34a' },
      { label: 'Total Care Sessions', value: bookings.length, icon: 'layers-outline' as const, iconColor: '#22c55e' },
    ];
  }, [bookings]);

  const recentBooking = useMemo(() => getMostRecentBooking(bookings), [bookings]);

  const loadingState = (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingTop: 60,
        backgroundColor: '#f0fdf4',
      }}
    >
      <ActivityIndicator size="large" color="#22c55e" />
      <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>Loading bookings...</Text>
      <Text
        style={{
          color: '#94a3b8',
          fontSize: 12,
          textAlign: 'center',
          paddingHorizontal: 32,
        }}
      >
        This may take a moment if server is starting up
      </Text>
    </View>
  );

  const errorState = (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingTop: 60,
        backgroundColor: '#f0fdf4',
      }}
    >
      <Text style={{ fontSize: 32 }}>⚠️</Text>
      <Text
        style={{
          color: '#1e3a5f',
          fontSize: 16,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        Could not load bookings
      </Text>
      <Text
        style={{
          color: '#64748b',
          fontSize: 13,
          textAlign: 'center',
          paddingHorizontal: 32,
        }}
      >
        {loadError}
      </Text>
      <Pressable
        onPress={loadBookings}
        style={{
          backgroundColor: '#22c55e',
          paddingHorizontal: 24,
          paddingVertical: 10,
          borderRadius: 8,
          marginTop: 8,
        }}
      >
        <Text
          style={{
            color: '#ffffff',
            fontWeight: '700',
          }}
        >
          Try Again
        </Text>
      </Pressable>
    </View>
  );

  if (loading && bookings.length === 0 && !loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {loadingState}
      </SafeAreaView>
    );
  }

  if (loadError && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {errorState}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={[]}
        keyExtractor={(item, index) => `${index}`}
        refreshing={loading}
        onRefresh={loadBookings}
        renderItem={() => null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.dashboardContainer}
        ListHeaderComponent={
          <View style={styles.dashboardHomeWrap}>
            <View style={styles.dashboardTopRow}>
              <View>
                <Text style={styles.dashboardGreeting}>Hello, {user?.name ?? 'Caregiver'}</Text>
                <Text style={styles.dashboardRoleText}>Role: {getRoleDisplayLabel(user?.role)}</Text>
              </View>
              <Pressable onPress={logout} style={styles.dashboardLogoutIconWrap}>
                <Ionicons name="log-out-outline" size={22} color="#1e3a5f" />
              </Pressable>
            </View>

            <View style={styles.statsGrid}>
              {stats.map((card) => (
                <View key={card.label} style={styles.statCard}>
                  <View style={styles.statCardRow}>
                    <View style={styles.statIconWrap}>
                      <Ionicons name={card.icon} size={20} color={card.iconColor} />
                    </View>
                    <View style={styles.statTextWrap}>
                      <Text style={styles.statValue}>{card.value}</Text>
                      <Text style={styles.statLabel}>{card.label}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.recentHeaderRow}>
              <Text style={styles.recentHeading}>Recent Bookings</Text>
              <Pressable onPress={() => navigation.getParent()?.navigate('Booking Requests')}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>

            {loading && bookings.length > 0 ? (
              <ActivityIndicator color="#22c55e" />
            ) : null}

            {recentBooking ? (
              <Pressable
                style={styles.recentBookingCard}
                onPress={() => navigation.navigate('BookingDetail', { bookingId: recentBooking.id })}
              >
                <View style={styles.polishedBookingHeader}>
                  <Text style={styles.polishedBookingTitle}>Careseeker: {recentBooking.family_name ?? 'Unknown'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(recentBooking.status) }]}> 
                    <Text style={styles.statusBadgeText}>{getStatusLabel(recentBooking.status)}</Text>
                  </View>
                </View>

                <View style={styles.bookingDetailSection}>
                  <Text style={styles.bookingDetailLabel}>SERVICE TYPE</Text>
                  <Text style={styles.bookingDetailValue}>{getBookingServiceType(recentBooking)}</Text>
                </View>

                <View style={styles.bookingDetailSection}>
                  <Text style={styles.bookingDetailLabel}>DATE & TIME</Text>
                  <Text style={styles.bookingDetailValue}>{getBookingDateTimeLabel(recentBooking)}</Text>
                </View>

                <View style={styles.recentBookingFooter}>
                  <Text style={styles.recentPriceText}>{getBookingPriceLabel(recentBooking)}</Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.recentEmptyCard}>
                <Text style={styles.mutedText}>No recent bookings found.</Text>
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function BookingDetailScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const bookingId = Number(route.params?.bookingId);
  const [booking, setBooking] = useState<AssignedBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const locationSendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCoordsRef = useRef<Coordinates | null>(null);

  const now = new Date();
  const bookedDateTime = booking ? getBookingStartDateTime(booking) : null;
  const checkInWindowStart = bookedDateTime ? new Date(bookedDateTime.getTime() - 30 * 60 * 1000) : null;
  const canCheckIn = Boolean(booking?.status === 'accepted' && checkInWindowStart && now >= checkInWindowStart);
  const canCheckOutByDuration = Boolean(
    booking?.status === 'in_progress' &&
      booking.check_in_time &&
      booking.duration_hours &&
      now >= new Date(new Date(booking.check_in_time).getTime() + booking.duration_hours * 60 * 60 * 1000),
  );

  const cardStyle = {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  } as const;

  const stopLocationSharing = useCallback(() => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }

    if (locationSendIntervalRef.current) {
      clearInterval(locationSendIntervalRef.current);
      locationSendIntervalRef.current = null;
    }

    latestCoordsRef.current = null;
    setIsLocationSharing(false);
  }, []);

  const startLocationSharing = useCallback(
    async (activeBookingId: number, permissionAlreadyGranted: boolean = false) => {
      if (!token) {
        return;
      }

      if (locationWatcherRef.current || locationSendIntervalRef.current) {
        setIsLocationSharing(true);
        return;
      }

      if (!permissionAlreadyGranted) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          throw new Error('Location permission is required to share your live location.');
        }
      }

      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      latestCoordsRef.current = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
      };

      await sendCaregiverLocation(token, activeBookingId, latestCoordsRef.current);

      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 0,
        },
        (position) => {
          latestCoordsRef.current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        },
      );

      locationSendIntervalRef.current = setInterval(() => {
        if (!latestCoordsRef.current) {
          return;
        }

        sendCaregiverLocation(token, activeBookingId, latestCoordsRef.current).catch((error) => {
          console.log('Location send error', error);
        });
      }, 10000);

      setIsLocationSharing(true);
    },
    [token],
  );

  const loadBooking = useCallback(async () => {
    if (!token || !bookingId) return;

    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAssignedBookings(token);
      const found = (Array.isArray(data) ? data : []).find((item: AssignedBooking) => item.id === bookingId);
      if (!found) {
        Alert.alert('Not found', 'Booking not found or no longer assigned to you.');
        navigation.goBack();
        return;
      }
      setBooking(found);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load booking';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigation, token]);

  useFocusEffect(
    useCallback(() => {
      loadBooking();
      const intervalId = setInterval(() => {
        loadBooking();
      }, 10000);

      return () => clearInterval(intervalId);
    }, [loadBooking]),
  );

  useEffect(() => {
    if (!booking) {
      stopLocationSharing();
      return;
    }

    if (booking.status === 'in_progress') {
      startLocationSharing(booking.id).catch((error) => {
        const message = error instanceof Error ? error.message : 'Unable to start location sharing.';
        Alert.alert('Location sharing', message);
      });
      return;
    }

    stopLocationSharing();
  }, [booking?.id, booking?.status, startLocationSharing, stopLocationSharing]);

  useEffect(() => {
    return () => {
      stopLocationSharing();
    };
  }, [stopLocationSharing]);

  const handleStatusUpdate = async (
    nextStatus: 'accepted' | 'rejected' | 'in_progress' | 'awaiting_confirmation' | 'completed',
  ) => {
    if (!token || !booking) return;

    if ((nextStatus === 'completed' || nextStatus === 'awaiting_confirmation') && !canCheckOutByDuration) {
      Alert.alert('Too early', 'You cannot check out before the service duration is complete');
      return;
    }

    let permissionGrantedForCheckIn = false;
    if (nextStatus === 'in_progress') {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to share live location.');
        return;
      }
      permissionGrantedForCheckIn = true;
    }

    setStatusUpdating(true);
    try {
      const updated = await updateBookingStatus(
        token,
        booking.id,
        nextStatus,
        nextStatus === 'in_progress' || nextStatus === 'completed' || nextStatus === 'awaiting_confirmation',
      );
      setBooking(updated);

      if (nextStatus === 'accepted') {
        Alert.alert('Success', 'Booking Accepted!');
      } else if (nextStatus === 'rejected') {
        Alert.alert('Success', 'Booking Rejected');
      } else if (nextStatus === 'in_progress') {
        await startLocationSharing(updated.id, permissionGrantedForCheckIn);
        Alert.alert('Success', 'Checked in successfully.');
      } else if (nextStatus === 'awaiting_confirmation') {
        stopLocationSharing();
        Alert.alert('Success', 'Service marked complete and sent for confirmation.');
      } else {
        stopLocationSharing();
        Alert.alert('Success', 'Checked out successfully.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update booking status.';
      Alert.alert('Error', message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUploadProof = async () => {
    if (!token || !booking) return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to upload proof.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('proof_image', {
        uri: asset.uri,
        name: `booking-proof-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      setUploading(true);
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/upload-proof/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      setBooking(data);
      Alert.alert('Success', 'Proof uploaded successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Proof upload failed.';
      Alert.alert('Error', message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButtonRow}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        {loading || !booking ? (
          <ActivityIndicator size="large" color="#22c55e" />
        ) : (
          <>
            <View style={styles.headerCardStyle}>
              <Text style={styles.bookingIdStyle}>Booking Detail</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
              </View>
            </View>

            <View style={styles.infoCardStyle}>
              <Text style={styles.sectionLabelStyle}>👤 CARESEEKER DETAILS</Text>
              <Text style={styles.nameStyle}>{booking.family_name ?? 'Unknown'}</Text>
              <Text style={styles.detailRowStyle}>
                You are providing service to {booking.family_name ?? 'this careseeker'}.
              </Text>
              {booking.emergency_contact_phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${booking.emergency_contact_phone}`)}
                  style={styles.callButtonStyle}
                >
                  <Text style={styles.callIconStyle}>📞</Text>
                  <Text style={styles.callTextStyle}>Call careseeker: {booking.emergency_contact_phone}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.infoCardStyle}>
              <Text style={styles.sectionLabelStyle}>📋 SERVICE DETAILS</Text>
              <Text style={styles.detailRowStyle}>
                📅 {booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A'} at {booking.start_time ?? 'N/A'}
              </Text>
              <Text style={styles.detailRowStyle}>⏱ Duration: {booking.duration_hours ?? 0} hours</Text>
              <Text style={styles.detailRowStyle}>📍 {booking.service_address ?? 'Address unavailable'}</Text>
              {booking.check_in_time ? (
                <Text style={[styles.detailRowStyle, { color: '#16a34a' }]}>
                  ✓ Checked in: {new Date(booking.check_in_time).toLocaleString()}
                </Text>
              ) : null}
              {booking.check_out_time ? (
                <Text style={styles.detailRowStyle}>
                  ✓ Checked out: {new Date(booking.check_out_time).toLocaleString()}
                </Text>
              ) : null}
            </View>

            {booking.status === 'in_progress' && isLocationSharing ? (
              <View style={styles.locationSharingRow}>
                <View style={styles.locationSharingDot} />
                <Text style={styles.locationSharingText}>Sharing location with careseeker</Text>
              </View>
            ) : null}

            {booking.status === 'awaiting_confirmation' || booking.status === 'completion_requested' ? (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fed7aa' }}>
                <Text style={{ color: '#9a3412', fontSize: 13, fontWeight: '700' }}>Awaiting Confirmation</Text>
                <Text style={{ color: '#9a3412', fontSize: 13, marginTop: 4 }}>
                  The service is complete and the careseeker needs to confirm it.
                </Text>
              </View>
            ) : null}

            {booking.status === 'pending' ? (
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.primaryButton, styles.acceptButton, styles.actionButtonHalf, statusUpdating && styles.primaryButtonDisabled]}
                  onPress={() => handleStatusUpdate('accepted')}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Accept Booking</Text>}
                </Pressable>

                <Pressable
                  style={[styles.primaryButton, styles.rejectButton, styles.actionButtonHalf, statusUpdating && styles.primaryButtonDisabled]}
                  onPress={() => handleStatusUpdate('rejected')}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Reject Booking</Text>}
                </Pressable>
              </View>
            ) : null}

            {booking.status === 'accepted' ? (
              <>
                <Pressable
                  style={[styles.primaryButton, (!canCheckIn || statusUpdating) && styles.primaryButtonDisabled]}
                  onPress={() => handleStatusUpdate('in_progress')}
                  disabled={statusUpdating || !canCheckIn}
                >
                  {statusUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Check In</Text>}
                </Pressable>

                {!canCheckIn && bookedDateTime ? (
                  <Text style={styles.inlineInfoText}>
                    Check In available at {bookedDateTime.toLocaleString()}
                  </Text>
                ) : null}
              </>
            ) : null}

            {booking.status === 'in_progress' ? (
              <>
                <Pressable
                  style={[styles.primaryButton, (!canCheckOutByDuration || statusUpdating) && styles.primaryButtonDisabled]}
                  onPress={() => handleStatusUpdate('completed')}
                  disabled={statusUpdating || !canCheckOutByDuration}
                >
                  {statusUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Check Out</Text>}
                </Pressable>

                {!canCheckOutByDuration ? (
                  <Text style={styles.inlineInfoText}>
                    You cannot check out before the service duration is complete
                  </Text>
                ) : null}

                <Pressable
                  style={[styles.secondaryButton, uploading && styles.primaryButtonDisabled]}
                  onPress={handleUploadProof}
                  disabled={uploading}
                >
                  {uploading ? <ActivityIndicator color="#1e3a5f" /> : <Text style={styles.secondaryButtonText}>Upload Proof</Text>}
                </Pressable>
              </>
            ) : null}

            {booking.status === 'completed' ? (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>Completed</Text>
              </View>
            ) : null}

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CaregiverHomeStackNavigator() {
  return (
    <CaregiverHomeStack.Navigator screenOptions={{ headerShown: false }}>
      <CaregiverHomeStack.Screen name="Dashboard" component={CaregiverDashboardScreen} />
      <CaregiverHomeStack.Screen name="BookingDetail" component={BookingDetailScreen} />
    </CaregiverHomeStack.Navigator>
  );
}

function CareseekerDashboardScreen({ navigation }: any) {
  const { user, logout, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<AssignedBooking[]>([]);

  const loadBookings = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await fetchCareseekerBookings(token);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await logout();
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to load bookings.';
      Alert.alert('Error', message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadBookings();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadBookings]);

  const stats = useMemo(() => {
    const activeBookings = bookings.filter((booking) => (
      booking.status === 'accepted' ||
      booking.status === 'in_progress' ||
      booking.status === 'awaiting_confirmation' ||
      booking.status === 'completion_requested'
    )).length;

    const pendingRequests = bookings.filter((booking) => booking.status === 'pending').length;
    const completedServices = bookings.filter((booking) => booking.status === 'completed').length;

    return [
      { label: 'Active Bookings', value: activeBookings, icon: 'briefcase-outline' as const, iconColor: '#3b82f6' },
      { label: 'Pending Requests', value: pendingRequests, icon: 'time-outline' as const, iconColor: '#f97316' },
      { label: 'Completed Services', value: completedServices, icon: 'checkmark-done-outline' as const, iconColor: '#16a34a' },
      { label: 'Total Care Sessions', value: bookings.length, icon: 'layers-outline' as const, iconColor: '#22c55e' },
    ];
  }, [bookings]);

  const recentBooking = useMemo(() => getMostRecentBooking(bookings), [bookings]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={[]}
        keyExtractor={(item, index) => `${index}`}
        refreshing={loading}
        onRefresh={loadBookings}
        renderItem={() => null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.dashboardContainer}
        ListHeaderComponent={
          <View style={styles.dashboardHomeWrap}>
            <View style={styles.dashboardTopRow}>
              <View>
                <Text style={styles.dashboardGreeting}>Hello, {user?.name ?? 'Guest'}</Text>
                <Text style={styles.dashboardRoleText}>Role: {getRoleDisplayLabel(user?.role)}</Text>
              </View>
              <Pressable onPress={logout} style={styles.dashboardLogoutIconWrap}>
                <Ionicons name="log-out-outline" size={22} color="#1e3a5f" />
              </Pressable>
            </View>

            <View style={styles.statsGrid}>
              {stats.map((card) => (
                <View key={card.label} style={styles.statCard}>
                  <View style={styles.statCardRow}>
                    <View style={styles.statIconWrap}>
                      <Ionicons name={card.icon} size={20} color={card.iconColor} />
                    </View>
                    <View style={styles.statTextWrap}>
                      <Text style={styles.statValue}>{card.value}</Text>
                      <Text style={styles.statLabel}>{card.label}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.recentHeaderRow}>
              <Text style={styles.recentHeading}>Recent Bookings</Text>
              <Pressable onPress={() => navigation.getParent()?.navigate('My Bookings')}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>

            {loading && bookings.length > 0 ? (
              <ActivityIndicator color="#22c55e" />
            ) : null}

            {recentBooking ? (
              <Pressable
                style={styles.recentBookingCard}
                onPress={() => navigation.navigate('BookingDetail', { bookingId: recentBooking.id })}
              >
                <View style={styles.polishedBookingHeader}>
                  <Text style={styles.polishedBookingTitle}>Caregiver: {recentBooking.caregiver_name ?? 'Unknown'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(recentBooking.status) }]}> 
                    <Text style={styles.statusBadgeText}>{getStatusLabel(recentBooking.status)}</Text>
                  </View>
                </View>

                <View style={styles.bookingDetailSection}>
                  <Text style={styles.bookingDetailLabel}>SERVICE TYPE</Text>
                  <Text style={styles.bookingDetailValue}>{getBookingServiceType(recentBooking)}</Text>
                </View>

                <View style={styles.bookingDetailSection}>
                  <Text style={styles.bookingDetailLabel}>DATE & TIME</Text>
                  <Text style={styles.bookingDetailValue}>{getBookingDateTimeLabel(recentBooking)}</Text>
                </View>

                <View style={styles.recentBookingFooter}>
                  <Text style={styles.recentPriceText}>{getBookingPriceLabel(recentBooking)}</Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.recentEmptyCard}>
                <Text style={styles.mutedText}>No recent bookings found.</Text>
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function CareseekerBookingDetailScreen({ route, navigation }: any) {
  const { token, user } = useAuth();
  const bookingId = Number(route.params?.bookingId);
  const [booking, setBooking] = useState<AssignedBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caregiverLocation, setCaregiverLocation] = useState<Coordinates | null>(null);
  const [caregiverUpdatedAt, setCaregiverUpdatedAt] = useState<string | null>(null);
  const [locationClockMs, setLocationClockMs] = useState(Date.now());
  const [showFullImage, setShowFullImage] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [reviewExists, setReviewExists] = useState(false);

  const now = new Date();
  const bookedDateTime = booking ? getBookingStartDateTime(booking) : null;
  const checkInWindowStart = bookedDateTime ? new Date(bookedDateTime.getTime() - 30 * 60 * 1000) : null;
  const canCheckIn = Boolean(booking?.status === 'accepted' && checkInWindowStart && now >= checkInWindowStart);
  const canCheckOutByDuration = Boolean(
    booking?.status === 'in_progress' &&
      booking.check_in_time &&
      booking.duration_hours &&
      now >= new Date(new Date(booking.check_in_time).getTime() + booking.duration_hours * 60 * 60 * 1000),
  );
  const statusUpdating = updating;
  const caregiverMapRegion = caregiverLocation
    ? {
        latitude: caregiverLocation.latitude,
        longitude: caregiverLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : null;
  const isLocationSharing = Boolean(booking?.status === 'in_progress' && caregiverLocation);
  const proofImageUrl = resolveProofImageUrl(booking?.proof_image);
  const hasProofImage = Boolean(proofImageUrl);
  const proofImageSource = proofImageUrl ? { uri: proofImageUrl } : undefined;
  const isCaregiverViewer = normalizeRole(user?.role) === 'caregiver';

  const cardStyle = {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  } as const;

  const loadBooking = useCallback(async () => {
    if (!token || !bookingId) return;

    setLoading(true);
    try {
      const data = await fetchCareseekerBooking(token, bookingId);
      setBooking(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load booking.';
      Alert.alert('Error', message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigation, token]);

  useFocusEffect(
    useCallback(() => {
      loadBooking();
      const intervalId = setInterval(loadBooking, 10000);
      return () => clearInterval(intervalId);
    }, [loadBooking]),
  );

  const loadLiveLocation = useCallback(async () => {
    if (!token || !booking || booking.status !== 'in_progress') {
      return;
    }

    try {
      const data = await fetchCaregiverLocation(token, booking.id);
      if (data.is_available && isValidCoordinatePair(data.latitude, data.longitude)) {
        setCaregiverLocation({
          latitude: data.latitude as number,
          longitude: data.longitude as number,
        });
        setCaregiverUpdatedAt(data.updated_at);
      } else {
        setCaregiverLocation(null);
        setCaregiverUpdatedAt(null);
      }
    } catch (error) {
      console.log('Caregiver location fetch failed', error);
    }
  }, [booking, token]);

  const submitRating = async () => {
    if (!token || !booking) return;
    if (!booking.caregiver) {
      Alert.alert('Error', 'Missing caregiver reference for this booking. Please refresh and try again.');
      return;
    }

    setSubmittingRating(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/reviews/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          caregiver_id: booking.caregiver,
          rating,
          review_text: reviewText,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      setRatingSubmitted(true);
      setReviewExists(true);
      setShowRating(false);
      Alert.alert('Thank You! ⭐', 'Your review has been submitted successfully.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Dashboard');
          },
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit review.';
      Alert.alert('Error', message);
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    if (!booking || booking.status !== 'in_progress') {
      setCaregiverLocation(null);
      setCaregiverUpdatedAt(null);
      return;
    }

    loadLiveLocation();
    const intervalId = setInterval(loadLiveLocation, 10000);

    return () => clearInterval(intervalId);
  }, [booking?.status, booking?.id, loadLiveLocation]);

  useEffect(() => {
    if (!booking || booking.status !== 'in_progress') {
      return;
    }

    const intervalId = setInterval(() => {
      setLocationClockMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [booking?.status]);

  useEffect(() => {
    if (!token || !booking || booking.status !== 'completed') {
      setShowRating(false);
      return;
    }

    let isMounted = true;
    const checkReviewStatus = async () => {
      try {
        const statusData = await fetchReviewBookingStatus(token, booking.id);
        if (!isMounted) return;
        const exists = Boolean(statusData?.has_review);
        setReviewExists(exists);
        setRatingSubmitted(exists);
        setShowRating(!exists);
      } catch (error) {
        console.log('Review status check failed', error);
        if (isMounted) {
          setReviewExists(Boolean(booking.has_review));
          setRatingSubmitted(Boolean(booking.has_review));
          setShowRating(!booking.has_review);
        }
      }
    };

    checkReviewStatus();
    return () => {
      isMounted = false;
    };
  }, [token, booking?.id, booking?.status, booking?.has_review]);

  const caregiverUpdatedLabel = useMemo(
    () => getUpdatedAgoLabel(caregiverUpdatedAt, locationClockMs),
    [caregiverUpdatedAt, locationClockMs],
  );

  const handleConfirmCompletion = async () => {
    if (!token || !booking) return;

    setUpdating(true);
    try {
      const updated = await confirmCareseekerCompletion(token, booking.id);
      setBooking(updated);
      Alert.alert('Success', 'Completion confirmed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to confirm completion.';
      Alert.alert('Error', message);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (
    nextStatus: 'accepted' | 'rejected' | 'in_progress' | 'awaiting_confirmation' | 'completed',
  ) => {
    if (!token || !booking) return;

    if ((nextStatus === 'completed' || nextStatus === 'awaiting_confirmation') && !canCheckOutByDuration) {
      Alert.alert('Too early', 'You cannot check out before the service duration is complete');
      return;
    }

    setUpdating(true);
    try {
      const updated = await updateBookingStatus(
        token,
        booking.id,
        nextStatus,
        nextStatus === 'in_progress' || nextStatus === 'completed' || nextStatus === 'awaiting_confirmation',
      );
      setBooking(updated);

      if (nextStatus === 'accepted') {
        Alert.alert('Success', 'Booking Accepted!');
      } else if (nextStatus === 'rejected') {
        Alert.alert('Success', 'Booking Rejected');
      } else if (nextStatus === 'in_progress') {
        Alert.alert('Success', 'Checked in successfully.');
      } else if (nextStatus === 'awaiting_confirmation') {
        Alert.alert('Success', 'Service marked complete and sent for confirmation.');
      } else {
        Alert.alert('Success', 'Checked out successfully.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update booking status.';
      Alert.alert('Error', message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadProof = async () => {
    if (!token || !booking) return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to upload proof.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('proof_image', {
        uri: asset.uri,
        name: `booking-proof-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      setUploading(true);
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/upload-proof/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      setBooking(data);
      Alert.alert('Success', 'Proof uploaded successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Proof upload failed.';
      Alert.alert('Error', message);
    } finally {
      setUploading(false);
    }
  };

  const handleEmergencyPress = useCallback(() => {
    if (!token || !booking) {
      Alert.alert('Auth required', 'Please login again to trigger an emergency.');
      return;
    }

    promptEmergencyConfirmation(async () => {
      try {
        await triggerEmergency(token, booking.id);
        Alert.alert('Success', 'Emergency alert sent. Help is on the way.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to trigger emergency.';
        Alert.alert('SOS Error', message);
      }
    });
  }, [booking, token]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 16, paddingBottom: 8 }}
      >
        <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '600' }}>← Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ backgroundColor: '#f0fdf4', flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {loading && !booking ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              paddingTop: 60,
              backgroundColor: '#f0fdf4',
            }}
          >
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>Loading bookings...</Text>
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 12,
                textAlign: 'center',
                paddingHorizontal: 32,
              }}
            >
              This may take a moment if server is starting up
            </Text>
          </View>
        ) : booking ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <View style={cardStyle}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#1e3a5f',
                  }}
                >
                  Booking Detail
                </Text>
                <View
                  style={{
                    backgroundColor: getStatusColor(booking.status),
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {getStatusLabel(booking.status)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={cardStyle}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#64748b',
                  letterSpacing: 1,
                }}
              >
                👤 CAREGIVER DETAILS
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#1e3a5f',
                }}
              >
                {booking.caregiver_name ?? 'Unknown'}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14 }}>
                Your caregiver is {booking.caregiver_name ?? 'assigned caregiver'}.
              </Text>
            </View>

            <View style={cardStyle}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#64748b',
                  letterSpacing: 1,
                }}
              >
                📋 SERVICE DETAILS
              </Text>

              <View style={{ gap: 6 }}>
                <Text style={{ color: '#475569', fontSize: 14 }}>
                  📅 {booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A'} at {booking.start_time ?? ''}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14 }}>
                  ⏱ Duration: {booking.duration_hours ?? 'N/A'} hours
                </Text>
                <Text style={{ color: '#475569', fontSize: 14 }}>
                  📍 {booking.service_address ?? 'Not specified'}
                </Text>
                {booking.check_in_time ? (
                  <Text style={{ color: '#16a34a', fontSize: 14 }}>
                    ✓ Checked in: {new Date(booking.check_in_time).toLocaleString()}
                  </Text>
                ) : null}
                {booking.check_out_time ? (
                  <Text style={{ color: '#475569', fontSize: 14 }}>
                    ✓ Checked out: {new Date(booking.check_out_time).toLocaleString()}
                  </Text>
                ) : null}
              </View>
            </View>

            {isCaregiverViewer && booking.status === 'in_progress' && isLocationSharing ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#dcfce7',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: '#16a34a',
                  }}
                />
                <Text
                  style={{
                    color: '#166534',
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Sharing live location with careseeker
                </Text>
              </View>
            ) : null}

            {isCaregiverViewer && booking.status === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#22c55e',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: statusUpdating ? 0.7 : 1,
                  }}
                  onPress={() => handleStatusUpdate('accepted')}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Accept Booking</Text>}
                </Pressable>

                <Pressable
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#dc2626',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: statusUpdating ? 0.7 : 1,
                  }}
                  onPress={() => handleStatusUpdate('rejected')}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Reject Booking</Text>}
                </Pressable>
              </View>
            ) : null}

            {isCaregiverViewer && booking.status === 'accepted' ? (
              <>
                <Pressable
                  style={{
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#22c55e',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: !canCheckIn || statusUpdating ? 0.7 : 1,
                  }}
                  onPress={() => handleStatusUpdate('in_progress')}
                  disabled={statusUpdating || !canCheckIn}
                >
                  {statusUpdating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Check In</Text>}
                </Pressable>

                {!canCheckIn && bookedDateTime ? (
                  <Text style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>
                    Check In available at {bookedDateTime.toLocaleString()}
                  </Text>
                ) : null}
              </>
            ) : null}

            {isCaregiverViewer && booking.status === 'in_progress' ? (
              <>
                <Pressable
                  style={{
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#22c55e',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: !canCheckOutByDuration || statusUpdating ? 0.7 : 1,
                    marginBottom: 12,
                  }}
                  onPress={() => handleStatusUpdate('awaiting_confirmation')}
                  disabled={statusUpdating || !canCheckOutByDuration}
                >
                  {statusUpdating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Complete Service</Text>}
                </Pressable>

                {!canCheckOutByDuration ? (
                  <Text style={{ color: '#475569', fontSize: 13, marginBottom: 12 }}>
                    You cannot check out before the service duration is complete
                  </Text>
                ) : null}

                <Pressable
                  style={{
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#f0fdf4',
                    borderWidth: 1,
                    borderColor: '#22c55e',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: uploading ? 0.7 : 1,
                  }}
                  onPress={handleUploadProof}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#22c55e" />
                  ) : (
                    <Text style={{ color: '#16a34a', fontWeight: '700' }}>Upload Proof</Text>
                  )}
                </Pressable>
              </>
            ) : null}

            {booking.status === 'completed' ? (
              <View
                style={{
                  marginTop: 10,
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                  backgroundColor: '#16a34a',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Completed</Text>
              </View>
            ) : null}

            {booking.status === 'completed' && reviewExists ? (
              <View style={styles.alreadyReviewedBadge}>
                <Text style={styles.alreadyReviewedBadgeText}>Already Reviewed</Text>
              </View>
            ) : null}

            {booking.status === 'awaiting_confirmation' || booking.status === 'completion_requested' ? (
              <View
                style={{
                  marginTop: 10,
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                  backgroundColor: '#f59e0b',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Awaiting Confirmation</Text>
              </View>
            ) : null}

            {hasProofImage ? (
              <View style={cardStyle}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 1 }}>📷 PROOF</Text>
                <Pressable onPress={() => setShowFullImage(true)}>
                  <Image source={proofImageSource} style={styles.previewImage} resizeMode="cover" />
                  <Text style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>Tap to view full screen</Text>
                </Pressable>
              </View>
            ) : null}

            {booking.status === 'in_progress' && caregiverLocation && caregiverMapRegion ? (
              <View style={styles.liveLocationPanel}>
                <View style={styles.liveLocationHeader}>
                  <View style={styles.locationSharingDot} />
                  <Text style={styles.liveLocationTitle}>Caregiver is on the way</Text>
                </View>
                <Text style={styles.liveLocationUpdatedText}>{caregiverUpdatedLabel}</Text>

                <MapView
                  style={styles.liveLocationMap}
                  initialRegion={{
                    ...caregiverMapRegion,
                  }}
                  region={caregiverMapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker coordinate={caregiverLocation} title="Your Caregiver" />
                </MapView>
              </View>
            ) : null}

            {booking.status === 'in_progress' ? (
              <View
                style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: 12,
                  padding: 16,
                  gap: 12,
                  borderWidth: 1,
                  borderColor: '#fed7aa',
                  marginTop: 12,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e3a5f' }}>Help & Safety</Text>
                <Text style={{ fontSize: 13, color: '#64748b' }}>
                  {booking.caregiver_name ?? 'Your caregiver'} is currently providing your service.
                </Text>

                <EmergencyAlertButton
                  subtitle="Sends alert to admin and caregiver immediately"
                  onPress={handleEmergencyPress}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {showFullImage && proofImageSource ? (
        <Modal visible={showFullImage} transparent>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.95)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Pressable
              onPress={() => setShowFullImage(false)}
              style={{
                position: 'absolute',
                top: 50,
                right: 20,
                padding: 10,
                zIndex: 10,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>✕ Close</Text>
            </Pressable>
            <Image
              source={proofImageSource}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          </View>
        </Modal>
      ) : null}

      {showRating && !ratingSubmitted ? (
        <Modal visible={showRating} transparent animationType="slide">
          <View style={styles.ratingOverlay}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
              style={styles.ratingKeyboardAvoider}
            >
              <View style={styles.ratingSheet}>
                <ScrollView
                  contentContainerStyle={styles.ratingSheetContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.ratingTitle}>Rate Your Experience</Text>
                  <Text style={styles.ratingSubtitle}>
                    How was {booking?.caregiver_name ?? 'your caregiver'}?
                  </Text>

                  <View style={styles.ratingStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable key={star} onPress={() => setRating(star)}>
                        <Text style={styles.ratingStar}>{star <= rating ? '⭐' : '☆'}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <TextInput
                    style={styles.ratingInput}
                    placeholder="Write a review (optional)"
                    value={reviewText}
                    onChangeText={setReviewText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor="#94a3b8"
                  />

                  <Pressable
                    style={[
                      styles.ratingSubmitButton,
                      (rating === 0 || submittingRating) && styles.primaryButtonDisabled,
                    ]}
                    disabled={rating === 0 || submittingRating}
                    onPress={submitRating}
                  >
                    {submittingRating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.ratingSubmitText}>Submit Review</Text>
                    )}
                  </Pressable>

                  <Pressable style={styles.ratingSkipWrap} onPress={() => setShowRating(false)}>
                    <Text style={styles.ratingSkipText}>Skip for now</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function CareseekerHomeStackNavigator() {
  return (
    <CareseekerHomeStack.Navigator screenOptions={{ headerShown: false }}>
      <CareseekerHomeStack.Screen name="Dashboard" component={CareseekerDashboardScreen} />
      <CareseekerHomeStack.Screen name="BookingDetail" component={CareseekerBookingDetailScreen} />
    </CareseekerHomeStack.Navigator>
  );
}

function AttendanceScreen() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);

  const handleAttendance = async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for attendance.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const action: AttendanceEntry['action'] = checkedIn ? 'Check-Out' : 'Check-In';
      const timestamp = new Date().toISOString();
      const entry: AttendanceEntry = {
        id: `${Date.now()}`,
        action,
        timestamp,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setEntries((prev) => [entry, ...prev]);
      setCheckedIn(!checkedIn);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${action} successful`,
          body: `${new Date(timestamp).toLocaleString()} at ${entry.latitude.toFixed(4)}, ${entry.longitude.toFixed(4)}`,
        },
        trigger: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to capture attendance.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.card}>
          <Text style={styles.heading}>Check-In / Check-Out</Text>
          <Text style={styles.mutedText}>GPS location and timestamp are captured automatically.</Text>

          <Pressable style={styles.primaryButton} onPress={handleAttendance} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{checkedIn ? 'Check Out Now' : 'Check In Now'}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {entries.length === 0 ? (
            <Text style={styles.mutedText}>No attendance records yet.</Text>
          ) : (
            entries.map((item) => (
              <View style={styles.listItem} key={item.id}>
                <Text style={styles.listTitle}>{item.action}</Text>
                <Text style={styles.listSubtitle}>{new Date(item.timestamp).toLocaleString()}</Text>
                <Text style={styles.listSubtitle}>
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProofUploadScreen() {
  const { token } = useAuth();
  const [lastMediaUri, setLastMediaUri] = useState<string | null>(null);
  const [lastMediaType, setLastMediaType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);

  const captureAndUpload = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to capture proof.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.7,
        videoMaxDuration: 30,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      setLastMediaUri(asset.uri);
      setLastMediaType(mediaType);

      if (!token) {
        Alert.alert('Auth required', 'Please login again to upload proof.');
        return;
      }

      setUploading(true);
      const extension = mediaType === 'video' ? 'mp4' : 'jpg';
      const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
      const formData = new FormData();

      formData.append('proof_file', {
        uri: asset.uri,
        name: `live-proof-${Date.now()}.${extension}`,
        type: mimeType,
      } as any);

      const url = `${API_BASE_URL}/bookings/live-proof/`;
      console.log(`[API] POST ${url}`);
      console.log(`[API] Uploading ${mediaType} file`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for upload

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(await parseError(response));
        }

        const data = await response.json();
        console.log(`[API] Upload successful:`, data);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Live proof uploaded',
            body: 'Your latest media proof was uploaded successfully.',
          },
          trigger: null,
        });

        Alert.alert('Success', 'Live proof uploaded.');
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Upload timeout. Please check your connection and try again.');
          }
        }
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      Alert.alert('Upload error', message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <View style={styles.card}>
          <Text style={styles.heading}>Live Proof Upload</Text>
          <Text style={styles.mutedText}>Capture a photo or video and upload it instantly.</Text>

          <Pressable style={styles.primaryButton} onPress={captureAndUpload} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Capture and Upload</Text>}
          </Pressable>
        </View>

        {lastMediaUri ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Last Captured</Text>
            {lastMediaType === 'image' ? (
              <Image source={{ uri: lastMediaUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.mutedText}>Video captured successfully</Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationsScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ServiceNotification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    const url = `${API_BASE_URL}/user/notifications/`;
    console.log(`[API] GET ${url}`);

    setLoading(true);
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      console.log(`[API] Notifications response:`, data);

      const mapped: ServiceNotification[] = (data?.notifications ?? []).map((item: any, index: number) => ({
        id: String(item.id ?? index),
        title: item.title ?? item.type ?? 'Service Activity',
        message: item.message ?? 'New activity on your account.',
        createdAt: item.created_at ?? new Date().toISOString(),
        read: Boolean(item.is_read),
      }));
      setItems(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load notifications.';
      Alert.alert('Notification error', message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContent}>
        <View style={styles.card}>
          <Text style={styles.heading}>Notifications</Text>
          <Text style={styles.mutedText}>Latest service activity and account updates.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#22c55e" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListEmptyComponent={<Text style={styles.mutedText}>No notifications available.</Text>}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listSubtitle}>{item.message}</Text>
                <Text style={styles.listSubtitle}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Booking Requests') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={CaregiverHomeStackNavigator} />
      <Tab.Screen name="Booking Requests" component={CaregiverHomeStackNavigator} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}

function CareseekerTabs() {
  return (
    <CareseekerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'My Bookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <CareseekerTab.Screen name="Home" component={CareseekerHomeStackNavigator} />
      <CareseekerTab.Screen name="My Bookings" component={CareseekerHomeStackNavigator} />
      <CareseekerTab.Screen name="Notifications" component={NotificationsScreen} />
    </CareseekerTab.Navigator>
  );
}

function RootNavigator() {
  const { token, user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </SafeAreaView>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={token ? 'Main' : 'Signup'}
    >
      {token ? (
        <RootStack.Screen
          name="Main"
          component={normalizeRole(user?.role) === 'careseeker' ? CareseekerTabs : MainTabs}
        />
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Signup" component={SignupScreen} />
          <RootStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
}

function NotificationBootstrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const setup = async () => {
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    };

    setup();

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title ?? 'Notification';
      const body = notification.request.content.body ?? '';
      void postMobileActivity('notification_received');
      Alert.alert(title, body);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const relatedId = Number((data as any).related_id ?? (data as any).booking_id);

      if (!Number.isNaN(relatedId) && relatedId > 0 && navigationRef.isReady()) {
        navigationRef.navigate(
          'Main',
          {
            screen: 'Home',
            params: {
              screen: 'BookingDetail',
              params: { bookingId: relatedId },
            },
          } as never,
        );
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationBootstrapper>
        <NavigationContainer ref={navigationRef} theme={appTheme}>
          <RootNavigator />
        </NavigationContainer>
      </NotificationBootstrapper>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  authBackground: {
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    backgroundColor: '#f0fdf4',
    minHeight: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  logo: {
    width: 96,
    height: 96,
  },
  divider: {
    flex: 1,
    marginLeft: 14,
    height: 4,
    backgroundColor: '#22c55e',
    borderRadius: 999,
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  authTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 36,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 20,
  },
  authFieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    color: '#1f2937',
    backgroundColor: '#f0fdf4',
    fontSize: 14,
  },
  inputFocused: {
    borderColor: '#22c55e',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    paddingRight: 10,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    color: '#1f2937',
    fontSize: 14,
  },
  eyeIcon: {
    padding: 8,
  },
  eyeIconText: {
    fontSize: 16,
  },
  forgotPasswordWrap: {
    alignSelf: 'flex-start',
    marginTop: -4,
    marginBottom: 18,
  },
  forgotPassword: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    overflow: 'hidden',
    height: 50,
  },
  picker: {
    height: 50,
    color: '#1f2937',
  },
  authSubmitButton: {
    backgroundColor: '#22c55e',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  authSwitchWrap: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authSwitchText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  authSwitchAction: {
    color: '#16a34a',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  acceptButton: {
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButtonHalf: {
    flex: 1,
    marginTop: 0,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  linkButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  linkText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 14,
  },
  screenContent: {
    padding: 16,
    gap: 16,
    backgroundColor: '#f0fdf4',
    flexGrow: 1,
  },
  homeHeader: {
    height: 72,
    backgroundColor: '#f0fdf4',
    alignItems: 'flex-start',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 16,
  },
  headerLogoutButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
    padding: 4,
  },
  homeHeaderLogo: {
    width: 76,
    height: 76,
  },
  homeInfoCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    padding: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
    gap: 4,
  },
  homeGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  homeSubtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  homeDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  dashboardContainer: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  dashboardHomeWrap: {
    paddingTop: 8,
    gap: 14,
  },
  dashboardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  dashboardRoleText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  dashboardLogoutIconWrap: {
    padding: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statCardRow: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 86,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextWrap: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  recentHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  recentBookingCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recentBookingFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  recentPriceText: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 14,
  },
  recentEmptyCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  careseekerContainer: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  careseekerGreeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  careseekerSubtitle: {
    marginTop: 2,
    fontSize: 15,
    color: '#64748b',
  },
  sosSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 16,
    marginBottom: 16,
  },
  sosPrimaryButton: {
    width: '80%',
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sosButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  sosHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  featureCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
  },
  featureIconWrap: {
    paddingTop: 2,
  },
  featureTextWrap: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heading: {
    fontSize: 22,
    color: '#1e3a5f',
    fontWeight: '700',
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    color: '#1e3a5f',
    fontWeight: '600',
    textAlign: 'center',
  },
  mutedText: {
    color: '#64748b',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 2,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: '#1e3a5f',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listItem: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 10,
  },
  bookingCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 10,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingCardMain: {
    gap: 10,
  },
  polishedBookingCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 14,
    marginBottom: 10,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  polishedBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  polishedBookingTitle: {
    flex: 1,
    fontWeight: '700',
    fontSize: 15,
    color: '#1e3a5f',
  },
  bookingDetailSection: {
    backgroundColor: '#ecfdf3',
    borderWidth: 1,
    borderColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  bookingDetailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#166534',
  },
  bookingDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  bookingCheckInText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  statusFilterRow: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: 10,
  },
  statusFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusFilterChipActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  statusFilterChipText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  statusFilterChipTextActive: {
    color: '#ffffff',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 16,
    paddingBottom: 8,
  },
  backButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCardStyle: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardStyle: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingIdStyle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabelStyle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nameStyle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  detailRowStyle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  callButtonStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  callIconStyle: {
    fontSize: 18,
  },
  callTextStyle: {
    color: '#166534',
    fontWeight: '600',
  },
  completedBadge: {
    marginTop: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  completedBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  alreadyReviewedBadge: {
    marginTop: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  alreadyReviewedBadgeText: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 12,
  },
  sosContainer: {
    width: '100%',
    gap: 8,
    marginTop: 2,
  },
  sosPulseWrap: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fecaca',
    padding: 2,
  },
  sosButton: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#b91c1c',
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  sosButtonPressed: {
    opacity: 0.92,
  },
  sosButtonDisabled: {
    opacity: 0.7,
  },
  sosButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  sosSubtitle: {
    fontSize: 12,
    color: '#7f1d1d',
    fontWeight: '600',
    textAlign: 'center',
  },
  listTitle: {
    fontWeight: '700',
    color: '#1e3a5f',
  },
  dashboardSection: {
    gap: 10,
  },
  listSubtitle: {
    color: '#64748b',
    marginTop: 2,
    fontSize: 13,
  },
  inProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  inProgressText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#16a34a',
  },
  inlineInfoText: {
    color: '#475569',
    fontSize: 13,
    marginTop: 6,
  },
  locationSharingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  locationSharingDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#16a34a',
  },
  locationSharingText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  liveLocationPanel: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8fff9',
    gap: 6,
  },
  liveLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveLocationTitle: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '700',
  },
  liveLocationUpdatedText: {
    color: '#475569',
    fontSize: 12,
  },
  liveLocationMap: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    marginTop: 6,
  },
  waitingLocationBox: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
  },
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  ratingKeyboardAvoider: {
    width: '100%',
  },
  ratingSheet: {
    backgroundColor: '#f0fdf4',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  ratingSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 14,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a5f',
    textAlign: 'center',
  },
  ratingSubtitle: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 2,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  ratingStar: {
    fontSize: 36,
  },
  ratingInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f0fdf4',
  },
  ratingSubmitButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingSubmitText: {
    color: '#fff',
    fontWeight: '700',
  },
  ratingSkipWrap: {
    alignSelf: 'center',
    marginTop: 8,
  },
  ratingSkipText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 14,
  },
  videoPlaceholder: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  tabBar: {
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: '#f0fdf4',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
});
