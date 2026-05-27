import api from "@/lib/api";

export interface LoginDto {
  email: string;
  password: string;
}

export const authService = {
  async login(dto: LoginDto) {
    const response = await api.post("/auth/login", dto);
    return response.data;
  },

  async logout() {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  async getProfile() {
    const response = await api.get("/auth/profile");
    return response.data;
  },
};
