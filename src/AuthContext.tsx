import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isPromoter: boolean;
  isCashier: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isPromoter: false,
  isCashier: false,
});

// Retorna o contexto de autenticação para qualquer componente da aplicação.
export const useAuth = () => useContext(AuthContext);

// Inicializa e distribui o estado global de autenticação e perfil do usuário.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubProfile = () => {};
    let isMounted = true;

    const setupProfile = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        // Initial check and creation if needed
        const docSnap = await getDoc(userDocRef);
        
        if (!isMounted) return;

        if (!docSnap.exists()) {
          // Check if there's a pre-registered profile by email or phone
          let preRegQuery;
          if (user.email) {
            preRegQuery = query(collection(db, 'users'), where('email', '==', user.email), where('isPreRegistered', '==', true));
          } else if (user.phoneNumber) {
            preRegQuery = query(collection(db, 'users'), where('phoneNumber', '==', user.phoneNumber), where('isPreRegistered', '==', true));
          }

          const preRegSnap = preRegQuery ? await getDocs(preRegQuery) : null;

          if (!isMounted) return;

          if (preRegSnap && !preRegSnap.empty) {
            const preRegDoc = preRegSnap.docs[0];
            const preRegData = preRegDoc.data() as any;
            
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || preRegData.email || '',
              phoneNumber: user.phoneNumber || preRegData.phoneNumber || '',
              displayName: user.displayName || preRegData.displayName || '',
              role: preRegData.role || 'promoter',
              company: preRegData.company || 'GBF SmartPix',
              empresa_id: preRegData.empresa_id || null,
              active: true,
            };
            
            await setDoc(userDocRef, newProfile);
            await deleteDoc(preRegDoc.ref);
          } else {
            const defaultProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              phoneNumber: user.phoneNumber || '',
              displayName: user.displayName || user.phoneNumber || '',
              role: user.email === 'sistemasgbf@gmail.com' ? 'admin' : 'promoter',
              company: 'GBF SmartPix',
              active: user.email === 'sistemasgbf@gmail.com',
            };
            await setDoc(userDocRef, defaultProfile);
          }
        }

        if (!isMounted) return;

        // Double check auth state before attaching listener to avoid race conditions
        if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;

        unsubProfile = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          // Only log if we are still supposedly logged in as this user
          if (auth.currentUser && auth.currentUser.uid === user.uid) {
            handleFirestoreError(error, OperationType.GET, 'users/' + user.uid);
          }
          setLoading(false);
        });
      } catch (error) {
        if (isMounted && auth.currentUser) {
          console.error("Error setting up profile:", error);
        }
        setLoading(false);
      }
    };

    setupProfile();

    return () => {
      isMounted = false;
      unsubProfile();
    };
  }, [user]);

  const isAdmin = profile?.role === 'admin';
  const isPromoter = profile?.role === 'promoter';
  const isCashier = profile?.role === 'cashier';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isPromoter, isCashier }}>
      {children}
    </AuthContext.Provider>
  );
};
