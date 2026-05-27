import api from "@/lib/api";

export interface Product {
  id: string;
  name: string;
  description?: string;
  costPrice: number;
  sellingPrice: number | null;
  thresholdValue: number;
  stockId: string;
  status: "ENABLED" | "DISABLED";
  uomId: string;
  uom: {
    id: string;
    name: string;
    symbol: string;
  };
}

export interface ProductsResponse {
  success: boolean;
  data?: {
    products: Product[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  } | Product[];
  message?: string;
}

export const productService = {
  async getProductsByStock(stockId: string, search?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    params.append("stockId", stockId);
    if (search) {
      params.append("search", search);
      params.append("name", search);
    }
    // High limit to fetch products for combobox selection
    params.append("limit", "200");
    params.append("status", "ENABLED");

    const response = await api.get(`/products?${params.toString()}`);
    const resData = response.data;

    if (resData.success && resData.data) {
      if (Array.isArray(resData.data)) {
        return resData.data;
      }
      if (typeof resData.data === "object" && "products" in resData.data) {
        return resData.data.products;
      }
    }
    return [];
  },
};
