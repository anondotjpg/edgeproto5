import { FaLock } from "react-icons/fa";

export default function PayoutsPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-5 pb-24 text-white md:pb-0">
      <section className="mx-auto flex w-full max-w-4xl -translate-y-6 flex-col items-center text-center sm:-translate-y-8">
        <div className="hidden mb-4 flex h-28 w-28 items-center justify-center rounded-[32px] bg-zinc-950/60 text-zinc-300 ring-1 ring-zinc-900 shadow-2xl sm:mb-5 sm:h-36 sm:w-36 lg:h-44 lg:w-44 lg:rounded-[44px]">
          <FaLock className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
        </div>

        <h1 className="text-[68px] font-bold leading-[0.9] tracking-[-0.06em] text-zinc-100 sm:text-[92px] lg:text-[124px]">
          Lock in.
        </h1>

        <p className="mt-4 mx-[7%] max-w-2xl text-[22px] font-medium leading-[1.25] tracking-tight text-zinc-500 sm:mt-5 sm:text-[28px] lg:text-[34px]">
          Funded accounts will unlock payouts.
        </p>
      </section>
    </div>
  );
}