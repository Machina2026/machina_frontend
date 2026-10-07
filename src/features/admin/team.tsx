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
import { localDateTime } from "@/lib/machina/format"
import type { AdminUserListItem, Invitation, Paged } from "@/lib/machina/types"

import { UserStatusButton } from "./companies"
import { useAdminAction } from "./shared"

type Invited = { invitation: Invitation; inviteUrl: string }

function InviteForm() {
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
      <PanelTitle icon={MailPlus}>Invite an admin</PanelTitle>
      <form
        className="flex flex-wrap items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSent(null)
          invite.mutate()
        }}
      >
        <Field
          label="Email"
          htmlFor="invite-email"
          error={fieldError}
          className="min-w-[260px] flex-1"
        >
          <Input
            id="invite-email"
            type="email"
            required
            placeholder="name@machinarent.com"
            aria-invalid={!!fieldError}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" className="mt-[1.6rem]" disabled={invite.isPending}>
          Create invitation
        </Button>
      </form>
      {sent && (
        <Alert tone="info" title={`Invitation for ${sent.invitation.email}`}>
          Emails aren&apos;t sent yet: send this link to them yourself. It works once, until{" "}
          {localDateTime(sent.invitation.expiresAt)}.
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-[0.85rem] break-all">
              {sent.inviteUrl}
            </code>
            <Button
              size="sm"
              onClick={() =>
                navigator.clipboard
                  .writeText(sent.inviteUrl)
                  .then(() => toast.success("Link copied"))
                  .catch(() => toast.error("Could not copy: select the link and copy it"))
              }
            >
              <Copy aria-hidden /> Copy link
            </Button>
          </div>
        </Alert>
      )}
    </Card>
  )
}

function PendingInvitations() {
  const confirm = useConfirm()
  const list = useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: () => api.get<{ items: Invitation[] }>("/api/admin/invitations"),
  })
  const revoke = useAdminAction(
    (id: string) => api.del(`/api/admin/invitations/${id}`),
    "Invitation revoked"
  )
  return (
    <QueryView query={list} rows={2}>
      {({ items }) =>
        items.length ? (
          <Card className="mb-4">
            <PanelTitle icon={MailPlus}>Pending invitations</PanelTitle>
            <TableWrap className="shadow-none">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Expires</th>
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
                            title: `Revoke the invitation for ${i.email}?`,
                            body: "The link stops working.",
                            confirmLabel: "Revoke",
                            danger: true,
                          })
                          if (ok) revoke.mutate(i.id)
                        }}
                      >
                        Revoke
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
  const params = { role: "admin", pageSize: 100 }
  const admins = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => api.get<Paged<AdminUserListItem>>(`/api/admin/users${qs(params)}`),
  })
  return (
    <>
      <PageHead title="Admins">
        Machina staff who can approve companies and manage users. Every admin action is recorded in
        the activity log.
      </PageHead>
      <InviteForm />
      <PendingInvitations />
      <Card>
        <PanelTitle icon={ShieldCheck}>Admins</PanelTitle>
        <QueryView query={admins} rows={2}>
          {({ items }) => (
            <TableWrap className="shadow-none">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
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
                      {u.lastLoginAt ? localDateTime(u.lastLoginAt) : "Never"}
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
