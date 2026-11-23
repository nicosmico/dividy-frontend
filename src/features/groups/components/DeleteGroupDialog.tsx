import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Group } from '@/domain';
import { useDeleteGroup } from '../data';

interface DeleteGroupDialogProps {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGroupDialog({
  group,
  open,
  onOpenChange,
}: DeleteGroupDialogProps) {
  const { remove, isPending } = useDeleteGroup();
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar &quot;{group.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se borrarán sus miembros, gastos y pagos de este dispositivo. No se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className='bg-destructive text-white hover:bg-destructive/90'
            onClick={async (event) => {
              event.preventDefault();
              if (await remove(group.id)) {
                toast.success('Grupo eliminado');
                navigate('/', { replace: true });
              } else {
                onOpenChange(false);
              }
            }}
          >
            Eliminar grupo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
