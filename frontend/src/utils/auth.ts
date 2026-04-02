export const getUserRole = () => localStorage.getItem("role");

export const getUserHomePath = () => {
  const role = getUserRole();
  // redirect them to their dashboard based on who they are
  if (role === "admin") return "/admin/dashboard";
  if (role === "caregiver") return "/caregiver/dashboard";
  return "/careseeker/dashboard";
};

export const logout = () => {
  localStorage.clear();
  window.location.href = "/login";
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("access");
};
