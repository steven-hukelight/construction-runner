import OperativeProfileClient from "./OperativeProfileClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OperativeProfileClient id={id} />;
}
