"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, MailPlus, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { PageHead, Small, TableWrap } from "@/components/app/bits"
import { useConfirm } from "@/components/app/confirm"
import { PanelTitle } from "@/components/app/dashboard"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api, ApiError, qs } from "@/lib/machina/api"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import type { AdminUserListItem, Invitation, Paged } from "@/lib/machina/types"

import { UserStatusButton } from "./companies"
import { useAdminAction } from "./shared"

type Invited = { invitation: Invitation; inviteUrl: string }

const M = defineMessages({
  en: {
    inviteAdmin: "Invite an admin",
    email: "Email",
    emailPh: "name@machinarent.com",
    createInvitation: "Create invitation",
    invitationFor: (email: string) => `Invitation for ${email}`,
    noEmails: (until: string) =>
      `Emails aren't sent yet: send this link to them yourself. It works once, until ${until}.`,
    linkCopied: "Link copied",
    copyFailed: "Could not copy: select the link and copy it",
    copyLink: "Copy link",
    revoked: "Invitation revoked",
    pending: "Pending invitations",
    created: "Created",
    expires: "Expires",
    revokeTitle: (email: string) => `Revoke the invitation for ${email}?`,
    revokeBody: "The link stops working.",
    revoke: "Revoke",
    admins: "Admins",
    adminsIntro:
      "Machina staff who can approve companies and manage users. Every admin action is recorded in the activity log.",
    name: "Name",
    status: "Status",
    lastSignIn: "Last sign-in",
    never: "Never",
  },
  it: {
    inviteAdmin: "Invita un amministratore",
    email: "Email",
    emailPh: "nome@machinarent.com",
    createInvitation: "Crea l'invito",
    invitationFor: (email: string) => `Invito per ${email}`,
    noEmails: (until: string) =>
      `Le email non vengono ancora inviate: manda tu questo link. Funziona una sola volta, fino al ${until}.`,
    linkCopied: "Link copiato",
    copyFailed: "Impossibile copiare: seleziona il link e copialo",
    copyLink: "Copia il link",
    revoked: "Invito revocato",
    pending: "Inviti in sospeso",
    created: "Creato",
    expires: "Scade",
    revokeTitle: (email: string) => `Revocare l'invito per ${email}?`,
    revokeBody: "Il link smetterà di funzionare.",
    revoke: "Revoca",
    admins: "Amministratori",
    adminsIntro:
      "Lo staff Machina che può approvare le aziende e gestire gli utenti. Ogni azione degli amministratori è registrata nel registro attività.",
    name: "Nome",
    status: "Stato",
    lastSignIn: "Ultimo accesso",
    never: "Mai",
  },
})

function InviteForm() {
  const t = useMessages(M)
  const { localDateTime } = useFormat()
  const qc = useQueryClient()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState<Invited | null>(null)
  const invite = useMutation({
    mutationFn: () => api.post<Invited>("/api/admin/invitations", { email }),
    onSuccess: (r) => {
      setSent(r)
      setEmail("")
      void qc.invalidateQueries({ queryKey: ["admin"] })
    },
  })
  const fieldError =
    invite.error instanceof ApiError ? (invite.error.fields.email ?? invite.error.message) : ""

  return (
    <Card className="mb-4">
      <PanelTitle icon={MailPlus}>{t.inviteAdmin}</PanelTitle>
      <form
        className="flex flex-wrap items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSent(null)
          invite.mutate()
        }}
      >
        <Field
          label={t.email}
          htmlFor="invite-email"
          error={fieldError}
          className="min-w-[260px] flex-1"
        >
          <Input
            id="invite-email"
            type="email"
            required
            placeholder={t.emailPh}
            aria-invalid={!!fieldError}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" className="mt-[1.6rem]" disabled={invite.isPending}>
          {t.createInvitation}
        </Button>
      </form>
      {sent && (
        <Alert tone="info" title={t.invitationFor(sent.invitation.email)}>
          {t.noEmails(localDateTime(sent.invitation.expiresAt))}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-[0.85rem] break-all">
              {sent.inviteUrl}
            </code>
            <Button
              size="sm"
              onClick={() =>
                navigator.clipboard
                  .writeText(sent.inviteUrl)
                  .then(() => toast.success(t.linkCopied))
                  .catch(() => toast.error(t.copyFailed))
              }
            >
              <Copy aria-hidden /> {t.copyLink}
            </Button>
          </div>
        </Alert>
      )}
    </Card>
  )
}

function PendingInvitations() {
  const t = useMessages(M)
  const { localDateTime } = useFormat()
  const confirm = useConfirm()
  const list = useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: () => api.get<{ items: Invitation[] }>("/api/admin/invitations"),
  })
  const revoke = useAdminAction((id: string) => api.del(`/api/admin/invitations/${id}`), t.revoked)
  return (
    <QueryView query={list} rows={2}>
      {({ items }) =>
        items.length ? (
          <Card className="mb-4">
            <PanelTitle icon={MailPlus}>{t.pending}</PanelTitle>
            <TableWrap className="shadow-none">
              <thead>
                <tr>
                  <th>{t.email}</th>
                  <th>{t.created}</th>
                  <th>{t.expires}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td className="whitespace-nowrap">{localDateTime(i.createdAt)}</td>
                    <td className="whitespace-nowrap">{localDateTime(i.expiresAt)}</td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={revoke.isPending}
                        onClick={async () => {
                          const ok = await confirm({
                            title: t.revokeTitle(i.email),
                            body: t.revokeBody,
                            confirmLabel: t.revoke,
                            danger: true,
                          })
                          if (ok) revoke.mutate(i.id)
                        }}
                      >
                        {t.revoke}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>
        ) : null
      }
    </QueryView>
  )
}

export function AdminTeam() {
  const t = useMessages(M)
  const { localDateTime } = useFormat()
  const params = { role: "admin", pageSize: 100 }
  const admins = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => api.get<Paged<AdminUserListItem>>(`/api/admin/users${qs(params)}`),
  })
  return (
    <>
      <PageHead title={t.admins}>{t.adminsIntro}</PageHead>
      <InviteForm />
      <PendingInvitations />
      <Card>
        <PanelTitle icon={ShieldCheck}>{t.admins}</PanelTitle>
        <QueryView query={admins} rows={2}>
          {({ items }) => (
            <TableWrap className="shadow-none">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.status}</th>
                  <th>{t.lastSignIn}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.name}</b>
                      <Small>{u.email}</Small>
                    </td>
                    <td>
                      <StatusBadge kind="user" status={u.status} />
                    </td>
                    <td className="whitespace-nowrap">
                      {u.lastLoginAt ? localDateTime(u.lastLoginAt) : t.never}
                    </td>
                    <td className="text-right">
                      <UserStatusButton user={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </QueryView>
      </Card>
    </>
  )
}
