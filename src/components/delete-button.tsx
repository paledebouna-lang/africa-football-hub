"use client";

export function DeleteButton({
  action,
  id,
  confirmLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  confirmLabel: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmLabel)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-sm text-red-600 hover:underline"
      >
        Supprimer
      </button>
    </form>
  );
}
