const API_URL = process.env.REACT_APP_API_URL;
const USER_KEY = "auth_user";

function getHeaders() {
  return { "Content-Type": "application/json" };
}

export function getSession() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");

  localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data.user;
}

export async function signup({ name, email, password, role }) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ name, email, password, role }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al registrarse");

  localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data.user;
}

export async function serverLogout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: getHeaders(),
    });
  } finally {
    logout();
  }
}

export async function refreshSession() {
  const res = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });

  if (!res.ok) {
    logout();
    return null;
  }

  const data = await res.json();
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}
