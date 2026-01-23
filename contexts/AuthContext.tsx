import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { User, UserRole, OrgHierarchy, AuthState } from '../types';
import { Permissions, getPermissions } from '../utils/permissions';

// Default test users for all roles
const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  username: 'admin',
  password: 'admin',
  displayName: 'Administrator',
  email: 'admin@company.com',
  role: 'Admin',
  department: 'Administration',
  isActive: true,
  createdAt: new Date()
};

const DEFAULT_MANAGER: User = {
  id: 'manager-001',
  username: 'manager',
  password: 'manager',
  displayName: 'Manager User',
  email: 'manager@company.com',
  role: 'Manager',
  department: 'Administration',
  isActive: true,
  createdAt: new Date()
};

const DEFAULT_SALES: User = {
  id: 'sales-001',
  username: 'sales',
  password: 'sales',
  displayName: 'Sales User',
  email: 'sales@company.com',
  role: 'Sales',
  department: 'Sales',
  isActive: true,
  createdAt: new Date()
};

const DEFAULT_PRODUCTION: User = {
  id: 'production-001',
  username: 'production',
  password: 'production',
  displayName: 'Production User',
  email: 'production@company.com',
  role: 'Production',
  department: 'Production',
  isActive: true,
  createdAt: new Date()
};

const DEFAULT_FULFILLMENT: User = {
  id: 'fulfillment-001',
  username: 'fulfillment',
  password: 'fulfillment',
  displayName: 'Fulfillment User',
  email: 'fulfillment@company.com',
  role: 'Fulfillment',
  department: 'Fulfillment',
  isActive: true,
  createdAt: new Date()
};

const DEFAULT_READONLY: User = {
  id: 'readonly-001',
  username: 'readonly',
  password: 'readonly',
  displayName: 'ReadOnly User',
  email: 'readonly@company.com',
  role: 'ReadOnly',
  department: 'Administration',
  isActive: true,
  createdAt: new Date()
};

// Default org hierarchy with all test users
const DEFAULT_ORG: OrgHierarchy = {
  users: [DEFAULT_ADMIN, DEFAULT_MANAGER, DEFAULT_SALES, DEFAULT_PRODUCTION, DEFAULT_FULFILLMENT, DEFAULT_READONLY],
  departments: ['Administration', 'Sales', 'Production', 'Fulfillment'],
  lastUpdatedAt: new Date()
};

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  currentUser: User | null;
  loginError: string | null;

  // Permissions
  permissions: Permissions;

  // Auth actions
  login: (username: string, password: string) => boolean;
  logout: () => void;

  // User management
  orgHierarchy: OrgHierarchy;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  importUsersFromCSV: (csvContent: string) => { success: number; errors: string[] };

  // Helpers
  getUserById: (userId: string) => User | undefined;
  getUsersByRole: (role: UserRole) => User[];
  getUsersByDepartment: (department: string) => User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_AUTH = 'pallet-auth';
const STORAGE_KEY_ORG = 'pallet-org-hierarchy';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [orgHierarchy, setOrgHierarchy] = useState<OrgHierarchy>(DEFAULT_ORG);

  // Load saved state on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem(STORAGE_KEY_AUTH);
    const savedOrg = localStorage.getItem(STORAGE_KEY_ORG);

    if (savedOrg) {
      try {
        const parsed = JSON.parse(savedOrg);
        // Ensure dates are properly parsed
        parsed.lastUpdatedAt = new Date(parsed.lastUpdatedAt);
        parsed.users = parsed.users.map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt),
          lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : undefined
        }));
        setOrgHierarchy(parsed);
      } catch (e) {
        console.error('Failed to parse saved org hierarchy:', e);
      }
    }

    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed.userId) {
          // Re-validate the user exists
          const org = savedOrg ? JSON.parse(savedOrg) : DEFAULT_ORG;
          const user = org.users.find((u: User) => u.id === parsed.userId && u.isActive);
          if (user) {
            setCurrentUser({
              ...user,
              createdAt: new Date(user.createdAt),
              lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
            });
            setIsAuthenticated(true);
          }
        }
      } catch (e) {
        console.error('Failed to parse saved auth:', e);
      }
    }
  }, []);

  // Save org hierarchy when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(orgHierarchy));
  }, [orgHierarchy]);

  const login = (username: string, password: string): boolean => {
    setLoginError(null);

    const user = orgHierarchy.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      setLoginError('Invalid username or password');
      return false;
    }

    if (!user.isActive) {
      setLoginError('This account has been deactivated');
      return false;
    }

    // Update last login
    const updatedUser = { ...user, lastLoginAt: new Date() };
    setOrgHierarchy(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === user.id ? updatedUser : u)
    }));

    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify({ userId: user.id }));

    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setLoginError(null);
    localStorage.removeItem(STORAGE_KEY_AUTH);
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    setOrgHierarchy(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      lastUpdatedAt: new Date(),
      lastUpdatedBy: currentUser?.id
    }));
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setOrgHierarchy(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...updates } : u),
      lastUpdatedAt: new Date(),
      lastUpdatedBy: currentUser?.id
    }));

    // Update current user if they updated themselves
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (userId: string) => {
    // Don't allow deleting the last admin
    const admins = orgHierarchy.users.filter(u => u.role === 'Admin' && u.isActive);
    const userToDelete = orgHierarchy.users.find(u => u.id === userId);

    if (userToDelete?.role === 'Admin' && admins.length <= 1) {
      console.error('Cannot delete the last admin user');
      return;
    }

    // Soft delete by deactivating
    setOrgHierarchy(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, isActive: false } : u),
      lastUpdatedAt: new Date(),
      lastUpdatedBy: currentUser?.id
    }));
  };

  const importUsersFromCSV = (csvContent: string): { success: number; errors: string[] } => {
    const lines = csvContent.trim().split('\n');
    const errors: string[] = [];
    let success = 0;

    // Expected format: username,password,displayName,email,role,department,reportsTo
    // First line is header
    if (lines.length < 2) {
      return { success: 0, errors: ['CSV file must have a header row and at least one data row'] };
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredFields = ['username', 'password', 'displayname', 'role'];
    const missingFields = requiredFields.filter(f => !header.includes(f));

    if (missingFields.length > 0) {
      return { success: 0, errors: [`Missing required columns: ${missingFields.join(', ')}`] };
    }

    const newUsers: User[] = [];
    const validRoles: UserRole[] = ['Admin', 'Manager', 'Sales', 'Production', 'Fulfillment', 'ReadOnly'];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      if (values.length < header.length) {
        errors.push(`Row ${i + 1}: Not enough columns`);
        continue;
      }

      const getValue = (field: string) => {
        const idx = header.indexOf(field.toLowerCase());
        return idx >= 0 ? values[idx] : '';
      };

      const username = getValue('username');
      const password = getValue('password');
      const displayName = getValue('displayname');
      const email = getValue('email');
      const role = getValue('role') as UserRole;
      const department = getValue('department');
      const reportsTo = getValue('reportsto');

      // Validate
      if (!username || !password || !displayName) {
        errors.push(`Row ${i + 1}: Missing required fields (username, password, displayName)`);
        continue;
      }

      if (!validRoles.includes(role)) {
        errors.push(`Row ${i + 1}: Invalid role "${role}". Must be one of: ${validRoles.join(', ')}`);
        continue;
      }

      // Check for duplicate username
      const existingUser = orgHierarchy.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existingUser) {
        errors.push(`Row ${i + 1}: Username "${username}" already exists`);
        continue;
      }

      newUsers.push({
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
        username,
        password,
        displayName,
        email: email || undefined,
        role,
        department: department || undefined,
        reportsTo: reportsTo || undefined,
        isActive: true,
        createdAt: new Date()
      });
      success++;
    }

    if (newUsers.length > 0) {
      // Collect unique departments
      const newDepartments = new Set(orgHierarchy.departments);
      newUsers.forEach(u => {
        if (u.department) newDepartments.add(u.department);
      });

      setOrgHierarchy(prev => ({
        ...prev,
        users: [...prev.users, ...newUsers],
        departments: Array.from(newDepartments),
        lastUpdatedAt: new Date(),
        lastUpdatedBy: currentUser?.id
      }));
    }

    return { success, errors };
  };

  const getUserById = (userId: string): User | undefined => {
    return orgHierarchy.users.find(u => u.id === userId);
  };

  const getUsersByRole = (role: UserRole): User[] => {
    return orgHierarchy.users.filter(u => u.role === role && u.isActive);
  };

  const getUsersByDepartment = (department: string): User[] => {
    return orgHierarchy.users.filter(u => u.department === department && u.isActive);
  };

  // Calculate permissions based on current user
  const permissions = useMemo(() => getPermissions(currentUser), [currentUser]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      currentUser,
      loginError,
      permissions,
      login,
      logout,
      orgHierarchy,
      addUser,
      updateUser,
      deleteUser,
      importUsersFromCSV,
      getUserById,
      getUsersByRole,
      getUsersByDepartment
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
