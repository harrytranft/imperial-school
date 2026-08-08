import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

interface UserProfile {
  displayName: string;
  photoURL: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (usr) => {
      setLoading(true);
      if (usr) {
        setUser(usr);
        // Default minimal profile fallback
        setProfile({
          displayName: usr.displayName || "Học sĩ triều đình",
          photoURL: usr.photoURL || "https://api.dicebear.com/7.x/bottts/svg",
          email: usr.email || ""
        });

        // Sync and subscription to firestore user profile
        const userDocRef = doc(db, "users", usr.uid);
        try {
          // Attempt simple setDoc to ensure the document exists
          await setDoc(userDocRef, {
            uid: usr.uid,
            email: usr.email || "",
            displayName: usr.displayName || "Học sĩ triều đình",
            photoURL: usr.photoURL || "https://api.dicebear.com/7.x/bottts/svg",
            lastLogin: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error("Error setting/merging initial user profile in Firestore:", error);
        }

        // Subscribe to real-time updates for User Profile to sync nicely
        unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfile({
              displayName: data.displayName || usr.displayName || "Học sĩ triều đình",
              photoURL: data.photoURL || usr.photoURL || "https://api.dicebear.com/7.x/bottts/svg",
              email: data.email || usr.email || ""
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setLoading(false);
        });

      } else {
        setUser(null);
        setProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sign in failure:", err);
      alert("Đăng nhập thất bại: Nếu bạn đang chạy ứng dụng trong iFrame, hãy click mở ứng dụng ở Tab mới (Open in new tab) để tránh chính sách Sandbox của trình duyệt chặn Popup Google!");
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (displayName: string, photoURL: string) => {
    if (!auth.currentUser) return;
    try {
      // 1. Update Firebase auth details (best effort)
      await updateProfile(auth.currentUser, { displayName, photoURL });
      
      // 2. Update Firestore document (master source of truth for synced accounts)
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, {
        displayName,
        photoURL,
        updatedAt: Date.now()
      }, { merge: true });
      
      // 3. Update local state just in case snapshot takes another cycle
      setProfile((prev) => prev ? { ...prev, displayName, photoURL } : { displayName, photoURL });
    } catch (err) {
      console.error("Failed to update user profile:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
