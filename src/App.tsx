import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  Download,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Truck,
  PackageCheck,
  Edit3,
  Lock,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  UserPlus,
  Users,
  Package,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import {
  db,
  initAuth,
  emailSignUp,
  emailSignIn,
  logout,
  handleFirestoreError,
  OperationType,
  AppUser,
} from './firebase';
import {
  ThemeMode,
  TeamRole,
  EmployeeProfile,
  ProductCatalogItem,
  PocContact,
  PurchaseOrder,
  DnRecord,
  ActivityLog,
  ActiveTab,
} from './types';
import { AuthScreen } from './components/AuthScreen';
import { PoFormModal, PoFormValues } from './components/PoFormModal';
import { DnFormModal, DnFormValues } from './components/DnFormModal';
import { GrnUpdateModal } from './components/GrnUpdateModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import {
  EmployeeModal,
  EmployeeFormValues,
  getDefaultPermissionsForRole,
} from './components/EmployeeModal';
import { ProductCatalogModal } from './components/ProductCatalogModal';
import {
  exportMasterWorkbookToExcel,
  exportPoListToExcel,
  exportPoListToCsv,
  exportPoListToPdf,
  exportSinglePoToExcel,
  exportSinglePoToPdf,
  exportDnListToExcel,
  exportDnListToCsv,
  exportDnListToPdf,
  exportAuditLogsToExcel,
  exportAuditLogsToPdf,
} from './services/exportService';

function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function getPoExpiryStatus(poExpiryDate?: string): {
  isExpiringSoon: boolean;
  isExpired: boolean;
  daysLeft: number | null;
} {
  if (!poExpiryDate || !poExpiryDate.trim()) {
    return { isExpiringSoon: false, isExpired: false, daysLeft: null };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(poExpiryDate);
  if (isNaN(exp.getTime())) {
    return { isExpiringSoon: false, isExpired: false, daysLeft: null };
  }
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return {
    isExpiringSoon: diffDays >= 0 && diffDays <= 7,
    isExpired: diffDays < 0,
    daysLeft: diffDays,
  };
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('instamart_theme');
    if (saved === 'dark' || saved === 'grey' || saved === 'light') {
      return saved;
    }
    return 'light';
  });

  const darkMode = themeMode === 'dark';
  const isGrey = themeMode === 'grey';

  const setDarkMode = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextDark = typeof val === 'function' ? val(darkMode) : val;
    setThemeMode(nextDark ? 'dark' : 'light');
  };

  // Live Clock with Date & Time (updates every 1 second)
  const [nowTime, setNowTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('instamart_theme', themeMode);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', themeMode === 'dark');
    }
  }, [themeMode]);

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<AppUser | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('PO_ENTRY');
  const [searchQuery, setSearchQuery] = useState('');

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [dnRecords, setDnRecords] = useState<DnRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [employeesList, setEmployeesList] = useState<EmployeeProfile[]>([]);
  const [catalogItems, setCatalogItems] = useState<ProductCatalogItem[]>([]);
  const [pocContacts, setPocContacts] = useState<PocContact[]>([]);

  // Modals state
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);

  const [isDnModalOpen, setIsDnModalOpen] = useState(false);
  const [editingDn, setEditingDn] = useState<DnRecord | null>(null);
  const [prefillDnFromPo, setPrefillDnFromPo] = useState<PurchaseOrder | null>(null);

  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [grnTargetPo, setGrnTargetPo] = useState<PurchaseOrder | null>(null);
  const [grnModalMode, setGrnModalMode] = useState<'INWARD_TO_GRN' | 'UPDATE_GRN_DN'>('INWARD_TO_GRN');

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);

  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // POC Contact Form Modal State
  const [isPocModalOpen, setIsPocModalOpen] = useState(false);
  const [editingPoc, setEditingPoc] = useState<PocContact | null>(null);
  const [pocForm, setPocForm] = useState({
    facilityName: '',
    pocName: '',
    designation: 'Warehouse / Facility POC',
    contactNumber: '',
    emailId: '',
    cityOrHub: '',
  });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    onConfirm: async () => {},
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth(async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsLoadingProfile(true);
        try {
          const docRef = doc(db, 'employees', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const prof = snap.data() as EmployeeProfile;
            setEmployeeProfile({ ...prof, uid: user.uid });
            if (!prof.orgScope) {
              await updateDoc(docRef, {
                orgScope: 'instamart_ops',
                updatedAt: serverTimestamp(),
              }).catch(() => {});
            }
          } else {
            setEmployeeProfile(null);
          }
        } catch (err) {
          console.error('Error loading profile:', err);
        } finally {
          setIsLoadingProfile(false);
          setAuthReady(true);
        }
      } else {
        setEmployeeProfile(null);
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore collections when authenticated & profile registered
  useEffect(() => {
    if (!authReady || !firebaseUser || !employeeProfile) return;

    const poQuery = query(
      collection(db, 'purchase_orders'),
      where('orgScope', '==', 'instamart_ops')
    );
    const unsubPo = onSnapshot(
      poQuery,
      (snap) => {
        const list: PurchaseOrder[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PurchaseOrder, 'id'>),
        }));
        setPurchaseOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'purchase_orders')
    );

    const dnQuery = query(
      collection(db, 'dn_records'),
      where('orgScope', '==', 'instamart_ops')
    );
    const unsubDn = onSnapshot(
      dnQuery,
      (snap) => {
        const list: DnRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<DnRecord, 'id'>),
        }));
        setDnRecords(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'dn_records')
    );

    const logQuery = query(
      collection(db, 'activity_logs'),
      where('orgScope', '==', 'instamart_ops')
    );
    const unsubLogs = onSnapshot(
      logQuery,
      (snap) => {
        const list: ActivityLog[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ActivityLog, 'id'>),
        }));
        setActivityLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'activity_logs')
    );

    const empQuery = query(
      collection(db, 'employees'),
      where('orgScope', '==', 'instamart_ops')
    );
    const unsubEmp = onSnapshot(
      empQuery,
      (snap) => {
        const list: EmployeeProfile[] = snap.docs.map((d) => ({
          ...(d.data() as EmployeeProfile),
          uid: d.id,
        }));
        setEmployeesList(list);

        // Sync active employee profile & permissions from Admin updates (match by UID, or fallback by Email / Employee ID if Admin pre-created a record)
        const byUid = list.find((e) => e.uid === firebaseUser.uid);
        const byEmailOrEmpId = list.find(
          (e) =>
            e.uid !== firebaseUser.uid &&
            ((firebaseUser.email &&
              e.email &&
              e.email.trim().toLowerCase() === firebaseUser.email.trim().toLowerCase()) ||
              (employeeProfile?.employeeId &&
                e.employeeId &&
                e.employeeId.trim().toLowerCase() ===
                  employeeProfile.employeeId.trim().toLowerCase()))
        );

        // Prefer Admin-modified profile permissions if an admin pre-created entry exists with newer permissions
        const matchedSource = byEmailOrEmpId || byUid;
        if (matchedSource) {
          const mergedProfile: EmployeeProfile = {
            ...(byUid || matchedSource),
            uid: firebaseUser.uid,
            role: matchedSource.role,
            accessStatus: matchedSource.accessStatus || 'APPROVED',
            permissions: {
              ...getDefaultPermissionsForRole(matchedSource.role),
              ...(byUid?.permissions || {}),
              ...(matchedSource.permissions || {}),
            },
          };
          setEmployeeProfile(mergedProfile);

          // If Admin updated a pre-created record (emp_...), automatically sync those permissions onto the user's real UID doc
          if (byEmailOrEmpId && byEmailOrEmpId.uid.startsWith('emp_')) {
            setDoc(
              doc(db, 'employees', firebaseUser.uid),
              {
                uid: firebaseUser.uid,
                employeeName: mergedProfile.employeeName.slice(0, 100),
                employeeId: mergedProfile.employeeId.slice(0, 50),
                email: (mergedProfile.email || firebaseUser.email || '').slice(0, 120),
                role: mergedProfile.role,
                accessStatus: mergedProfile.accessStatus || 'APPROVED',
                permissions: mergedProfile.permissions,
                spreadsheetId: mergedProfile.spreadsheetId || '',
                orgScope: 'instamart_ops',
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).catch(() => {});
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'employees')
    );

    const catQuery = query(
      collection(db, 'product_catalog'),
      where('orgScope', '==', 'instamart_ops')
    );
    const unsubCat = onSnapshot(
      catQuery,
      (snap) => {
        const list: ProductCatalogItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ProductCatalogItem, 'id'>),
        }));
        setCatalogItems(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'product_catalog')
    );

    const pocQuery = query(
      collection(db, 'poc_contacts'),
      where('orgScope', '==', 'instamart_ops')
    );
    const unsubPoc = onSnapshot(
      pocQuery,
      (snap) => {
        const list: PocContact[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PocContact, 'id'>),
        }));
        setPocContacts(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'poc_contacts')
    );

    return () => {
      unsubPo();
      unsubDn();
      unsubLogs();
      unsubEmp();
      unsubCat();
      unsubPoc();
    };
  }, [authReady, firebaseUser, employeeProfile?.uid]);

  // Helper to log employee activity for Admin visibility
  const recordActivity = async (
    action: string,
    module: ActivityLog['module'],
    referenceNo: string,
    details: string
  ) => {
    if (!firebaseUser || !employeeProfile) return;
    const logId = generateSafeId('log');
    try {
      await setDoc(doc(db, 'activity_logs', logId), {
        action: action.slice(0, 120),
        module,
        referenceNo: referenceNo.slice(0, 100),
        details: details.slice(0, 400),
        employeeUid: firebaseUser.uid,
        employeeName: employeeProfile.employeeName.slice(0, 100),
        employeeId: employeeProfile.employeeId.slice(0, 50),
        employeeRole: employeeProfile.role,
        orgScope: 'instamart_ops',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `activity_logs/${logId}`);
    }
  };

  // Sign Up with Email, Password, Employee Name, Employee ID, and Role (preserves any Admin pre-assigned permissions)
  const handleEmailSignUp = async (data: {
    employeeName: string;
    employeeId: string;
    email: string;
    password: string;
    role: TeamRole;
  }) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      const user = await emailSignUp(data.email, data.password, data.employeeName);
      setFirebaseUser(user);
      const docRef = doc(db, 'employees', user.uid);
      const preAssigned = employeesList.find(
        (e) =>
          (e.email && e.email.trim().toLowerCase() === data.email.trim().toLowerCase()) ||
          (e.employeeId &&
            e.employeeId.trim().toLowerCase() === data.employeeId.trim().toLowerCase())
      );
      const effectiveRole = preAssigned?.role || data.role;
      const perms = {
        ...getDefaultPermissionsForRole(effectiveRole),
        ...(preAssigned?.permissions || {}),
      };
      const status = preAssigned?.accessStatus || 'APPROVED';

      await setDoc(docRef, {
        uid: user.uid,
        employeeName: data.employeeName.slice(0, 100),
        employeeId: data.employeeId.slice(0, 50),
        email: data.email.slice(0, 120),
        role: effectiveRole,
        accessStatus: status,
        permissions: perms,
        spreadsheetId: '',
        orgScope: 'instamart_ops',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEmployeeProfile({
        uid: user.uid,
        employeeName: data.employeeName.slice(0, 100),
        employeeId: data.employeeId.slice(0, 50),
        email: data.email.slice(0, 120),
        role: effectiveRole,
        accessStatus: status,
        permissions: perms,
        spreadsheetId: '',
        orgScope: 'instamart_ops',
      });
    } catch (err: any) {
      setAuthError(err?.message || 'Sign Up failed.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Sign In with Email and Password
  const handleEmailSignIn = async (data: {
    email: string;
    password: string;
  }) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      const user = await emailSignIn(data.email, data.password);
      setFirebaseUser(user);
      const docRef = doc(db, 'employees', user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setEmployeeProfile({ ...(snap.data() as EmployeeProfile), uid: user.uid });
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Login failed. Please check your Email ID and Password.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleCompleteProfile = async (data: {
    employeeName: string;
    employeeId: string;
    role: TeamRole;
  }) => {
    if (!firebaseUser) return;
    setIsSubmittingAuth(true);
    setAuthError(null);
    const docRef = doc(db, 'employees', firebaseUser.uid);
    const preAssigned = employeesList.find(
      (e) =>
        (firebaseUser.email &&
          e.email &&
          e.email.trim().toLowerCase() === firebaseUser.email.trim().toLowerCase()) ||
        (e.employeeId &&
          e.employeeId.trim().toLowerCase() === data.employeeId.trim().toLowerCase())
    );
    const effectiveRole = preAssigned?.role || data.role;
    const perms = {
      ...getDefaultPermissionsForRole(effectiveRole),
      ...(preAssigned?.permissions || {}),
    };
    const status = preAssigned?.accessStatus || 'APPROVED';

    try {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as EmployeeProfile;
        await updateDoc(docRef, {
          employeeName: data.employeeName.slice(0, 100),
          employeeId: data.employeeId.slice(0, 50),
          role: existingData.role || effectiveRole,
          accessStatus: existingData.accessStatus || status,
          permissions: {
            ...perms,
            ...(existingData.permissions || {}),
          },
          spreadsheetId: '',
          orgScope: 'instamart_ops',
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(docRef, {
          uid: firebaseUser.uid,
          employeeName: data.employeeName.slice(0, 100),
          employeeId: data.employeeId.slice(0, 50),
          email: (firebaseUser.email || '').slice(0, 120),
          role: effectiveRole,
          accessStatus: status,
          permissions: perms,
          spreadsheetId: '',
          orgScope: 'instamart_ops',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setEmployeeProfile({
        uid: firebaseUser.uid,
        employeeName: data.employeeName.slice(0, 100),
        employeeId: data.employeeId.slice(0, 50),
        email: (firebaseUser.email || '').slice(0, 120),
        role: effectiveRole,
        accessStatus: status,
        permissions: perms,
        spreadsheetId: '',
        orgScope: 'instamart_ops',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `employees/${firebaseUser.uid}`);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Check if current user can manage Item ID & Product Name Master Catalog
  const canManageCatalog = Boolean(
    employeeProfile &&
      (employeeProfile.role === 'admin' ||
        employeeProfile.role === 'backoffice' ||
        employeeProfile.permissions?.canManageCatalog === true)
  );

  // Add or update Item ID & Product Name in product_catalog
  const handleAddCatalogItem = async (itemId: string, itemName: string) => {
    if (!firebaseUser || !employeeProfile || !canManageCatalog) return;
    const cleanId = itemId
      .trim()
      .toUpperCase()
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 60);
    if (!cleanId) return;

    try {
      await setDoc(doc(db, 'product_catalog', cleanId), {
        itemId: itemId.trim().toUpperCase().slice(0, 60),
        itemName: itemName.trim().slice(0, 200),
        orgScope: 'instamart_ops',
        updatedByName: `${employeeProfile.employeeName} (${employeeProfile.employeeId})`.slice(
          0,
          100
        ),
        updatedAt: serverTimestamp(),
      });
      await recordActivity(
        'Added / Updated Item ID in Master Catalog',
        'PO_ENTRY',
        itemId.trim().toUpperCase(),
        `${employeeProfile.employeeName} (${employeeProfile.employeeId}) saved Item ID ${itemId
          .trim()
          .toUpperCase()} → "${itemName.trim()}".`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `product_catalog/${cleanId}`);
    }
  };

  // Delete Item ID from product_catalog (Admin or Permitted Backoffice)
  const handleDeleteCatalogItem = async (item: ProductCatalogItem) => {
    if (!firebaseUser || !employeeProfile || !canManageCatalog) return;
    try {
      await deleteDoc(doc(db, 'product_catalog', item.id));
      await recordActivity(
        'Deleted Item ID from Master Catalog',
        'PO_ENTRY',
        item.itemId,
        `${employeeProfile.employeeName} (${employeeProfile.employeeId}) deleted Item ID ${item.itemId} (${item.itemName}) from catalog.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `product_catalog/${item.id}`);
    }
  };

  // Save or Update Instamart POC Team Contact
  const handleSavePocContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !employeeProfile) return;
    if (!pocForm.facilityName.trim() || !pocForm.pocName.trim() || !pocForm.contactNumber.trim()) {
      return;
    }

    const pocId = editingPoc ? editingPoc.id : generateSafeId('poc');
    try {
      await setDoc(doc(db, 'poc_contacts', pocId), {
        facilityName: pocForm.facilityName.trim().slice(0, 120),
        pocName: pocForm.pocName.trim().slice(0, 120),
        designation: (pocForm.designation || 'Warehouse / Facility POC').trim().slice(0, 100),
        contactNumber: pocForm.contactNumber.trim().slice(0, 60),
        emailId: pocForm.emailId.trim().slice(0, 120),
        cityOrHub: pocForm.cityOrHub.trim().slice(0, 100),
        orgScope: 'instamart_ops',
        updatedByName: `${employeeProfile.employeeName} (${employeeProfile.employeeId})`.slice(
          0,
          100
        ),
        updatedAt: serverTimestamp(),
      });
      await recordActivity(
        editingPoc ? 'Updated Instamart POC Contact' : 'Added Instamart POC Contact',
        'POC_DIRECTORY',
        pocForm.facilityName.trim(),
        `${employeeProfile.employeeName} saved POC ${pocForm.pocName.trim()} (${pocForm.contactNumber.trim()}, ${pocForm.emailId.trim()}) for ${pocForm.facilityName.trim()}.`
      );
      setIsPocModalOpen(false);
      setEditingPoc(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `poc_contacts/${pocId}`);
    }
  };

  const handleDeletePocContact = async (poc: PocContact) => {
    if (!firebaseUser || !employeeProfile) return;
    try {
      await deleteDoc(doc(db, 'poc_contacts', poc.id));
      await recordActivity(
        'Removed Instamart POC Contact',
        'POC_DIRECTORY',
        poc.facilityName,
        `${employeeProfile.employeeName} removed POC ${poc.pocName} (${poc.facilityName}).`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `poc_contacts/${poc.id}`);
    }
  };

  // Helper: Automatically create or update a corresponding DN record whenever a PO is in IN_TRANSIT
  const autoSyncPoProductsToDn = async (poData: {
    id: string;
    poNumber: string;
    orderDate: string;
    warehouseName: string;
    itemId: string;
    itemName: string;
    totalQty: number;
    invoiceNo: string;
    pickupTrackingId: string;
    asn: string;
  }) => {
    if (!firebaseUser || !employeeProfile) return;
    const autoDnId = `dn_auto_${poData.id.replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 100);
    const existingAutoDn = dnRecords.find(
      (d) =>
        d.id === autoDnId ||
        d.parentPoDetails.toLowerCase().includes(poData.poNumber.trim().toLowerCase())
    );
    const matchedPoc = pocContacts.find(
      (c) =>
        c.facilityName.trim().toLowerCase() ===
        poData.warehouseName.trim().toLowerCase()
    );
    const pocStr = matchedPoc
      ? `${matchedPoc.pocName} · ${matchedPoc.contactNumber} · ${matchedPoc.emailId}`.slice(0, 200)
      : existingAutoDn?.whPocDetails || 'Instamart Facility POC';

    try {
      if (existingAutoDn) {
        await updateDoc(doc(db, 'dn_records', existingAutoDn.id), {
          facilityName: poData.warehouseName.trim().slice(0, 120),
          parentPoDetails: `${poData.poNumber.trim()} | Inv: ${poData.invoiceNo.trim() || 'N/A'} | In-Transit`.slice(0, 200),
          dnSkuIdItemName: `${poData.itemId.trim()} | ${poData.itemName.trim()}`.slice(0, 250),
          lrNo: (poData.pickupTrackingId.trim() || poData.asn.trim() || existingAutoDn.lrNo || 'IN-TRANSIT').slice(0, 80),
          whPocDetails: pocStr,
          updatedByUid: firebaseUser.uid,
          updatedByName: employeeProfile.employeeName.slice(0, 100),
          updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'dn_records', autoDnId), {
          dnDate: poData.orderDate.trim().slice(0, 30) || new Date().toISOString().slice(0, 10),
          dnNumber: `DN-${poData.poNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 80),
          facilityName: poData.warehouseName.trim().slice(0, 120),
          parentPoDetails: `${poData.poNumber.trim()} | Inv: ${poData.invoiceNo.trim() || 'N/A'} | In-Transit`.slice(0, 200),
          dnSkuIdItemName: `${poData.itemId.trim()} | ${poData.itemName.trim()}`.slice(0, 250),
          dnQty: Number(poData.totalQty) || 0,
          whPocDetails: pocStr,
          lrNo: (poData.pickupTrackingId.trim() || poData.asn.trim() || 'IN-TRANSIT').slice(0, 80),
          reportFileName: '',
          reportFileType: '',
          reportFileSize: 0,
          reportFileDataUrl: '',
          orgScope: 'instamart_ops',
          createdByUid: firebaseUser.uid,
          createdByName: employeeProfile.employeeName.slice(0, 100),
          createdByEmpId: employeeProfile.employeeId.slice(0, 50),
          updatedByUid: firebaseUser.uid,
          updatedByName: employeeProfile.employeeName.slice(0, 100),
          updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Auto-sync In-Transit product to DN error:', err);
    }
  };

  // Admin: Create or Edit Employee & Permissions (updates all matching UID/email/employeeId records)
  const handleSaveEmployee = async (values: EmployeeFormValues) => {
    if (!firebaseUser || !employeeProfile || employeeProfile.role !== 'admin') return;
    const allMatched = employeesList.filter(
      (e) =>
        (values.uid && e.uid === values.uid) ||
        (values.email.trim() &&
          e.email &&
          e.email.trim().toLowerCase() === values.email.trim().toLowerCase()) ||
        (values.employeeId.trim() &&
          e.employeeId &&
          e.employeeId.trim().toLowerCase() === values.employeeId.trim().toLowerCase())
    );

    // Prefer updating the real authenticated user UID (one that doesn't start with emp_) if present
    const realAuthDoc = allMatched.find((e) => !e.uid.startsWith('emp_')) || allMatched[0];

    const targetUid =
      realAuthDoc?.uid ||
      values.uid ||
      `emp_${values.employeeId.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}`;
    const empRef = doc(db, 'employees', targetUid);

    try {
      const existingSnap = await getDoc(empRef);
      if (existingSnap.exists()) {
        await updateDoc(empRef, {
          employeeName: values.employeeName.slice(0, 100),
          employeeId: values.employeeId.slice(0, 50),
          email: values.email.slice(0, 120),
          role: values.role,
          accessStatus: values.accessStatus,
          permissions: values.permissions,
          orgScope: 'instamart_ops',
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(empRef, {
          uid: targetUid,
          employeeName: values.employeeName.slice(0, 100),
          employeeId: values.employeeId.slice(0, 50),
          email: values.email.slice(0, 120),
          role: values.role,
          accessStatus: values.accessStatus,
          permissions: values.permissions,
          spreadsheetId: '',
          orgScope: 'instamart_ops',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Also sync any duplicate pre-created records for the same employeeId/email
      for (const dup of allMatched) {
        if (dup.uid !== targetUid) {
          await updateDoc(doc(db, 'employees', dup.uid), {
            role: values.role,
            accessStatus: values.accessStatus,
            permissions: values.permissions,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      }

      await recordActivity(
        values.uid
          ? 'Admin Updated Employee Role & Permissions'
          : 'Admin Created New Employee Profile',
        'ADMIN_IAM',
        values.employeeId,
        `Admin ${employeeProfile.employeeName} updated ${values.employeeName} (${values.employeeId}) → Dept: ${values.role.toUpperCase()}, Status: ${values.accessStatus}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `employees/${targetUid}`);
    }
  };

  // Print Team: Verify PO Document YES / NO
  const handleTogglePrintVerify = async (po: PurchaseOrder, verified: 'YES' | 'NO') => {
    if (!firebaseUser || !employeeProfile) return;
    const poRef = doc(db, 'purchase_orders', po.id);
    try {
      await updateDoc(poRef, {
        printVerified: verified,
        printVerifiedBy: `${employeeProfile.employeeName} (${employeeProfile.employeeId})`.slice(
          0,
          100
        ),
        updatedByUid: firebaseUser.uid,
        updatedByName: employeeProfile.employeeName.slice(0, 100),
        updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
        updatedAt: serverTimestamp(),
      });
      await recordActivity(
        `Print Team Document Verification: ${verified}`,
        'PRINT_TEAM',
        po.poNumber,
        `${employeeProfile.employeeName} (${employeeProfile.employeeId}) marked Print Verification as ${verified} for PO ${po.poNumber}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${po.id}`);
    }
  };

  // Create or Update Purchase Order
  const handleSavePo = async (values: PoFormValues) => {
    if (!firebaseUser || !employeeProfile) return;

    // Auto-save new SKUs into product_catalog if user has catalog permission
    if (canManageCatalog && Array.isArray(values.lineItems)) {
      for (const li of values.lineItems) {
        if (li.itemId && li.itemName) {
          const cleanSkuId = li.itemId
            .trim()
            .toUpperCase()
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .slice(0, 60);
          if (cleanSkuId) {
            setDoc(doc(db, 'product_catalog', cleanSkuId), {
              itemId: li.itemId.trim().toUpperCase().slice(0, 60),
              itemName: li.itemName.trim().slice(0, 200),
              orgScope: 'instamart_ops',
              updatedByName: `${employeeProfile.employeeName} (${employeeProfile.employeeId})`.slice(
                0,
                100
              ),
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
        }
      }
    }

    const newStage =
      values.pickupStatus === 'YES'
        ? 'IN_TRANSIT'
        : editingPo?.workflowStage === 'GRN'
        ? 'GRN'
        : 'PO_ENTRY';

    if (editingPo) {
      const poRef = doc(db, 'purchase_orders', editingPo.id);
      const updatePayload = {
        poNumber: values.poNumber.trim().slice(0, 60),
        orderDate: values.orderDate.trim().slice(0, 30),
        poExpiryDate: (values.poExpiryDate || '').trim().slice(0, 30),
        warehouseName: values.warehouseName.trim().slice(0, 120),
        itemId: values.itemId.trim().slice(0, 60),
        itemName: values.itemName.trim().slice(0, 200),
        totalQty: Number(values.totalQty) || 0,
        lineItems: (values.lineItems || []).slice(0, 50),
        invoiceNo: values.invoiceNo.trim().slice(0, 80),
        shipDate: values.shipDate.trim().slice(0, 30),
        appointmentId: values.appointmentId.trim().slice(0, 80),
        appointmentDate: values.appointmentDate.trim().slice(0, 30),
        so: values.so.trim().slice(0, 80),
        status:
          values.pickupStatus === 'YES' && editingPo.workflowStage === 'PO_ENTRY'
            ? 'In Transit'
            : values.status.trim().slice(0, 60),
        noOfBoxes: Number(values.noOfBoxes) || 0,
        boxDimensions: values.boxDimensions.trim().slice(0, 100),
        logisticsPortal: values.logisticsPortal.trim().slice(0, 100),
        pickupTrackingId: values.pickupTrackingId.trim().slice(0, 100),
        puc: values.puc.trim().slice(0, 80),
        asn: values.asn.trim().slice(0, 80),
        clearBagNo: values.clearBagNo.trim().slice(0, 80),
        comment: values.comment.trim().slice(0, 500),
        pickupStatus: values.pickupStatus,
        workflowStage: newStage as PurchaseOrder['workflowStage'],
        updatedByUid: firebaseUser.uid,
        updatedByName: employeeProfile.employeeName.slice(0, 100),
        updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
        updatedAt: serverTimestamp(),
      };

      try {
        await updateDoc(poRef, updatePayload);
        const shiftedToTransit =
          editingPo.workflowStage === 'PO_ENTRY' && newStage === 'IN_TRANSIT';

        if (newStage === 'IN_TRANSIT') {
          await autoSyncPoProductsToDn({
            id: editingPo.id,
            poNumber: values.poNumber,
            orderDate: values.orderDate,
            warehouseName: values.warehouseName,
            itemId: values.itemId,
            itemName: values.itemName,
            totalQty: Number(values.totalQty) || 0,
            invoiceNo: values.invoiceNo,
            pickupTrackingId: values.pickupTrackingId,
            asn: values.asn,
          });
        }

        await recordActivity(
          shiftedToTransit ? 'Pickup YES → Shifted to In Transit & Synced to DN' : 'Updated PO Details',
          shiftedToTransit ? 'IN_TRANSIT' : 'PO_ENTRY',
          values.poNumber,
          `${employeeProfile.employeeName} (${employeeProfile.employeeId}) updated PO ${values.poNumber}${
            shiftedToTransit ? ' and shifted it to In Transit (Auto-synced to DN).' : '.'
          }`
        );

        if (shiftedToTransit) {
          setActiveTab('IN_TRANSIT');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${editingPo.id}`);
      }
    } else {
      const poId = generateSafeId('po');
      const newPoDoc: Omit<PurchaseOrder, 'id'> = {
        poNumber: values.poNumber.trim().slice(0, 60),
        orderDate: values.orderDate.trim().slice(0, 30),
        poExpiryDate: (values.poExpiryDate || '').trim().slice(0, 30),
        warehouseName: values.warehouseName.trim().slice(0, 120),
        itemId: values.itemId.trim().slice(0, 60),
        itemName: values.itemName.trim().slice(0, 200),
        totalQty: Number(values.totalQty) || 0,
        lineItems: (values.lineItems || []).slice(0, 50),
        invoiceNo: values.invoiceNo.trim().slice(0, 80),
        shipDate: values.shipDate.trim().slice(0, 30),
        appointmentId: values.appointmentId.trim().slice(0, 80),
        appointmentDate: values.appointmentDate.trim().slice(0, 30),
        so: values.so.trim().slice(0, 80),
        status:
          values.pickupStatus === 'YES'
            ? 'In Transit'
            : values.status.trim().slice(0, 60),
        noOfBoxes: Number(values.noOfBoxes) || 0,
        boxDimensions: values.boxDimensions.trim().slice(0, 100),
        logisticsPortal: values.logisticsPortal.trim().slice(0, 100),
        pickupTrackingId: values.pickupTrackingId.trim().slice(0, 100),
        puc: values.puc.trim().slice(0, 80),
        asn: values.asn.trim().slice(0, 80),
        clearBagNo: values.clearBagNo.trim().slice(0, 80),
        comment: values.comment.trim().slice(0, 500),
        pickupStatus: values.pickupStatus,
        printVerified: 'NO',
        printVerifiedBy: '',
        workflowStage: values.pickupStatus === 'YES' ? 'IN_TRANSIT' : 'PO_ENTRY',
        inwardStatus: 'PENDING',
        grnNumber: '',
        grnDnSummary: '',
        hasDn: false,
        orgScope: 'instamart_ops',
        createdByUid: firebaseUser.uid,
        createdByName: employeeProfile.employeeName.slice(0, 100),
        createdByEmpId: employeeProfile.employeeId.slice(0, 50),
        updatedByUid: firebaseUser.uid,
        updatedByName: employeeProfile.employeeName.slice(0, 100),
        updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      try {
        await setDoc(doc(db, 'purchase_orders', poId), newPoDoc);
        if (values.pickupStatus === 'YES') {
          await autoSyncPoProductsToDn({
            id: poId,
            poNumber: values.poNumber,
            orderDate: values.orderDate,
            warehouseName: values.warehouseName,
            itemId: values.itemId,
            itemName: values.itemName,
            totalQty: Number(values.totalQty) || 0,
            invoiceNo: values.invoiceNo,
            pickupTrackingId: values.pickupTrackingId,
            asn: values.asn,
          });
        }
        await recordActivity(
          values.pickupStatus === 'YES'
            ? 'Created PO & Shifted to In Transit (Auto-Synced to DN)'
            : 'Created New PO Entry',
          values.pickupStatus === 'YES' ? 'IN_TRANSIT' : 'PO_ENTRY',
          values.poNumber,
          `${employeeProfile.employeeName} (${employeeProfile.employeeId}) created PO ${values.poNumber} for ${values.warehouseName}.`
        );

        if (values.pickupStatus === 'YES') {
          setActiveTab('IN_TRANSIT');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `purchase_orders/${poId}`);
      }
    }
  };

  // Admin: Delete Employee Record
  const requestDeleteEmployee = (emp: EmployeeProfile) => {
    if (!isAdmin) return;
    setConfirmState({
      isOpen: true,
      title: `Remove Employee ${emp.employeeName} (${emp.employeeId})?`,
      description: `Are you sure you want to delete employee record ${emp.employeeName} (${emp.employeeId}) from the directory?`,
      confirmLabel: 'Delete Employee',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'employees', emp.uid));
          await recordActivity(
            'Admin Removed Employee Profile',
            'ADMIN_IAM',
            emp.employeeId,
            `Admin ${employeeProfile?.employeeName} deleted employee ${emp.employeeName} (${emp.employeeId}).`
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `employees/${emp.uid}`);
        }
      },
    });
  };

  // Admin: Quick inline toggle for any employee's individual permission
  const handleQuickToggleEmployeePerm = async (
    emp: EmployeeProfile,
    permKey: keyof NonNullable<EmployeeProfile['permissions']>
  ) => {
    if (!isAdmin) return;
    const currentPerms = {
      ...getDefaultPermissionsForRole(emp.role),
      ...(emp.permissions || {}),
    };
    const nextVal = !currentPerms[permKey];
    const updatedPerms = {
      ...currentPerms,
      [permKey]: nextVal,
    };
    const matchingDocs = employeesList.filter(
      (e) =>
        e.uid === emp.uid ||
        (emp.email && e.email && e.email.trim().toLowerCase() === emp.email.trim().toLowerCase()) ||
        (emp.employeeId &&
          e.employeeId &&
          e.employeeId.trim().toLowerCase() === emp.employeeId.trim().toLowerCase())
    );
    try {
      for (const target of matchingDocs) {
        await updateDoc(doc(db, 'employees', target.uid), {
          permissions: updatedPerms,
          updatedAt: serverTimestamp(),
        });
      }
      await recordActivity(
        `Admin Toggled ${permKey}: ${nextVal ? 'ON' : 'OFF'}`,
        'ADMIN_IAM',
        emp.employeeId,
        `Admin ${employeeProfile?.employeeName} set ${permKey}=${nextVal ? 'YES' : 'NO'} for ${emp.employeeName} (${emp.employeeId}).`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${emp.uid}`);
    }
  };

  // Admin: Grant or Revoke ALL permissions for a single employee
  const handleSetAllEmployeePerms = async (emp: EmployeeProfile, grantAll: boolean) => {
    if (!isAdmin) return;
    const updatedPerms = {
      canEditPo: grantAll,
      canManageCatalog: grantAll,
      canManageLogistics: grantAll,
      canVerifyPrint: grantAll,
      canManageGrn: grantAll,
      canManageDn: grantAll,
    };
    const matchingDocs = employeesList.filter(
      (e) =>
        e.uid === emp.uid ||
        (emp.email && e.email && e.email.trim().toLowerCase() === emp.email.trim().toLowerCase()) ||
        (emp.employeeId &&
          e.employeeId &&
          e.employeeId.trim().toLowerCase() === emp.employeeId.trim().toLowerCase())
    );
    try {
      for (const target of matchingDocs) {
        await updateDoc(doc(db, 'employees', target.uid), {
          accessStatus: grantAll ? 'APPROVED' : emp.accessStatus || 'APPROVED',
          permissions: updatedPerms,
          updatedAt: serverTimestamp(),
        });
      }
      await recordActivity(
        grantAll ? 'Admin Granted Full Module Access' : 'Admin Revoked All Module Access',
        'ADMIN_IAM',
        emp.employeeId,
        `Admin ${employeeProfile?.employeeName} ${grantAll ? 'granted all module permissions to' : 'revoked module permissions from'} ${emp.employeeName} (${emp.employeeId}).`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${emp.uid}`);
    }
  };

  // Admin: Quick inline change of employee Department Role
  const handleQuickChangeEmployeeRole = async (emp: EmployeeProfile, newRole: TeamRole) => {
    if (!isAdmin) return;
    const defaultPerms = getDefaultPermissionsForRole(newRole);
    const matchingDocs = employeesList.filter(
      (e) =>
        e.uid === emp.uid ||
        (emp.email && e.email && e.email.trim().toLowerCase() === emp.email.trim().toLowerCase()) ||
        (emp.employeeId &&
          e.employeeId &&
          e.employeeId.trim().toLowerCase() === emp.employeeId.trim().toLowerCase())
    );
    try {
      for (const target of matchingDocs) {
        await updateDoc(doc(db, 'employees', target.uid), {
          role: newRole,
          permissions: defaultPerms,
          updatedAt: serverTimestamp(),
        });
      }
      await recordActivity(
        'Admin Changed Employee Department Role',
        'ADMIN_IAM',
        emp.employeeId,
        `Admin ${employeeProfile?.employeeName} changed ${emp.employeeName} (${emp.employeeId}) department role to ${newRole.toUpperCase()}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${emp.uid}`);
    }
  };

  // Admin: Quick inline toggle of employee APPROVED / RESTRICTED status
  const handleQuickToggleEmployeeStatus = async (emp: EmployeeProfile) => {
    if (!isAdmin) return;
    const nextStatus = emp.accessStatus === 'RESTRICTED' ? 'APPROVED' : 'RESTRICTED';
    const matchingDocs = employeesList.filter(
      (e) =>
        e.uid === emp.uid ||
        (emp.email && e.email && e.email.trim().toLowerCase() === emp.email.trim().toLowerCase()) ||
        (emp.employeeId &&
          e.employeeId &&
          e.employeeId.trim().toLowerCase() === emp.employeeId.trim().toLowerCase())
    );
    try {
      for (const target of matchingDocs) {
        await updateDoc(doc(db, 'employees', target.uid), {
          accessStatus: nextStatus,
          updatedAt: serverTimestamp(),
        });
      }
      await recordActivity(
        `Admin Changed Access Status: ${nextStatus}`,
        'ADMIN_IAM',
        emp.employeeId,
        `Admin ${employeeProfile?.employeeName} set ${emp.employeeName} (${emp.employeeId}) portal access to ${nextStatus}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${emp.uid}`);
    }
  };

  // Admin: Bulk controller to grant or restrict all Backoffice & Staff members
  const handleBulkBackofficeAndStaffControl = async (
    mode: 'ENABLE_ALL_BACKOFFICE' | 'ENABLE_ALL_STAFF' | 'RESTRICT_NON_ADMIN'
  ) => {
    if (!isAdmin) return;
    try {
      for (const emp of employeesList) {
        if (emp.role === 'admin' && mode === 'RESTRICT_NON_ADMIN') continue;
        if (mode === 'ENABLE_ALL_BACKOFFICE' && emp.role !== 'backoffice') continue;

        if (mode === 'RESTRICT_NON_ADMIN') {
          await updateDoc(doc(db, 'employees', emp.uid), {
            accessStatus: 'RESTRICTED',
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(doc(db, 'employees', emp.uid), {
            accessStatus: 'APPROVED',
            permissions: {
              canEditPo: true,
              canManageCatalog: true,
              canManageLogistics: true,
              canVerifyPrint: true,
              canManageGrn: true,
              canManageDn: true,
            },
            updatedAt: serverTimestamp(),
          });
        }
      }
      await recordActivity(
        `Admin Bulk Staff Control: ${mode}`,
        'ADMIN_IAM',
        'ALL-STAFF',
        `Admin ${employeeProfile?.employeeName} executed bulk staff controller action: ${mode}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'employees');
    }
  };

  // Admin: Delete DN Record
  const requestDeleteDn = (dn: DnRecord) => {
    if (!isAdmin) return;
    setConfirmState({
      isOpen: true,
      title: `Delete DN Record ${dn.dnNumber}?`,
      description: `Are you sure you want to permanently delete Discrepancy Note ${dn.dnNumber} (${dn.facilityName})?`,
      confirmLabel: 'Delete DN',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'dn_records', dn.id));
          await recordActivity(
            'Admin Deleted DN Record',
            'DN_TRACKER',
            dn.dnNumber,
            `Admin ${employeeProfile?.employeeName} deleted DN ${dn.dnNumber}.`
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `dn_records/${dn.id}`);
        }
      },
    });
  };

  // Admin: Clear All Uploaded / Sample Records (Purchase Orders, DN Records, Catalog)
  const requestClearAllData = () => {
    if (!isAdmin) return;
    setConfirmState({
      isOpen: true,
      title: 'Clear All Uploaded PO, DN & SKU Data?',
      description:
        'This will permanently remove all Purchase Orders, DN Tracker records, and Catalog SKUs from the database so you can start fresh.',
      confirmLabel: 'Clear All Data',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          for (const po of purchaseOrders) {
            await deleteDoc(doc(db, 'purchase_orders', po.id));
          }
          for (const dn of dnRecords) {
            await deleteDoc(doc(db, 'dn_records', dn.id));
          }
          for (const cat of catalogItems) {
            await deleteDoc(doc(db, 'product_catalog', cat.id));
          }
          await recordActivity(
            'Admin Cleared All Uploaded Records',
            'ADMIN_IAM',
            'ALL-RECORDS',
            `Admin ${employeeProfile?.employeeName} cleared all PO, DN, and SKU records.`
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'purchase_orders');
        }
      },
    });
  };

  // Quick toggle Pickup Status YES on PO Entry table row -> Shifts to In Transit & Auto-Syncs to DN
  const handleQuickShiftToInTransit = async (po: PurchaseOrder) => {
    if (!firebaseUser || !employeeProfile) return;
    const poRef = doc(db, 'purchase_orders', po.id);
    try {
      await updateDoc(poRef, {
        pickupStatus: 'YES',
        workflowStage: 'IN_TRANSIT',
        status: 'In Transit',
        updatedByUid: firebaseUser.uid,
        updatedByName: employeeProfile.employeeName.slice(0, 100),
        updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
        updatedAt: serverTimestamp(),
      });
      await autoSyncPoProductsToDn({
        id: po.id,
        poNumber: po.poNumber,
        orderDate: po.orderDate,
        warehouseName: po.warehouseName,
        itemId: po.itemId,
        itemName: po.itemName,
        totalQty: Number(po.totalQty) || 0,
        invoiceNo: po.invoiceNo,
        pickupTrackingId: po.pickupTrackingId,
        asn: po.asn,
      });
      await recordActivity(
        'Pickup Status YES → Shifted to In Transit & Synced to DN',
        'IN_TRANSIT',
        po.poNumber,
        `${employeeProfile.employeeName} (${employeeProfile.employeeId}) marked Pickup Status YES for PO ${po.poNumber}. Record shifted to In Transit and automatically synced to DN Tracker.`
      );
      setActiveTab('IN_TRANSIT');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${po.id}`);
    }
  };

  // Confirm Inward Success -> Shift PO to GRN or update GRN DN details
  const handleConfirmGrnUpdate = async (data: {
    grnNumber: string;
    hasDn: boolean;
    grnDnSummary: string;
    status: string;
  }) => {
    if (!firebaseUser || !employeeProfile || !grnTargetPo) return;
    const poRef = doc(db, 'purchase_orders', grnTargetPo.id);

    const isTransitionFromTransit = grnTargetPo.workflowStage === 'IN_TRANSIT';

    try {
      if (isTransitionFromTransit) {
        await updateDoc(poRef, {
          workflowStage: 'GRN',
          inwardStatus: 'SUCCESS',
          status: data.status.slice(0, 60),
          grnNumber: data.grnNumber.slice(0, 80),
          grnDnSummary: data.grnDnSummary.slice(0, 500),
          hasDn: data.hasDn,
          updatedByUid: firebaseUser.uid,
          updatedByName: employeeProfile.employeeName.slice(0, 100),
          updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(poRef, {
          status: data.status.slice(0, 60),
          grnNumber: data.grnNumber.slice(0, 80),
          grnDnSummary: data.grnDnSummary.slice(0, 500),
          hasDn: data.hasDn,
          comment: grnTargetPo.comment,
          updatedByUid: firebaseUser.uid,
          updatedByName: employeeProfile.employeeName.slice(0, 100),
          updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
          updatedAt: serverTimestamp(),
        });
      }

      await recordActivity(
        isTransitionFromTransit
          ? 'Inward Success → Shifted to GRN'
          : 'Updated GRN / DN Details',
        'GRN',
        grnTargetPo.poNumber,
        `${employeeProfile.employeeName} (${employeeProfile.employeeId}) updated GRN ${data.grnNumber} for PO ${grnTargetPo.poNumber}${
          data.hasDn ? ` with DN: ${data.grnDnSummary}` : ''
        }.`
      );
      setActiveTab('GRN');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchase_orders/${grnTargetPo.id}`);
    }
  };

  // Create or Update DN Record in Instamart DN Tracker
  const handleSaveDn = async (values: DnFormValues) => {
    if (!firebaseUser || !employeeProfile) return;

    if (editingDn) {
      const dnRef = doc(db, 'dn_records', editingDn.id);
      const updatePayload = {
        dnDate: values.dnDate.trim().slice(0, 30),
        dnNumber: values.dnNumber.trim().slice(0, 80),
        facilityName: values.facilityName.trim().slice(0, 120),
        parentPoDetails: values.parentPoDetails.trim().slice(0, 200),
        dnSkuIdItemName: values.dnSkuIdItemName.trim().slice(0, 250),
        dnQty: Number(values.dnQty) || 0,
        whPocDetails: values.whPocDetails.trim().slice(0, 200),
        lrNo: values.lrNo.trim().slice(0, 80),
        reportFileName: '',
        reportFileType: '',
        reportFileSize: 0,
        reportFileDataUrl: '',
        updatedByUid: firebaseUser.uid,
        updatedByName: employeeProfile.employeeName.slice(0, 100),
        updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
        updatedAt: serverTimestamp(),
      };
      try {
        await updateDoc(dnRef, updatePayload);
        await recordActivity(
          'Updated Instamart DN Record',
          'DN_TRACKER',
          values.dnNumber,
          `${employeeProfile.employeeName} (${employeeProfile.employeeId}) updated DN ${values.dnNumber} (Qty: ${values.dnQty}, LR: ${values.lrNo}).`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `dn_records/${editingDn.id}`);
      }
    } else {
      const dnId = generateSafeId('dn');
      const newDnDoc: Omit<DnRecord, 'id'> = {
        dnDate: values.dnDate.trim().slice(0, 30),
        dnNumber: values.dnNumber.trim().slice(0, 80),
        facilityName: values.facilityName.trim().slice(0, 120),
        parentPoDetails: values.parentPoDetails.trim().slice(0, 200),
        dnSkuIdItemName: values.dnSkuIdItemName.trim().slice(0, 250),
        dnQty: Number(values.dnQty) || 0,
        whPocDetails: values.whPocDetails.trim().slice(0, 200),
        lrNo: values.lrNo.trim().slice(0, 80),
        reportFileName: '',
        reportFileType: '',
        reportFileSize: 0,
        reportFileDataUrl: '',
        orgScope: 'instamart_ops',
        createdByUid: firebaseUser.uid,
        createdByName: employeeProfile.employeeName.slice(0, 100),
        createdByEmpId: employeeProfile.employeeId.slice(0, 50),
        updatedByUid: firebaseUser.uid,
        updatedByName: employeeProfile.employeeName.slice(0, 100),
        updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      try {
        await setDoc(doc(db, 'dn_records', dnId), newDnDoc);
        await recordActivity(
          'Created Instamart DN Record',
          'DN_TRACKER',
          values.dnNumber,
          `${employeeProfile.employeeName} (${employeeProfile.employeeId}) created DN ${values.dnNumber} for ${values.facilityName} (LR No: ${values.lrNo}).`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `dn_records/${dnId}`);
      }
    }
  };

  // Admin delete PO with confirmation dialog
  const requestDeletePo = (po: PurchaseOrder) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Purchase Order ${po.poNumber}?`,
      description: `Are you sure you want to permanently delete PO ${po.poNumber} (${po.itemName})? This action cannot be undone.`,
      confirmLabel: 'Delete PO',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteDoc(doc(db, 'purchase_orders', po.id));
          await recordActivity(
            'Deleted Purchase Order',
            'PO_ENTRY',
            po.poNumber,
            `Admin ${employeeProfile?.employeeName} (${employeeProfile?.employeeId}) deleted PO ${po.poNumber}.`
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `purchase_orders/${po.id}`);
        }
      },
    });
  };

  // Filtered lists
  const poEntryList = useMemo(
    () =>
      purchaseOrders.filter(
        (po) =>
          po.workflowStage === 'PO_ENTRY' &&
          (po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.itemId.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [purchaseOrders, searchQuery]
  );

  const allFilteredPos = useMemo(
    () =>
      purchaseOrders.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          po.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          po.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          po.itemId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.logisticsPortal || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.pickupTrackingId || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [purchaseOrders, searchQuery]
  );

  const inTransitList = useMemo(
    () =>
      purchaseOrders.filter(
        (po) =>
          po.workflowStage === 'IN_TRANSIT' &&
          (po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.pickupTrackingId.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [purchaseOrders, searchQuery]
  );

  const grnList = useMemo(
    () =>
      purchaseOrders.filter(
        (po) =>
          po.workflowStage === 'GRN' &&
          (po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.itemName.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [purchaseOrders, searchQuery]
  );

  const filteredDnList = useMemo(
    () =>
      dnRecords.filter(
        (dn) =>
          dn.dnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dn.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dn.parentPoDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dn.dnSkuIdItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dn.lrNo.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [dnRecords, searchQuery]
  );

  const filteredLogs = useMemo(
    () =>
      activityLogs.filter(
        (l) =>
          l.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.action.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [activityLogs, searchQuery]
  );

  const filteredPocList = useMemo(
    () =>
      pocContacts.filter(
        (p) =>
          p.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.pocName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.contactNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.emailId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.cityOrHub || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [pocContacts, searchQuery]
  );

  const expiringPoCount = useMemo(
    () =>
      purchaseOrders.filter((po) => {
        if (po.workflowStage === 'GRN') return false;
        const { isExpiringSoon, isExpired } = getPoExpiryStatus(po.poExpiryDate);
        return isExpiringSoon || isExpired;
      }).length,
    [purchaseOrders]
  );

  if (!authReady || isLoadingProfile) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center ${
          darkMode
            ? 'bg-slate-950 text-slate-200'
            : isGrey
            ? 'bg-zinc-200 text-zinc-900'
            : 'bg-slate-50 text-slate-800'
        }`}
      >
        <div className="text-sm font-medium">Loading Instamart Operations Workspace...</div>
      </div>
    );
  }

  if (!firebaseUser || !employeeProfile) {
    return (
      <AuthScreen
        firebaseUser={firebaseUser}
        existingProfile={employeeProfile}
        themeMode={themeMode}
        onChangeThemeMode={setThemeMode}
        onEmailSignUp={handleEmailSignUp}
        onEmailSignIn={handleEmailSignIn}
        onCompleteProfile={handleCompleteProfile}
        isSubmitting={isSubmittingAuth}
        authError={authError}
      />
    );
  }

  const isAdmin = employeeProfile.role === 'admin';
  const isBackoffice = employeeProfile.role === 'backoffice';
  const isRestricted = employeeProfile.accessStatus === 'RESTRICTED' && !isAdmin;
  const effectivePerms = {
    ...getDefaultPermissionsForRole(employeeProfile.role),
    ...(employeeProfile.permissions || {}),
  };
  const canUserEditPo = !isRestricted && (isAdmin || isBackoffice || effectivePerms.canEditPo);
  const canUserManageLogistics =
    !isRestricted && (isAdmin || isBackoffice || effectivePerms.canManageLogistics);
  const canUserVerifyPrint =
    !isRestricted && (isAdmin || isBackoffice || effectivePerms.canVerifyPrint);
  const canUserManageGrn =
    !isRestricted && (isAdmin || isBackoffice || effectivePerms.canManageGrn);
  const canUserManageDn =
    !isRestricted &&
    (isAdmin ||
      isBackoffice ||
      effectivePerms.canManageDn ||
      effectivePerms.canManageLogistics);

  const activePermissionBadges = [
    { key: 'canEditPo', label: 'PO Entry', enabled: canUserEditPo },
    { key: 'canManageCatalog', label: 'SKU Master', enabled: canManageCatalog },
    { key: 'canManageLogistics', label: 'Logistics & Delivery', enabled: canUserManageLogistics },
    { key: 'canVerifyPrint', label: 'Print Verify', enabled: canUserVerifyPrint },
    { key: 'canManageGrn', label: 'GRN Inward', enabled: canUserManageGrn },
    { key: 'canManageDn', label: 'DN Notes', enabled: canUserManageDn },
  ];

  const formattedLiveDate = nowTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedLiveTime = nowTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const navTabs: { id: ActiveTab; label: string; shortLabel: string }[] = [
    {
      id: 'DASHBOARD',
      label: 'Performance Dashboard',
      shortLabel: 'Dashboard',
    },
    {
      id: 'PO_ENTRY',
      label: `01. New PO Entry (${purchaseOrders.filter((p) => p.workflowStage === 'PO_ENTRY').length})`,
      shortLabel: `PO Entry (${purchaseOrders.filter((p) => p.workflowStage === 'PO_ENTRY').length})`,
    },
    {
      id: 'LOGISTICS',
      label: `Logistics & Delivery (${purchaseOrders.length})`,
      shortLabel: `Logistics (${purchaseOrders.length})`,
    },
    {
      id: 'PRINT_TEAM',
      label: `Print Team (${purchaseOrders.length})`,
      shortLabel: 'Print Team',
    },
    {
      id: 'IN_TRANSIT',
      label: `02. In Transit (${purchaseOrders.filter((p) => p.workflowStage === 'IN_TRANSIT').length})`,
      shortLabel: `In Transit (${purchaseOrders.filter((p) => p.workflowStage === 'IN_TRANSIT').length})`,
    },
    {
      id: 'GRN',
      label: `03. GRN & Inward (${purchaseOrders.filter((p) => p.workflowStage === 'GRN').length})`,
      shortLabel: `GRN (${purchaseOrders.filter((p) => p.workflowStage === 'GRN').length})`,
    },
    {
      id: 'DN_TRACKER',
      label: `04. DN Tracker (${dnRecords.length})`,
      shortLabel: `DN (${dnRecords.length})`,
    },
    {
      id: 'POC_DIRECTORY',
      label: `Instamart POC Team (${pocContacts.length})`,
      shortLabel: `POC Team (${pocContacts.length})`,
    },
    {
      id: 'ADMIN_AUDIT',
      label: `05. Admin & Staff Control (${employeesList.length})`,
      shortLabel: `Admin (${employeesList.length})`,
    },
  ];

  return (
    <div
      className={`min-h-screen w-full flex flex-col transition-colors ${
        darkMode
          ? 'bg-slate-950 text-slate-100'
          : isGrey
          ? 'bg-zinc-200 text-zinc-900'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Bar Contract: Full-width Desktop & Responsive Mobile/Tablet */}
      <header
        className={`sticky top-0 z-30 w-full flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 border-b ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : isGrey
            ? 'bg-zinc-100 border-zinc-300'
            : 'bg-white border-slate-200'
        }`}
      >
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3">
          <a
            href="#top"
            className="text-sm sm:text-base lg:text-lg font-bold tracking-tight whitespace-nowrap"
          >
            Instamart PO & DN Tracker
          </a>
        </div>

        {/* Zone 2: Desktop Full-Screen Navigation Links */}
        <nav className="hidden 2xl:flex items-center gap-3 text-xs font-semibold">
          {navTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Live Clock with Date + SKU Master + Excel Download + Light/Grey/Dark Theme + Logout */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Live Clock with Date */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] lg:text-xs font-mono ${
              darkMode
                ? 'border-slate-700 bg-slate-800/80 text-slate-200'
                : isGrey
                ? 'border-zinc-300 bg-zinc-200 text-zinc-900'
                : 'border-slate-200 bg-slate-100 text-slate-800'
            }`}
            title="Live System Clock & Date"
          >
            <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="font-semibold whitespace-nowrap">{formattedLiveDate}</span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap">
              {formattedLiveTime}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCatalogModalOpen(true)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              darkMode
                ? 'border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                : isGrey
                ? 'border-orange-400 bg-orange-50 text-orange-900 hover:bg-orange-100'
                : 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>SKU Master ({catalogItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportMasterWorkbookToExcel(purchaseOrders, dnRecords, activityLogs)
            }
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              darkMode
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="hidden sm:inline">Download Excel</span>
          </button>

          {/* 3-Way Theme Switcher: Light / Grey / Dark */}
          <div
            className={`inline-flex items-center rounded-lg p-0.5 border ${
              darkMode
                ? 'border-slate-700 bg-slate-800'
                : isGrey
                ? 'border-zinc-300 bg-zinc-200'
                : 'border-slate-200 bg-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              title="Light Mode"
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => setThemeMode('grey')}
              title="Soft Grey Mode"
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                themeMode === 'grey'
                  ? 'bg-zinc-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Grey</span>
            </button>
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              title="Dark Mode"
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-slate-950 text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Dark</span>
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-red-400'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-red-600'
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Responsive Sub-Header: Employee Identity + Live Active Permissions + Scrollable Navigation Bar */}
      <div
        className={`w-full px-3 sm:px-5 lg:px-6 py-2.5 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 text-xs ${
          darkMode
            ? 'bg-slate-900/50 border-slate-800 text-slate-300'
            : isGrey
            ? 'bg-zinc-200/80 border-zinc-300 text-zinc-800'
            : 'bg-slate-100/80 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span>Active Employee:</span>
          <strong className={darkMode ? 'text-white' : 'text-slate-900'}>
            {employeeProfile.employeeName}
          </strong>
          <span>·</span>
          <span className="font-mono">ID: {employeeProfile.employeeId}</span>
          <span>·</span>
          <span>
            Role:{' '}
            <strong className="text-orange-600 dark:text-orange-400 uppercase">
              {employeeProfile.role}
            </strong>
          </span>
          {isAdmin && (
            <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-[11px]">
              MASTER ADMIN CONTROLLER
            </span>
          )}
          {isBackoffice && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              BACKOFFICE FULL ACCESS
            </span>
          )}
          {isRestricted && (
            <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 font-bold">
              RESTRICTED (Read-Only)
            </span>
          )}
          <span className="hidden sm:inline text-slate-400">|</span>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-500">Active Panel Permissions:</span>
            {activePermissionBadges.map((b) => (
              <span
                key={b.key}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  b.enabled
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 line-through'
                }`}
              >
                {b.label}
              </span>
            ))}
          </div>
          <span className="md:hidden font-mono font-semibold text-orange-600 dark:text-orange-400 ml-auto">
            {formattedLiveDate} | {formattedLiveTime}
          </span>
        </div>

        {/* Responsive Tab Strip (Visible on Mobile, Tablet & Standard Laptops) */}
        <div className="flex 2xl:hidden items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 no-scrollbar">
          {navTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : darkMode
                  ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                  : 'bg-white/80 text-slate-700 hover:bg-white'
              }`}
            >
              {t.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Container: Full Screen Width on Desktop (`w-full max-w-none`), Responsive Padding on Mobile */}
      <main className="flex-1 w-full max-w-none px-3 sm:px-5 lg:px-6 py-4 sm:py-5 space-y-5 overflow-x-hidden">
        {/* Summary Metrics Bar (Responsive 1 -> 2 -> 5 Columns) */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : isGrey
              ? 'bg-zinc-100 border-zinc-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className=" pb-3 sm:pb-0 border-b sm:border-b-0 sm:pr-4 sm:border-r border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Active PO Entry Queue
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1">
              {purchaseOrders.filter((p) => p.workflowStage === 'PO_ENTRY').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Awaiting Pickup Status: YES
            </div>
          </div>

          <div className="pb-3 sm:pb-0 border-b sm:border-b-0 lg:pr-4 lg:border-r border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              In Transit Shipments
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 text-amber-600 dark:text-amber-400">
              {purchaseOrders.filter((p) => p.workflowStage === 'IN_TRANSIT').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Full Backoffice & Admin Access · Auto-Synced to DN
            </div>
          </div>

          <div className="pb-3 sm:pb-0 border-b sm:border-b-0 sm:pr-4 sm:border-r border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Expiring POs (≤ 7 Days)</span>
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 ${
                expiringPoCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {expiringPoCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              PO Entry & In Transit Alert
            </div>
          </div>

          <div className="pb-3 sm:pb-0 border-b sm:border-b-0 lg:pr-4 lg:border-r border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Inwarded GRN Records
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
              {purchaseOrders.filter((p) => p.workflowStage === 'GRN').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              With DN Tracking Support
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Instamart DN Tracker
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 text-orange-600 dark:text-orange-400">
              {dnRecords.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Total Discrepancy Qty:{' '}
              <span className="font-mono">
                {dnRecords.reduce((acc, d) => acc + (Number(d.dnQty) || 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Action & Export Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full lg:max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PO Number, Warehouse, Item SKU, DN No, LR No, POC Name, or Employee..."
              className={`w-full pl-9 pr-4 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
                  : isGrey
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Context-Specific Primary Action + PDF / Excel / CSV Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'PO_ENTRY' && (
              <>
                <button
                  type="button"
                  onClick={() => exportPoListToExcel(poEntryList, 'PO_Entry')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPoListToPdf(poEntryList, 'New PO Entry')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPoListToCsv(poEntryList, 'PO_Entry')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                {canUserEditPo && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPo(null);
                      setIsPoModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ New Instamart PO Entry</span>
                  </button>
                )}
              </>
            )}

            {activeTab === 'LOGISTICS' && (
              <>
                <button
                  type="button"
                  onClick={() => exportPoListToExcel(allFilteredPos, 'Logistics_Deliveries')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPoListToPdf(allFilteredPos, 'Logistics Deliveries')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF</span>
                </button>
                {canUserManageLogistics && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPo(null);
                      setIsPoModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>+ Add Logistics Delivery Entry</span>
                  </button>
                )}
                {canUserManageDn && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDn(null);
                      setPrefillDnFromPo(null);
                      setIsDnModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add DN Note (Logistics)</span>
                  </button>
                )}
              </>
            )}

            {activeTab === 'PRINT_TEAM' && (
              <>
                <button
                  type="button"
                  onClick={() => exportPoListToExcel(allFilteredPos, activeTab)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPoListToPdf(allFilteredPos, activeTab)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF</span>
                </button>
              </>
            )}

            {activeTab === 'IN_TRANSIT' && (
              <>
                <button
                  type="button"
                  onClick={() => exportPoListToExcel(inTransitList, 'In_Transit')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPoListToPdf(inTransitList, 'In Transit Shipments')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPoListToCsv(inTransitList, 'In_Transit')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </>
            )}

            {activeTab === 'GRN' && (
              <>
                <button
                  type="button"
                  onClick={() => exportPoListToExcel(grnList, 'GRN_Records')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPoListToPdf(grnList, 'GRN & Inward Records')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPoListToCsv(grnList, 'GRN_Records')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </>
            )}

            {activeTab === 'DN_TRACKER' && (
              <>
                <button
                  type="button"
                  onClick={() => exportDnListToExcel(filteredDnList)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportDnListToPdf(filteredDnList)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportDnListToCsv(filteredDnList)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                {canUserManageDn && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDn(null);
                      setPrefillDnFromPo(null);
                      setIsDnModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add DN Tracker Entry</span>
                  </button>
                )}
              </>
            )}

            {activeTab === 'POC_DIRECTORY' && (
              <>
                {(isAdmin || isBackoffice || canUserEditPo || canUserManageLogistics) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPoc(null);
                      setPocForm({
                        facilityName: '',
                        pocName: '',
                        designation: 'Warehouse / Facility POC',
                        contactNumber: '',
                        emailId: '',
                        cityOrHub: '',
                      });
                      setIsPocModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Instamart POC Contact</span>
                  </button>
                )}
              </>
            )}

            {activeTab === 'ADMIN_AUDIT' && (
              <>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEmployee(null);
                        setIsEmployeeModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Add Staff / Backoffice</span>
                    </button>
                    {(purchaseOrders.length > 0 || dnRecords.length > 0 || catalogItems.length > 0) && (
                      <button
                        type="button"
                        onClick={requestClearAllData}
                        className="px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All Uploaded Data</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => exportAuditLogsToExcel(filteredLogs)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportAuditLogsToPdf(filteredLogs)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* TAB 0: PERFORMANCE DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <PerformanceDashboard
            purchaseOrders={purchaseOrders}
            dnRecords={dnRecords}
            darkMode={darkMode}
          />
        )}

        {/* TAB 1: NEW PO ENTRY */}
        {activeTab === 'PO_ENTRY' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : isGrey
                ? 'bg-zinc-100 border-zinc-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">
                  01. Instamart New PO Entry (Backoffice & Admin)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  All 21 PO fields · Switching Pickup Status to YES immediately shifts the entire PO to the In Transit tab. POs expiring within 7 days are highlighted.
                </p>
              </div>
            </div>

            {poEntryList.length === 0 ? (
              <div className="p-10 sm:p-12 text-center space-y-3">
                <div className="text-sm font-semibold">No Pending PO Entries</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When a new Instamart PO arrives, click below to enter all PO parameters manually.
                </p>
                {canUserEditPo && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPo(null);
                        setIsPoModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Log First Instamart PO</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        darkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <th className="py-3 px-4 whitespace-nowrap">PO Number & Expiry</th>
                      <th className="py-3 px-4 whitespace-nowrap">Warehouse</th>
                      <th className="py-3 px-4 whitespace-nowrap">Item ID & Name</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Total Qty</th>
                      <th className="py-3 px-4 whitespace-nowrap">Invoice & Ship Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">Appointment ID / Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">SO & Status</th>
                      <th className="py-3 px-4 whitespace-nowrap">Boxes & Dimensions</th>
                      <th className="py-3 px-4 whitespace-nowrap">Logistics & Tracking</th>
                      <th className="py-3 px-4 whitespace-nowrap">PUC / ASN / Clear Bag</th>
                      <th className="py-3 px-4 whitespace-nowrap">Comment</th>
                      <th className="py-3 px-4 whitespace-nowrap">Entered / Updated By</th>
                      <th className="py-3 px-4 whitespace-nowrap">Pickup Status (YES/NO)</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {poEntryList.map((po) => {
                      const expiryInfo = getPoExpiryStatus(po.poExpiryDate);
                      return (
                        <tr
                          key={po.id}
                          className={`transition-colors ${
                            expiryInfo.isExpired
                              ? 'bg-red-500/10 hover:bg-red-500/15'
                              : expiryInfo.isExpiringSoon
                              ? 'bg-amber-500/10 hover:bg-amber-500/15'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div className="font-bold text-orange-600 dark:text-orange-400">
                              {po.poNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Ord: {po.orderDate}
                            </div>
                            {po.poExpiryDate && (
                              <div className="mt-1 flex items-center gap-1">
                                {(expiryInfo.isExpiringSoon || expiryInfo.isExpired) && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                )}
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    expiryInfo.isExpired
                                      ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                      : expiryInfo.isExpiringSoon
                                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  Exp: {po.poExpiryDate}
                                  {expiryInfo.isExpired
                                    ? ' (EXPIRED)'
                                    : expiryInfo.isExpiringSoon
                                    ? ` (${expiryInfo.daysLeft}d left)`
                                    : ''}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium">
                            {po.warehouseName}
                          </td>
                          <td className="py-3 px-4 min-w-[200px]">
                            <div className="font-mono text-[11px] text-slate-500">
                              {po.itemId}
                            </div>
                            <div className="font-medium truncate max-w-[220px]">
                              {po.itemName}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                            {po.totalQty}
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div>{po.invoiceNo || '-'}</div>
                            <div className="text-[11px] text-slate-500">
                              Ship: {po.shipDate || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div>{po.appointmentId || '-'}</div>
                            <div className="text-[11px] text-slate-500">
                              {po.appointmentDate || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono">{po.so || '-'}</div>
                            <div className="text-[11px] text-slate-500">{po.status}</div>
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div>{po.noOfBoxes} Boxes</div>
                            <div className="text-[11px] text-slate-500">
                              {po.boxDimensions || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-medium">{po.logisticsPortal || '-'}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {po.pickupTrackingId || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                            <div>PUC: {po.puc || '-'} · ASN: {po.asn || '-'}</div>
                            <div className="text-slate-500">Bag: {po.clearBagNo || '-'}</div>
                          </td>
                          <td className="py-3 px-4 max-w-[180px] truncate">
                            {po.comment || '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold">{po.updatedByName}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              ID: {po.updatedByEmpId}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {canUserEditPo || canUserManageLogistics ? (
                              <button
                                type="button"
                                onClick={() => handleQuickShiftToInTransit(po)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Mark Pickup: YES</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">No Permission</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {(canUserEditPo || canUserManageLogistics) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPo(po);
                                    setIsPoModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => requestDeletePo(po)}
                                  className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                  title="Admin Delete PO"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 1B: LOGISTICS DEPARTMENT — DELIVERY & DN NOTE CONTROL */}
        {activeTab === 'LOGISTICS' && (
          <div className="space-y-6">
            <div
              className={`rounded-xl border overflow-hidden ${
                darkMode
                  ? 'bg-slate-900 border-slate-800'
                  : isGrey
                  ? 'bg-zinc-100 border-zinc-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-500" />
                    <span>
                      Logistics Department — Add Logistics Delivery, Dispatch Tracking & Log DN Notes
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Add or update Logistics Delivery details (Logistics Partner, Tracking/LR ID, PUC, ASN, Boxes, Pickup Status) and directly create DN Notes for any shipment.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canUserManageLogistics && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPo(null);
                        setIsPoModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Logistics Delivery</span>
                    </button>
                  )}
                  {canUserManageDn && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDn(null);
                        setPrefillDnFromPo(null);
                        setIsDnModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Create DN Note</span>
                    </button>
                  )}
                </div>
              </div>

              {allFilteredPos.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  No Purchase Orders or Logistics deliveries found. Click "+ Add Logistics Delivery" above to log a new delivery.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={`border-b font-semibold ${
                          darkMode
                            ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <th className="py-3 px-4 whitespace-nowrap">PO Number & Stage</th>
                        <th className="py-3 px-4 whitespace-nowrap">Warehouse</th>
                        <th className="py-3 px-4 whitespace-nowrap">Product SKU & Item</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Qty</th>
                        <th className="py-3 px-4 whitespace-nowrap">Boxes & Dimensions</th>
                        <th className="py-3 px-4 whitespace-nowrap">Logistics Partner</th>
                        <th className="py-3 px-4 whitespace-nowrap">Tracking / LR ID</th>
                        <th className="py-3 px-4 whitespace-nowrap">PUC / ASN / Bag</th>
                        <th className="py-3 px-4 whitespace-nowrap">Pickup / Delivery Status</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">
                          Logistics Delivery & DN Note Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {allFilteredPos.map((po) => (
                        <tr
                          key={po.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div className="font-bold text-orange-600 dark:text-orange-400">
                              {po.poNumber}
                            </div>
                            <div className="text-[10px] uppercase font-semibold text-slate-500">
                              {po.workflowStage}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium">
                            {po.warehouseName}
                          </td>
                          <td className="py-3 px-4 min-w-[180px]">
                            <div className="font-mono text-[11px] text-slate-500">{po.itemId}</div>
                            <div className="font-medium truncate max-w-[200px]">{po.itemName}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                            {po.totalQty}
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div>{po.noOfBoxes} Boxes</div>
                            <div className="text-[11px] text-slate-500">
                              {po.boxDimensions || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-semibold">
                            {po.logisticsPortal || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            {po.pickupTrackingId || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                            <div>PUC: {po.puc || '-'} · ASN: {po.asn || '-'}</div>
                            <div className="text-slate-500">Bag: {po.clearBagNo || '-'}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {po.pickupStatus === 'YES' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                YES ({po.workflowStage === 'GRN' ? 'Delivered / GRN' : 'In Transit'})
                              </span>
                            ) : canUserManageLogistics ? (
                              <button
                                type="button"
                                onClick={() => handleQuickShiftToInTransit(po)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                              >
                                Mark Pickup: YES
                              </button>
                            ) : (
                              <span className="text-slate-400">NO</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canUserManageLogistics && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPo(po);
                                    setIsPoModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Add / Edit Delivery</span>
                                </button>
                              )}
                              {canUserManageDn && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDn(null);
                                    setPrefillDnFromPo(po);
                                    setIsDnModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ DN Note</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Logistics DN Notes History Sub-Table */}
            <div
              className={`rounded-xl border overflow-hidden ${
                darkMode
                  ? 'bg-slate-900 border-slate-800'
                  : isGrey
                  ? 'bg-zinc-100 border-zinc-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold">
                    Logistics DN Notes & LR Discrepancy Records ({filteredDnList.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    All DN Notes logged by Logistics, Warehouse, Backoffice, or Admin.
                  </p>
                </div>
              </div>
              {filteredDnList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No DN Notes logged yet. Click "+ DN Note" on any delivery row above to record a DN Note.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={`border-b font-semibold ${
                          darkMode
                            ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <th className="py-2.5 px-4 whitespace-nowrap">DN Date</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">DN Number</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Facility Name</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Parent PO Details</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Product SKU | Item Name</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">DN QTY</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">LR No</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredDnList.map((dn) => (
                        <tr key={dn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-mono whitespace-nowrap">{dn.dnDate}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            {dn.dnNumber}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">{dn.facilityName}</td>
                          <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                            {dn.parentPoDetails}
                          </td>
                          <td className="py-2.5 px-4 font-medium">{dn.dnSkuIdItemName}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                            {dn.dnQty}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-semibold">{dn.lrNo}</td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {canUserManageDn && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDn(dn);
                                  setPrefillDnFromPo(null);
                                  setIsDnModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                              >
                                Edit DN Note
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1C: PRINT VERIFICATION TEAM */}
        {activeTab === 'PRINT_TEAM' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : isGrey
                ? 'bg-zinc-100 border-zinc-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-orange-500" />
                  <span>Print Verification Team — PO Slip & Invoice Print Verification</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify PO documents (YES / NO) and download individual PO PDF or Excel slips for dispatch packaging.
                </p>
              </div>
            </div>

            {allFilteredPos.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No Purchase Orders available for print verification.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        darkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <th className="py-3 px-4 whitespace-nowrap">PO Number</th>
                      <th className="py-3 px-4 whitespace-nowrap">Warehouse</th>
                      <th className="py-3 px-4 whitespace-nowrap">Item ID & Name</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Total Qty</th>
                      <th className="py-3 px-4 whitespace-nowrap">Invoice & ASN</th>
                      <th className="py-3 px-4 whitespace-nowrap">Print Verified Status</th>
                      <th className="py-3 px-4 whitespace-nowrap">Verified By</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Print & Verify Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {allFilteredPos.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                          {po.poNumber}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium">
                          {po.warehouseName}
                        </td>
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className="font-mono text-[11px] text-slate-500">{po.itemId}</div>
                          <div className="font-medium truncate max-w-[220px]">{po.itemName}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                          {po.totalQty}
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div>Inv: {po.invoiceNo || '-'}</div>
                          <div className="text-[11px] text-slate-500">ASN: {po.asn || '-'}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {po.printVerified === 'YES' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>VERIFIED (YES)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>PENDING (NO)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {po.printVerifiedBy || '-'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canUserVerifyPrint && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleTogglePrintVerify(
                                    po,
                                    po.printVerified === 'YES' ? 'NO' : 'YES'
                                  )
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                  po.printVerified === 'YES'
                                    ? 'border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                {po.printVerified === 'YES' ? 'Mark Unverified' : 'Verify Print: YES'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => exportSinglePoToPdf(po)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-red-500" />
                              <span>PDF Slip</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => exportSinglePoToExcel(po)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Excel</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IN TRANSIT (FULL ACCESS FOR BACKOFFICE, ADMIN & PERMITTED STAFF) */}
        {activeTab === 'IN_TRANSIT' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : isGrey
                ? 'bg-zinc-100 border-zinc-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <span>
                    02. In Transit Shipments (Full Access for Backoffice Team & Admin)
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Backoffice Team, Admin, and permitted staff can edit all PO fields, update Logistics/Tracking, shift to GRN, or directly log a DN Note. All products here automatically appear in the DN Tracker tab.
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {canUserEditPo || canUserManageLogistics
                    ? 'Full Backoffice & Admin Access Active (Edit PO, Inward to GRN & Log DN)'
                    : 'View Mode'}
                </span>
              </div>
            </div>

            {inTransitList.length === 0 ? (
              <div className="p-10 sm:p-12 text-center space-y-2">
                <div className="text-sm font-semibold">No Shipments Currently In Transit</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When Pickup Status is marked YES in the PO Entry or Logistics tab, the entire PO record automatically shifts here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        darkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <th className="py-3 px-4 whitespace-nowrap">PO Number & Expiry</th>
                      <th className="py-3 px-4 whitespace-nowrap">Warehouse</th>
                      <th className="py-3 px-4 whitespace-nowrap">Item ID & Name</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Total Qty</th>
                      <th className="py-3 px-4 whitespace-nowrap">Invoice & Ship Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">Appointment ID / Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">Boxes & Dimensions</th>
                      <th className="py-3 px-4 whitespace-nowrap">Logistics & Tracking</th>
                      <th className="py-3 px-4 whitespace-nowrap">PUC / ASN / Bag</th>
                      <th className="py-3 px-4 whitespace-nowrap">Updated By</th>
                      <th className="py-3 px-4 whitespace-nowrap">Inward / DN Actions</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">
                        Backoffice & Admin Controls
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {inTransitList.map((po) => {
                      const expiryInfo = getPoExpiryStatus(po.poExpiryDate);
                      return (
                        <tr
                          key={po.id}
                          className={`transition-colors ${
                            expiryInfo.isExpired
                              ? 'bg-red-500/10 hover:bg-red-500/15'
                              : expiryInfo.isExpiringSoon
                              ? 'bg-amber-500/10 hover:bg-amber-500/15'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div className="font-bold text-amber-600 dark:text-amber-400">
                              {po.poNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Ord: {po.orderDate}
                            </div>
                            {po.poExpiryDate && (
                              <div className="mt-1 flex items-center gap-1">
                                {(expiryInfo.isExpiringSoon || expiryInfo.isExpired) && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                )}
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    expiryInfo.isExpired
                                      ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                      : expiryInfo.isExpiringSoon
                                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  Exp: {po.poExpiryDate}
                                  {expiryInfo.isExpired
                                    ? ' (EXPIRED)'
                                    : expiryInfo.isExpiringSoon
                                    ? ` (${expiryInfo.daysLeft}d left)`
                                    : ''}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium">
                            {po.warehouseName}
                          </td>
                          <td className="py-3 px-4 min-w-[200px]">
                            <div className="font-mono text-[11px] text-slate-500">
                              {po.itemId}
                            </div>
                            <div className="font-medium truncate max-w-[220px]">
                              {po.itemName}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                            {po.totalQty}
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div>{po.invoiceNo || '-'}</div>
                            <div className="text-[11px] text-slate-500">
                              Ship: {po.shipDate || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div>{po.appointmentId || '-'}</div>
                            <div className="text-[11px] text-slate-500">
                              {po.appointmentDate || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div>{po.noOfBoxes} Boxes</div>
                            <div className="text-[11px] text-slate-500">
                              {po.boxDimensions || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-medium">{po.logisticsPortal || '-'}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {po.pickupTrackingId || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                            <div>PUC: {po.puc || '-'} · ASN: {po.asn || '-'}</div>
                            <div className="text-slate-500">Bag: {po.clearBagNo || '-'}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold">{po.updatedByName}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              ID: {po.updatedByEmpId}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {canUserManageGrn && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGrnTargetPo(po);
                                    setGrnModalMode('INWARD_TO_GRN');
                                    setIsGrnModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  <span>Inward → GRN</span>
                                </button>
                              )}
                              {canUserManageDn && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDn(null);
                                    setPrefillDnFromPo(po);
                                    setIsDnModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ DN Note</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {canUserEditPo || canUserManageLogistics ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPo(po);
                                    setIsPoModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit All Fields</span>
                                </button>
                                {(isAdmin || isBackoffice) && (
                                  <button
                                    type="button"
                                    onClick={() => requestDeletePo(po)}
                                    className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                    title="Delete PO"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Read-Only</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GRN & INWARD */}
        {activeTab === 'GRN' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : isGrey
                ? 'bg-zinc-100 border-zinc-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">
                  03. GRN (Goods Receipt Note) & Discrepancy Note (DN) Updates
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Successfully inwarded POs automatically arrive here. Permitted employees can update GRN DN remarks or raise an official DN Tracker entry.
                </p>
              </div>
            </div>

            {grnList.length === 0 ? (
              <div className="p-10 sm:p-12 text-center space-y-2">
                <div className="text-sm font-semibold">No Inwarded GRN Records Yet</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Mark any shipment as "Inward → GRN" from the In Transit tab to automatically move it to GRN.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        darkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <th className="py-3 px-4 whitespace-nowrap">GRN Number</th>
                      <th className="py-3 px-4 whitespace-nowrap">PO Number & Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">Warehouse</th>
                      <th className="py-3 px-4 whitespace-nowrap">Item ID & Name</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Total Qty</th>
                      <th className="py-3 px-4 whitespace-nowrap">GRN Status</th>
                      <th className="py-3 px-4 whitespace-nowrap">DN Present?</th>
                      <th className="py-3 px-4 whitespace-nowrap">GRN DN Summary / Remarks</th>
                      <th className="py-3 px-4 whitespace-nowrap">Updated By (Employee)</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">DN / GRN Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {grnList.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {po.grnNumber || 'GRN-VERIFIED'}
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div className="font-semibold">{po.poNumber}</div>
                          <div className="text-[11px] text-slate-500">{po.orderDate}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">{po.warehouseName}</td>
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className="font-mono text-[11px] text-slate-500">{po.itemId}</div>
                          <div className="font-medium truncate max-w-[220px]">{po.itemName}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {po.totalQty}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium">
                          {po.status}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono">
                          {po.hasDn ? (
                            <span className="text-red-600 dark:text-red-400 font-bold">
                              YES (DN Raised)
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              NO (Clean GRN)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-[240px]">
                          {po.grnDnSummary || 'No discrepancy noted'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold">{po.updatedByName}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            ID: {po.updatedByEmpId}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {canUserManageGrn && (
                              <button
                                type="button"
                                onClick={() => {
                                  setGrnTargetPo(po);
                                  setGrnModalMode('UPDATE_GRN_DN');
                                  setIsGrnModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                              >
                                Update GRN / DN
                              </button>
                            )}
                            {canUserManageDn && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDn(null);
                                  setPrefillDnFromPo(po);
                                  setIsDnModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer"
                              >
                                + Log in DN Tracker
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => requestDeletePo(po)}
                                className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                title="Admin Delete GRN Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INSTAMART DN TRACKER (AUTOMATICALLY SHOWS IN-TRANSIT PRODUCTS + LOGGED DN RECORDS) */}
        {activeTab === 'DN_TRACKER' && (
          <div className="space-y-6">
            {/* Automatic In-Transit Products Feed in DN Tab */}
            <div
              className={`rounded-xl border overflow-hidden ${
                darkMode
                  ? 'bg-slate-900 border-slate-800'
                  : isGrey
                  ? 'bg-zinc-100 border-zinc-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>
                      In-Transit Products Automatically Synced to DN ({inTransitList.length})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Every product currently in the In-Transit tab automatically appears here so Backoffice, Logistics, and Warehouse teams can generate a DN Note in one click with all SKU, PO, and LR details pre-filled.
                  </p>
                </div>
              </div>

              {inTransitList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No products are currently in In-Transit. Any product moved to In-Transit will automatically show here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={`border-b font-semibold ${
                          darkMode
                            ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <th className="py-2.5 px-4 whitespace-nowrap">PO Number & Order Date</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Facility / Warehouse</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">In-Transit Product (SKU | Item Name)</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">Shipped Qty</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Invoice & ASN</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Logistics & LR / Tracking ID</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">DN Status</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">
                          Quick DN Note Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {inTransitList.map((po) => {
                        const matchingDn = dnRecords.find((d) =>
                          d.parentPoDetails.toLowerCase().includes(po.poNumber.toLowerCase())
                        );
                        return (
                          <tr
                            key={po.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                              <div className="font-bold text-amber-600 dark:text-amber-400">
                                {po.poNumber}
                              </div>
                              <div className="text-[11px] text-slate-500">{po.orderDate}</div>
                            </td>
                            <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                              {po.warehouseName}
                            </td>
                            <td className="py-2.5 px-4 min-w-[220px]">
                              <div className="font-mono text-[11px] text-orange-600 dark:text-orange-400 font-semibold">
                                {po.itemId}
                              </div>
                              <div className="font-medium">{po.itemName}</div>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                              {po.totalQty}
                            </td>
                            <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                              <div>Inv: {po.invoiceNo || '-'}</div>
                              <div className="text-[11px] text-slate-500">ASN: {po.asn || '-'}</div>
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <div className="font-medium">{po.logisticsPortal || '-'}</div>
                              <div className="font-mono text-[11px] text-slate-500">
                                LR: {po.pickupTrackingId || '-'}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              {matchingDn ? (
                                <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-[11px] font-mono">
                                  DN Logged: {matchingDn.dnNumber} (Qty: {matchingDn.dnQty})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                  In Transit · Ready for DN
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              {canUserManageDn ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (matchingDn) {
                                      setEditingDn(matchingDn);
                                      setPrefillDnFromPo(null);
                                    } else {
                                      setEditingDn(null);
                                      setPrefillDnFromPo(po);
                                    }
                                    setIsDnModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>
                                    {matchingDn ? 'Update DN Note' : '+ Create DN from Product'}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">Read-Only</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Official Logged DN Tracker Table */}
            <div
              className={`rounded-xl border overflow-hidden ${
                darkMode
                  ? 'bg-slate-900 border-slate-800'
                  : isGrey
                  ? 'bg-zinc-100 border-zinc-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold">
                    04. Instamart DN Tracker — Logged Discrepancy Notes ({filteredDnList.length})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    DN Date · DN Number · Facility Name · Parent PO Details · DN SKU ID | Item Name · DN QTY · WH POC Name / Contact · LR No
                  </p>
                </div>
              </div>

              {filteredDnList.length === 0 ? (
                <div className="p-10 sm:p-12 text-center space-y-3">
                  <div className="text-sm font-semibold">No Discrepancy Notes Logged Yet</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click "+ Create DN from Product" on any In-Transit product above or click below to log a DN manually.
                  </p>
                  {canUserManageDn && (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDn(null);
                          setPrefillDnFromPo(null);
                          setIsDnModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First DN Tracker Entry</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={`border-b font-semibold ${
                          darkMode
                            ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <th className="py-3 px-4 whitespace-nowrap">DN Date</th>
                        <th className="py-3 px-4 whitespace-nowrap">DN Number</th>
                        <th className="py-3 px-4 whitespace-nowrap">Facility Name</th>
                        <th className="py-3 px-4 whitespace-nowrap">Parent PO Details</th>
                        <th className="py-3 px-4 whitespace-nowrap">DN SKU ID | Item Name</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">DN QTY</th>
                        <th className="py-3 px-4 whitespace-nowrap">WH POC Name / Contact Details</th>
                        <th className="py-3 px-4 whitespace-nowrap">LR No</th>
                        <th className="py-3 px-4 whitespace-nowrap">Updated By (Team Member)</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Edit / Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredDnList.map((dn) => (
                        <tr
                          key={dn.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            {dn.dnDate}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            {dn.dnNumber}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium">
                            {dn.facilityName}
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            {dn.parentPoDetails}
                          </td>
                          <td className="py-3 px-4 min-w-[220px] font-medium">
                            {dn.dnSkuIdItemName}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-red-600 dark:text-red-400">
                            {dn.dnQty}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {dn.whPocDetails}
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap font-semibold">
                            {dn.lrNo}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold">{dn.updatedByName}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              ID: {dn.updatedByEmpId}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canUserManageDn ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDn(dn);
                                    setPrefillDnFromPo(null);
                                    setIsDnModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Update DN</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">Read-Only</span>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => requestDeleteDn(dn)}
                                  className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                  title="Admin Delete DN"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4B: INSTAMART POC TEAM DIRECTORY (CONTACT NUMBERS & EMAIL IDS) */}
        {activeTab === 'POC_DIRECTORY' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : isGrey
                ? 'bg-zinc-100 border-zinc-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <span>
                    Instamart POC Team Contact Directory — Facility POC Phone Numbers & Email IDs
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Centralized directory of all Instamart Warehouse / Hub POC Team members, Contact Numbers, and Email IDs. Automatically syncs with the DN Tracker modal.
                </p>
              </div>
              {(isAdmin || isBackoffice || canUserEditPo || canUserManageLogistics) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPoc(null);
                    setPocForm({
                      facilityName: '',
                      pocName: '',
                      designation: 'Warehouse / Facility POC',
                      contactNumber: '',
                      emailId: '',
                      cityOrHub: '',
                    });
                    setIsPocModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Instamart POC Contact</span>
                </button>
              )}
            </div>

            {filteredPocList.length === 0 ? (
              <div className="p-10 sm:p-12 text-center space-y-3">
                <div className="text-sm font-semibold">
                  No Instamart POC Team Contacts Added Yet
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Add Instamart Facility / Warehouse POC names, mobile numbers, and official email IDs so all teams can reach them and auto-fill POC details in DN Notes.
                </p>
                {(isAdmin || isBackoffice || canUserEditPo || canUserManageLogistics) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPoc(null);
                      setPocForm({
                        facilityName: '',
                        pocName: '',
                        designation: 'Warehouse / Facility POC',
                        contactNumber: '',
                        emailId: '',
                        cityOrHub: '',
                      });
                      setIsPocModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add First Instamart POC Contact</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        darkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <th className="py-3 px-4 whitespace-nowrap">Facility / Warehouse Name</th>
                      <th className="py-3 px-4 whitespace-nowrap">City / Hub</th>
                      <th className="py-3 px-4 whitespace-nowrap">POC Name</th>
                      <th className="py-3 px-4 whitespace-nowrap">Role / Designation</th>
                      <th className="py-3 px-4 whitespace-nowrap">Contact Number</th>
                      <th className="py-3 px-4 whitespace-nowrap">Official Email ID</th>
                      <th className="py-3 px-4 whitespace-nowrap">Updated By</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredPocList.map((poc) => (
                      <tr
                        key={poc.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                          {poc.facilityName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {poc.cityOrHub || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold whitespace-nowrap">
                          {poc.pocName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {poc.designation || 'Warehouse POC'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                          <a
                            href={`tel:${poc.contactNumber}`}
                            className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{poc.contactNumber}</span>
                          </a>
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          {poc.emailId ? (
                            <a
                              href={`mailto:${poc.emailId}`}
                              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>{poc.emailId}</span>
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {poc.updatedByName}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {(isAdmin || isBackoffice || canUserEditPo || canUserManageLogistics) && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPoc(poc);
                                  setPocForm({
                                    facilityName: poc.facilityName,
                                    pocName: poc.pocName,
                                    designation: poc.designation || 'Warehouse / Facility POC',
                                    contactNumber: poc.contactNumber,
                                    emailId: poc.emailId || '',
                                    cityOrHub: poc.cityOrHub || '',
                                  });
                                  setIsPocModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              {(isAdmin || isBackoffice) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePocContact(poc)}
                                  className="p-1.5 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                  title="Delete POC Contact"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ADMIN MASTER CONTROLLER FOR ALL BACKOFFICE & ALL STAFF + AUDIT LOG */}
        {activeTab === 'ADMIN_AUDIT' && (
          <div className="space-y-6">
            {/* Admin Master Controller Panel */}
            <div
              className={`rounded-xl border overflow-hidden ${
                darkMode
                  ? 'bg-slate-900 border-slate-800'
                  : isGrey
                  ? 'bg-zinc-100 border-zinc-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0" />
                    <span>
                      Admin Master Controller — All Backoffice & Staff Access & Permissions
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click any permission badge below to instantly turn ON / OFF data entry access for any Backoffice, Warehouse, Logistics, or Print staff member. Changes apply live to the employee's panel.
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkBackofficeAndStaffControl('ENABLE_ALL_BACKOFFICE')
                      }
                      className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold cursor-pointer"
                    >
                      Grant Full Access to All Backoffice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkBackofficeAndStaffControl('ENABLE_ALL_STAFF')}
                      className="px-3 py-2 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-semibold cursor-pointer"
                    >
                      Enable All Staff Permissions
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBulkBackofficeAndStaffControl('RESTRICT_NON_ADMIN')
                      }
                      className="px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-xs font-semibold cursor-pointer"
                    >
                      Lock All Non-Admin Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEmployee(null);
                        setIsEmployeeModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Add New Staff / Backoffice</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        darkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <th className="py-3 px-4 whitespace-nowrap">Staff Name & Email</th>
                      <th className="py-3 px-4 whitespace-nowrap">Employee ID</th>
                      <th className="py-3 px-4 whitespace-nowrap">Department Role (Admin Switch)</th>
                      <th className="py-3 px-4 whitespace-nowrap">Portal Access Status</th>
                      <th className="py-3 px-4">
                        Live Module & Backoffice Permissions (Click Badge to Toggle ON / OFF)
                      </th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">
                        Admin Staff Controller
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {employeesList.map((emp) => {
                      const empPerms = {
                        ...getDefaultPermissionsForRole(emp.role),
                        ...(emp.permissions || {}),
                      };
                      const permButtons: {
                        key: keyof NonNullable<EmployeeProfile['permissions']>;
                        label: string;
                      }[] = [
                        { key: 'canEditPo', label: 'PO & In-Transit' },
                        { key: 'canManageCatalog', label: 'SKU Master (Add/Del)' },
                        { key: 'canManageLogistics', label: 'Logistics & Delivery' },
                        { key: 'canVerifyPrint', label: 'Print Verify' },
                        { key: 'canManageGrn', label: 'GRN Inward' },
                        { key: 'canManageDn', label: 'DN Notes' },
                      ];

                      return (
                        <tr
                          key={emp.uid}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold">{emp.employeeName}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {emp.email || 'No email'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            {emp.employeeId}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isAdmin ? (
                              <select
                                value={emp.role}
                                onChange={(e) =>
                                  handleQuickChangeEmployeeRole(
                                    emp,
                                    e.target.value as TeamRole
                                  )
                                }
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold uppercase cursor-pointer ${
                                  darkMode
                                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                                    : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              >
                                <option value="admin">ADMIN</option>
                                <option value="backoffice">BACKOFFICE</option>
                                <option value="logistics">LOGISTICS</option>
                                <option value="print">PRINT TEAM</option>
                                <option value="warehouse">WAREHOUSE / GRN</option>
                              </select>
                            ) : (
                              <span className="uppercase font-mono text-[11px] font-bold">
                                {emp.role}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleQuickToggleEmployeeStatus(emp)}
                                className={`px-2.5 py-1 rounded-md font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer ${
                                  emp.accessStatus === 'RESTRICTED'
                                    ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                }`}
                                title="Click to toggle Approved / Restricted"
                              >
                                {emp.accessStatus === 'RESTRICTED' ? (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    <span>RESTRICTED (Click to Approve)</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>APPROVED (Active)</span>
                                  </>
                                )}
                              </button>
                            ) : emp.accessStatus === 'RESTRICTED' ? (
                              <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 font-bold text-[11px]">
                                RESTRICTED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                APPROVED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 min-w-[340px]">
                            <div className="flex flex-wrap gap-1.5">
                              {permButtons.map((pb) => {
                                const active = Boolean(empPerms[pb.key]);
                                return (
                                  <button
                                    key={pb.key}
                                    type="button"
                                    disabled={!isAdmin}
                                    onClick={() =>
                                      handleQuickToggleEmployeePerm(emp, pb.key)
                                    }
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                                      isAdmin ? 'cursor-pointer' : 'cursor-default'
                                    } ${
                                      active
                                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-400 line-through'
                                    }`}
                                    title={
                                      isAdmin
                                        ? `Click to turn ${active ? 'OFF' : 'ON'} ${pb.label}`
                                        : pb.label
                                    }
                                  >
                                    <span>{pb.label}:</span>
                                    <span className="font-bold">
                                      {active ? 'ON' : 'OFF'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {isAdmin ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetAllEmployeePerms(emp, true)}
                                  className="px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 cursor-pointer"
                                  title="Grant all module permissions to this employee"
                                >
                                  Grant All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetAllEmployeePerms(emp, false)}
                                  className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold hover:bg-amber-500/20 cursor-pointer"
                                  title="Revoke all module permissions from this employee"
                                >
                                  Revoke All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmployee(emp);
                                    setIsEmployeeModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Full Edit</span>
                                </button>
                                {emp.uid !== firebaseUser.uid && (
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteEmployee(emp)}
                                    className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                    title="Delete Employee"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">Admin Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity & Audit Log Table */}
            <div
              className={`rounded-xl border overflow-hidden ${
                darkMode
                  ? 'bg-slate-900 border-slate-800'
                  : isGrey
                  ? 'bg-zinc-100 border-zinc-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold">
                    05. Admin Employee Activity & Data Entry Audit Trail
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Every time any Backoffice, Warehouse, Logistics, Print, or Admin employee creates or updates a PO, In-Transit status, GRN, POC Contact, or DN record, their Employee Name and Employee ID are displayed here.
                  </p>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-10 sm:p-12 text-center space-y-2">
                  <div className="text-sm font-semibold">No Employee Activity Recorded Yet</div>
                  <p className="text-xs text-slate-500">
                    All PO and DN entries and updates will appear here with the acting employee's Name and Employee ID.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={`border-b font-semibold ${
                          darkMode
                            ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <th className="py-3 px-4 whitespace-nowrap">Employee Name</th>
                        <th className="py-3 px-4 whitespace-nowrap">Employee ID</th>
                        <th className="py-3 px-4 whitespace-nowrap">Team Role</th>
                        <th className="py-3 px-4 whitespace-nowrap">Module</th>
                        <th className="py-3 px-4 whitespace-nowrap">Action</th>
                        <th className="py-3 px-4 whitespace-nowrap">Reference (PO / DN)</th>
                        <th className="py-3 px-4">Audit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold whitespace-nowrap">
                            {log.employeeName}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            {log.employeeId}
                          </td>
                          <td className="py-3 px-4 uppercase font-mono text-[11px] whitespace-nowrap">
                            {log.employeeRole}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                            {log.module}
                          </td>
                          <td className="py-3 px-4 font-semibold whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            {log.referenceNo}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* POC Contact Add / Edit Modal */}
      {isPocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold">
                  {editingPoc
                    ? `Edit Instamart POC: ${editingPoc.pocName}`
                    : 'Add Instamart Facility POC Contact'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save Facility Name, POC Name, Contact Number, and Email ID for the Instamart POC Team directory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPocModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePocContact} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">
                    Facility / Warehouse Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={pocForm.facilityName}
                    onChange={(e) =>
                      setPocForm((prev) => ({ ...prev, facilityName: e.target.value }))
                    }
                    placeholder="e.g. BLR-IM-HUB-04"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">City / Region Hub</label>
                  <input
                    type="text"
                    value={pocForm.cityOrHub}
                    onChange={(e) =>
                      setPocForm((prev) => ({ ...prev, cityOrHub: e.target.value }))
                    }
                    placeholder="e.g. Bangalore / Kolkata / Mumbai"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">POC Full Name *</label>
                  <input
                    type="text"
                    required
                    value={pocForm.pocName}
                    onChange={(e) =>
                      setPocForm((prev) => ({ ...prev, pocName: e.target.value }))
                    }
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Role / Designation</label>
                  <input
                    type="text"
                    value={pocForm.designation}
                    onChange={(e) =>
                      setPocForm((prev) => ({ ...prev, designation: e.target.value }))
                    }
                    placeholder="e.g. Inward / GRN Lead"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={pocForm.contactNumber}
                    onChange={(e) =>
                      setPocForm((prev) => ({ ...prev, contactNumber: e.target.value }))
                    }
                    placeholder="e.g. +91 9876543210"
                    className={`w-full px-3 py-2 rounded-lg border font-mono ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Official Email ID *</label>
                  <input
                    type="email"
                    required
                    value={pocForm.emailId}
                    onChange={(e) =>
                      setPocForm((prev) => ({ ...prev, emailId: e.target.value }))
                    }
                    placeholder="e.g. poc.blr04@swiggy.in"
                    className={`w-full px-3 py-2 rounded-lg border font-mono ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPocModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold cursor-pointer"
                >
                  {editingPoc ? 'Update POC Contact' : 'Save POC Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <PoFormModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        onSave={handleSavePo}
        initialPo={editingPo}
        darkMode={darkMode}
        userRole={employeeProfile.role}
        catalogItems={catalogItems}
        existingPos={purchaseOrders}
      />

      <DnFormModal
        isOpen={isDnModalOpen}
        onClose={() => setIsDnModalOpen(false)}
        onSave={handleSaveDn}
        initialDn={editingDn}
        prefillFromPo={prefillDnFromPo}
        purchaseOrders={purchaseOrders}
        pocContacts={pocContacts}
        darkMode={darkMode}
      />

      <GrnUpdateModal
        isOpen={isGrnModalOpen}
        onClose={() => setIsGrnModalOpen(false)}
        po={grnTargetPo}
        mode={grnModalMode}
        onConfirm={handleConfirmGrnUpdate}
        onOpenDnTrackerWithPo={(po) => {
          setEditingDn(null);
          setPrefillDnFromPo(po);
          setIsDnModalOpen(true);
        }}
        darkMode={darkMode}
      />

      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        initialEmployee={editingEmployee}
        themeMode={themeMode}
      />

      <ProductCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        catalogItems={catalogItems}
        canManageCatalog={canManageCatalog}
        onAddCatalogItem={handleAddCatalogItem}
        onDeleteCatalogItem={handleDeleteCatalogItem}
        themeMode={themeMode}
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        darkMode={darkMode}
      />
    </div>
  );
}
