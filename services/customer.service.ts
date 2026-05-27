import api from "@/lib/api";

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: "ENABLED" | "DISABLED";
}

export const customerService = {
  async getCustomers(search?: string): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (search) {
      params.append("search", search);
    }
    params.append("status", "ENABLED");
    params.append("limit", "100");

    const response = await api.get(`/customers?${params.toString()}`);
    const resData = response.data;

    if (resData.success && resData.data) {
      if (Array.isArray(resData.data)) {
        return resData.data;
      }
      if (typeof resData.data === "object" && "customers" in resData.data) {
        return resData.data.customers;
      }
    }
    return [];
  },

  async createCustomer(name: string, phone?: string): Promise<Customer | null> {
    const response = await api.post("/customers", {
      name,
      phone,
      status: "ENABLED",
    });
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return null;
  },
};
