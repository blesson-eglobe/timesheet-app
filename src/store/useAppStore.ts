import { create } from "zustand";
import type { Role } from "../types";

interface AuthUser {
	id: string;
	name: string;
	email: string;
	role: Role;
	department: string;
	designation: string;
	initials: string;
	color: string;
	avatar: string;
	status: string;
}

interface AppState {
	role: Role;
	currentUser: AuthUser;
	authToken: string | null;
	isSidebarCollapsed: boolean;
	notifications: number;

	setRole: (role: Role) => void;
	setUser: (user: any) => void;
	setAuthUser: (user: AuthUser, token: string) => void;
	updateCurrentUser: (updates: Partial<AuthUser>) => void;
	clearAuth: () => void;
	toggleSidebar: () => void;
}

const GUEST_USER: AuthUser = {
	id: "",
	name: "Guest",
	email: "",
	role: "employee",
	department: "",
	designation: "",
	initials: "GU",
	color: "#6b7280",
	avatar: "",
	status: "Active",
};

const storedToken = localStorage.getItem("auth_token");

/** Read the cached user from localStorage (set on every login / auth sync) */
const getCachedUser = (): AuthUser | null => {
	try {
		const raw = localStorage.getItem("cached_user");
		if (raw) return JSON.parse(raw) as AuthUser;
	} catch { /* corrupt JSON – ignore */ }
	return null;
};

/** Persist the full user object so reloads don't flash */
const cacheUser = (user: AuthUser) => {
	localStorage.setItem("cached_user", JSON.stringify(user));
	localStorage.setItem("active_role", user.role);
	localStorage.setItem("active_user_id", user.id);
};

const cachedUser = getCachedUser();
const initialUser: AuthUser = cachedUser && storedToken ? cachedUser : GUEST_USER;
const initialRole: Role = initialUser.role;

export const useAppStore = create<AppState>((set) => ({
	role: initialRole,
	currentUser: initialUser,
	authToken: storedToken,
	isSidebarCollapsed: false,
	notifications: 3,

	setRole: (role) => {
		localStorage.setItem("active_role", role);
		set((state) => {
			const updatedUser = { ...state.currentUser, role };
			cacheUser(updatedUser);
			return { role, currentUser: updatedUser };
		});
	},

	setUser: (user) => {
		const authUser = { ...user, status: user.status || 'Active' } as AuthUser;
		cacheUser(authUser);
		set({ role: user.role, currentUser: authUser });
	},

	setAuthUser: (user, token) => {
		const authUser = { ...user, status: user.status || 'Active' } as AuthUser;
		cacheUser(authUser);
		set({
			currentUser: authUser,
			role: user.role,
			authToken: token,
		});
	},

	updateCurrentUser: (updates) =>
		set((state) => {
			const updatedUser = { ...state.currentUser, ...updates };
			cacheUser(updatedUser);
			return { currentUser: updatedUser };
		}),

	clearAuth: () => {
		localStorage.removeItem("active_role");
		localStorage.removeItem("active_user_id");
		localStorage.removeItem("cached_user");
		set({
			currentUser: GUEST_USER,
			role: "employee",
			authToken: null,
		});
	},

	toggleSidebar: () =>
		set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));

