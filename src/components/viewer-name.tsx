/**
 * A member's name, followed by "(tú)" when they are the viewer. The tag is not
 * bold, so it reads as a note next to the name, not as part of it. For anyone
 * else it is just the name (no extra element).
 */
export function ViewerName({
  name,
  isViewer,
}: {
  name: string;
  isViewer: boolean;
}) {
  if (!isViewer) return <>{name}</>;
  return (
    <>
      {name}
      <span className='font-normal text-muted-foreground'> (tú)</span>
    </>
  );
}
