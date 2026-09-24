export const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20";

export const primary =
  "rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
