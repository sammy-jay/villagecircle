/** The call room is dark, so it loads on a dark screen rather than the light dashboard skeleton. */
export default function Loading() {
  return <div className="flex min-h-screen items-center justify-center bg-[#14110D] text-[15px] text-[#D6CEBF]" role="status">Opening the room…</div>;
}
