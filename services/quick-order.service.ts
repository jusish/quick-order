import api from "@/lib/api";

export interface QuickOrderItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  transportPrice: number;
  uomId: string;
  notes?: string;
}

export interface CreateQuickOrderDto {
  title: string;
  stockId: string;
  status: "DRAFT" | "COMPLETED";
  notes?: string;
  transportTotal: number;
  subtotal: number;
  totalAmount: number;
  items: QuickOrderItemDto[];
}

export interface UpdateQuickOrderDto {
  title?: string;
  status?: "DRAFT" | "COMPLETED";
  notes?: string;
  transportTotal?: number;
  subtotal?: number;
  totalAmount?: number;
  items?: QuickOrderItemDto[];
}

export interface QuickOrder {
  id: string;
  title: string;
  stockId: string;
  createdById: string;
  status: "DRAFT" | "COMPLETED" | "PUSHED";
  notes?: string;
  transportTotal: number;
  subtotal: number;
  totalAmount: number;
  pushedAt?: string;
  pushedById?: string;
  purchaseOrderId?: string;
  purchaseOrderDetails?: {
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    items: {
      productId: string;
      quantitySold: number;
      returnedQuantity: number;
    }[];
  } | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    fullName: string;
  };
  pushedBy?: {
    fullName: string;
  };
  stock: {
    name: string;
  };
  items: {
    id: string;
    quickOrderId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    transportPrice: number;
    uomId: string;
    notes?: string;
    product: {
      name: string;
      stockId: string;
    };
    uom: {
      symbol: string;
    };
  }[];
}

export interface QuickOrderFilters {
  status?: "DRAFT" | "COMPLETED" | "PUSHED" | "";
  startDate?: string;
  endDate?: string;
  stockId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const quickOrderService = {
  async getQuickOrders(filters: QuickOrderFilters = {}): Promise<{
    success: boolean;
    data: {
      quickOrders: QuickOrder[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/quick-orders?${params.toString()}`);
    if (response.data?.data && response.data.data.orders && !response.data.data.quickOrders) {
      response.data.data.quickOrders = response.data.data.orders;
    }
    return response.data;
  },

  async getQuickOrderById(id: string): Promise<{ success: boolean; data: QuickOrder }> {
    const response = await api.get(`/quick-orders/${id}`);
    return response.data;
  },

  async createQuickOrder(dto: CreateQuickOrderDto): Promise<{ success: boolean; data: QuickOrder; message?: string }> {
    const response = await api.post("/quick-orders", dto);
    return response.data;
  },

  async updateQuickOrder(id: string, dto: UpdateQuickOrderDto): Promise<{ success: boolean; data: QuickOrder; message?: string }> {
    const response = await api.put(`/quick-orders/${id}`, dto);
    return response.data;
  },

  async deleteQuickOrder(id: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/quick-orders/${id}`);
    return response.data;
  },

  async pushToPurchaseOrder(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await api.post(`/quick-orders/${id}/push`);
    return response.data;
  },

  async bulkPush(ids: string[]): Promise<{ success: boolean; data: { successful: string[]; failed: string[] } }> {
    const response = await api.post("/quick-orders/push-bulk", { ids });
    return response.data;
  },

  async getTransportPrice(productId: string, stockId: string): Promise<{ success: boolean; data: { price: number } }> {
    const response = await api.get(`/quick-orders/transport-prices/${productId}`, {
      params: { stockId },
    });
    return response.data;
  },

  async getStockAvailability(productId: string, stockId: string): Promise<{ success: boolean; data: { available: number } }> {
    const response = await api.get(`/quick-orders/stock-availability/${productId}`, {
      params: { stockId },
    });
    return response.data;
  },
};
