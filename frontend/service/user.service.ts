import { API_BASE_URL } from "@/lib/constants";
import { ApiResponse, CreateUserRequest, UserEntity } from "@/types/service";

export class UserService {
  private static getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static async getAllUsers(token: string): Promise<ApiResponse<UserEntity[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'GET',
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to fetch users' 
      };
    }
  }

  static async createUser(token: string, userData: CreateUserRequest): Promise<ApiResponse<UserEntity>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error creating user:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to create user' 
      };
    }
  }
}