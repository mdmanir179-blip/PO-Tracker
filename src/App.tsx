import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
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
  Upload,
  Sun,
  Moon,
  LogOut,
  Truck,
  PackageCheck,
  Edit3,
  Lock,
  Trash2,
} from 'lucide-react';
import {
  db,
  initAuth,
  emailSignUp,
  emailSignIn,
  googleSignIn,
  logout,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  TeamRole,
  EmployeeProfile,
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
  exportMasterWorkbookToExcel,
  parseExcelForPoEntries,
  parseExcelForDnEntries,
  exportPoListToExcel,
  exportPoListToCsv,
  exportPoListToPdf,
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

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('instamart_theme') === 'dark';
  });

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('PO_ENTRY');
  const [searchQuery, setSearchQuery] = useState('');

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [dnRecords, setDnRecords] = useState<DnRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Modals state
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);

  const [isDnModalOpen, setIsDnModalOpen] = useState(false);
  const [editingDn, setEditingDn] = useState<DnRecord | null>(null);
  const [prefillDnFromPo, setPrefillDnFromPo] = useState<PurchaseOrder | null>(null);

  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [grnTargetPo, setGrnTargetPo] = useState<PurchaseOrder | null>(null);
  const [grnModalMode, setGrnModalMode] = useState<'INWARD_TO_GRN' | 'UPDATE_GRN_DN'>('INWARD_TO_GRN');

  const [excelStatus, setExcelStatus] = useState<string | null>(null);
  const poExcelInputRef = useRef<HTMLInputElement>(null);
  const dnExcelInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    localStorage.setItem('instamart_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

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
            setEmployeeProfile(snap.data() as EmployeeProfile);
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

    return () => {
      unsubPo();
      unsubDn();
      unsubLogs();
    };
  }, [authReady, firebaseUser, employeeProfile]);

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

  // Sign Up with Email, Password, Employee Name, Employee ID, and Role
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
      await setDoc(docRef, {
        uid: user.uid,
        employeeName: data.employeeName.slice(0, 100),
        employeeId: data.employeeId.slice(0, 50),
        role: data.role,
        spreadsheetId: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEmployeeProfile({
        uid: user.uid,
        employeeName: data.employeeName.slice(0, 100),
        employeeId: data.employeeId.slice(0, 50),
        role: data.role,
        spreadsheetId: '',
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
        setEmployeeProfile(snap.data() as EmployeeProfile);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Login failed. Please check your Email ID and Password.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      const user = await googleSignIn();
      setFirebaseUser(user);
    } catch (err: any) {
      setAuthError(err?.message || 'Google Sign-In failed.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleCompleteGoogleProfile = async (data: {
    employeeName: string;
    employeeId: string;
    role: TeamRole;
  }) => {
    if (!firebaseUser) return;
    setIsSubmittingAuth(true);
    setAuthError(null);
    const docRef = doc(db, 'employees', firebaseUser.uid);
    try {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        await updateDoc(docRef, {
          employeeName: data.employeeName.slice(0, 100),
          employeeId: data.employeeId.slice(0, 50),
          role: data.role,
          spreadsheetId: '',
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(docRef, {
          uid: firebaseUser.uid,
          employeeName: data.employeeName.slice(0, 100),
          employeeId: data.employeeId.slice(0, 50),
          role: data.role,
          spreadsheetId: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setEmployeeProfile({
        uid: firebaseUser.uid,
        employeeName: data.employeeName.slice(0, 100),
        employeeId: data.employeeId.slice(0, 50),
        role: data.role,
        spreadsheetId: '',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `employees/${firebaseUser.uid}`);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Create or Update Purchase Order
  const handleSavePo = async (values: PoFormValues) => {
    if (!firebaseUser || !employeeProfile) return;

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
        warehouseName: values.warehouseName.trim().slice(0, 120),
        itemId: values.itemId.trim().slice(0, 60),
        itemName: values.itemName.trim().slice(0, 200),
        totalQty: Number(values.totalQty) || 0,
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

        await recordActivity(
          shiftedToTransit ? 'Pickup YES → Shifted to In Transit' : 'Updated PO Details',
          shiftedToTransit ? 'IN_TRANSIT' : 'PO_ENTRY',
          values.poNumber,
          `${employeeProfile.employeeName} (${employeeProfile.employeeId}) updated PO ${values.poNumber}${
            shiftedToTransit ? ' and shifted it to In Transit (Locked for non-admin).' : '.'
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
        warehouseName: values.warehouseName.trim().slice(0, 120),
        itemId: values.itemId.trim().slice(0, 60),
        itemName: values.itemName.trim().slice(0, 200),
        totalQty: Number(values.totalQty) || 0,
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
        await recordActivity(
          values.pickupStatus === 'YES'
            ? 'Created PO & Shifted to In Transit'
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

  // Bulk Import / Update POs from Normal Excel File (.xlsx / .xls / .csv)
  const handlePoExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser || !employeeProfile) return;
    e.target.value = '';

    try {
      setExcelStatus('Importing PO data from Excel file...');
      const rows = await parseExcelForPoEntries(file);
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of rows) {
        const existingMatch = purchaseOrders.find(
          (p) => p.poNumber.toLowerCase() === item.poNumber.toLowerCase()
        );

        if (existingMatch) {
          // Respect In-Transit Lock for non-admins
          if (existingMatch.workflowStage === 'IN_TRANSIT' && employeeProfile.role !== 'admin') {
            continue;
          }
          const nextStage =
            item.pickupStatus === 'YES'
              ? 'IN_TRANSIT'
              : existingMatch.workflowStage;

          await updateDoc(doc(db, 'purchase_orders', existingMatch.id), {
            poNumber: item.poNumber.slice(0, 60),
            orderDate: item.orderDate.slice(0, 30),
            warehouseName: item.warehouseName.slice(0, 120),
            itemId: item.itemId.slice(0, 60),
            itemName: item.itemName.slice(0, 200),
            totalQty: Number(item.totalQty) || 0,
            invoiceNo: item.invoiceNo.slice(0, 80),
            shipDate: item.shipDate.slice(0, 30),
            appointmentId: item.appointmentId.slice(0, 80),
            appointmentDate: item.appointmentDate.slice(0, 30),
            so: item.so.slice(0, 80),
            status:
              item.pickupStatus === 'YES' && existingMatch.workflowStage === 'PO_ENTRY'
                ? 'In Transit'
                : item.status.slice(0, 60),
            noOfBoxes: Number(item.noOfBoxes) || 0,
            boxDimensions: item.boxDimensions.slice(0, 100),
            logisticsPortal: item.logisticsPortal.slice(0, 100),
            pickupTrackingId: item.pickupTrackingId.slice(0, 100),
            puc: item.puc.slice(0, 80),
            asn: item.asn.slice(0, 80),
            clearBagNo: item.clearBagNo.slice(0, 80),
            comment: item.comment.slice(0, 500),
            pickupStatus: item.pickupStatus,
            workflowStage: nextStage,
            updatedByUid: firebaseUser.uid,
            updatedByName: employeeProfile.employeeName.slice(0, 100),
            updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
            updatedAt: serverTimestamp(),
          });
          updatedCount++;
        } else {
          const poId = generateSafeId('po');
          await setDoc(doc(db, 'purchase_orders', poId), {
            poNumber: item.poNumber.slice(0, 60),
            orderDate: item.orderDate.slice(0, 30),
            warehouseName: item.warehouseName.slice(0, 120),
            itemId: item.itemId.slice(0, 60),
            itemName: item.itemName.slice(0, 200),
            totalQty: Number(item.totalQty) || 0,
            invoiceNo: item.invoiceNo.slice(0, 80),
            shipDate: item.shipDate.slice(0, 30),
            appointmentId: item.appointmentId.slice(0, 80),
            appointmentDate: item.appointmentDate.slice(0, 30),
            so: item.so.slice(0, 80),
            status: item.pickupStatus === 'YES' ? 'In Transit' : item.status.slice(0, 60),
            noOfBoxes: Number(item.noOfBoxes) || 0,
            boxDimensions: item.boxDimensions.slice(0, 100),
            logisticsPortal: item.logisticsPortal.slice(0, 100),
            pickupTrackingId: item.pickupTrackingId.slice(0, 100),
            puc: item.puc.slice(0, 80),
            asn: item.asn.slice(0, 80),
            clearBagNo: item.clearBagNo.slice(0, 80),
            comment: item.comment.slice(0, 500),
            pickupStatus: item.pickupStatus,
            workflowStage: item.pickupStatus === 'YES' ? 'IN_TRANSIT' : 'PO_ENTRY',
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
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          createdCount++;
        }
      }

      await recordActivity(
        'Excel File PO Import / Update',
        'PO_ENTRY',
        file.name,
        `${employeeProfile.employeeName} (${employeeProfile.employeeId}) imported Excel file "${file.name}" (${createdCount} new POs, ${updatedCount} updated POs).`
      );
      setExcelStatus(`Excel Imported: ${createdCount} new, ${updatedCount} updated`);
      setTimeout(() => setExcelStatus(null), 5000);
    } catch (err: any) {
      console.error('Excel import error:', err);
      setExcelStatus('Failed to read Excel file. Ensure column headers match PO Number, etc.');
      setTimeout(() => setExcelStatus(null), 5000);
    }
  };

  // Bulk Import / Update DN records from Normal Excel File (.xlsx / .xls / .csv)
  const handleDnExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser || !employeeProfile) return;
    e.target.value = '';

    try {
      setExcelStatus('Importing DN records from Excel file...');
      const rows = await parseExcelForDnEntries(file);
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of rows) {
        const existingMatch = dnRecords.find(
          (d) => d.dnNumber.toLowerCase() === item.dnNumber.toLowerCase()
        );
        if (existingMatch) {
          await updateDoc(doc(db, 'dn_records', existingMatch.id), {
            dnDate: item.dnDate.slice(0, 30),
            dnNumber: item.dnNumber.slice(0, 80),
            facilityName: item.facilityName.slice(0, 120),
            parentPoDetails: item.parentPoDetails.slice(0, 200),
            dnSkuIdItemName: item.dnSkuIdItemName.slice(0, 250),
            dnQty: Number(item.dnQty) || 0,
            whPocDetails: item.whPocDetails.slice(0, 200),
            lrNo: item.lrNo.slice(0, 80),
            reportFileName: item.reportFileName.slice(0, 200),
            reportFileType: item.reportFileType.slice(0, 100),
            reportFileSize: Number(item.reportFileSize) || 0,
            reportFileDataUrl: '',
            updatedByUid: firebaseUser.uid,
            updatedByName: employeeProfile.employeeName.slice(0, 100),
            updatedByEmpId: employeeProfile.employeeId.slice(0, 50),
            updatedAt: serverTimestamp(),
          });
          updatedCount++;
        } else {
          const dnId = generateSafeId('dn');
          await setDoc(doc(db, 'dn_records', dnId), {
            dnDate: item.dnDate.slice(0, 30),
            dnNumber: item.dnNumber.slice(0, 80),
            facilityName: item.facilityName.slice(0, 120),
            parentPoDetails: item.parentPoDetails.slice(0, 200),
            dnSkuIdItemName: item.dnSkuIdItemName.slice(0, 250),
            dnQty: Number(item.dnQty) || 0,
            whPocDetails: item.whPocDetails.slice(0, 200),
            lrNo: item.lrNo.slice(0, 80),
            reportFileName: item.reportFileName.slice(0, 200),
            reportFileType: item.reportFileType.slice(0, 100),
            reportFileSize: Number(item.reportFileSize) || 0,
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
          createdCount++;
        }
      }

      await recordActivity(
        'Excel File DN Import / Update',
        'DN_TRACKER',
        file.name,
        `${employeeProfile.employeeName} (${employeeProfile.employeeId}) imported DN Excel "${file.name}" (${createdCount} new DNs, ${updatedCount} updated DNs).`
      );
      setExcelStatus(`DN Excel Imported: ${createdCount} new, ${updatedCount} updated`);
      setTimeout(() => setExcelStatus(null), 5000);
    } catch (err) {
      console.error('DN Excel import error:', err);
      setExcelStatus('Failed to read DN Excel file.');
      setTimeout(() => setExcelStatus(null), 5000);
    }
  };

  // Quick toggle Pickup Status YES on PO Entry table row -> Shifts to In Transit
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
      await recordActivity(
        'Pickup Status YES → Shifted to In Transit',
        'IN_TRANSIT',
        po.poNumber,
        `${employeeProfile.employeeName} (${employeeProfile.employeeId}) marked Pickup Status YES for PO ${po.poNumber}. Record shifted to In Transit and locked for non-admins.`
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
        reportFileName: values.reportFileName.slice(0, 200),
        reportFileType: values.reportFileType.slice(0, 100),
        reportFileSize: Number(values.reportFileSize) || 0,
        reportFileDataUrl: values.reportFileDataUrl.slice(0, 750000),
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
        reportFileName: values.reportFileName.slice(0, 200),
        reportFileType: values.reportFileType.slice(0, 100),
        reportFileSize: Number(values.reportFileSize) || 0,
        reportFileDataUrl: values.reportFileDataUrl.slice(0, 750000),
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

  if (!authReady || isLoadingProfile) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'
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
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onEmailSignUp={handleEmailSignUp}
        onEmailSignIn={handleEmailSignIn}
        onGoogleLogin={handleGoogleLogin}
        onCompleteGoogleProfile={handleCompleteGoogleProfile}
        isSubmitting={isSubmittingAuth}
        authError={authError}
      />
    );
  }

  const isAdmin = employeeProfile.role === 'admin';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Hidden File Inputs for Normal Excel (.xlsx/.csv) Import/Update */}
      <input
        ref={poExcelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handlePoExcelUpload}
        className="hidden"
      />
      <input
        ref={dnExcelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleDnExcelUpload}
        className="hidden"
      />

      {/* Top Bar Contract: Zone 1 Brand | Zone 2 Nav Tabs | Zone 3 Actions */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Zone 1: Brand Title */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight whitespace-nowrap"
        >
          Instamart PO & DN Tracker
        </a>

        {/* Zone 2: 6 Primary Navigation Links */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'DASHBOARD'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Performance Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PO_ENTRY')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'PO_ENTRY'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            01. New PO Entry ({purchaseOrders.filter((p) => p.workflowStage === 'PO_ENTRY').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('IN_TRANSIT')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'IN_TRANSIT'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            02. In Transit ({purchaseOrders.filter((p) => p.workflowStage === 'IN_TRANSIT').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GRN')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'GRN'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            03. GRN & Inward ({purchaseOrders.filter((p) => p.workflowStage === 'GRN').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DN_TRACKER')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'DN_TRACKER'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            04. Instamart DN Tracker ({dnRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ADMIN_AUDIT')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ADMIN_AUDIT'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            05. Admin Employee Log ({activityLogs.length})
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Master Excel Download, Theme Toggle, Logout) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              exportMasterWorkbookToExcel(purchaseOrders, dnRecords, activityLogs)
            }
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              darkMode
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Download Full Excel Workbook (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-amber-400 hover:bg-slate-700'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-red-400'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-red-600'
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Tab Selector + Employee Identity Context Strip */}
      <div
        className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-xs ${
          darkMode
            ? 'bg-slate-900/50 border-slate-800 text-slate-300'
            : 'bg-slate-100/80 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span>Active Employee:</span>
          <strong className={darkMode ? 'text-white' : 'text-slate-900'}>
            {employeeProfile.employeeName}
          </strong>
          <span>·</span>
          <span className="font-mono">ID: {employeeProfile.employeeId}</span>
          <span>·</span>
          <span>
            Team Role:{' '}
            <strong className="text-orange-600 dark:text-orange-400 uppercase">
              {employeeProfile.role}
            </strong>
          </span>
          {excelStatus && (
            <>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {excelStatus}
              </span>
            </>
          )}
        </div>

        {/* Mobile/Tablet Navigation Buttons */}
        <div className="flex lg:hidden items-center gap-1 overflow-x-auto">
          {(
            [
              ['DASHBOARD', 'Dashboard'],
              ['PO_ENTRY', 'PO Entry'],
              ['IN_TRANSIT', 'In Transit'],
              ['GRN', 'GRN'],
              ['DN_TRACKER', 'DN Tracker'],
              ['ADMIN_AUDIT', 'Admin Log'],
            ] as [ActiveTab, string][]
          ).map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${
                activeTab === tabKey
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Summary Metrics Bar */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="pr-4 border-r border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Active PO Entry Queue
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums mt-1">
              {purchaseOrders.filter((p) => p.workflowStage === 'PO_ENTRY').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Awaiting Pickup Status: YES
            </div>
          </div>

          <div className="pr-4 sm:border-r border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              In Transit Shipments
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-amber-600 dark:text-amber-400">
              {purchaseOrders.filter((p) => p.workflowStage === 'IN_TRANSIT').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Locked for Employees · Admin Editable
            </div>
          </div>

          <div className="pr-4 border-r border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Inwarded GRN Records
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
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
            <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-orange-600 dark:text-orange-400">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PO Number, Warehouse, Item SKU, DN No, LR No, or Employee..."
              className={`w-full pl-9 pr-4 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Context-Specific Primary Action + Normal Excel Import/Update + PDF / Excel / CSV Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'PO_ENTRY' && (
              <>
                <button
                  type="button"
                  onClick={() => poExcelInputRef.current?.click()}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Import / Update from Excel</span>
                </button>
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
                  <span>Download CSV</span>
                </button>
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
              </>
            )}

            {activeTab === 'IN_TRANSIT' && (
              <>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => poExcelInputRef.current?.click()}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      darkMode
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Update from Excel (Admin)</span>
                  </button>
                )}
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
                  <span>Download CSV</span>
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
                  <span>Download CSV</span>
                </button>
              </>
            )}

            {activeTab === 'DN_TRACKER' && (
              <>
                <button
                  type="button"
                  onClick={() => dnExcelInputRef.current?.click()}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    darkMode
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Import / Update DN Excel</span>
                </button>
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
                  <span>Download CSV</span>
                </button>
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
                  <span>+ Add DN Tracker Report</span>
                </button>
              </>
            )}

            {activeTab === 'ADMIN_AUDIT' && (
              <>
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
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">
                  01. Instamart New PO Entry (Backoffice & Admin)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  All 21 PO fields · Switching Pickup Status to YES immediately shifts the entire PO to the In Transit tab. You can also import/update directly from an Excel (.xlsx) file.
                </p>
              </div>
            </div>

            {poEntryList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-sm font-semibold">No Pending PO Entries</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When a new Instamart PO arrives, click below to enter all 21 PO parameters or upload an Excel (.xlsx) sheet.
                </p>
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
                  <button
                    type="button"
                    onClick={() => poExcelInputRef.current?.click()}
                    className={`px-4 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <span>Import from Excel (.xlsx)</span>
                  </button>
                </div>
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
                      <th className="py-3 px-4 whitespace-nowrap">PO Number & Date</th>
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
                    {poEntryList.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div className="font-bold text-orange-600 dark:text-orange-400">
                            {po.poNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">{po.orderDate}</div>
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
                          <button
                            type="button"
                            onClick={() => handleQuickShiftToInTransit(po)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Mark Pickup: YES</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IN TRANSIT */}
        {activeTab === 'IN_TRANSIT' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <span>02. In Transit Shipments (Pickup Status: YES)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  PO fields in this tab are locked for standard employees and can only be edited by Admin. When inwarding succeeds, click "Inward Success → GRN".
                </p>
              </div>
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>
                  {isAdmin
                    ? 'Admin Override Active: You can edit all In-Transit fields'
                    : 'Employee Read-Only Lock Active (Admin only for edits)'}
                </span>
              </div>
            </div>

            {inTransitList.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="text-sm font-semibold">No Shipments Currently In Transit</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When Pickup Status is marked YES in the PO Entry tab, the entire PO record automatically shifts here.
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
                      <th className="py-3 px-4 whitespace-nowrap">PO Number & Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">Warehouse</th>
                      <th className="py-3 px-4 whitespace-nowrap">Item ID & Name</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Total Qty</th>
                      <th className="py-3 px-4 whitespace-nowrap">Invoice & Ship Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">Appointment ID / Date</th>
                      <th className="py-3 px-4 whitespace-nowrap">Boxes & Dimensions</th>
                      <th className="py-3 px-4 whitespace-nowrap">Logistics & Tracking</th>
                      <th className="py-3 px-4 whitespace-nowrap">PUC / ASN / Bag</th>
                      <th className="py-3 px-4 whitespace-nowrap">Updated By (Admin/Emp)</th>
                      <th className="py-3 px-4 whitespace-nowrap">Inward to GRN</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Edit Permission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {inTransitList.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div className="font-bold text-amber-600 dark:text-amber-400">
                            {po.poNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">{po.orderDate}</div>
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
                          <button
                            type="button"
                            onClick={() => {
                              setGrnTargetPo(po);
                              setGrnModalMode('INWARD_TO_GRN');
                              setIsGrnModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Inward Success → GRN</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPo(po);
                                setIsPoModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Admin Edit</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked (Admin Only)</span>
                            </span>
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

        {/* TAB 3: GRN & INWARD */}
        {activeTab === 'GRN' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">
                  03. GRN (Goods Receipt Note) & Discrepancy Note (DN) Updates
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Successfully inwarded POs automatically arrive here. Employees can update GRN DN remarks or raise an official DN Tracker entry.
                </p>
              </div>
            </div>

            {grnList.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="text-sm font-semibold">No Inwarded GRN Records Yet</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Mark any shipment as "Inward Success → GRN" from the In Transit tab to automatically move it to GRN.
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

        {/* TAB 4: INSTAMART DN TRACKER */}
        {activeTab === 'DN_TRACKER' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">
                  04. Instamart DN Tracker (Editable by Warehouse, Backoffice & Admin)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  DN Date · DN Number · Facility Name · Parent PO Details · DN SKU ID | Item Name · DN QTY · WH POC Name / Contact · Upload DN Report (PDF/Spreadsheet max 10 MB) · LR No
                </p>
              </div>
            </div>

            {filteredDnList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-sm font-semibold">No Discrepancy Notes Logged</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Warehouse and Backoffice teams can log and update Discrepancy Notes manually or import directly from an Excel (.xlsx) sheet.
                </p>
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
                  <button
                    type="button"
                    onClick={() => dnExcelInputRef.current?.click()}
                    className={`px-4 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <span>Import DN Excel (.xlsx)</span>
                  </button>
                </div>
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
                      <th className="py-3 px-4 whitespace-nowrap">Uploaded DN Report</th>
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
                          {dn.reportFileName ? (
                            dn.reportFileDataUrl.startsWith('data:') ? (
                              <a
                                href={dn.reportFileDataUrl}
                                download={dn.reportFileName}
                                className="text-orange-600 dark:text-orange-400 font-semibold hover:underline inline-flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[150px]">
                                  {dn.reportFileName}
                                </span>
                              </a>
                            ) : (
                              <span className="font-mono text-[11px]">
                                {dn.reportFileName} ({(dn.reportFileSize / 1024).toFixed(0)} KB)
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">No file uploaded</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold">{dn.updatedByName}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            ID: {dn.updatedByEmpId}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ADMIN EMPLOYEE AUDIT LOG */}
        {activeTab === 'ADMIN_AUDIT' && (
          <div
            className={`rounded-xl border overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">
                  05. Admin Employee Activity & Data Entry Audit Trail
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Every time any Backoffice, Warehouse, or Admin employee creates or updates a PO, In-Transit status, GRN, or DN record, their Employee Name and Employee ID are displayed here.
                </p>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center space-y-2">
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
        )}
      </main>

      {/* Modals */}
      <PoFormModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        onSave={handleSavePo}
        initialPo={editingPo}
        darkMode={darkMode}
        userRole={employeeProfile.role}
      />

      <DnFormModal
        isOpen={isDnModalOpen}
        onClose={() => setIsDnModalOpen(false)}
        onSave={handleSaveDn}
        initialDn={editingDn}
        prefillFromPo={prefillDnFromPo}
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
