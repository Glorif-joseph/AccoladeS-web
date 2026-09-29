"use client";

export default function BoutonRefuser({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Refuser cette preuve ?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="decision" value="refusé" />
      <button
        type="submit"
        className="flex-1 rounded-lg bg-danger text-white font-bold text-sm py-3"
      >
        ✕ Refuser
      </button>
    </form>
  );
}
