type RoomPageProps = {
  params: Promise<{ code: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-8">
      <p className="text-sm font-medium text-foreground">Study room</p>
      <p className="text-xs text-muted-foreground">Code: {code}</p>
      <p className="text-xs text-muted-foreground">Timer & cameras (coming soon)</p>
    </div>
  );
}
