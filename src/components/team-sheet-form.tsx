"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { MatchState } from "@/app/[locale]/account/org/match-actions";

export type SheetRow = {
  playerId: string;
  name: string;
  position: string;
  isGoalkeeper: boolean;
  played: boolean;
  isStarter: boolean;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheet: boolean;
};

/**
 * The team sheet: one row per squad member, with everything off by default.
 * Ticking "played" reveals the rest of the row, so a club filling eleven names
 * is not confronted with a wall of thirty inputs it must leave at zero.
 */
export function TeamSheetForm({
  action,
  orgSlug,
  matchId,
  rows,
  labels,
}: {
  action: (state: MatchState, formData: FormData) => Promise<MatchState>;
  orgSlug: string;
  matchId: string;
  rows: SheetRow[];
  labels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState<MatchState, FormData>(
    action,
    undefined,
  );
  const [played, setPlayed] = useState<Record<string, boolean>>(
    Object.fromEntries(rows.map((row) => [row.playerId, row.played])),
  );

  const selected = Object.values(played).filter(Boolean).length;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="matchId" value={matchId} />

      <p className="text-sm text-muted">
        {labels.selectedCount.replace("{count}", String(selected))}
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-brand/5 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2.5 text-start font-semibold">
                {labels.played}
              </th>
              <th className="px-3 py-2.5 text-start font-semibold">
                {labels.player}
              </th>
              <th className="px-3 py-2.5 text-center font-semibold">
                {labels.starter}
              </th>
              <th className="px-3 py-2.5 text-center font-semibold">
                {labels.minutes}
              </th>
              <th className="px-3 py-2.5 text-center font-semibold">
                {labels.goals}
              </th>
              <th className="px-3 py-2.5 text-center font-semibold">
                {labels.assists}
              </th>
              <th className="px-3 py-2.5 text-center font-semibold">🟨</th>
              <th className="px-3 py-2.5 text-center font-semibold">🟥</th>
              <th className="px-3 py-2.5 text-center font-semibold">
                {labels.cleanSheet}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const isPlaying = played[row.playerId] ?? false;

              return (
                <tr key={row.playerId} className={isPlaying ? "bg-brand/5" : undefined}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      name={`played_${row.playerId}`}
                      checked={isPlaying}
                      onChange={(event) =>
                        setPlayed((current) => ({
                          ...current,
                          [row.playerId]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{row.name}</span>
                    <span className="block text-xs text-muted">{row.position}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      name={`starter_${row.playerId}`}
                      defaultChecked={row.isStarter}
                      disabled={!isPlaying}
                      className="h-4 w-4 disabled:opacity-30"
                    />
                  </td>
                  <Number
                    name={`minutes_${row.playerId}`}
                    defaultValue={row.minutesPlayed}
                    disabled={!isPlaying}
                    max={120}
                  />
                  <Number
                    name={`goals_${row.playerId}`}
                    defaultValue={row.goals}
                    disabled={!isPlaying}
                  />
                  <Number
                    name={`assists_${row.playerId}`}
                    defaultValue={row.assists}
                    disabled={!isPlaying}
                  />
                  <Number
                    name={`yellow_${row.playerId}`}
                    defaultValue={row.yellowCards}
                    disabled={!isPlaying}
                    max={2}
                  />
                  <Number
                    name={`red_${row.playerId}`}
                    defaultValue={row.redCards}
                    disabled={!isPlaying}
                    max={1}
                  />
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      name={`clean_${row.playerId}`}
                      defaultChecked={row.cleanSheet}
                      disabled={!isPlaying || !row.isGoalkeeper}
                      title={row.isGoalkeeper ? undefined : labels.cleanSheetHint}
                      className="h-4 w-4 disabled:opacity-30"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <p className="rounded-md bg-brand/5 p-3 text-xs text-muted">
        {labels.valuationNote}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {isPending ? labels.pending : labels.submit}
        </button>
        <Link
          href={`/fr/account/org/${orgSlug}/matches`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}

function Number({
  name,
  defaultValue,
  disabled,
  max,
}: {
  name: string;
  defaultValue: number;
  disabled: boolean;
  max?: number;
}) {
  return (
    <td className="px-3 py-2 text-center">
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min={0}
        max={max}
        disabled={disabled}
        className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm disabled:opacity-30"
      />
    </td>
  );
}
