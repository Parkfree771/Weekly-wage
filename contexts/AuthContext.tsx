'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';

import {
  UserProfile as UserProfileType,
  Character,
  WeeklyChecklist,
  UserConsents,
} from '@/types/user';

// 사용자 프로필 타입 (types/user.ts에서 가져옴)
export type UserProfile = UserProfileType;
export type { Character, WeeklyChecklist, UserConsents };

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  needsConsent: boolean;  // 신규 사용자 동의 필요 여부
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  completeRegistration: () => Promise<void>;  // 동의 후 가입 완료
  cancelRegistration: () => Promise<void>;    // 동의 거부 시 취소
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);

  // 기존 사용자 프로필 가져오기 (신규 사용자는 생성하지 않음)
  const fetchUserProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // 기존 사용자: lastLoginAt 업데이트
      const existingProfile = userSnap.data() as UserProfile;
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
      return { ...existingProfile, uid: firebaseUser.uid };
    }

    // 신규 사용자: null 반환 (동의 후 생성)
    return null;
  };

  // 동의 후 신규 사용자 프로필 생성
  const createUserProfile = async (firebaseUser: User): Promise<UserProfile> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const now = serverTimestamp();

    const newProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,  // Firebase Auth에서 제공하는 이메일 저장
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      consents: {
        privacyPolicy: { agreed: true, agreedAt: now },
        emailCollection: { agreed: true, agreedAt: now },
        profileCollection: { agreed: true, agreedAt: now },
        characterData: { agreed: true, agreedAt: now },
      },
      characters: [],
      weeklyChecklist: {},
      uiSettings: {},
      createdAt: now,
      lastLoginAt: now,
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  };

  // 사용자 프로필 새로고침
  const refreshUserProfile = async () => {
    if (!user) return;
    try {
      const profile = await fetchUserProfile(user);
      if (profile) {
        setUserProfile(profile);
      }
    } catch (err) {
      console.error('프로필 새로고침 실패:', err);
    }
  };

  // Google 로그인
  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // 기존 사용자인지 확인
      const profile = await fetchUserProfile(result.user);

      if (profile) {
        // 기존 사용자: 바로 로그인
        setUserProfile(profile);
        setNeedsConsent(false);
      } else {
        // 신규 사용자: 동의 필요
        setUser(result.user);
        setNeedsConsent(true);
      }
    } catch (err: any) {
      console.error('Google 로그인 실패:', err);
      setError(err.message || '로그인에 실패했습니다.');
      throw err;
    }
  };

  // 동의 후 가입 완료
  const completeRegistration = async () => {
    if (!user) return;

    try {
      const profile = await createUserProfile(user);
      setUserProfile(profile);
      setNeedsConsent(false);
    } catch (err: any) {
      console.error('가입 완료 실패:', err);
      setError(err.message || '가입에 실패했습니다.');
      throw err;
    }
  };

  // 동의 거부 시 가입 취소
  const cancelRegistration = async () => {
    try {
      // Firebase Auth에서 로그아웃만 (계정 삭제 안 함 - 아직 DB에 없음)
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setNeedsConsent(false);
    } catch (err: any) {
      console.error('가입 취소 실패:', err);
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setNeedsConsent(false);
    } catch (err: any) {
      console.error('로그아웃 실패:', err);
      setError(err.message || '로그아웃에 실패했습니다.');
      throw err;
    }
  };

  // 계정 탈퇴
  const deleteAccount = async () => {
    if (!user) return;
    try {
      // 1. 재인증 (보안상 최근 로그인 필요)
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);

      // 2. Firestore에서 사용자 데이터 삭제
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);

      // 3. Firebase Auth 계정 삭제
      await user.delete();

      // 4. 상태 초기화
      setUser(null);
      setUserProfile(null);
      setNeedsConsent(false);
    } catch (err: any) {
      console.error('계정 삭제 실패:', err);
      setError(err.message || '계정 삭제에 실패했습니다.');
      throw err;
    }
  };

  // 인증 상태 변화 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const profile = await fetchUserProfile(firebaseUser);

          if (profile) {
            setUserProfile(profile);
            setNeedsConsent(false);
          } else {
            // 신규 사용자 (동의 화면에서 이탈했다가 다시 온 경우)
            setNeedsConsent(true);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setNeedsConsent(false);
        }
      } catch (err) {
        console.error('인증 상태 처리 오류:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        needsConsent,
        signInWithGoogle,
        signOut,
        refreshUserProfile,
        deleteAccount,
        completeRegistration,
        cancelRegistration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
