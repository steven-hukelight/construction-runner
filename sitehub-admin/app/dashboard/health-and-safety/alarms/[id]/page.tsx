import MusterBoardClient from "./MusterBoardClient";

export const dynamic = "force-dynamic";

export default async function AlarmMusterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MusterBoardClient alarmId={id} />;
}
