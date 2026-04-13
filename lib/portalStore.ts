"use client";

import { useSyncExternalStore } from "react";
import type {
  Account,
  Branch,
  MockExam,
  MockScore,
  PhysicalRecord,
  PhysicalTest,
  Student,
} from "@/lib/dataService";
import { normalizeAccountRecord, normalizeStudentId } from "@/lib/dataService";

export type PortalStudentDetails = {
  mockExams: MockExam[];
  mockScores: MockScore[];
  physicalTests: PhysicalTest[];
  physicalRecords: PhysicalRecord[];
  loadedAt: number;
};

type PortalSharedState = {
  branches: Branch[];
  students: Student[];
  accounts: Account[];
  mockExams: MockExam[];
  mockScores: MockScore[];
  physicalTests: PhysicalTest[];
  physicalRecords: PhysicalRecord[];
  currentAccount: Account | null;
  isLoaded: boolean;
  isLoading: boolean;
  detailsCache: Record<string, PortalStudentDetails>;
  detailsLoading: Record<string, boolean>;
  hydratedAt: number;
};

type PortalLightData = {
  branches: Branch[];
  students: Student[];
  accounts?: Account[];
  mockExams?: MockExam[];
  mockScores?: MockScore[];
  physicalTests?: PhysicalTest[];
  physicalRecords?: PhysicalRecord[];
};

let portalSharedState: PortalSharedState = {
  branches: [],
  students: [],
  accounts: [],
  mockExams: [],
  mockScores: [],
  physicalTests: [],
  physicalRecords: [],
  currentAccount: null,
  isLoaded: false,
  isLoading: false,
  detailsCache: {},
  detailsLoading: {},
  hydratedAt: 0,
};

let portalLightDataPromise: Promise<PortalLightData> | null = null;
const detailsPromises = new Map<string, Promise<PortalStudentDetails>>();

const listeners = new Set<() => void>();
let changeNotificationScheduled = false;

function scheduleMicrotask(callback: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }

  Promise.resolve().then(callback);
}

function areAccountsEqual(left: Account | null, right: Account | null) {
  const normalizedLeft = normalizeAccountRecord(left);
  const normalizedRight = normalizeAccountRecord(right);

  if (!normalizedLeft || !normalizedRight) {
    return normalizedLeft === normalizedRight;
  }

  return (
    normalizedLeft.account_id === normalizedRight.account_id &&
    normalizedLeft.login_id === normalizedRight.login_id &&
    normalizedLeft.role === normalizedRight.role &&
    normalizedLeft.student_id === normalizedRight.student_id &&
    normalizedLeft.branch_id === normalizedRight.branch_id &&
    normalizedLeft.name === normalizedRight.name &&
    normalizedLeft.is_active === normalizedRight.is_active
  );
}

function hasPortalSharedStateChanges(nextState: Partial<PortalSharedState>) {
  const nextKeys = Object.keys(nextState) as Array<keyof PortalSharedState>;

  for (const key of nextKeys) {
    const nextValue = nextState[key];
    const currentValue = portalSharedState[key];

    if (key === "currentAccount") {
      if (!areAccountsEqual(currentValue as Account | null, nextValue as Account | null)) {
        return true;
      }

      continue;
    }

    if (!Object.is(currentValue, nextValue)) {
      return true;
    }
  }

  return false;
}

function emitChange() {
  if (changeNotificationScheduled) {
    return;
  }

  changeNotificationScheduled = true;

  scheduleMicrotask(() => {
    changeNotificationScheduled = false;
    Array.from(listeners).forEach((listener) => listener());
  });
}

function setPortalSharedState(nextState: Partial<PortalSharedState>, touchHydratedAt = true) {
  if (!hasPortalSharedStateChanges(nextState)) {
    return;
  }

  portalSharedState = {
    ...portalSharedState,
    ...nextState,
    hydratedAt: touchHydratedAt ? Date.now() : portalSharedState.hydratedAt,
  };

  emitChange();
}

export function subscribePortalSharedStore(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getPortalSharedSnapshot() {
  return portalSharedState;
}

export function usePortalSharedStore() {
  return useSyncExternalStore(subscribePortalSharedStore, getPortalSharedSnapshot, getPortalSharedSnapshot);
}

export function usePortalSharedBranches() {
  return useSyncExternalStore(
    subscribePortalSharedStore,
    () => portalSharedState.branches,
    () => portalSharedState.branches
  );
}

export function usePortalSharedStudents() {
  return useSyncExternalStore(
    subscribePortalSharedStore,
    () => portalSharedState.students,
    () => portalSharedState.students
  );
}

export function usePortalSharedLoadedState() {
  return useSyncExternalStore(
    subscribePortalSharedStore,
    () => portalSharedState.isLoaded,
    () => portalSharedState.isLoaded
  );
}

export async function ensurePortalSharedLightData(loader: () => Promise<PortalLightData>) {
  if (portalSharedState.isLoaded) {
    return {
      branches: portalSharedState.branches,
      students: portalSharedState.students,
      accounts: portalSharedState.accounts,
      mockExams: portalSharedState.mockExams,
      mockScores: portalSharedState.mockScores,
      physicalTests: portalSharedState.physicalTests,
      physicalRecords: portalSharedState.physicalRecords,
    } satisfies PortalLightData;
  }

  if (portalLightDataPromise) {
    return portalLightDataPromise;
  }

  setPortalSharedState({ isLoading: true }, false);

  portalLightDataPromise = loader()
    .then((result) => {
      const nextPayload = {
        branches: result.branches || [],
        students: result.students || [],
        accounts: result.accounts || portalSharedState.accounts,
        mockExams: result.mockExams || [],
        mockScores: result.mockScores || [],
        physicalTests: result.physicalTests || [],
        physicalRecords: result.physicalRecords || [],
      } satisfies PortalLightData;

      setPortalSharedState({
        ...nextPayload,
        isLoaded: true,
        isLoading: false,
      });

      return nextPayload;
    })
    .catch((error) => {
      setPortalSharedState({ isLoading: false }, false);
      throw error;
    })
    .finally(() => {
      portalLightDataPromise = null;
    });

  return portalLightDataPromise;
}

export function syncPortalSharedLightData(input: {
  branches?: Branch[];
  students?: Student[];
  accounts?: Account[];
  mockExams?: MockExam[];
  mockScores?: MockScore[];
  physicalTests?: PhysicalTest[];
  physicalRecords?: PhysicalRecord[];
}) {
  setPortalSharedState({
    branches: input.branches ?? portalSharedState.branches,
    students: input.students ?? portalSharedState.students,
    accounts: input.accounts ?? portalSharedState.accounts,
    mockExams: input.mockExams ?? portalSharedState.mockExams,
    mockScores: input.mockScores ?? portalSharedState.mockScores,
    physicalTests: input.physicalTests ?? portalSharedState.physicalTests,
    physicalRecords: input.physicalRecords ?? portalSharedState.physicalRecords,
    isLoaded: true,
    isLoading: false,
  });
}

export function syncPortalSharedCurrentAccount(currentAccount: Account | null) {
  setPortalSharedState({ currentAccount: normalizeAccountRecord(currentAccount) });
}

export function getPortalSharedStudentDetails(studentId: string) {
  let normalizedStudentId = "";

  try {
    normalizedStudentId = normalizeStudentId(studentId);
  } catch {
    return null;
  }

  return portalSharedState.detailsCache[normalizedStudentId] || null;
}

export function hasPortalSharedStudentDetails(studentId: string) {
  return !!getPortalSharedStudentDetails(studentId);
}

export function isPortalSharedStudentDetailsLoading(studentId: string) {
  let normalizedStudentId = "";

  try {
    normalizedStudentId = normalizeStudentId(studentId);
  } catch {
    return false;
  }

  return !!portalSharedState.detailsLoading[normalizedStudentId];
}

export function removePortalSharedStudentDetails(studentId: string) {
  let normalizedStudentId = "";

  try {
    normalizedStudentId = normalizeStudentId(studentId);
  } catch {
    return;
  }

  if (!portalSharedState.detailsCache[normalizedStudentId]) {
    return;
  }

  const nextDetailsCache = { ...portalSharedState.detailsCache };
  delete nextDetailsCache[normalizedStudentId];

  const nextDetailsLoading = { ...portalSharedState.detailsLoading };
  delete nextDetailsLoading[normalizedStudentId];

  detailsPromises.delete(normalizedStudentId);

  setPortalSharedState({
    detailsCache: nextDetailsCache,
    detailsLoading: nextDetailsLoading,
  });
}

export async function ensurePortalSharedStudentDetails(
  studentId: string,
  loader: () => Promise<Omit<PortalStudentDetails, "loadedAt">>
) {
  const normalizedStudentId = normalizeStudentId(studentId);

  const cachedDetails = getPortalSharedStudentDetails(normalizedStudentId);

  if (cachedDetails) {
    return cachedDetails;
  }

  const inFlightDetailsPromise = detailsPromises.get(normalizedStudentId);

  if (inFlightDetailsPromise) {
    return inFlightDetailsPromise;
  }

  setPortalSharedState(
    {
      detailsLoading: {
        ...portalSharedState.detailsLoading,
        [normalizedStudentId]: true,
      },
    },
    false
  );

  const nextPromise = loader()
    .then((result) => {
      const nextDetails: PortalStudentDetails = {
        mockExams: result.mockExams || [],
        mockScores: result.mockScores || [],
        physicalTests: result.physicalTests || [],
        physicalRecords: result.physicalRecords || [],
        loadedAt: Date.now(),
      };

      const nextLoading = { ...portalSharedState.detailsLoading };
      delete nextLoading[normalizedStudentId];

      setPortalSharedState({
        detailsCache: {
          ...portalSharedState.detailsCache,
          [normalizedStudentId]: nextDetails,
        },
        detailsLoading: nextLoading,
      });

      return nextDetails;
    })
    .catch((error) => {
      const nextLoading = { ...portalSharedState.detailsLoading };
      delete nextLoading[normalizedStudentId];
      setPortalSharedState({ detailsLoading: nextLoading }, false);
      throw error;
    })
    .finally(() => {
      detailsPromises.delete(normalizedStudentId);
    });

  detailsPromises.set(normalizedStudentId, nextPromise);

  return nextPromise;
}

export function upsertPortalSharedBranch(nextBranch: Branch) {
  const nextBranchId = String(nextBranch.branch_id ?? "").trim();

  if (!nextBranchId) {
    return;
  }

  const existingIndex = portalSharedState.branches.findIndex(
    (branch) => String(branch.branch_id ?? "").trim() === nextBranchId
  );

  const nextBranches =
    existingIndex === -1
      ? [nextBranch, ...portalSharedState.branches]
      : portalSharedState.branches.map((branch, index) =>
          index === existingIndex ? { ...branch, ...nextBranch } : branch
        );

  setPortalSharedState({ branches: nextBranches });
}

export function appendPortalSharedBranch(nextBranch: Branch) {
  const nextBranchId = String(nextBranch.branch_id ?? "").trim();

  if (!nextBranchId) {
    return;
  }

  const hasExistingBranch = portalSharedState.branches.some(
    (branch) => String(branch.branch_id ?? "").trim() === nextBranchId
  );

  if (hasExistingBranch) {
    upsertPortalSharedBranch(nextBranch);
    return;
  }

  setPortalSharedState({
    branches: [...portalSharedState.branches, nextBranch],
  });
}

export function removePortalSharedBranch(branchId: string) {
  const normalizedBranchId = String(branchId ?? "").trim();

  setPortalSharedState({
    branches: portalSharedState.branches.filter(
      (branch) => String(branch.branch_id ?? "").trim() !== normalizedBranchId
    ),
  });
}

export function upsertPortalSharedStudent(nextStudent: Student) {
  const nextStudentId = String(nextStudent.student_id ?? "").trim();

  if (!nextStudentId) {
    return;
  }

  const existingIndex = portalSharedState.students.findIndex(
    (student) => String(student.student_id ?? "").trim() === nextStudentId
  );

  const nextStudents =
    existingIndex === -1
      ? [nextStudent, ...portalSharedState.students]
      : portalSharedState.students.map((student, index) =>
          index === existingIndex ? { ...student, ...nextStudent } : student
        );

  setPortalSharedState({ students: nextStudents });
}

export function removePortalSharedStudent(studentId: string) {
  const normalizedStudentId = String(studentId ?? "").trim();

  setPortalSharedState({
    students: portalSharedState.students.filter(
      (student) => String(student.student_id ?? "").trim() !== normalizedStudentId
    ),
  });
}

export function resetPortalSharedStore() {
  portalLightDataPromise = null;
  detailsPromises.clear();
  portalSharedState = {
    branches: [],
    students: [],
    accounts: [],
    mockExams: [],
    mockScores: [],
    physicalTests: [],
    physicalRecords: [],
    currentAccount: null,
    isLoaded: false,
    isLoading: false,
    detailsCache: {},
    detailsLoading: {},
    hydratedAt: 0,
  };

  emitChange();
}