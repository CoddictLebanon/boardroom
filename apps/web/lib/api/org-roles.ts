import { OrgRole, CreateOrgRoleInput, UpdateOrgRoleInput } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function getOrgRoles(companyId: string, token: string): Promise<OrgRole[]> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/org-roles`, token);
}

export async function getOrgRole(companyId: string, id: string, token: string): Promise<OrgRole> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/org-roles/${id}`, token);
}

export async function createOrgRole(
  companyId: string,
  data: CreateOrgRoleInput,
  token: string
): Promise<OrgRole> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/org-roles`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrgRole(
  companyId: string,
  id: string,
  data: UpdateOrgRoleInput,
  token: string
): Promise<OrgRole> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/org-roles/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteOrgRole(
  companyId: string,
  id: string,
  token: string
): Promise<{ message: string }> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/org-roles/${id}`, token, {
    method: 'DELETE',
  });
}

export async function updateOrgRolePositions(
  companyId: string,
  positions: { id: string; x: number; y: number }[],
  token: string
): Promise<{ message: string }> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/org-roles/positions`, token, {
    method: 'PUT',
    body: JSON.stringify({ positions }),
  });
}
