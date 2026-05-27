import api from "@/lib/api";

export interface Stock {
  id: string;
  name: string;
  streetAddress: string;
  email?: string;
  phoneNumber?: string;
  tinNumber?: string;
  status: "ENABLED" | "DISABLED";
  stockOwnerId: string;
  createdAt: string;
  updatedAt: string;
}

export const stockService = {
  async getStocks(): Promise<Stock[]> {
    const response = await api.get("/stocks");
    if (response.data?.success && Array.isArray(response.data?.data)) {
      return response.data.data.filter((s: Stock) => s.status === "ENABLED");
    }
    return [];
  },
};
