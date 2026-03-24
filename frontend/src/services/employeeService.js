import api from '@/lib/api';
import { createCrudService } from '@/services/serviceFactory';
import { unwrapListResponse, unwrapSingleResponse } from '@/utils/response';

const baseService = createCrudService('/employees', 'employees');

const normalizeEmployee = (employee) => {
  if (!employee) {
    return employee;
  }

  return {
    ...employee,
    full_name: [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' '),
    address: employee.physical_address || employee.postal_address || '',
    date_joined: employee.hire_date || '',
    date_left: employee.termination_date || '',
    id_number: employee.nin || '',
  };
};

const mapEmployeePayload = (data = {}) => ({
  first_name: data.first_name,
  middle_name: data.middle_name || null,
  last_name: data.last_name,
  gender: data.gender || null,
  date_of_birth: data.date_of_birth || null,
  marital_status: data.marital_status || null,
  nationality: data.nationality || null,
  nin: data.nin || data.id_number || null,
  phone_1: data.phone_1,
  phone_2: data.phone_2 || null,
  email: data.email || null,
  physical_address: data.address || data.physical_address || null,
  postal_address: data.postal_address || null,
  education_background: data.education_background || null,
  job_title: data.job_title || null,
  employment_status: data.employment_status || 'active',
  hire_date: data.date_joined || data.hire_date || null,
  termination_date: data.date_left || data.termination_date || null,
  notes: data.notes || null,
});

const employeeService = {
  ...baseService,
  getAll: async (params) => {
    const result = await baseService.getAll(params);
    return {
      ...result,
      data: result.data.map(normalizeEmployee),
    };
  },
  getById: async (id) => normalizeEmployee(await baseService.getById(id)),
  create: async (data) => normalizeEmployee(await baseService.create(mapEmployeePayload(data))),
  update: async (id, data) => normalizeEmployee(await baseService.update(id, mapEmployeePayload(data))),
  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/employees/${id}/upload-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeEmployee(unwrapSingleResponse(response));
  },
  getBankAccounts: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/bank-accounts`);
    return unwrapSingleResponse(response) || [];
  },
  addBankAccount: async (employeeId, data) => {
    const response = await api.post(`/employees/${employeeId}/bank-accounts`, data);
    return unwrapSingleResponse(response);
  },
  deleteBankAccount: async (employeeId, accountId) => {
    const response = await api.delete(`/employees/${employeeId}/bank-accounts/${accountId}`);
    return unwrapSingleResponse(response);
  },
  getReferees: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/referees`);
    return unwrapSingleResponse(response) || [];
  },
  addReferee: async (employeeId, data) => {
    const payload = {
      full_name: data.full_name || data.name,
      referee_relationship: data.referee_relationship || data.relationship,
      phone_number: data.phone_number || data.phone,
      alternate_phone: data.alternate_phone || null,
      id_type: data.id_type || null,
      id_number: data.id_number || null,
      address: data.address || null,
      occupation: data.occupation || data.organization || null,
      notes: data.notes || null,
    };
    const response = await api.post(`/employees/${employeeId}/referees`, payload);
    return unwrapSingleResponse(response);
  },
  deleteReferee: async (employeeId, refereeId) => {
    const response = await api.delete(`/employees/${employeeId}/referees/${refereeId}`);
    return unwrapSingleResponse(response);
  },
  getNextOfKin: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/next-of-kin`);
    return unwrapSingleResponse(response) || [];
  },
  addNextOfKin: async (employeeId, data) => {
    const payload = {
      full_name: data.full_name || data.name,
      kin_relationship: data.relationship || data.kin_relationship,
      phone_1: data.phone_1 || data.phone,
      phone_2: data.phone_2 || null,
      address: data.address || null,
      id_type: data.id_type || null,
      id_number: data.id_number || null,
      notes: data.notes || null,
    };
    const response = await api.post(`/employees/${employeeId}/next-of-kin`, payload);
    return unwrapSingleResponse(response);
  },
  deleteNextOfKin: async (employeeId, kinId) => {
    const response = await api.delete(`/employees/${employeeId}/next-of-kin/${kinId}`);
    return unwrapSingleResponse(response);
  },
  getContracts: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/contracts`);
    return unwrapSingleResponse(response) || [];
  },
  saveContract: async (employeeId, data, contractId) => {
    const payload = {
      contract_type: data.contract_type,
      start_date: data.start_date,
      end_date: data.end_date || null,
      salary: Number(data.salary || data.salary_amount || 0),
      allowances: Number(data.allowances || 0),
      status: data.status || 'draft',
      notes: data.notes || null,
    };
    const response = contractId
      ? await api.put(`/employees/${employeeId}/contracts/${contractId}`, payload)
      : await api.post(`/employees/${employeeId}/contracts`, payload);
    return unwrapSingleResponse(response);
  },
  deleteContract: async (employeeId, contractId) => {
    const response = await api.delete(`/employees/${employeeId}/contracts/${contractId}`);
    return unwrapSingleResponse(response);
  },
  getEmploymentHistory: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/employment-history`);
    return unwrapSingleResponse(response) || [];
  },
  addEmploymentHistory: async (employeeId, data) => {
    const payload = {
      employer: data.employer || data.employer_name,
      position: data.position || data.job_title,
      start_date: data.start_date,
      end_date: data.end_date || null,
      responsibilities: data.responsibilities || data.notes || null,
      reason_for_leaving: data.reason_for_leaving || null,
    };
    const response = await api.post(`/employees/${employeeId}/employment-history`, payload);
    return unwrapSingleResponse(response);
  },
  deleteEmploymentHistory: async (employeeId, historyId) => {
    const response = await api.delete(`/employees/${employeeId}/employment-history/${historyId}`);
    return unwrapSingleResponse(response);
  },
  getDocuments: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/documents`);
    return unwrapSingleResponse(response) || [];
  },
  uploadDocument: async (employeeId, data) => {
    const formData = new FormData();
    formData.append('file', data.file);
    const response = await api.post(`/employees/${employeeId}/upload-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: {
        document_type: data.document_type,
        document_name: data.document_name,
        notes: data.notes || '',
      },
    });
    return unwrapSingleResponse(response);
  },
  deleteDocument: async (employeeId, documentId) => {
    const response = await api.delete(`/employees/${employeeId}/documents/${documentId}`);
    return unwrapSingleResponse(response);
  },
};

export default employeeService;
