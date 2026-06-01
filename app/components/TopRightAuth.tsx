"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { FiLogOut, FiUser } from "react-icons/fi";

export default function TopRightAuth() {
  const { ready, authenticated, login, logout } = usePrivy();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pfpLoaded, setPfpLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function handleDesktopPointerDown(event: MouseEvent) {
      if (window.innerWidth < 768) return;
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleDesktopPointerDown);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleDesktopPointerDown);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (window.innerWidth >= 768) setMenuOpen(true);
  };

  const scheduleClose = () => {
    if (window.innerWidth < 768) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenuOpen(false), 120);
  };

  const flatPillClassName =
    "inline-flex h-9 items-center rounded-full border border-zinc-800 px-4 text-[13px] font-bold whitespace-nowrap";

  const signedInControls = (
    <>
      <Link
        href="/accounts"
        className="relative inline-flex h-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#6b5520] bg-linear-to-br from-[#e0b84b] via-[#cfa13a] to-[#b68b2d] px-4 text-[13px] font-bold leading-none text-[#120d02] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-colors duration-150 hover:from-[#cfa13a] hover:via-[#bd9130] hover:to-[#9f7626] whitespace-nowrap"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-white/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]"
        />
        <span className="relative z-10">Start Challenge</span>
      </Link>

      <div
        ref={menuRef}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        className="relative flex shrink-0 items-center"
      >
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Open account menu"
        >
          {!pfpLoaded ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 h-9 w-9 animate-pulse rounded-full border border-zinc-800 bg-zinc-900 md:border-zinc-700"
            />
          ) : null}

          <Image
            src="/pfp.jpg"
            alt="Account"
            width={40}
            height={40}
            priority
            onLoad={() => setPfpLoaded(true)}
            className={[
              "h-9 w-9 rounded-full border border-zinc-800 object-cover transition-opacity duration-200 md:border-zinc-700",
              pfpLoaded ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-full z-[220] hidden pt-[10px] md:block">
            <div className="min-w-[168px] whitespace-nowrap rounded-2xl border border-zinc-800 bg-[#09090b]/95 p-1.5 shadow-2xl backdrop-blur-md">
              <Link
                href="/accounts"
                onClick={() => setMenuOpen(false)}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800 active:bg-zinc-800"
              >
                <FiUser className="h-4 w-4 text-current" />
                <span>Accounts</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-400 transition-colors hover:bg-zinc-800 active:bg-zinc-800 whitespace-nowrap"
              >
                <FiLogOut className="h-4 w-4 text-current" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );

  const cta = !ready ? (
    <span
      aria-label="Loading account controls"
      className="inline-flex h-9 w-[126px] shrink-0 animate-pulse rounded-full bg-zinc-900"
    />
  ) : authenticated ? (
    signedInControls
  ) : (
    <button
      type="button"
      onClick={login}
      className={`${flatPillClassName} cursor-pointer bg-zinc-100 text-black`}
    >
      Sign in
    </button>
  );

  return (
    <>
      <div className="pointer-events-none absolute top-0 right-0 z-50 w-fit md:hidden">
        <div className="w-fit px-4 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-auto flex w-fit justify-end">
            <div className="flex items-center gap-3">{cta}</div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed top-4 right-6 z-50 hidden md:block">
        <div className="pointer-events-auto flex items-center gap-3">{cta}</div>
      </div>

      {authenticated && menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-[200] bg-transparent md:hidden"
          />

          <div className="fixed right-4 top-[72px] z-[210] min-w-[168px] whitespace-nowrap rounded-2xl border border-zinc-800 bg-[#09090b]/95 p-1.5 shadow-2xl backdrop-blur-md md:hidden">
            <Link
              href="/accounts"
              onClick={() => setMenuOpen(false)}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-zinc-200 transition-colors active:bg-zinc-800"
            >
              <FiUser className="h-4 w-4 text-current" />
              <span>Accounts</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-400 transition-colors active:bg-zinc-800 whitespace-nowrap"
            >
              <FiLogOut className="h-4 w-4 text-current" />
              <span>Sign out</span>
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}