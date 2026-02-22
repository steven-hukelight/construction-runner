/* eslint-disable @typescript-eslint/no-explicit-any */
export function sortData(data: any[], key: string, direction: "asc" | "desc") {
  return [...data].sort((a: any, b: any) => {
    if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
    if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
    return 0;
  });
}
