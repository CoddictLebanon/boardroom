import type { OkrPeriod, Objective, KeyResult, OkrPeriodStatus, MetricType } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface FetchWithAuthOptions extends RequestInit {
  token: string;
}

async function fetchWithAuth(url: string, options: FetchWithAuthOptions) {
  const { token, ...fetchOptions } = options;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// OKR Period API Functions

export interface CreateOkrPeriodData {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateOkrPeriodData {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export async function getOkrPeriods(companyId: string, token: string): Promise<OkrPeriod[]> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods`, {
    method: "GET",
    token,
  });
}

export async function getOkrPeriod(companyId: string, periodId: string, token: string): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}`, {
    method: "GET",
    token,
  });
}

export async function createOkrPeriod(
  companyId: string,
  data: CreateOkrPeriodData,
  token: string
): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function updateOkrPeriod(
  companyId: string,
  periodId: string,
  data: UpdateOkrPeriodData,
  token: string
): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(data),
  });
}

export async function closeOkrPeriod(
  companyId: string,
  periodId: string,
  token: string
): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}/close`, {
    method: "POST",
    token,
  });
}

export async function reopenOkrPeriod(
  companyId: string,
  periodId: string,
  token: string
): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}/reopen`, {
    method: "POST",
    token,
  });
}

export async function deleteOkrPeriod(
  companyId: string,
  periodId: string,
  token: string
): Promise<void> {
  await fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}`, {
    method: "DELETE",
    token,
  });
}

// Objective API Functions

export interface CreateObjectiveData {
  title: string;
  order?: number;
}

export interface UpdateObjectiveData {
  title?: string;
  order?: number;
}

export async function createObjective(
  companyId: string,
  periodId: string,
  data: CreateObjectiveData,
  token: string
): Promise<Objective> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}/objectives`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function updateObjective(
  companyId: string,
  periodId: string,
  objectiveId: string,
  data: UpdateObjectiveData,
  token: string
): Promise<Objective> {
  return fetchWithAuth(
    `${API_URL}/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }
  );
}

export async function deleteObjective(
  companyId: string,
  periodId: string,
  objectiveId: string,
  token: string
): Promise<void> {
  await fetchWithAuth(
    `${API_URL}/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

// Key Result API Functions

export interface CreateKeyResultData {
  title: string;
  metricType: MetricType;
  startValue: number;
  targetValue: number;
  currentValue?: number;
  inverse?: boolean;
  comment?: string;
  order?: number;
}

export interface UpdateKeyResultData {
  title?: string;
  metricType?: MetricType;
  startValue?: number;
  targetValue?: number;
  currentValue?: number;
  inverse?: boolean;
  comment?: string;
  order?: number;
}

export async function createKeyResult(
  companyId: string,
  periodId: string,
  objectiveId: string,
  data: CreateKeyResultData,
  token: string
): Promise<KeyResult> {
  return fetchWithAuth(
    `${API_URL}/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`,
    {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }
  );
}

export async function updateKeyResult(
  companyId: string,
  periodId: string,
  objectiveId: string,
  keyResultId: string,
  data: UpdateKeyResultData,
  token: string
): Promise<KeyResult> {
  return fetchWithAuth(
    `${API_URL}/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results/${keyResultId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }
  );
}

export async function deleteKeyResult(
  companyId: string,
  periodId: string,
  objectiveId: string,
  keyResultId: string,
  token: string
): Promise<void> {
  await fetchWithAuth(
    `${API_URL}/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results/${keyResultId}`,
    {
      method: "DELETE",
      token,
    }
  );
}
