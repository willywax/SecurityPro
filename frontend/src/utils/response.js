export const unwrapListResponse = (response, key) => {
  const payload = response?.data?.data || response?.data || {};
  const items = payload.data || payload[key] || [];

  return {
    data: items,
    total: payload.total ?? items.length ?? 0,
    page: payload.page ?? 1,
    pageSize: payload.page_size ?? payload.pageSize ?? items.length ?? 0,
    totalPages: payload.total_pages ?? 1,
  };
};

export const unwrapSingleResponse = (response) => response?.data?.data || response?.data;
