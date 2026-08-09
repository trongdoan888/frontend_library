"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/app/lib/auth";

export type Role = "admin" | "libby" | "user";

export type Account = {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
  name: string;
};

const ACCOUNT_KEY = "library_account";

export function getStoredAccount(): Account | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Account;
  } catch {
    return null;
  }
}

export function storeAccount(account: Account) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export function clearStoredAccount() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCOUNT_KEY);
}

export async function fetchAccount(): Promise<Account | null> {
  const accessToken = getAccessToken();
  if (!accessToken) return null;

  const response = await fetch("http://localhost:8000/api/account/", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;

  const account = (await response.json()) as Account;
  storeAccount(account);
  return account;
}

export function useAccount(): Account | null {
  // Start null on every render pass so the client's hydration render matches the server's.
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    const stored = getStoredAccount();
    if (stored) {
      setAccount(stored);
      return;
    }
    fetchAccount().then((result) => {
      if (result) setAccount(result);
    });
  }, []);

  return account;
}
