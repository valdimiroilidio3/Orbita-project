'use client';

import { AlertCircle, Loader2, UserMinus } from 'lucide-react';
import * as React from 'react';
import { useActionState } from 'react';

import {
  ORGANIZATION_ROLES,
  ROLE_LABELS,
  evaluateRemoval,
  evaluateRoleChange,
  formatDate,
  type OrganizationMember,
  type OrganizationRole,
} from '@orbita/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { changeMemberRoleAction, removeMemberAction } from '@/lib/server/settings-actions';
import { INITIAL_SETTINGS_STATE } from '@/lib/server/settings-form-state';

const ROLE_BADGE: Record<OrganizationRole, 'accent' | 'info' | 'neutral'> = {
  owner: 'accent',
  admin: 'info',
  member: 'neutral',
};

interface MembersTableProps {
  members: OrganizationMember[];
  actorId: string;
  actorRole: OrganizationRole;
}

/**
 * Tabela de membros. As regras (espelho de `memberships_guard`) decidem no
 * cliente que ações MOSTRAR; o servidor e a BD voltam a validar sempre.
 */
export function MembersTable({ members, actorId, actorRole }: MembersTableProps) {
  const ownerCount = members.filter((m) => m.role === 'owner').length;
  const [removing, setRemoving] = React.useState<OrganizationMember | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-small">
          <thead className="bg-surface text-left text-caption font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5">
                Membro
              </th>
              <th scope="col" className="px-4 py-2.5">
                Papel
              </th>
              <th scope="col" className="px-4 py-2.5">
                Convite
              </th>
              <th scope="col" className="px-4 py-2.5">
                Entrada
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => {
              const isSelf = member.user_id === actorId;
              const context = {
                actorRole,
                actorId,
                target: { userId: member.user_id, role: member.role },
                ownerCount,
              };
              const assignable = ORGANIZATION_ROLES.filter(
                (role) => role !== member.role && evaluateRoleChange(context, role).allowed,
              );
              const canRemove = evaluateRemoval(context).allowed;
              return (
                <tr key={member.user_id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">
                      {member.display_name ?? member.email}
                      {isSelf ? <span className="ml-1.5 text-caption text-muted">(tu)</span> : null}
                    </p>
                    {member.display_name ? (
                      <p className="text-caption text-muted">{member.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {assignable.length > 0 ? (
                      <RoleSelect
                        key={`${member.user_id}:${member.role}`}
                        member={member}
                        assignable={assignable}
                      />
                    ) : (
                      <Badge variant={ROLE_BADGE[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Aceite</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(member.joined_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoving(member)}
                        aria-label={isSelf ? 'Sair da organização' : `Remover ${member.email}`}
                      >
                        <UserMinus className="h-4 w-4" aria-hidden />
                        {isSelf ? 'Sair' : 'Remover'}
                      </Button>
                    ) : (
                      <span className="text-caption text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RemoveMemberDialog
        member={removing}
        isSelf={removing?.user_id === actorId}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

function RoleSelect({
  member,
  assignable,
}: {
  member: OrganizationMember;
  assignable: OrganizationRole[];
}) {
  const [state, formAction, pending] = useActionState(
    changeMemberRoleAction,
    INITIAL_SETTINGS_STATE,
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const [value, setValue] = React.useState<OrganizationRole>(member.role);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={member.user_id} />
      <input type="hidden" name="role" value={value} />
      <Select
        value={value}
        disabled={pending}
        onValueChange={(next) => {
          setValue(next as OrganizationRole);
          // Submete de imediato; o servidor valida.
          queueMicrotask(() => formRef.current?.requestSubmit());
        }}
      >
        <SelectTrigger className="h-8 w-[130px]" aria-label={`Papel de ${member.email}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={member.role}>{ROLE_LABELS[member.role]}</SelectItem>
          {assignable.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="A guardar" />
      ) : null}
      {state.error ? (
        <span role="alert" className="inline-flex items-center gap-1 text-caption text-danger-text">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function RemoveMemberDialog({
  member,
  isSelf,
  onClose,
}: {
  member: OrganizationMember | null;
  isSelf: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(removeMemberAction, INITIAL_SETTINGS_STATE);
  const [confirm, setConfirm] = React.useState('');
  const closedFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (state.success && closedFor.current !== state.success) {
      closedFor.current = state.success;
      setConfirm('');
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <Dialog
      open={Boolean(member)}
      onOpenChange={(open) => {
        if (!open) {
          setConfirm('');
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSelf ? 'Sair da organização' : 'Remover membro'}</DialogTitle>
          <DialogDescription>
            {isSelf
              ? 'Perdes acesso imediato a esta organização. O histórico de chamadas e agentes mantém-se.'
              : `${member?.email ?? ''} perde acesso imediato. Esta ação não apaga o histórico.`}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={member?.user_id ?? ''} />
          <label className="block space-y-1.5 text-small">
            <span className="font-medium text-text">
              Escreve <code className="rounded bg-surface px-1">remover</code> para confirmar
            </span>
            <Input
              name="confirm"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="off"
            />
          </label>
          {state.error ? (
            <p role="alert" className="text-caption text-danger-text">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending || confirm !== 'remover'}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {isSelf ? 'Sair' : 'Remover'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
