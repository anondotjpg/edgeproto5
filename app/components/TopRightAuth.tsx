"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

export default function TopRightAuth() {
  const { ready, authenticated, login, logout } = usePrivy();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
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
    };
  }, []);

  const flatPillClassName =
    "inline-flex h-9 items-center rounded-full border border-zinc-800 px-4 text-[13px] font-bold whitespace-nowrap";

  const signedInControls = (
    <>
      <div
        className="inline-flex shrink-0 items-center rounded-full"
        style={{
          background: "#6b5520",
          paddingBottom: "2px",
          lineHeight: 0,
        }}
      >
        <Link
          href="/accounts"
          className="relative inline-flex h-8 cursor-pointer items-center overflow-hidden rounded-full bg-linear-to-br from-[#e0b84b] via-[#cfa13a] to-[#b68b2d] px-4 text-[13px] font-bold text-[#120d02] transition-transform duration-100 hover:translate-y-px active:translate-y-0 whitespace-nowrap"
          style={{
            transform: "translateY(-2px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-white/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]"
          />
          <span className="relative z-10">Start Challenge</span>
        </Link>
      </div>

      <div ref={menuRef} className="relative flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Open account menu"
        >
          <Image
            src="/pfp.jpg"
            alt="Account"
            width={40}
            height={40}
            priority
            className="h-9 w-9 rounded-full border border-zinc-800 object-cover md:border-zinc-700"
          />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-[calc(100%+10px)] z-[220] hidden min-w-[160px] whitespace-nowrap rounded-2xl border border-zinc-800 bg-[#09090b]/95 p-1.5 shadow-2xl backdrop-blur-md md:block">
            <Link
              href="/accounts"
              onClick={() => setMenuOpen(false)}
              className="block cursor-pointer rounded-xl px-3 py-2.5 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800 active:bg-zinc-800"
            >
              Accounts
            </Link>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800 active:bg-zinc-800 whitespace-nowrap"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </>
  );

  const cta = !ready ? (
    <span className={`${flatPillClassName} bg-zinc-900 text-zinc-400`}>
      Loading
    </span>
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
        <div className="pointer-events-auto flex items-center gap-3">
          {cta}
        </div>
      </div>

      {authenticated && menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-[200] bg-transparent md:hidden"
          />

          <div className="fixed right-4 top-[72px] z-[210] min-w-[160px] whitespace-nowrap rounded-2xl border border-zinc-800 bg-[#09090b]/95 p-1.5 shadow-2xl backdrop-blur-md md:hidden">
            <Link
              href="/accounts"
              onClick={() => setMenuOpen(false)}
              className="block cursor-pointer rounded-xl px-3 py-2.5 text-[13px] font-medium text-zinc-200 transition-colors active:bg-zinc-800"
            >
              Accounts
            </Link>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-zinc-200 transition-colors active:bg-zinc-800 whitespace-nowrap"
            >
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}