"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { GoHomeFill } from "react-icons/go";
import { MdAccountBalanceWallet } from "react-icons/md";
import { IoStatsChart } from "react-icons/io5";
import { SiCashapp } from "react-icons/si";

const NAV_LINKS = [
  { label: "Dash", href: "/", Icon: GoHomeFill },
  { label: "Accounts", href: "/accounts", Icon: MdAccountBalanceWallet },
  { label: "Portfolio", href: "/portfolio", Icon: IoStatsChart },
  { label: "Payouts", href: "/payouts", Icon: SiCashapp },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();

  const activeIndex = NAV_LINKS.findIndex((item) =>
    isActivePath(pathname, item.href)
  );

  return (
    <>
      <aside className="fixed left-0 top-0 hidden h-screen w-[240px] bg-[#09090b] md:block">
        <div className="flex h-full w-full flex-col border-r border-zinc-800 bg-[#09090b] px-6">
          <div className="pt-5">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="Edge"
                width={220}
                height={64}
                priority
                className="h-11 w-auto"
              />
            </div>
          </div>

          <nav className="mt-10 flex flex-col gap-1">
            {NAV_LINKS.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const Icon = item.Icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={[
                    "group flex h-[42px] w-full items-center gap-4 rounded-md outline-none transition-colors",
                    "focus:outline-none focus-visible:outline-none",
                    isActive
                      ? "text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  <Icon className="h-[24px] w-[24px] shrink-0" />

                  <span className="text-[30px] font-semibold leading-none tracking-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-[#09090b]/95 backdrop-blur md:hidden">
        <div className="relative mx-[10%] h-20">
          {activeIndex >= 0 ? (
            <motion.div
              className="pointer-events-none absolute inset-y-0 left-0 z-0 flex w-1/4 items-center justify-center"
              initial={false}
              animate={{ x: `${activeIndex * 100}%` }}
              transition={{
                type: "spring",
                stiffness: 430,
                damping: 36,
                mass: 0.75,
              }}
            >
              <div className="invisible h-[58px] w-[76px] rounded-[20px] bg-zinc-900" />
            </motion.div>
          ) : null}

          <div className="relative z-10 grid h-full grid-cols-4">
            {NAV_LINKS.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const Icon = item.Icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={[
                    "flex h-full flex-col items-center justify-center gap-1 px-1 outline-none transition-colors",
                    "focus:outline-none focus-visible:outline-none",
                    isActive ? "text-zinc-100" : "text-zinc-500",
                  ].join(" ")}
                >
                  <Icon className="h-[24px] w-[24px] shrink-0" />

                  <span className="text-[12px] font-medium leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}