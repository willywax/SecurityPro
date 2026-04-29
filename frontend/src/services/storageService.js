import api from '@/lib/api';

const storageService = {
  uploadEmployeePhoto: async (employeeId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/employees/${employeeId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data; // { photo_url, gcs_path }
  },

  getEmployeePhoto: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/photo`);
    return response.data; // { photo_url }
  },

  deleteEmployeePhoto: async (employeeId) => {
    const response = await api.delete(`/employees/${employeeId}/photo`);
    return response.data;
  },

  getEmployeeDocuments: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/documents`);
    return response.data; // array of GCSDocumentResponse
  },

  uploadDocument: async (employeeId, file, documentType, title, notes) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { document_type: documentType, title, notes: notes || undefined },
    });
    return response.data;
  },

  deleteDocument: async (employeeId, docId) => {
    const response = await api.delete(`/employees/${employeeId}/documents/${docId}`);
    return response.data;
  },

  refreshSignedUrl: async (gcsPath, type = 'view', filename = null) => {
    const params = { path: gcsPath, type };
    if (filename) params.filename = filename;
    const response = await api.get('/files/signed-url', { params });
    return response.data; // { url, expires_in }
  },
};

export default storageService;
